import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Slot, router, usePathname, useRootNavigationState } from 'expo-router';
import { useLastNotificationResponse } from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
  InterTight_800ExtraBold,
  InterTight_900Black,
} from '@expo-google-fonts/inter-tight';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { queryClient } from '../components/post/query-client';
import { AuthProvider, useAuth } from '../lib/auth/context';
import { configureForegroundNotifications, getRouteFromNotificationData } from '../lib/push/register';

const isExpoGo = Constants.appOwnership === 'expo';
const canCheckForUpdates = !isExpoGo && !__DEV__;

export default function RootLayout() {
  const updateCheckRunning = useRef(false);
  const [fontsLoaded] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    InterTight_800ExtraBold,
    InterTight_900Black,
  });

  useEffect(() => {
    const onAppStateChange = (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!canCheckForUpdates) {
      return;
    }

    // Cold start: aplica o update imediatamente com reload.
    const checkAndApply = async () => {
      if (updateCheckRunning.current) return;
      updateCheckRunning.current = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.warn('[updates] verificacao falhou', error);
      } finally {
        updateCheckRunning.current = false;
      }
    };

    // Foreground: apenas baixa em silêncio. O update é aplicado no próximo cold start,
    // evitando reloadAsync() no meio de uma sessão ativa (causa tela cinza permanente).
    const downloadIfAvailable = async () => {
      if (updateCheckRunning.current) return;
      updateCheckRunning.current = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
        }
      } catch (error) {
        console.warn('[updates] download silencioso falhou', error);
      } finally {
        updateCheckRunning.current = false;
      }
    };

    checkAndApply();

    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        downloadIfAvailable();
      }
    });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <Slot />
          {!isExpoGo ? <NotificationRouter /> : null}
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function NotificationRouter() {
  const response = useLastNotificationResponse();
  const rootNavigationState = useRootNavigationState();
  const pathname = usePathname();
  const { status } = useAuth();
  const handledResponses = useRef<Set<string>>(new Set());
  const pendingRoute = useRef<{ identifier: string; route: string } | null>(null);

  useEffect(() => {
    configureForegroundNotifications().catch((error) => {
      console.warn('[push] falha ao configurar notificacoes.', error);
    });
  }, []);

  useEffect(() => {
    if (!response) {
      return;
    }

    const identifier = response.notification.request.identifier;
    if (handledResponses.current.has(identifier) || pendingRoute.current?.identifier === identifier) {
      return;
    }

    const route = getRouteFromNotificationData(response.notification.request.content.data);
    if (route) {
      pendingRoute.current = { identifier, route };
    } else {
      handledResponses.current.add(identifier);
    }
  }, [response]);

  useEffect(() => {
    const pending = pendingRoute.current;
    if (!pending || !rootNavigationState?.key || status === 'loading') {
      return;
    }

    if (status !== 'authenticated') {
      handledResponses.current.add(pending.identifier);
      pendingRoute.current = null;
      return;
    }

    if (pathname !== '/home') {
      router.replace('/home');
      return;
    }

    handledResponses.current.add(pending.identifier);
    pendingRoute.current = null;
    router.push(pending.route);
  }, [pathname, rootNavigationState?.key, status]);

  return null;
}
