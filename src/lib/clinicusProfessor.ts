import { isProfessorStyle, type ProfessorStyle } from "../../supabase/functions/agent-chat/professor";
export { PROFESSOR_STYLES, isProfessorStyle, type ProfessorStyle } from "../../supabase/functions/agent-chat/professor";

export interface ClinicusTeachingModes {
  directAHEMode: boolean;
  reportMode: boolean;
  professorMode: boolean;
}

export function resolveClinicusTeachingModes(
  current: ClinicusTeachingModes,
  change: { anamnese?: boolean; relatorio?: boolean; professor?: boolean },
): ClinicusTeachingModes {
  const next = { ...current };
  const entries = [["anamnese", "directAHEMode"], ["relatorio", "reportMode"], ["professor", "professorMode"]] as const;
  for (const [key, field] of entries) {
    const value = change[key];
    if (typeof value !== "boolean") continue;
    if (value) {
      next.directAHEMode = false;
      next.reportMode = false;
      next.professorMode = false;
    }
    next[field] = value;
  }
  return next;
}

export function clinicusModeMetadata(modes: ClinicusTeachingModes, professorStyle: ProfessorStyle) {
  return {
    clinicus_mode: modes.professorMode ? "professor" : modes.directAHEMode ? "anamnese" : modes.reportMode ? "relatorio" : "discussao",
    ...(modes.professorMode ? { professor_style: professorStyle } : {}),
  };
}

/** Last user turn determines the restored mode, not an older professor turn. */
export function restoreClinicusTeachingMode(messages: { role: string; metadata?: unknown }[]) {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const meta = lastUser?.metadata && typeof lastUser.metadata === "object"
    ? lastUser.metadata as Record<string, unknown> : {};
  return {
    directAHEMode: meta.clinicus_mode === "anamnese",
    reportMode: meta.clinicus_mode === "relatorio",
    professorMode: meta.clinicus_mode === "professor",
    professorStyle: isProfessorStyle(meta.professor_style) ? meta.professor_style : "formal" as ProfessorStyle,
  };
}