import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ClipboardList, Loader2, FileText } from "lucide-react";
import ReceiptView, { ReceiptData } from "@/components/ReceiptView";

interface Transaction {
  id: string;
  item_name: string;
  serial_number: string;
  transaction_type: string;
  possession_status: string;
  condition_status: string;
  date: string;
  status: string;
  related_id?: string | null;
}

const statusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved":
    case "fulfilled":
    case "completed":
      return "default";
    case "pending":
      return "secondary";
    case "rejected":
    case "damaged":
      return "destructive";
    default:
      return "outline";
  }
};

const MyTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [receiptsMap, setReceiptsMap] = useState<Record<string, ReceiptData>>({});

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      setLoading(true);

      const { data: assigned } = await supabase
        .from("assigned_items")
        .select("id, item_name, serial_number, possession_status, condition_status, date_assigned, inventory_item_id")
        .eq("user_id", user.id)
        .order("date_assigned", { ascending: false });

      const { data: userTx } = await supabase
        .from("user_transactions")
        .select("id, item_name, transaction_type, status, created_at, quantity, inventory_item_id, related_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch receipts for this user
      const { data: userReceipts } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", user.id);

      const rMap: Record<string, ReceiptData> = {};
      (userReceipts || []).forEach((r: any) => {
        if (r.transaction_id) rMap[r.transaction_id] = r;
        if (r.request_id) rMap[`req_${r.request_id}`] = r;
      });
      setReceiptsMap(rMap);

      const invIds = new Set<string>();
      (assigned || []).forEach(a => { if (a.inventory_item_id) invIds.add(a.inventory_item_id); });
      (userTx || []).forEach(t => { if (t.inventory_item_id) invIds.add(t.inventory_item_id); });

      let invMap: Record<string, string> = {};
      if (invIds.size > 0) {
        const { data: invItems } = await supabase
          .from("inventory_items")
          .select("id, serial_number")
          .in("id", Array.from(invIds));
        (invItems || []).forEach(i => { invMap[i.id] = i.serial_number || ""; });
      }

      const rows: Transaction[] = [];

      (assigned || []).forEach(a => {
        rows.push({
          id: a.id,
          item_name: a.item_name,
          serial_number: a.serial_number || (a.inventory_item_id ? invMap[a.inventory_item_id] || "" : ""),
          transaction_type: "Assigned",
          possession_status: a.possession_status,
          condition_status: a.condition_status,
          date: a.date_assigned,
          status: "Approved",
        });
      });

      (userTx || []).forEach(t => {
        const matchingAssigned = (assigned || []).find(
          a => a.item_name === t.item_name || (a.inventory_item_id && a.inventory_item_id === t.inventory_item_id)
        );

        rows.push({
          id: t.id,
          item_name: t.item_name,
          serial_number: t.inventory_item_id ? invMap[t.inventory_item_id] || "" : "",
          transaction_type: t.transaction_type,
          possession_status: matchingAssigned?.possession_status || "—",
          condition_status: matchingAssigned?.condition_status || "—",
          date: t.created_at,
          status: t.status,
          related_id: t.related_id,
        });
      });

      rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(rows);
      setLoading(false);
    };

    fetchTransactions();
  }, [user]);

  const filtered = transactions.filter(t =>
    t.item_name.toLowerCase().includes(search.toLowerCase()) ||
    t.transaction_type.toLowerCase().includes(search.toLowerCase()) ||
    t.status.toLowerCase().includes(search.toLowerCase()) ||
    t.serial_number.toLowerCase().includes(search.toLowerCase())
  );

  const getReceipt = (t: Transaction): ReceiptData | null => {
    // Match by transaction id or by request related_id
    if (receiptsMap[t.id]) return receiptsMap[t.id];
    if (t.related_id && receiptsMap[`req_${t.related_id}`]) return receiptsMap[`req_${t.related_id}`];
    return null;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6" /> My Transactions
        </h1>
        <p className="text-muted-foreground">View all your inventory transaction records</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Transaction Records ({filtered.length})</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Possession Status</TableHead>
                    <TableHead>Condition Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(t => {
                    const receipt = getReceipt(t);
                    return (
                      <TableRow key={`${t.transaction_type}-${t.id}`}>
                        <TableCell className="font-medium">{t.item_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.serial_number || "—"}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            t.transaction_type === "Request" ? "bg-blue-100 text-blue-700" :
                            t.transaction_type === "Assigned" ? "bg-green-100 text-green-700" :
                            "bg-purple-100 text-purple-700"
                          }`}>
                            {t.transaction_type}
                          </span>
                        </TableCell>
                        <TableCell>{t.possession_status}</TableCell>
                        <TableCell>{t.condition_status}</TableCell>
                        <TableCell className="text-sm">{new Date(t.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {receipt ? (
                            <div className="flex flex-col items-start gap-2 min-w-[140px]">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => {
                                  setSelectedReceipt(receipt);
                                }}
                              >
                                <FileText className="w-3.5 h-3.5 mr-1" /> View
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedReceipt && (
        <ReceiptView
          receipt={selectedReceipt}
          onClose={() => {
            setSelectedReceipt(null);
          }}
        />
      )}
    </div>
  );
};

export default MyTransactions;
