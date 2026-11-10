# Recuperação por WhatsApp (Bird)

Painel: **/admin/recuperacao-whatsapp** (somente admin).

## Quem entra

Conta que, ao mesmo tempo:

- está declarada **médico** (`profiles.professional_status = 'medico'`);
- tem **e-mail** e **celular brasileiro válido** (fixo fica de fora);
- **não paga hoje** (assinatura ativa, anual ou Pix vigente) e **nunca teve cortesia**;
- **fez o teste grátis e ele acabou há pelo menos 24 h** (até 1 ano), ou **já foi assinante**;
- não pediu para sair.

Segmentos: `trial_expired` (fez o teste e nunca pagou) e `ex_subscriber` (já pagou e parou).
Cada pessoa entra uma única vez; o mesmo celular em duas contas recebe uma vez só.

## Cadência

| Etapa | Quando | Objetivo |
| --- | --- | --- |
| 1 | na entrada | lembrar do valor e trazer de volta |
| 2 | 3 dias depois da 1 | mostrar um uso concreto |
| 3 | 4 dias depois da 2 | última mensagem e pedido de feedback |

Envio só de segunda a sábado, das 9h às 20h (Fortaleza), até 30 novos contatos por dia
(`WA_RECOVERY_DAILY_CAP`) para proteger a nota de qualidade do número.

Para na hora quando a pessoa **assina** (conferido no acesso real antes de cada envio, inclusive Stripe por e-mail),
**responde** (vai para a aba "Responderam" para conversa manual), **pede para sair** (SAIR, PARAR, "não tenho interesse"
ou o botão) ou o WhatsApp **recusa o número**.

## Configuração (uma vez)

1. **Número próprio no Bird.** Hoje o workspace só tem números do sistema do Bird. Conectar o número da MedStation/MedNeeds
   (WhatsApp Business → Bird, de preferência em coexistência para continuar usando o app no celular).
2. **Modelos.** Criar no Bird os 6 modelos abaixo, categoria **Marketing**, idioma **pt_BR**, e enviar para aprovação da Meta.
3. **Segredos das funções** (Lovable Cloud → Edge Functions → Secrets):
   - `BIRD_API_KEY` — chave de API do workspace do Bird
   - `BIRD_WHATSAPP_FROM` — número conectado, em E.164 (ex.: `+5598981862510`)
   - `BIRD_WEBHOOK_SECRET` — segredo `whsec_...` do webhook (passo 4)
   - opcionais: `WA_RECOVERY_DAILY_CAP` (padrão 30), `WA_RECOVERY_LANDING_PATH` (padrão `/black`; trocar para `/pricing` em 01/12)
4. **Webhook** no Bird apontando para `https://rwiovxyftfbkvzbepfqi.supabase.co/functions/v1/bird-whatsapp-webhook`,
   com os eventos `whatsapp.accepted`, `whatsapp.sent`, `whatsapp.delivered`, `whatsapp.read`, `whatsapp.failed`,
   `whatsapp.rejected`, `whatsapp.received` e `whatsapp_suppression.created`.
5. No painel: **Simular rodada**, depois **Incluir e enviar 1ª** para 2 ou 3 pessoas, conferir entrega/leitura e só então
   ligar o **Envio automático**.

## Modelos (Meta)

Todos com `{{1}}` = primeiro nome, botão de URL **"Ver planos"** com URL dinâmica `https://medstation-ai.com.br/{{1}}`
(o sistema completa com a página e as UTMs da etapa) e botão de resposta rápida **"Não tenho interesse"**
(payload `nao_interesse`, tratado como pedido de saída). Sem preço no texto: o preço fica na página, que sempre mostra o valor vigente.

### medstation_recupera_teste_1
> Oi, {{1}}! Aqui é o Artur, médico plantonista e criador da MedStation. Seu teste grátis terminou, mas a documentação não precisa voltar a ser no braço: evolução, admissão e resumo de exames saem prontos em segundos, sem escrever prompt. Quer voltar a produzir mais e digitar menos?

### medstation_recupera_teste_2
> {{1}}, uma dica de plantão: cole os exames do paciente no Resumidor de exames e receba tudo organizado para colar no prontuário. É um dos assistentes que os médicos da MedStation mais usam. Seu acesso volta na hora em que você assinar.

### medstation_recupera_teste_3
> {{1}}, esta é minha última mensagem por aqui. Se a MedStation não fez sentido para você, me responda em uma linha o porquê: eu leio todas. Se fez, seu acesso está a um toque.

### medstation_recupera_ex_1
> Oi, {{1}}! Aqui é o Artur, da MedStation. Sentimos sua falta. Desde que você saiu, chegaram o modo Estúdio, a Prompteca e os modelos SOAP e de atenção básica no Clínicus. Quer dar uma nova chance?

### medstation_recupera_ex_2
> {{1}}, o que mais pesa no seu plantão hoje: evolução, admissão ou resumo de exames? A MedStation já entrega os três prontos, com o prompt definido para a realidade médica. Responda aqui se quiser uma dica para o seu caso.

### medstation_recupera_ex_3
> {{1}}, última mensagem por aqui. Se algo na MedStation te fez sair, me conta em uma linha: isso guia o que construímos. Se quiser voltar, é só tocar abaixo.

## Custo estimado

Bird (pay as you go) + Meta, categoria Marketing para o Brasil: cerca de **US$ 0,0675 por mensagem entregue**.
Três etapas para ~190 pessoas ≈ 570 mensagens ≈ **US$ 38** no pior caso (quem responde ou assina para antes).
Respostas dentro de 24 h são mensagens de serviço (bem mais baratas).

## Onde está cada parte

- Regra pura (quem entra, quando, quando para): `supabase/functions/_shared/whatsapp-recovery.ts` (testes em `src/lib/__tests__/whatsapp-recovery.test.ts`)
- Cliente Bird e assinatura do webhook: `supabase/functions/_shared/bird.ts` (testes em `src/lib/__tests__/bird.test.ts`)
- Execução e envio: `supabase/functions/_shared/whatsapp-recovery-engine.ts`
- Rodada automática: `whatsapp-recovery-run` (pg_cron, minuto 23 de cada hora; sai sem fazer nada com a flag `whatsapp_recovery_auto` desligada)
- Webhook: `bird-whatsapp-webhook` · Painel: `admin-whatsapp-recovery` + `src/pages/admin/AdminWhatsappRecovery.tsx`
- Banco: `drizzle/migrations/0016_whatsapp_recovery.sql`
