import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, X, Clock, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const NotificationBell = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user, role } = useAuth();

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("supply_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setRequests(data || []);
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
  };

  useEffect(() => {
    fetchRequests();
    fetchNotifications();

    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "supply_requests" }, () => {
        fetchRequests();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const totalBadge = (role === "admin" ? pendingCount : 0) + unreadNotifs;

  const updateStatus = async (id: string, status: string) => {
    const request = requests.find(r => r.id === id);
    const { error } = await supabase.from("supply_requests").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Send notification to user
    if (request?.user_id) {
      const notifTitle = status === "fulfilled" ? "Request Approved" : "Request Rejected";
      const notifMessage = status === "fulfilled"
        ? `Your requested item "${request.item_name}" has been approved.`
        : `Your request for "${request.item_name}" has been rejected.`;

      await supabase.from("notifications").insert({
        user_id: request.user_id,
        title: notifTitle,
        message: notifMessage,
        type: status === "fulfilled" ? "success" : "error",
        related_id: id,
      });
    }

    toast({ title: `Request ${status}` });
    fetchRequests();
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    fetchNotifications();
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    fetchNotifications();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "fulfilled": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-3 h-3" />;
      case "fulfilled": return <Check className="w-3 h-3" />;
      case "rejected": return <X className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error": return <X className="w-4 h-4 text-red-600" />;
      case "warning": return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default: return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none animate-pulse">
              {totalBadge > 9 ? "9+" : totalBadge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0">
        <Tabs defaultValue={role === "admin" ? "requests" : "notifications"}>
          <div className="px-4 py-3 border-b">
            <TabsList className="w-full">
              {role === "admin" && (
                <TabsTrigger value="requests" className="flex-1 text-xs">
                  Requests {pendingCount > 0 && `(${pendingCount})`}
                </TabsTrigger>
              )}
              <TabsTrigger value="notifications" className="flex-1 text-xs">
                Notifications {unreadNotifs > 0 && `(${unreadNotifs})`}
              </TabsTrigger>
            </TabsList>
          </div>

          {role === "admin" && (
            <TabsContent value="requests" className="m-0">
              <ScrollArea className="max-h-[400px]">
                {requests.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No requests yet
                  </div>
                ) : (
                  <div className="divide-y">
                    {requests.map(r => (
                      <div key={r.id} className={`p-3 hover:bg-muted/50 transition-colors ${r.status === "pending" ? "bg-primary/5" : ""}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${getStatusColor(r.status)}`}>
                            {getStatusIcon(r.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{r.item_name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${getStatusColor(r.status)}`}>
                                {r.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {r.requesting_office} · Qty: {r.quantity}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              By {r.requested_by} · {r.date_requested}
                            </p>

                            {r.status === "pending" && (
                              <div className="flex gap-1.5 mt-2">
                                <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => updateStatus(r.id, "fulfilled")}>
                                  <Check className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs px-2.5" onClick={() => updateStatus(r.id, "rejected")}>
                                  <X className="w-3 h-3 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          <TabsContent value="notifications" className="m-0">
            {unreadNotifs > 0 && (
              <div className="px-4 py-2 border-b flex justify-end">
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all as read</button>
              </div>
            )}
            <ScrollArea className="max-h-[400px]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}
                      onClick={() => !n.read && markNotifRead(n.id)}
                    >
                      <div className="flex items-start gap-3">
                        {getNotifIcon(n.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{n.title}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {requests.length > 0 && (
          <div className="px-4 py-2.5 border-t text-center">
            <a href="/requests" className="text-xs text-primary hover:underline font-medium">
              View all requests →
            </a>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
