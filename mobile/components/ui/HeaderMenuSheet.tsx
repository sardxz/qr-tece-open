import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from './theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onLogout: () => void;
  anchorPosition: { top: number; right: number } | null;
};

export function HeaderMenuSheet({ visible, onClose, onProfile, onSettings, onLogout, anchorPosition }: Props) {
  const handle = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        {anchorPosition ? (
          <Pressable
            style={[styles.popup, { top: anchorPosition.top, right: anchorPosition.right }]}
            onPress={() => {}}
          >
            <Pressable
              style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
              onPress={handle(onProfile)}
            >
              <Ionicons name="person-outline" size={18} color={colors.text} />
              <Text style={styles.actionText}>perfil</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
              onPress={handle(onSettings)}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
              <Text style={styles.actionText}>configurações</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
              onPress={handle(onLogout)}
            >
              <Ionicons name="log-out-outline" size={18} color="#ff4666" />
              <Text style={[styles.actionText, styles.destructive]}>sair</Text>
            </Pressable>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  popup: {
    position: 'absolute',
    minWidth: 180,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.32)',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  actionPressed: { backgroundColor: 'rgba(143, 70, 255, 0.12)' },
  actionText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  destructive: { color: '#ff4666' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },
});
