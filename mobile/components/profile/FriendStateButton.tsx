import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { ApiClientError, api } from '../../lib/api/client';
import { colors, radius, spacing } from '../ui/theme';
import {
  friendRequestsQueryKey,
  friendsQueryKey,
  profileQueryKey,
  type FriendState,
  type ProfileResponse,
} from './types';

type FriendStateButtonProps = {
  username: string;
  profileUsername: string;
  state: FriendState;
};

export function FriendStateButton({ username, profileUsername, state }: FriendStateButtonProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (state.type === 'none') {
        return api<{ friendship: { id: string } }>('/api/friends', {
          method: 'POST',
          body: JSON.stringify({ receiverUsername: username }),
        });
      }

      if (state.type === 'received') {
        return api<{ friendship: { id: string } }>(`/api/friends/${state.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'accept' }),
        });
      }

      return api<{ ok: true }>(`/api/friends/${state.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: friendsQueryKey });
      queryClient.invalidateQueries({ queryKey: friendRequestsQueryKey });
      queryClient.setQueryData<ProfileResponse>(profileQueryKey(profileUsername), (old) => {
        if (!old) return old;

        if (state.type === 'none' && 'friendship' in result) {
          return { ...old, friendState: { type: 'sent', id: result.friendship.id } };
        }

        if (state.type === 'received' && 'friendship' in result) {
          return {
            ...old,
            friendState: { type: 'friends', id: result.friendship.id },
            stats: { ...old.stats, friends: old.stats.friends + 1 },
          };
        }

        if (state.type === 'friends') {
          return {
            ...old,
            friendState: { type: 'none' },
            stats: { ...old.stats, friends: Math.max(0, old.stats.friends - 1) },
          };
        }

        return { ...old, friendState: { type: 'none' } };
      });
    },
  });

  const getLabel = () => {
    switch (state.type) {
      case 'none':
        return 'Adicionar';
      case 'sent':
        return 'Cancelar pedido';
      case 'received':
        return 'Aceitar amizade';
      case 'friends':
        return 'Desfazer amizade';
    }
  };

  return (
    <Pressable
      onPress={() => mutation.mutate()}
      disabled={mutation.isPending}
      style={({ pressed }) => [
        styles.button,
        state.type === 'friends' ? styles.secondary : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {mutation.isPending ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.label}>{getLabel()}</Text>
      )}
    </Pressable>
  );
}

export function FriendStateError({ error }: { error: unknown }) {
  if (!(error instanceof ApiClientError)) return null;
  return <Text style={styles.errorText}>{error.message}</Text>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondary: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.95,
  },
  label: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
