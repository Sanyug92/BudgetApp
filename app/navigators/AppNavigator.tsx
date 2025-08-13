import React from 'react';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { useAppTheme } from '../theme/context';
import { navigationRef, useBackButtonHandler } from './navigationUtilities';
import { DrawerNavigator, DrawerParamList } from './DrawerNavigator';
import { AppLayout } from '../components/AppLayout';
import BudgetSetupScreen from '@/screens/BudgetSetupScreen';

export type AppStackParamList = {
  Main: NavigatorScreenParams<DrawerParamList>;
  Login: undefined;
  Signup: undefined;
  ResetPassword: undefined;
  BudgetSetup: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppStack = () => {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const {
    theme: { colors },
  } = useAppTheme();

  return (
    <AppLayout>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          navigationBarColor: colors.background,
          contentStyle: {
            paddingBottom: 0, // Removed padding since we're using a drawer
          },
        }}
        initialRouteName={isAuthenticated ? 'Main' : 'Login'}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={DrawerNavigator} />
            <Stack.Screen 
              name="BudgetSetup" 
              component={BudgetSetupScreen}
              options={{
                headerShown: true,
                title: 'Budget Setup',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </AppLayout>
  );
};

export function AppNavigator() {
  const {
    theme: { colors },
  } = useAppTheme();

  useBackButtonHandler((routeName) => false);

  // Map the app's color scheme to NavigationContainer's expected theme format
  const navigationTheme = {
    dark: false,
    colors: {
      primary: colors.palette.primary500 || '#6200ee',
      background: colors.background,
      card: colors.palette.neutral100 || '#ffffff',
      text: colors.palette.neutral800 || '#000000',
      border: colors.palette.neutral300 || '#e0e0e0',
      notification: colors.palette.angry500 || '#b00020',
    },
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: '400' as const,
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500' as const,
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '700' as const,
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '900' as const,
      },
    },
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
    >
      <AppStack />
    </NavigationContainer>
  );
};
