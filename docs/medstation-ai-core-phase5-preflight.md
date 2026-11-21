# MedStation × Hermes — Fase 5: isolamento de homologação e preflight

## Status: código pronto para revisão, não publicado
Nesta fase **não foi criado projeto Supabase**, não foi instalado Hermes e não foi executado um teste real com credenciais. Não houve alterações na produção. A finalidade é endurecer a fronteira MCP e fornecer um procedimento repetível para a primeira integração real.

## Segurança nova
- `hermes-bridge/server.mjs` exige `MEDSTATION_STAGING_PROJECT_REF` e `MEDSTATION_PRODUCTION_PROJECT_REF`, ambos refs de 20 caracteres, **diferentes**, e aceita somente `https://<staging-ref>.supabase.co/functions/v1/ai-core-hermes-sandbox`.
- Rejeita redirecionamentos HTTP, alterações de caminho, consulta na URL e hosts externos.
- Limita respostas HTTP a 8 KiB e não reencaminha campos arbitrários: a saída do Hermes é reconstruída somente com fluxo `admission-review` e duas etapas sintéticas conhecidas.
- Erros de provedor, respostas incompletas e payloads excessivos são normalizados; nenhum corpo bruto do upstream aparece nas mensagens MCP.
- Os testes verificam pinning, payload inesperado contendo suposto dado de paciente, tamanho excessivo, chamada de ferramentas proibidas e protocolo stdio.

## Comandos disponíveis
```bash
# Testes totalmente offline, sem tokens, banco ou chamadas externas:
node --test hermes-bridge/server.test.mjs
node hermes-bridge/preflight.mjs

# Apenas depois de criar e configurar staging próprio:
node hermes-bridge/preflight.mjs --staging
```

O segundo comando exige variáveis de ambiente configuradas no **processo local isolado**:

| Variável | Uso |
|---|---|
| `MEDSTATION_MCP_STAGING_ENABLED=true` | Opt-in explícito |
| `MEDSTATION_STAGING_PROJECT_REF` | Identificador exato do projeto de testes |
| `MEDSTATION_PRODUCTION_PROJECT_REF` | Identificador do projeto de produção, apenas para impedir confusão |
| `MEDSTATION_STAGING_URL` | URL da função no projeto de testes, validada contra o ref |
| `MEDSTATION_STAGING_JWT` | JWT administrativo de curta duração do projeto de testes |
| `MEDSTATION_SUPABASE_ANON_KEY` | Chave pública do projeto de testes |

As credenciais jamais devem ser colocadas em arquivos versionados, no frontend, em mensagens de chat ou em logs. Usar gerenciador de segredos.

No projeto Supabase **de testes** o handler requer `AI_CORE_ENVIRONMENT=staging` e `AI_CORE_HERMES_SANDBOX_ENABLED=true`; no ambiente de produção, manter ausentes/desativados. A função também exige JWT válido e role admin.

## Instalação do Hermes: somente no host de homologação
Obter Hermes da fonte oficial e revisar o instalador antes de executar:
https://hermes-agent.nousresearch.com/docs/getting-started/quickstart

Após instalar e configurar um modelo num ambiente sem dados clínicos, adicionar este servidor MCP local com a configuração documentada pela Nous Research:
```bash
hermes mcp add medstation_sandbox --command node --args /CAMINHO/ABSOLUTO/medstation/hermes-bridge/server.mjs
hermes mcp list
hermes mcp test medstation_sandbox
```

Manter apenas a ferramenta `medstation_simulate_admission` no allowlist do servidor. Isolar o processo Hermes: sem ferramentas de terminal, navegador, escrita em disco, acesso à rede além do staging, ou memória de pacientes.

## Critérios de aceitação do teste real
1. `preflight.mjs` offline concluído; teste de CI verde.
2. Projeto de staging não é a produção e não contém dados identificáveis.
3. `preflight.mjs --staging` passa com credenciais temporárias sem revelar tokens.
4. Hermes instalado num host isolado detecta exatamente uma ferramenta MedStation.
5. A invocação de `synthetic_001` devolve exatamente Clínicus e Examinus simulados.
6. Tentativas de chamar outras ferramentas, trocar URL ou enviar conteúdo clínico são negadas.
7. Revogar JWT e repetir teste confirma que o acesso é negado.
8. Revisão independente de isolamento, autenticação e logging antes de promover qualquer fluxo real.

## Limites
Esta fase **não** implementa um executor clínico real, não altera modelo de IA e não configura infraestrutura nem cobra serviços. Um teste real com Hermes fica pendente até existir ambiente externo isolado com credenciais de testes.

Referências:
- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/cli-commands.md
- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/mcp-config-reference.md
