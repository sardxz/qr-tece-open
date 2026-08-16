import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ApiClientError, api } from '../api/client';

const PUSH_TOKEN_KEY = 'tece-push-token';
const isExpoGo = Constants.appOwnership === 'expo';

let notificationHandlerConfigured = false;
let notificationsModule: Promise<ExpoNotifications> | null = null;

type NotificationData = Record<string, unknown>;
type ExpoNotifications = typeof import('expo-notifications');

function loadNotifications() {
  notificationsModule ??= import('expo-notifications');
  return notificationsModule;
}

export async function configureForegroundNotifications() {
  if (isExpoGo) {
    if (__DEV__) {
      console.log('[push] desabilitado no Expo Go (use dev build pra testar).');
    }
    return;
  }

  if (notificationHandlerConfigured) {
    return;
  }

  const Notifications = await loadNotifications();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerConfigured = true;
}

export async function registerPushToken() {
  if (isExpoGo) {
    if (__DEV__) {
      console.log('[push] desabilitado no Expo Go (use dev build pra testar).');
    }
    return null;
  }

  await configureForegroundNotifications();
  const Notifications = await loadNotifications();
  await ensureAndroidChannel(Notifications);

  if (!Device.isDevice) {
    if (__DEV__) {
      console.log('[push] ignorado: push remoto exige device fisico.');
    }
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const permission = await Notifications.requestPermissionsAsync();
    finalStatus = permission.status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) {
      console.log('[push] permissao nao concedida.');
    }
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null;

  if (!projectId) {
    console.warn('[push] projectId do EAS nao encontrado. Rode o eas init antes de testar push remoto.');
    return null;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  await api('/api/users/me/push-tokens', {
    method: 'POST',
    body: JSON.stringify({
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    }),
  });

  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);

  if (__DEV__) {
    console.log('[push] token registrado:', token);
  }

  return token;
}

export async function unregisterPushToken() {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);

  if (!token) {
    return;
  }

  try {
    await api('/api/users/me/push-tokens', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] nao foi possivel remover o token remoto.', error);
    }

    if (!(error instanceof ApiClientError && error.status === 401)) {
      throw error;
    }
  } finally {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  }
}

export function getRouteFromNotificationData(data: unknown) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const normalized = data as NotificationData;
  const type = getStringValue(normalized.type);

  switch (type) {
    case 'depo':
      return '/depos-recebidos';
    case 'comment':
    case 'mention':
    case 'community_post':
    case 'like': {
      const communityRoute = getCommunityRoute(normalized);
      if (communityRoute) {
        return communityRoute;
      }

      const postId = getStringValue(normalized.postId);
      return postId ? `/post/${postId}` : '/atividades';
    }
    case 'friendRequest':
    case 'friendAccepted':
      return '/atividades';
    default:
      return '/atividades';
  }
}

function getStringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getCommunityRoute(data: NotificationData) {
  const communityId = getStringValue(data.communityId);
  const communitySlug = getStringValue(data.communitySlug);
  const communityName = getStringValue(data.communityName);

  if (!communityId || !communitySlug) {
    return null;
  }

  const query = new URLSearchParams({ communityId });
  if (communityName) {
    query.set('name', communityName);
  }

  return `/comunidade/${encodeURIComponent(communitySlug)}?${query.toString()}`;
}

async function ensureAndroidChannel(Notifications: ExpoNotifications) {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Padrão',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8B3DFF',
    sound: 'default',
  });
}
