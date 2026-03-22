import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Printer, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import ItemMonitoringReport from "@/components/ItemMonitoringReport";

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
}

interface AssignedItem {
  id: string;
  item_name: string;
  serial_number: string;
  date_assigned: string;
  possession_status: string;
  condition_status: string;
}

interface UserTransaction {
  id: string;
  item_name: string;
  transaction_type: string;
  status: string;
  created_at: string;
  quantity: number;
}

interface ReportItem {
  item_name: string;
  serial_number: string;
  transaction_type: string;
  possession_status: string;
  condition_status: string;
  date: string;
  status: string;
}

const possessionColor = (status: string) => {
  switch (status) {
    case "With User": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Missing": return "bg-red-100 text-red-800 border-red-200";
    case "Transferred": return "bg-amber-100 text-amber-800 border-amber-200";
    case "Returned to Inventory": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-muted text-muted-foreground";
  }
};

const conditionColor = (status: string) => {
  switch (status) {
    case "Functional": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Non-Functional": return "bg-red-100 text-red-800 border-red-200";
    case "Damaged": return "bg-orange-100 text-orange-800 border-orange-200";
    case "Under Repair": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default: return "bg-muted text-muted-foreground";
  }
};

const ItemMonitoringReportTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) fetchUserReport(selectedUser.id);
  }, [selectedUser]);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, email");
    if (data) setUsers(data);
  };

  const fetchUserReport = async (userId: string) => {
    setLoading(true);
    // Fetch assigned items with latest possession/condition status
    const { data: assigned } = await supabase
      .from("assigned_items")
      .select("*, inventory_items:inventory_item_id(serial_number)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Fetch user transactions (requests, returns, etc.)
    const { data: transactions } = await supabase
      .from("user_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const items: ReportItem[] = [];

    // Add assigned items
    ((assigned as any[]) || []).forEach((item) => {
      const serial = item.serial_number || item.inventory_items?.serial_number || "";
      items.push({
        item_name: item.item_name,
        serial_number: serial,
        transaction_type: "Assigned",
        possession_status: item.possession_status,
        condition_status: item.condition_status,
        date: format(new Date(item.date_assigned), "MMM d, yyyy"),
        status: item.possession_status === "With User" ? "Approved" : item.possession_status,
      });
    });

    // Add transactions (requests, returns) that aren't already represented
    const assignedNames = new Set(((assigned as any[]) || []).map(a => a.item_name));
    ((transactions as UserTransaction[]) || []).forEach((tx) => {
      // Find matching assigned item for latest status
      const matchedAssigned = ((assigned as any[]) || []).find(
        a => a.item_name === tx.item_name
      );
      items.push({
        item_name: tx.item_name,
        serial_number: matchedAssigned?.serial_number || matchedAssigned?.inventory_items?.serial_number || "—",
        transaction_type: tx.transaction_type,
        possession_status: matchedAssigned?.possession_status || "—",
        condition_status: matchedAssigned?.condition_status || "—",
        date: format(new Date(tx.created_at), "MMM d, yyyy"),
        status: tx.status,
      });
    });

    setReportItems(items);
    setLoading(false);
  };

  const handlePrint = () => window.print();

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="print:hidden">
        {!selectedUser ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Select a User
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setSearchQuery(""); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm hover:bg-muted"
                >
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(null); setReportItems([]); }}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle className="text-base">
                    Transaction Report — {selectedUser.full_name}
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                  <Printer className="w-4 h-4" /> Print Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              ) : reportItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions found for this user</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Transaction Type</TableHead>
                          <TableHead>Possession Status</TableHead>
                          <TableHead>Condition Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportItems.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell className="text-muted-foreground">{item.serial_number || "—"}</TableCell>
                            <TableCell>{item.transaction_type}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={possessionColor(item.possession_status)}>
                                {item.possession_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={conditionColor(item.condition_status)}>
                                {item.condition_status}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-muted-foreground">
                    Total Transactions: {reportItems.length}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Printable Report */}
      {selectedUser && reportItems.length > 0 && (
        <ItemMonitoringReport
          ref={reportRef}
          userName={selectedUser.full_name}
          items={reportItems}
        />
      )}
    </div>
  );
};

export default ItemMonitoringReportTab;
