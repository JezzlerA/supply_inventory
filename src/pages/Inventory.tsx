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
import { Search, Send, Pencil, Trash2, MoreHorizontal, AlertCircle, Loader2, PackageX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Inventory = () => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
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
    const { data } = await supabase.from("inventory_items").select("*, categories(name)").order("updated_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.serial_number && i.serial_number.toLowerCase().includes(search.toLowerCase())) ||
    (i.description && i.description.toLowerCase().includes(search.toLowerCase()))
  );

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
    <div>
      <h1 className="text-2xl font-bold">Inventory</h1>
      <p className="text-muted-foreground mb-6">Current stock levels in the Supply Room Office</p>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Stock Items ({filtered.length})</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, serial #, description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const status = getStatus(item.stock_quantity);
                return (
                  <TableRow key={item.id} className={matchesBySerialNumber(item) ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className={matchesBySerialNumber(item) ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-muted-foreground"}>
                      {item.serial_number || "—"}
                      {matchesBySerialNumber(item) && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Serial Match</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                    <TableCell className="text-primary">{(item as any).categories?.name || "—"}</TableCell>
                    <TableCell>{item.unit_of_measure}</TableCell>
                    <TableCell>{item.stock_quantity}</TableCell>
                    <TableCell>₱{Number(item.unit_cost).toLocaleString()}</TableCell>
                    <TableCell>₱{(item.stock_quantity * Number(item.unit_cost)).toLocaleString()}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span></TableCell>
                    <TableCell>{item.updated_at?.split("T")[0]}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRequestClick(item)}>
                            <Send className="w-4 h-4 mr-2" /> Request Item
                          </DropdownMenuItem>
                          {role === "admin" && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(item)}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit Item
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteItem(item); setDeleteOpen(true); }}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Item
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No items found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
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
        <p className="text-sm text-muted-foreground">
          Sorry, <strong>"{requestItem?.item_name}"</strong> is currently <strong>out of stock</strong>.
          Please check back later or contact the Supply Office for assistance.
        </p>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setOutOfStockOpen(false)}>Understood</Button>
        </div>
      </Modal>

      {/* Request Item Modal */}
      <Modal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        title={<span className="flex items-center gap-2"><Send className="w-5 h-5" />Request: {requestItem?.item_name}</span>}
        size="md"
      >
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Available Stock</span>
            <span className="font-semibold">{requestItem?.stock_quantity} {requestItem?.unit_of_measure}(s)</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="req-quantity">Quantity <span className="text-destructive">*</span></Label>
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
            />
          </div>
          <div className="space-y-1">
            <Label>Requesting Office</Label>
            <Input
              value={(profile as any)?.office_location || ""}
              disabled
              className="bg-muted text-muted-foreground font-medium cursor-not-allowed"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="req-requested-by">Requested By <span className="text-destructive">*</span></Label>
            <Input
              id="req-requested-by"
              value={requestForm.requested_by}
              onChange={e => setRequestForm(p => ({ ...p, requested_by: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setRequestOpen(false)} disabled={requestLoading}>Cancel</Button>
            <Button type="submit" disabled={requestLoading} className="gap-2">
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
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-item-name">Item Name <span className="text-destructive">*</span></Label>
            <Input
              id="edit-item-name"
              autoFocus
              value={editForm.item_name}
              onChange={e => { setEditForm(p => ({ ...p, item_name: e.target.value })); setEditErrors(p => ({ ...p, item_name: "" })); }}
            />
            {editErrors.item_name && <p className="text-xs text-destructive">{editErrors.item_name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-desc">Description</Label>
            <Input id="edit-desc" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-unit">Unit of Measure <span className="text-destructive">*</span></Label>
            <Input
              id="edit-unit"
              value={editForm.unit_of_measure}
              onChange={e => { setEditForm(p => ({ ...p, unit_of_measure: e.target.value })); setEditErrors(p => ({ ...p, unit_of_measure: "" })); }}
            />
            {editErrors.unit_of_measure && <p className="text-xs text-destructive">{editErrors.unit_of_measure}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-cost">Unit Cost <span className="text-destructive">*</span></Label>
              <Input
                id="edit-cost"
                type="number"
                step="0.01"
                value={editForm.unit_cost}
                onChange={e => { setEditForm(p => ({ ...p, unit_cost: e.target.value })); setEditErrors(p => ({ ...p, unit_cost: "" })); }}
              />
              {editErrors.unit_cost && <p className="text-xs text-destructive">{editErrors.unit_cost}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-qty">Stock Quantity <span className="text-destructive">*</span></Label>
              <Input
                id="edit-qty"
                type="number"
                min="0"
                value={editForm.stock_quantity}
                onChange={e => { setEditForm(p => ({ ...p, stock_quantity: e.target.value })); setEditErrors(p => ({ ...p, stock_quantity: "" })); }}
              />
              {editErrors.stock_quantity && <p className="text-xs text-destructive">{editErrors.stock_quantity}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>Cancel</Button>
            <Button type="submit" disabled={editLoading} className="gap-2">
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
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>"{deleteItem?.item_name}"</strong>?
          This action cannot be undone and will permanently remove the item from inventory.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteLoading}
            className="gap-2"
          >
            {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
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
