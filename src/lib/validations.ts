import { z } from "zod";

// Patient validation
export const patientSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (formato: 000.000.000-00)")
    .optional()
    .or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  phone: z.string()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido (formato: (00) 00000-0000)")
    .optional()
    .or(z.literal("")),
  email: z.string()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .max(2000, "Notas devem ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
});

// Case validation
export const caseSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Título é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  patient_id: z.string().uuid("ID de paciente inválido"),
  chief_complaint: z.string()
    .max(500, "Queixa principal deve ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .max(5000, "Notas devem ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "closed", "archived"]).default("active"),
  tags: z.array(z.string().max(50, "Tag deve ter no máximo 50 caracteres")).default([]),
});

// Evidence validation
export const evidenceSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Título é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  case_id: z.string().uuid("ID de caso inválido"),
  type: z.enum(["audio", "image", "pdf", "text"]),
  tags: z.array(z.string().max(50, "Tag deve ter no máximo 50 caracteres")).default([]),
  notes: z.string()
    .max(2000, "Notas devem ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
});

// Auth validation
export const signUpSchema = z.object({
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(100, "Senha deve ter no máximo 100 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  fullName: z.string()
    .trim()
    .min(1, "Nome completo é obrigatório")
    .max(100, "Nome completo deve ter no máximo 100 caracteres"),
});

export const signInSchema = z.object({
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  password: z.string()
    .min(1, "Senha é obrigatória")
    .max(100, "Senha deve ter no máximo 100 caracteres"),
});

// Edge function validations
export const agentChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().max(10000, "Mensagem muito longa"),
  })).min(1, "Pelo menos uma mensagem é necessária"),
  agentType: z.enum(["clinicus", "examinus", "scorius", "numerus", "prescriptus", "codexus"]),
  caseId: z.string().uuid("ID de caso inválido").optional(),
});

export const processDocumentRequestSchema = z.object({
  evidenceId: z.string().uuid("ID de evidência inválido"),
});

export const transcribeAudioRequestSchema = z.object({
  evidenceId: z.string().uuid("ID de evidência inválido"),
});
