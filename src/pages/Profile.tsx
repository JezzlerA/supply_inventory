import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Profile = () => {
  const { user, profile, role } = useAuth();
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
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const url = publicData.publicUrl + "?t=" + Date.now();
    setAvatarUrl(url);

    // Save avatar_url to profiles table
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    toast({ title: "Photo updated!" });
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated successfully!" });
    }
  };

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = role === "admin" ? "Admin" : "User";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{roleLabel} Profile</h1>

      <Card className="shadow-lg border-0">
        <CardContent className="p-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <Avatar className="w-28 h-28 mb-4 shadow-md ring-4 ring-background">
              <AvatarImage src={avatarUrl || undefined} alt={fullName} />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                {initials || "U"}
              </AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload">
              <Button variant="outline" size="sm" className="cursor-pointer gap-2" asChild>
                <span>
                  <Camera className="w-4 h-4" />
                  Change Photo
                </span>
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted text-muted-foreground flex items-center text-sm font-semibold uppercase tracking-wide">
                {role || "user"}
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="px-10 bg-[hsl(217,90%,55%)] hover:bg-[hsl(217,90%,48%)] text-white"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
