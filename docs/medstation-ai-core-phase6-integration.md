# MedStation AI Core — Fase 6: verificação end-to-end isolada

## Objetivo
Validar o caminho completo **processo MCP Node → ferramenta autorizada → chamada HTTP → retorno sintético** sem utilizar produção, serviços pagos, modelos de IA ou dados de pacientes.

## Alterações
- A Edge Function `ai-core-hermes-sandbox` agora compara seu próprio `SUPABASE_URL` com `AI_CORE_STAGING_PROJECT_REF`, rejeitando execução fora do projeto explicitamente autorizado, mesmo que uma flag de staging seja configurada por engano.
- `AI_CORE_PRODUCTION_PROJECT_REF` é obrigatório e deve ser diferente do staging.
- IDs enviados à sandbox devem começar com `synthetic_`; não se aceita texto clínico.
- A ponte MCP também valida o prefixo `synthetic_`, impedindo IDs de pacientes arbitrários.
- Novo teste `hermes-bridge/full-integration.test.mjs`: inicia um processo real de MCP Node, negocia protocolo, descobre ferramentas e chama a ferramenta com HTTP simulado por preloader.
- A resposta simulada inclui um campo indevido deliberado; o teste assegura que ele é descartado antes de chegar ao cliente MCP.
- O GitHub Actions executa os testes completos com o mock. **Nenhum endpoint externo é acessado pelo teste.**

## Validação
```bash
node --test hermes-bridge/server.test.mjs hermes-bridge/full-integration.test.mjs
node hermes-bridge/preflight.mjs
bunx vitest run
bun run build
```

## Configuração obrigatória no Supabase de homologação
- `AI_CORE_ENVIRONMENT=staging`
- `AI_CORE_HERMES_SANDBOX_ENABLED=true`
- `AI_CORE_STAGING_PROJECT_REF=<ref do staging>`
- `AI_CORE_PRODUCTION_PROJECT_REF=<ref diferente de produção>`
- `SUPABASE_URL` é fornecido pelo próprio projeto e precisa ser exatamente `https://<ref do staging>.supabase.co`

No processo MCP, configurar refs iguais aos valores acima nos parâmetros de homologação e evitar credenciais long-lived.

## Ainda não realizado
- Não há instância Hermes instalada ou configurada.
- Não há Supabase de homologação criado nem deploy de Edge Function.
- Não há comunicação com provedores de IA ou execução clínica.
- O teste HTTP de ponta a ponta **é simulado**, embora o processo MCP seja real.

## Próxima autorização técnica
Provisionar ambiente de homologação isolado e obter credenciais temporárias, confirmar limites de acesso e testar Hermes de verdade. A migração deve aguardar avaliação de privacidade, custos, autorização clínica e infraestrutura.
