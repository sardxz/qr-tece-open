import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileScreenContent } from '../../../components/profile/ProfileScreenContent';
import { AppBackground } from '../../../components/ui/AppBackground';
import { colors, spacing } from '../../../components/ui/theme';

export default function UsuarioProfileScreen() {
  const params = useLocalSearchParams<{ username?: string | string[] }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>
          </View>

          {username ? (
            <ProfileScreenContent username={username} />
          ) : (
            <View style={styles.centerState}>
              <Text style={styles.title}>Perfil indisponível</Text>
              <Text style={styles.text}>Não encontramos esse username no qr.tecê.</Text>
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
  header: { paddingBottom: spacing.md },
  backText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  text: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
