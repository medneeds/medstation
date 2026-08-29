import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnalyticsTracker } from "./components/AnalyticsTracker";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";

// Landing "/" permanece eager: é o primeiro paint público.
import Lp3 from "./pages/Lp3";

// Tudo que não é a landing entra por code splitting (React.lazy),
// para manter o bundle inicial da "/" mínimo.
const DashboardLayout = lazy(() => import("./components/DashboardLayout").then(m => ({ default: m.DashboardLayout })));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute").then(m => ({ default: m.ProtectedRoute })));
const AdminRoute = lazy(() => import("./components/AdminRoute").then(m => ({ default: m.AdminRoute })));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const Cases = lazy(() => import("./pages/Cases"));
const CaseDetail = lazy(() => import("./pages/CaseDetail"));
const Notes = lazy(() => import("./pages/Notes"));
const NoteDetail = lazy(() => import("./pages/NoteDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const ConfirmarEmail = lazy(() => import("./pages/ConfirmarEmail"));
const Comecar = lazy(() => import("./pages/Comecar"));
const Tour = lazy(() => import("./pages/Tour"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Obrigado = lazy(() => import("./pages/Obrigado"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const WelcomeTour = lazy(() => import("./pages/WelcomeTour"));
const Clinicus = lazy(() => import("./pages/Clinicus"));
const Consultorio = lazy(() => import("./pages/Consultorio"));
const ConsultorioHistorico = lazy(() => import("./pages/ConsultorioHistorico"));
const Rotina = lazy(() => import("./pages/Rotina"));
const RotinaArquivo = lazy(() => import("./pages/RotinaArquivo"));

const Examinus = lazy(() => import("./pages/Examinus"));
const Scorius = lazy(() => import("./pages/Scorius"));
const Numerus = lazy(() => import("./pages/Numerus"));
const Prescriptus = lazy(() => import("@/pages/Prescriptus"));
const Codexus = lazy(() => import("@/pages/Codexus"));
const Gasometrus = lazy(() => import("@/pages/Gasometrus"));
const Atestus = lazy(() => import("@/pages/Atestus"));
const Protocolus = lazy(() => import("@/pages/Protocolus"));
const Orientus = lazy(() => import("@/pages/Orientus"));
const Mediscuss = lazy(() => import("@/pages/Mediscuss"));
const Legalis = lazy(() => import("@/pages/Legalis"));

const Prescriptions = lazy(() => import("@/pages/Prescriptions"));
const NewPrescription = lazy(() => import("@/pages/NewPrescription"));
const PrescriptionDetail = lazy(() => import("@/pages/PrescriptionDetail"));
const ExamRequests = lazy(() => import("@/pages/ExamRequests"));
const NewExamRequest = lazy(() => import("@/pages/NewExamRequest"));
const ExamRequestDetail = lazy(() => import("@/pages/ExamRequestDetail"));
const MedicalDocuments = lazy(() => import("@/pages/MedicalDocuments"));
const MedicalDocumentDetail = lazy(() => import("@/pages/MedicalDocumentDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminSubscribers = lazy(() => import("./pages/AdminSubscribers"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminAIUsage = lazy(() => import("./pages/admin/AdminAIUsage"));
const AdminFeedback = lazy(() => import("./pages/admin/AdminFeedback"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminFlags = lazy(() => import("./pages/admin/AdminFlags"));
const AdminBroadcast = lazy(() => import("./pages/admin/AdminBroadcast"));
const AdminReferrals = lazy(() => import("./pages/admin/AdminReferrals"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminFunnel = lazy(() => import("./pages/admin/AdminFunnel"));
const AdminAudience = lazy(() => import("./pages/admin/AdminAudience"));
const AdminEmails = lazy(() => import("./pages/admin/AdminEmails"));
const Indicar = lazy(() => import("./pages/Indicar"));
const ReferralRedirect = lazy(() => import("./pages/ReferralRedirect"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdVideo = lazy(() => import("./pages/AdVideo"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SubscriptionProvider>
        <ProfileProvider>
          <OnboardingProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <AnalyticsTracker />
          <Routes>

            <Route path="/" element={<Lp3 />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/tour" element={<Navigate to="/" replace />} />
            <Route path="/comecar" element={<Comecar />} />
            <Route path="/lp2" element={<Navigate to="/" replace />} />
            <Route path="/lp3" element={<Navigate to="/" replace />} />
            <Route path="/home" element={<Navigate to="/" replace />} />

            <Route path="/auth" element={<Auth />} />
            <Route path="/confirmar-email" element={<ConfirmarEmail />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/consultorio-landing" element={<Navigate to="/" replace />} />
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
            <Route
              path="/consultorio/historico"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ConsultorioHistorico />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rotina"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Rotina />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rotina/arquivo"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <RotinaArquivo />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route path="/obrigado" element={<Obrigado />} />
            <Route path="/welcome" element={<Obrigado />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
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
              path="/legalis"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Legalis />
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
            <Route path="/ad-video" element={<AdVideo />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </OnboardingProvider>
        </ProfileProvider>

      </SubscriptionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
