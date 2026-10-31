import marcioSerra from "@/assets/real-users/dr-marcio-serra.jpg.asset.json";
import clenilsonJunior from "@/assets/real-users/dr-clenilson-junior.jpg.asset.json";
import pedroReboucas from "@/assets/real-users/dr-pedro-reboucas.jpg.asset.json";
import luciaraDuarte from "@/assets/real-users/dra-luciara-duarte.jpg.asset.json";
import daianeCordeiro from "@/assets/real-users/dra-daiane-cordeiro.jpg.asset.json";
import joseLindoso from "@/assets/real-users/dr-jose-alexandre-lindoso.jpg.asset.json";
import marcellaQueiroz from "@/assets/real-users/dra-marcella-queiroz.jpg.asset.json";
import alvaroFialho from "@/assets/real-users/dr-alvaro-fialho.jpg.asset.json";

/** Médicos reais que usam a MedStation (uso de foto e nome autorizado pelo dono). */
export type RealUser = {
  name: string;
  photo: string;
  /** Cidade e estado — vazio até o dono informar. */
  location?: string;
  /** Onde atua. */
  practice: string;
  /** Depoimento curto (opcional). */
  quote?: string;
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
    quote:
      "MedStation pra mim é uma ferramenta que preciso no meu dia a dia, trouxe mais agilidade, praticidade e assertividade nas minhas condutas.",
  },
  {
    name: "Dra. Daiane Cordeiro",
    photo: daianeCordeiro.url,
    location: "São Luís, MA",
    practice: "Home Care e Medicina de Emergência",
  },
  {
    name: "Dr. José Alexandre Lindoso",
    photo: joseLindoso.url,
    location: "São Luís, MA",
    practice: "Medicina de Emergência",
  },
  {
    name: "Dra. Marcella Queiroz",
    photo: marcellaQueiroz.url,
    location: "São Luís, MA",
    practice: "Medicina do Trabalho e Medicina de Emergência",
    quote:
      "A MedStation tem facilitado minha rotina médica. É uma ferramenta extremamente útil, prática e inteligente, que otimiza meu tempo, auxilia na tomada de decisões e me ajuda a esclarecer dúvidas no dia a dia. Em meio à correria dos plantões, ter um recurso assim faz toda a diferença.",
  },
];
