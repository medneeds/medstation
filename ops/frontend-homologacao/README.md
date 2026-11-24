# Frontend apontando para a homologação

> Escrito pelo Claude em 24/11/2026. O app foi compilado e servido só no Mac
> (`127.0.0.1`). Nenhum projeto de hospedagem foi criado e nada foi publicado.

## Como rodar localmente

```bash
bun install --frozen-lockfile
ops/frontend-homologacao/rodar-teste-login-local.sh
```

O script:

1. compila com `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` e
   `VITE_SUPABASE_PUBLISHABLE_KEY` da homologação, passadas pelo ambiente do
   processo (têm prioridade sobre o `.env` versionado, que aponta para a
   produção), e com as variáveis do PostHog vazias;
2. aborta se o pacote compilado contiver o ref de produção;
3. serve `dist/` em `127.0.0.1:4173` e abre um navegador sem interface;
4. **só deixa o navegador falar com o servidor local e com o Supabase de
   homologação.** Qualquer outro destino é abortado antes de sair e listado;
5. faz login com `homolog-medico@example.com` e registra cada chamada.

Para abrir à mão, as mesmas quatro variáveis e `bunx vite preview --host 127.0.0.1`.

## Resultado (24/11/2026, commit `0a20b44a`, mesmo código do PR #20)

| Verificação | Resultado |
|---|---|
| Pacote aponta só para a homologação | passou — 0 arquivos com o ref de produção, 11 com o de homologação |
| Tela de login carrega | passou |
| `POST /auth/v1/token` vai para a homologação e responde 200 | passou |
| Sai da tela de login depois de autenticar | passou — vai para `/onboarding` |
| Sessão no navegador é da homologação | passou — chave `sb-qcvvwbbeuvawgccstyro-auth-token` |
| Alguma requisição tentou a produção | não — 0 tentativas |
| Tela depois do login | carrega: "Vamos configurar sua MedStation", com o aviso de confirmação de conta por cima |

Destino efetivo de cada chamada depois do login:

| Chamada | Status | Leitura |
|---|---|---|
| `GET /auth/v1/user` | 200 | autenticação funciona |
| `GET /rest/v1/user_onboarding`, `active_sessions`, `user_roles`, `announcements`, `legacy_trial_invites`, `studio_assistants`, `studio_threads` | 200 | têm privilégio |
| `GET /rest/v1/profiles` (3 vezes) | **403** | 42501 — falta o `GRANT` da fase 1 |
| `GET /rest/v1/notifications` | **403** | 42501 — fase 2 |
| `POST /functions/v1/device-check` | 404 | função não publicada; o app libera o acesso mesmo assim |
| `POST /functions/v1/check-subscription` | 404 | função não publicada; o app fica sem saber o plano |
| `POST /functions/v1/send-first-welcome` | 404 | função não publicada; nenhum e-mail sai |
| `WS /realtime/v1/websocket` | aberto | homologação |

Único destino fora da lista permitida: `fonts.googleapis.com` (folha de
estilo das fontes), bloqueado pela trava do teste.

## Diagnóstico, separado

- **Autenticação básica: funciona.** E-mail e senha, contra a homologação.
- **A tela carrega sem nenhuma Edge Function.** `device-check` falha aberto
  ("verificação indisponível, liberando acesso"); `check-subscription` e
  `send-first-welcome` falham sem travar a tela.
- **O perfil não aparece** (nome vazio no formulário) por causa do 42501 em
  `profiles`. Dependência mínima: a fase 1 do plano de `GRANT`.
- **O estado de assinatura fica vazio** sem `check-subscription`. Dependência
  mínima para ver plano e período de teste: publicar essa função na
  homologação com `STRIPE_SECRET_KEY` de teste (ela consulta o Stripe).

## Dependências da Lovable no fluxo de login

| Onde | O que é | Efeito fora da Lovable |
|---|---|---|
| `src/integrations/lovable/index.ts` + `@lovable.dev/cloud-auth-js` | o botão "Continuar com Google" usa o intermediário de OAuth da Lovable (`oauth.lovable.app`) | **não funciona** fora da Lovable; precisa virar `supabase.auth.signInWithOAuth` com o Google configurado na homologação (hoje só e-mail está ligado) |
| `src/integrations/supabase/previewAuthStorage.ts` | guarda a sessão pelo editor da Lovable | sem efeito: fora dos domínios da Lovable usa `localStorage` |
| `auth-email-hook` + fila de e-mail | confirmação de cadastro, link mágico e redefinição de senha saem pela Lovable | não existe na homologação; ver "e-mails" abaixo |
| `device-check` → modelo `login-code` | código de confirmação de aparelho por e-mail, pela API de envio da Lovable (`LOVABLE_API_KEY`) | não publicada; se for publicada sem essa chave, o envio falha |
| `lovable-tagger` (`vite.config.ts`) | só no modo desenvolvimento | sem efeito no pacote de produção |
| `VITE_LOVABLE_CONNECTOR_POSTHOG_*` | nome das variáveis do PostHog | só o nome; vazias desligam o PostHog |

Não testei o botão do Google: o clique sairia para a Lovable.

## Lista para um preview protegido (nada criado)

Antes de publicar:

1. **Banco:** aplicar a fase 1 (`plano/001_grant_select_profiles.sql`).
2. **Proteção:** preview com autenticação da hospedagem ligada e cabeçalho
   `X-Robots-Tag: noindex`.
3. **Variáveis, só no ambiente de preview:** `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` da homologação;
   as três `VITE_LOVABLE_CONNECTOR_POSTHOG_*` vazias.
4. **Trava de build:** falhar se `dist/` contiver `rwiovxyftfbkvzbepfqi` (o
   `.env` versionado aponta para a produção; se as variáveis não forem
   definidas, o build sai apontando para lá).
5. **Rotas:** o app é SPA com rotas no navegador; a hospedagem precisa
   reescrever tudo para `/index.html`. O repositório não tem `vercel.json`.
6. **Build:** `bun install --frozen-lockfile` e `bun run build`, saída `dist/`.
7. **Supabase Auth da homologação:** incluir a URL do preview em *Site URL* e
   *Redirect URLs*.
8. **E-mails:** "criar conta" (link mágico) e "esqueci a senha" chamam o
   serviço de autenticação, que enviaria e-mail pelo remetente padrão do
   Supabase. Para o preview: desligar novos cadastros na homologação e usar só
   as contas fictícias.
9. **Meta Pixel:** o ID de produção está fixo no `index.html`. Só carrega se
   o visitante aceitar cookies de marketing; no preview, bloquear
   `connect.facebook.net` por CSP ou não aceitar.
10. **Google:** esconder o botão ou trocar o intermediário (item da tabela acima).
11. **Não publicar** `send-first-welcome`, `device-check` nem funções de e-mail
    enquanto e-mails reais devem ficar desligados.

Decisões que isso pede: qual hospedagem e em qual conta; se o preview pode
existir com o botão do Google quebrado.
