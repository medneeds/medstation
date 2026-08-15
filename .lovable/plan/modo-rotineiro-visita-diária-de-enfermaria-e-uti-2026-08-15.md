# Modo Rotineiro — visita diária de enfermaria e UTI

Um novo modo, paralelo aos assistentes e ao Modo Escuta, para o médico que roda leitos todos os dias: mapa de leitos, pacientes internados, evolução diária que herda a do dia anterior e o assistente "Carpe Diem" para adaptar a evolução ao dia de hoje.

## Fluxo do usuário

1. **Configurar unidades** — o médico cria unidades (ex.: "UTI Adulto", "Enfermaria B") e define a quantidade de leitos de cada uma. Leitos ficam numerados e podem ser renomeados (ex.: 12A).
2. **Mapa de leitos (dashboard)** — grade visual com um cartão por leito: nome do paciente, dias de internação, diagnóstico curto, e um selo de status da evolução de hoje (pendente / rascunho / concluída). Cabeçalho com contadores: leitos ocupados, livres, evoluções pendentes hoje.
3. **Internar paciente** — clicar em leito livre abre um formulário curto: nome, idade/data de nascimento, registro (opcional), data de admissão, diagnóstico principal, comorbidades e observações.
4. **Evoluir** — abrir um leito mostra a evolução de hoje. Se ainda não existir, ela já nasce como rascunho herdado da evolução anterior (mesmo formato e estrutura, data atualizada). Botão "Atualizar com Carpe Diem": você digita ou dita só o que mudou ("febre à noite, retirado o cateter, D5 de meropenem") e o assistente reescreve a evolução completa mantendo o formato. Botão de copiar sempre visível.
5. **Movimentar** — mover paciente entre leitos/unidades por seleção de leito de destino (com registro do movimento no histórico).
6. **Alta** — libera o leito e arquiva o paciente com todas as suas evoluções em um histórico consultável por nome, unidade e data.

## Acesso

Exclusivo para assinantes, com a mesma tela de bloqueio/checkout usada hoje no Modo Escuta.

## Navegação

Novo grupo na sidebar, "Modo Rotineiro", abaixo de Tempo Real, com dois itens:
- **Mapa de leitos** (`/rotina`)
- **Arquivo de altas** (`/rotina/arquivo`)

Configuração de unidades/leitos fica dentro do próprio mapa (botão "Gerenciar unidades").

## Detalhes técnicos

Banco (todas com RLS por `user_id`, grants para `authenticated` e `service_role`, `updated_at` por trigger):

- `ward_units` — nome, tipo (enfermaria/UTI), quantidade de leitos, ordem.
- `ward_beds` — unidade, rótulo do leito, ordem, ocupação atual.
- `ward_admissions` — paciente (nome, nascimento, registro), unidade/leito atual, data de admissão, diagnóstico principal, comorbidades, status (`active` | `discharged`), data e resumo da alta.
- `ward_rounds` — evolução: admissão, data da evolução, conteúdo, status (`draft` | `final`), origem (herdada/IA/manual). Índice único por admissão + data.
- `ward_movements` — log de leito origem → destino, com data e motivo.

Backend de IA: nova edge function `carpe-diem-round` (ou novo `agentType` em `agent-chat`, reaproveitando a infra atual de streaming e logging), com prompt do Carpe Diem — recebe a evolução anterior, os dados da admissão e as mudanças informadas; devolve a evolução do dia mantendo estrutura, seções e estilo da anterior, sem inventar dados não informados. Segue o padrão de formatação global (cabeçalhos em CAIXA ALTA, sem markdown).

Frontend:
- `src/pages/Rotina.tsx` — mapa de leitos + gerenciamento de unidades.
- `src/pages/RotinaArquivo.tsx` — altas arquivadas com busca.
- `src/components/rotina/` — `BedGrid`, `BedCard`, `AdmitPatientDialog`, `RoundEditor` (com botão Carpe Diem, copiar e ditado por voz reaproveitando o componente de áudio existente), `MoveBedDialog`, `DischargeDialog`, `UnitsManagerDialog`.
- Rotas protegidas em `App.tsx` dentro de `DashboardLayout`, envoltas no guard de assinatura.
- Visual seguindo o design atual: verde pastel, hairlines, `AssistantGlyph` para o Carpe Diem, tudo responsivo (grade de leitos vira lista em mobile).

## Entrega em etapas

1. Banco + rotas + sidebar + mapa de leitos com criação de unidades e internação.
2. Editor de evolução com herança automática do dia anterior e cópia.
3. Carpe Diem (reescrita da evolução a partir das mudanças).
4. Movimentação, alta e arquivo consultável.
