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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    item_name: "", description: "", category_id: "", unit_of_measure: "", quantity: "", unit_cost: "",
    date_received: new Date().toISOString().split("T")[0], supplier: "", reference_number: "", size: "",
  });
  const { status, showSuccess, showError, close } = useStatusModal();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, recRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("receiving_records").select("*, categories(name)").order("created_at", { ascending: false }),
      ]);
      setCategories(catRes.data || []);
      setRecords(recRes.data || []);
    } catch (err) {
      console.error("Error fetching receiving data:", err);
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Receiving Supplies</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Record items received from suppliers</p>
        </div>
      </div>

      <Card className="shadow-2xl border-0 rounded-[24px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-6">New Receipt Entry</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Item Name *</Label>
              <Input placeholder="e.g., Bond Paper A4" value={form.item_name} onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))} required className="h-11 rounded-xl shadow-sm border-gray-100" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Description</Label>
              <Input placeholder="Additional details" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="h-11 rounded-xl shadow-sm border-gray-100" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Category *</Label>
              <select className="flex h-11 w-full rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Unit of Measure *</Label>
              <select className="flex h-11 w-full rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                value={form.unit_of_measure} onChange={e => setForm(p => ({ ...p, unit_of_measure: e.target.value }))} required>
                <option value="">Select unit</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Size / Specification</Label>
              <select className="flex h-11 w-full rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))}>
                <option value="">Select size</option>
                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Quantity *</Label>
              <Input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} required className="h-11 rounded-xl shadow-sm border-gray-100" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Unit Cost (₱) *</Label>
              <Input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm(p => ({ ...p, unit_cost: e.target.value }))} required className="h-11 rounded-xl shadow-sm border-gray-100" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Date Received *</Label>
              <Input type="date" value={form.date_received} onChange={e => setForm(p => ({ ...p, date_received: e.target.value }))} required className="h-11 rounded-xl shadow-sm border-gray-100" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Supplier *</Label>
              <Input placeholder="Supplier name" value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} required className="h-11 rounded-xl shadow-sm border-gray-100" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Serial Number / PO / DR</Label>
              <Input placeholder="Enter reference number" value={form.reference_number} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} className="h-11 rounded-xl shadow-sm border-gray-100" />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button type="submit" className="w-full h-11 rounded-xl shadow-lg shadow-primary/20 font-bold uppercase tracking-widest text-xs">Record Receipt</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-2xl border-0 rounded-[24px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <h3 className="font-bold text-lg text-gray-900">Receipt History ({loading ? '...' : filteredRecords.length})</h3>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by item, supplier, serial #..." 
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
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Date</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Item</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Category</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Size</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Qty</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Unit</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Cost</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Supplier</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Ref #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-gray-50">
                      {Array(9).fill(0).map((__, j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-100 animate-pulse rounded-md" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRecords.map(r => (
                  <TableRow key={r.id} className={`${matchesBySerialNumber(r) ? "bg-blue-50/50" : "hover:bg-muted/20"} border-gray-50 transition-colors`}>
                    <TableCell className="text-xs font-medium text-muted-foreground">{r.date_received}</TableCell>
                    <TableCell className="font-bold text-gray-800">{r.item_name}</TableCell>
                    <TableCell className="text-primary font-bold text-xs uppercase tracking-tighter">{(r as any).categories?.name || "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">{r.size || "—"}</TableCell>
                    <TableCell className="font-black text-primary">{r.quantity}</TableCell>
                    <TableCell className="text-xs font-bold">{r.unit_of_measure}</TableCell>
                    <TableCell className="text-xs font-bold text-gray-700">₱{Number(r.unit_cost).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-bold text-gray-600">{r.supplier}</TableCell>
                    <TableCell className={matchesBySerialNumber(r) ? "text-blue-600 font-bold" : "text-muted-foreground font-medium"}>
                      {r.reference_number || "—"}
                      {matchesBySerialNumber(r) && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Match</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filteredRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground font-bold uppercase tracking-widest text-xs">
                      No records found
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

export default Receiving;
