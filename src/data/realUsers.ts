import marcioSerra from "@/assets/real-users/dr-marcio-serra.jpg.asset.json";

/** Médicos reais que usam a MedStation (uso de foto e nome autorizado pelo dono). */
export type RealUser = {
  name: string;
  photo: string;
  /** Cidade e estado — vazio até o dono informar. */
  location?: string;
  /** Onde atua. */
  practice: string;
};

export const REAL_USERS: RealUser[] = [
  {
    name: "Dr. Marcio Serra",
    photo: marcioSerra.url,
    practice: "Gestão hospitalar, Medicina Intensiva e Medicina de Emergência",
  },
];
