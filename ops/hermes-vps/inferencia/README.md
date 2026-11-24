# Teste de inferência do Hermes (nível C): roteiro

> Escrito pelo Claude em 24/11/2026. **Nada aqui foi executado contra o Hermes
> real.** Nenhum provedor foi configurado, nenhuma chamada paga foi feita e a
> VPS não foi tocada. Só rodaram as verificações locais do fim deste arquivo.

A ponte → função (nível B) passou em 24/11/2026 23:06 UTC e está registrada em
`../../RESULTADOS-2026-11-24.md`. Este roteiro é só o passo seguinte: um modelo,
dentro do Hermes, decidir chamar a ferramenta.

## O cenário, um só

Uma única requisição `POST /v1/responses` ao Hermes, pelo túnel SSH, com este
pedido (o identificador é sorteado na hora):

> Rode a simulação sintética de admissão da MedStation para o identificador
> `synthetic_e2e_<12 hex>`. Use a ferramenta disponível uma única vez e
> responda em uma frase com o ambiente e as etapas que ela devolveu.

Sem paciente, sem texto clínico. O único dado que viaja é o identificador
sintético. Para ver a requisição exata sem enviar nada:

```bash
node ops/hermes-vps/inferencia/executar-teste-inferencia.mjs
```

## Como comprovar, no mesmo registro

O registro é a resposta JSON dessa única requisição. No Hermes v0.23.1 ela
traz em `output`, na ordem, os três fatos:

| Fato | Onde aparece | O que o verificador exige |
|---|---|---|
| Decisão do modelo | item `function_call` | exatamente uma chamada; `name` = `mcp__medstation_sandbox__medstation_simulate_admission`; `arguments` = só `{"requestId": "<o identificador sorteado>"}` |
| Chamada da ferramenta | item `function_call_output` | mesmo `call_id` da chamada, depois dela, `status: completed`; o Hermes executa a ferramenta, o modelo não escreve este item |
| Resposta da função | texto dentro de `function_call_output` | `environment` = `synthetic-staging`; `simulation.requestId` = o identificador sorteado; `mode: simulation`, `workflow: admission-review`, `requiresMedicalReview: true`; as duas etapas (`clinicus`, `examinus`) |
| Fecho | item `message` | resposta final do modelo depois do resultado |

O identificador sorteado é o que amarra tudo: ele sai no pedido, volta nos
argumentos escolhidos pelo modelo e volta de novo na resposta. A ponte só
devolve `synthetic-staging` com esse identificador se a função da homologação
tiver respondido assim (`hermes-bridge/server.mjs`, `sanitizeSimulation`).

Um modelo que só *diga* que deu certo, sem os itens de ferramenta, não passa.

**O que fica gravado** (arquivo local, modo 600): identificador, horários,
status HTTP, modelo pedido, os itens acima, a contagem de tokens e o resultado
de cada verificação. **O que nunca fica:** cabeçalhos, a chave da API do
Hermes, a chave do provedor, o JWT. O verificador ainda recusa o registro se
encontrar formato de token, segredo, CPF ou e-mail.

**Conferência independente** (fora do registro, somente leitura): nos logs da
função `ai-core-hermes-sandbox` na homologação, exatamente uma invocação `POST`
com 200 entre o início e o fim gravados. A função não registra o
identificador, então essa conferência é por horário e contagem.

## Credencial: o menor escopo

| Item | Recomendação |
|---|---|
| Chave | criada só para este teste; não reutilizar nenhuma chave da produção nem da Lovable |
| Limite | teto rígido no próprio provedor, por chave ou por saldo pré-pago sem recarga automática: **US$ 1** (ou o mínimo que o provedor aceitar) |
| Modelo | o menor que tenha chamada de ferramentas e janela de pelo menos 64 mil tokens (exigência do Hermes); se o provedor permitir, restringir a chave a esse modelo |
| Validade | revogar logo depois do teste, passe ou falhe |
| Onde vive | só em `/home/hermes/.hermes/.env` na VPS (modo 600), enviada por entrada padrão; nunca em chat, Git ou log |

Um provedor que atende a isso com uma única variável no Hermes é o OpenRouter
(`OPENROUTER_API_KEY`, com limite de crédito por chave). Conferir no painel do
provedor escolhido que o limite é rígido e não só um alerta.

Consumo esperado: 2 chamadas ao modelo (uma decide a ferramenta, outra
responde). A documentação do Hermes fala em 4 a 8 mil tokens só de instruções
e ferramentas por chamada, então a ordem de grandeza é de até 20 mil tokens de
entrada e poucas centenas de saída. O número real sai no registro (`usage`).
O Hermes não tem teto de custo próprio: o teto de verdade é o do provedor.

## O que muda na VPS, temporariamente

Tudo com cópia de segurança antes e restauração depois:

| Arquivo | Mudança |
|---|---|
| `~/.hermes/.env` | a chave do provedor; `MEDSTATION_STAGING_JWT` (JWT do admin fictício, vale 1 hora) |
| `~/.hermes/config.yaml` | `model.provider` e `model.default` com o modelo escolhido; `agent.max_turns: 3`; `auxiliary.title_generation.enabled: false` |
| serviço | `hermes gateway restart`, para a ponte receber o JWT |

`max_turns: 3` impede a conversa de se alongar. Desligar o título automático
evita uma chamada paga a mais depois da resposta. O serviço continua em
`127.0.0.1:8642`; nenhuma porta, firewall ou SSH muda.

## Passo a passo (para quando houver aprovação)

**A. Preparar** — na VPS, como `hermes`:

```bash
grep -c -E '^(MEDSTATION_STAGING_JWT|[A-Z_]*API_KEY)=.+' ~/.hermes/.env   # anotar o número (medido em 24/11: 0 JWT, 0 chave de provedor)
cp -p ~/.hermes/config.yaml ~/.hermes/config.yaml.pre-inferencia
cp -p ~/.hermes/.env        ~/.hermes/.env.pre-inferencia
hermes config set model.provider <provedor>
hermes config set model.default  <modelo>
hermes config set agent.max_turns 3
hermes config set auxiliary.title_generation.enabled false
# chave do provedor e JWT entram por entrada padrão, anexados ao .env (modo 600)
hermes gateway restart
hermes mcp test medstation_sandbox     # ainda 1 ferramenta
```

**B. Executar** — no Mac, com o túnel aberto como em `validar-tunel.sh` e a
chave da API do Hermes lida da VPS para uma variável:

```bash
HERMES_INFERENCIA_APROVADA=sim HERMES_API_KEY="$KEY" OUT_DIR=~/.medstation-homolog/inferencia \
  node ops/hermes-vps/inferencia/executar-teste-inferencia.mjs --executar
```

Uma tentativa só. Se falhar, não repetir antes de ler o registro: repetir é
outra chamada paga.

**C. Remover** — sempre, passe ou falhe:

```bash
# na VPS, como hermes
cp -p ~/.hermes/config.yaml.pre-inferencia ~/.hermes/config.yaml
cp -p ~/.hermes/.env.pre-inferencia        ~/.hermes/.env
rm -f ~/.hermes/config.yaml.pre-inferencia ~/.hermes/.env.pre-inferencia
hermes gateway restart
grep -c -E '^(MEDSTATION_STAGING_JWT|[A-Z_]*API_KEY)=.+' ~/.hermes/.env   # o mesmo número anotado no passo A
```

Depois: apagar a resposta guardada pelo Hermes
(`DELETE /v1/responses/<id do registro>`, pelo túnel), **revogar a chave no
painel do provedor**, e rodar `ops/hermes-vps/validar-tunel.sh` para confirmar
que o serviço voltou ao estado de antes (0 de 26 toolsets nativos, loopback).

## O que o teste prova e o que não prova

Prova: que um modelo, dentro do Hermes da homologação, escolheu a ferramenta
da MedStation com o argumento certo e que a resposta da função chegou a ele.

Não prova: qualidade clínica, comportamento com dados reais, execução de
agentes de verdade (a função só simula), estabilidade, nem custo em uso real.

Incertezas que só a execução resolve:

- Nunca vi o Hermes oferecer a ferramenta a um modelo. A configuração diz que
  a API só enxerga `medstation_sandbox`, e a descoberta funciona, mas a lista
  que o modelo recebe não foi observada.
- O formato da resposta vem da leitura do código do Hermes no commit fixado,
  não de uma resposta real.
- Se o provedor fizer chamadas além das duas previstas, o teto da chave é o
  que segura.

## Verificações locais, sem credencial (executadas)

```bash
node --test ops/hermes-vps/inferencia/teste-local.mjs      # 15 de 15
node ops/hermes-vps/inferencia/executar-teste-inferencia.mjs   # ensaio: mostra a requisição, não envia
```

O que é real nesses testes: a ponte da MedStation, o verificador e o executor.
O que é simulado: o Hermes, o modelo e a função da homologação.

| Verificação | Resultado |
|---|---|
| Registro bom, com o texto que a ponte real devolve, passa em tudo | passou |
| Modelo que responde sem chamar a ferramenta | recusado |
| Modelo que só afirma o resultado, sem item de ferramenta | recusado |
| Ferramenta errada, argumento errado ou argumento a mais | recusado |
| Resposta com identificador de outra chamada | recusado |
| Erros da ponte (função desligada, sem JWT, resposta inesperada) | recusado |
| Duas chamadas, resposta incompleta, identificador fora do padrão | recusado |
| Registro com formato de token, segredo, CPF ou e-mail | recusado |
| Executor sem as duas travas, sem chave ou fora do loopback | recusa sem enviar |
| Executor com as travas contra o Hermes simulado | 1 requisição, registro gravado sem a chave |
| Falha (modelo não chama, chave errada) | termina em falha, sem repetir |

## O que depende da aprovação do Artur

1. **Provedor e modelo**, e criar a chave dedicada com teto rígido de US$ 1.
2. **Como a chave chega à VPS:** ele mesmo grava, ou autoriza ler de um
   arquivo local (modo 600) e enviar por entrada padrão.
3. **A chamada paga:** uma requisição, uma tentativa.
4. **A mudança temporária na VPS** descrita acima, com restauração ao fim.
