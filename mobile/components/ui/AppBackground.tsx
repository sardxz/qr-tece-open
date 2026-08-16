import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from './theme';

type AppBackgroundProps = {
  children: ReactNode;
};

export function AppBackground({ children }: AppBackgroundProps) {
  return (
    <View style={styles.root}>
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
      <View style={[styles.glow, styles.glowSide]} />
      <View style={styles.overlay}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 5, 18, 0.92)',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTop: {
    top: -120,
    left: -40,
    width: 260,
    height: 260,
    backgroundColor: 'rgba(139, 61, 255, 0.18)',
  },
  glowBottom: {
    right: -90,
    bottom: -110,
    width: 320,
    height: 320,
    backgroundColor: 'rgba(43, 84, 255, 0.12)',
  },
  glowSide: {
    top: '40%',
    left: -120,
    width: 220,
    height: 220,
    backgroundColor: 'rgba(255, 96, 138, 0.08)',
  },
});
