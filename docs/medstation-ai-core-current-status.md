# MedStation — Situação atual do AI Core/Hermes (15/11/2026)

## Importante: produção ≠ branch AI Core
- Repositório: `medneeds/medstation`.
- Branch de integração atual: `feat/medstation-ai-core-sync-20261115` (aberta a partir da `main` de 15/11/2026).
- PR para revisão: #20. PR #19 é histórico e ficou 4 commits atrás da `main`.
- A `main` da MedStation possui novidades em Studio/editor de assistentes, migração `0017_studio_long_assistant_instructions`, testes de coach e painéis de edição. Foram preservadas pela nova branch.
- **Não há deploy desta branch**; a MedStation publicada ainda funciona com o backend e gateway anteriores.
- O Hermes oficial v0.23.1 foi testado em runner de CI isolado, conectando ao MCP e descobrindo uma única ferramenta sintética; sem inferência de modelo ou execução clínica.

## Nova interface administrativa para revisão
- Adicionada `/admin/ai-core`, protegida por `AdminRoute requireAdmin`, no menu administrativo.
- A página é somente leitura e apresenta mapa do roteamento de IA, progresso dos componentes e arquitetura planejada.
- Mostra contagem de chamadas de IA vindas do serviço `admin-ai-usage`, com seleção de 7/30 dias. Ela não mede atividade do Hermes, que não está ativo.
- O painel mostra claramente o que foi implementado, testado e o que ainda está pendente, sem afirmar disponibilidade da produção.
- A URL só ficará disponível no aplicativo após revisão, merge e implantação segura desta branch. Não confundir com a URL da MedStation atualmente publicada.

## Observabilidade
- O endpoint administrativo de uso de IA passou a contar `unpriced_calls` e `unpriced_models`, além da soma dos custos conhecidos.
- Registros com `cost_usd=null` e registros históricos de GPT-6 Astra com custo zero são tratados como **não precificados**, não como uso gratuito.
- A visualização e exportação CSV do painel `/admin/uso-ia` informam a incompletude do custo. Os valores totais continuam estimativas parciais, não faturas de fornecedores.
- Não se deduz tarifa do modelo a partir do nome; a reconciliação contratual permanece pendente.

## Próximos critérios de liberação
1. Revisar GitHub Actions do PR #20: Vitest, build, preflight MCP e Hermes CLI oficial no runner.
2. Revisar segurança de `ai-core-hermes-sandbox`, autenticação, flags e retenção de logs.
3. Criar staging realmente independente e verificar dados sintéticos; a conta Supabase gratuita já atingiu o limite de projetos ativos, portanto isso requer decisão de infraestrutura.
4. Validar qualidade clínica com casos sintéticos e revisão médica antes de acessar dados reais.
5. Liberar inicialmente só o painel administrativo de leitura e os componentes seguros, mantendo o Hermes clínico desligado por padrão.

Não usar o resultado dos testes do CI como prova de implantação, acesso aos pacientes ou autonomia clínica.
