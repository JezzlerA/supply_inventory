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
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const { status, showSuccess, showError, close } = useStatusModal();
  const { user, role } = useAuth();

  const fetchData = async () => {
    const { data } = await supabase.from("supply_requests").select("*").order("created_at", { ascending: false });
    setRequests(data || []);
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Office Requests</h1>
        <p className="text-muted-foreground">Track and manage supply requests from campus offices</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Request Log ({filteredRequests.length})</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by item, office, requester..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                {role === "admin" && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.date_requested}</TableCell>
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>{r.requesting_office}</TableCell>
                  <TableCell>{r.requested_by}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      r.status === "approved" || r.status === "fulfilled" ? "bg-green-100 text-green-700" :
                      r.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    }`}>{r.status === "fulfilled" ? "approved" : r.status}</span>
                  </TableCell>
                  {role === "admin" && (
                    <TableCell>
                      {r.status === "pending" && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => updateStatus(r.id, "approved")}
                            disabled={loadingIds[r.id]}
                          >
                            {loadingIds[r.id] ? "Processing..." : "Approve"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => updateStatus(r.id, "rejected")}
                            disabled={loadingIds[r.id]}
                          >
                            {loadingIds[r.id] ? "..." : "Reject"}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredRequests.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No requests yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
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
