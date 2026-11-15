# MedStation AI Core — Fase 3: plano de orquestração clínica (simulação)

## Implementação nesta branch
- `_shared/ai-core/clinical-workflows.ts`: único fluxo permitido nesta fase, `admission-review`, com etapas fixas de rascunho da admissão via Clínicus e interpretação laboratorial via Examinus.
- `_shared/ai-core/hermes-simulation.ts`: recebe proposta não confiável de um agente, valida o plano contra o catálogo e retorna apenas um **rastro simulado**.
- `src/lib/__tests__/ai-core-hermes-simulation.test.ts`: testes com contexto sintético, IDs inválidos, ferramentas não autorizadas, tentativas de injeção de etapas extras e ausência de contexto verificado.
- Correção da allowlist em `clinical-tool-contract.ts` para impedir nomes herdados do protótipo JS (`__proto__`, etc.).

## Segurança e limites
- **Sem instalação nem conexão ativa do Hermes Agent.**
- **Nenhuma chamada real** aos serviços de Clínicus/Examinus.
- Sem acesso ao banco, sem dados de paciente, sem criação de prontuário, sem prescrição, sem HTTP externo e sem deploy.
- Nenhuma rota pública foi criada: a simulação é módulo importável para testes offline, não endpoint acessível por usuários.
- Um modelo pode propor um plano, mas não pode fornecer `userId`, `patientId`, URLs, credenciais, prompts de sistema, nomes de modelos ou nova ferramenta.
- Propostas com etapas extras, tipos divergentes ou grafos diferentes são recusadas.
- Para habilitar execução real, a camada de API deve verificar usuário, associação do paciente e escopo de permissão no banco; exigir limites por conta e por fluxo, logs sem dados clínicos, timeouts, idempotência, revisão médica e testes clínicos.
- Hermes tem ferramentas próprias como terminal e navegador: não conceder essas permissões ao executor clínico. A integração futura deverá expor apenas ferramentas MedStation aprovadas por uma API de acesso mínimo.

## Prática de integração futura
1. Implantar Hermes isoladamente num ambiente de homologação, sem credenciais de pacientes e sem terminal conectado ao banco.
2. Publicar um servidor MCP ou API com allowlist mínima de ferramentas e contratos tipados.
3. Implementar `executeWorkflow` com autenticação server-side + RLS/ownership + rate limit + kill switch.
4. Rodar comparação cega com os fluxos atuais usando apenas casos sintéticos e métricas de fidelidade, latência e custo.
5. Exigir aprovação médica para documentos finais e qualquer ação de tratamento; não usar a memória do Hermes para guardar dados sensíveis ou aprender condutas automaticamente.
6. Somente habilitar por flag de homologação após revisão de segurança.

Documentação Hermes: https://hermes-agent.nousresearch.com/docs/user-guide/features/tools
