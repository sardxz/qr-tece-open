# qr.tecê mobile - progresso

> Fonte oficial do estado do app mobile. Atualize ao final de cada bloco.

## Status atual

- **Branch:** `feat/mobile-app`
- **Bloco em execucao:** 9 - Build e distribuicao (aguardando `eas init` + primeiro build do Sardinha)
- **Proximo bloco:** 6 - UI Comunidades (ou validacao final do bloco 8 em build nativo)
- **Ultima atualizacao:** 2026-05-16

## Stack

- Expo SDK **54** (new architecture habilitada)
- React **19.1** / React Native **0.81**
- TypeScript **5.9** (strict)
- **expo-router 6** (file-based, paralelo ao Next.js)
- Suporte: Android (foco inicial); iOS fica viavel sem reescrever

## Plano de blocos

| # | Bloco | Responsavel | Status | Saida esperada |
|---|--------|-------------|--------|----------------|
| 0 | Fundacao | Code | ✅ | Pasta `mobile/`, Expo + expo-router, scaffolding minimo, docs |
| 1 | Backend mobile-ready (JWT via header `Authorization`) | Code | ✅ | `getSession()` aceita Bearer e cookie; login/cadastro/me retornam token no body |
| 2 | Camada de API + Auth no app | Code | ✅ | `lib/api/client.ts`, `lib/auth/{storage,session,context}.ts`, `AuthProvider` montado em `_layout` |
| 3 | UI Auth | Codex | ✅ | Telas de login, cadastro, recuperacao |
| 4 | UI Feed + Post | Codex | ✅ | Lista, detalhe, criacao |
| 5 | UI Perfil + Social | Codex | ✅ | Perfil, amizades, atividades |
| 6 | UI Comunidades | Codex | ⏳ | Listagem, detalhe, entrar/sair (endpoints ja existem) |
| 7 | Upload de imagens | Code (backend) + Codex (UI) | ✅ | `expo-image-picker` + endpoint mobile |
| 8 | Push notifications | Code (backend) + Codex (UI) | ✅ | Expo Push API + tokens no backend |
| 9 | Build e distribuicao | Code | 🚧 | EAS Build, Play Console interno |

Legenda: ✅ feito · 🚧 em execucao · ⏳ pendente

## Decisoes arquiteturais (nao obvias)

- **JWT no header `Authorization: Bearer <token>`** no mobile, em vez de cookie httpOnly. Backend aceita os dois; mobile usa Bearer como fonte principal.
- **Storage do token no dispositivo:** `expo-secure-store` para sessao.
- **Backend unico:** a API Next.js atende web e mobile.
- **Cache/data layer:** **TanStack Query** montado no `app/_layout.tsx`.
- **Navegacao:** `expo-router` em vez de React Navigation cru.
- **Lista principal:** **FlashList** para feed, replies e listas sociais.
- **Imagens:** **expo-image** para posts e avatares remotos.
- **Upload multipart no app:** helper proprio em `mobile/components/upload/image-upload.ts` com `fetch` nativo, porque `mobile/lib/api/client.ts` ainda trata qualquer `body` como JSON.
- **Push token lifecycle:** o token do Expo fica persistido localmente para permitir `DELETE /api/users/me/push-tokens` no logout antes de limpar a sessao.

## Como rodar (verificacao rapida)

```bash
cd mobile
npm start
```

Pressione `a` para abrir no Android, ou escaneie o QR com Expo Go.

## Divisao Code / Codex (regra dura)

- **Code:** backend, infra, `mobile/lib/*`, configuracao de build, `package.json`, scaffolding minimo.
- **Codex:** `mobile/app/**` e `mobile/components/**`.

Excecoes aprovadas neste projeto:
- instalacoes via `npx expo install`
- ajustes gerados em `package.json` / `package-lock.json`
- integracoes necessarias em `mobile/lib/**` para push notifications

## Contrato da API mobile

O backend continua sendo a mesma API Next.js em `/api/*`. Mobile autentica via header HTTP, e o web continua usando cookie httpOnly.

### Autenticacao

Apos login/cadastro, salvar `token` retornado no body em `expo-secure-store`. Enviar em toda requisicao:

```text
Authorization: Bearer <jwt>
```

### Regra de precedencia no helper

O `getSession()` em `src/lib/auth.ts` segue esta ordem:
1. **Se houver `Authorization: Bearer <token>`** -> valida e usa (caminho mobile)
2. **Senao** -> le cookie `tece-token` (caminho web)

Se o Bearer estiver presente mas invalido, retorna 401 sem cair no cookie.

## Contrato da API - Bloco 5 (Perfil + Social)

### Perfil

| Metodo | Path | Auth | Query | Resposta |
|---|---|---|---|---|
| `GET` | `/api/profile/[username]` | opcional | - | `{ user, stats, presenceStatus, isOwnProfile, friendState, pendingDeposCount }` |
| `GET` | `/api/profile/[username]/top-friends` | opcional | - | `{ friends[], is_owner }` |
| `GET` | `/api/profile/[username]/timeline` | - | `limit` (1-50, default 5) | `{ events[] }` |
| `GET` | `/api/profile/[username]/depos` | - | `page`, `limit` (1-50) | `{ depos[], total, page, totalPages }` |
| `GET` | `/api/profile/[username]/friends` | - | `page`, `limit` (1-100) | `{ friends[], total, page, totalPages }` |

### Amizades

| Metodo | Path | Body | Resposta |
|---|---|---|---|
| `GET` | `/api/friends` | - | `{ friends[] }` |
| `POST` | `/api/friends` | `{ receiverUsername }` | `{ friendship }` |
| `GET` | `/api/friends/requests` | - | `{ requests[] }` |
| `PATCH` | `/api/friends/[id]` | `{ action: "accept" \| "reject" }` | `{ friendship }` ou `{ ok }` |
| `DELETE` | `/api/friends/[id]` | - | `{ ok: true }` |

### Depos

| Metodo | Path | Body/Query | Resposta |
|---|---|---|---|
| `POST` | `/api/depos` | `{ content, recipientUsername }` | depo criado |
| `GET` | `/api/depos/recebidos` | `?status=pending|approved` `?limit=` | `{ pending[], approved[] }` |
| `PATCH` | `/api/depos/[id]` | `{ action: "approve" \| "reject" }` | depo atualizado ou `{ ok }` |
| `DELETE` | `/api/depos/[id]` | - | `{ ok: true }` |

### Activity

| Metodo | Path | Resposta |
|---|---|---|
| `GET` | `/api/activity` | `{ items[], lastSeen, totalNew }` |

## Contrato da API - Bloco 7 (Upload de imagens)

> Todos os endpoints de upload aceitam `multipart/form-data` com campo `file` e exigem `Authorization: Bearer <token>`.

| Metodo | Path | Max | Resize | Atualiza no DB? | Notas |
|---|---|---|---|---|---|
| `POST` | `/api/upload/profile-image` | 2MB | 200x200 cover | sim (`User.profileImageUrl`) | Rate limit 3/min · retorna `{ url }` |
| `POST` | `/api/upload/profile-cover` | 5MB | 1200x300 cover | sim (`User.profileCoverUrl`) | Rate limit 3/min · retorna `{ url }` |
| `POST` | `/api/upload/post-image` | 5MB | 1200x900 inside | nao | Retorna `{ url }`; cliente envia em `POST /api/posts` como `imageUrl` |
| `POST` | `/api/upload/community-cover` | 5MB | 1200x400 cover | nao | Retorna `{ url }`; cliente envia em `PATCH /api/communities/[slug]` |
| `POST` | `/api/upload/badge-icon` | 5MB | 256x256 contain | nao | Admin only · retorna `{ url }` · aceita GIF |

### Fluxo de post com imagem

1. `POST /api/upload/post-image` -> recebe `{ url }`
2. `POST /api/posts` com body `{ content, imageUrl: <url>, ... }` -> cria o post

**Rate limit especifico:** posts com imagem tem limite de **1 por dia** por usuario nao-admin. Se atingir, retorna `429 { error: "Limite de 1 foto por dia atingido." }`.

## Contrato da API - Bloco 8 (Push notifications)

> Backend usa **Expo Push API**. O cliente mobile usa `expo-notifications` para obter o `ExponentPushToken[...]` e registra no backend ao logar.

### Endpoints

| Metodo | Path | Body | Resposta |
|---|---|---|---|
| `POST` | `/api/users/me/push-tokens` | `{ token: string, platform: "ANDROID" \| "IOS" }` | `{ ok: true }` |
| `DELETE` | `/api/users/me/push-tokens` | `{ token: string }` | `{ ok: true }` |

### Triggers atuais

| Evento | Endpoint que dispara | Para quem | Payload `data` |
|---|---|---|---|
| Novo depo recebido | `POST /api/depos` | recipient | `{ type: "depo", depoId }` |
| Pedido de amizade | `POST /api/friends` | receiver | `{ type: "friendRequest", friendshipId }` |
| Amizade aceita | `PATCH /api/friends/[id]` (accept) | requester | `{ type: "friendAccepted", friendshipId }` |
| Like no seu post | `POST /api/posts/[id]/like` | author do post | `{ type: "like", postId }` |
| Comentario no seu post | `POST /api/posts` com `replyToId` | author do post pai | `{ type: "comment", postId, replyId }` |
| Mencao em post | `POST /api/posts` top-level com `@username` | usuario mencionado | `{ type: "mention", postId }` |

Push e **best-effort**: falhas nao quebram o request principal. Tokens `DeviceNotRegistered` sao removidos automaticamente no backend.

### Como o cliente mobile deve registrar

1. Pedir permissao com `Notifications.requestPermissionsAsync()`
2. Obter `projectId` de `Constants.expoConfig?.extra?.eas?.projectId` (ou `Constants.easConfig?.projectId`)
3. Obter token com `Notifications.getExpoPushTokenAsync({ projectId })`
4. Fazer `POST /api/users/me/push-tokens`
5. No logout, fazer `DELETE /api/users/me/push-tokens` antes de limpar a sessao

### Limitacao importante

Push remoto precisa ser validado em **development build / APK nativo**. O Expo Go nao cobre esse fluxo com a mesma confiabilidade no Android moderno.

## Bloco 9 - Build e distribuicao (EAS)

### Config

- **`app.config.ts`** substituiu o `app.json` para permitir `apiBaseUrl` dinamico por profile.
- **`eas.json`** define 3 profiles:
  - `development` - build com dev client
  - `preview` - APK standalone para teste interno; aponta `apiBaseUrl` para `https://qrtece.com.br`
  - `production` - AAB para Play Console; aponta para producao
- **Identidade do app:**
  - `name`: `qr.tecê`
  - `slug`: `qrtece`
  - `scheme`: `tece`
  - Android `package`: `com.qrtece.app`
  - iOS `bundleIdentifier`: `com.qrtece.app`
- **`extra.apiBaseUrl`** resolvido em `app.config.ts` via `process.env.EAS_BUILD_PROFILE`.

### Como o Sardinha gera o primeiro build

```bash
cd mobile
npm i -g eas-cli
npx eas-cli login
npx eas-cli init
npx eas-cli build --profile preview --platform android
```

## Log de sessoes

### 2026-05-16 - Bloco 8 concluido (Codex)
- `expo-notifications` e `expo-device` instalados com `npx expo install`.
- Criado `mobile/lib/push/register.ts` com permissao, token do Expo, registro no backend, remocao no logout e resolucao de rota por `data.type`.
- `AuthProvider` agora tenta registrar o push token sempre que a sessao fica autenticada, cobrindo login e restauracao de sessao.
- `logout()` agora remove o push token remoto antes de limpar o token de sessao.
- `mobile/app/_layout.tsx` ganhou `setNotificationHandler` com banner + som em foreground e listener de tap para navegar para `depos-recebidos`, `post/[id]` ou `notificacoes`.
- `mobile/app.config.ts` atualizado com plugin `expo-notifications`.
- `cmd /c npx.cmd tsc --noEmit` em `mobile/`: zero erros.
- Pendencia conhecida: validar o fluxo em development build / APK nativo e confirmar `extra.eas.projectId` depois do `eas init`.

### 2026-05-16 - Backend pronto pro Bloco 8 (Code)
- Schema: novo enum `PushPlatform` e model `PushToken` com `@@unique([token])` e `@@index([userId])`.
- Criado `src/lib/push.ts` com `sendPushToUser(userId, payload)` usando Expo Push API.
- Criado `POST /api/users/me/push-tokens` (upsert) e `DELETE /api/users/me/push-tokens` (apenas owner).
- Triggers integrados em `POST /api/depos`, `POST /api/friends`, `PATCH /api/friends/[id]` (accept), `POST /api/posts/[id]/like`, `POST /api/posts` (comment + mention).
- `tsc --noEmit` na raiz: zero erros.

### 2026-05-16 - Bloco 9 iniciado (Code)
- `mobile/app.config.ts` dinamico, resolvendo `extra.apiBaseUrl` por profile.
- `mobile/eas.json` com 3 profiles (`development`, `preview`, `production`).
- Identidade do app alinhada para `qr.tecê` / `com.qrtece.app`.
- `tsc --noEmit` em `mobile/`: zero erros.

### 2026-05-16 - Bloco 7 concluido (Codex)
- `expo-image-picker` instalado com `npx expo install`.
- Upload de avatar, capa e imagem de post integrado ao app.
- `cmd /c npx.cmd tsc --noEmit` em `mobile/`: zero erros.

### 2026-05-16 - Bloco 5 ampliado (Codex)
- Aba `Avisos` passou a consumir `GET /api/activity`.
- Criada tela `mobile/app/(app)/depos-recebidos.tsx` com revisao completa de depos.
- `cmd /c npx.cmd tsc --noEmit` em `mobile/`: zero erros.

### 2026-05-16 - Bloco 5 concluido (Codex)
- Aba `Perfil` substituida por perfil real do usuario logado.
- Criada rota de perfil publico e tela de amigos.

### 2026-05-16 - Bloco 4 concluido (Codex)
- Feed real com `FlashList`, paginacao por cursor, criacao, detalhe, likes e replies.

### 2026-05-16 - Bloco 3 concluido (Codex)
- Auth UI completa com login, cadastro, recuperacao e redirecionamento por sessao.
