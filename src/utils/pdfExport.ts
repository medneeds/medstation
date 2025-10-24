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
    `Gerado em: ${timestamp} | MedStation AI`,
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
    `Gerado em: ${timestamp} | MedStation AI`,
    marginLeft,
    doc.internal.pageSize.height - 10
  );

  // Save
  const filename = `conversa_${agentName
    .replace(/\s+/g, "_")
    .toLowerCase()}_${Date.now()}.pdf`;
  doc.save(filename);
}
