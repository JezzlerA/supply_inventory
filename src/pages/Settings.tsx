import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusModal } from "@/components/ui/status-modal";
import { useStatusModal } from "@/hooks/useStatusModal";
import {
  Settings as SettingsIcon, User, Lock, Users, Shield, Search,
  Loader2, KeyRound, Save, Eye, EyeOff
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  status: string;
  created_at: string;
  role?: string;
}

const Settings = () => {
  const { user, profile, role, loading: authLoading } = useAuth();
  const { status, showSuccess, showError, close } = useStatusModal();

  // Profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reset password dialog
  const [resetDialog, setResetDialog] = useState<UserProfile | null>(null);
  const [resetPassword, setResetPasswordVal] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  useEffect(() => {
    if (role === "admin") fetchUsers();
  }, [role]);

  if (authLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
    const merged = (profiles || []).map((p: any) => ({ ...p, status: p.status || "active", role: roleMap.get(p.id) || "user" }));
    setUsers(merged);
    setLoadingUsers(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, email }).eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      showError(error.message, undefined, "Error");
    } else {
      showSuccess("Profile updated successfully!");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }
    setChangingPassword(true);

    // Verify current password by re-signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email || user?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      showError("Current password is incorrect");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      showError(error.message, undefined, "Failed to update password");
    } else {
      showSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleChangeRole = async (targetUser: UserProfile) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    if (!confirm(`Change ${targetUser.full_name}'s role to ${newRole}?`)) return;
    setActionLoading(targetUser.id);
    const { data, error } = await supabase.functions.invoke("manage-user", {
      body: { action: "change_role", user_id: targetUser.id, role: newRole },
    });
    setActionLoading(null);
    if (error || data?.error) {
      showError(data?.error || error?.message, undefined, "Failed to change role");
    } else {
      showSuccess(`Role changed to ${newRole}`);
      fetchUsers();
    }
  };

  const handleToggleStatus = async (targetUser: UserProfile) => {
    const action = targetUser.status === "active" ? "deactivate" : "activate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${targetUser.full_name}'s account?`)) return;
    setActionLoading(targetUser.id);
    const { data, error } = await supabase.functions.invoke("manage-user", {
      body: { action: "toggle_status", user_id: targetUser.id },
    });
    setActionLoading(null);
    if (error || data?.error) {
      showError(data?.error || error?.message, undefined, "Failed to update status");
    } else {
      showSuccess(`Account ${data.status === "active" ? "activated" : "deactivated"}`);
      fetchUsers();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetDialog || resetPassword.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("manage-user", {
      body: { action: "reset_password", user_id: resetDialog.id, password: resetPassword },
    });
    setResetting(false);
    if (error || data?.error) {
      showError(data?.error || error?.message, undefined, "Failed to reset password");
    } else {
      showSuccess("Password reset successfully!");
      setResetDialog(null);
      setResetPasswordVal("");
    }
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-7 h-7" />
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your profile, security, and user accounts</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto gap-4 p-1 bg-transparent">
          <TabsTrigger 
            value="profile" 
            className="gap-2 py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:scale-105 data-[state=active]:shadow-lg transition-all duration-300 ease-in-out"
          >
            <User className="w-5 h-5" /> Profile
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="gap-2 py-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:scale-105 data-[state=active]:shadow-lg transition-all duration-300 ease-in-out"
          >
            <Lock className="w-5 h-5" /> Security
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="gap-2 py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:scale-105 data-[state=active]:shadow-lg transition-all duration-300 ease-in-out"
          >
            <Users className="w-5 h-5" /> User Management
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted text-muted-foreground flex items-center text-sm font-semibold uppercase tracking-wide">
                  {role || "user"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assigned Office</Label>
                <Input 
                  value={(profile as any)?.office_location || "Unassigned"} 
                  disabled 
                  className="bg-muted text-muted-foreground font-medium cursor-not-allowed" 
                />
              </div>
              <div className="pt-2">
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription>Verify your current password before setting a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPw ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                    />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={changingPassword} className="gap-2">
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg">User Accounts</CardTitle>
                  <CardDescription>Manage roles, status, and passwords</CardDescription>
                </div>
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
                        <TableHead>Office</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(u => {
                        const isSelf = u.id === user?.id;
                        const isLoading = actionLoading === u.id;
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                            <TableCell>{u.email || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="gap-1">
                                {u.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{u.office_location || "Unassigned"}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={u.status === "active"}
                                  onCheckedChange={() => handleToggleStatus(u)}
                                  disabled={isSelf || isLoading}
                                />
                                <span className={`text-xs font-medium ${u.status === "active" ? "text-green-600" : "text-destructive"}`}>
                                  {u.status === "active" ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleChangeRole(u)}
                                  disabled={isSelf || isLoading}
                                  className="gap-1 text-xs"
                                >
                                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                                  {u.role === "admin" ? "→ User" : "→ Admin"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setResetDialog(u)}
                                  disabled={isLoading}
                                  className="gap-1 text-xs"
                                >
                                  <KeyRound className="w-3 h-3" /> Reset PW
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filtered.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetDialog} onOpenChange={open => { if (!open) { setResetDialog(null); setResetPasswordVal(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {resetDialog?.full_name || "this user"}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={resetPassword}
                onChange={e => setResetPasswordVal(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={resetting} className="gap-2">
                {resetting && <Loader2 className="w-4 h-4 animate-spin" />} Reset Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

export default Settings;
