import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Lock, Loader2, Save, Eye, EyeOff, Camera
} from "lucide-react";

const UserSettings = () => {
  const { user, profile, role, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("contact_number").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.contact_number) setContactNumber(data.contact_number); });
  }, [user]);

  if (authLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (role === "admin") return <Navigate to="/settings" replace />;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const fileExt = file.name.split(".").pop();
    const filePath = `avatars/${user.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); return; }
    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const url = publicData.publicUrl + "?t=" + Date.now();
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    toast({ title: "Photo updated!" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;

    if (wantsPasswordChange) {
      if (newPassword.length < 6) { toast({ title: "New password must be at least 6 characters", variant: "destructive" }); return; }
      if (newPassword !== confirmPassword) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    }

    setSaving(true);

    // Update profile
    const { error: profileError } = await supabase.from("profiles").update({
      full_name: fullName, email, contact_number: contactNumber
    }).eq("id", user.id);

    if (profileError) {
      setSaving(false);
      toast({ title: "Error updating profile", description: profileError.message, variant: "destructive" });
      return;
    }

    // Update password if fields are filled
    if (wantsPasswordChange) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email || user.email || "", password: currentPassword,
      });
      if (signInError) {
        setSaving(false);
        toast({ title: "Current password is incorrect", variant: "destructive" });
        return;
      }
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) {
        setSaving(false);
        toast({ title: "Failed to update password", description: pwError.message, variant: "destructive" });
        return;
      }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    }

    setSaving(false);
    toast({ title: wantsPasswordChange ? "Profile and password updated!" : "Profile updated successfully!" });
  };

  const initials = (fullName || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-7 h-7" />
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your profile and security</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
            <CardDescription>Update your personal details and profile photo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center">
              <Avatar className="w-24 h-24 mb-3 shadow-md ring-4 ring-background">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <label htmlFor="settings-avatar-upload">
                <Button variant="outline" size="sm" className="cursor-pointer gap-2" asChild>
                  <span><Camera className="w-4 h-4" /> Change Photo</span>
                </Button>
                <input id="settings-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Contact Number</Label>
                <Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="Enter your contact number" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</CardTitle>
            <CardDescription>Leave blank if you don't want to change your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserSettings;
