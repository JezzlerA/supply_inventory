import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusModal } from "@/components/ui/status-modal";
import { useStatusModal } from "@/hooks/useStatusModal";
import { useAuth } from "@/hooks/useAuth";
import { Search } from "lucide-react";

const units = ["piece", "ream", "box", "unit", "cartridge", "pack", "set", "roll", "bottle", "gallon"];
const sizes = ["A4", "Short", "Long", "Legal", "Letter", "Tabloid", "Small", "Medium", "Large", "N/A"];

const Receiving = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    item_name: "", description: "", category_id: "", unit_of_measure: "", quantity: "", unit_cost: "",
    date_received: new Date().toISOString().split("T")[0], supplier: "", reference_number: "", size: "",
  });
  const { status, showSuccess, showError, close } = useStatusModal();
  const { user } = useAuth();

  const fetchData = async () => {
    const [catRes, recRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("receiving_records").select("*, categories(name)").order("created_at", { ascending: false }),
    ]);
    setCategories(catRes.data || []);
    setRecords(recRes.data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.quantity);
    const cost = parseFloat(form.unit_cost);

    // Check if item exists in inventory
    const { data: existing } = await supabase.from("inventory_items")
      .select("id, stock_quantity")
      .eq("item_name", form.item_name)
      .maybeSingle();

    let inventoryItemId: string;

    if (existing) {
      await supabase.from("inventory_items")
        .update({ stock_quantity: existing.stock_quantity + qty, unit_cost: cost, size: form.size, serial_number: form.reference_number, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      inventoryItemId = existing.id;

      // Log history
      await supabase.from("inventory_history").insert({
        inventory_item_id: existing.id,
        action: "Received",
        quantity_change: qty,
        previous_quantity: existing.stock_quantity,
        new_quantity: existing.stock_quantity + qty,
        performed_by: user?.id,
        notes: `Received from ${form.supplier}. Ref: ${form.reference_number}`,
      });
    } else {
      const { data: newItem } = await supabase.from("inventory_items").insert({
        item_name: form.item_name, description: form.description, category_id: form.category_id || null,
        unit_of_measure: form.unit_of_measure, stock_quantity: qty, unit_cost: cost, size: form.size, serial_number: form.reference_number,
      }).select("id").single();
      inventoryItemId = newItem!.id;

      await supabase.from("inventory_history").insert({
        inventory_item_id: inventoryItemId,
        action: "Initial Receiving",
        quantity_change: qty,
        previous_quantity: 0,
        new_quantity: qty,
        performed_by: user?.id,
        notes: `New item received from ${form.supplier}. Ref: ${form.reference_number}`,
      });
    }

    const { error } = await supabase.from("receiving_records").insert({
      ...form, quantity: qty, unit_cost: cost, category_id: form.category_id || null,
      inventory_item_id: inventoryItemId,
    });

    if (error) {
      showError(error.message, undefined, "Error");
    } else {
      showSuccess("Receipt recorded successfully!");
      setForm({ item_name: "", description: "", category_id: "", unit_of_measure: "", quantity: "", unit_cost: "",
        date_received: new Date().toISOString().split("T")[0], supplier: "", reference_number: "", size: "" });
      fetchData();
    }
  };

  // Filter records by search term (item name, supplier, or serial number)
  const filteredRecords = records.filter(r =>
    r.item_name.toLowerCase().includes(search.toLowerCase()) ||
    r.supplier.toLowerCase().includes(search.toLowerCase()) ||
    (r.reference_number && r.reference_number.toLowerCase().includes(search.toLowerCase()))
  );

  // Helper to check if record matches by serial number
  const matchesBySerialNumber = (record: any) => {
    return search && record.reference_number && record.reference_number.toLowerCase().includes(search.toLowerCase());
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Receiving Supplies</h1>
      <p className="text-muted-foreground mb-6">Record items received from suppliers</p>

      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">New Receipt Entry</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Item Name *</Label>
              <Input placeholder="e.g., Bond Paper A4" value={form.item_name} onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))} required />
            </div>
            <div>
              <Label>Description</Label>
              <Input placeholder="Additional details" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Category *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Unit of Measure *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.unit_of_measure} onChange={e => setForm(p => ({ ...p, unit_of_measure: e.target.value }))} required>
                <option value="">Select unit</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <Label>Size / Specification</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))}>
                <option value="">Select size</option>
                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} required />
            </div>
            <div>
              <Label>Unit Cost (₱) *</Label>
              <Input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm(p => ({ ...p, unit_cost: e.target.value }))} required />
            </div>
            <div>
              <Label>Date Received *</Label>
              <Input type="date" value={form.date_received} onChange={e => setForm(p => ({ ...p, date_received: e.target.value }))} required />
            </div>
            <div>
              <Label>Supplier *</Label>
              <Input placeholder="Supplier name" value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} required />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input placeholder="PO/DR number" value={form.reference_number} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Record Receipt</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Receipt History ({filteredRecords.length})</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by item, supplier, serial #..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Ref #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map(r => (
                <TableRow key={r.id} className={matchesBySerialNumber(r) ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                  <TableCell>{r.date_received}</TableCell>
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell className="text-primary">{(r as any).categories?.name || "—"}</TableCell>
                  <TableCell>{r.size || "—"}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>{r.unit_of_measure}</TableCell>
                  <TableCell>₱{Number(r.unit_cost).toLocaleString()}</TableCell>
                  <TableCell>{r.supplier}</TableCell>
                  <TableCell className={matchesBySerialNumber(r) ? "text-blue-600 dark:text-blue-400 font-semibold" : ""}>
                    {r.reference_number || "—"}
                    {matchesBySerialNumber(r) && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Serial Match</span>}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No records yet</TableCell></TableRow>
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

export default Receiving;
