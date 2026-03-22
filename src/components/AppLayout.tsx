import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  FileText,
  Send,
  AlertTriangle,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Users,
  Settings,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationBell from "@/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SystemLogo } from "@/components/SystemLogo";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Receiving", icon: Package, path: "/receiving", adminOnly: true },
  { label: "Inventory", icon: ClipboardList, path: "/inventory" },
  { label: "My Transactions", icon: ClipboardList, path: "/my-transactions", userOnly: true },
  { label: "Requests", icon: FileText, path: "/requests", badge: true, adminOnly: true },
  { label: "Distribution", icon: Send, path: "/distribution", adminOnly: true },
  { label: "Damaged Returns", icon: AlertTriangle, path: "/damaged-returns" },
  { label: "Item Monitoring", icon: Package, path: "/item-monitoring", adminOnly: true },
  { label: "User Management", icon: Users, path: "/user-management", adminOnly: true },
  { label: "Reports", icon: BarChart3, path: "/reports", adminOnly: true },
  { label: "Settings", icon: Settings, path: "/settings", adminOnly: true },
  { label: "Settings", icon: Settings, path: "/user-settings", userOnly: true },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from("supply_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count || 0);
    };
    fetchPending();

    const channel = supabase
      .channel("requests-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "supply_requests" }, () => {
        fetchPending();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-[260px] bg-sidebar text-sidebar-foreground flex flex-col fixed top-0 left-0 h-[100dvh] z-50
          transition-transform duration-300 ease-in-out shadow-xl
          ${isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
        `}
      >
        {/* Branding */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <SystemLogo variant="sidebar" className="shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight tracking-tight">NORSU Bais Campus</div>
            <div className="text-xs text-sidebar-foreground/60">Supply Office</div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1 hover:opacity-80">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.filter(item => {
            if (item.adminOnly && role !== "admin") return false;
            if ((item as any).userOnly && role === "admin") return false;
            return true;
          }).map(item => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span className="flex-1">{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-sidebar-border">
          <div className="text-[11px] text-sidebar-foreground/40 leading-relaxed">
            Inventory Management System<br />v1.0.0
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${isMobile ? "ml-0" : "ml-[260px]"}`}>
        {/* Top bar */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 mr-2 hover:bg-muted rounded-lg transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">NORSU Bais Campus</span>
              <span className="text-xs text-muted-foreground">Supply Office Inventory System</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 hover:opacity-80 transition-opacity outline-none">
                <Avatar className="w-9 h-9 shadow-sm">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                  <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold hidden sm:inline">{profile?.full_name || "User"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer gap-2">
                  <User className="w-4 h-4" /> My Profile
                </DropdownMenuItem>
                {role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/user-management")} className="cursor-pointer gap-2">
                    <Users className="w-4 h-4" /> User Management
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate(role === "admin" ? "/settings" : "/user-settings")} className="cursor-pointer gap-2">
                  <Settings className="w-4 h-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
