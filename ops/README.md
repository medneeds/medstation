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

- [`hermes-vps/`](hermes-vps/README.md) — como o Hermes foi instalado na VPS, como
  validar pelo túnel SSH e como remover tudo.
- [`supabase-homologacao/`](supabase-homologacao/README.md) — comparação entre as
  sete migrações aplicadas na homologação e as migrações do repositório, as
  divergências encontradas e o plano (não aplicado) para corrigi-las.
- [`RESULTADOS-2026-11-24.md`](RESULTADOS-2026-11-24.md) — resultado dos testes de
  login, Hermes e Stripe, com a evidência de cada um.

## Regras que valem para qualquer mudança em `ops/`

1. Nenhum segredo entra no Git. Arquivos de exemplo trazem só nomes de variáveis.
2. Nada aqui é aplicado em produção. Scripts recusam o ref de produção quando
   recebem um projeto como parâmetro.
3. E-mails e pagamentos reais ficam desligados na homologação: não há provedor
   de e-mail, `pg_cron`/`pg_net` nem chave do Stripe configurados lá.
4. O Hermes da homologação não enxerga ferramenta nativa nenhuma (terminal,
   arquivos, web). A única ferramenta é a ponte sintética
   `medstation_simulate_admission`.
