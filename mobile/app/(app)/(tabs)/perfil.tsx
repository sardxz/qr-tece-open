import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackground } from '../../../components/ui/AppBackground';
import { useAuth } from '../../../lib/auth/context';
import { ProfileScreenContent } from '../../../components/profile/ProfileScreenContent';
import { Text, View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../../components/ui/theme';

export default function PerfilScreen() {
  const { user } = useAuth();

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          {user ? (
            <ProfileScreenContent username={user.username} allowOpenOwnTab />
          ) : (
            <View style={styles.centerState}>
              <Text style={styles.title}>Sessão indisponível</Text>
              <Text style={styles.text}>Não foi possível carregar seu perfil agora.</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  text: { color: colors.textMuted, fontSize: 15 },
});
