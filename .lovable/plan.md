# LP3 — landing clean, formulário completo e novo posicionamento de preço

## O que aprendi das referências

| Site | Preço | Freemium | Formulário | Estética |
|---|---|---|---|---|
| Voa Health | premium (não exibe) | 30 dias grátis | nome + e-mail + telefone + CRM | pouquíssimo texto, 1 ideia por bloco, muita imagem |
| OkMed | R$ 189/mês · R$ 149/mês anual | 14 dias, sem cartão | cadastro no app | 2 planos lado a lado, FAQ, prova social forte |
| Amigo One | R$ 69,90 e R$ 199,90 | freemium com limites duros | formulário na LP | números grandes de autoridade |
| iClinic | sob consulta | teste | formulário longo | institucional |

Nenhum concorrente cobra menos de R$ 69,90. A MedStation a R$ 29,90 está posicionada como "app barato", o que atrapalha a percepção de valor clínico.

## Diagnóstico da LP atual

- Muito branco puro e muito texto — a mentoria está certa: falta hierarquia e respiro.
- Captação só por e-mail dentro do fluxo de signup; sem nome e telefone não dá para fazer follow-up comercial.
- "Examinus grátis para sempre" ancora a marca em "grátis" e canibaliza a assinatura.

## LP3 — estrutura (rota `/lp3`, 6 blocos, tema claro com fundo em camadas)

1. **Hero** — headline única e curta, subtítulo de 1 linha, formulário curto à direita (nome, telefone, e-mail, CRM opcional), selo "7 dias grátis · sem cartão". Fundo verde-claro com gradiente suave (não branco puro).
2. **Prova de autoridade** — faixa com 3 números (horas recuperadas, assistentes, documentos gerados) + logos/CRMs.
3. **Como funciona** — 3 passos com o `ClinicalFlowDemo` já existente, texto reduzido ao mínimo.
4. **Assistentes** — grade compacta com os 12, sem parágrafos, só nome + 1 linha.
5. **Prova social** — depoimentos Dr. Leandro Albuquerque e Dra. Luciara Duarte em cartões grandes.
6. **Preço + FAQ curto + CTA final** — mensal e anual lado a lado, ancoragem contra o custo de digitar.

Cada bloco: 1 título, no máximo 2 linhas de apoio, 1 CTA. Sem seções de comparativo, sem manifesto.

## Formulário de captação (o ponto mais importante)

Novo componente `LeadForm` com **nome completo, telefone (máscara BR) e e-mail** obrigatórios, CRM/UF opcional.

- Grava o lead numa tabela `leads` no backend (com origem/UTM) **antes** de qualquer redirecionamento, para nada se perder se o cadastro não for concluído.
- Em seguida cria a conta e segue para `/confirmar-email`.
- O telefone entra também no perfil do usuário para follow-up.
- Aparece no hero e no CTA final, sempre inline (sem pop-up).

## Nova estratégia de preço (proposta)

| Plano | Hoje | Proposto |
|---|---|---|
| Assistentes | R$ 29,90/mês | **R$ 89,90/mês** (de R$ 149,90) |
| Consultório | R$ 29,90/mês | **R$ 129,90/mês** |
| Pro 2 (tudo) | R$ 49,90/mês | **R$ 179,90/mês** · anual 12x R$ 149,90 |

Exibição na LP3 com ancoragem: "menos de R$ 6 por plantão" e comparação com 1 consulta particular. A LP3 mostra os novos preços; a troca real no Stripe entra depois que você aprovar os valores (preciso criar os novos preços e manter os assinantes atuais no valor antigo — grandfathering).

## Novo modelo do Examinus (fim do "grátis para sempre")

- **Teste de 7 dias com acesso total** aos 12 assistentes + Modo Consultório, sem cartão.
- Terminado o teste: conta gratuita mantém **Examinus com 10 consultas/mês** (não ilimitado) e os demais assistentes bloqueados com prévia.
- A demo pública da LP continua sem cadastro, mas com 3 mensagens.

Isso troca "grátis para sempre" por escassez real e cria motivo para assinar.

## Detalhes técnicos

- `src/pages/Lp3.tsx` + rota `/lp3` (reaproveita `ClinicalFlowDemo`, `QuickCheckout`, `ConciergeFab`).
- `src/components/LeadForm.tsx` + tabela `leads` (RLS: insert anônimo, leitura só admin) e `GRANT` correspondente.
- Tokens de superfície novos em `index.css` (fundo levemente esverdeado, cartões com borda suave) usados só pela LP3, sem afetar `/` e `/lp2`.
- Preços centralizados em `src/lib/subscription-tiers.ts`; a LP3 lê de lá.
- `/` e `/lp2` ficam intactas para comparação de conversão.

## Confirme antes de eu implementar

1. Os valores propostos (R$ 89,90 / R$ 129,90 / R$ 179,90) fazem sentido ou você quer outra faixa?
2. Trial de 7 dias com tudo liberado e depois Examinus limitado a 10/mês — ok?
3. Telefone obrigatório mesmo que reduza um pouco a conversão do formulário — ok?
