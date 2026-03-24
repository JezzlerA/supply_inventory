import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Search, Send, Pencil, Trash2, MoreHorizontal, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const offices = ["College of Education", "Accounting Office", "Cashier's Office", "Registrar's Office", "College of Arts & Sciences", "Dean's Office", "Library", "ICT Office", "HR Office", "Student Affairs Office"];

const Inventory = () => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { user, role, profile } = useAuth();

  // Request dialog
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestItem, setRequestItem] = useState<any>(null);
  const [requestForm, setRequestForm] = useState({ quantity: "", requesting_office: "", requested_by: "" });

  // Out of stock dialog
  const [outOfStockOpen, setOutOfStockOpen] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ item_name: "", description: "", unit_of_measure: "", unit_cost: "", stock_quantity: "" });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any>(null);

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

  // Helper to check if item matches by serial number
  const matchesBySerialNumber = (item: any) => {
    return search && item.serial_number && item.serial_number.toLowerCase().includes(search.toLowerCase());
  };

  const getStatus = (qty: number) => {
    if (qty === 0) return { label: "Out of Stock", cls: "bg-destructive/10 text-destructive" };
    if (qty <= 5) return { label: "Low Stock", cls: "bg-warning/10 text-warning" };
    return { label: "In Stock", cls: "bg-success/10 text-success" };
  };

  // Handle request button click - check stock first
  const handleRequestClick = (item: any) => {
    // Check user office assignment
    const officeLocation = (profile as any)?.office_location;
    if (!officeLocation || officeLocation === "Unassigned Office") {
      toast({ 
        title: "Action required", 
        description: "Please contact admin to assign your office before making a request.", 
        variant: "destructive" 
      });
      return;
    }

    if (item.stock_quantity === 0) {
      setRequestItem(item);
      setOutOfStockOpen(true);
      // Also create a notification for the user
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
    
    // Auto-fill form
    setRequestForm({ 
      quantity: "", 
      requesting_office: officeLocation, 
      requested_by: profile?.full_name || "" 
    });
    setRequestOpen(true);
  };

  // Request item → creates supply_request
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: insertedRequest, error } = await supabase.from("supply_requests").insert({
      item_name: requestItem.item_name,
      quantity: parseInt(requestForm.quantity),
      requesting_office: requestForm.requesting_office,
      requested_by: requestForm.requested_by,
      user_id: user?.id,
      date_requested: new Date().toISOString().split("T")[0],
    }).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Log transaction linked to the supply request
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
      toast({ title: "Request Submitted", description: `Request for "${requestItem.item_name}" has been sent for approval.` });
      setRequestOpen(false);
      setRequestForm({ quantity: "", requesting_office: "", requested_by: "" });
    }
  };

  // Edit item
  const openEdit = (item: any) => {
    setEditItem(item);
    setEditForm({
      item_name: item.item_name,
      description: item.description || "",
      unit_of_measure: item.unit_of_measure,
      unit_cost: String(item.unit_cost),
      stock_quantity: String(item.stock_quantity),
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("inventory_items").update({
      item_name: editForm.item_name,
      description: editForm.description,
      unit_of_measure: editForm.unit_of_measure,
      unit_cost: parseFloat(editForm.unit_cost),
      stock_quantity: parseInt(editForm.stock_quantity),
      updated_at: new Date().toISOString(),
    }).eq("id", editItem.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item Updated", description: `"${editForm.item_name}" has been updated.` });
      setEditOpen(false);
      fetchItems();
    }
  };

  // Delete item
  const handleDelete = async () => {
    if (!deleteItem) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", deleteItem.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item Deleted", description: `"${deleteItem.item_name}" has been removed.` });
      setDeleteOpen(false);
      fetchItems();
    }
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

      {/* Out of Stock Dialog */}
      <AlertDialog open={outOfStockOpen} onOpenChange={setOutOfStockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> Item Unavailable
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sorry, <strong>"{requestItem?.item_name}"</strong> is currently <strong>out of stock</strong>. 
              Please check back later or contact the Supply Office for assistance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request Item Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request: {requestItem?.item_name}</DialogTitle></DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <Label>Available Stock</Label>
              <p className="text-sm text-muted-foreground">{requestItem?.stock_quantity} {requestItem?.unit_of_measure}(s)</p>
            </div>
            <div><Label>Quantity *</Label><Input type="number" min="1" max={requestItem?.stock_quantity} value={requestForm.quantity} onChange={e => setRequestForm(p => ({ ...p, quantity: e.target.value }))} required /></div>
            <div>
              <Label>Requesting Office *</Label>
              <Input 
                value={(profile as any)?.office_location || ""} 
                disabled 
                className="bg-muted text-muted-foreground font-medium cursor-not-allowed" 
              />
            </div>
            <div><Label>Requested By *</Label><Input value={requestForm.requested_by} onChange={e => setRequestForm(p => ({ ...p, requested_by: e.target.value }))} required /></div>
            <Button type="submit" className="w-full"><Send className="w-4 h-4 mr-2" /> Submit Request</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div><Label>Item Name *</Label><Input value={editForm.item_name} onChange={e => setEditForm(p => ({ ...p, item_name: e.target.value }))} required /></div>
            <div><Label>Description</Label><Input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Unit of Measure *</Label><Input value={editForm.unit_of_measure} onChange={e => setEditForm(p => ({ ...p, unit_of_measure: e.target.value }))} required /></div>
            <div><Label>Unit Cost *</Label><Input type="number" step="0.01" value={editForm.unit_cost} onChange={e => setEditForm(p => ({ ...p, unit_cost: e.target.value }))} required /></div>
            <div><Label>Stock Quantity *</Label><Input type="number" min="0" value={editForm.stock_quantity} onChange={e => setEditForm(p => ({ ...p, stock_quantity: e.target.value }))} required /></div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteItem?.item_name}"?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently remove the item from inventory.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
