# Auditoria comercial — agregados Stripe sem PII

Somente leitura. Nada foi alterado em código, banco ou Stripe. Sem e-mails, nomes ou IDs de clientes. Referência: 27/08/2026 21:54 UTC. Janelas: 30 dias (desde 28/07) e 7 dias (desde 20/08). Sigma não está habilitado na conta, então os números foram agregados localmente a partir das listagens da API.

## 1. Checkout sessions criadas

Últimos 30 dias — 14 sessões:
- complete + paid: 3
- expired + unpaid: 11
- open: 0

Últimos 7 dias — 1 sessão:
- complete + paid: 1
- expired + unpaid: 0
- open: 0

Taxa de conversão de sessão em 30 dias: 3/14 = 21,4%.

Valores das sessões em 30 dias: 7 sessões a R$ 29,90, 6 a R$ 49,90 e 1 a R$ 499,90 (anual) — ou seja, ainda circularam links do preço legado de R$ 29,90 durante boa parte do período.

## 2. Identidades únicas que iniciaram checkout

Das 14 sessões de 30 dias, apenas 4 tinham um customer Stripe vinculado (4 identidades distintas). As outras 10 são sessões de convidado, criadas com `customer_creation: always`, sem customer atribuído enquanto não há pagamento. Como e-mail e nome vêm redigidos, não é possível deduplicar convidados sem expor PII.

Leitura honesta: entre 4 e 14 identidades únicas iniciaram checkout em 30 dias; o dado disponível não permite fechar esse intervalo sem acessar dados pessoais.

## 3. Novas subscriptions criadas no período (status atual)

- 30 dias: 3 criadas — todas `active` hoje.
- 7 dias: 1 criada — `active`.

Consistente com as 3 sessões complete+paid de 30 dias.

## 4. Cancelamentos e cancel_at_period_end

- Cancelamentos no período: 3 em 30 dias, 1 em 7 dias.
- Assinaturas ativas hoje com `cancel_at_period_end = true`: **0**.
- Base total de assinaturas (19): 9 `active`, 10 `canceled`, 0 `trialing`, 0 `past_due`.
- Motivo dos 10 cancelamentos históricos: 9 por `payment_failed` (falha de cobrança, não pedido do cliente) e 1 por `cancellation_requested`. Esse é o dado comercial mais relevante do lote: o churn atual é predominantemente involuntário, de cartão, não de insatisfação declarada.

Saldo de 30 dias: +3 novas, −3 canceladas → base estável em 9.

## 5. MRR bruto aproximado das assinaturas ativas

Todas as 9 ativas são mensais (nenhuma anual ativa):

| Preço | Coorte | Assinaturas | MRR |
|---|---|---|---|
| R$ 49,90/mês (plano unificado atual) | atual | 1 | R$ 49,90 |
| R$ 49,90/mês (bundle Pro legado) | legado | 2 | R$ 99,80 |
| R$ 29,90/mês (Assistentes legado) | legado | 6 | R$ 179,40 |
| **Total** | | **9** | **R$ 329,10** |

MRR legado: R$ 279,20 (85%). MRR na precificação atual: R$ 49,90 (15%). Ticket médio atual: R$ 36,57.

## 6. Sobre "9 ativas" e a contagem operacional de 8

**Não.** As 9 assinaturas `active` **não** incluem nenhuma marcada para cancelar — `cancel_at_period_end` é `false` em todas as 9. A única assinatura da base com essa marcação já está `canceled` desde fevereiro de 2026 e não conta como ativa.

Portanto, a contagem operacional correta de assinantes que pretendem continuar é **9, não 8**. Se em algum relatório anterior apareceu "1 com cancel_at_period_end", esse número veio de uma contagem sobre as 19 assinaturas (incluindo canceladas), não sobre as ativas — é um artefato de filtro, não uma intenção de cancelamento pendente.

Ressalva: 9 assinaturas ativas ≠ necessariamente 9 pessoas distintas. Como a plataforma localiza o cliente por e-mail com `limit: 1` e não guarda `stripe_customer_id` no banco, duplicidade de customer com o mesmo e-mail não é detectável aqui sem expor PII.

## Limitações do levantamento

- Sigma indisponível na conta (`acct_…` sem plano), então não há queries SQL históricas nem coortes.
- Todos os campos de identificação vêm redigidos pela conexão, o que impede deduplicar convidados de checkout.
- MRR é bruto: não desconta cupons ativos, impostos, reembolsos ou falhas de cobrança futuras.
- O nome de exibição da conta Stripe ainda aparece como "MEDNEEDS" nas telas de checkout — não é um agregado, mas é uma inconsistência de marca visível ao cliente pagante.
