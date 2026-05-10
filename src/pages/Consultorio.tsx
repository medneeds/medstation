import { useNavigate } from "react-router-dom";
import { ConsultationMode } from "@/components/ConsultationMode";
import { PremiumConsultorioGuard } from "@/components/PremiumConsultorioGuard";

export default function Consultorio() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumConsultorioGuard>
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <ConsultationMode
          caseId={caseId}
          onExit={() => navigate("/dashboard")}
        />
      </div>
    </PremiumConsultorioGuard>
  );
}
