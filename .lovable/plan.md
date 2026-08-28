# Diagnóstico PostHog — resultado e próximos passos

## O que foi verificado (somente leitura)

SDK instalado: `posthog-js@1.407.8`.

1. `sanitize_properties` existe no runtime do SDK 1.407.8 (opção legada, ainda suportada). Não é a causa.
2. `advanced_disable_flags: true` apenas suprime a chamada `/flags/`. Não bloqueia captura.
3. Não há opt-out por padrão; `has_opted_out_capturing()` = false e persistência normal.
4. Filtro de bot: o SDK descarta silenciosamente TODAS as capturas quando `isLikelyBot` retorna true. A checagem usa `navigator.userAgentData.brands` (Chromium headless anuncia marca "HeadlessChrome") além de `navigator.webdriver`. Trocar a string de User-Agent e sobrescrever `navigator.webdriver` NÃO evita essa detecção.
5. Harness isolado em /tmp (fora do repositório), com o mesmo token público:
   - `posthog._is_bot()` retornou **true** em todos os cenários Playwright;
   - config mínima: só houve request de `/array/<token>` (config), nenhum `/e/`;
   - config completa do app: zero requests;
   - portanto, nenhum dos testes de navegador anteriores conseguia provar envio de eventos.
6. Região: `.env` define região `us`. O host EU respondeu `401` em `/flags/` e `404` em `/array/<token>` para esse token; o host US respondeu `200` em `/array/<token>`. O projeto é US.
7. Ingestão direta (sem SDK) em `https://us.i.posthog.com/i/v0/e/` retornou **HTTP 200 `{"status":"Ok"}`** com o evento autorizado `medstation_telemetry_diagnostic` (sem PII). O pipeline de ingestão funciona.

## Conclusão

Não há prova de que o PostHog esteja quebrado em produção para usuários reais. Toda a "ausência de eventos" observada até agora é explicada pelo filtro de bot do SDK em navegador automatizado. Existe, porém, um risco real e separado: `src/lib/analytics.ts` usa fallback para EU quando `VITE_LOVABLE_CONNECTOR_POSTHOG_REGION` não está presente no ambiente de build, e o token é de um projeto US — nesse caso a ingestão falharia silenciosamente.

## Plano proposto

1. Confirmar com tráfego humano real: abrir o site em um navegador comum e verificar no PostHog se `$pageview` e `cta_click` chegam. Alternativa sem navegador humano: comparar a contagem de eventos do projeto antes/depois de uma visita real.
2. Endurecer a região no código: derivar o host do próprio ambiente sem fallback silencioso — se a região não estiver definida, registrar aviso e não assumir EU. (mudança de 1 arquivo, `src/lib/analytics.ts`)
3. Verificar que `VITE_LOVABLE_CONNECTOR_POSTHOG_REGION` e o token estão presentes no bundle publicado (o token já foi confirmado no bundle atual; validar a região).
4. Opcional: adicionar um sinalizador de debug (`?ph_debug=1`) que loga no console o host efetivo e o resultado de `_is_bot()`, para diagnósticos futuros sem novas auditorias.
5. Não alterar `sanitize_properties` nem `advanced_disable_flags` — ambos estão corretos para a versão instalada e para a política de privacidade do projeto.

## Detalhes técnicos

- Arquivos envolvidos na correção mínima: `src/lib/analytics.ts` (host/região e log de debug).
- Nada de migrations, Stripe, auth ou mudança visual.
- Testes de navegador automatizado nunca servirão como prova de ingestão PostHog enquanto o filtro de bot estiver ativo; a validação deve ser feita por tráfego real ou pela API de leitura do PostHog.
