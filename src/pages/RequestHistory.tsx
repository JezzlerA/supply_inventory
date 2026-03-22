import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { Search, History, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

const RequestHistory = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { role } = useAuth();

  const fetchTransactions = async () => {
    let query = supabase
      .from("user_transactions")
      .select("*, profiles:user_id(full_name, email)")
      .order("created_at", { ascending: false });

    const { data } = await query;
    setTransactions(data || []);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filtered = transactions.filter(t =>
    t.item_name.toLowerCase().includes(search.toLowerCase()) ||
    t.transaction_type.toLowerCase().includes(search.toLowerCase()) ||
    t.status.toLowerCase().includes(search.toLowerCase())
  );

  const statusCls = (status: string) => {
    switch (status) {
      case "Approved": case "Completed": return "bg-success/10 text-success";
      case "Pending": return "bg-warning/10 text-warning";
      case "Rejected": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const requests = transactions.filter(t => t.transaction_type === "Request").length;
  const returns = transactions.filter(t => t.transaction_type === "Return").length;
  const pending = transactions.filter(t => t.status === "Pending").length;
  const completed = transactions.filter(t => t.status === "Completed" || t.status === "Approved").length;

  const summaryCards = [
    { label: "Total Transactions", value: transactions.length, icon: History, color: "text-blue-600 bg-blue-100" },
    { label: "Requests", value: requests, icon: ArrowUpCircle, color: "text-orange-600 bg-orange-100" },
    { label: "Returns", value: returns, icon: ArrowDownCircle, color: "text-green-600 bg-green-100" },
    { label: "Pending", value: pending, icon: History, color: "text-yellow-600 bg-yellow-100" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6" /> {role === "admin" ? "All User Transactions" : "My Request History"}
        </h1>
        <p className="text-muted-foreground">
          {role === "admin" ? "View all user inventory transactions" : "Track your item requests and returns"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {summaryCards.map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Transaction Log ({filtered.length})</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                {role === "admin" && <TableHead>User</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">
                    {new Date(t.created_at).toLocaleString()}
                  </TableCell>
                  {role === "admin" && (
                    <TableCell>
                      <div className="text-sm font-medium">{(t as any).profiles?.full_name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{(t as any).profiles?.email}</div>
                    </TableCell>
                  )}
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      t.transaction_type === "Request" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}>
                      {t.transaction_type}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{t.item_name}</TableCell>
                  <TableCell>{t.quantity}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCls(t.status)}`}>
                      {t.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{t.notes || "—"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={role === "admin" ? 7 : 6} className="text-center text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestHistory;
