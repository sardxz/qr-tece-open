import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from './theme';

type FormFieldProps = ComponentProps<typeof TextInput> & {
  label: string;
  hint?: string;
  error?: string | null;
};

export function FormField({ label, hint, error, style, secureTextEntry, ...props }: FormFieldProps) {
  const [secureVisible, setSecureVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          placeholderTextColor={colors.textSoft}
          style={[styles.input, style]}
          secureTextEntry={secureTextEntry && !secureVisible}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setSecureVisible(v => !v)} style={styles.eyeButton} hitSlop={8}>
            <Ionicons name={secureVisible ? 'eye-off' : 'eye'} size={20} color={colors.textSoft} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    paddingHorizontal: spacing.md,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  eyeButton: {
    paddingLeft: spacing.sm,
  },
  hint: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
});
