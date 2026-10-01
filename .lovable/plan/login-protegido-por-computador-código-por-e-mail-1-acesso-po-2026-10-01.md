# Login protegido por computador (código por e-mail + 1 acesso por vez)

## Como fica para o médico

```text
Entra com e-mail e senha (ou Google)
        |
  Este computador já é conhecido?
     /                 \
   SIM                 NÃO
 entra direto      recebe código de 6 dígitos por e-mail
                   digita o código -> entra
        \                 /
   Todos os outros acessos abertos são encerrados
```

- No computador de sempre, nada muda: o login segue direto. O aparelho fica reconhecido por 30 dias.
- Em um computador novo, aparece a tela "Confirme que é você", com 6 campos para o código. Tem também o botão "Reenviar código" (liberado a cada 60 s). O código vale por 10 minutos e aceita até 5 tentativas.
- Ao entrar, qualquer outro computador ou celular conectado é desligado em até 1 minuto. Lá aparece o aviso "Sua conta foi acessada em outro aparelho".
- Nova caixa na tela de login: "Computador compartilhado (hospital)". Quando marcada:
  - o computador não fica reconhecido;
  - o acesso cai ao fechar o navegador ou após 30 min sem uso.
- Proteção para não travar o login: se o envio do e-mail ou a verificação falharem por um problema nosso, o médico entra mesmo assim e a falha fica registrada para a equipe.
- Na estreia, ninguém é surpreendido: quem já estiver logado tem o aparelho atual reconhecido automaticamente.
- Em Configurações, nova lista "Aparelhos reconhecidos", com o botão "Remover".

## O que muda

1. Banco de dados:
   - aparelhos reconhecidos de cada usuário;
   - códigos temporários, guardados de forma cifrada;
   - qual aparelho é o acesso ativo atual.
2. Duas funções no servidor:
   - verificar o aparelho e enviar o código;
   - confirmar o código, reconhecer o aparelho e marcá-lo como o único acesso ativo.
3. Novo e-mail no padrão MedStation: "Seu código de acesso", informando o código, o horário e o navegador.
4. Tela de login e entrada com Google passam pela etapa do código quando o aparelho for novo.
5. A proteção de páginas internas checa ao abrir a página, ao voltar para a aba e a cada 60 s se este aparelho ainda é o acesso ativo. Se não for, desliga.
6. Painel admin segue a mesma regra.

## Detalhes técnicos

- Identificação do aparelho: um id aleatório guardado no navegador. O servidor guarda apenas o hash.
- Tabelas: `trusted_devices` (user_id, device_hash, label, last_used_at, expires_at), `login_challenges` (user_id, device_hash, code_hash, expires_at, attempts) e `active_sessions` (user_id, device_hash, updated_at). Todas com RLS: o usuário só lê os próprios dados, e a escrita é feita apenas pelo servidor.
- Funções `device-check` e `device-verify`, validando o login dentro do código. Depois da verificação, encerramos os outros acessos com `signOut({ scope: 'others' })`. A checagem periódica do acesso ativo derruba de imediato o aparelho antigo, sem esperar o token expirar.
- Computador compartilhado: um marcador no navegador, sem alterar o cliente gerado automaticamente. Se a aba for reaberta sem o marcador da sessão, o usuário é deslogado.
- Os e-mails já existentes continuam iguais. As funções novas são publicadas ao final da implementação. O site só é publicado quando você pedir.
