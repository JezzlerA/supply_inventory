import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, X, Send, ArrowLeft, User, Megaphone, Users, Search, Paperclip, Trash2, SmilePlus, Download, Image as ImageIcon } from "lucide-react";
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
  is_deleted?: boolean;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  chat_reactions?: { user_id: string; emoji: string }[];
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

const EMOJIS = ["❤️", "👍", "😂", "😮", "😢"];

const ChatWidget = () => {
  const { user, role, profile: userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPerUser, setUnreadPerUser] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"chats" | "broadcast">("chats");
  const [broadcastMessages, setBroadcastMessages] = useState<ChatMessage[]>([]);
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({});
  const [isTyping, setIsTyping] = useState(false);
  const [activeReactionMessage, setActiveReactionMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const broadcastFileInputRef = useRef<HTMLInputElement>(null);
  
  const [userProfiles, setUserProfiles] = useState<Record<string, ChatUser>>({});
  const [realtimeConnected, setRealtimeConnected] = useState(false);
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
        .select(`*, chat_reactions(user_id, emoji)`)
        .eq("is_broadcast", false)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      setMessages((data as ChatMessage[]) || []);
    }
  };

  const fetchBroadcasts = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select(`*, chat_reactions(user_id, emoji)`)
      .eq("is_broadcast", true)
      .order("created_at", { ascending: true });
    setBroadcastMessages((data as ChatMessage[]) || []);
  };

  const fetchUnread = async () => {
    if (!user) return;
    
    // Total unread count
    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);
    setUnreadCount(count || 0);

    // Per-user unread counts
    const { data: unreadData, error } = await supabase
      .from("chat_messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .eq("read", false);

    if (unreadData) {
      const counts: Record<string, number> = {};
      unreadData.forEach(msg => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });
      setUnreadPerUser(counts);
    }
  };

  const fetchUsers = async () => {
    if (!user) return;
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, avatar_url");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      
    const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));

    if (profiles) {
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
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        fetchMessages();
        fetchUnread();
        fetchBroadcasts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reactions" }, () => {
        fetchMessages();
        fetchBroadcasts();
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
  }, [user, role, realtimeConnected, selectedUser]); 

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { broadcastBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [broadcastMessages]);

  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel("online-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setUserProfiles(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(uid => {
            if(next[uid]) next[uid].is_online = !!state[uid];
          });
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ userId: user?.id, isOnline: true });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [user]);

  const handleTyping = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !user || !selectedUser) return;
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isBroadcast = false) => {
    const file = e.target.files?.[0];
    if (!file || !user || (!selectedUser && !isBroadcast)) return;
    
    setUploading(true);
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('chat_attachments').upload(filePath, file);

    if (uploadError) {
      console.error("Upload Error:", uploadError);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);

    await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: isBroadcast ? null : selectedUser,
      message: file.name,
      is_admin_message: isAdmin,
      is_broadcast: isBroadcast,
      attachment_url: data.publicUrl,
      attachment_type: file.type,
      attachment_name: file.name
    });

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (broadcastFileInputRef.current) broadcastFileInputRef.current.value = "";
    isBroadcast ? fetchBroadcasts() : fetchMessages();
  };

  const handleDeleteMessage = async (msgId: string) => {
    const { error } = await supabase.from("chat_messages").update({ is_deleted: true }).eq("id", msgId);
    if (error) console.error("Failed to delete message:", error);
    fetchMessages();
    fetchBroadcasts();
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("chat_reactions")
      .select("*")
      .eq("message_id", msgId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from("chat_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("chat_reactions").insert({ message_id: msgId, user_id: user.id, emoji });
    }
    setActiveReactionMessage(null);
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
    const sizeClasses = { sm: "w-7 h-7 text-[10px]", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
    if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${sizeClasses[size]} rounded-full object-cover`} />;
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-primary/10 text-primary flex items-center justify-center`}>
        <span className="font-semibold">{name ? name.charAt(0).toUpperCase() : "U"}</span>
      </div>
    );
  };

  const groupByDate = (msgs: ChatMessage[]) => msgs.reduce<Record<string, ChatMessage[]>>((acc, msg) => {
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
            <><Megaphone className="w-12 h-12 mb-3 opacity-20" /><p className="text-sm font-medium">No announcements yet</p>{isAdmin && <p className="text-xs mt-1">Broadcast a message</p>}</>
          ) : (
            <><MessageCircle className="w-12 h-12 mb-3 opacity-20" /><p className="text-sm font-medium">No messages yet</p><p className="text-xs mt-1">Send a message to start</p></>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1 pb-10">
        {Object.entries(grouped).map(([dateKey, dateMsgs]) => (
          <div key={dateKey}>
            <div className="flex items-center justify-center my-3 relative z-0">
              <span className="text-[10px] bg-muted text-muted-foreground px-3 py-1 rounded-full font-medium">
                {formatDate(dateMsgs[0].created_at)}
              </span>
            </div>
            {dateMsgs.map((m, idx) => {
              const isMine = m.sender_id === user?.id;
              const showAvatar = idx === 0 || dateMsgs[idx - 1]?.sender_id !== m.sender_id;
              const isLastInGroup = idx === dateMsgs.length - 1 || dateMsgs[idx + 1]?.sender_id !== m.sender_id;

              let avatarUrl = isMine ? (userProfile?.avatar_url || null) : (userProfiles[m.sender_id]?.avatar_url || null);
              let senderName = isMine ? (userProfile?.full_name || "You") : (userProfiles[m.sender_id]?.full_name || "User");
              if (m.is_admin_message && m.is_broadcast) senderName = "System Admin";

              // Reaction summary grouping
              const reactionCounts = (m.chat_reactions || []).reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc;
              }, {} as Record<string, number>);

              if (m.is_broadcast) {
                return (
                  <div key={m.id} className={`flex justify-center ${showAvatar ? "mt-4" : "mt-1.5"} relative ${activeReactionMessage === m.id ? 'z-50' : 'z-10'}`}>
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-accent/60 border border-accent text-foreground text-sm relative group">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Megaphone className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-semibold text-primary">Announcement by {senderName}</span>
                      </div>
                      
                      {m.is_deleted ? (
                         <p className="italic text-muted-foreground opacity-60">This message was unsent.</p>
                      ) : (
                        <>
                          {m.attachment_url && m.attachment_type?.startsWith('image/') ? (
                             <img src={m.attachment_url} alt="Attachment" className="max-w-full rounded-md mb-2 mt-1 max-h-48 object-cover" />
                          ) : m.attachment_url ? (
                             <a href={m.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border my-2 hover:bg-background/80 transition text-xs">
                               <Download className="w-4 h-4" /> {m.attachment_name || "Download File"}
                             </a>
                          ) : null}
                          <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        </>
                      )}
                      
                      <div className="text-[9px] text-muted-foreground mt-1 text-right">{formatTime(m.created_at)}</div>

                      {/* Reaction Menu */}
                      {!m.is_deleted && (
                        <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1 bg-background border rounded-full p-0.5 shadow-sm z-20">
                          <button onClick={() => setActiveReactionMessage(activeReactionMessage === m.id ? null : m.id)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition"><SmilePlus className="w-3.5 h-3.5 text-muted-foreground"/></button>
                          {isMine && <button onClick={() => handleDeleteMessage(m.id)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition hover:text-destructive"><Trash2 className="w-3.5 h-3.5"/></button>}
                        </div>
                      )}
                      {activeReactionMessage === m.id && !m.is_deleted && (
                        <div className="absolute top-full mt-1 right-2 bg-background border p-1 rounded-full flex gap-1 shadow-xl z-50">
                          {EMOJIS.map(em => (
                            <button key={em} onClick={() => handleReact(m.id, em)} className="w-7 h-7 rounded-full hover:bg-muted text-sm">{em}</button>
                          ))}
                        </div>
                      )}
                      {Object.keys(reactionCounts).length > 0 && !m.is_deleted && (
                        <div className="absolute -bottom-2 -left-2 bg-background border rounded-full px-1.5 py-0.5 text-[10px] flex gap-1 items-center shadow-sm">
                          {Object.entries(reactionCounts).map(([emoji, count]) => (
                            <span key={emoji} className="flex gap-0.5 items-center">{emoji} <span className="text-muted-foreground font-medium">{count}</span></span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className={`relative ${activeReactionMessage === m.id ? 'z-50' : 'z-10'}`}>
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${showAvatar ? "mt-4" : "mt-1.5"}`}>
                    {!isMine && (
                      <div className="w-10 flex-shrink-0 mr-1.5">
                        {showAvatar && getAvatarComponent(avatarUrl, senderName, "sm")}
                      </div>
                    )}
                    <div className={`max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"} relative group`}>
                      {showAvatar && !isMine && <div className="text-[10px] text-muted-foreground font-medium ml-1 mb-0.5">{senderName}</div>}
                      
                      <div className={`px-3 py-2 text-sm leading-relaxed relative ${isMine ? `bg-primary text-primary-foreground ${isLastInGroup ? "rounded-2xl rounded-br-sm" : "rounded-2xl"}` : `bg-card border shadow-sm text-foreground ${isLastInGroup ? "rounded-2xl rounded-bl-sm" : "rounded-2xl"}`}`}>
                        
                        {/* Message Actions Menu (Absolute) */}
                        {!m.is_deleted && (
                          <div className={`absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-card border rounded-full p-0.5 shadow-sm z-20 ${isMine ? 'right-2' : 'left-2'}`}>
                            <button onClick={() => setActiveReactionMessage(activeReactionMessage === m.id ? null : m.id)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground">
                              <SmilePlus className="w-3.5 h-3.5"/>
                            </button>
                            {isMine && (
                              <button onClick={() => handleDeleteMessage(m.id)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            )}
                          </div>
                        )}
                        {activeReactionMessage === m.id && !m.is_deleted && (
                          <div className={`absolute top-full mt-1 flex gap-1 bg-card border rounded-full p-1 shadow-lg z-50 ${isMine ? 'right-0' : 'left-0'}`}>
                            {EMOJIS.map(em => (
                              <button key={em} onClick={() => handleReact(m.id, em)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted text-sm transition-colors text-foreground">{em}</button>
                            ))}
                          </div>
                        )}

                        {/* Content */}
                        {m.is_deleted ? (
                          <p className={`italic text-xs opacity-70 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>This message was unsent.</p>
                        ) : (
                          <>
                            {m.attachment_url && m.attachment_type?.startsWith('image/') ? (
                              <img src={m.attachment_url} alt="Attachment" className="max-w-[200px] w-full rounded-md mb-2 mt-1 max-h-48 object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(m.attachment_url, '_blank')} />
                            ) : m.attachment_url ? (
                              <a href={m.attachment_url} target="_blank" rel="noreferrer" className={`flex w-full min-w-[140px] items-center gap-2 p-2.5 rounded-lg border my-1 transition-colors text-xs ${isMine ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20' : 'bg-background hover:bg-muted text-card-foreground'}`}>
                                <Download className="w-4 h-4 shrink-0" /> <span className="truncate">{m.attachment_name || "Attachment"}</span>
                              </a>
                            ) : null}
                             <p className="whitespace-pre-wrap break-words">{m.message !== m.attachment_name ? m.message : ''}</p>
                          </>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          <span className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(m.created_at)}</span>
                          {isMine && <span className={`text-[9px] ${m.read ? "text-primary-foreground border-primary-foreground font-bold" : "text-primary-foreground/40"}`}>{m.read ? "✓✓" : "✓"}</span>}
                        </div>
                        
                        {/* Reaction Pill */}
                        {Object.keys(reactionCounts).length > 0 && !m.is_deleted && (
                          <div className={`absolute -bottom-3 ${isMine ? '-left-2' : '-right-2'} bg-card border text-foreground rounded-full px-1.5 py-0.5 text-[10px] flex gap-1 z-10 shadow-sm whitespace-nowrap`}>
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                               <span key={emoji} className="flex gap-0.5 items-center">{emoji} <span className="text-muted-foreground font-medium">{count}</span></span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {isMine && <div className="w-10 flex-shrink-0 ml-1.5">{showAvatar && getAvatarComponent(avatarUrl, senderName, "sm")}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {/* Adds padding to accommodate the last reaction pill */}
        <div ref={ref} className="h-4" />
      </div>
    );
  };

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
      <button onClick={() => setOpen(!open)} className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-all hover:scale-105">
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-[420px] h-[75vh] max-h-[650px] bg-card border rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center gap-3">
            {selectedUser && <button onClick={() => setSelectedUser(null)} className="hover:opacity-70 transition-opacity"><ArrowLeft className="w-5 h-5" /></button>}
            <div className="relative">
              {activeTab === "broadcast" && !selectedUser ? <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"><Megaphone className="w-5 h-5" /></div> : selectedUser ? getAvatarComponent(userProfiles[selectedUser]?.avatar_url || null, userProfiles[selectedUser]?.full_name || "U", "md") : <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="You" className="w-full h-full object-cover" /> : <Users className="w-5 h-5" />}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate flex items-center gap-2">
                {selectedUser ? selectedUserInfo?.full_name || "User" : activeTab === "broadcast" ? "Announcements" : "Inbox"}
                {selectedUser && userProfiles[selectedUser]?.is_online && (
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
              {selectedUser && selectedUserInfo && (
                <div className="text-[11px] opacity-70 truncate flex items-center gap-1">
                  {userProfiles[selectedUser]?.is_online ? "Online" : "Offline"} • {selectedUserInfo.email}
                </div>
              )}
              {!selectedUser && activeTab === "broadcast" && <div className="text-[11px] opacity-70">System Updates</div>}
              {!selectedUser && activeTab === "chats" && <div className="text-[11px] opacity-70">{userProfile?.full_name}</div>}
            </div>
          </div>

          {!selectedUser && (
            <div className="border-b px-2 pt-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chats" | "broadcast")}>
                <TabsList className="w-full grid grid-cols-2 h-9">
                  <TabsTrigger value="chats" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" />Chats</TabsTrigger>
                  <TabsTrigger value="broadcast" className="text-xs gap-1.5"><Megaphone className="w-3.5 h-3.5" />Announce</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {!selectedUser && activeTab === "chats" && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-muted/50 border-0 h-9" />
                </div>
              </div>
              <div className="px-3 pb-2 text-xs text-muted-foreground font-medium uppercase tracking-wider flex justify-between"><span>Contacts</span><span>{filteredUsers.length}</span></div>
              
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {filteredUsers.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No users found</p></div> : filteredUsers.map(u => (
                  <button key={u.id} onClick={() => setSelectedUser(u.id)} className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b transition-colors flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><span className="text-sm font-semibold">{(u.full_name || "U").charAt(0).toUpperCase()}</span></div>}
                      {userProfiles[u.id]?.is_online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex justify-between items-center">
                        <span className="truncate">{u.full_name || "Unknown User"}</span>
                        {u.role === "admin" && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2 uppercase flex-shrink-0">Admin</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                    {unreadPerUser[u.id] > 0 && (
                      <div className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                        {unreadPerUser[u.id] > 9 ? "9+" : unreadPerUser[u.id]}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!selectedUser && activeTab === "broadcast" && (
            <>
              <div className="flex-1 overflow-y-auto p-3 bg-muted/20 pb-4">
                {renderMessages(broadcastMessages, broadcastBottomRef, true)}
              </div>
              {isAdmin && (
                <div className="p-3 border-t bg-card flex items-end gap-2">
                  <input type="file" className="hidden" ref={broadcastFileInputRef} onChange={(e) => handleFileUpload(e, true)} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => broadcastFileInputRef.current?.click()} className="rounded-full w-9 h-9 flex-shrink-0 text-muted-foreground" disabled={uploading}>
                     <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input placeholder={uploading ? "Uploading..." : "Type an announcement..."} value={input} onChange={e => handleTyping(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleBroadcast()} className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-1" disabled={uploading} />
                  <Button size="icon" onClick={handleBroadcast} disabled={(!input.trim() && !uploading) || uploading} className="rounded-full w-9 h-9 flex-shrink-0">
                     <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {selectedUser && (
            <>
              <div className="flex-1 overflow-y-auto p-3 bg-muted/20 pb-4">
                {renderMessages(messages, bottomRef)}
              </div>
              <div className="p-3 border-t bg-card">
                <div className="flex items-end gap-2">
                  <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e, false)} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} className="rounded-full w-9 h-9 flex-shrink-0 text-muted-foreground" disabled={uploading}>
                     <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input placeholder={uploading ? "Uploading..." : "Type a message..."} value={input} onChange={e => handleTyping(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-1" disabled={uploading} />
                  <Button size="icon" onClick={handleSend} disabled={(!input.trim() && !uploading) || uploading} className="rounded-full w-9 h-9 flex-shrink-0">
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