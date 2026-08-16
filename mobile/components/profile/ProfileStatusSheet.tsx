import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiClientError, api } from '../../lib/api/client';
import { StatusNotice } from '../ui/StatusNotice';
import { colors, radius, spacing } from '../ui/theme';
import { profileQueryKey, type PresenceStatus } from './types';

type Props = {
  visible: boolean;
  onClose: () => void;
  username: string;
  initialStatusText: string | null;
  initialPresence: PresenceStatus;
};

type ManualStatusOption = { value: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE'; label: string; color: string };

const OPTIONS: ManualStatusOption[] = [
  { value: 'ONLINE', label: 'online', color: '#22c55e' },
  { value: 'BUSY', label: 'ocupado', color: '#f87171' },
  { value: 'AWAY', label: 'ausente', color: '#fbbf24' },
  { value: 'OFFLINE', label: 'offline', color: colors.textSoft },
];

function presenceToManual(p: PresenceStatus): ManualStatusOption['value'] {
  switch (p) {
    case 'online': return 'ONLINE';
    case 'busy': return 'BUSY';
    case 'away': return 'AWAY';
    default: return 'OFFLINE';
  }
}

export function ProfileStatusSheet({ visible, onClose, username, initialStatusText, initialPresence }: Props) {
  const queryClient = useQueryClient();
  const [statusText, setStatusText] = useState(initialStatusText ?? '');
  const [manualStatus, setManualStatus] = useState<ManualStatusOption['value']>(presenceToManual(initialPresence));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStatusText(initialStatusText ?? '');
      setManualStatus(presenceToManual(initialPresence));
      setErrorMessage(null);
    }
  }, [visible, initialStatusText, initialPresence]);

  const mutation = useMutation({
    mutationFn: () =>
      api('/api/users/me/status', {
        method: 'PATCH',
        body: JSON.stringify({
          statusText: statusText.trim() || null,
          manualStatus,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey(username) });
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message.toLowerCase());
      } else if (error instanceof Error) {
        setErrorMessage(error.message.toLowerCase());
      } else {
        setErrorMessage('não foi possível salvar agora.');
      }
    },
  });

  const remaining = 60 - statusText.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>editar status</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {errorMessage ? <StatusNotice tone="error" message={errorMessage} /> : null}

          <Text style={styles.label}>como você está</Text>
          <View style={styles.presenceGrid}>
            {OPTIONS.map((option) => {
              const active = manualStatus === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setManualStatus(option.value)}
                  style={[styles.presenceOption, active ? styles.presenceOptionActive : null]}
                >
                  <View style={[styles.presenceDot, { backgroundColor: option.color }]} />
                  <Text style={[styles.presenceLabel, active ? styles.presenceLabelActive : null]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>texto do status</Text>
          <TextInput
            value={statusText}
            onChangeText={setStatusText}
            placeholder="o que você quer compartilhar?"
            placeholderTextColor={colors.textSoft}
            style={styles.input}
            maxLength={60}
          />
          <Text style={styles.counter}>{remaining} restantes</Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>cancelar</Text>
            </Pressable>
            <Pressable
              disabled={mutation.isPending}
              onPress={() => mutation.mutate()}
              style={[styles.save, mutation.isPending ? styles.saveDisabled : null]}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.saveText}>salvar</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.26)',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: spacing.xs },
  presenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  presenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.6)',
  },
  presenceOptionActive: {
    borderColor: colors.primaryStrong,
    backgroundColor: 'rgba(143, 70, 255, 0.18)',
  },
  presenceDot: { width: 10, height: 10, borderRadius: radius.pill },
  presenceLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  presenceLabelActive: { color: colors.text },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.6)',
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  counter: { color: colors.textSoft, fontSize: 12, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.sm },
  cancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  save: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
