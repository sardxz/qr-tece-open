import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppBackground } from '../components/ui/AppBackground';
import { colors } from '../components/ui/theme';
import { useAuth } from '../lib/auth/context';

export default function Index() {
  const { status } = useAuth();

  if (status === 'authenticated') {
    return <Redirect href="/home" />;
  }

  if (status === 'anonymous') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppBackground>
      <View style={styles.container}>
        <Text style={styles.brand}>qr.tecê</Text>
        <Text style={styles.title}>Preparando seu espaço</Text>
        <View style={styles.row}>
          <ActivityIndicator color={colors.primaryStrong} />
          <Text style={styles.muted}>Verificando sua sessão…</Text>
        </View>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  title: {
    marginTop: 16,
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  muted: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
