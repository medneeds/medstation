# MedStation AI Core — Fase 8: Hermes oficial validado em runner descartável

## Resultado confirmado (15/11/2026)

O GitHub Actions executou o **Hermes Agent v0.23.1**, fixado no commit oficial `3b421578588243f920886e6fe79a6faa87ea026e`, com Python 3.14 e o extra opcional `mcp`.

O comando oficial `hermes mcp test medstation_sandbox` retornou:

- conexão MCP stdio **estabelecida**;
- **1 ferramenta descoberta**: `medstation_simulate_admission`;
- bridge Node da MedStation iniciado no runner com `MEDSTATION_MCP_STAGING_ENABLED=false`;
- nenhum token de modelo, dados clínicos, Supabase real ou segredo de produção foi utilizado.

Log da execução inicial bem-sucedida: [GitHub Actions run 43720460461](https://github.com/medneeds/medstation/actions/runs/43720460461).

## Ajuste necessário durante validação

A instalação mínima de origem do Hermes conseguiu reconhecer o nome do MCP, mas a conexão falhou por ausência do **SDK opcional `mcp`**. A execução foi corrigida com:

```bash
uv sync --frozen --python 3.14 --extra mcp
```

Isso confirma uma dependência real que testes com mocks não detectavam.

## Como o teste real é isolado

- GitHub runner Ubuntu efêmero e sem segredos clínicos;
- checkout do release estável do repositório `NousResearch/hermes-agent` com revisão de SHA;
- `HERMES_HOME` temporário;
- um único MCP permitido, `medstation_simulate_admission`, com `trust: untrusted`;
- acesso HTTP do bridge desabilitado;
- nenhuma chamada a modelos de IA;
- `main` e produção não alteradas.

## Escopo de validação real

**Comprovado:** a CLI oficial instala, reconhece a configuração da MedStation, inicia o processo MCP via stdio e descobre a ferramenta autorizada.

**Ainda não comprovado:** execução de uma tool call pela inferência do Hermes, comunicação com Supabase staging real, geração de conteúdo clínico por Clínicus/Examinus, retenção segura de contexto, disponibilidade em infraestrutura persistente e critérios de qualidade clínica.

## Próximo estágio

1. Criar projeto Supabase de homologação explicitamente autorizado, independente de produção.
2. Instalar Hermes em infraestrutura persistente (servidor isolado).
3. Fornecer credenciais de curta duração e executar `node hermes-bridge/preflight.mjs --staging`.
4. Validar uso de ferramentas pelo Hermes com provedor de modelo de teste, sem pacientes.
5. Implementar execução clínica real somente após autenticação, isolamento de dados, aprovação humana e avaliação clínica.

A criação do projeto Supabase é uma ação distinta, potencialmente faturável, e requer escolha da organização e aprovação dos custos que sejam apresentados pelo provedor.
