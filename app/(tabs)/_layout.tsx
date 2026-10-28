import { useSyncExternalStore } from 'react';
import { Redirect, router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSyncStore } from '../../src/store/syncStore';

export default function TabLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useSyncExternalStore(
    (onStoreChange) =>
      useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'left',
        headerRight: () => <HeaderActions />,
        headerTintColor: '#FFFFFF',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: '#092A50',
        },
        headerTitleStyle: {
          color: '#FFFFFF',
          fontSize: 17,
          fontWeight: '700',
        },
        tabBarActiveTintColor: '#68D7D7',
        tabBarInactiveTintColor: '#A8BED4',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar Medidor',
        }}
      />
      <Tabs.Screen
        name="pendientes"
        options={{
          title: 'Mis Lecturas',
        }}
      />
    </Tabs>
  );
}

function HeaderActions() {
  const logout = useAuthStore((state) => state.logout);

  function handleLogout() {
    logout();
    router.replace('/');
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginRight: 15,
      }}
    >
      <NetworkBadge />
      <Pressable
        accessibilityHint="Cierra tu sesión y vuelve al inicio."
        accessibilityLabel="Cerrar sesión"
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.logoutButtonPressed,
        ]}
      >
        <Feather color="#C8323E" name="log-out" size={20} />
      </Pressable>
    </View>
  );
}

function NetworkBadge() {
  const isConnected = useSyncStore((state) => state.isConnected);
  const pendingCount = useSyncStore((state) => state.pendingCount);

  return (
    <View
      accessible
      accessibilityLabel={`${isConnected ? 'Conectado' : 'Modo Offline'} | Pendientes: ${pendingCount}`}
      style={styles.badge}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[
          styles.statusIndicator,
          isConnected ? styles.connectedIndicator : styles.offlineIndicator,
        ]}
      />
      <Text numberOfLines={1} style={styles.badgeText}>
        Pend. {pendingCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    maxWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    marginRight: 5,
    borderRadius: 4,
  },
  connectedIndicator: {
    backgroundColor: '#68D7D7',
  },
  offlineIndicator: {
    backgroundColor: '#DC2626',
  },
  badgeText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  logoutButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(200,50,62,0.12)',
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  tabBar: {
    height: 68,
    paddingTop: 7,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#092A50',
    elevation: 10,
    shadowColor: '#123B5D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});