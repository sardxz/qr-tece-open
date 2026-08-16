import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../ui/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  anchorPosition: { top: number; right: number } | null;
};

type Mode = 'menu' | 'confirm-delete';

export function PostActionsSheet({ visible, onClose, onEdit, onDelete, anchorPosition }: Props) {
  const [mode, setMode] = useState<Mode>('menu');

  const handleClose = () => {
    setMode('menu');
    onClose();
  };

  const handleEdit = () => {
    setMode('menu');
    onClose();
    onEdit();
  };

  const handleConfirmDelete = () => {
    setMode('menu');
    onClose();
    onDelete();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={handleClose}>
        {mode === 'menu' && anchorPosition ? (
          <Pressable
            style={[styles.popup, { top: anchorPosition.top, right: anchorPosition.right }]}
            onPress={() => {}}
          >
            <Pressable
              style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={18} color={colors.text} />
              <Text style={styles.actionText}>editar</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
              onPress={() => setMode('confirm-delete')}
            >
              <Ionicons name="trash-outline" size={18} color="#ff4666" />
              <Text style={[styles.actionText, styles.destructive]}>excluir</Text>
            </Pressable>
          </Pressable>
        ) : null}

        {mode === 'confirm-delete' ? (
          <View style={styles.confirmCenter} pointerEvents="box-none">
            <Pressable style={styles.confirmCard} onPress={() => {}}>
              <Text style={styles.confirmTitle}>excluir post?</Text>
              <Text style={styles.confirmText}>essa ação não pode ser desfeita.</Text>

              <View style={styles.confirmActions}>
                <Pressable
                  style={({ pressed }) => [styles.confirmCancel, pressed ? styles.actionPressed : null]}
                  onPress={() => setMode('menu')}
                >
                  <Text style={styles.confirmCancelText}>cancelar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.confirmDanger, pressed ? styles.actionPressed : null]}
                  onPress={handleConfirmDelete}
                >
                  <Text style={styles.confirmDangerText}>excluir</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  popup: {
    position: 'absolute',
    minWidth: 160,
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
    paddingVertical: 10,
  },
  actionPressed: {
    backgroundColor: 'rgba(143, 70, 255, 0.12)',
  },
  actionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  destructive: {
    color: '#ff4666',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  confirmCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.26)',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  confirmText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  confirmCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmCancelText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDanger: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#ff4666',
  },
  confirmDangerText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
