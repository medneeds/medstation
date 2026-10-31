import marcioSerra from "@/assets/real-users/dr-marcio-serra.jpg.asset.json";
import clenilsonJunior from "@/assets/real-users/dr-clenilson-junior.jpg.asset.json";
import pedroReboucas from "@/assets/real-users/dr-pedro-reboucas.jpg.asset.json";
import luciaraDuarte from "@/assets/real-users/dra-luciara-duarte.jpg.asset.json";
import daianeCordeiro from "@/assets/real-users/dra-daiane-cordeiro.jpg.asset.json";
import alvaroFialho from "@/assets/real-users/dr-alvaro-fialho.jpg.asset.json";

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
    location: "São Luís, MA",
    practice: "Gestão hospitalar, Medicina Intensiva e Medicina de Emergência",
  },
  {
    name: "Dr. Alvaro Fialho",
    photo: alvaroFialho.url,
    location: "São Luís, MA",
    practice: "Médico Residente em Terapia Intensiva",
  },
  {
    name: "Dr. Clenilson Júnior",
    photo: clenilsonJunior.url,
    location: "São Luís, MA",
    practice: "Psiquiatria e Medicina de Emergência",
  },
  {
    name: "Dr. Pedro Rebouças",
    photo: pedroReboucas.url,
    location: "São Luís, MA",
    practice: "Medicina Intensiva e Medicina de Emergência",
  },
  {
    name: "Dra. Luciara Duarte",
    photo: luciaraDuarte.url,
    location: "São Luís, MA",
    practice: "Pediatria, Psiquiatria e Medicina de Emergência",
  },
  {
    name: "Dra. Daiane Cordeiro",
    photo: daianeCordeiro.url,
    location: "São Luís, MA",
    practice: "Home Care e Medicina de Emergência",
  },
];
