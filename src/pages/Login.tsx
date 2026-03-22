import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { SystemLogo } from "@/components/SystemLogo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <motion.div 
      className="min-h-screen flex relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative flex-col items-center justify-center p-12">
        {/* Decorative shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute top-1/4 right-0 w-64 h-64 rounded-full bg-accent/10" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute bottom-1/3 right-1/4 w-32 h-32 rounded-full bg-accent/15" />
        </div>

        <div className="relative z-10 max-w-md flex flex-col items-center text-center">
          <div className="mb-6">
            <SystemLogo variant="login" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-2">
            NORSU Bais Campus
          </h2>
          <p className="text-lg text-primary-foreground/70 leading-relaxed">
            Supply Office Inventory Management System
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="w-12 h-1 rounded-full bg-accent" />
            <div className="w-3 h-1 rounded-full bg-primary-foreground/30" />
            <div className="w-3 h-1 rounded-full bg-primary-foreground/30" />
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="mb-4">
              <SystemLogo variant="login" />
            </div>
            <h1 className="text-xl font-bold text-foreground">NORSU Bais Campus</h1>
            <p className="text-sm text-muted-foreground">Supply Office Inventory System</p>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="you@norsu.edu.ph"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11 bg-secondary/50 border-border focus:bg-card transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-11 bg-secondary/50 border-border focus:bg-card transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <span className="text-primary font-medium">Contact your administrator</span>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              © 2026 NORSU Bais Campus — Supply Office
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Login;
