import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Receiving from "@/pages/Receiving";
import Inventory from "@/pages/Inventory";
import Requests from "@/pages/Requests";
import Distribution from "@/pages/Distribution";
import DamagedReturns from "@/pages/DamagedReturns";
import Reports from "@/pages/Reports";
import Profile from "@/pages/Profile";
import UserManagement from "@/pages/UserManagement";
import ItemMonitoring from "@/pages/ItemMonitoring";
import RequestHistory from "@/pages/RequestHistory";
import MyTransactions from "@/pages/MyTransactions";
import Settings from "@/pages/Settings";
import UserSettings from "@/pages/UserSettings";
import NotFound from "@/pages/NotFound";
import ChatWidget from "@/components/ChatWidget";
import LandingPage from "@/pages/LandingPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  // Only show the full-screen loader during the INITIAL session check
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500 animate-pulse tracking-wide">Initializing system...</p>
        </div>
      </div>
    );
  }
  
  // Once loading is false, if no user exists, redirect to login
  if (!user) {
    console.log("[ProtectedRoute] No user found, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // If user exists, render the layout and children
  // Note: Profile/Role might still be loading in the background
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};


const ChatWidgetWrapper = () => {
  const { user } = useAuth();
  if (!user) return null;
  return <ChatWidget />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/receiving" element={<ProtectedRoute><Receiving /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
        <Route path="/distribution" element={<ProtectedRoute><Distribution /></ProtectedRoute>} />
        <Route path="/damaged-returns" element={<ProtectedRoute><DamagedReturns /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/item-monitoring" element={<ProtectedRoute><ItemMonitoring /></ProtectedRoute>} />
        <Route path="/request-history" element={<ProtectedRoute><RequestHistory /></ProtectedRoute>} />
        <Route path="/my-transactions" element={<ProtectedRoute><MyTransactions /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/user-settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const UnsupportedBrowser = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center border-t-4 border-red-500">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Unsupported Browser</h1>
        <p className="text-gray-700 mb-6">
          This system is not supported on Opera Mini due to compatibility limitations.
          Please use Chrome, Edge, or Firefox.
        </p>
      </div>
    </div>
  );
};

const isUnsupportedBrowser = /Opera Mini/i.test(navigator.userAgent);

const App = () => {
  if (isUnsupportedBrowser) {
    return <UnsupportedBrowser />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
            <ChatWidgetWrapper />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
