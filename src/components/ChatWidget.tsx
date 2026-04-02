import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, X, Send, ArrowLeft, User, Megaphone, Users, Circle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_admin_message: boolean;
  is_broadcast: boolean;
  read: boolean;
  created_at: string;
}

interface ChatUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role?: string;
  is_online?: boolean;
}

interface TypingStatus {
  [key: string]: boolean;
}

const ChatWidget = () => {
  const { user, role, profile: userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"chats" | "broadcast">("chats");
  const [broadcastMessages, setBroadcastMessages] = useState<ChatMessage[]>([]);
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({});
  const [isTyping, setIsTyping] = useState(false);
  
  // Since everyone acts the same, we just track userProfiles and online presence generically.
  const [userProfiles, setUserProfiles] = useState<Record<string, ChatUser>>({});
  
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const lastMessageTimestampRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const broadcastBottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = role === "admin";
  const selectedUserInfo = users.find(u => u.id === selectedUser);

  const fetchMessages = async () => {
    if (!user) return;

    if (selectedUser) {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("is_broadcast", false)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    }
  };

  const fetchBroadcasts = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("is_broadcast", true)
      .order("created_at", { ascending: true });
    setBroadcastMessages(data || []);
  };

  const fetchUnread = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);
    setUnreadCount(count || 0);
  };

  const fetchUsers = async () => {
    if (!user) return;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url");
      
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");
      
    // Create a generic map of role user_id -> role
    const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));

    if (profiles) {
      // Filter out self
      const otherUsers = profiles.filter(p => p.id !== user.id).map(p => ({
        ...p,
        role: roleMap.get(p.id) || "user"
      }));
      
      const profileMap: Record<string, ChatUser> = {};
      otherUsers.forEach(p => {
        profileMap[p.id] = { ...p, is_online: false };
      });
      setUserProfiles(profileMap);
      setUsers(otherUsers);
    }
  };

  useEffect(() => {
    fetchUnread();
    fetchUsers();
    fetchBroadcasts();

    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const newTimestamp = payload.new.created_at;
        if (newTimestamp !== lastMessageTimestampRef.current) {
          lastMessageTimestampRef.current = newTimestamp;
          fetchMessages();
          fetchUnread();
          fetchBroadcasts();
        }
      })
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        if (!realtimeConnected) {
          fetchMessages();
          fetchUnread();
          fetchBroadcasts();
        }
      }, 3000);
    }

    return () => { 
      supabase.removeChannel(channel);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user, role, realtimeConnected, lastMessageTimestampRef.current, selectedUser]); // Ensure selectedUser refreshes correctly

  useEffect(() => {
    if (open) {
      fetchMessages();
      fetchBroadcasts();
      if (user && selectedUser) {
        supabase
          .from("chat_messages")
          .update({ read: true })
          .eq("sender_id", selectedUser)
          .eq("receiver_id", user.id)
          .eq("read", false)
          .then(() => fetchUnread());
      }
    }
  }, [open, selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    broadcastBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [broadcastMessages]);

  useEffect(() => {
    if (!user) return;
    
    const typingChannel = supabase
      .channel("typing-status")
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== user?.id) {
          setTypingStatus(prev => ({ ...prev, [payload.userId]: payload.isTyping }));
        }
      })
      .on("broadcast", { event: "presence" }, ({ payload }) => {
        const userId = payload.userId;
        if (userId !== user?.id) {
           setUserProfiles(prev => ({
             ...prev,
             [userId]: { ...prev[userId], is_online: payload.isOnline }
           }));
        }
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel("online-presence");
    
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setUserProfiles(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(uid => {
            next[uid].is_online = !!state[uid];
          });
          return next;
        });
      })
      .subscribe(async () => {
        await presenceChannel.track({ userId: user?.id, isOnline: true });
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  const handleTyping = useCallback((value: string) => {
    setInput(value);

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      typingChannelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user?.id, isTyping: true }
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        typingChannelRef.current?.send({
          type: "broadcast",
          event: "typing",
          payload: { userId: user?.id, isTyping: false }
        });
      }, 1000);
    }
  }, [isTyping, user?.id]);

  const handleSend = async () => {
    if (!input.trim() || !user || !selectedUser) return;

    if (isTyping) {
      setIsTyping(false);
      typingChannelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user.id, isTyping: false }
      });
    }

    await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: selectedUser,
      message: input.trim(),
      is_admin_message: isAdmin,
      is_broadcast: false,
    });

    setInput("");
    fetchMessages();
  };

  const handleBroadcast = async () => {
    if (!input.trim() || !user || !isAdmin) return;

    await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: null,
      message: input.trim(),
      is_admin_message: true,
      is_broadcast: true,
    });

    setInput("");
    fetchBroadcasts();
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const getAvatarComponent = (avatarUrl: string | null, name: string, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "w-7 h-7 text-[10px]",
      md: "w-10 h-10 text-sm",
      lg: "w-12 h-12 text-base"
    };

    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      );
    }

    return (
      <div className={`${sizeClasses[size]} rounded-full bg-primary/10 text-primary flex items-center justify-center`}>
        <span className="font-semibold">{name ? name.charAt(0).toUpperCase() : "U"}</span>
      </div>
    );
  };

  const groupByDate = (msgs: ChatMessage[]) =>
    msgs.reduce<Record<string, ChatMessage[]>>((acc, msg) => {
      const key = new Date(msg.created_at).toDateString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(msg);
      return acc;
    }, {});

  const renderMessages = (msgs: ChatMessage[], ref: React.RefObject<HTMLDivElement>, isBroadcastView = false) => {
    const grouped = groupByDate(msgs);

    if (msgs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          {isBroadcastView ? (
            <>
              <Megaphone className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No announcements yet</p>
              {isAdmin && <p className="text-xs mt-1">Broadcast a message to all users</p>}
            </>
          ) : (
            <>
              <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1">Send a message to start the conversation</p>
            </>
          )}
        </div>
      );
    }

    const showTypingIndicator = (userId: string) => {
      const isOtherTyping = typingStatus[userId];
      if (!isOtherTyping) return null;
      
      return (
        <div className="flex items-center gap-1 px-3 py-2 bg-card border rounded-2xl rounded-bl-md max-w-[75%]">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-muted-foreground ml-1">
            {userProfiles[userId]?.full_name || "User"} is typing...
          </span>
        </div>
      );
    };

    return (
      <div className="space-y-1">
        {Object.entries(grouped).map(([dateKey, dateMsgs]) => (
          <div key={dateKey}>
            <div className="flex items-center justify-center my-3">
              <span className="text-[10px] bg-muted text-muted-foreground px-3 py-1 rounded-full font-medium">
                {formatDate(dateMsgs[0].created_at)}
              </span>
            </div>
            {dateMsgs.map((m, idx) => {
              const isMine = m.sender_id === user?.id;
              const showAvatar = idx === 0 || dateMsgs[idx - 1]?.sender_id !== m.sender_id;
              const isLastInGroup = idx === dateMsgs.length - 1 || dateMsgs[idx + 1]?.sender_id !== m.sender_id;

              let avatarUrl = m.sender_id === user?.id ? (userProfile?.avatar_url || null) : (userProfiles[m.sender_id]?.avatar_url || null);
              let senderName = m.sender_id === user?.id ? (userProfile?.full_name || "You") : (userProfiles[m.sender_id]?.full_name || "User");
              
              if (m.is_admin_message && m.is_broadcast) {
                 senderName = "System Admin";
              }

              if (m.is_broadcast) {
                return (
                  <div key={m.id} className={`flex justify-center ${showAvatar ? "mt-3" : "mt-0.5"}`}>
                    <div className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-accent/60 border border-accent text-foreground text-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Megaphone className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-semibold text-primary">Announcement by {senderName}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{m.message}</p>
                      <div className="text-[9px] text-muted-foreground mt-1 text-right">
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id}>
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"}`}>
                    {!isMine && (
                      <div className="w-10 flex-shrink-0 mr-1.5">
                        {showAvatar && getAvatarComponent(avatarUrl, senderName, "sm")}
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                      {showAvatar && !isMine && (
                        <div className="text-[10px] text-muted-foreground font-medium ml-1 mb-0.5">
                          {senderName}
                        </div>
                      )}
                      <div
                        className={`px-3 py-2 text-sm leading-relaxed ${
                          isMine
                            ? `bg-primary text-primary-foreground ${isLastInGroup ? "rounded-2xl rounded-br-md" : "rounded-2xl"}`
                            : `bg-card border text-foreground ${isLastInGroup ? "rounded-2xl rounded-bl-md" : "rounded-2xl"}`
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          <span className={`text-[9px] ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                            {formatTime(m.created_at)}
                          </span>
                          {isMine && (
                            <span className={`text-[9px] ${m.read ? "text-primary-foreground/70" : "text-primary-foreground/40"}`}>
                              {m.read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isMine && (
                      <div className="w-10 flex-shrink-0 ml-1.5">
                        {showAvatar && getAvatarComponent(avatarUrl, senderName, "sm")}
                      </div>
                    )}
                  </div>
                  {isLastInGroup && !isMine && selectedUser && showTypingIndicator(selectedUser)}
                </div>
              );
            })}
          </div>
        ))}
        {!isMine && selectedUser && showTypingIndicator(selectedUser)}
        <div ref={ref} />
      </div>
    );
  };

  const isMine = false;
  
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-all hover:scale-105"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-[420px] h-[70vh] max-h-[600px] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center gap-3">
            {selectedUser && (
              <button onClick={() => setSelectedUser(null)} className="hover:opacity-70 transition-opacity">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="relative">
              {activeTab === "broadcast" && !selectedUser ? (
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
              ) : selectedUser ? (
                getAvatarComponent(userProfiles[selectedUser]?.avatar_url || null, userProfiles[selectedUser]?.full_name || "U", "md")
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
                  {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {selectedUser
                  ? selectedUserInfo?.full_name || "User"
                  : activeTab === "broadcast"
                    ? "Announcements"
                    : "Inbox"}
              </div>
              {selectedUser && selectedUserInfo && (
                <div className="text-[11px] opacity-70 truncate">{selectedUserInfo.email}</div>
              )}
              {!selectedUser && activeTab === "broadcast" && (
                <div className="text-[11px] opacity-70">System Updates</div>
              )}
              {!selectedUser && activeTab === "chats" && (
                <div className="text-[11px] opacity-70">
                  {userProfile?.full_name}
                </div>
              )}
            </div>
          </div>

          {!selectedUser && (
            <div className="border-b px-2 pt-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chats" | "broadcast")}>
                <TabsList className="w-full grid grid-cols-2 h-9">
                  <TabsTrigger value="chats" className="text-xs gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Chats
                  </TabsTrigger>
                  <TabsTrigger value="broadcast" className="text-xs gap-1.5">
                    <Megaphone className="w-3.5 h-3.5" />
                    Announce
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {!selectedUser && activeTab === "chats" && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search users..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 bg-muted/50 border-0 h-9"
                  />
                </div>
              </div>
              <div className="px-3 pb-2 text-xs text-muted-foreground font-medium uppercase tracking-wider flex justify-between">
                <span>Contacts</span>
                <span>{filteredUsers.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No users found</p>
                  </div>
                ) : (
                  filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u.id)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b transition-colors flex items-center gap-3"
                    >
                      <div className="relative flex-shrink-0">
                        {u.avatar_url ? (
                          <img 
                            src={u.avatar_url} 
                            alt={u.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <span className="text-sm font-semibold">
                              {(u.full_name || "U").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {userProfiles[u.id]?.is_online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate flex justify-between items-center">
                           {u.full_name || "Unknown User"}
                           {u.role === "admin" && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2 uppercase">Admin</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {!selectedUser && activeTab === "broadcast" && (
            <>
              <div className="flex-1 overflow-y-auto p-3 bg-muted/20">
                {renderMessages(broadcastMessages, broadcastBottomRef, true)}
              </div>
              {isAdmin && (
                <div className="p-3 border-t bg-card flex items-end gap-2">
                  <Input
                    placeholder="Type an announcement..."
                    value={input}
                    onChange={e => handleTyping(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleBroadcast()}
                    className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleBroadcast}
                    disabled={!input.trim()}
                    className="rounded-full w-9 h-9 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {selectedUser && (
            <>
              <div className="flex-1 overflow-y-auto p-3 bg-muted/20">
                {renderMessages(messages, bottomRef)}
              </div>
              <div className="p-3 border-t bg-card">
                {typingStatus[selectedUser] && (
                  <div className="flex items-center gap-1 mb-2 px-1">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {userProfiles[selectedUser]?.full_name || "User"} is typing...
                    </span>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => handleTyping(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="rounded-full w-9 h-9 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;