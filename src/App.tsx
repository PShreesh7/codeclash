import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "@/contexts/UserContext";
import AppLayout from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Assessment from "@/pages/Assessment";
import Dashboard from "@/pages/Dashboard";
import Learning from "@/pages/Learning";
import Battle from "@/pages/Battle";
import Progress from "@/pages/Progress";
import MatchHistory from "@/pages/MatchHistory";
import AICoach from "@/pages/AICoach";
import WalletPage from "@/pages/WalletPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useUser();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AssessmentGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useUser();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!user.assessmentCompleted) return <Navigate to="/assessment" replace />;
  return <>{children}</>;
};

const AuthRedirect = () => {
  const { user, isAuthenticated, loading } = useUser();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Landing />;
  if (!user?.assessmentCompleted) return <Navigate to="/assessment" replace />;
  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<AuthRedirect />} />
    <Route path="/assessment" element={
      <ProtectedRoute><Assessment /></ProtectedRoute>
    } />
    <Route element={
      <AssessmentGate><AppLayout /></AssessmentGate>
    }>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/learning" element={<Learning />} />
      <Route path="/battle" element={<Battle />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/history" element={<MatchHistory />} />
      <Route path="/ai-coach" element={<AICoach />} />
      <Route path="/wallet" element={<WalletPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
