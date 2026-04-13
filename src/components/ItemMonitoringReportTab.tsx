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
import ReportFilterModal, { DateRangeFilter } from "./reports/ReportFilterModal";

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  office_location: string | null;
}

interface AssignedItem {
  id: string;
  item_name: string;
  serial_number: string;
  date_assigned: string;

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

  condition_status: string;
  date: string;
  status: string;
  original_date: string;
}



const conditionColor = (status: string) => {
  switch (status) {
    case "Functional": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Non-Functional": return "bg-red-100 text-red-800 border-red-200";
    case "Damaged": return "bg-orange-100 text-orange-800 border-orange-200";
    case "Under Repair": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Missing": return "bg-rose-100 text-rose-800 border-rose-200";
    case "Transferred": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-muted text-muted-foreground";
  }
};

const ItemMonitoringReportTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [offices, setOffices] = useState<string[]>([]);
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState<string>("All Offices");
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchOffices();
  }, []);

  useEffect(() => {
    if (selectedUser) fetchUserReport(selectedUser.id);
  }, [selectedUser]);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, email, office_location");
    if (data) setUsers(data);
  };

  const fetchOffices = async () => {
    const { data } = await supabase.from("offices").select("office_name").order("office_name");
    if (data) setOffices(data.map(o => o.office_name));
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

        condition_status: item.condition_status,
        date: format(new Date(item.date_assigned), "MMM d, yyyy"),
        original_date: item.date_assigned,
        status: "Approved",
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

        condition_status: matchedAssigned?.condition_status || "—",
        date: format(new Date(tx.created_at), "MMM d, yyyy"),
        original_date: tx.created_at,
        status: tx.status,
      });
    });

    setReportItems(items);
    setLoading(false);
  };

  const isWithinDateRange = (dateStr: string) => {
    if (!dateFilter || (!dateFilter.startDate && !dateFilter.endDate)) return true;
    const date = new Date(dateStr);
    if (dateFilter.startDate && dateFilter.endDate) {
      return date >= dateFilter.startDate && date <= dateFilter.endDate;
    }
    return true;
  };

  const handlePrint = () => setIsModalOpen(true);

  const applyFilterAndPrint = (filter: DateRangeFilter) => {
    setDateFilter(filter);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const filteredReportItems = reportItems.filter(item => isWithinDateRange(item.original_date));

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffice = selectedOfficeFilter === "All Offices" || u.office_location === selectedOfficeFilter;
    return matchesSearch && matchesOffice;
  });

  return (
    <div>
      <div className="print:hidden">
        {!selectedUser ? (
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Select a User
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <select 
                  className="h-9 px-3 rounded-md border text-sm w-full sm:w-48 bg-background"
                  value={selectedOfficeFilter}
                  onChange={(e) => setSelectedOfficeFilter(e.target.value)}
                >
                  <option value="All Offices">All Offices</option>
                  {offices.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-3">
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setSearchQuery(""); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm hover:bg-muted border border-transparent hover:border-border"
                >
                  <div className="font-medium flex justify-between items-center">
                    {u.full_name}
                    <Badge variant="secondary" className="text-[10px]">{u.office_location || "Unassigned"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
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
                  <div>
                    <CardTitle className="text-base">
                      Transaction Report — {selectedUser.full_name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedUser.office_location || "Unassigned Office"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                  <Printer className="w-4 h-4" /> Print Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              ) : filteredReportItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions found for this user in the selected period</p>
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

                          <TableHead>Condition Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReportItems.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell className="text-muted-foreground">{item.serial_number || "—"}</TableCell>
                            <TableCell>{item.transaction_type}</TableCell>

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
                    Total Transactions: {filteredReportItems.length}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Printable Report */}
      {selectedUser && filteredReportItems.length > 0 && (
        <ItemMonitoringReport
          ref={reportRef}
          userName={selectedUser.full_name}
          items={filteredReportItems}
          dateLabel={dateFilter?.label !== "All Time" ? dateFilter?.label : undefined}
        />
      )}

      <ReportFilterModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        onApply={applyFilterAndPrint} 
      />
    </div>
  );
};

export default ItemMonitoringReportTab;
