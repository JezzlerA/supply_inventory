import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Search, Edit, History, Package, Users, Filter } from "lucide-react";
import { format } from "date-fns";

interface AssignedItem {
  id: string;
  user_id: string;
  inventory_item_id: string | null;
  item_name: string;
  serial_number: string;
  date_assigned: string;
  current_location: string;
  possession_status: string;
  condition_status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
}

interface StatusHistory {
  id: string;
  assigned_item_id: string;
  previous_possession_status: string | null;
  new_possession_status: string | null;
  previous_condition_status: string | null;
  new_condition_status: string | null;
  updated_by: string | null;
  notes: string;
  created_at: string;
  admin_name?: string;
}

interface InventoryOption {
  id: string;
  item_name: string;
}


const CONDITION_STATUSES = ["Functional", "Non-Functional", "Damaged", "Under Repair", "Missing", "Transferred", "Other"];



const conditionColor = (status: string) => {
  switch (status) {
    case "Functional": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Non-Functional": return "bg-red-100 text-red-800 border-red-200";
    case "Damaged": return "bg-orange-100 text-orange-800 border-orange-200";
    case "Under Repair": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Missing": return "bg-rose-100 text-rose-800 border-rose-200";
    case "Transferred": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-muted text-muted-foreground";
  }
};

const ItemMonitoring = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [assignedItems, setAssignedItems] = useState<AssignedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  

  // Dialogs
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AssignedItem | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);

  // Update form
  const [updateForm, setUpdateForm] = useState({
    condition_status: "",
    notes: "",
  });
  const [customStatus, setCustomStatus] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) fetchAssignedItems(selectedUser.id);
  }, [selectedUser]);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, email");
    if (data) setUsers(data);
  };

  const fetchAssignedItems = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("assigned_items")
      .select("*, inventory_items:inventory_item_id(serial_number, item_name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    // Merge serial_number from linked inventory item if local one is empty
    const items = ((data as any[]) || []).map((item) => {
      const inv = item.inventory_items;
      return {
        ...item,
        serial_number: item.serial_number || inv?.serial_number || '',
        item_name: item.item_name || inv?.item_name || '',
        inventory_items: undefined,
      } as AssignedItem;
    });
    setAssignedItems(items);
    setLoading(false);
  };

  const openUpdateDialog = (item: AssignedItem) => {
    setSelectedItem(item);
    const isCustom = !CONDITION_STATUSES.includes(item.condition_status) && item.condition_status !== "";
    setUpdateForm({
      condition_status: isCustom ? "Other" : item.condition_status,
      notes: "",
    });
    setCustomStatus(isCustom ? item.condition_status : "");
    setUpdateDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedItem || !user) return;
    const finalConditionStatus = updateForm.condition_status === "Other" ? customStatus : updateForm.condition_status;
    
    if (updateForm.condition_status === "Other" && !customStatus.trim()) {
      toast({ title: "Error", description: "Please specify the custom condition", variant: "destructive" });
      return;
    }

    const { error: updateError } = await supabase
      .from("assigned_items")
      .update({
        condition_status: finalConditionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedItem.id);

    if (updateError) {
      toast({ title: "Error", description: updateError.message, variant: "destructive" });
      return;
    }

    // Log status change
    await supabase.from("item_status_history").insert({
      assigned_item_id: selectedItem.id,
      previous_condition_status: selectedItem.condition_status,
      new_condition_status: finalConditionStatus,
      updated_by: user.id,
      notes: updateForm.notes,
    });

    toast({ title: "Success", description: "Item status updated" });
    setUpdateDialogOpen(false);
    if (selectedUser) fetchAssignedItems(selectedUser.id);
  };

  const openHistoryDialog = async (item: AssignedItem) => {
    setSelectedItem(item);
    const { data } = await supabase
      .from("item_status_history")
      .select("*")
      .eq("assigned_item_id", item.id)
      .order("created_at", { ascending: false });

    const history = (data as StatusHistory[]) || [];
    // Fetch admin names
    const adminIds = [...new Set(history.filter(h => h.updated_by).map(h => h.updated_by!))];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", adminIds);
      const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]));
      history.forEach(h => {
        if (h.updated_by) h.admin_name = nameMap.get(h.updated_by) || "Unknown";
      });
    }
    setStatusHistory(history);
    setHistoryDialogOpen(true);
  };

  const filteredItems = assignedItems.filter(item => {
    const matchesSearch = searchQuery === "" ||
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === "all" ||
      item.condition_status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Helper to check if item matches by serial number
  const matchesBySerialNumber = (item: AssignedItem) => {
    return searchQuery && item.serial_number && item.serial_number.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Item Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage items assigned to users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User List Panel */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Users
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={!selectedUser ? searchQuery : ""}
                  onChange={(e) => { setSearchQuery(e.target.value); if (selectedUser) setSelectedUser(null); }}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto space-y-1">
              {(selectedUser ? users : filteredUsers).map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setSearchQuery(""); setStatusFilter("all"); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm ${
                    selectedUser?.id === u.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{u.full_name}</div>
                  <div className={`text-xs ${selectedUser?.id === u.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {u.email}
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && !selectedUser && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items Panel */}
        <div className="lg:col-span-8">
          {selectedUser ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Items assigned to {selectedUser.full_name}
                  </CardTitle>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by item name or serial #..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-1" />
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>

                      {CONDITION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
                ) : filteredItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No items found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Serial #</TableHead>
                          <TableHead>Date Assigned</TableHead>
                          <TableHead>Location</TableHead>

                          <TableHead>Condition</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map(item => (
                          <TableRow key={item.id} className={matchesBySerialNumber(item) ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell className={matchesBySerialNumber(item) ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-muted-foreground"}>
                              {item.serial_number || "—"}
                              {matchesBySerialNumber(item) && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Serial Match</span>}
                            </TableCell>
                            <TableCell>{format(new Date(item.date_assigned), "MMM d, yyyy")}</TableCell>
                            <TableCell>{item.current_location || "—"}</TableCell>

                            <TableCell>
                              <Badge variant="outline" className={conditionColor(item.condition_status)}>
                                {item.condition_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openUpdateDialog(item)} title="Update Status">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openHistoryDialog(item)} title="View History">
                                  <History className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Select a user</p>
                <p className="text-sm">Choose a user from the list to view their assigned items</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status — {selectedItem?.item_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            <div>
              <Label>Condition Status</Label>
              <Select value={updateForm.condition_status} onValueChange={val => setUpdateForm(f => ({ ... f, condition_status: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {updateForm.condition_status === "Other" && (
              <div>
                <Label>Specify Condition</Label>
                <Input 
                  placeholder="Type custom condition..." 
                  value={customStatus} 
                  onChange={e => setCustomStatus(e.target.value)} 
                />
              </div>
            )}
            <div>
              <Label>Update Notes</Label>
              <Textarea value={updateForm.notes} onChange={e => setUpdateForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for status change..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Status History — {selectedItem?.item_name}</DialogTitle>
          </DialogHeader>
          {statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No status changes recorded</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>

                    <TableHead>Condition</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusHistory.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{format(new Date(h.created_at), "MMM d, yyyy h:mm a")}</TableCell>

                      <TableCell>
                        {h.previous_condition_status !== h.new_condition_status ? (
                          <span className="text-xs">
                            <span className="text-muted-foreground">{h.previous_condition_status}</span>
                            {" → "}
                            <span className="font-medium">{h.new_condition_status}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No change</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{h.admin_name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{h.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ItemMonitoring;
