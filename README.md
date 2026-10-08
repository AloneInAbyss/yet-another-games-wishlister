# YAGW: Yet Another Games Wishlister

Listas de desejos de jogos com preços da Steam atualizados diariamente, filtros customizados,
prioridade por arrastar e soltar e link público para compartilhar.

Repositório: https://github.com/AloneInAbyss/yet-another-games-wishlister

## Como funciona

- **Contas**: entrar com a Steam, sem senha. No primeiro acesso a pessoa escolhe
  o endereço da lista (`/u/<nome>`). Em "Configurações" dá para trocar o nome, deixar a lista privada
  e excluir a conta.
- **Importar da Steam**: soma a wishlist da Steam (da conta conectada ou de um link de perfil) ao fim
  da lista, na ordem da Steam, sem remover nada. A wishlist precisa estar pública.
- **Adicionar jogos**: buscar pelo nome ou colar um ou vários links da loja
  (`store.steampowered.com/app/...`). Na aba "Vários de uma vez" dá para colar até 50 nomes (um por
  linha, por exemplo uma coluna do Notion): o site encontra cada jogo, mostra uma revisão (exatos,
  para conferir e não encontrados) e adiciona os escolhidos. Preço em R$, desconto, tags, acesso
  antecipado, lançamento e avaliações vêm da Steam.
- **Seus campos**: duração (horas) e notas, pelo ícone de lápis, com atalho para o HowLongToBeat.
- **Prioridade**: com a ordenação "Prioridade", arraste os jogos pela alça à esquerda ou use
  "Mover para o topo".
- **Filtros**: faixa de preço, só em promoção, % mínima de avaliações positivas, acesso antecipado,
  lançados/em breve, tags da Steam (todas ou qualquer uma) e busca por nome. O estado dos filtros fica
  na URL, então "Copiar link" compartilha exatamente a visão filtrada.
- **Preços**: um cron diário atualiza os dados de todos os jogos.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha CRON_SECRET
npm run db:migrate           # cria/atualiza as tabelas no banco SQLite local (local.db)
npm run dev                  # http://localhost:3000
```

Para gerar segredos: `openssl rand -hex 32`. O login com a Steam funciona em localhost sem
configuração.

Para testes automatizados, `ALLOW_DEV_LOGIN=1` libera `/api/auth/dev?name=<nome>` (só com `npm run dev`;
em produção a rota sempre responde 404).

### Banco de dados

- Mudou o schema? `npm run db:generate` cria uma migração nova em `drizzle/` e `npm run db:migrate`
  aplica. Não use `drizzle-kit push` em bancos com dados.

## Estrutura

- `src/db/schema.ts`: `users`, `accounts` (Steam), `sessions`, `wishlist_items` (dados de cada
  pessoa), `games` (cache dos dados da Steam compartilhado entre todas as listas), `steam_tags`,
  `rate_limits` e `app_state`.
- `src/lib/steam.ts`: chamadas à Steam (busca, dados em lote de até 100 jogos, tags, wishlist, perfil).
- `src/lib/steam-client.ts`: por onde passam todas as chamadas à Steam. Limita o volume, tenta de novo
  quando a Steam limita e pausa tudo por alguns minutos se ela continuar recusando.
- `src/lib/rate-limit.ts`: limites por usuário/IP (busca, importação, login, cadastro…).
- `src/lib/auth.ts`, `src/lib/accounts.ts`, `src/lib/oauth.ts`: sessões e login com a Steam (OpenID).
- `src/lib/wishlist.ts`: regras de dados da lista. Toda alteração é restrita ao dono.
- `src/lib/validation.ts`: validação de entrada (zod) e limites (500 jogos por lista).
- `src/lib/filters.ts`: filtros e ordenações (executados no navegador).
- `src/app/actions.ts`: Server Actions (todas exigem login e devolvem mensagens amigáveis).
- `src/app/api/cron/refresh`: endpoint chamado pelo Cron.
