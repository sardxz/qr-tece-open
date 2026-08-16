import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from './theme';

type StatusNoticeProps = {
  tone: 'error' | 'success';
  message: string;
};

export function StatusNotice({ tone, message }: StatusNoticeProps) {
  const isError = tone === 'error';

  return (
    <View style={[styles.box, isError ? styles.errorBox : styles.successBox]}>
      <Text style={[styles.text, isError ? styles.errorText : styles.successText]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorBox: {
    borderColor: 'rgba(255, 125, 152, 0.4)',
    backgroundColor: 'rgba(255, 125, 152, 0.12)',
  },
  successBox: {
    borderColor: 'rgba(89, 213, 155, 0.4)',
    backgroundColor: 'rgba(89, 213, 155, 0.12)',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: colors.error,
  },
  successText: {
    color: colors.success,
  },
});
