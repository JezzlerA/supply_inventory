import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ClipboardList, FileText, Send, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart
} from "recharts";

const CHART_COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)"];

const Dashboard = () => {
  const [stats, setStats] = useState({ received: 0, inventory: 0, pending: 0, distributions: 0, lowStock: 0, totalValue: 0 });
  const [recentReceived, setRecentReceived] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [monthlyReceiving, setMonthlyReceiving] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [distributionTrend, setDistributionTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [recvRes, invRes, reqRes, distRes, catRes] = await Promise.all([
          supabase.from("receiving_records").select("*").order("created_at", { ascending: false }),
          supabase.from("inventory_items").select("*, categories(name)"),
          supabase.from("supply_requests").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("distributions").select("*").order("created_at", { ascending: false }),
          supabase.from("categories").select("*"),
        ]);

        const inv = invRes.data || [];
        const recv = recvRes.data || [];
        const reqs = reqRes.data || [];
        const dist = distRes.data || [];
        const lowStock = inv.filter(i => i.stock_quantity <= 5).length;
        const totalValue = inv.reduce((s, i) => s + (i.stock_quantity * Number(i.unit_cost)), 0);
        const pendingCount = reqs.filter(r => r.status === "pending").length;

        setStats({ received: recv.length, inventory: inv.length, pending: pendingCount, distributions: dist.length, lowStock, totalValue });
        setRecentReceived(recv.slice(0, 5));
        setRecentRequests(reqs.slice(0, 5));

        // Monthly receiving chart
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthCounts: Record<string, number> = {};
        months.forEach(m => monthCounts[m] = 0);
        recv.forEach(r => {
          const d = new Date(r.date_received || r.created_at);
          const m = months[d.getMonth()];
          monthCounts[m] = (monthCounts[m] || 0) + r.quantity;
        });
        setMonthlyReceiving(months.map(m => ({ month: m, quantity: monthCounts[m] })));

        // Category distribution
        const catCounts: Record<string, number> = {};
        inv.forEach(i => {
          const catName = (i as any).categories?.name || "Uncategorized";
          catCounts[catName] = (catCounts[catName] || 0) + 1;
        });
        const total = inv.length || 1;
        setCategoryData(Object.entries(catCounts).map(([name, count]) => ({
          name, value: count, percent: Math.round((count / total) * 100)
        })));

        // Distribution trend
        const distMonthCounts: Record<string, number> = {};
        months.forEach(m => distMonthCounts[m] = 0);
        dist.forEach(d => {
          const dt = new Date(d.date_issued || d.created_at);
          const m = months[dt.getMonth()];
          distMonthCounts[m] = (distMonthCounts[m] || 0) + d.quantity;
        });
        setDistributionTrend(months.map(m => ({ month: m, quantity: distMonthCounts[m] })));
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: "Items Received", value: stats.received, icon: Package, gradient: "linear-gradient(135deg, #4e73df, #224abe)" },
    { label: "Inventory Items", value: stats.inventory, icon: ClipboardList, gradient: "linear-gradient(135deg, #1cc88a, #169a6b)" },
    { label: "Pending Requests", value: stats.pending, icon: FileText, gradient: "linear-gradient(135deg, #f6c23e, #dda20a)" },
    { label: "Total Distributions", value: stats.distributions, icon: Send, gradient: "linear-gradient(135deg, #6f42c1, #4e2d91)" },
    { label: "Low Stock Items", value: stats.lowStock, icon: AlertTriangle, gradient: "linear-gradient(135deg, #e74a3b, #c0392b)" },
    { label: "Inventory Value", value: `₱${stats.totalValue.toLocaleString()}`, icon: TrendingUp, gradient: "linear-gradient(135deg, #20c9a6, #148f77)" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">NORSU Bais Campus Supply Office Overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-3 py-1.5 rounded-full border border-muted-foreground/10">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Real-time Updates Active
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl border border-gray-100" />
          ))
        ) : (
          statCards.map(s => (
            <Card
              key={s.label}
              className="border-0 cursor-default transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl group overflow-hidden"
              style={{ background: s.gradient, borderRadius: 20, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)" }}
            >
              <CardContent className="p-5 flex flex-col items-center text-center gap-3 relative">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                  <s.icon className="w-24 h-24 text-white" />
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/20 shrink-0 backdrop-blur-md">
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 z-10">
                  <div className="text-xl font-black leading-none truncate text-white">{s.value}</div>
                  <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-2">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <Card className="shadow-2xl border-0 rounded-[24px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-base text-gray-900">Supplies Received Per Month</h3>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-tighter">Transaction volume by month</p>
              </div>
              <Link to="/receiving" className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                Full Report <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="h-[280px]">
              {loading ? (
                <div className="w-full h-full bg-gray-100/50 animate-pulse rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyReceiving} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: "#94a3b8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: "#94a3b8" }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", padding: '12px' }} 
                    />
                    <Bar dataKey="quantity" fill="hsl(217, 91%, 60%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="shadow-2xl border-0 rounded-[24px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
          <CardContent className="p-6">
            <h3 className="font-bold text-base text-gray-900 mb-6">Inventory Category Distribution</h3>
            <div className="h-[280px]">
              {loading ? (
                <div className="w-full h-full bg-gray-100/50 animate-pulse rounded-full max-w-[240px] mx-auto" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ percent }) => `${percent}%`}
                      labelLine={false}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      iconSize={10}
                      formatter={(value, entry: any) => (
                        <span className="text-[12px] font-bold text-gray-700 ml-2">
                          {value} <span className="text-muted-foreground font-medium ml-1">{entry.payload?.percent}%</span>
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Trend + Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Line/Area Chart */}
        <Card className="lg:col-span-3 shadow-2xl border-0 rounded-[24px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-base text-gray-900">Distribution Trend Over Time</h3>
              <Link to="/distribution" className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                Analytics <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="h-[250px]">
              {loading ? (
                <div className="w-full h-full bg-gray-100/50 animate-pulse rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={distributionTrend}>
                    <defs>
                      <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: "#94a3b8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
                    <Area 
                      type="monotone" 
                      dataKey="quantity" 
                      stroke="hsl(142, 71%, 45%)" 
                      strokeWidth={3} 
                      fill="url(#colorDist)" 
                      dot={{ r: 5, fill: "hsl(142, 71%, 45%)", strokeWidth: 2, stroke: "#fff" }} 
                      activeDot={{ r: 7, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card className="lg:col-span-2 shadow-2xl border-0 rounded-[24px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-base text-gray-900">Recent Requests</h3>
              <Link to="/requests" className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                Manage <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-4">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100/50 animate-pulse rounded-xl" />
                ))
              ) : (
                recentRequests.map(r => (
                  <div key={r.id} className="flex justify-between items-center p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-gray-800 truncate group-hover:text-primary transition-colors">{r.item_name}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{r.requesting_office}</div>
                    </div>
                    <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-tighter shrink-0 ${
                      r.status === "approved" || r.status === "fulfilled" ? "bg-green-50 text-green-700" :
                      r.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-red-50 text-red-700"
                    }`}>{r.status === "fulfilled" ? "approved" : r.status}</span>
                  </div>
                ))
              )}
              {!loading && recentRequests.length === 0 && (
                <div className="text-center py-8">
                   <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest">No active requests</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Supplies Received */}
      <Card className="shadow-2xl border-0 rounded-[24px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-base text-gray-900">Recent Supplies Received</h3>
            <Link to="/receiving" className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
              History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100/50 animate-pulse rounded-xl" />
              ))
            ) : (
              recentReceived.map(r => (
                <div key={r.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-800 truncate">{r.item_name}</div>
                    <div className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-tighter">
                      {new Date(r.date_received || r.created_at).toLocaleDateString()} · {r.supplier || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <span className="text-sm font-black text-primary block leading-none">{r.quantity}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{r.unit_of_measure}</span>
                  </div>
                </div>
              ))
            )}
            {!loading && recentReceived.length === 0 && (
               <div className="col-span-full text-center py-8">
                  <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest">No receiving records found</div>
               </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


export default Dashboard;
