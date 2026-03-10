import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ResetPassword from "@/pages/ResetPassword";
import PublicIntake from "@/pages/PublicIntake";
import ClientPortal from "@/pages/ClientPortal";
import Dashboard from "@/pages/Dashboard";
import TemplatesList from "@/pages/TemplatesList";
import TemplateNew from "@/pages/TemplateNew";
import TemplateEdit from "@/pages/TemplateEdit";
import TemplateAnalytics from "@/pages/TemplateAnalytics";
import SubmissionsList from "@/pages/SubmissionsList";
import SubmissionDetail from "@/pages/SubmissionDetail";
import Settings from "@/pages/Settings";
import Billing from "@/pages/Billing";
import ReminderLog from "@/pages/ReminderLog";
import Clients from "@/pages/Clients";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Refund from "@/pages/Refund";
import Install from "@/pages/Install";
import AppLayout from "@/components/AppLayout";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund" element={<Refund />} />
              <Route path="/t/:publicId" element={<PublicIntake />} />
              <Route path="/install" element={<Install />} />
              <Route path="/portal/:token" element={<ClientPortal />} />
              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="templates" element={<TemplatesList />} />
                <Route path="templates/new" element={<TemplateNew />} />
                <Route path="templates/analytics" element={<TemplateAnalytics />} />
                <Route path="templates/:id" element={<TemplateEdit />} />
                <Route path="submissions" element={<SubmissionsList />} />
                <Route path="submissions/:id" element={<SubmissionDetail />} />
                <Route path="clients" element={<Clients />} />
                <Route path="billing" element={<Billing />} />
                <Route path="reminders" element={<ReminderLog />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
