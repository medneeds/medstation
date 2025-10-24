import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Clinicus from "./pages/Clinicus";
import Examinus from "./pages/Examinus";
import Scorius from "./pages/Scorius";
import Numerus from "./pages/Numerus";
import Prescriptus from "@/pages/Prescriptus";
import Codexus from "@/pages/Codexus";
import Prescriptions from "@/pages/Prescriptions";
import NewPrescription from "@/pages/NewPrescription";
import PrescriptionDetail from "@/pages/PrescriptionDetail";
import ExamRequests from "@/pages/ExamRequests";
import NewExamRequest from "@/pages/NewExamRequest";
import ExamRequestDetail from "@/pages/ExamRequestDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SubscriptionProvider>
        <ProfileProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Patients />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PatientDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cases"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Cases />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/case/:caseId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CaseDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinicus"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Clinicus />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/examinus"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Examinus />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/scorius"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Scorius />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/numerus"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Numerus />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptus"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Prescriptus />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/codexus"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Codexus />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
              <Route path="/prescricoes" element={<ProtectedRoute><DashboardLayout><Prescriptions /></DashboardLayout></ProtectedRoute>} />
              <Route path="/prescricoes/nova" element={<ProtectedRoute><DashboardLayout><NewPrescription /></DashboardLayout></ProtectedRoute>} />
              <Route path="/prescricoes/:id" element={<ProtectedRoute><DashboardLayout><PrescriptionDetail /></DashboardLayout></ProtectedRoute>} />
              <Route path="/exames" element={<ProtectedRoute><DashboardLayout><ExamRequests /></DashboardLayout></ProtectedRoute>} />
              <Route path="/exames/novo" element={<ProtectedRoute><DashboardLayout><NewExamRequest /></DashboardLayout></ProtectedRoute>} />
              <Route path="/exames/:id" element={<ProtectedRoute><DashboardLayout><ExamRequestDetail /></DashboardLayout></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><DashboardLayout><Notes /></DashboardLayout></ProtectedRoute>} />
              <Route path="/notes/:id" element={<ProtectedRoute><DashboardLayout><NoteDetail /></DashboardLayout></ProtectedRoute>} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ProfileProvider>
      </SubscriptionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
