/* eslint-disable import/first */
/**
 * Welcome to the main entry point of the app. In this file, we'll
 * be kicking off our app.
 *
 * Most of this file is boilerplate and you shouldn't need to modify
 * it very often. But take some time to look through and understand
 * what is going on here.
 *
 * The app navigation resides in ./app/navigators, so head over there
 * if you're interested in adding screens and navigators.
 */
if (__DEV__) {
  // Load Reactotron in development only.
  // Note that you must be using metro's `inlineRequires` for this to work.
  // If you turn it off in metro.config.js, you'll have to manually import it.
  require("./devtools/ReactotronConfig.ts")
}
import "./utils/gestureHandler"

import { useEffect, useState } from "react"
import { useFonts } from "expo-font"
import * as Linking from "expo-linking"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"
import { PaperProvider } from "react-native-paper"

import { AuthProvider } from "./context/AuthContext"
import { BudgetProvider } from "./context/BudgetContext"
import { initI18n } from "./i18n"
import { AppNavigator } from "./navigators/AppNavigator"
import { useNavigationPersistence } from "./navigators/navigationUtilities"
import { ThemeProvider } from "./theme/context"
import { customFontsToLoad } from "./theme/typography"
import { loadDateFnsLocale } from "./utils/formatDate"
import * as storage from "./utils/storage"
import { LoadingScreen } from "./components/LoadingScreen"

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"

// Web linking configuration
const prefix = Linking.createURL("/")
const config = {
  screens: {
    Home: {
      path: "",
      screens: {
        Budget: "budget",
        Bills: "bills",
        CreditCards: "credit-cards",
        Profile: "profile",
        Settings: "settings"
      }
    },
    Login: "login",
    Welcome: "welcome",
    // Remove the Demo section if you're not using it
  }
}

/**
 * This is the root component of our app.
 * @param {AppProps} props - The props for the `App` component.
 * @returns {JSX.Element} The rendered `App` component.
 */
export function App() {
  const {
    isRestored: isNavigationStateRestored,
  } = useNavigationPersistence(storage, NAVIGATION_PERSISTENCE_KEY)

  const [areFontsLoaded, fontLoadError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const [isLoadingComplete, setIsLoadingComplete] = useState(false)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initI18n()
        await loadDateFnsLocale()
        setIsI18nInitialized(true)
      } catch (error) {
        console.error('Failed to initialize app:', error)
      } finally {
        // Add a small delay to ensure smooth transition
        setTimeout(() => setIsLoadingComplete(true), 500)
      }
    }

    initializeApp()
  }, [])

  const isAppReady = isNavigationStateRestored && isI18nInitialized && (areFontsLoaded || fontLoadError) && isLoadingComplete

  const linking = {
    prefixes: [prefix],
    config,
  }

  // Show loading screen while initializing
  if (!isAppReady) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <PaperProvider>
            <LoadingScreen />
          </PaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    )
  }

  // otherwise, we're ready to render the app
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <KeyboardProvider>
        <AuthProvider>
          <BudgetProvider>
            <ThemeProvider>
              <PaperProvider>
                <AppNavigator />
              </PaperProvider>
            </ThemeProvider>
          </BudgetProvider>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}
