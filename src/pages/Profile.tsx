import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { StatusModal } from "@/components/ui/status-modal";
import { useStatusModal } from "@/hooks/useStatusModal";

const Profile = () => {
  const { user, profile, role, profileLoading } = useAuth();
  const { status, showSuccess, showError, close } = useStatusModal();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `avatars/${user.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      showError(uploadError.message, undefined, "Upload failed");
      return;
    }

    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const url = publicData.publicUrl + "?t=" + Date.now();
    setAvatarUrl(url);

    // Save avatar_url to profiles table
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    showSuccess("Photo updated!");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, email })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      showError(error.message, undefined, "Error");
    } else {
      showSuccess("Profile updated successfully!");
    }
  };

  const initials = fullName
    ? fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "U";

  const roleLabel = role === "admin" ? "Admin" : "User";

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{profileLoading ? 'Loading Profile...' : `${roleLabel} Profile`}</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Manage your personal information and preferences</p>
        </div>
      </div>

      <Card className="shadow-2xl border-0 rounded-[32px] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
        <CardContent className="p-8 md:p-12">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-12">
            {profileLoading ? (
              <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse mb-6 border-4 border-white shadow-xl" />
            ) : (
              <>
                <div className="relative group">
                  <Avatar className="w-32 h-32 mb-6 shadow-2xl ring-4 ring-white transition-transform duration-500 group-hover:scale-105">
                    <AvatarImage src={avatarUrl || undefined} alt={fullName} className="object-cover" />
                    <AvatarFallback className="text-3xl font-black bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="avatar-upload" className="absolute bottom-6 right-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90 transition-colors border-2 border-white">
                    <Camera className="w-5 h-5" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
                <div className="text-center">
                  <h2 className="font-bold text-xl text-gray-900">{fullName || "User Name"}</h2>
                  <p className="text-xs font-black uppercase tracking-widest text-primary mt-1">{roleLabel}</p>
                </div>
              </>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-black uppercase tracking-widest text-gray-700">Full Name</Label>
                {profileLoading ? (
                  <div className="h-12 bg-gray-100 animate-pulse rounded-xl" />
                ) : (
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-12 rounded-xl border-gray-100 bg-white/80 shadow-sm focus:ring-primary/20 transition-all"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-gray-700">Email Address</Label>
                {profileLoading ? (
                  <div className="h-12 bg-gray-100 animate-pulse rounded-xl" />
                ) : (
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-12 rounded-xl border-gray-100 bg-white/80 shadow-sm focus:ring-primary/20 transition-all"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-700">System Role</Label>
              {profileLoading ? (
                <div className="h-12 bg-gray-100 animate-pulse rounded-xl" />
              ) : (
                <div className="h-12 px-4 py-2 rounded-xl border border-gray-100 bg-muted/30 text-muted-foreground flex items-center text-sm font-bold uppercase tracking-widest">
                  {role || "user"}
                </div>
              )}
            </div>

            <div className="pt-8 flex justify-center">
              <Button
                onClick={handleSave}
                disabled={saving || profileLoading}
                className="h-12 px-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 active:translate-y-0"
              >
                {saving ? "Saving Changes..." : "Save Profile"}
              </Button>
            </div>
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

export default Profile;
