# Teste de inferência do Hermes (nível C): roteiro

> Escrito pelo Claude em 24/11/2026. **O teste de verdade não foi executado:**
> nenhum provedor configurado, nenhuma chamada paga, VPS intocada. O que rodou
> foi um ensaio só no Mac, com o Hermes real e todo o resto simulado. A seção
> "Executado e hipótese" separa uma coisa da outra.

A ponte → função (nível B) passou em 24/11/2026 23:06 UTC
(`../../RESULTADOS-2026-11-24.md`). Este roteiro é o passo seguinte: um modelo,
dentro do Hermes, decidir chamar a ferramenta.

## O cenário, um só

Uma única requisição `POST /v1/responses` ao Hermes, pelo túnel SSH (o
identificador é sorteado na hora):

> Rode a simulação sintética de admissão da MedStation para o identificador
> `synthetic_e2e_<12 hex>`. Use a ferramenta disponível uma única vez e
> responda em uma frase com o ambiente e as etapas que ela devolveu.

Sem paciente, sem texto clínico. Para ver a requisição sem enviar nada:

```bash
node ops/hermes-vps/inferencia/executar-teste-inferencia.mjs
```

## Como comprovar, no mesmo registro

O registro é a resposta JSON dessa única requisição. Formato confirmado com o
Hermes real no ensaio local:

| Fato | Onde aparece | O que o verificador exige |
|---|---|---|
| Decisão do modelo | item `function_call` | exatamente uma chamada; `name` = `mcp__medstation_sandbox__medstation_simulate_admission`; `arguments` = só `{"requestId": "<identificador sorteado>"}` |
| Chamada da ferramenta | item `function_call_output` | mesmo `call_id`, depois da chamada, `status: completed`; quem escreve este item é o Hermes |
| Resposta da função | dentro de `function_call_output` | envelope `<untrusted_tool_result source="…">` com a origem igual à ferramenta; `environment` = `synthetic-staging`; `simulation.requestId` = o identificador sorteado; as duas etapas (`clinicus`, `examinus`) |
| Fecho | item `message` | resposta final depois do resultado; `status: completed` |

O identificador amarra tudo: sai no pedido, volta nos argumentos e volta na
resposta. Um modelo que só *diga* que deu certo não passa.

**Fica gravado** (arquivo local, modo 600): identificador, horários, status
HTTP, os itens acima, tokens e o resultado de cada verificação. **Nunca fica:**
cabeçalhos, chaves, JWT. O verificador recusa o registro se achar formato de
token, segredo, CPF ou e-mail.

**Conferência independente:** nos logs da função `ai-core-hermes-sandbox` na
homologação, uma única invocação com 200 no intervalo. É por horário e
contagem; a função não registra o identificador.

## Instância temporária

O serviço existente (`hermes-gateway`, `127.0.0.1:8642`) não é reiniciado nem
reconfigurado. O teste roda numa segunda instância, que nasce e morre na mesma
sessão:

```
túnel SSH ──> Hermes temporário (127.0.0.1:8643, HERMES_HOME em /run/user/999)
                ├─ modelo:     limitador-modelo.mjs (loopback) ──> provedor
                └─ ferramenta: ponte MCP ──> função da homologação
```

| Item | Proposta |
|---|---|
| Dados | `HERMES_HOME` e `XDG_STATE_HOME` numa pasta nova em `/run/user/999` (memória, modo 700) |
| Configuração | cópia do `config.yaml` permanente (não tem segredos), ajustada só na cópia |
| Ajustes na cópia | modelo apontando para o limitador (`provider: custom`, `base_url` em loopback, `key_env`); `agent.max_turns: 2`; `agent.api_max_retries: 1`; `auxiliary.title_generation.enabled: false`; **`tools.tool_search.enabled: off`** |
| Porta | `127.0.0.1:8643`, com chave de API sorteada na hora |
| Chave do provedor | só no ambiente do processo do **limitador**; o Hermes recebe uma chave local sem valor fora dali |
| JWT do admin fictício | só no ambiente do processo do Hermes temporário (a ponte o recebe por `${VAR}`) |
| Entrada dos segredos | pela entrada padrão do SSH, com `read` e `export`; nunca em argumento de comando, arquivo ou histórico |
| Trava contra instalação | `HERMES_DISABLE_LAZY_INSTALLS=1`: se faltar algo, a instância falha em vez de instalar |
| Fim | matar os dois processos; apagar a pasta e a `/tmp/hermes-gw-*` que a instância criou |

Se a instância temporária não subir assim na VPS, o teste para. Não existe
plano B que cumpra as duas condições: o caminho antigo gravava no `.env`
permanente e reiniciava o serviço.

### Limitador de chamadas

`limitador-modelo.mjs` fica entre o Hermes e o provedor, só em loopback:

- deixa passar **no máximo 2** tentativas de chamada ao modelo; a terceira
  recebe 402 ali mesmo e não sai do processo;
- conta toda tentativa, inclusive a que o provedor recusa;
- é o único processo que conhece a chave do provedor;
- registra uma linha por tentativa, sem corpo, cabeçalho ou chave.

Sem ele não há máximo: o ensaio mostrou o Hermes tentando uma terceira chamada
por conta própria em dois casos (ver abaixo).

### Verificar que nada ficou

Antes e depois, na VPS:

- SHA-256 do `config.yaml` e do `.env` permanentes;
- PID, horário de início e reinícios do serviço existente;
- arquivos de `/home/hermes` modificados depois de um marcador;
- busca em disco pela chave do provedor e pelo JWT, com o padrão lido da
  entrada padrão: esperado zero;
- porta 8643 fechada, nenhuma `/tmp/hermes-gw-*` nova, `validar-tunel.sh` passando.

## Provedor, modelo e teto

| Item | Proposta | Estado |
|---|---|---|
| Provedor | OpenRouter, atrás do limitador | proposta |
| Modelo | `google/gemini-3-flash-preview` | chamada de ferramenta **confirmada na listagem oficial** (API pública de modelos, 24/11/2026: `tools` e `tool_choice` no modelo e nos 6 endpoints; janela de 1.048.576 tokens) |
| Preço listado | US$ 0,50 por milhão de tokens de entrada, US$ 3 de saída (varia por endpoint) | lido na mesma listagem |
| Chave | dedicada, limite de US$ 1 na própria chave, revogada ao fim | a criar pelo Artur |
| Limite bloqueia? | a documentação diz que, gasto o limite da chave, "the request is rejected with a `403` before it reaches a provider" | **documentado**, não testado |
| Limite nunca é ultrapassado? | a documentação não diz quando o limite é conferido; para o saldo da conta, diz que a cobrança é no fim da requisição | **pendente** |
| Conferência antes | `GET https://openrouter.ai/api/v1/key` devolve `limit`, `limit_remaining`, `usage`; recusar o teste se `limit` não for 1 | a fazer na execução |
| Máximo de chamadas ao modelo | 2, imposto pelo limitador | **comprovado no ensaio local**; pendente contra o provedor real |

## Passo a passo (para quando houver aprovação)

1. **Mac:** login do admin fictício (JWT em memória); sortear a chave de API da
   instância temporária.
2. **VPS, uma sessão SSH, como `hermes`:** anotar o estado de antes; criar a
   pasta em `/run/user/999`; copiar e ajustar o `config.yaml`; gravar o
   `limitador-modelo.mjs` nessa pasta; subir o limitador e depois
   `hermes gateway run`, cada um com o seu ambiente.
3. **Mac:** conferir `limit` da chave; abrir o túnel para 8643; rodar uma vez:

   ```bash
   HERMES_INFERENCIA_APROVADA=sim HERMES_API_URL=http://127.0.0.1:18643 HERMES_API_KEY="$KEY" \
     OUT_DIR=~/.medstation-homolog/inferencia \
     node ops/hermes-vps/inferencia/executar-teste-inferencia.mjs --executar
   ```

   Uma tentativa só. Se falhar, ler o registro antes de qualquer outra coisa.
4. **VPS:** encerrar os dois processos; rodar as verificações de "nada ficou";
   apagar a pasta temporária.
5. **Provedor:** revogar a chave. Anotar `usage` final e o número de
   requisições no painel.

## Executado e hipótese

### Ensaio local (executado no Mac, 25/11/2026 00:08 UTC)

```bash
HERMES_BIN=<hermes v0.23.1 local> node ops/hermes-vps/inferencia/ensaio/rodar-ensaio-local.mjs
```

Real: **Hermes v0.23.1, commit `3b4215785882`**, a ponte MCP da MedStation, o
limitador, o executor e o verificador. Simulado: o provedor de modelo
(`ensaio/provedor-simulado.mjs`) e a função da homologação
(`ensaio/funcao-simulada.mjs`). Tudo em loopback, com chaves sorteadas na hora
e pastas descartáveis. Resultado: 55 verificações, todas passaram.

| Cenário | O que o provedor simulado faz | O que o Hermes real fez |
|---|---|---|
| `normal` | 1ª chamada pede a ferramenta; 2ª responde | ofereceu ao modelo só a ferramenta sintética; executou-a uma vez; a 2ª chamada já levava `synthetic-staging`; o verificador reconheceu a resposta pelo mesmo identificador; 2 tentativas, nenhuma a mais |
| `repete` | pede a ferramenta em toda chamada | executou a ferramenta 2 vezes e, ao esgotar `max_turns`, **tentou uma 3ª chamada** (pedido de resumo); o limitador recusou com 402 e o provedor viu só 2; o Hermes não repetiu; registro `incomplete`, verificador recusa |
| `erro` | 1ª chamada devolve 500 | **repetiu a chamada sem fluxo**, apesar de `api_max_retries: 1`; executou a ferramenta uma vez; a chamada seguinte foi recusada pelo limitador; provedor viu só 2; registro `failed` |
| `coexistencia` | — | um segundo `gateway run`, com outro `HERMES_HOME`, subiu ao lado do primeiro, com e sem `XDG_STATE_HOME` isolado; o primeiro manteve o mesmo processo; isolado, o segundo não tocou a trava em `~/.local/state` |

Também observado no ensaio:

- **Segredos:** nenhuma das chaves do ensaio apareceu em disco (pasta
  temporária, instalação, pasta de estado, soquetes). A busca achou um segredo
  plantado de propósito, então ela funciona. Nenhum `.env` nem `auth.json` foi
  criado na pasta temporária.
- **Fora da pasta temporária:** o gateway cria `/tmp/hermes-gw-<id>/` (soquete
  de controle) e não apaga ao sair; grava a trava do host em
  `~/.local/state/hermes/gateway-locks/`, a menos que `XDG_STATE_HOME` aponte
  para outro lugar; e o Python grava cache de bytecode na pasta da instalação.
- **Dentro da pasta temporária:** cerca de 4 MB (configuração, logs, bancos da
  sessão com o pedido e a resposta sintéticos).

O que o ensaio corrigiu no plano:

1. **Tool Search.** Por padrão (`tools.tool_search.enabled: auto`) o Hermes
   esconde ferramentas MCP atrás de `tool_search`, `tool_describe` e
   `tool_call`. O modelo não recebe a ferramenta da MedStation diretamente e
   gasta uma ou duas chamadas a mais. Com `off`, recebe só ela.
2. **Formato do resultado.** Vem dentro de `<untrusted_tool_result>`; o
   verificador foi ajustado.
3. **`max_turns` não limita chamadas.** Só o limitador limita.
4. **Dependências.** A API precisa do conjunto `all` (o instalador oficial já
   usa; a VPS tem).

Como o Hermes foi posto no Mac: pelo método do CI do repositório
(`uv sync --frozen --python 3.14 --extra all` no commit fixado), numa pasta
descartável. O instalador oficial **não terminou** nesta rede: a CDN de
arquivos do GitHub não responde daqui e o registro do npm passa por um
firewall que troca o certificado, que o Hermes recusou. Não contornei.

### Verificações sem Hermes (executadas)

```bash
node --test ops/hermes-vps/inferencia/teste-local.mjs   # 20 de 20
```

Verificador (registro bom e nove tipos de registro ruim), executor (travas,
loopback, uma tentativa) e limitador (máximo, troca de chave, contagem de
falhas, destino só https ou loopback).

### Ainda é hipótese

| Hipótese | Por que não está comprovada |
|---|---|
| Um modelo real escolhe a ferramenta com o argumento certo | o provedor do ensaio é um roteiro fixo, não um modelo |
| O limitador funciona contra o OpenRouter real (https, fluxo) | só foi exercitado contra o provedor simulado em http |
| A instância temporária sobe na VPS usando a instalação existente | o ensaio foi no macOS, com o Hermes montado pelo método do CI; na VPS a instalação é a do instalador oficial, em Linux, com o serviço sob systemd |
| A segunda instância não perturba o serviço sob systemd | observado só entre dois processos avulsos |
| Nada é escrito na VPS fora do que o ensaio mostrou | idem |
| A pasta cabe em `/run/user/999` | no ensaio ocupou 4 MB; não medido na VPS |
| O limite de US$ 1 nunca é ultrapassado | a documentação não diz; ver tabela acima |
| A ponte alcança a função real a partir da instância temporária | no ensaio a função era simulada; o nível B real usou o processo avulso da ponte |

## O que depende da aprovação do Artur

1. **Criar a chave dedicada** no OpenRouter, com limite de US$ 1, e dizer como
   ela chega à VPS sem passar pelo chat.
2. **Aceitar o pendente do teto:** a requisição em andamento pode ultrapassar
   US$ 1; o limitador segura a quantidade (2), não o valor.
3. **Autorizar a instância temporária e o limitador na VPS** e a única
   requisição paga.
