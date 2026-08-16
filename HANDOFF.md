# Handoff — tecê

**Última atualização:** 2026-05-05  
**Status:** Ambiente local funcionando. MVP testado e validado. Próximo passo: refinar UX e corrigir bugs encontrados nos testes.

---

## O que é o projeto

Rede social web chamada **tecê** — inspirada no Orkut, para millennials brasileiros.  
Sem algoritmo, sem ads. Feed cronológico, comunidades, depoimentos com aprovação, acesso por convite.

**Documentação completa:** mantida em ferramenta interna (não pública).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 |
| Banco | PostgreSQL (via Docker) |
| ORM | Prisma 7 + adapter `pg` |
| Auth | JWT em cookie httpOnly (via `jose`) |
| Deploy alvo | VPS própria + Nginx + Docker |

> **Atenção:** este projeto usa Next.js 16 e Prisma 7 — versões com breaking changes em relação às versões mais comuns. Leia `node_modules/next/dist/docs/` antes de qualquer mudança no framework.

---

## O que foi implementado (Etapa 1)

### Banco de dados — `prisma/schema.prisma`

Modelos completos:
- `User` — perfil completo (bio, cidade, estado, frase, ano de nascimento)
- `Invite` — convite único, com expiração e rastreio de quem usou
- `Community` + `CommunityMember` — comunidades com roles (OWNER, MOD, MEMBER)
- `Post` + `Like` + `Comment` — posts com likes e comentários
- `Depo` — depoimentos com status (PENDING, APPROVED, REJECTED)

### Autenticação

| Arquivo | Responsabilidade |
|---|---|
| `src/app/api/auth/login/route.ts` | Login — valida credenciais, emite JWT em cookie httpOnly |
| `src/app/api/auth/cadastro/route.ts` | Cadastro — valida convite, cria usuário, marca convite como usado |
| `src/app/api/auth/logout/route.ts` | Logout — limpa o cookie |
| `src/app/api/auth/me/route.ts` | Retorna dados do usuário autenticado |
| `src/middleware.ts` | Protege rotas: redireciona não-autenticados e não-admins |
| `src/lib/auth.ts` | Helpers: assinar/verificar JWT, extrair usuário do cookie |
| `src/lib/bcrypt.ts` | Hash e verificação de senha (bcryptjs) |
| `src/lib/rate-limit.ts` | Rate limiting básico em memória para rotas de auth |
| `src/lib/validations.ts` | Schemas Zod de validação |
| `src/lib/prisma.ts` | Singleton do PrismaClient |

### Páginas e componentes

| Rota | O que faz |
|---|---|
| `/` (login) | Tela de login |
| `/cadastro` | Cadastro com código de convite |
| `/(app)/home` | Feed cronológico com form de novo post |
| `/(app)/perfil/[username]` | Perfil público + form para escrever depo |
| `/(app)/depos/recebidos` | Depos recebidos com ações de aprovar/rejeitar |
| `/(app)/editar-perfil` | Editar dados do próprio perfil |
| `/(app)/comunidades` | Lista de comunidades + botão entrar |
| `/(app)/comunidades/criar` | Criar nova comunidade |
| `/(app)/comunidades/[slug]` | Feed da comunidade |
| `/admin` | Painel admin |
| `/admin/convites` | Gerar convites |
| `/admin/usuarios` | Listar e ativar/desativar usuários |

### APIs REST

```
POST /api/auth/login
POST /api/auth/cadastro
POST /api/auth/logout
GET  /api/auth/me
GET  /api/users/me
PATCH /api/users/me

GET  /api/posts
POST /api/posts
POST /api/posts/[id]/like

GET  /api/depos
POST /api/depos
PATCH /api/depos/[id]   (aprovar/rejeitar)
DELETE /api/depos/[id]

GET  /api/communities
POST /api/communities
POST /api/communities/[slug]/join

GET  /api/admin/invites
POST /api/admin/invites
GET  /api/admin/users/[id]
PATCH /api/admin/users/[id]
```

### Seed (`prisma/seed.ts`)

Cria automaticamente:
- Admin, com e-mail e senha lidos de `ADMIN_EMAIL` e `ADMIN_PASSWORD` (obrigatórias)
- 5 códigos de convite prontos para uso

---

## Como subir o ambiente

### Pré-requisito
Docker Desktop instalado (já feito).

### Sequência de comandos

```bash
# 1. Subir o banco PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# 2. Rodar as migrations
npm run db:migrate

# 3. Popular com seed (admin + convites)
npm run db:seed

# 4. Iniciar o servidor
npm run dev
```

> O passo 3 exige `ADMIN_EMAIL` e `ADMIN_PASSWORD` definidas no ambiente — o seed
> aborta sem elas, de propósito.

Acesse: http://localhost:3000

---

## Atualização desta sessão — 05/05/2026 (sessão 2)

### Decisão de infra

- VPS própria (4GB RAM, 70GB SSD) confirmada como opção correta. Vercel descartado: não suporta escrita em filesystem (uploads) e exige banco externo pago.
- Nenhum dado precisa ser alocado no PC do desenvolvedor — tudo roda na VPS.

### Remoção do `displayName` — identidade passa a ser `@username`

- Campo `displayName` removido do schema Prisma, do JWT, dos schemas Zod, dos tipos globais e de todos os 20+ arquivos que o referenciavam.
- Em toda a interface, o que aparece agora é o `@username` (ex: `@joao36`). Sem nome de exibição separado.
- No formulário de cadastro, o campo exibe `@` como prefixo fixo — o usuário digita apenas o username, sem o `@`.
- Avatares passaram a usar a primeira letra do username.

### Gênero

- Adicionado enum `Gender { H M }` no schema Prisma.
- Campo `gender Gender` obrigatório no model `User`.
- Seleção H / M no cadastro e no editar perfil (dois botões de seleção, não há opção em branco).

### Capa obrigatória para comunidades

- Adicionado campo `coverImageUrl String` (obrigatório) no model `Community`.
- Nova rota: `POST /api/upload/community-cover`
  - Aceita multipart/form-data com arquivo até 5MB (JPG, PNG, WebP)
  - Redimensiona para 1200×400px via Sharp, converte para WebP 80%
  - Salva em `/public/uploads/communities/`
  - Retorna `{ url: "/uploads/communities/filename.webp" }`
- Fluxo no formulário de criar comunidade: upload da imagem primeiro → recebe URL → cria comunidade com a URL.
- Página da comunidade exibe a capa como banner (object-fit: cover, 200px de altura).

### Schema e migration

- Prisma Client regenerado (`prisma generate`).
- **Migration ainda não executada** — pendente Docker ativo.
- Comando a rodar: `npx prisma migrate dev --name add-gender-and-community-cover`

### Arquivos criados ou alterados

**Novos:**
- `src/app/api/upload/community-cover/route.ts`
- `public/uploads/communities/` (diretório)

**Alterados:**
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/auth.ts`
- `src/lib/validations.ts`
- `src/types/index.ts`
- `src/app/api/auth/cadastro/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/users/me/route.ts`
- `src/app/api/posts/route.ts`
- `src/app/api/communities/route.ts`
- `src/app/(app)/home/page.tsx`
- `src/app/(app)/perfil/[username]/page.tsx`
- `src/app/(app)/editar-perfil/page.tsx`
- `src/app/(app)/comunidades/page.tsx`
- `src/app/(app)/comunidades/[slug]/page.tsx`
- `src/app/(app)/depos/recebidos/page.tsx`
- `src/app/admin/usuarios/page.tsx`
- `src/app/admin/convites/page.tsx`
- `src/components/auth/CadastroForm.tsx`
- `src/components/profile/EditProfileForm.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/RightRail.tsx`
- `src/components/feed/PostCard.tsx`
- `src/components/communities/CriarComunidadeForm.tsx`

### Validação

- `npx tsc --noEmit` passou sem erros após todas as alterações.

---

## Próximas etapas (roadmap)

| Etapa | Status |
|---|---|
| 1. Fundação e Autenticação | **Concluída** |
| 2. Perfil de Usuário | **Implementado e testado** |
| 3. Depos | **Implementado e testado** |
| 4. Feed e Posts | **Implementado e testado** |
| 5. Comunidades | **Implementado e testado** |
| 6. Admin | **Implementado e testado** |
| 7. Segurança, deploy e VPS | Não iniciado |

### Prioridade imediata

1. Rodar `npx prisma migrate dev --name add-gender-and-community-cover` com Docker ativo
2. Testar fluxo completo localmente: cadastro → perfil → feed → comunidade (com upload de capa) → depos → admin
3. Iniciar **Etapa 7 — Segurança, deploy e VPS**: rate limiting nos demais endpoints, sanitização de inputs, `docker-compose.prod.yml`, `nginx.conf`, `.env.example`, deploy na VPS

---

## Pontos de atenção

- **`prisma.config.ts` usa `process.loadEnvFile(".env")`** — necessário porque o Prisma 7 não carrega o `.env` automaticamente ao executar o config. Já corrigido.
- Rate limiting está em memória — reseta a cada restart do servidor. Suficiente para dev, mas deve ser substituído por Redis em produção.
- **shadcn/ui não está instalado** — o visual atual é bare-bones. Instalar antes de refinar as telas.
- O `.env` não deve ser commitado. Já está no `.gitignore`; usar `.env.example` como referência ao subir em outro ambiente.
