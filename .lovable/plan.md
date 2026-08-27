# Auditoria de erros em produção — logs (somente leitura)

Nada foi editado. Nenhum e-mail, nome, token ou ID de usuário é reproduzido abaixo.

## Conclusão principal: os logs NÃO permitem responder 7 dias nem 24h

Consultei diretamente as três fontes de log da plataforma e a janela retida é de **minutos**, não de dias:

| Fonte | Registros retidos | Janela coberta |
|---|---|---|
| `function_edge_logs` (HTTP das Edge Functions) | 19 | 21:46 → 21:55 UTC de hoje (~9 minutos) |
| `auth_logs` | 17 | 21:47 → 21:55 UTC de hoje (~8 minutos) |
| `postgres_logs` | 5 | 21:46 → 21:52 UTC de hoje (~6 minutos) |

Portanto: **não é possível produzir agregados de 7 dias nem de 24 horas**, nem buscar historicamente por `ACCESS_REQUIRED`, `UNAUTHENTICATED`, 429/rate limit, erros Stripe, `user_access`, "already registered", "create user" ou "payment". Qualquer número que eu apresentasse para esses períodos seria inventado.

Isso é, por si só, um achado operacional: hoje não existe retenção de log suficiente para investigar um incidente de pagamento ou de acesso relatado por um usuário algumas horas depois. Investigação de incidentes depende hoje da API da Stripe e do banco, não dos logs.

## O que a janela disponível mostra (≈9 minutos, não extrapolável)

Edge Functions — respostas por função e código:

| Função | 2xx | 4xx | 5xx | Top código |
|---|---|---|---|---|
| check-subscription | 17 | 0 | 0 | 200 |
| agent-chat | 2 | 0 | 0 | 200 |

Sem tráfego registrado no período para `create-checkout`, `guest-checkout`, `complete-checkout`, `examinus-chat`, `consultation-transcribe`, `structure-anamnesis` e `transcribe-audio` — ausência de tráfego, não ausência de erro.

Auth — eventos por rota:

| Rota | 200 | 400 |
|---|---|---|
| `/user` (validação de sessão) | 15 | 0 |
| `/token` (login / refresh) | 1 | 1 |
| sem rota registrada | 1 | — |

Nenhum evento de logout, recovery ou confirmation-requested no período. Houve **1 resposta 400 em `/token`** — a granularidade do log não distingue credencial inválida de refresh token expirado.

Postgres: 5 registros, **0** com severidade ERROR/FATAL/PANIC.

Busca por padrões (`ACCESS_REQUIRED`, `UNAUTHENTICATED`, 429, Stripe, `user_access`, "already registered", "create user", "payment"): nenhuma ocorrência dentro da janela retida. Com ~9 minutos de dados isso não significa que não ocorram.

## Dois achados colaterais relevantes

1. **PII em log de aplicação.** `check-subscription` grava o e-mail do usuário em texto claro no log (`User authenticated - {userId, email}`). O mesmo padrão aparece em outras funções que usam `logStep`. Não reproduzo os valores aqui, mas isso expõe dado pessoal de paciente-usuário em logs de terceiros e conflita com o cuidado de LGPD esperado para uma plataforma médica.
2. **Volume de chamadas de `check-subscription`.** 17 chamadas em ~9 minutos para um único usuário ativo. Cada chamada dispara uma consulta à Stripe. Com base maior isso vira custo, latência e risco de rate limit da Stripe — coerente com o problema de acoplamento já apontado na auditoria anterior.

## Alternativas para obter o que você pediu (sem alterar nada agora)

- Erros de pagamento em 7/30 dias: já são obteníveis pela API da Stripe (feito na auditoria comercial anterior — 9 dos 10 cancelamentos foram `payment_failed`).
- Sinais de acesso bloqueado: a tabela `security_events` e `ai_usage_logs` no banco têm retenção real e podem ser agregadas sem PII, se você quiser que eu faça isso numa próxima leitura.
- Para ter de fato histórico de erro por função, seria necessário passar a persistir eventos de erro em tabela própria — mudança de código, fora do escopo desta auditoria.
