import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, Shield, User, Search, Loader2, Eye } from "lucide-react";
import UserTransactionHistory from "@/components/UserTransactionHistory";

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  role?: string;
}

const UserManagement = () => {
  const { role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
    const merged = (profiles || []).map(p => ({ ...p, role: roleMap.get(p.id) || "user" }));
    setUsers(merged);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (role === "admin") fetchUsers();
  }, [role]);

  if (authLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setCreating(true);

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { email, password, full_name: fullName, role: newUserRole },
    });

    setCreating(false);
    if (error || data?.error) {
      toast({ title: "Failed to create user", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "User created successfully", description: `${fullName} has been added as ${newUserRole}.` });
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    }
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setNewUserRole("user");
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users and create new accounts</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Create User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-lg">All Users</CardTitle>
            <div className="relative sm:ml-auto w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Name</TableHead>
                     <TableHead>Email</TableHead>
                     <TableHead>Role</TableHead>
                     <TableHead>Joined</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell>{u.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="gap-1">
                          {u.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(u)} className="gap-1.5">
                          <Eye className="w-4 h-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Create New User</DialogTitle>
            <DialogDescription>Fill in the details to create a new system account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input placeholder="Juan Dela Cruz" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="user@norsu.edu.ph" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <Label>Role</Label>
              <div className="flex gap-3 mt-2">
                {(["user", "admin"] as const).map(r => (
                  <button key={r} type="button" onClick={() => setNewUserRole(r)}
                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                      newUserRole === r
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-muted"
                    }`}>
                    {r === "admin" ? "🛡️ Admin" : "👤 User"}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedUser && (
        <UserTransactionHistory
          open={!!selectedUser}
          onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
          userId={selectedUser.id}
          userName={selectedUser.full_name || "Unknown"}
        />
      )}
    </div>
  );
};

export default UserManagement;
