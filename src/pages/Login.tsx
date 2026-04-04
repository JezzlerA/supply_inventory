import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="min-h-screen flex relative overflow-hidden bg-[#f0f4f8] font-sans">
      {/* Left decorative panel with Image and Overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden shadow-2xl z-10">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-10000 hover:scale-105"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')" }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/80 to-blue-900/90 mix-blend-multiply backdrop-blur-[1px]" />
        
        {/* Animated Floating Shapes */}
        <div className="absolute inset-x-0 inset-y-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ y: [0, -20, 0], x: [0, 10, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[10%] w-64 h-64 rounded-full bg-white/10 blur-3xl" 
          />
          <motion.div 
            animate={{ y: [0, 30, 0], x: [0, -15, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[20%] right-[10%] w-72 h-72 rounded-full bg-blue-400/20 blur-3xl" 
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-20 w-full max-w-lg text-white flex flex-col items-center text-center"
        >
          <div className="mb-8">
            <SystemLogo variant="login" className="bg-transparent shadow-none" />
          </div>
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight leading-tight">
            NORSU Bais Campus <br />
            <span className="text-blue-200">Inventory System</span>
          </h2>
          <p className="text-lg text-white/80 leading-relaxed font-light max-w-md">
            A modern, dashboard-style management solution to track, organize, and optimize campus supply operations.
          </p>

          <div className="mt-12 flex items-center justify-center gap-3">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "48px" }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-1.5 rounded-full bg-blue-400" 
            />
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="w-2 h-2 rounded-full bg-white/50" 
            />
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="w-2 h-2 rounded-full bg-white/50" 
            />
          </div>
        </motion.div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-0">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-[440px] bg-white/80 backdrop-blur-xl sm:bg-white sm:backdrop-blur-none sm:shadow-2xl rounded-3xl p-8 border border-white/50 sm:border-gray-100"
        >
          {/* Mobile branding */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="mb-4">
              <SystemLogo variant="login" className="!w-20 !h-20 bg-transparent shadow-none" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">NORSU Bais</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Supply Office Inventory</p>
          </div>

          {/* Form header */}
          <div className="mb-8 hidden lg:block">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="text-gray-500 mt-2 text-sm font-medium">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-gray-700">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors duration-300" />
                <Input
                  type="email"
                  placeholder="you@norsu.edu.ph"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-11 h-12 bg-gray-50/50 border-gray-200 text-gray-900 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-700">Password</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-semibold transition-colors duration-300">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors duration-300" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pl-11 pr-12 h-12 bg-gray-50/50 border-gray-200 text-gray-900 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-300 focus:outline-none"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={showPassword ? 'hide' : 'show'}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </motion.div>
                  </AnimatePresence>
                </button>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                className="w-full h-12 text-base font-bold text-white shadow-lg shadow-primary/25 rounded-xl transition-all duration-300 relative overflow-hidden group"
                disabled={loading}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center justify-center relative z-10">
                    Sign In
                    <motion.div
                      className="ml-2"
                      initial={{ x: 0 }}
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <LogIn className="w-5 h-5" />
                    </motion.div>
                  </span>
                )}
              </Button>
            </motion.div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Don't have an account?{" "}
              <a href="#" className="text-gray-900 font-bold hover:text-primary transition-colors underline decoration-2 decoration-primary/30 underline-offset-4">
                Contact Admin
              </a>
            </p>
          </div>
        </motion.div>
        
        {/* Footer for mobile/desktop integrated beautifully */}
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
          <p className="text-xs text-gray-400 font-medium tracking-wide">
            © 2026 NORSU Bais Campus
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
