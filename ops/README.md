# Operação da homologação fora da Lovable

> **Origem deste diretório.** Tudo em `ops/` foi escrito pelo Claude (Claude Code)
> em 24/11/2026, a partir do código do PR #20 e da documentação oficial do
> Hermes Agent v0.23.1. O arquivo `medstation-noturno.patch` e os antigos
> `ops/README.md` e `ops/hermes-vps` **não foram encontrados** (nem no Mac, nem em
> nenhuma branch do repositório), então nada aqui é conteúdo recuperado.

## Ambientes

| Papel | Identificação | Regra |
|---|---|---|
| Produção (Lovable) | Supabase `rwiovxyftfbkvzbepfqi` | Não consultar nem alterar a partir daqui. O ref aparece só como "trava" contra confusão de ambiente. |
| Homologação — banco e login | Supabase `qcvvwbbeuvawgccstyro` ("MedStation Project", `us-west-2`, Postgres 17) | Somente dados fictícios. |
| Homologação — Hermes | VPS Hostinger KVM 2, Ubuntu 26.04 (endereço fora do Git: este repositório é público) | Serviço só em loopback; acesso por túnel SSH. |

## O que existe aqui

- [`RESULTADOS-2026-11-24.md`](RESULTADOS-2026-11-24.md) — resultado de cada
  fluxo, comandos para repetir, o que mudou e o que não mudou, reversão e a
  menor decisão pendente. **Comece por aqui.**
- [`hermes-vps/`](hermes-vps/README.md) — como o Hermes foi instalado na VPS, os
  três níveis de teste, como validar pelo túnel SSH e como remover tudo.
- [`supabase-homologacao/`](supabase-homologacao/README.md) — comparação das
  migrações, divergências, plano de privilégios em duas fases (não aplicado) e
  as verificações (banco local e API).
- [`frontend-homologacao/`](frontend-homologacao/README.md) — app rodando
  localmente contra a homologação, dependências da Lovable no login e lista
  para um preview protegido.
- [`stripe-sandbox/`](stripe-sandbox/README.md) — mapa de checkout, retorno,
  webhook e direito de acesso, e o que impede um teste em sandbox.

## Regras que valem para qualquer mudança em `ops/`

1. Nenhum segredo entra no Git. Arquivos de exemplo trazem só nomes de variáveis.
2. Nada aqui é aplicado em produção. Scripts recusam o ref de produção quando
   recebem um projeto como parâmetro.
3. E-mails e pagamentos reais ficam desligados na homologação: não há provedor
   de e-mail, `pg_cron`/`pg_net` nem chave do Stripe configurados lá.
4. O Hermes da homologação não enxerga ferramenta nativa nenhuma (terminal,
   arquivos, web). A única ferramenta é a ponte sintética
   `medstation_simulate_admission`.
