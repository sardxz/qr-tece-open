import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api/client';
import { colors, fonts, radius, spacing } from '../ui/theme';
import { getMediaUri } from './profile-utils';
import { myCollectionQueryKey, showcaseQueryKey, type MyCollectionResponse } from './types';

type Props = {
  username: string;
  onClose: () => void;
};

export function BadgeShowcasePicker({ username, onClose }: Props) {
  const queryClient = useQueryClient();

  const collectionQuery = useQuery({
    queryKey: myCollectionQueryKey,
    queryFn: () => api<MyCollectionResponse>('/api/users/me/collection'),
  });

  const badges = collectionQuery.data?.badges ?? [];
  const highlighted = badges.filter((b) => b.is_highlighted).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const selectedIds = highlighted.map((b) => b.id);

  const saveMutation = useMutation({
    mutationFn: (ids: string[]) =>
      api('/api/users/me/showcase', {
        method: 'PATCH',
        body: JSON.stringify({ badges: ids }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: showcaseQueryKey(username) });
      queryClient.invalidateQueries({ queryKey: myCollectionQueryKey });
      onClose();
    },
  });

  const toggle = (id: string) => {
    if (saveMutation.isPending) return;
    const isSelected = selectedIds.includes(id);
    let next: string[];
    if (isSelected) {
      next = selectedIds.filter((sid) => sid !== id);
    } else {
      if (selectedIds.length >= 5) return;
      next = [...selectedIds, id];
    }
    saveMutation.mutate(next);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>BADGES EM DESTAQUE</Text>
            <Text style={styles.subtitle}>{selectedIds.length}/5 selecionadas</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSoft} />
            </Pressable>
          </View>

          {collectionQuery.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
            </View>
          ) : badges.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyText}>você ainda não tem badges na coleção.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
              {badges.map((badge) => {
                const isSelected = selectedIds.includes(badge.id);
                const iconUri = getMediaUri(badge.icon_url);
                const isDisabled = !isSelected && selectedIds.length >= 5;
                return (
                  <Pressable
                    key={badge.id}
                    onPress={() => toggle(badge.id)}
                    style={[
                      styles.badgeItem,
                      isSelected && styles.badgeItemSelected,
                      isDisabled && styles.badgeItemDisabled,
                    ]}
                  >
                    <View style={styles.badgeIconWrap}>
                      {iconUri ? (
                        <Image source={{ uri: iconUri }} style={styles.badgeIcon} contentFit="contain" />
                      ) : (
                        <View style={[styles.badgeIcon, styles.badgeFallback]}>
                          <Ionicons name="ribbon-outline" size={28} color={colors.primaryStrong} />
                        </View>
                      )}
                      {isSelected ? (
                        <View style={styles.checkOverlay}>
                          <Ionicons name="checkmark-circle" size={22} color={colors.primaryStrong} />
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.badgeLabel} numberOfLines={2}>{badge.name}</Text>
                    {badge.rarity ? (
                      <Text style={styles.badgeRarity} numberOfLines={1}>{badge.rarity.toLowerCase()}</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {saveMutation.isError ? (
            <Text style={styles.errorText}>Não foi possível salvar. Tente novamente.</Text>
          ) : null}

          {saveMutation.isPending ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color={colors.primaryStrong} size="small" />
              <Text style={styles.savingText}>salvando...</Text>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d0f22',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.22)',
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(143, 70, 255, 0.14)',
  },
  title: { flex: 1, color: colors.text, fontFamily: fonts.extrabold, fontSize: 11, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 13, fontWeight: '600' },
  closeBtn: { padding: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  badgeItem: {
    width: 96,
    alignItems: 'center',
    gap: 6,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.18)',
    backgroundColor: 'rgba(143, 70, 255, 0.06)',
  },
  badgeItemSelected: {
    borderColor: colors.primaryStrong,
    backgroundColor: 'rgba(143, 70, 255, 0.18)',
  },
  badgeItemDisabled: { opacity: 0.4 },
  badgeIconWrap: { position: 'relative' },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(143, 70, 255, 0.1)',
  },
  badgeFallback: { alignItems: 'center', justifyContent: 'center' },
  checkOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#0d0f22',
    borderRadius: 11,
  },
  badgeLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 11, textAlign: 'center', lineHeight: 15 },
  badgeRarity: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  centerState: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14 },
  errorText: { color: colors.error, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.md },
  savingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.sm },
  savingText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 13 },
});
