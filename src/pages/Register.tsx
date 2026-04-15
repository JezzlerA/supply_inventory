import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusModal } from "@/components/ui/status-modal";
import { useStatusModal } from "@/hooks/useStatusModal";
import { UserPlus, GraduationCap } from "lucide-react";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { status, showSuccess, showError, close } = useStatusModal();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showError("Passwords don't match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      showError(error.message, undefined, "Registration failed");
    } else {
      showSuccess("Account created!", "Please check your email to verify your account.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md border rounded-lg bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">Create an Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Register for the NORSU Supply Office System</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label className="font-semibold">Full Name</Label>
            <Input placeholder="Juan Dela Cruz" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label className="font-semibold">Email</Label>
            <Input type="email" placeholder="you@norsu.edu.ph" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label className="font-semibold">Password</Label>
            <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div>
            <Label className="font-semibold">Confirm Password</Label>
            <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          <div>
            <Label className="font-semibold">User Type</Label>
            <div className="flex gap-3 mt-2">
              {(["admin", "user"] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${role === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
                  {r === "admin" ? "🛡️ Admin" : "👤 User"}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            <UserPlus className="w-4 h-4 mr-2" /> Register
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </div>

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

export default Register;
