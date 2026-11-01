import marcioSerra from "@/assets/real-users/dr-marcio-serra.jpg.asset.json";
import clenilsonJunior from "@/assets/real-users/dr-clenilson-junior.jpg.asset.json";
import pedroReboucas from "@/assets/real-users/dr-pedro-reboucas.jpg.asset.json";
import luciaraDuarte from "@/assets/real-users/dra-luciara-duarte.jpg.asset.json";
import daianeCordeiro from "@/assets/real-users/dra-daiane-cordeiro.jpg.asset.json";
import joseLindoso from "@/assets/real-users/dr-jose-alexandre-lindoso.jpg.asset.json";
import marcellaQueiroz from "@/assets/real-users/dra-marcella-queiroz.jpg.asset.json";
import solonAlves from "@/assets/real-users/dr-solon-alves.jpeg.asset.json";
import leandroAlbuquerque from "@/assets/real-users/dr-leandro-albuquerque.jpeg.asset.json";
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
    quote:
      "Sou médico, residente de terapia intensiva e utilizo diariamente a inteligência artificial na minha prática médica. Posso dizer que essa ferramenta se tornou uma grande aliada na minha rotina, principalmente pela rapidez no acesso a informações científicas, auxílio no raciocínio clínico e otimização do tempo. Na medicina, especialmente na terapia intensiva, precisamos de agilidade e informações confiáveis para tomar decisões. A inteligência artificial não substitui o conhecimento e a experiência do médico, mas potencializa nossa capacidade de oferecer uma assistência cada vez mais segura e qualificada. Hoje, considero MedStation como ferramenta de apoio na minha rotina diária.",
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
    quote:
      "A MedStation mudou completamente a forma que eu trabalho, otimizando meu tempo de um jeito que eu nunca imaginei. Recomendo muito o Examinus para resumir exames!",
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
  {
    name: "Dr. Leandro Albuquerque",
    photo: leandroAlbuquerque.url,
    location: "São Luís, MA",
    practice: "Especialista em Clínica Médica",
    quote:
      "Utilizar o Medstation possibilitou otimizar meu processo de trabalho tanto do ponto de vista técnico como no auxílio na tomada de decisões nas condutas, além disso, consigo executar hoje minhas atividades de trabalho de forma mais ágil e acurada, melhorando consequentemente a qualidade da assistência prestada ao paciente! Pois com a otimização do tempo é possível uma avaliação mais minuciosa e criteriosa e isso interfere diretamente na melhora da qualidade da assistência prestada!",
  },
  {
    name: "Dr. Solon Alves",
    photo: solonAlves.url,
    location: "São Luís, MA",
    practice: "Médico residente em Cirurgia Geral",
  },
];
