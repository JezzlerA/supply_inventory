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
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
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

const App = () => (
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

export default App;
