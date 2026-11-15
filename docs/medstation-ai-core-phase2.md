# MedStation AI Core — Fase 2: transporte direto do Copiloto

## Status
**Código em branch de desenvolvimento e PR draft; não implantado em produção.**
A rota escolhida foi `copilot-chat`, que explica funcionalidades da plataforma. NÃO são alteradas as rotas clínicas de assistência, prescrição ou interpretação de exames.

## Implementação
- `_shared/ai-core/chat-completions.ts`: chamada HTTP real à API Google Gemini compatível com OpenAI, via endpoint fixo HTTPS.
- `copilot-chat/index.ts`: seleciona o backend por variáveis de ambiente do servidor (sem configuração vinda do usuário).
- `AI_CORE_COPILOT_PROVIDER` ausente ou `lovable`: preserva o gateway e modelo originais.
- `AI_CORE_COPILOT_PROVIDER=google`: exige `GEMINI_API_KEY` e `AI_CORE_COPILOT_DIRECT_MODEL` configurados; não faz fallback silencioso para Lovable se um segredo estiver ausente.
- Aliases de modelo são específicos do provedor, não são copiados automaticamente dos IDs do gateway Lovable.
- Resposta do Copiloto, filtro de PII, proteção de prompt, autenticação e rate limit existentes foram preservados.
- O log identifica `metadata.ai_backend` e o modelo invocado. Para o Google direto, o custo permanece `null` até uma tarifa contratual verificada (as tarifas Lovable não podem ser reutilizadas).
- Testes offline com `fetch` simulado verificam o request e o opt-in. Nenhuma chamada paga em CI.

## Ativação futura (somente homologação e após revisão)
1. Provisionar um ambiente Supabase de homologação isolado e uma chave Gemini limitada a esse ambiente.
2. Confirmar a disponibilidade efetiva do alias de modelo na API Google e contrato de processamento de dados.
3. Definir `AI_CORE_COPILOT_PROVIDER=google`, `GEMINI_API_KEY` e `AI_CORE_COPILOT_DIRECT_MODEL` **apenas no servidor**. Não usar `VITE_` nem variáveis públicas.
4. Rodar casos de teste sem dados pessoais ou clínicos reais, comparando JSON, ações de navegação, latência, quota e custos.
5. Validar LGPD, privacidade, retenção e restrições de egress antes de habilitar usuários reais.
6. Só aprovar o merge depois de revisão técnica e clínica, testes CI e plano de rollback. Para retornar ao gateway anterior, reverter `AI_CORE_COPILOT_PROVIDER` para `lovable` ou remover a variável no servidor.

## Fora de escopo desta fase
- Hermes instalado ou usando ferramentas em produção.
- Migração de autenticação, banco, armazenamento e envio de e-mails da Lovable.
- Troca de modelos das rotas clínicas.
- Backfill de custos passados.
- Ativação em produção.

## Restrição importante
O Copiloto não é uma rota clínica, mas usuários ainda podem enviar dados sensíveis espontaneamente. A substituição de provedor aumenta o escopo de tratamento de dados e requer avaliação legal e técnica antes de ativação.
