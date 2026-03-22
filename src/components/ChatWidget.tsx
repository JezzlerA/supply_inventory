import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, X, Send, ArrowLeft, User, Megaphone, Users } from "lucide-react";
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
}

const ChatWidget = () => {
  const { user, role, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminTab, setAdminTab] = useState<"chats" | "broadcast">("chats");
  const [broadcastMessages, setBroadcastMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const broadcastBottomRef = useRef<HTMLDivElement>(null);

  const isAdmin = role === "admin";
  const selectedUserInfo = users.find(u => u.id === selectedUser);

  const fetchMessages = async () => {
    if (!user) return;

    if (isAdmin && selectedUser) {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .or(`sender_id.eq.${selectedUser},receiver_id.eq.${selectedUser}`)
        .eq("is_broadcast", false)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    } else if (!isAdmin) {
      // Users see DMs + broadcast messages
      const { data: dms } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("is_broadcast", false)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      const { data: broadcasts } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("is_broadcast", true)
        .order("created_at", { ascending: true });

      // Merge and sort
      const all = [...(dms || []), ...(broadcasts || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(all);
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
    if (isAdmin) {
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("is_admin_message", false)
        .eq("is_broadcast", false)
        .eq("read", false);
      setUnreadCount(count || 0);
    } else {
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("sender_id")
      .eq("is_admin_message", false)
      .eq("is_broadcast", false);

    const uniqueIds = [...new Set((data || []).map(d => d.sender_id))];
    if (uniqueIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueIds);
      setUsers(profiles || []);
    }
  };

  useEffect(() => {
    fetchUnread();
    if (isAdmin) {
      fetchUsers();
      fetchBroadcasts();
    }

    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        fetchMessages();
        fetchUnread();
        if (isAdmin) {
          fetchUsers();
          fetchBroadcasts();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, role]);

  useEffect(() => {
    if (open) {
      fetchMessages();
      if (isAdmin) fetchBroadcasts();
      if (user) {
        if (isAdmin && selectedUser) {
          supabase
            .from("chat_messages")
            .update({ read: true })
            .eq("sender_id", selectedUser)
            .eq("is_admin_message", false)
            .eq("read", false)
            .then(() => fetchUnread());
        } else if (!isAdmin) {
          supabase
            .from("chat_messages")
            .update({ read: true })
            .eq("receiver_id", user.id)
            .eq("read", false)
            .then(() => fetchUnread());
        }
      }
    }
  }, [open, selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    broadcastBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [broadcastMessages]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    const receiverId = isAdmin ? selectedUser : null;

    await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: receiverId,
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
              <p className="text-xs mt-1">Broadcast a message to all users</p>
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

              // Broadcast messages show with a special style
              if (m.is_broadcast) {
                return (
                  <div key={m.id} className={`flex justify-center ${showAvatar ? "mt-3" : "mt-0.5"}`}>
                    <div className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-accent/60 border border-accent text-foreground text-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Megaphone className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-semibold text-primary">Announcement</span>
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
                <div
                  key={m.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"}`}
                >
                  {!isMine && (
                    <div className="w-7 flex-shrink-0 mr-1.5">
                      {showAvatar && (
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <span className="text-[10px] font-bold">
                            {m.is_admin_message ? "A" : (selectedUserInfo?.full_name || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                    {showAvatar && !isMine && (
                      <div className="text-[10px] text-muted-foreground font-medium ml-1 mb-0.5">
                        {m.is_admin_message ? "Admin" : (isAdmin ? selectedUserInfo?.full_name : "Admin")}
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
                </div>
              );
            })}
          </div>
        ))}
        <div ref={ref} />
      </div>
    );
  };

  return (
    <>
      {/* Floating button */}
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

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-[420px] h-[70vh] max-h-[600px] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center gap-3">
            {isAdmin && selectedUser && (
              <button onClick={() => setSelectedUser(null)} className="hover:opacity-70 transition-opacity">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              {isAdmin && adminTab === "broadcast" && !selectedUser ? (
                <Megaphone className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {isAdmin
                  ? selectedUser
                    ? selectedUserInfo?.full_name || "User"
                    : adminTab === "broadcast"
                      ? "Announcements"
                      : "Chat Support"
                  : "Chat with Admin"}
              </div>
              {isAdmin && selectedUser && selectedUserInfo && (
                <div className="text-[11px] opacity-70 truncate">{selectedUserInfo.email}</div>
              )}
              {isAdmin && !selectedUser && adminTab === "broadcast" && (
                <div className="text-[11px] opacity-70">Send to all users</div>
              )}
              {!isAdmin && (
                <div className="text-[11px] opacity-70">We typically reply instantly</div>
              )}
            </div>
          </div>

          {/* Admin tabs (only when no user selected) */}
          {isAdmin && !selectedUser && (
            <div className="border-b px-2 pt-2">
              <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as "chats" | "broadcast")}>
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

          {/* Admin chats tab - user list */}
          {isAdmin && !selectedUser && adminTab === "chats" && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Conversations
              </div>
              {users.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Messages from users will appear here</p>
                </div>
              ) : (
                users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u.id)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">
                        {(u.full_name || "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{u.full_name || "Unknown User"}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Admin broadcast tab */}
          {isAdmin && !selectedUser && adminTab === "broadcast" && (
            <>
              <div className="flex-1 overflow-y-auto p-3 bg-muted/20">
                {renderMessages(broadcastMessages, broadcastBottomRef, true)}
              </div>
              <div className="p-3 border-t bg-card flex items-end gap-2">
                <Input
                  placeholder="Type an announcement..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
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
            </>
          )}

          {/* DM messages area (admin with selected user, or regular user) */}
          {(!isAdmin || selectedUser) && (
            <>
              <div className="flex-1 overflow-y-auto p-3 bg-muted/20">
                {renderMessages(messages, bottomRef)}
              </div>
              <div className="p-3 border-t bg-card flex items-end gap-2">
                <Input
                  placeholder="Type a message..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
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
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
