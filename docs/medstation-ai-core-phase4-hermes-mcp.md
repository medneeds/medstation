# MedStation × Hermes — Fase 4 (MCP de homologação sintética)

## Estado real
> Atualização: ver **docs/medstation-ai-core-phase5-preflight.md** para as exigências de pinning do projeto, prevenção de redirecionamentos e preflight. As instruções da Fase 5 substituem a configuração de credenciais abaixo quando houver divergência.\n\nEste PR implementa um **servidor MCP stdio funcional** para Hermes e uma Edge Function Supabase destinada a um ambiente de **homologação isolado**. Os testes de transporte MCP usam um servidor simulado; não há Hermes instalado, hospedagem provisionada, credenciais configuradas, endpoint publicado ou ferramenta clínica real executada.

## Arquitetura
```
Hermes Agent (sandbox, sem memória clínica, só toolset MCP)
  └── MCP stdio: hermes-bridge/server.mjs
       └── HTTPS + JWT administrativo de curta duração + apikey pública
            └── ai-core-hermes-sandbox (Edge Function, somente staging)
                 ├── gate: AI_CORE_ENVIRONMENT=staging
                 ├── gate: AI_CORE_HERMES_SANDBOX_ENABLED=true
                 ├── autenticação JWT + role admin, servidor
                 ├── body limitado a 1024 bytes
                 └── planner e simulation: Clínicus + Examinus apenas como nomes
```

## Superfície exposta ao Hermes
Apenas a ferramenta MCP `medstation_simulate_admission`, com um campo `requestId` (8 a 100 caracteres ASCII seguros). Não aceita paciente, conteúdo clínico, steps, prompt, modelo, URL ou dados do usuário. A ferramenta **não invoca Clínicus/Examinus reais** e retorna somente planejamento e simulação.

## Como testar somente em máquina de homologação
Requisitos: Node 22+, Hermes instalado em host/container isolado e um projeto Supabase DE TESTES, sem dados reais.

1. Executar `node --test hermes-bridge/server.test.mjs` para validar MCP sem credenciais.
2. Configurar projeto Supabase de staging com a função e autenticação administrativa exclusiva de testes. Validar `has_role` e que o token representa uma conta de homologação.
3. No servidor da Edge Function, habilitar **apenas no ambiente staging**:
   - `AI_CORE_ENVIRONMENT=staging`
   - `AI_CORE_HERMES_SANDBOX_ENABLED=true`
4. No **processo MCP de homologação** (não no navegador, não no GitHub e não no chat), definir:
   - `MEDSTATION_MCP_STAGING_ENABLED=true`
   - `MEDSTATION_STAGING_PROJECT_REF=<ref-staging>`\n   - `MEDSTATION_PRODUCTION_PROJECT_REF=<ref-producao>`\n   - `MEDSTATION_STAGING_URL=https://<projeto-staging>.supabase.co/functions/v1/ai-core-hermes-sandbox`
   - `MEDSTATION_STAGING_JWT=<JWT de sessão de admin do staging, prazo curto>`
   - `MEDSTATION_SUPABASE_ANON_KEY=<chave pública específica do projeto staging>`
5. Adicionar um servidor MCP local em `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  medstation_sandbox:
    command: "node"
    args: ["/CAMINHO/ABSOLUTO/medstation/hermes-bridge/server.mjs"]
    enabled: true
    supports_parallel_tool_calls: false
    tools:
      include: ["medstation_simulate_admission"]
      resources: false
      prompts: false
```

6. Executar `hermes mcp test medstation_sandbox` e solicitar à IA que invoque o MCP com `requestId=synthetic_001`.
7. Não habilitar outras ferramentas do Hermes no mesmo processo que recebe tokens. Idealmente executar num container sem shell/network egress além do endpoint de testes, sem acesso aos repositórios e segredos da MedStation. A configuração de toolset MCP não garante, sozinha, que ferramentas internas como terminal estejam desativadas.

## Proteções
- A função retorna 404 quando a variável de staging está ausente ou quando o ambiente é de produção.
- Permissão adicional exigida: JWT de usuário admin válido no projeto de testes.
- O MCP aceita exclusivamente o domínio exato `<MEDSTATION_STAGING_PROJECT_REF>.supabase.co` e o caminho específico da sandbox, e rejeita qualquer URL que corresponda ao ref de produção, além de redirecionamentos; endpoints arbitrários são recusados.
- Recusa funções MCP não reconhecidas; sem ferramentas de escrita ou acesso a banco.
- Nenhum dado clínico passa pelo processo MCP ou retorna para Hermes.
- Erros upstream são normalizados; não incluem resposta bruta do servidor.
- Sem retries automáticos que possam executar duas vezes o mesmo fluxo.

## Critérios para próxima etapa
- Ambiente de staging próprio, sem dados de pacientes.
- Teste end-to-end com Hermes realmente instalado, com token de testes, revogação e rotação de credenciais.
- Revisão de segurança, ameaça SSRF, egress, RLS, logging, limites e controle de tokens.
- Testes de qualidade clínica com casos inteiramente sintéticos e avaliação médica.
- Um executor clínico real, separadamente autorizado e auditado, ainda terá que ser desenvolvido.
- Desenvolver um agente comercial em serviço separado, limitado a métricas agregadas, sem acesso a prontuários, áudios ou transcrições.

Fonte MCP Hermes: https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
Fonte transporte MCP: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
