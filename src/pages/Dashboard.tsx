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

  useEffect(() => {
    const fetchData = async () => {
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">NORSU Bais Campus Supply Office Overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(s => (
          <Card
            key={s.label}
            className="border-0 cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            style={{ background: s.gradient, borderRadius: 14, boxShadow: "0 4px 15px rgba(0,0,0,0.12)" }}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/20 shrink-0">
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold leading-tight truncate text-white">{s.value}</div>
                <div className="text-[11px] text-white/80 leading-tight mt-0.5">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Supplies Received Per Month</h3>
              <Link to="/receiving" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReceiving} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  <Bar dataKey="quantity" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-4">Inventory Category Distribution</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ percent }) => `${percent}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value, entry: any) => (
                      <span className="text-xs text-foreground ml-1">
                        {value} <span className="text-muted-foreground">{entry.payload?.percent}%</span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Trend + Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Line/Area Chart */}
        <Card className="lg:col-span-3 shadow-sm border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Distribution Trend Over Time</h3>
              <Link to="/distribution" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={distributionTrend}>
                  <defs>
                    <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="quantity" stroke="hsl(142, 71%, 45%)" strokeWidth={2.5} fill="url(#colorDist)" dot={{ r: 4, fill: "hsl(142, 71%, 45%)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card className="lg:col-span-2 shadow-sm border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Recent Requests</h3>
              <Link to="/requests" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentRequests.map(r => (
                <div key={r.id} className="flex justify-between items-center p-3 bg-muted/40 rounded-xl">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{r.item_name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.requesting_office}</div>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                    r.status === "approved" || r.status === "fulfilled" ? "bg-green-100 text-green-700" :
                    r.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                  }`}>{r.status === "fulfilled" ? "approved" : r.status}</span>
                </div>
              ))}
              {recentRequests.length === 0 && <p className="text-sm text-muted-foreground">No requests yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Supplies Received */}
      <Card className="shadow-sm border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Recent Supplies Received</h3>
            <Link to="/receiving" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentReceived.map(r => (
              <div key={r.id} className="flex justify-between items-center p-3 bg-muted/40 rounded-xl">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{r.item_name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.date_received} · {r.supplier}</div>
                </div>
                <span className="text-sm font-semibold text-foreground shrink-0 ml-2">{r.quantity} {r.unit_of_measure}</span>
              </div>
            ))}
            {recentReceived.length === 0 && <p className="text-sm text-muted-foreground">No records yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
