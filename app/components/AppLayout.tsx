import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { CreditCardDrawer } from '@/screens/CreditCardDrawer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();

  return (
    <View style={[styles.container]}>
      <View style={styles.content}>{children}</View>

      {user && (
        <View style={styles.drawerWrapper}>
         <CreditCardDrawer />
        </View>
      )}   
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  drawerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10, // Ensure it's above other content
    backgroundColor: 'transparent',
    elevation: 10, // For Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
});

