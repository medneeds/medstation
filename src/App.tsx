import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Clinicus from "./pages/Clinicus";
import Examinus from "./pages/Examinus";
import Scorius from "./pages/Scorius";
import Numerus from "./pages/Numerus";
import Prescriptus from "./pages/Prescriptus";
import Codexus from "./pages/Codexus";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            }
          />
          <Route
            path="/patients"
            element={
              <DashboardLayout>
                <Patients />
              </DashboardLayout>
            }
          />
          <Route
            path="/clinicus"
            element={
              <DashboardLayout>
                <Clinicus />
              </DashboardLayout>
            }
          />
          <Route
            path="/examinus"
            element={
              <DashboardLayout>
                <Examinus />
              </DashboardLayout>
            }
          />
            <Route
              path="/scorius"
              element={
                <DashboardLayout>
                  <Scorius />
                </DashboardLayout>
              }
            />
            <Route
              path="/numerus"
              element={
                <DashboardLayout>
                  <Numerus />
                </DashboardLayout>
              }
            />
            <Route
              path="/prescriptus"
              element={
                <DashboardLayout>
                  <Prescriptus />
                </DashboardLayout>
              }
            />
          <Route
            path="/codexus"
            element={
              <DashboardLayout>
                <Codexus />
              </DashboardLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
