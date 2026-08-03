import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AnalyticsTracker } from "./components/AnalyticsTracker";
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
import ConfirmarEmail from "./pages/ConfirmarEmail";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import WelcomeTour from "./pages/WelcomeTour";
import Clinicus from "./pages/Clinicus";
import Consultorio from "./pages/Consultorio";
import ConsultorioLanding from "./pages/ConsultorioLanding";
import Examinus from "./pages/Examinus";
import Scorius from "./pages/Scorius";
import Numerus from "./pages/Numerus";
import Prescriptus from "@/pages/Prescriptus";
import Codexus from "@/pages/Codexus";
import Gasometrus from "@/pages/Gasometrus";
import Atestus from "@/pages/Atestus";
import Protocolus from "@/pages/Protocolus";
import Orientus from "@/pages/Orientus";
import Mediscuss from "@/pages/Mediscuss";
import Prescriptions from "@/pages/Prescriptions";
import NewPrescription from "@/pages/NewPrescription";
import PrescriptionDetail from "@/pages/PrescriptionDetail";
import ExamRequests from "@/pages/ExamRequests";
import NewExamRequest from "@/pages/NewExamRequest";
import ExamRequestDetail from "@/pages/ExamRequestDetail";
import MedicalDocuments from "@/pages/MedicalDocuments";
import MedicalDocumentDetail from "@/pages/MedicalDocumentDetail";
import Settings from "./pages/Settings";
import AdminSubscribers from "./pages/AdminSubscribers";
import { AdminRoute } from "./components/AdminRoute";
import { AdminLayout } from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminAIUsage from "./pages/admin/AdminAIUsage";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminFlags from "./pages/admin/AdminFlags";
import AdminBroadcast from "./pages/admin/AdminBroadcast";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminFunnel from "./pages/admin/AdminFunnel";
import AdminAudience from "./pages/admin/AdminAudience";
import AdminEmails from "./pages/admin/AdminEmails";
import Unsubscribe from "./pages/Unsubscribe";
import Indicar from "./pages/Indicar";
import ReferralRedirect from "./pages/ReferralRedirect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const PromoPreview = lazy(() => import("./pages/PromoPreview"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SubscriptionProvider>
        <ProfileProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <AnalyticsTracker />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/confirmar-email" element={<ConfirmarEmail />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/consultorio-landing" element={<ConsultorioLanding />} />
            <Route
              path="/consultorio"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Consultorio />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/welcome-tour" element={<ProtectedRoute><WelcomeTour /></ProtectedRoute>} />
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
              path="/cases/:id"
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
            <Route path="/prescricoes" element={<ProtectedRoute><DashboardLayout><Prescriptions /></DashboardLayout></ProtectedRoute>} />
            <Route path="/prescricoes/nova" element={<ProtectedRoute><DashboardLayout><NewPrescription /></DashboardLayout></ProtectedRoute>} />
            <Route path="/prescricoes/:id" element={<ProtectedRoute><DashboardLayout><PrescriptionDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/exames" element={<ProtectedRoute><DashboardLayout><ExamRequests /></DashboardLayout></ProtectedRoute>} />
            <Route path="/exames/novo" element={<ProtectedRoute><DashboardLayout><NewExamRequest /></DashboardLayout></ProtectedRoute>} />
            <Route path="/exames/:id" element={<ProtectedRoute><DashboardLayout><ExamRequestDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/documentos" element={<ProtectedRoute><DashboardLayout><MedicalDocuments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/documentos/:id" element={<ProtectedRoute><DashboardLayout><MedicalDocumentDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/notes" element={<ProtectedRoute><DashboardLayout><Notes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/notes/:id" element={<ProtectedRoute><DashboardLayout><NoteDetail /></DashboardLayout></ProtectedRoute>} />
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
            <Route
              path="/gasometrus"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Gasometrus />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/atestus"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Atestus />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/protocolus"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Protocolus />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orientus"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Orientus />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mediscuss"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Mediscuss />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/admin/subscribers"
              element={
                <ProtectedRoute>
                  <AdminSubscribers />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={<AdminRoute><AdminLayout /></AdminRoute>}
            >
              <Route index element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="faturamento" element={<AdminRoute requireAdmin><AdminBilling /></AdminRoute>} />
              <Route path="indicacoes" element={<AdminRoute requireAdmin><AdminReferrals /></AdminRoute>} />
              <Route path="suporte" element={<AdminSupport />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="funil" element={<AdminFunnel />} />
              <Route path="audiencia" element={<AdminRoute requireAdmin><AdminAudience /></AdminRoute>} />
              <Route path="emails" element={<AdminRoute requireAdmin><AdminEmails /></AdminRoute>} />

              <Route path="uso-ia" element={<AdminAIUsage />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="auditoria" element={<AdminAudit />} />
              <Route path="flags" element={<AdminRoute requireAdmin><AdminFlags /></AdminRoute>} />
              <Route path="broadcast" element={<AdminRoute requireAdmin><AdminBroadcast /></AdminRoute>} />
            </Route>
            <Route
              path="/indicar"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Indicar />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/r/:code" element={<ReferralRedirect />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
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
