# Convite dos 7 dias: pop-up + e-mail para usuários antigos

## Objetivo
Levar os usuários antigos (cadastrados antes do novo modelo, sem assinatura ativa) a ativar, com um clique, 7 dias com a plataforma inteira — 12 assistentes, Modo Escuta e Modo Rotineiro — sem cartão e sem cobrança.

## Como funciona

1. **Pop-up central no primeiro acesso**
   Ao entrar no painel, o usuário elegível vê um convite no centro da tela:
   - Título: "Sua chave da MedStation inteira, por 7 dias"
   - O que abre: os 12 assistentes, Modo Escuta (consulta vira anamnese pronta) e Modo Rotineiro (visita de enfermaria/UTI).
   - Linha de confiança em destaque: "Sem cartão. Sem cobrança. Sem cancelamento para fazer depois."
   - Botão principal: "Ativar meus 7 dias" — a contagem começa nesse clique.
   - Link discreto: "Agora não" (reaparece no próximo acesso enquanto não ativar).
   - Depois de ativar: estado de sucesso curto ("Liberado até <data>") e o usuário cai direto no painel com a faixa de contagem já ativa.

2. **Ativação de verdade no clique**
   O benefício só passa a contar quando o usuário aceita — quem nunca abrir não perde os 7 dias. Quem já tem assinatura ativa nunca vê o pop-up.

3. **E-mail com a mesma promessa**
   Assunto: "Abrimos a MedStation inteira para você por 7 dias"
   Pré-texto: "Sem cartão, sem cobrança — é só ativar."
   Corpo (curto, 3 blocos):
   - Abertura direta: você já usa o Examinus; agora liberamos o resto.
   - O que entra: 12 assistentes clínicos, Modo Escuta, Modo Rotineiro — em bullets.
   - Quebra de objeção: "Não pedimos cartão. Não há cobrança automática. Quando os 7 dias acabarem, sua conta simplesmente volta ao que era."
   - Botão único: "Ativar meus 7 dias" — leva para o painel já com o convite aberto.
   - Fecho: "Menos digitação, mais medicina."

4. **Disparo controlado pelo admin**
   Novo bloco em /admin (Audiência): mostra quantos estão elegíveis, permite pré-visualizar o e-mail e disparar em lote, registrando quem já recebeu para não enviar duas vezes.

## Detalhes técnicos
- Marcação de elegibilidade e de estado (visto / ativado / e-mail enviado) por linha em `courtesy_access` com `source = 'legacy_trial'`; ativação grava `expires_at = now() + 7 dias` no clique. Registro de "convite enviado/visto" em coluna nova ou em `metadata` da própria concessão.
- Nova Edge Function `claim-legacy-trial`: valida o usuário, confirma que não há assinatura ativa e que ele é anterior ao corte, e cria/renova a cortesia. Depois chama `check-subscription` no cliente.
- Novo componente `LegacyTrialInviteDialog` montado no `DashboardLayout`, controlado pelo estado retornado por `check-subscription` (`trial_source: legacy` + flag de não ativado); `?convite=7dias` no link do e-mail força a abertura.
- Novo template React Email `legacy-trial-invite.tsx` registrado em `transactional-email-templates/registry.ts`, enviado via `send-transactional-email` com `idempotencyKey` por usuário.
- Nova Edge Function admin `admin-send-legacy-trial-invites` para o disparo em lote, protegida por `has_role('admin')`, enfileirando um envio por usuário elegível.
