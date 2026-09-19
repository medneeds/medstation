# CABEÇALHO ÚNICO DOS ASSISTENTES

## RESULTADO

- Substituir as duas faixas atuais por um único cabeçalho compacto nas páginas dos assistentes.
- Ganhar espaço vertical para a conversa sem remover nenhuma função.
- Manter o restante da plataforma com o cabeçalho atual.

## DISTRIBUIÇÃO

- Esquerda: botão do menu, ícone e nome do assistente.
- Próximo ao nome: seletor do caso atual, em largura compacta.
- Centro: busca global, reduzida quando o espaço apertar.
- Direita: Workflow, Foco, Nova conversa e Histórico como botões de ícone com dicas ao passar.
- Extremo direito: ajuda, tema, notificações e perfil, já existentes.
- Nome da conversa atual aparece discretamente abaixo ou ao lado do nome do assistente, somente quando houver espaço.

## COMPORTAMENTO RESPONSIVO

- Desktop: todos os grupos permanecem na mesma faixa.
- Telas menores: busca e textos auxiliares cedem espaço primeiro; ações ficam apenas em ícones.
- Mobile: nome do assistente e ações principais permanecem visíveis, sem alterar o funcionamento atual.

## DETALHES TÉCNICOS

- Criar um encaixe compartilhado entre o cabeçalho da plataforma e cada assistente para que os controles do chat ocupem a faixa superior existente.
- Remover apenas a faixa visual duplicada de `AgentChat`; histórico, novo chat, foco, Workflow e seleção de caso mantêm os estados e ações atuais.
- Usar os componentes e tokens visuais já existentes, com foco visível, rótulos acessíveis e dicas nos ícones.
- Validar Clínicus e outro assistente no desktop e no mobile, incluindo abertura do histórico, troca de caso, novo chat, Foco e Workflow.
