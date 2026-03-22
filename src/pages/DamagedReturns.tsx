import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, AlertTriangle, RotateCcw, Package, Search } from "lucide-react";

const offices = ["College of Education", "Accounting Office", "Cashier's Office", "Registrar's Office", "College of Arts & Sciences", "Dean's Office", "Library", "ICT Office", "HR Office", "Student Affairs Office"];
const reasons = ["Defective", "Damaged", "Expired", "Wrong Item", "Change of Mind", "Other"];
const statuses = ["Damaged", "For Replacement", "Returned to Inventory", "Replaced"];

const DamagedReturns = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ item_name: "", item_code: "", quantity: "", returning_office: "", date_returned: new Date().toISOString().split("T")[0], reason: "Other", status: "Damaged", notes: "" });
  const { toast } = useToast();
  const { user, role } = useAuth();

  const fetchData = async () => {
    const { data } = await supabase.from("damaged_returns").select("*").order("created_at", { ascending: false });
    setReturns(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.quantity);

    const { data: insertedReturn, error } = await supabase.from("damaged_returns").insert({ ...form, quantity: qty, reported_by: user?.id }).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // If returning to inventory, update stock
    if (form.status === "Returned to Inventory") {
      await returnToInventory(form.item_name, qty, form.reason);
    }

    // Log to inventory history
    const { data: invItem } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("item_name", form.item_name)
      .maybeSingle();

    if (invItem) {
      await supabase.from("inventory_history").insert({
        inventory_item_id: invItem.id,
        action: `Return - ${form.reason}`,
        quantity_change: form.status === "Returned to Inventory" ? qty : 0,
        performed_by: user?.id,
        notes: `Returned by ${form.returning_office}. Status: ${form.status}. ${form.notes}`,
      });
    }

    // Log user transaction
    if (user) {
      await supabase.from("user_transactions").insert({
        user_id: user.id,
        item_name: form.item_name,
        inventory_item_id: invItem?.id || null,
        transaction_type: "Return",
        quantity: qty,
        status: "Completed",
        notes: `Reason: ${form.reason}. Office: ${form.returning_office}. ${form.notes}`,
        related_id: insertedReturn?.id || null,
      });
    }

    toast({ title: "Return recorded!" });
    setOpen(false);
    setForm({ item_name: "", item_code: "", quantity: "", returning_office: "", date_returned: new Date().toISOString().split("T")[0], reason: "Other", status: "Damaged", notes: "" });
    fetchData();
  };

  const returnToInventory = async (itemName: string, qty: number, reason: string) => {
    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id, stock_quantity")
      .eq("item_name", itemName)
      .maybeSingle();

    if (existing) {
      const condition = (reason === "Damaged" || reason === "Defective") ? "Damaged" : "Functional";
      await supabase.from("inventory_items")
        .update({
          stock_quantity: existing.stock_quantity + qty,
          condition: condition,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
  };

  // Admin: update status of a return record
  const updateReturnStatus = async (id: string, newStatus: string) => {
    const returnRecord = returns.find(r => r.id === id);
    await supabase.from("damaged_returns").update({ status: newStatus }).eq("id", id);

    if (newStatus === "Returned to Inventory" && returnRecord) {
      await returnToInventory(returnRecord.item_name, returnRecord.quantity, returnRecord.reason);
      
      // Log history
      const { data: invItem } = await supabase
        .from("inventory_items")
        .select("id, stock_quantity")
        .eq("item_name", returnRecord.item_name)
        .maybeSingle();
      
      if (invItem) {
        await supabase.from("inventory_history").insert({
          inventory_item_id: invItem.id,
          action: "Returned to Inventory",
          quantity_change: returnRecord.quantity,
          previous_quantity: invItem.stock_quantity - returnRecord.quantity,
          new_quantity: invItem.stock_quantity,
          performed_by: user?.id,
          notes: `Status changed to Returned to Inventory from ${returnRecord.status}`,
        });
      }
    }

    toast({ title: `Status updated to ${newStatus}` });
    fetchData();
  };

  const filtered = returns.filter(r =>
    r.item_name.toLowerCase().includes(search.toLowerCase()) ||
    r.returning_office.toLowerCase().includes(search.toLowerCase()) ||
    r.status.toLowerCase().includes(search.toLowerCase()) ||
    (r.item_code && r.item_code.toLowerCase().includes(search.toLowerCase()))
  );

  // Helper to check if return matches by item code (serial number)
  const matchesBySerialNumber = (returnRecord: any) => {
    return search && returnRecord.item_code && returnRecord.item_code.toLowerCase().includes(search.toLowerCase());
  };

  const damaged = returns.filter(r => r.status === "Damaged").length;
  const forReplacement = returns.filter(r => r.status === "For Replacement").length;
  const returnedToInv = returns.filter(r => r.status === "Returned to Inventory").length;

  const summaryCards = [
    { label: "Total Returns", value: returns.length, icon: RotateCcw, color: "text-blue-600 bg-blue-100" },
    { label: "Damaged", value: damaged, icon: AlertTriangle, color: "text-red-600 bg-red-100" },
    { label: "For Replacement", value: forReplacement, icon: Package, color: "text-orange-600 bg-orange-100" },
    { label: "Returned to Inv.", value: returnedToInv, icon: RotateCcw, color: "text-green-600 bg-green-100" },
  ];

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="w-6 h-6" /> Damaged Item Returns</h1>
          <p className="text-muted-foreground">Process and track returned damaged supplies</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Return Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Damaged Return</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Item Name *</Label><Input value={form.item_name} onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))} required /></div>
              <div><Label>Item Code</Label><Input value={form.item_code} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} /></div>
              <div><Label>Quantity *</Label><Input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} required /></div>
              <div>
                <Label>Returning Office *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.returning_office} onChange={e => setForm(p => ({ ...p, returning_office: e.target.value }))} required>
                  <option value="">Select office</option>
                  {offices.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div><Label>Date *</Label><Input type="date" value={form.date_returned} onChange={e => setForm(p => ({ ...p, date_returned: e.target.value }))} required /></div>
              <div>
                <Label>Reason *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}>
                  {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label>Status *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button type="submit" className="w-full">Record Return</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {summaryCards.map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Return History Log ({filtered.length})</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by item, code, office, status..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Returning Office</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                {role === "admin" && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className={matchesBySerialNumber(r) ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell className={matchesBySerialNumber(r) ? "text-blue-600 dark:text-blue-400 font-semibold" : ""}>
                    {r.item_code || "—"}
                    {matchesBySerialNumber(r) && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Code Match</span>}
                  </TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>{r.returning_office}</TableCell>
                  <TableCell>{r.date_returned}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      r.status === "Damaged" ? "bg-red-100 text-red-700" :
                      r.status === "For Replacement" ? "bg-orange-100 text-orange-700" :
                      r.status === "Returned to Inventory" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>{r.status}</span>
                  </TableCell>
                  {role === "admin" && (
                    <TableCell>
                      {r.status !== "Returned to Inventory" && r.status !== "Replaced" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => updateReturnStatus(r.id, "Returned to Inventory")}>
                            Return to Inv.
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateReturnStatus(r.id, "Replaced")}>
                            Replaced
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={role === "admin" ? 8 : 7} className="text-center text-muted-foreground">No returns found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DamagedReturns;
