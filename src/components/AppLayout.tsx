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
  const { profile, role, signOut, profileLoading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const initials = (profile?.full_name || "User")
    .split(" ")
    .filter(n => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const { count } = await supabase
          .from("supply_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        setPendingCount(count || 0);
      } catch (err) {
        console.error("Error fetching pending requests:", err);
      }
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
    <div className="flex min-h-screen bg-background font-sans">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-[260px] bg-sidebar text-sidebar-foreground flex flex-col fixed top-0 left-0 h-[100dvh] z-50
          transition-transform duration-300 ease-in-out shadow-2xl
          ${isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
        `}
      >
        {/* Branding */}
        <div className="px-5 py-6 flex items-center gap-3 border-b border-sidebar-border/50">
          <SystemLogo variant="sidebar" className="shrink-0 scale-110" />
          <div className="min-w-0">
            <div className="font-extrabold text-[13px] leading-tight tracking-tight uppercase">NORSU Bais Campus</div>
            <div className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-widest mt-0.5">Supply Office</div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1.5 hover:bg-sidebar-accent rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.filter(item => {
            // If profile/role is still loading, we might want to show some items 
            // but for safety, we wait for the role to decide on adminOnly items.
            // However, to satisfy "render immediately", we show all non-restricted items.
            if (profileLoading && (item.adminOnly || (item as any).userOnly)) {
               return false; // Hide restricted items while determining role
            }
            if (item.adminOnly && role !== "admin") return false;
            if ((item as any).userOnly && role === "admin") return false;
            return true;
          }).map(item => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group relative ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {pendingCount}
                  </span>
                )}
                {active && (
                  <div className="absolute right-2 w-1 h-4 bg-sidebar-primary-foreground/40 rounded-full" />
                )}
              </Link>
            );
          })}
          
          {profileLoading && (
            <div className="px-4 py-2 space-y-3 opacity-50">
              <div className="h-4 bg-sidebar-accent rounded-md animate-pulse w-3/4" />
              <div className="h-4 bg-sidebar-accent rounded-md animate-pulse w-1/2" />
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-sidebar-border/50">
          <div className="text-[10px] font-medium text-sidebar-foreground/30 uppercase tracking-wider">
            IMS v1.0.0
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${isMobile ? "ml-0" : "ml-[260px]"}`}>
        {/* Top bar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 mr-2 hover:bg-muted rounded-xl transition-colors">
                <Menu className="w-5 h-5 text-sidebar-foreground" />
              </button>
            )}
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-gray-900 uppercase">NORSU Bais Campus</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inventory System</span>
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <NotificationBell />

            <div className="h-8 w-px bg-gray-100 hidden md:block" />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 group outline-none">
                <div className="flex flex-col items-end hidden md:flex">
                  <span className="text-sm font-bold text-gray-900 leading-none">
                    {profile?.full_name || (profileLoading ? "Loading..." : "User")}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tighter mt-1">
                    {role || (profileLoading ? "Checking..." : "Staff")}
                  </span>
                </div>
                <Avatar className="w-9 h-9 shadow-md transition-transform duration-200 group-hover:scale-105 border-2 border-white ring-1 ring-gray-100">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                  <AvatarFallback className="text-[11px] font-black bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-2xl border-gray-100">
                <div className="px-2 py-2 mb-1 md:hidden">
                   <div className="text-sm font-bold text-gray-900">{profile?.full_name}</div>
                   <div className="text-[10px] text-muted-foreground uppercase">{role}</div>
                </div>
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer gap-2.5 px-3 py-2.5 rounded-lg font-medium">
                  <User className="w-4 h-4 text-primary" /> My Profile
                </DropdownMenuItem>
                {role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/user-management")} className="cursor-pointer gap-2.5 px-3 py-2.5 rounded-lg font-medium">
                    <Users className="w-4 h-4 text-primary" /> User Management
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate(role === "admin" ? "/settings" : "/user-settings")} className="cursor-pointer gap-2.5 px-3 py-2.5 rounded-lg font-medium">
                  <Settings className="w-4 h-4 text-primary" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer gap-2.5 px-3 py-2.5 rounded-lg font-bold text-destructive focus:text-destructive focus:bg-destructive/5">
                  <LogOut className="w-4 h-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </main>
      </div>
    </div>
  );
};


export default AppLayout;
