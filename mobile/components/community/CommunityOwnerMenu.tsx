import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api/client';
import { pickImageFromLibrary, uploadImageAsset } from '../upload/image-upload';
import { colors, radius, spacing } from '../ui/theme';

type CommunityData = {
  name: string;
  description: string | null;
  rules: string | null;
};

type Props = {
  slug: string;
  community: CommunityData;
  onUpdated: () => void;
  onDeleted: () => void;
  canInvite?: boolean;
};

export function CommunityOwnerMenu({ slug, community, onUpdated, onDeleted, canInvite = true }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetMaxHeight = Math.max(260, height - insets.top - insets.bottom - spacing.xxl);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? '');
  const [rules, setRules] = useState(community.rules ?? '');

  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openEdit() {
    setName(community.name);
    setDescription(community.description ?? '');
    setRules(community.rules ?? '');
    setMenuOpen(false);
    setEditOpen(true);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (trimmed.length < 3 || saving) return;
    setSaving(true);
    try {
      const res = await api(`/api/communities/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmed,
          description: description.slice(0, 500) || null,
          rules: rules.slice(0, 2000) || null,
        }),
      });
      if ((res as { error?: string }).error) throw new Error((res as { error: string }).error);
      setEditOpen(false);
      onUpdated();
    } catch (e) {
      Alert.alert('erro', e instanceof Error ? e.message.toLowerCase() : 'nao foi possivel salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCover() {
    setMenuOpen(false);
    if (uploadingCover) return;
    try {
      const asset = await pickImageFromLibrary({ allowsEditing: true, aspect: [3, 1], quality: 0.9 });
      if (!asset) return;
      setUploadingCover(true);
      const upload = await uploadImageAsset('/api/upload/community-cover', asset);
      if (!upload.url) throw new Error('upload falhou');
      const res = await api(`/api/communities/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ coverImageUrl: upload.url }),
      });
      if ((res as { error?: string }).error) throw new Error((res as { error: string }).error);
      onUpdated();
    } catch (e) {
      if (e instanceof Error && e.message !== 'cancelled') {
        Alert.alert('erro', e.message.toLowerCase());
      }
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleInvite() {
    setMenuOpen(false);
    if (generatingInvite) return;
    setGeneratingInvite(true);
    try {
      const res = await api<{ url: string }>(`/api/communities/${slug}/invites`, {
        method: 'POST',
      });
      if (!res.url) throw new Error('nao foi possivel gerar convite');
      const link = res.url;
      await Share.share({ message: `entre na comunidade ${community.name}: ${link}`, url: link });
    } catch (e) {
      if (e instanceof Error && e.message !== 'cancelled') {
        Alert.alert('erro', e.message.toLowerCase());
      }
    } finally {
      setGeneratingInvite(false);
    }
  }

  function confirmDelete() {
    setMenuOpen(false);
    Alert.alert(
      'excluir comunidade',
      'todos os posts e membros serao removidos. isso nao pode ser desfeito.',
      [
        { text: 'cancelar', style: 'cancel' },
        { text: 'excluir', style: 'destructive', onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await api(`/api/communities/${slug}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) {
      Alert.alert('erro', e instanceof Error ? e.message.toLowerCase() : 'nao foi possivel excluir.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.trigger} activeOpacity={0.7}>
        <Text style={styles.dots}>•••</Text>
      </TouchableOpacity>

      {/* Menu principal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View
            style={[styles.sheet, { maxHeight: sheetMaxHeight, paddingBottom: insets.bottom + spacing.lg }]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <MenuItem label="editar comunidade" onPress={openEdit} />
              <MenuItem label={uploadingCover ? 'enviando capa...' : 'alterar capa'} onPress={handleCover} disabled={uploadingCover} />
              {canInvite ? (
                <MenuItem label={generatingInvite ? 'gerando convite...' : 'convidar pessoas'} onPress={handleInvite} disabled={generatingInvite} />
              ) : null}
              <View style={styles.divider} />
              <MenuItem label="excluir comunidade" onPress={confirmDelete} danger />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMenuOpen(false)} activeOpacity={0.7}>
                <Text style={styles.cancelText}>cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Modal de edição */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => !saving && setEditOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => !saving && setEditOpen(false)}>
          <View
            style={[styles.editSheet, { maxHeight: sheetMaxHeight, paddingBottom: insets.bottom + spacing.lg }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.editTitle}>editar comunidade</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.editScrollContent}
            >
              <Text style={styles.label}>nome</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                maxLength={80}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.counter}>{name.length}/80</Text>

              <Text style={styles.label}>descrição</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.counter}>{description.length}/500</Text>

              <Text style={styles.label}>regras</Text>
              <TextInput
                style={[styles.input, styles.inputMulti, { minHeight: 100 }]}
                value={rules}
                onChangeText={setRules}
                multiline
                maxLength={2000}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.counter}>{rules.length}/2000</Text>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => setEditOpen(false)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnSecondaryText}>cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnPrimary, (saving || name.trim().length < 3) && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={saving || name.trim().length < 3}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnPrimaryText}>{saving ? 'salvando...' : 'salvar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuItem({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.menuItemText, danger && styles.menuItemDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dots: {
    color: colors.textMuted,
    fontSize: 18,
    letterSpacing: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  menuItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemDisabled: { opacity: 0.45 },
  menuItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemDanger: { color: colors.error },
  divider: { height: spacing.xs },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  editSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
  },
  editScrollContent: {
    paddingBottom: spacing.lg,
  },
  editTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputMulti: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  counter: {
    color: colors.textSoft,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  btnPrimaryText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
});
