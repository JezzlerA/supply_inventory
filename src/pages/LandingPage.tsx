import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Package,
  Users,
  BarChart3,
  ArrowRight,
  Shield,
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { SystemLogo } from "@/components/SystemLogo";

const features = [
  {
    icon: ClipboardList,
    title: "Inventory Tracking",
    description: "Monitor stock levels, manage categories, and keep real-time records of all supply items.",
    color: "bg-blue-500",
    lightColor: "bg-blue-500/10",
    textColor: "text-blue-600",
  },
  {
    icon: Package,
    title: "Item Monitoring",
    description: "Track assigned items, condition statuses, and possession across departments.",
    color: "bg-emerald-500",
    lightColor: "bg-emerald-500/10",
    textColor: "text-emerald-600",
  },
  {
    icon: Users,
    title: "User Management",
    description: "Manage user accounts, assign roles, and control access to system features.",
    color: "bg-orange-500",
    lightColor: "bg-orange-500/10",
    textColor: "text-orange-600",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Generate detailed reports and view complete transaction history for auditing.",
    color: "bg-violet-500",
    lightColor: "bg-violet-500/10",
    textColor: "text-violet-600",
  },
];

const benefits = [
  "Real-time inventory updates",
  "Automated stock alerts",
  "Comprehensive audit trails",
  "Role-based access control",
];

const LandingPage = () => {
  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SystemLogo variant="navbar" />
            <div className="hidden sm:block">
              <span className="font-bold text-foreground tracking-tight">
                NORSU Supply Office
              </span>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Bais Campus</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
              <a href="#features">Features</a>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden sm:inline-flex" asChild>
              <a href="#about">About</a>
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:from-primary/90 hover:to-primary transition-all duration-300" asChild>
                <Link to="/login">Login</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[url('/norsu-building.jpg')] bg-cover bg-center bg-no-repeat">
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/50" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 lg:pt-56 pb-16 sm:pb-24 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
              Streamline Your{" "}
              <span className="bg-gradient-to-r from-primary via-blue-600 to-violet-600 bg-clip-text text-transparent">
                Supply Office
              </span>{" "}
              Operations
            </h1>
            <p className="text-lg sm:text-xl text-slate-100/90 leading-relaxed mb-8 max-w-2xl mx-auto">
              A comprehensive inventory management system designed for NORSU Bais Campus. 
              Track supplies, manage requests, and generate reports effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }} 
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button size="lg" className="w-full sm:w-auto text-base font-semibold bg-gradient-to-r from-primary to-primary/90 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:from-primary/90 hover:to-blue-600 transition-all duration-300" asChild>
                  <Link to="/login">
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </motion.div>
              <Button
                size="lg"
                className="w-full sm:w-auto text-base font-semibold bg-gradient-to-r from-accent to-yellow-400 text-accent-foreground hover:opacity-90 shadow-xl shadow-accent/30 hover:shadow-2xl hover:shadow-accent/40 transition-all duration-300"
                asChild
              >
                <a href="#features">
                  <Shield className="w-4 h-4 mr-2" />
                  Explore Features
                </a>
              </Button>
            </div>
            
            {/* Benefits list */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-1.5 text-sm text-slate-100/90">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100/50 via-slate-100/80 to-slate-100/50" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Manage{" "}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Inventory
              </span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              Powerful tools designed to streamline campus supply operations.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, idx) => (
              <div
                key={f.title}
                className="group bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${f.lightColor} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                >
                  <f.icon className={`w-7 h-7 ${f.textColor}`} />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About / Stats */}
      <section id="about" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="inline-block text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                About the System
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                Built for{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                  Efficiency
                </span>{" "}
                and{" "}
                <span className="bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                  Accountability
                </span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                The NORSU Supply Office Inventory Management System is designed to modernize 
                how campus supplies are tracked, requested, and distributed. Say goodbye to 
                manual paperwork and hello to real-time visibility.
              </p>
              <div className="space-y-4">
                {[
                  { icon: TrendingUp, text: "Reduce supply waste with accurate tracking" },
                  { icon: Shield, text: "Secure role-based access for all users" },
                  { icon: CheckCircle2, text: "Automated notifications and alerts" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary via-primary to-blue-700 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
                <div className="relative z-10">
                  <SystemLogo variant="login" className="mb-6" />
                  <h3 className="text-2xl font-bold mb-3">
                    NORSU Bais Campus
                  </h3>
                  <p className="text-white/70 mb-8 leading-relaxed">
                    Serving the academic community with efficient supply management 
                    and transparent resource allocation.
                  </p>
                  <Button
                    size="lg"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-xl hover:shadow-2xl transition-all"
                    asChild
                  >
                    <Link to="/login">
                      Access System <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-yellow-400 mb-6 shadow-xl shadow-accent/30">
                <Sparkles className="w-8 h-8 text-accent-foreground" />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto text-lg">
                Log in now to access the complete inventory management dashboard and streamline your supply operations.
              </p>
              <Button
                size="lg"
                className="text-base font-semibold bg-gradient-to-r from-accent to-yellow-400 text-accent-foreground hover:opacity-90 shadow-xl shadow-accent/30 hover:shadow-2xl hover:shadow-accent/40 hover:-translate-y-0.5 transition-all duration-300"
                asChild
              >
                <Link to="/login">
                  Login to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <SystemLogo variant="navbar" />
              <div>
                <span className="text-sm font-bold text-foreground">
                  NORSU Bais Campus
                </span>
                <p className="text-xs text-muted-foreground">Supply Office Inventory System</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
              <Link to="/login" className="text-sm text-primary font-medium hover:text-primary/80 transition-colors">
                Login
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Inventory Management System. Developed for NORSU Bais Campus.
            </p>
          </div>
        </div>
      </footer>
    </motion.div>
  );
};

export default LandingPage;
