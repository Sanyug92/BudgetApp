import { TextStyle, ViewStyle } from "react-native"
import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { CompositeScreenProps } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FC } from "react"

import { Icon } from "@/components/Icon"
import { EpisodeProvider } from "@/context/EpisodeContext"
import { translate } from "@/i18n/translate"
// Import placeholder screens - these should be replaced with your actual screens
import { DemoShowroomScreen as OriginalShowroomScreen } from "@/screens/DemoShowroomScreen/DemoShowroomScreen"
import BudgetSetupScreen from "@/screens/BudgetSetupScreen"
import { DemoPodcastListScreen as OriginalPodcastScreen } from "@/screens/DemoPodcastListScreen"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { AppStackParamList, AppStackScreenProps } from "./AppNavigator"

// Create wrapper components with proper typing
const HomeScreen: FC<DemoTabScreenProps<"Home">> = (props) => (
  <OriginalShowroomScreen 
    {...props} 
    route={props.route as any} 
    navigation={props.navigation as any} 
  />
)

const BudgetScreen: FC<DemoTabScreenProps<"Budget">> = (props) => (
  <BudgetSetupScreen 
    navigation={props.navigation}
    route={props.route}
  />
)

const BillsScreen: FC<DemoTabScreenProps<"Bills">> = (props) => (
  <OriginalPodcastScreen 
    {...props} 
    route={props.route as any} 
    navigation={props.navigation as any} 
  />
)

export type DemoTabParamList = {
  Home: { queryIndex?: string; itemIndex?: string }
  Budget: undefined
  Bills: undefined
}

/**
 * Helper for automatically generating navigation prop types for each route.
 *
 * More info: https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type DemoTabScreenProps<T extends keyof DemoTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<DemoTabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

const Tab = createBottomTabNavigator<DemoTabParamList>()

/**
 * This is the main navigator for the demo screens with a bottom tab bar.
 * Each tab is a stack navigator with its own set of screens.
 *
 * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
 * @returns {JSX.Element} The rendered `DemoNavigator`.
 */
export function DemoNavigator() {
  const { bottom } = useSafeAreaInsets()
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  return (
    <EpisodeProvider>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: themed([$tabBar, { height: bottom + 70 }]),
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.text,
          tabBarLabelStyle: themed($tabBarLabel),
          tabBarItemStyle: themed($tabBarItem),
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ focused }) => (
              <Icon
                icon="components"
                color={focused ? colors.tint : colors.tintInactive}
                size={30}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Budget"
          component={BudgetScreen}
          options={{
            tabBarLabel: "Budget",
            tabBarIcon: ({ focused }) => (
              <Icon
                icon="github"
                color={focused ? colors.tint : colors.tintInactive}
                size={30}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Bills"
          component={BillsScreen}
          options={{
            tabBarLabel: "Bills",
            tabBarIcon: ({ focused }) => (
              <Icon 
                icon="bell" 
                color={focused ? colors.tint : colors.tintInactive} 
                size={30} 
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
