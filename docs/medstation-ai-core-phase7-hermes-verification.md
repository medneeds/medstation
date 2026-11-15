# MedStation AI Core — Fase 7: verificação operacional do Hermes

## Entregue

- `hermes-bridge/verify-hermes.mjs`: verificador de integração com a instalação **real** do Hermes, em modo apenas leitura.
- Confirma que o binário existe, que o servidor `medstation_sandbox` está registrado e que o comando oficial `hermes mcp test medstation_sandbox` consegue conectar.
- Não instala Hermes, não altera `~/.hermes/config.yaml`, não manipula chaves e não executa ferramentas clínicas.
- Não imprime respostas brutas do Hermes, que poderiam conter caminhos locais, endpoints ou metadados de conta.
- `hermes-bridge/verify-hermes.test.mjs`: cobre instalação ausente, servidor MCP não registrado, falha de conexão e sucesso restrito ao transporte.

## Comandos

Na máquina de homologação isolada, após instalar o Hermes e registrar o MCP:

```bash
node hermes-bridge/verify-hermes.mjs
```

Opcionalmente, `MEDSTATION_HERMES_MCP_NAME` permite selecionar outro nome de servidor previamente registrado.

O sucesso confirma **somente a conexão MCP**, não que o Hermes criou um plano autonomamente, invocou modelos ou executou o fluxo clínico.

## Limitações observadas neste ambiente

O comando `hermes` não estava instalado no ambiente de execução disponível. A tentativa de consultar a origem externa por shell também não pôde estabelecer conectividade. Por isso não foi possível instalar uma instância real do agente e executar o teste de ponta a ponta com um modelo Nous.

**Não afirmar que o Hermes já está conectado**, mesmo que o GitHub Actions esteja verde: CI utiliza mocks e testes locais.

## Pré-requisitos para prosseguir à integração real

1. Ambiente de homologação segregado e isolado do Supabase de produção.
2. Instalar Hermes a partir da fonte oficial em host controlado, com revisão do instalador.
3. Configurar o servidor MCP stdio com única ferramenta `medstation_simulate_admission`.
4. Configurar um modelo de IA com credenciais de testes, limite de gastos e ferramentas desnecessárias desativadas.
5. Validar `node hermes-bridge/verify-hermes.mjs`, `node hermes-bridge/preflight.mjs --staging` e a invocação via conversa com Hermes.
6. Executar testes com casos clínicos sintéticos, preservando fluxo atual como referência.
7. Aprovar segurança, isolamento, contrato de processamento de dados e critérios de qualidade antes de qualquer utilização clínica real.

## Fontes oficiais

- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/cli-commands.md
- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/mcp-config-reference.md
