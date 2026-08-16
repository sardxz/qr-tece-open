import * as ImagePicker from 'expo-image-picker';
import { ApiClientError } from '../../lib/api/client';
import { loadToken } from '../../lib/auth/storage';
import { API_BASE_URL } from '../../lib/config';

type PickImageOptions = {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
};

type UploadResult = {
  url: string;
};

type UploadAsset = Pick<ImagePicker.ImagePickerAsset, 'uri' | 'fileName' | 'mimeType'>;

export async function pickImageFromLibrary(options: PickImageOptions = {}) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted && permission.accessPrivileges !== 'limited') {
    throw new Error('Permita que o qr.tecê acesse suas fotos para continuar.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: options.allowsEditing ?? false,
    aspect: options.aspect,
    quality: options.quality ?? 0.86,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
}

export async function uploadImageAsset(path: string, asset: UploadAsset): Promise<UploadResult> {
  const token = await loadToken();

  if (!token) {
    throw new ApiClientError(401, 'Sua sessão expirou. Entre novamente para continuar.');
  }

  const formData = new FormData();
  const fileName = asset.fileName?.trim() || buildFallbackFileName(asset.mimeType);
  const mimeType = asset.mimeType || guessMimeType(fileName);

  formData.append('file', {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Erro ${response.status}`;

    throw new ApiClientError(response.status, message, data);
  }

  if (!data || typeof data !== 'object' || !('url' in data) || typeof (data as { url: unknown }).url !== 'string') {
    throw new Error('O servidor não retornou a URL da imagem.');
  }

  return data as UploadResult;
}

export function getUploadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return 'Sua sessão expirou. Entre novamente para continuar.';
    }

    if (error.status === 400) {
      return error.message || 'A imagem precisa ser JPG, PNG ou WebP e respeitar o limite de tamanho.';
    }

    if (error.status === 429) {
      return error.message || 'Você atingiu o limite de uploads por agora. Tente novamente mais tarde.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function buildFallbackFileName(mimeType?: string | null) {
  const extension = guessExtension(mimeType);
  return `upload-${Date.now()}.${extension}`;
}

function guessExtension(mimeType?: string | null) {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

function guessMimeType(fileName: string) {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}
