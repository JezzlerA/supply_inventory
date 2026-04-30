import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { StatusModal } from "@/components/ui/status-modal";
import { useStatusModal } from "@/hooks/useStatusModal";
import { useAuth } from "@/hooks/useAuth";
import { Search, Send, Pencil, Trash2, MoreHorizontal, AlertCircle, Loader2, PackageX, Folder } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Inventory = () => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const { status, showSuccess, showError, close } = useStatusModal();
  const { user, role, profile } = useAuth();

  // Request dialog
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestItem, setRequestItem] = useState<any>(null);
  const [requestForm, setRequestForm] = useState({ quantity: "", requesting_office: "", requested_by: "" });
  const [requestLoading, setRequestLoading] = useState(false);
  const quantityRef = useRef<HTMLInputElement>(null);

  // Out of stock dialog
  const [outOfStockOpen, setOutOfStockOpen] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ item_name: "", description: "", unit_of_measure: "", unit_cost: "", stock_quantity: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("inventory_items").select("*, categories(name)").order("updated_at", { ascending: false });
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching inventory items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const uniqueCategories = Array.from(new Set(items.map(i => i.categories?.name).filter(Boolean))).sort() as string[];
  
  const filtered = items.filter(i => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      i.item_name.toLowerCase().includes(searchLower) ||
      (i.serial_number && i.serial_number.toLowerCase().includes(searchLower)) ||
      (i.description && i.description.toLowerCase().includes(searchLower));
    
    const categoryName = i.categories?.name || "Uncategorized";
    const matchesCategory = selectedCategory === "All" || categoryName === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const matchesBySerialNumber = (item: any) => {
    return search && item.serial_number && item.serial_number.toLowerCase().includes(search.toLowerCase());
  };

  const getStatus = (qty: number) => {
    if (qty === 0) return { label: "Out of Stock", cls: "bg-destructive/10 text-destructive" };
    if (qty <= 5) return { label: "Low Stock", cls: "bg-warning/10 text-warning" };
    return { label: "In Stock", cls: "bg-success/10 text-success" };
  };

  const handleRequestClick = (item: any) => {
    const officeLocation = (profile as any)?.office_location;
    if (!officeLocation || officeLocation === "Unassigned Office") {
      showError("Please contact admin to assign your office before making a request.", undefined, "Action required");
      return;
    }

    if (item.stock_quantity === 0) {
      setRequestItem(item);
      setOutOfStockOpen(true);
      if (user) {
        supabase.from("notifications").insert({
          user_id: user.id,
          title: "Out of Stock",
          message: `Sorry, "${item.item_name}" is currently out of stock.`,
          type: "warning",
        });
      }
      return;
    }
    setRequestItem(item);
    setRequestForm({
      quantity: "",
      requesting_office: officeLocation,
      requested_by: profile?.full_name || ""
    });
    setRequestOpen(true);
    setTimeout(() => quantityRef.current?.focus(), 100);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.quantity || parseInt(requestForm.quantity) < 1) return;
    setRequestLoading(true);
    const { data: insertedRequest, error } = await supabase.from("supply_requests").insert({
      item_name: requestItem.item_name,
      quantity: parseInt(requestForm.quantity),
      requesting_office: requestForm.requesting_office,
      requested_by: requestForm.requested_by,
      user_id: user?.id,
      date_requested: new Date().toISOString().split("T")[0],
    }).select().single();
    if (error) {
      showError(error.message, undefined, "Error");
    } else {
      await supabase.from("user_transactions").insert({
        user_id: user?.id,
        item_name: requestItem.item_name,
        inventory_item_id: requestItem.id,
        transaction_type: "Request",
        quantity: parseInt(requestForm.quantity),
        status: "Pending",
        related_id: insertedRequest.id,
        notes: `Requested by ${requestForm.requested_by} for ${requestForm.requesting_office}`,
      });
      showSuccess("Request Submitted", `Request for "${requestItem.item_name}" has been sent for approval.`);
      setRequestOpen(false);
      setRequestForm({ quantity: "", requesting_office: "", requested_by: "" });
    }
    setRequestLoading(false);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setEditErrors({});
    setEditForm({
      item_name: item.item_name,
      description: item.description || "",
      unit_of_measure: item.unit_of_measure,
      unit_cost: String(item.unit_cost),
      stock_quantity: String(item.stock_quantity),
    });
    setEditOpen(true);
  };

  const validateEdit = () => {
    const errors: Record<string, string> = {};
    if (!editForm.item_name.trim()) errors.item_name = "Item name is required.";
    if (!editForm.unit_of_measure.trim()) errors.unit_of_measure = "Unit of measure is required.";
    if (!editForm.unit_cost || isNaN(Number(editForm.unit_cost))) errors.unit_cost = "Enter a valid cost.";
    if (!editForm.stock_quantity || isNaN(Number(editForm.stock_quantity))) errors.stock_quantity = "Enter a valid quantity.";
    return errors;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateEdit();
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return; }
    setEditLoading(true);
    const { error } = await supabase.from("inventory_items").update({
      item_name: editForm.item_name,
      description: editForm.description,
      unit_of_measure: editForm.unit_of_measure,
      unit_cost: parseFloat(editForm.unit_cost),
      stock_quantity: parseInt(editForm.stock_quantity),
      updated_at: new Date().toISOString(),
    }).eq("id", editItem.id);
    if (error) {
      showError(error.message || "Something went wrong. Please try again.", () => { close(); setEditOpen(true); });
    } else {
      setEditOpen(false);
      fetchItems();
      showSuccess("Item updated successfully");
    }
    setEditLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    const { error } = await supabase.from("inventory_items").delete().eq("id", deleteItem.id);
    if (error) {
      showError(error.message, undefined, "Error");
    } else {
      showSuccess("Item Deleted", `"${deleteItem.item_name}" has been removed.`);
      setDeleteOpen(false);
      fetchItems();
    }
    setDeleteLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Inventory</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Current stock levels in the Supply Room Office</p>
        </div>
      </div>

      <Card className="shadow-2xl border-0 rounded-[24px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
        <CardContent className="p-6">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
            <h3 className="font-bold text-lg text-gray-900">Stock Items ({loading ? '...' : filtered.length})</h3>
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
              <div className="flex items-center gap-3">
                <Label htmlFor="category-filter" className="hidden sm:inline whitespace-nowrap text-muted-foreground text-[11px] uppercase font-black tracking-widest">Category:</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={loading}>
                  <SelectTrigger id="category-filter" className="w-full sm:w-[200px] h-10 rounded-xl border-gray-100 bg-white shadow-sm focus:ring-primary/20">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-primary" />
                      <SelectValue placeholder="Category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100 shadow-2xl">
                    <SelectItem value="All">All Categories</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-full xl:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, serial #, description..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="pl-11 h-10 rounded-xl border-gray-100 bg-white shadow-sm focus:bg-white focus:ring-primary/20 transition-all duration-300" 
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Item Name</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Serial No.</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Description</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Category</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Unit</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Stock</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Unit Cost</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Total Value</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Status</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider h-12">Last Updated</TableHead>
                  <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider h-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-gray-50">
                      {Array(11).fill(0).map((__, j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-100 animate-pulse rounded-md" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.map(item => {
                  const status = getStatus(item.stock_quantity);
                  return (
                    <TableRow key={item.id} className={`${matchesBySerialNumber(item) ? "bg-blue-50/50" : "hover:bg-muted/20"} border-gray-50 transition-colors group`}>
                      <TableCell className="font-bold text-gray-800 py-4">{item.item_name}</TableCell>
                      <TableCell className={matchesBySerialNumber(item) ? "text-blue-600 font-bold" : "text-muted-foreground font-medium"}>
                        {item.serial_number || "—"}
                        {matchesBySerialNumber(item) && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Serial Match</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-medium max-w-[200px] truncate">{item.description || "—"}</TableCell>
                      <TableCell className="text-primary font-bold text-xs uppercase tracking-tighter">{(item as any).categories?.name || "—"}</TableCell>
                      <TableCell className="text-xs font-semibold">{item.unit_of_measure}</TableCell>
                      <TableCell className="font-black text-gray-800">{item.stock_quantity}</TableCell>
                      <TableCell className="text-xs font-bold">₱{Number(item.unit_cost).toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-black text-primary">₱{(item.stock_quantity * Number(item.unit_cost)).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter ${status.cls}`}>
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] font-medium text-muted-foreground">
                        {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-2xl p-1.5 min-w-[160px]">
                            <DropdownMenuItem onClick={() => handleRequestClick(item)} className="cursor-pointer gap-2.5 px-3 py-2.5 rounded-lg font-medium">
                              <Send className="w-4 h-4 text-primary" /> Request Item
                            </DropdownMenuItem>
                            {role === "admin" && (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(item)} className="cursor-pointer gap-2.5 px-3 py-2.5 rounded-lg font-medium">
                                  <Pencil className="w-4 h-4 text-primary" /> Edit Item
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer gap-2.5 px-3 py-2.5 rounded-lg font-bold text-destructive focus:text-destructive focus:bg-destructive/5" onClick={() => { setDeleteItem(item); setDeleteOpen(true); }}>
                                  <Trash2 className="w-4 h-4" /> Delete Item
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <PackageX className="w-12 h-12 text-muted-foreground/30" />
                        <div className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No matching items found</div>
                        <Button variant="link" onClick={() => { setSearch(""); setSelectedCategory("All"); }} className="text-xs">Clear all filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Out of Stock Modal */}
      <Modal
        isOpen={outOfStockOpen}
        onClose={() => setOutOfStockOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <PackageX className="w-5 h-5 text-destructive" />
            Item Unavailable
          </span>
        }
        size="sm"
        isAlert
      >
        <div className="p-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sorry, <strong>"{requestItem?.item_name}"</strong> is currently <strong>out of stock</strong>.
            Please check back later or contact the Supply Office for assistance.
          </p>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setOutOfStockOpen(false)} className="rounded-xl px-6">Understood</Button>
          </div>
        </div>
      </Modal>

      {/* Request Item Modal */}
      <Modal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        title={<span className="flex items-center gap-2"><Send className="w-5 h-5" />Request: {requestItem?.item_name}</span>}
        size="md"
      >
        <form onSubmit={handleRequestSubmit} className="space-y-6 p-1">
          <div className="p-4 rounded-2xl bg-muted/40 flex items-center justify-between border border-muted-foreground/5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Available Stock</span>
            <span className="font-black text-primary">{requestItem?.stock_quantity} {requestItem?.unit_of_measure}(s)</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-quantity" className="text-xs font-black uppercase tracking-widest text-gray-700">Quantity <span className="text-destructive">*</span></Label>
            <Input
              id="req-quantity"
              ref={quantityRef}
              type="number"
              min="1"
              max={requestItem?.stock_quantity}
              value={requestForm.quantity}
              onChange={e => setRequestForm(p => ({ ...p, quantity: e.target.value }))}
              required
              placeholder={`Max: ${requestItem?.stock_quantity}`}
              className="h-11 rounded-xl shadow-sm border-gray-100 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-gray-700">Requesting Office</Label>
            <Input
              value={(profile as any)?.office_location || ""}
              disabled
              className="h-11 rounded-xl bg-muted/50 text-muted-foreground font-bold cursor-not-allowed border-gray-100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-requested-by" className="text-xs font-black uppercase tracking-widest text-gray-700">Requested By <span className="text-destructive">*</span></Label>
            <Input
              id="req-requested-by"
              value={requestForm.requested_by}
              onChange={e => setRequestForm(p => ({ ...p, requested_by: e.target.value }))}
              required
              className="h-11 rounded-xl shadow-sm border-gray-100 focus:ring-primary/20"
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setRequestOpen(false)} disabled={requestLoading} className="rounded-xl px-6">Cancel</Button>
            <Button type="submit" disabled={requestLoading} className="rounded-xl px-8 shadow-lg shadow-primary/20">
              {requestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={<span className="flex items-center gap-2"><Pencil className="w-5 h-5" />Edit Item</span>}
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-5 p-1">
          <div className="space-y-2">
            <Label htmlFor="edit-item-name" className="text-xs font-black uppercase tracking-widest text-gray-700">Item Name <span className="text-destructive">*</span></Label>
            <Input
              id="edit-item-name"
              autoFocus
              value={editForm.item_name}
              onChange={e => { setEditForm(p => ({ ...p, item_name: e.target.value })); setEditErrors(p => ({ ...p, item_name: "" })); }}
              className="h-11 rounded-xl shadow-sm border-gray-100"
            />
            {editErrors.item_name && <p className="text-[10px] font-bold text-destructive uppercase mt-1">{editErrors.item_name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc" className="text-xs font-black uppercase tracking-widest text-gray-700">Description</Label>
            <Input id="edit-desc" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="h-11 rounded-xl shadow-sm border-gray-100" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-unit" className="text-xs font-black uppercase tracking-widest text-gray-700">Unit of Measure <span className="text-destructive">*</span></Label>
            <Input
              id="edit-unit"
              value={editForm.unit_of_measure}
              onChange={e => { setEditForm(p => ({ ...p, unit_of_measure: e.target.value })); setEditErrors(p => ({ ...p, unit_of_measure: "" })); }}
              className="h-11 rounded-xl shadow-sm border-gray-100"
            />
            {editErrors.unit_of_measure && <p className="text-[10px] font-bold text-destructive uppercase mt-1">{editErrors.unit_of_measure}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cost" className="text-xs font-black uppercase tracking-widest text-gray-700">Unit Cost (₱) <span className="text-destructive">*</span></Label>
              <Input
                id="edit-cost"
                type="number"
                step="0.01"
                value={editForm.unit_cost}
                onChange={e => { setEditForm(p => ({ ...p, unit_cost: e.target.value })); setEditErrors(p => ({ ...p, unit_cost: "" })); }}
                className="h-11 rounded-xl shadow-sm border-gray-100"
              />
              {editErrors.unit_cost && <p className="text-[10px] font-bold text-destructive uppercase mt-1">{editErrors.unit_cost}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-qty" className="text-xs font-black uppercase tracking-widest text-gray-700">Stock Quantity <span className="text-destructive">*</span></Label>
              <Input
                id="edit-qty"
                type="number"
                min="0"
                value={editForm.stock_quantity}
                onChange={e => { setEditForm(p => ({ ...p, stock_quantity: e.target.value })); setEditErrors(p => ({ ...p, stock_quantity: "" })); }}
                className="h-11 rounded-xl shadow-sm border-gray-100"
              />
              {editErrors.stock_quantity && <p className="text-[10px] font-bold text-destructive uppercase mt-1">{editErrors.stock_quantity}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading} className="rounded-xl px-6">Cancel</Button>
            <Button type="submit" disabled={editLoading} className="rounded-xl px-8 shadow-lg shadow-primary/20">
              {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={<span className="flex items-center gap-2 text-destructive"><AlertCircle className="w-5 h-5" />Delete Item</span>}
        size="sm"
        isAlert
      >
        <div className="p-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete <strong>"{deleteItem?.item_name}"</strong>?
            This action cannot be undone and will permanently remove the item from inventory.
          </p>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading} className="rounded-xl px-6">Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="rounded-xl px-8 shadow-lg shadow-destructive/20 gap-2"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </Button>
          </div>
        </div>
      </Modal>

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


export default Inventory;
