/**
 * Conteúdo didático usado apenas na landing para explicar cada ferramenta.
 * O agrupamento por caminho vem de DISCOVERY_PATHS (fonte única do catálogo);
 * aqui ficam somente os textos de detalhe exibidos ao clicar em um item.
 */
export interface LandingToolDetail {
  /** O que a ferramenta faz. */
  what: string;
  /** O que o médico fornece. */
  input: string;
  /** O que a ferramenta devolve. */
  output: string;
  /** Exemplo curto de uso. */
  example: string;
}

export const LANDING_TOOL_DETAILS: Record<string, LandingToolDetail> = {
  examinus: {
    what: "Organiza exames e laudos em um resumo clínico objetivo.",
    input: "Texto, PDF ou foto dos resultados.",
    output: "Achados relevantes prontos para revisão e evolução.",
    example: "Transformar um bloco de laboratoriais em uma síntese em segundos.",
  },
  clinicus: {
    what: "Transforma informações clínicas em documentação estruturada.",
    input: "História, exame físico e contexto do atendimento.",
    output: "Anamnese, evolução, alta ou relatório em formato organizado.",
    example: "Registrar um caso de emergência já no padrão do prontuário.",
  },
  mediscuss: {
    what: "Estrutura discussões de caso, pareceres e pedidos de regulação.",
    input: "Resumo do caso e a dúvida ou o objetivo do contato.",
    output: "Texto argumentado, com raciocínio clínico explícito.",
    example: "Preparar um parecer para a especialidade em poucos minutos.",
  },
  atestus: {
    what: "Redige atestados e declarações no formato adequado.",
    input: "Período, contexto e CID quando aplicável.",
    output: "Documento pronto para conferência e assinatura.",
    example: "Emitir um atestado de afastamento sem reescrever o texto padrão.",
  },
  orientus: {
    what: "Traduz a conduta médica em orientações compreensíveis ao paciente.",
    input: "Diagnóstico, prescrição e cuidados definidos.",
    output: "Instruções de alta em linguagem simples e organizada.",
    example: "Entregar orientações claras de retorno e sinais de alarme.",
  },
  prescriptus: {
    what: "Apoia decisões sobre medicamentos e prescrição.",
    input: "Fármaco, indicação ou cenário clínico.",
    output: "Doses, ajustes, interações e cuidados relevantes.",
    example: "Conferir ajuste de dose em disfunção renal antes de prescrever.",
  },
  gasometrus: {
    what: "Interpreta gasometria de forma sistemática.",
    input: "Valores do exame e o contexto do paciente.",
    output: "Distúrbio principal, compensação e leitura clínica.",
    example: "Definir rapidamente o distúrbio ácido-base à beira do leito.",
  },
  scorius: {
    what: "Aplica escores e estratifica risco.",
    input: "Dados clínicos do paciente.",
    output: "Escore calculado com interpretação e implicação prática.",
    example: "Estratificar risco em dor torácica na sala de emergência.",
  },
  numerus: {
    what: "Executa cálculos médicos de beira de leito.",
    input: "Parâmetros do paciente e da terapia.",
    output: "Resultado calculado com a fórmula utilizada.",
    example: "Ajustar uma bomba de infusão sem parar o atendimento.",
  },
  codexus: {
    what: "Encontra o código CID-10 correspondente.",
    input: "Diagnóstico ou descrição clínica.",
    output: "Código adequado e alternativas próximas.",
    example: "Codificar corretamente um diagnóstico antes de fechar o registro.",
  },
  protocolus: {
    what: "Consulta protocolos e condutas de referência.",
    input: "A condição ou a situação clínica em questão.",
    output: "Passos de conduta objetivos, com base em diretrizes.",
    example: "Revisar a sequência de manejo de sepse durante o atendimento.",
  },
  legalis: {
    what: "Apoia dúvidas éticas e a proteção do registro médico.",
    input: "A situação e a preocupação envolvida.",
    output: "Leitura ética e orientação de documentação defensável.",
    example: "Registrar uma recusa de tratamento de forma adequada.",
  },
  modo_escuta: {
    what: "Acompanha a consulta por voz.",
    input: "A conversa clínica do atendimento.",
    output: "Transcrição e anamnese estruturada para revisão.",
    example: "Sair da consulta com o registro praticamente pronto.",
  },
  modo_rotineiro: {
    what: "Mantém continuidade entre visitas e evoluções.",
    input: "A atualização do dia de cada leito.",
    output: "Evolução organizada a partir do histórico do paciente.",
    example: "Evoluir a enfermaria sem reconstruir o caso todos os dias.",
  },
  consultas_salvas: {
    what: "Guarda e recupera atendimentos já registrados.",
    input: "Nada além do uso normal da plataforma.",
    output: "Histórico acessível para retomar ou reaproveitar o registro.",
    example: "Retomar uma consulta gravada para concluir a documentação.",
  },
};
