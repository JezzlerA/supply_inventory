import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

const offices = ["College of Education", "Accounting Office", "Cashier's Office", "Registrar's Office", "College of Arts & Sciences", "Dean's Office", "Library", "ICT Office", "HR Office", "Student Affairs Office"];

const Distribution = () => {
  const [items, setItems] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ inventory_item_id: "", quantity: "", receiving_office: "", date_issued: new Date().toISOString().split("T")[0], supply_officer: "", remarks: "" });
  const { toast } = useToast();

  const fetchData = async () => {
    const [invRes, distRes] = await Promise.all([
      supabase.from("inventory_items").select("id, item_name, stock_quantity, serial_number").order("item_name"),
      supabase.from("distributions").select("*, inventory_items(serial_number)").order("created_at", { ascending: false }),
    ]);
    setItems(invRes.data || []);
    setRecords(distRes.data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.quantity);
    const item = items.find(i => i.id === form.inventory_item_id);
    if (!item || item.stock_quantity < qty) {
      toast({ title: "Insufficient stock", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("distributions").insert({
      ...form, quantity: qty, item_name: item.item_name,
    });

    if (!error) {
      await supabase.from("inventory_items")
        .update({ stock_quantity: item.stock_quantity - qty, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      toast({ title: "Distribution recorded!" });
      setForm({ inventory_item_id: "", quantity: "", receiving_office: "", date_issued: new Date().toISOString().split("T")[0], supply_officer: "", remarks: "" });
      fetchData();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Filter records by search term (item name, office, or serial number)
  const filteredRecords = records.filter(r => {
    const serialNumber = (r as any).inventory_items?.serial_number || '';
    return r.item_name.toLowerCase().includes(search.toLowerCase()) ||
      r.receiving_office.toLowerCase().includes(search.toLowerCase()) ||
      (serialNumber && serialNumber.toLowerCase().includes(search.toLowerCase()));
  });

  // Helper to check if record matches by serial number
  const matchesBySerialNumber = (record: any) => {
    const serialNumber = (record as any).inventory_items?.serial_number || '';
    return search && serialNumber && serialNumber.toLowerCase().includes(search.toLowerCase());
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Distribution</h1>
      <p className="text-muted-foreground mb-6">Record items distributed to campus offices</p>

      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">New Distribution Entry</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Item Name *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.inventory_item_id} onChange={e => setForm(p => ({ ...p, inventory_item_id: e.target.value }))} required>
                <option value="">Select item</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.item_name} (stock: {i.stock_quantity})</option>)}
              </select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} required />
            </div>
            <div>
              <Label>Receiving Office *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.receiving_office} onChange={e => setForm(p => ({ ...p, receiving_office: e.target.value }))} required>
                <option value="">Select office</option>
                {offices.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <Label>Date of Issuance *</Label>
              <Input type="date" value={form.date_issued} onChange={e => setForm(p => ({ ...p, date_issued: e.target.value }))} required />
            </div>
            <div>
              <Label>Supply Officer *</Label>
              <Input placeholder="Officer name" value={form.supply_officer} onChange={e => setForm(p => ({ ...p, supply_officer: e.target.value }))} required />
            </div>
            <div>
              <Label>Remarks</Label>
              <Input placeholder="Optional notes" value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Record Distribution</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Distribution History ({filteredRecords.length})</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by item, office, serial #..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Receiving Office</TableHead>
                <TableHead>Supply Officer</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map(r => (
                <TableRow key={r.id} className={matchesBySerialNumber(r) ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                  <TableCell>{r.date_issued}</TableCell>
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell className={matchesBySerialNumber(r) ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-muted-foreground"}>
                    {(r as any).inventory_items?.serial_number || "—"}
                    {matchesBySerialNumber(r) && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Serial Match</span>}
                  </TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>{r.receiving_office}</TableCell>
                  <TableCell>{r.supply_officer}</TableCell>
                  <TableCell>{r.remarks || "—"}</TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No distributions found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Distribution;
