# qr.tecê

Rede social brasileira inspirada no Orkut, feita para millennials: sem algoritmo,
sem anúncios, sem métrica de vaidade. Feed cronológico, comunidades, depoimentos
com aprovação e entrada apenas por convite.

> **Projeto encerrado em 30/05/2026.** O backend, o banco de dados e a VPS foram
> desligados, e os dados dos usuários foram eliminados. O código continua aqui
> como registro e material de estudo — mas não existe mais nenhum serviço no ar.
> O app mobile publicado na Play Store também não funciona mais.

---

## FEATURES

- **Acesso por convite** — cadastro só com código válido, com rastreio de quem convidou quem
- **Perfis** — bio, cidade, frase, foto, capa, papel de parede e status manual
- **Feed cronológico** — posts com imagem, likes, comentários em thread e repost com citação
- **Comunidades** — capa, papéis (dono, moderador, membro), convites com deep link
- **Depoimentos** — o clássico do Orkut, com fila de aprovação antes de aparecer no perfil
- **Conquistas** — sistema de badges com critérios e edições numeradas
- **Reputação** — pontuação derivada de eventos, recalculada por cron
- **Notificações push** — via Expo, com preferências por tipo
- **Painel admin** — convites, usuários, métricas e concessão de badges

## Stack

| Camada | Tecnologia |
|---|---|
| Web | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Mobile | Expo SDK 54 + React Native + expo-router + TanStack Query 5 |
| Banco | PostgreSQL + Prisma 7 (adapter `pg`) |
| Auth | JWT em cookie httpOnly (`jose`) + bcrypt |
| E-mail | Resend |
| Infra | VPS + Nginx (rate limiting e headers de segurança) + PM2 |

O mesmo backend Next.js servia o site e o app: as rotas em `src/app/api/` eram
consumidas pelos dois clientes.

## Estrutura

```
src/          aplicação web + API (Next.js App Router)
  app/api/    endpoints REST consumidos pelo site e pelo app
mobile/       aplicativo Expo / React Native
prisma/       schema, migrations e seed
nginx.conf    proxy reverso, rate limiting e headers de segurança
```

## Rodando localmente

Você precisa de Docker (para o Postgres) e Node.

```bash
# 1. copie o exemplo de ambiente e preencha as variáveis
cp .env.example .env

# 2. suba o banco
docker compose -f docker-compose.dev.yml up -d

# 3. aplique as migrations
npm run db:migrate

# 4. popule com o admin inicial e alguns convites
#    (ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórias — o seed aborta sem elas)
ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD=uma-senha-forte npm run db:seed

# 5. rode
npm run dev
```

Para o app mobile, veja `mobile/`. O build precisa de um `google-services.json`
próprio, baixado do console do Firebase — o arquivo não é versionado.

## Licença

[MIT](LICENSE) — use, modifique e redistribua à vontade, mantendo o aviso de
copyright.
