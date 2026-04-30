import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusModal } from "@/components/ui/status-modal";
import { useStatusModal } from "@/hooks/useStatusModal";
import { useAuth } from "@/hooks/useAuth";
import { Search } from "lucide-react";

const Requests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const { status, showSuccess, showError, close } = useStatusModal();
  const { user, role } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("supply_requests").select("*").order("created_at", { ascending: false });
      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    if (loadingIds[id]) return;
    
    setLoadingIds(prev => ({ ...prev, [id]: true }));

    try {
      // 1. Fetch current status from DB before proceeding
      const { data: currentRequest, error: fetchError } = await supabase
        .from("supply_requests")
        .select("status, user_id, item_name, quantity, requesting_office, requested_by")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!currentRequest || currentRequest.status !== "pending") {
        showError("This request has already been processed (Approved/Rejected).", undefined, "Already Processed");
        fetchData();
        return;
      }

      // 2. Perform Atomic Update: Update only if it's still 'pending'
      const { error: updateError } = await supabase
        .from("supply_requests")
        .update({ status: newStatus })
        .eq("id", id)
        .eq("status", "pending");

      if (updateError) throw updateError;

      const request = currentRequest;

      // 3. Side Effects (Notifications, Inventory, etc.)
      // Send notification to the user who made the request
      if (request?.user_id) {
        const notifTitle = newStatus === "approved" ? "Request Approved" : "Request Rejected";
        const notifMessage = newStatus === "approved"
          ? `Your requested item "${request.item_name}" has been approved.`
          : `Your request for "${request.item_name}" has been rejected.`;

        await supabase.from("notifications").insert({
          user_id: request.user_id,
          title: notifTitle,
          message: notifMessage,
          type: newStatus === "approved" ? "success" : "error",
          related_id: id,
        });
      }

      // Log to inventory history + distribution if approved
      if (newStatus === "approved" && request) {
      const { data: invItem } = await supabase
        .from("inventory_items")
        .select("id, stock_quantity, serial_number")
        .eq("item_name", request.item_name)
        .maybeSingle();

      if (invItem) {
        const newQty = invItem.stock_quantity - request.quantity;
        await supabase.from("inventory_items")
          .update({ stock_quantity: Math.max(0, newQty), updated_at: new Date().toISOString() })
          .eq("id", invItem.id);

        await supabase.from("inventory_history").insert({
          inventory_item_id: invItem.id,
          action: "Distribution (Request Fulfilled)",
          quantity_change: -request.quantity,
          previous_quantity: invItem.stock_quantity,
          new_quantity: Math.max(0, newQty),
          performed_by: user?.id,
          notes: `Fulfilled request from ${request.requesting_office} by ${request.requested_by}`,
        });

        // Auto-record in distributions table for Distribution History & Reports
        await supabase.from("distributions").insert({
          inventory_item_id: invItem.id,
          item_name: request.item_name,
          quantity: request.quantity,
          receiving_office: request.requesting_office,
          supply_officer: request.requested_by,
          date_issued: new Date().toISOString().split("T")[0],
          request_id: id,
          issued_by: user?.id,
          remarks: `Functional`,
        });

        // Auto-assign item to user for Item Monitoring
        if (request.user_id) {
          await supabase.from("assigned_items").insert({
            user_id: request.user_id,
            inventory_item_id: invItem.id,
            item_name: request.item_name,
            serial_number: invItem.serial_number || '',
            current_location: request.requesting_office,
            notes: `Auto-assigned from fulfilled request by ${request.requested_by}`,
          });
        }
      }
    }

    // Update user_transactions status using related_id for reliable matching
    const txStatus = newStatus === "approved" ? "Approved" : "Rejected";
    const { data: updatedTx } = await supabase.from("user_transactions")
      .update({ status: txStatus })
      .eq("related_id", id)
      .select("id")
      .maybeSingle();

    // Fallback: also update by user_id + item_name if no related_id match (legacy records)
    let fallbackTxId: string | null = null;
    if (request?.user_id && !updatedTx) {
      const { data: fallbackTx } = await supabase.from("user_transactions")
        .update({ status: txStatus })
        .eq("user_id", request.user_id)
        .eq("item_name", request.item_name)
        .eq("status", "Pending")
        .select("id")
        .maybeSingle();
      fallbackTxId = fallbackTx?.id || null;
    }

      // Auto-generate receipt on approval
      if (newStatus === "approved" && request) {
        const transactionId = updatedTx?.id || fallbackTxId;
        const receiptNumber = `RCT-${Date.now().toString(36).toUpperCase()}`;

        // Get category name
        let categoryName = "";
        const { data: invForCat } = await supabase
          .from("inventory_items")
          .select("category_id, unit_cost, categories(name)")
          .eq("item_name", request.item_name)
          .maybeSingle();

        if (invForCat) {
          categoryName = (invForCat as any).categories?.name || "";
        }
        const unitCost = invForCat?.unit_cost || 0;

        // Get admin name
        let adminName = "";
        if (user?.id) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();
          adminName = adminProfile?.full_name || "";
        }

        await supabase.from("receipts").insert({
          receipt_number: receiptNumber,
          transaction_id: transactionId,
          request_id: id,
          user_id: request.user_id || user?.id,
          user_name: request.requested_by,
          department: request.requesting_office,
          item_name: request.item_name,
          category: categoryName,
          quantity: request.quantity,
          unit_value: unitCost,
          total_value: unitCost * request.quantity,
          status: "Approved",
          approved_by: user?.id,
          approved_by_name: adminName,
          date_approved: new Date().toISOString(),
        });
      }

      showSuccess(`Request ${newStatus}`);
      fetchData();
    } catch (e: any) {
      showError(e.message || "An unexpected error occurred", undefined, "Error");
    } finally {
      setLoadingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  // Filter requests by search term (item name, office, or requested by)
  const filteredRequests = requests.filter(r =>
    r.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.requesting_office?.toLowerCase().includes(search.toLowerCase()) ||
    r.requested_by?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Office Requests</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Track and manage supply requests from campus offices</p>
        </div>
      </div>

      <Card className="shadow-2xl border-0 rounded-[24px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <h3 className="font-bold text-lg text-gray-900">Request Log ({loading ? '...' : filteredRequests.length})</h3>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by item, office, requester..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-11 h-10 rounded-xl border-gray-100 bg-white shadow-sm focus:bg-white focus:ring-primary/20 transition-all duration-300" 
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Date Requested</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Item Requested</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Qty</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Requesting Office</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Requested By</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Status</TableHead>
                  {role === "admin" && <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider h-12">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-gray-50">
                      {Array(7).fill(0).map((__, j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-100 animate-pulse rounded-md" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRequests.map(r => (
                  <TableRow key={r.id} className="border-gray-50 hover:bg-muted/20 transition-colors">
                    <TableCell className="text-xs font-medium text-muted-foreground">{r.date_requested}</TableCell>
                    <TableCell className="font-bold text-gray-800">{r.item_name}</TableCell>
                    <TableCell className="font-black text-primary">{r.quantity}</TableCell>
                    <TableCell className="text-xs font-bold text-gray-700">{r.requesting_office}</TableCell>
                    <TableCell className="text-xs font-medium text-gray-600">{r.requested_by}</TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter ${
                        r.status === "approved" || r.status === "fulfilled" ? "bg-green-50 text-green-700" :
                        r.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-red-50 text-red-700"
                      }`}>{r.status === "fulfilled" ? "approved" : r.status}</span>
                    </TableCell>
                    {role === "admin" && (
                      <TableCell className="text-right">
                        {r.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => updateStatus(r.id, "approved")}
                              disabled={loadingIds[r.id]}
                              className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest px-3 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                            >
                              {loadingIds[r.id] ? "..." : "Approve"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => updateStatus(r.id, "rejected")}
                              disabled={loadingIds[r.id]}
                              className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest px-3"
                            >
                              {loadingIds[r.id] ? "..." : "Reject"}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {!loading && filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground font-bold uppercase tracking-widest text-xs">
                      No requests found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <StatusModal
        isOpen={status.open}
        type={status.type}
        title={status.title}
        message={status.message}
        onClose={close}
        onRetry={status.onRetry}
      />
    </div>
  );
};

export default Requests;
