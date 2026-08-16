import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMediaUri } from '../../components/profile/profile-utils';
import { getUploadErrorMessage, pickImageFromLibrary, uploadImageAsset } from '../../components/upload/image-upload';
import { AppBackground } from '../../components/ui/AppBackground';
import { FormField } from '../../components/ui/FormField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusNotice } from '../../components/ui/StatusNotice';
import { colors, radius, spacing } from '../../components/ui/theme';
import { api, ApiClientError } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/context';

type CreatedCommunity = {
  id: string;
  name: string;
  slug: string;
  coverImageUrl: string;
  description: string | null;
  memberCount?: number;
};

type SelectedCover = {
  localUri: string;
  remoteUrl: string;
};

export default function NovaComuScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState('');
  const [cover, setCover] = useState<SelectedCover | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewUri = cover ? getMediaUri(cover.remoteUrl) ?? cover.localUri : null;

  const validationError = useMemo(() => {
    const cleanName = name.trim();
    const cleanSlug = slug.trim();
    const cleanDescription = description.trim();

    if (cleanName.length < 3) return 'o nome precisa ter pelo menos 3 caracteres.';
    if (cleanName.length > 80) return 'o nome pode ter no máximo 80 caracteres.';
    if (!/^[a-z0-9-]{3,60}$/.test(cleanSlug)) {
      return 'o slug precisa ter 3 a 60 caracteres, usando letras minúsculas, números e hífens.';
    }
    if (cleanDescription.length > 500) return 'a descrição pode ter no máximo 500 caracteres.';
    if (maxMembers.trim() !== '') {
      const n = Number(maxMembers);
      if (!Number.isInteger(n) || n < 2 || n > 500) return 'o limite de membros deve ser um número entre 2 e 500.';
    }
    if (!cover?.remoteUrl) return 'escolha uma imagem de capa.';
    return null;
  }, [cover?.remoteUrl, description, name, slug]);

  const mutation = useMutation({
    mutationFn: () =>
      api<CreatedCommunity>('/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          coverImageUrl: cover?.remoteUrl,
          description: description.trim() || undefined,
          isPrivate,
          rules: undefined,
          maxMembers: maxMembers.trim() !== '' ? Number(maxMembers) : null,
        }),
      }),
    onSuccess: (community) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.username, 'communities'] });
      queryClient.invalidateQueries({ queryKey: ['community-detail', community.slug] });
      router.replace({
        pathname: '/comunidade/[slug]',
        params: {
          slug: community.slug,
          communityId: community.id,
          name: community.name,
          coverImageUrl: community.coverImageUrl,
          memberCount: String(community.memberCount ?? 1),
          description: community.description ?? '',
        },
      });
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message.toLowerCase());
      } else if (error instanceof Error) {
        setErrorMessage(error.message.toLowerCase());
      } else {
        setErrorMessage('não foi possível criar a comunidade agora.');
      }
    },
  });

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(slugify(value));
  };

  const handlePickCover = async () => {
    setErrorMessage(null);
    setIsUploadingCover(true);
    try {
      const asset = await pickImageFromLibrary({ allowsEditing: true, aspect: [3, 1], quality: 0.86 });
      if (!asset) return;
      const uploaded = await uploadImageAsset('/api/upload/community-cover', asset);
      setCover({ localUri: asset.uri, remoteUrl: uploaded.url });
    } catch (error) {
      setErrorMessage(getUploadErrorMessage(error, 'não foi possível preparar a capa agora.'));
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = () => {
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    if (isUploadingCover) {
      setErrorMessage('espere o upload da capa terminar.');
      return;
    }
    setErrorMessage(null);
    mutation.mutate();
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.headerAction}>voltar</Text>
              </Pressable>
              <Text style={styles.headerTitle}>nova comu</Text>
              <View style={styles.headerSpacer} />
            </View>

            {errorMessage ? <StatusNotice tone="error" message={errorMessage} /> : null}

            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <FormField
                label="Nome da comunidade"
                value={name}
                onChangeText={handleNameChange}
                placeholder="ex: Clube do Bordado"
                autoCapitalize="words"
                maxLength={80}
              />

              <FormField
                label="Slug"
                value={slug}
                onChangeText={handleSlugChange}
                placeholder="clube-do-bordado"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={60}
                hint="usado no link da comunidade"
              />

              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  multiline
                  value={description}
                  onChangeText={setDescription}
                  placeholder="conte rapidamente sobre a comu"
                  placeholderTextColor={colors.textSoft}
                  maxLength={500}
                  textAlignVertical="top"
                  style={styles.textarea}
                />
                <Text style={styles.counter}>{500 - description.length}</Text>
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.label}>Comunidade fechada</Text>
                  <Text style={styles.toggleHint}>membros entram só por convite</Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.text}
                />
              </View>

              <FormField
                label="Limite de membros (opcional)"
                value={maxMembers}
                onChangeText={setMaxMembers}
                placeholder="ex: 100"
                keyboardType="numeric"
                maxLength={3}
                hint="deixe em branco para sem limite (máx. 500)"
              />

              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>Capa</Text>
                <Pressable
                  onPress={handlePickCover}
                  disabled={isUploadingCover || mutation.isPending}
                  style={[styles.coverPicker, isUploadingCover || mutation.isPending ? styles.coverPickerDisabled : null]}
                  accessibilityLabel="selecionar capa da comunidade"
                >
                  {previewUri ? (
                    <Image source={{ uri: previewUri }} style={styles.coverPreview} contentFit="cover" transition={200} alt="" />
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      {isUploadingCover ? (
                        <ActivityIndicator color={colors.text} />
                      ) : (
                        <Ionicons name="image-outline" size={28} color={colors.text} />
                      )}
                      <Text style={styles.coverText}>{isUploadingCover ? 'enviando capa...' : 'selecionar imagem'}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              <PrimaryButton
                label="Criar"
                onPress={handleSubmit}
                disabled={mutation.isPending || isUploadingCover}
                loading={mutation.isPending}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBackground>
  );
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headerAction: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  headerTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 45 },
  scrollArea: { flex: 1 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.xl },
  fieldWrapper: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  textarea: {
    minHeight: 112,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  counter: { alignSelf: 'flex-end', color: colors.textSoft, fontSize: 12, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  toggleInfo: { flex: 1, gap: 2 },
  toggleHint: { color: colors.textSoft, fontSize: 13 },
  coverPicker: {
    height: 150,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.26)',
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  coverPickerDisabled: { opacity: 0.65 },
  coverPreview: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  coverText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
