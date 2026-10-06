# YAGW: Yet Another Games Wishlister

Lista de desejos pessoal de jogos com preços da Steam atualizados diariamente,
filtros customizados, prioridade por arrastar e soltar e link público para compartilhar.

Repositório: https://github.com/AloneInAbyss/yet-another-games-wishlister

## Como funciona

- **Cadastro**: no botão "Adicionar jogos", busque pelo nome ou cole um ou vários links da loja
  (`store.steampowered.com/app/...`). Os dados (preço em R$, desconto, gêneros, acesso antecipado,
  data de lançamento e avaliações) vêm da Steam.
- **Seus campos**: duração (horas) e notas, editáveis pelo ícone de lápis. O diálogo tem um atalho
  para o HowLongToBeat.
- **Prioridade**: com a ordenação "Prioridade", arraste os jogos pela alça à esquerda ou use
  "Mover para o topo".
- **Filtros**: faixa de preço, só em promoção, % mínima de avaliações positivas, acesso antecipado,
  lançados/em breve, gêneros e busca por nome. O estado dos filtros fica na URL, então "Copiar link"
  compartilha exatamente a visão filtrada.
- **Preços**: um cron diário atualiza todos os preços (e os detalhes completos de 40 jogos por vez,
  em rodízio). Também há o botão "Atualizar preços" e o ícone de atualizar por jogo. O app guarda o
  histórico de preços e mostra o menor preço registrado.
- **Acesso**: qualquer pessoa com o link vê a lista; só quem entra com a senha (`/login`) edita.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha ADMIN_PASSWORD, SESSION_SECRET e CRON_SECRET
npm run db:push              # cria as tabelas no banco SQLite local (local.db)
npm run dev                  # http://localhost:3000
```

Para gerar segredos: `openssl rand -hex 32`.

## Estrutura

- `src/db/schema.ts`: tabelas `games` (cache dos dados da Steam), `wishlist_items` (seus dados:
  posição, duração, notas) e `price_history`. A separação facilita ter vários usuários no futuro:
  basta adicionar um `user_id` em `wishlist_items`.
- `src/lib/steam.ts`: chamadas à loja da Steam (busca, detalhes, preços em lote, avaliações).
- `src/lib/wishlist.ts`: regras de dados (adicionar, reordenar, atualizar preços).
- `src/lib/filters.ts`: filtros e ordenações (executados no navegador).
- `src/app/actions.ts`: Server Actions (todas exigem login).
- `src/app/api/cron/refresh`: endpoint chamado pelo Cron.
