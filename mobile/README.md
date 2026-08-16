# qr.tecê mobile

App Android da rede social qr.tecê. UI nativa em React Native (Expo); consome o mesmo backend Next.js do web.

## Stack

- Expo SDK 54 (new architecture)
- React Native 0.81 + React 19.1
- TypeScript 5.9 (strict)
- expo-router 6 (file-based)

## Pré-requisitos

- Node 20+ (testado em 24)
- npm 10+
- Android Studio com emulador OU dispositivo físico com app **Expo Go**

## Rodar em desenvolvimento

```bash
cd mobile
npm install   # se ainda não rodou
npm start
```

No menu interativo:
- `a` → abre no emulador Android (ou no Expo Go via QR)
- `r` → reload
- `j` → abrir debugger

## Estrutura

```
mobile/
├── app/              ← rotas (file-based, território do Codex)
│   ├── _layout.tsx   ← layout raiz (Slot mínimo no Bloco 0)
│   └── index.tsx     ← tela inicial (placeholder no Bloco 0)
├── assets/           ← icon, splash, fontes
├── lib/              ← (futuro) api client, auth, storage — território do Code
├── components/       ← (futuro) componentes UI — território do Codex
├── app.json          ← config Expo
└── package.json
```

## Build de produção

A configurar no **Bloco 9** via EAS:

```bash
npx eas build --platform android
```

## Estado do projeto

Veja [`PROGRESS.md`](./PROGRESS.md) — fonte oficial do que está pronto, em execução e pendente.

## Backend

O backend é a mesma API Next.js do web, na raiz do repo. Mobile vai consumir endpoints `/api/*` com `Authorization: Bearer <jwt>` (configurado no Bloco 1).
