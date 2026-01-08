import React from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { UserRole } from '../../src/types';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, Text, Platform } from 'react-native';

export default function TabsLayout() {
  const { user, isLoading, isInitialized, logout } = useAuth();

  const handleLogout = async () => {
    // Su web usa window.confirm, su mobile usa Alert
    const isWeb = Platform.OS === 'web';
    
    const doLogout = async () => {
      try {
        await logout();
        // Redirect alla pagina di login
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    if (isWeb) {
      if (window.confirm('Sei sicuro di voler uscire?')) {
        await doLogout();
      }
    } else {
      Alert.alert(
        'Conferma Logout',
        'Sei sicuro di voler uscire?',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Esci', style: 'destructive', onPress: doLogout }
        ]
      );
    }
  };

  if (isLoading || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  // NON controllare isAuthenticated qui - lascia renderizzare sempre
  // Il redirect avviene tramite window.location.href che bypassa React

  const isAdmin = user?.ruolo === 'amministratore';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4A90D9',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 4,
        },
        headerStyle: {
          backgroundColor: '#4A90D9',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Accademia de "I Musici"',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Utenti',
          headerTitle: 'Anagrafica Utenti',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          href: isAdmin ? '/users' : null,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Presenze',
          headerTitle: 'Registro Presenze',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Pagamenti',
          headerTitle: 'Pagamenti',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Avvisi',
          headerTitle: 'Notifiche',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen
        name="courses"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  logoutButton: {
    marginRight: 16,
    padding: 8,
  },
});
