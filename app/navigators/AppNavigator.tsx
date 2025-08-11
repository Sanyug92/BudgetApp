/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { ComponentProps } from "react"
import { NavigationContainer, NavigatorScreenParams } from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"

import Config from "@/config"
import { useAuth } from "@/context/AuthContext"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { LoginScreen } from "@/screens/LoginScreen"
import { ResetPasswordScreen } from "@/screens/ResetPasswordScreen"
import { WeeklyBudgetScreen } from "@/screens/WeeklyBudgetScreen"
import { useBudgetContext, BudgetData } from "@/context/BudgetContext"
import { useState } from "react"
import { SignupScreen } from "@/screens/SignupScreen"
import { useAppTheme } from "@/theme/context"
import { BudgetProvider } from "@/context/BudgetContext"

import { DemoNavigator, DemoTabParamList } from "./DemoNavigator"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import BudgetSetupScreen from "@/screens/BudgetSetupScreen"
import { BillsScreen } from "@/screens/BillsScreen"
import { CreditCardCarousel } from "@/screens/CreditCardCarousel"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 */

export type AppStackParamList = {
  Home: undefined
  Login: undefined
  Signup: undefined
  ResetPassword: undefined
  Demo: NavigatorScreenParams<DemoTabParamList>
  Budget: undefined
  Bills: undefined
  CreditCards: undefined
  // 🔥 Your screens go here
  // IGNITE_GENERATOR_ANCHOR_APP_STACK_PARAM_LIST
}

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = () => {
  const { user } = useAuth()
  const isAuthenticated = !!user

  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
      initialRouteName={isAuthenticated ? "Home" : "Login"}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Home" component={HomeScreenWrapper} />
          <Stack.Screen name="Budget" component={BudgetSetupScreen} />
          <Stack.Screen 
            name="Bills" 
            component={BillsScreenWrapper} 
          />
          <Stack.Screen name="CreditCards" component={CreditCardCarousel} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}

      {/** 🔥 Your screens go here */}
      {/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
    </Stack.Navigator>
  )
}

export interface NavigationProps
  extends Partial<ComponentProps<typeof NavigationContainer<AppStackParamList>>> {}

const BillsScreenWrapper = () => {
  const { budgetData, updateBudgetData } = useBudgetContext();
  
  const handleUpdateSpentAmount = (amount: number) => {
    // Update the budget data with the new spent amount
    updateBudgetData({
      ...budgetData,
      discretionarySpent: amount,
      // Recalculate other dependent fields if needed
      discretionaryLeft: budgetData.monthlyIncome - budgetData.totalSpent - budgetData.savingsGoal - amount,
      discretionaryLeftPercentage: budgetData.monthlyIncome > 0 
        ? ((budgetData.monthlyIncome - budgetData.totalSpent - budgetData.savingsGoal - amount) / budgetData.monthlyIncome) * 100 
        : 0
    });
  };

  return <BillsScreen data={budgetData} updateSpentAmount={handleUpdateSpentAmount} />;
};

const HomeScreenWrapper = () => {
  const { budgetData } = useBudgetContext();
  const [selectedTarget, setSelectedTarget] = useState<number | undefined>();

  const currentDate = new Date();
  const currentWeek = Math.ceil(currentDate.getDate() / 7);
  const dayOfWeek = currentDate.getDay() || 7; // Convert 0 (Sunday) to 7

  return (
    <WeeklyBudgetScreen
      data={budgetData}
      currentWeek={currentWeek}
      dayOfWeek={dayOfWeek}
      onTargetSelect={setSelectedTarget}
      selectedTarget={selectedTarget}
    />
  );
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <BudgetProvider>
          <AppStack />
        </BudgetProvider>
      </ErrorBoundary>
    </NavigationContainer>
  )
}
