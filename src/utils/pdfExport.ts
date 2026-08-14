import jsPDF from "jspdf";

interface CaseData {
  title: string;
  patient_name: string;
  chief_complaint?: string;
  notes?: string;
  status: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface EvidenceData {
  title: string;
  type: string;
  content?: string;
  origin?: string;
  created_at: string;
}

export function exportCaseToPDF(
  caseData: CaseData,
  evidences?: EvidenceData[]
) {
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 7;
  const marginLeft = 20;
  const pageWidth = doc.internal.pageSize.width;
  const maxWidth = pageWidth - 40;

  // Helper function to add text with word wrap
  const addText = (
    text: string,
    fontSize: number = 11,
    isBold: boolean = false
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, marginLeft, yPos);
      yPos += lineHeight;
    });
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE CASO CLÍNICO", marginLeft, yPos);
  yPos += lineHeight * 2;

  // Case title
  addText(`Caso: ${caseData.title}`, 14, true);
  yPos += lineHeight;

  // Patient
  addText(`Paciente: ${caseData.patient_name}`, 12);
  yPos += lineHeight / 2;

  // Status
  addText(`Status: ${caseData.status}`, 12);
  yPos += lineHeight / 2;

  // Date
  addText(
    `Data: ${new Date(caseData.created_at).toLocaleDateString("pt-BR")}`,
    12
  );
  yPos += lineHeight * 1.5;

  // Tags
  if (caseData.tags && caseData.tags.length > 0) {
    addText(`Tags: ${caseData.tags.join(", ")}`, 11);
    yPos += lineHeight;
  }

  // Chief complaint
  if (caseData.chief_complaint) {
    yPos += lineHeight / 2;
    addText("QUEIXA PRINCIPAL", 12, true);
    addText(caseData.chief_complaint);
    yPos += lineHeight;
  }

  // Notes
  if (caseData.notes) {
    yPos += lineHeight / 2;
    addText("NOTAS", 12, true);
    addText(caseData.notes);
    yPos += lineHeight;
  }

  // Evidences
  if (evidences && evidences.length > 0) {
    yPos += lineHeight;
    addText("EVIDÊNCIAS", 14, true);
    yPos += lineHeight / 2;

    evidences.forEach((evidence, index) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      addText(`${index + 1}. ${evidence.title}`, 11, true);
      addText(`   Tipo: ${evidence.type}`, 10);

      if (evidence.origin) {
        addText(`   Origem: ${evidence.origin}`, 10);
      }

      if (evidence.content) {
        const preview =
          evidence.content.length > 200
            ? evidence.content.substring(0, 200) + "..."
            : evidence.content;
        addText(`   ${preview}`, 10);
      }

      yPos += lineHeight;
    });
  }

  // Footer
  const timestamp = new Date().toLocaleString("pt-BR");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Gerado em: ${timestamp} | MedStation`,
    marginLeft,
    doc.internal.pageSize.height - 10
  );

  // Save
  const filename = `caso_${caseData.title
    .replace(/\s+/g, "_")
    .toLowerCase()}_${Date.now()}.pdf`;
  doc.save(filename);
}

export function exportAgentConversationToPDF(
  agentName: string,
  messages: Array<{ role: string; content: string; timestamp: Date }>
) {
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 7;
  const marginLeft = 20;
  const pageWidth = doc.internal.pageSize.width;
  const maxWidth = pageWidth - 40;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Conversa com ${agentName}`, marginLeft, yPos);
  yPos += lineHeight * 2;

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Data: ${new Date().toLocaleString("pt-BR")}`,
    marginLeft,
    yPos
  );
  yPos += lineHeight * 2;

  // Messages
  messages.forEach((msg) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    // Role label
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const roleLabel = msg.role === "user" ? "Você" : agentName;
    doc.text(
      `${roleLabel} - ${msg.timestamp.toLocaleTimeString("pt-BR")}:`,
      marginLeft,
      yPos
    );
    yPos += lineHeight;

    // Message content
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(msg.content, maxWidth);
    lines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, marginLeft, yPos);
      yPos += lineHeight;
    });

    yPos += lineHeight;
  });

  // Footer
  const timestamp = new Date().toLocaleString("pt-BR");
  doc.setFontSize(8);
  doc.text(
    `Gerado em: ${timestamp} | MedStation`,
    marginLeft,
    doc.internal.pageSize.height - 10
  );

  // Save
  const filename = `conversa_${agentName
    .replace(/\s+/g, "_")
    .toLowerCase()}_${Date.now()}.pdf`;
  doc.save(filename);
}

interface PrescriptionData {
  prescription_number: string;
  patient_name: string;
  patient_cpf: string;
  patient_dob?: string;
  doctor_name: string;
  doctor_crm: string;
  doctor_crm_state: string;
  doctor_specialty?: string;
  diagnosis: string;
  cid_code?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  validity_days: number;
  observations?: string;
  created_at: string;
}

export function exportPrescriptionToPDF(data: PrescriptionData) {
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 7;
  const marginLeft = 20;
  const pageWidth = doc.internal.pageSize.width;
  const maxWidth = pageWidth - 40;

  const addText = (
    text: string,
    fontSize: number = 11,
    isBold: boolean = false
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, marginLeft, yPos);
      yPos += lineHeight;
    });
  };

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PRESCRIÇÃO MÉDICA", pageWidth / 2, yPos, { align: "center" });
  yPos += lineHeight * 2;

  // Prescription number
  doc.setFontSize(12);
  doc.text(data.prescription_number, pageWidth / 2, yPos, { align: "center" });
  yPos += lineHeight * 2;

  // Doctor info
  addText("DADOS DO PRESCRITOR", 12, true);
  addText(`Nome: ${data.doctor_name}`);
  addText(`CRM: ${data.doctor_crm} - ${data.doctor_crm_state}`);
  if (data.doctor_specialty) {
    addText(`Especialidade: ${data.doctor_specialty}`);
  }
  yPos += lineHeight;

  // Patient info
  addText("DADOS DO PACIENTE", 12, true);
  addText(`Nome: ${data.patient_name}`);
  addText(`CPF: ${data.patient_cpf}`);
  if (data.patient_dob) {
    addText(`Data de Nascimento: ${new Date(data.patient_dob).toLocaleDateString("pt-BR")}`);
  }
  yPos += lineHeight;

  // Diagnosis
  addText("DIAGNÓSTICO", 12, true);
  addText(data.diagnosis);
  if (data.cid_code) {
    addText(`CID: ${data.cid_code}`);
  }
  yPos += lineHeight;

  // Medications
  addText("MEDICAMENTOS PRESCRITOS", 12, true);
  data.medications.forEach((med, index) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    addText(`${index + 1}. ${med.name}`, 11, true);
    addText(`   Dosagem: ${med.dosage}`);
    addText(`   Frequência: ${med.frequency}`);
    addText(`   Duração: ${med.duration}`);
    if (med.instructions) {
      addText(`   Instruções: ${med.instructions}`);
    }
    yPos += lineHeight / 2;
  });
  yPos += lineHeight;

  // Observations
  if (data.observations) {
    addText("OBSERVAÇÕES", 12, true);
    addText(data.observations);
    yPos += lineHeight;
  }

  // Validity
  addText(`Validade: ${data.validity_days} dias`);
  addText(`Data de Emissão: ${new Date(data.created_at).toLocaleDateString("pt-BR")}`);

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerY = doc.internal.pageSize.height - 20;
  doc.text("_".repeat(80), marginLeft, footerY);
  doc.text(`Assinatura Digital - ${data.doctor_name}`, marginLeft, footerY + 5);
  doc.text(`CRM: ${data.doctor_crm} - ${data.doctor_crm_state}`, marginLeft, footerY + 10);
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")} | MedStation`,
    pageWidth / 2,
    footerY + 15,
    { align: "center" }
  );

  const filename = `prescricao_${data.prescription_number.replace(/\//g, "-")}_${Date.now()}.pdf`;
  doc.save(filename);
}

interface ExamRequestData {
  request_number: string;
  patient_name: string;
  patient_cpf: string;
  patient_dob?: string;
  doctor_name: string;
  doctor_crm: string;
  doctor_crm_state: string;
  doctor_specialty?: string;
  clinical_indication: string;
  cid_code?: string;
  priority: string;
  exams: Array<{
    name: string;
    type: string;
    instructions?: string;
  }>;
  observations?: string;
  requested_date: string;
}

export function exportExamRequestToPDF(data: ExamRequestData) {
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 7;
  const marginLeft = 20;
  const pageWidth = doc.internal.pageSize.width;
  const maxWidth = pageWidth - 40;

  const addText = (
    text: string,
    fontSize: number = 11,
    isBold: boolean = false
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, marginLeft, yPos);
      yPos += lineHeight;
    });
  };

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("SOLICITAÇÃO DE EXAMES", pageWidth / 2, yPos, { align: "center" });
  yPos += lineHeight * 2;

  // Request number
  doc.setFontSize(12);
  doc.text(data.request_number, pageWidth / 2, yPos, { align: "center" });
  yPos += lineHeight * 2;

  // Doctor info
  addText("DADOS DO MÉDICO SOLICITANTE", 12, true);
  addText(`Nome: ${data.doctor_name}`);
  addText(`CRM: ${data.doctor_crm} - ${data.doctor_crm_state}`);
  if (data.doctor_specialty) {
    addText(`Especialidade: ${data.doctor_specialty}`);
  }
  yPos += lineHeight;

  // Patient info
  addText("DADOS DO PACIENTE", 12, true);
  addText(`Nome: ${data.patient_name}`);
  addText(`CPF: ${data.patient_cpf}`);
  if (data.patient_dob) {
    addText(`Data de Nascimento: ${new Date(data.patient_dob).toLocaleDateString("pt-BR")}`);
  }
  yPos += lineHeight;

  // Clinical indication
  addText("INDICAÇÃO CLÍNICA", 12, true);
  addText(data.clinical_indication);
  if (data.cid_code) {
    addText(`CID: ${data.cid_code}`);
  }
  yPos += lineHeight;

  // Priority
  const priorityLabels: Record<string, string> = {
    routine: "Rotina",
    urgent: "Urgente",
    emergency: "Emergência"
  };
  addText(`Prioridade: ${priorityLabels[data.priority] || data.priority}`, 11, true);
  yPos += lineHeight;

  // Exams
  addText("EXAMES SOLICITADOS", 12, true);
  data.exams.forEach((exam, index) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    addText(`${index + 1}. ${exam.name}`, 11, true);
    addText(`   Tipo: ${exam.type === "laboratory" ? "Laboratório" : "Imagem"}`);
    if (exam.instructions) {
      addText(`   Instruções: ${exam.instructions}`);
    }
    yPos += lineHeight / 2;
  });
  yPos += lineHeight;

  // Observations
  if (data.observations) {
    addText("OBSERVAÇÕES", 12, true);
    addText(data.observations);
    yPos += lineHeight;
  }

  // Request date
  addText(`Data de Solicitação: ${new Date(data.requested_date).toLocaleDateString("pt-BR")}`);

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerY = doc.internal.pageSize.height - 20;
  doc.text("_".repeat(80), marginLeft, footerY);
  doc.text(`Assinatura Digital - ${data.doctor_name}`, marginLeft, footerY + 5);
  doc.text(`CRM: ${data.doctor_crm} - ${data.doctor_crm_state}`, marginLeft, footerY + 10);
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")} | MedStation`,
    pageWidth / 2,
    footerY + 15,
    { align: "center" }
  );

  const filename = `solicitacao_exames_${data.request_number.replace(/\//g, "-")}_${Date.now()}.pdf`;
  doc.save(filename);
}
