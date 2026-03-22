import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PackageSearch, RotateCcw } from "lucide-react";

interface UserTransactionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

interface SupplyRequest {
  id: string;
  item_name: string;
  quantity: number;
  requesting_office: string;
  status: string;
  date_requested: string;
  notes: string | null;
}

interface DamagedReturn {
  id: string;
  item_name: string;
  quantity: number;
  returning_office: string;
  status: string;
  date_returned: string;
  reason: string;
  notes: string | null;
}

const statusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "fulfilled":
    case "approved":
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

const UserTransactionHistory = ({ open, onOpenChange, userId, userName }: UserTransactionHistoryProps) => {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [returns, setReturns] = useState<DamagedReturn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);

    const fetchData = async () => {
      const [reqRes, retRes] = await Promise.all([
        supabase
          .from("supply_requests")
          .select("id, item_name, quantity, requesting_office, status, date_requested, notes")
          .eq("user_id", userId)
          .order("date_requested", { ascending: false }),
        supabase
          .from("damaged_returns")
          .select("id, item_name, quantity, returning_office, status, date_returned, reason, notes")
          .eq("reported_by", userId)
          .order("date_returned", { ascending: false }),
      ]);

      setRequests(reqRes.data || []);
      setReturns(retRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction History</DialogTitle>
          <DialogDescription>All transactions for <span className="font-semibold text-foreground">{userName}</span></DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="requests">
            <TabsList className="w-full">
              <TabsTrigger value="requests" className="flex-1 gap-1.5">
                <PackageSearch className="w-4 h-4" /> Requests ({requests.length})
              </TabsTrigger>
              <TabsTrigger value="returns" className="flex-1 gap-1.5">
                <RotateCcw className="w-4 h-4" /> Returns ({returns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No request transactions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Office</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{new Date(r.date_requested).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{r.item_name}</TableCell>
                          <TableCell>{r.quantity}</TableCell>
                          <TableCell>{r.requesting_office}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="returns">
              {returns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No return transactions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Office</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returns.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{new Date(r.date_returned).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{r.item_name}</TableCell>
                          <TableCell>{r.quantity}</TableCell>
                          <TableCell>{r.returning_office}</TableCell>
                          <TableCell>{r.reason}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserTransactionHistory;
