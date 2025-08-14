import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from 'react-native-paper';
import { BillsScreen } from '../screens/BillsScreen';
import { AppHeader } from '../components/AppHeader';
import { CustomDrawerContent } from './CustomDrawerContent';
import { HomeNavigator } from './HomeNavigator';
import BudgetSetupScreen from '../screens/BudgetSetupScreen';

// Create a type-safe wrapper for the BudgetSetupScreen
const BudgetScreenWrapper = () => {
  return <BudgetSetupScreen />;
};

export type DrawerParamList = {
  Home: undefined;
  Bills: undefined;
  Budget: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export function DrawerNavigator() {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        header: ({ route, options }) => (
          <AppHeader
            title={options.title || route.name}
            showMenu={true}
          />
        ),
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.onBackground,
        drawerStyle: {
          backgroundColor: theme.colors.surface,
          width: '75%',
          zIndex: 1000, // Ensure drawer stays on top
          elevation: 50, // Higher elevation for Android
        },
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
        drawerType: 'front',
        overlayColor: 'transparent',
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeNavigator} 
        options={{ title: 'Dashboard' }}
      />
      <Drawer.Screen 
        name="Budget" 
        component={BudgetScreenWrapper} 
        options={{ title: 'Budget' }}
      />
      <Drawer.Screen 
        name="Bills" 
        component={BillsScreen} 
        options={{ title: 'My Bills' }}
      />
    </Drawer.Navigator>
  );
}
