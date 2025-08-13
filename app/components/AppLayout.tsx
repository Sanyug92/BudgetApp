import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme/context';
import { CreditCardDrawer } from '@/screens/CreditCardDrawer';
import BottomDrawer from './BottomDrawer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    theme: { colors },
  } = useAppTheme();

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
  },
  content: {
    flex: 1,
  },
  drawerWrapper: {
    paddingVertical: 12,
  },
});

