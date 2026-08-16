import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../ui/theme';
import { getInitials, getMediaUri } from './profile-utils';

type ProfileAvatarProps = {
  username: string;
  imageUrl: string | null;
  size?: number;
};

export function ProfileAvatar({ username, imageUrl, size = 56 }: ProfileAvatarProps) {
  const uri = getMediaUri(imageUrl);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceSoft }}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.label, { fontSize: Math.max(16, size * 0.34) }]}>{getInitials(username)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 61, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.32)',
  },
  label: {
    color: colors.text,
    fontWeight: '700',
  },
});
