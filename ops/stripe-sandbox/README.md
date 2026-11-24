# Stripe Sandbox: mapa do fluxo e o que falta

> Escrito pelo Claude em 24/11/2026, só a partir do código. **Nenhum checkout
> foi validado.** O Stripe não foi chamado (nem em modo real, nem em teste) e
> nenhuma função foi publicada.

## Fluxo

```
tela (Pricing, Black, QuickCheckout...)
  ├─ logado:    create-checkout  ─┐
  └─ visitante: guest-checkout   ─┴─> Stripe Checkout (página do Stripe)
                                         │
        volta para <origem>/obrigado?session_id=...      Stripe envia eventos
                     │                                          │
              complete-checkout                           stripe-webhook
        (confere a sessão, cria/acha a conta,      (confere assinatura, grava e
         devolve link de acesso)                    libera ou retira o acesso)
                     │                                          │
                     └──────────> check-subscription <──────────┘
                              (o app pergunta: tem acesso?)
```

## Funções e variáveis mínimas

| Função | JWT | Variáveis | Tabelas | Chamadas ao Stripe |
|---|---|---|---|---|
| `create-checkout` | sim | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `stripe_one_time_purchases`, `referrals`, `referral_settings` | `customers.list`, `subscriptions.list`, `checkout.sessions.create` |
| `guest-checkout` | não | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `stripe_one_time_purchases` | idem |
| `complete-checkout` | não | idem | contas (Auth admin) | `checkout.sessions.retrieve`, `subscriptions.retrieve/update` |
| `stripe-webhook` | não | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (+ opcionais abaixo) | `stripe_webhook_events`, `stripe_subscriptions`, `stripe_one_time_purchases`, `user_access`, `profiles`, `email_send_log` | `webhooks.constructEventAsync`, `subscriptions.*`, `customers.*`, `paymentIntents.retrieve` |
| `check-subscription` | sim | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `user_access`, `stripe_subscriptions`, `stripe_one_time_purchases`, `courtesy_access`, `commercial_policy`, `referrals` | `customers.list`, `subscriptions.list` |
| `customer-portal` | sim | idem | `stripe_subscriptions` | `billingPortal.sessions.create` |

`SUPABASE_*` são fornecidas pela plataforma. As do Stripe teriam de ser as de
**teste** (`sk_test_…` e o `whsec_…` do endpoint de teste), gravadas nos
Secrets da homologação pelo Artur.

Opcionais do webhook, que devem ficar **ausentes** na homologação:
`LOVABLE_API_KEY` e `LOVABLE_SEND_URL` (e-mails) e `META_CAPI_ACCESS_TOKEN`
(evento de compra para a Meta; sem o token a função não envia nada).

## Retorno

- `create-checkout` exige o cabeçalho `Origin` e monta
  `<origem>/obrigado?success=true&plan=…&session_id={CHECKOUT_SESSION_ID}`.
- `guest-checkout`, `complete-checkout` e `customer-portal` usam a origem da
  requisição e, se faltar, caem em `https://medstation-ai.com.br`.

Com o app servido de um preview, o retorno volta para o preview. Uma chamada
sem `Origin` (ex.: `curl`) mandaria o comprador para o site de produção.

## Validação do webhook

`stripe-webhook` recusa sem `STRIPE_WEBHOOK_SECRET`/`STRIPE_SECRET_KEY` (500),
sem cabeçalho `stripe-signature` (400) e com assinatura inválida (400). Usa
`stripe.webhooks.constructEventAsync` (stripe 18.5.0). Cada evento é
registrado em `stripe_webhook_events` antes de ser processado; evento repetido
responde `{"received": true, "duplicate": true}`.

Eventos tratados: `customer.subscription.created/updated/deleted`,
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`,
`invoice.payment_failed`, `invoice.payment_action_required`, `invoice.paid`,
`invoice.payment_succeeded`.

## Direito de acesso

O webhook grava a assinatura em `stripe_subscriptions`, a compra avulsa em
`stripe_one_time_purchases` e o prazo em `user_access.paid_access_until`.
`check-subscription` junta isso com cortesia, período de teste e consulta ao
Stripe e devolve `access_active`, `subscribed`, `trial`, `product_ids` etc.,
que o `SubscriptionContext` usa para liberar ou bloquear as telas.

## O que impede um teste em sandbox hoje

1. **Não há credencial de teste.** A única conta conectada é a de modo real.
2. **Nenhuma das seis funções está publicada** na homologação.
3. **IDs do modo real fixos no código.** Num sandbox eles não existem:
   - produtos `prod_V4jGKeBPH2hGYg` (plano único) e `prod_VXxBDmIzduPvt1`
     (Black), em `_shared/pricing-schedule.ts` e `_shared/one-time-purchase.ts`;
   - preços `price_1U4Zo7ACiwQRloW4cJIn0jYn` e `price_1U4ZoTACiwQRloW4f30FmEPb`,
     em `create-checkout` e `guest-checkout`;
   - cupom padrão de indicação `XzP9db0s`, em `create-checkout`.

   Produtos e cupons podem ser criados no sandbox com o mesmo ID; preços não
   (o Stripe gera o ID). O mensal na fase de lançamento usa o preço fixo, então
   precisa de ajuste no código (ID por variável) ou de testar só os planos que
   usam `price_data`.
4. **As 18 tabelas sem privilégio.** `stripe-webhook` lê `profiles` com
   `service_role` (nome para o e-mail de falha de pagamento), e
   `check-subscription` lê `courtesy_access` e `referrals`; hoje `service_role`
   não tem acesso a nenhuma das três (fase 2 do plano de `GRANT`).
5. **Efeitos externos reais dentro do webhook**, que precisam ficar desligados
   antes de qualquer evento de teste:
   - **Bônus Arsenal Med:** em compra anual elegível, o webhook chama
     `https://arsenalmed.com.br/api/public/medstation-bonus`, e o endereço de
     conferência fixo no código é uma função do Supabase de **produção**
     (`_shared/arsenal-bonus.ts`). Não há variável para desligar; hoje só não
     dispara porque a função não está publicada.
   - **E-mails** (ativação de compra, falha de pagamento, bônus): saem pela
     API de envio da Lovable se `LOVABLE_API_KEY` existir.
   - **Meta (API de Conversões):** só com `META_CAPI_ACCESS_TOKEN` e
     consentimento; ausente, não envia.

## Comportamento por ambiente (PR separado, só código e testes)

`supabase/functions/_shared/deploy-environment.ts` decide tudo por uma regra:
é produção se `SUPABASE_URL` for exatamente o do projeto `rwiovxyftfbkvzbepfqi`.

| | Produção | Fora de produção (homologação, local, desconhecido) |
|---|---|---|
| Preços e cupom | os de sempre, fixos; variáveis são ignoradas | `STRIPE_PRICE_MONTHLY` obrigatório e diferente dos IDs do modo real; `STRIPE_PRICE_YEARLY` e `STRIPE_REFERRAL_COUPON` opcionais; sem isso, `503 ENVIRONMENT_NOT_CONFIGURED` antes de chamar o Stripe |
| Chave do Stripe | a que estiver configurada | só `sk_test_…`/`rk_test_…`; outra é recusada |
| Retorno do checkout e do portal | cabeçalho `Origin` ou o site | `Origin` se não for o site de produção; senão `APP_BASE_URL`; senão recusa |
| Links do webhook | site de produção | `APP_BASE_URL`; sem ela, o webhook responde 500 |
| Bônus Arsenal Med | avisa o site real | desligado: sem requisição, sem alerta, sem e-mail. Só liga com `ARSENAL_BONUS_ENABLED=true` e um `ARSENAL_BONUS_ENDPOINT` https que não seja o site real |

Não foi alterado: os dois IDs de produto (`prod_…`), que podem ser criados no
sandbox com o mesmo ID; `check-subscription` e `_shared/access-control.ts`;
`_shared/meta-capi.ts` (já não envia nada sem o token).

Ponto de revisão antes de qualquer merge: a regra supõe que, em produção, a
variável `SUPABASE_URL` da função é `https://rwiovxyftfbkvzbepfqi.supabase.co`,
que é o padrão da plataforma. Não consultei a produção para confirmar. Se lá
for diferente, o checkout de produção responderia 503.

Testes: `src/lib/__tests__/deploy-environment.test.ts`.

## Mínimo para um checkout de teste, em ordem

1. Artur cria ou indica um **Sandbox** do Stripe e fornece `sk_test_…`.
2. No sandbox: produtos com os dois IDs acima; endpoint de webhook de teste
   apontando para a função da homologação; anotar o `whsec_…`.
3. Revisar o PR separado de código (seção "Comportamento por ambiente") e
   gravar na homologação `STRIPE_PRICE_MONTHLY` e `APP_BASE_URL`.
4. Fase 2 do plano de `GRANT` aplicada.
5. Publicar na homologação `guest-checkout` ou `create-checkout`,
   `complete-checkout`, `stripe-webhook` e `check-subscription`, com
   `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` de teste e **sem**
   `LOVABLE_API_KEY` e `META_CAPI_ACCESS_TOKEN`.
6. Rodar o checkout com cartão de teste a partir do app local ou do preview e
   conferir: retorno, evento em `stripe_webhook_events` e `access_active`.

## Testes locais executados (não são checkout validado)

| Teste | Resultado |
|---|---|
| Regras de cobrança do repositório — 9 arquivos do Vitest (`annual-boleto-checkout`, `annual-pix-checkout`, `pix-monthly-purchases`, `black-checkout-helpers`, `checkout-errors`, `purchase-activation`, `first-access-gate`, `p0-access-hardening`, `admin-one-time-billing`) | passou, 90 de 90 |
| Assinatura do webhook com segredo fictício — `ops/stripe-sandbox/rodar-teste-local-webhook.sh` | passou, 5 de 5: aceita a válida; recusa corpo adulterado, segredo errado, assinatura com mais de 5 minutos e cabeçalho malformado |

O segundo teste usa a mesma biblioteca e a mesma chamada da função, mas roda
no Mac: não exercita a função publicada nem o Stripe. A chave `sk_test_…` que
aparece no arquivo é um texto fictício, sem uso em rede.

```bash
NODE_OPTIONS=--no-webstorage bunx vitest run src/lib/__tests__/annual-boleto-checkout.test.ts \
  src/lib/__tests__/annual-pix-checkout.test.ts src/lib/__tests__/pix-monthly-purchases.test.ts \
  src/lib/__tests__/black-checkout-helpers.test.ts src/lib/__tests__/checkout-errors.test.ts \
  src/lib/__tests__/purchase-activation.test.ts src/lib/__tests__/first-access-gate.test.ts \
  src/lib/__tests__/p0-access-hardening.test.ts src/lib/__tests__/admin-one-time-billing.test.ts
ops/stripe-sandbox/rodar-teste-local-webhook.sh
```
