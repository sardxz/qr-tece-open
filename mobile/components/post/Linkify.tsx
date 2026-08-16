import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { colors } from '../ui/theme';

// URLs http(s):// e www. — o match vai ate' o espaco, entao #fragmentos ficam na URL.
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

function isUrl(s: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(s);
}

/**
 * Recebe um texto e devolve nodes pra colocar dentro de um <Text> pai,
 * com as URLs renderizadas como <Text> clicavel (abre no navegador).
 */
export function linkifyNative(text: string): React.ReactNode {
  return text.split(URL_REGEX).map((part, i) => {
    if (part && isUrl(part)) {
      // Pontuacao final nao faz parte da URL.
      const m = part.match(/^(.*?)([.,;:!?)\]]*)$/);
      const url = m ? m[1] : part;
      const trailing = m ? m[2] : '';
      const href = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
      return (
        <Text key={i}>
          <Text style={styles.link} onPress={() => Linking.openURL(href)}>
            {url}
          </Text>
          {trailing}
        </Text>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const styles = StyleSheet.create({
  link: {
    color: colors.accentBlue,
    textDecorationLine: 'underline',
  },
});
