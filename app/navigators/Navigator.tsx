import React, { FC, JSX, lazy, Suspense, useState, useEffect } from "react"
import { TextStyle, ViewStyle } from "react-native"
import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { CompositeScreenProps } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { EpisodeProvider } from "@/context/EpisodeContext"

import { Icon } from "@/components/Icon"
// Import screens
import BudgetSetupScreen from "@/screens/BudgetSetupScreen"
import { BillsScreen } from "@/screens/BillsScreen"
import { CreditCardCarousel } from "@/screens/CreditCardCarousel"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { AppStackParamList, AppStackScreenProps } from "./AppNavigator"
// Import WeeklyBudgetScreen with dynamic import to avoid circular dependencies
const WeeklyBudgetScreen = lazy(() => import("@/screens/WeeklyBudgetScreen"));

// Add a fallback component for loading
const LoadingFallback: FC = () => null;
import { useBudgetContext, BudgetData } from "@/context/BudgetContext"

export type NavigatorParamList = {
  Home: { queryIndex?: string; itemIndex?: string }
  Budget: undefined
  Bills: undefined
  CreditCards: undefined
  Profile: undefined
  Settings: undefined
}

/**
 * Helper for automatically generating navigation prop types for each route.
 *
 * More info: https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type NavigatorScreenProps<T extends keyof NavigatorParamList> = CompositeScreenProps<
  BottomTabScreenProps<NavigatorParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

// Screen components with proper typing
const HomeTab: FC<NavigatorScreenProps<"Home">> = (props) => {
  const { budgetData, loading: budgetLoading } = useBudgetContext();
  const [hasCheckedBudget, setHasCheckedBudget] = useState(false);

  useEffect(() => {
    // Check if we need to redirect to Budget screen
    if (!budgetLoading && !hasCheckedBudget) {
      setHasCheckedBudget(true);
      const hasBudget = budgetData && budgetData.monthlyIncome > 0;
      if (!hasBudget) {
        // Use setTimeout to ensure navigation happens after the tab bar is mounted
        const timer = setTimeout(() => {
          props.navigation.navigate('Budget' as never);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [budgetData, budgetLoading, hasCheckedBudget, props.navigation]);

  // Default values - replace these with your actual data
  const defaultBudgetData = budgetData || {
    monthlyIncome: 0,
    mandatoryBills: [],
    optionalBills: [],
    savingsGoal: 0,
    creditCards: [],
    discretionarySpent: 0,
    discretionaryLeft: 0,
    discretionaryLeftPercentage: 0,
    discretionLimit: 0,
    totalSpent: 0,
    lastUpdated: Date.now()
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      <WeeklyBudgetScreen 
        currentWeek={1} // Replace with actual current week
        dayOfWeek={new Date().getDay()}
        onTargetSelect={(target) => console.log('Target selected:', target)}
        selectedTarget={0} // Optional
        route={props.route}
        navigation={props.navigation}
      />
    </Suspense>
  );
}

const BudgetTab: FC<NavigatorScreenProps<"Budget">> = (props) => {
  const { budgetData } = useBudgetContext();
  return (
    <BudgetSetupScreen 
      navigation={props.navigation}
      route={props.route}
    />
  );
}

const BillsTab: FC<NavigatorScreenProps<"Bills">> = (props) => {
  return <BillsScreen />;
}

const CreditCardsTab: FC = () => {
  return <CreditCardCarousel />;
}

const Tab = createBottomTabNavigator<NavigatorParamList>()

/**
 * This is the main navigator for the demo screens with a bottom tab bar.
 * Each tab is a stack navigator with its own set of screens.
 *
 * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
 * @returns {JSX.Element} The rendered `DemoNavigator`.
 */
export function Navigator(): JSX.Element {
  const { bottom } = useSafeAreaInsets()
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  return (
    <EpisodeProvider>
      <Tab.Navigator
        screenOptions={{
          tabBarHideOnKeyboard: true,
          headerShown: false,
          tabBarStyle: [
            themed($tabBar),
            { 
              height: bottom + 70,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              elevation: 0,
              borderTopWidth: 0,
            }
          ],
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.text,
          tabBarLabelStyle: themed($tabBarLabel),
          tabBarItemStyle: themed($tabBarItem),
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeTab}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ focused }) => (
              <Icon 
                icon="menu" 
                color={focused ? colors.tint : colors.tintInactive} 
                size={24}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Bills"
          component={BillsTab}
          options={{
            tabBarLabel: "Bills",
            tabBarIcon: ({ focused }) => (
              <Icon 
                icon="bell" 
                color={focused ? colors.tint : colors.tintInactive} 
                size={24}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Budget"
          component={BudgetTab}
          options={{
            tabBarLabel: "Budget",
            tabBarIcon: ({ focused }) => (
              <Icon 
                icon="settings" 
                color={focused ? colors.tint : colors.tintInactive} 
                size={24}
              />
            ),
          }}
        />

        <Tab.Screen
          name="CreditCards"
          component={CreditCardsTab}
          options={{
            tabBarLabel: "Credit Cards",
            tabBarIcon: ({ focused }) => (
              <Icon 
                icon="more" 
                color={focused ? colors.tint : colors.tintInactive} 
                size={24}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </EpisodeProvider>
  )
}

const $tabBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopColor: colors.transparent,
})

const $tabBarItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.md,
})

const $tabBarLabel: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.medium,
  lineHeight: 16,
  color: colors.text,
})
