import { ExpoConfig, ConfigContext } from 'expo/config';

function resolveApiBaseUrl(): string {
  // HARDCODE temporário: as env vars do EAS (EAS_BUILD_PROFILE, EAS_UPDATE_BRANCH)
  // não estão sendo setadas de forma confiável em todos os contextos de build/update.
  // Pra evitar 'Network request failed' em produção, retorna sempre a URL pública.
  // Em dev local (npm start), comentar este return e usar 'undefined' pra autodetect.
  // IMPORTANTE: usar `www.` — o nginx redireciona 301 sem www, e RN converte POST→GET no redirect → 405.
  return 'https://www.qrtece.com.br';
}

// IMPORTANTE: nunca usar `null` em campos de `extra`. O Expo CLI processa esses
// valores e `null` vira `{}` em runtime, o que quebra o code signing do manifest
// (vide: @expo/cli/src/utils/codesigning.ts → path.join recebe objeto). Usar
// undefined ou omitir o campo inteiro quando vazio.
const apiBaseUrl = resolveApiBaseUrl();
// projectId gerado pelo `eas init` em 2026-05-16, vinculado à conta @codewyn.
// Não é secreto — identifica o projeto no Expo; credentials são separadas.
const easProjectId = process.env.EAS_PROJECT_ID ?? '8541df78-c8b6-4502-b0b4-08d951dee472';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'qr.tecê',
  slug: 'qrtece',
  scheme: 'tece',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  // App mobile-only: explicitar plataformas pra evitar export de web no `eas update`
  // (que falha sem react-native-web instalado).
  platforms: ['ios', 'android'],
  // OTA updates via expo-updates (configurado pelo eas update:configure em 2026-05-16).
  updates: {
    url: `https://u.expo.dev/${easProjectId}`,
  },
  // Vincula runtime à versão do app — todo bundle precisa ter mesma `version` pra receber OTA.
  // Bump em `version` força novo build nativo. Bump em só JS pode ir via `eas update`.
  runtimeVersion: {
    policy: 'appVersion',
  },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.qrtece.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#000000',
    },
    permissions: ['READ_MEDIA_IMAGES'],
    usesCleartextTraffic: true,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.qrtece.app',
    versionCode: 1,
    // Firebase config nativa. NÃO versionada: o arquivo carrega a API key do
    // projeto Firebase e, mesmo sendo embarcada no APK, uma chave sem restrição
    // de package/SHA pode ser abusada. Baixe a sua no console do Firebase e
    // coloque em ./google-services.json antes de buildar.
    googleServicesFile: './google-services.json',
    // Android App Links: faz o SO abrir os links de convite de comunidade
    // dentro do app (em vez do navegador) quando o app está instalado.
    // autoVerify exige que https://www.qrtece.com.br/.well-known/assetlinks.json
    // contenha o SHA-256 da chave de assinatura do app. Requer build nativo novo.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'www.qrtece.com.br',
            pathPrefix: '/convite/comunidade',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  } as ExpoConfig['android'] & { usesCleartextTraffic: boolean },
  plugins: [
    'expo-router',
    'expo-notifications',
    'expo-font',
    // useLegacyPackaging: comprime/extrai as libs nativas na instalação
    // (extractNativeLibs=true). Corrige o app não abrir no Xiaomi/HyperOS quando
    // baixado da Play Store (AAB com libs não-comprimidas crasha no boot do MIUI).
    ['expo-build-properties', { android: { useLegacyPackaging: true } }],
  ],
  extra: {
    ...(apiBaseUrl ? { apiBaseUrl } : {}),
    eas: { projectId: easProjectId },
  },
});
