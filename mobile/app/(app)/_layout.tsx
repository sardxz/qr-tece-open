import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="criar" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="nova-comu" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="post/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="usuario/[username]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="comunidade/[slug]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="convite/comunidade/[token]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="atividades" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="amigos" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="depos-recebidos" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
