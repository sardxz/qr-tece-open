import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../components/ui/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: {
          backgroundColor: 'rgba(7, 8, 22, 0.98)',
          borderTopColor: 'rgba(143, 70, 255, 0.12)',
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 10 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'buscar',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="comus"
        options={{
          title: 'comus',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen name="postar" options={{ href: null }} />
      <Tabs.Screen name="notificacoes" options={{ href: null }} />
    </Tabs>
  );
}
