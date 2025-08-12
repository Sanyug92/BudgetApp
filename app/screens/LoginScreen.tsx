import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { AppStackParamList } from "@/navigators/AppNavigator";
import { FC } from "react";

interface LoginScreenProps {
  navigation: NativeStackNavigationProp<AppStackParamList, "Login">
}

export const LoginScreen: FC<LoginScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const route = useRoute();

  // Get the "from" route or fallback to Home
  const from = (route.params as any)?.from || "Home";

  interface LoginScreenProps {
    navigation: NativeStackNavigationProp<AppStackParamList, "Login">
  }

  useEffect(() => {
    if (user) {
      // Navigate to the main app screen after successful login
      // The Demo screen is a tab navigator, so we're navigating to the 'Home' tab by default
      navigation.replace("Demo", {
        screen: "Home",
        params: {
          // Add any required parameters for the Home screen here
          // Based on DemoTabParamList, Home can accept queryIndex and itemIndex
          queryIndex: undefined,
          itemIndex: undefined
        }
      });
    }
  }, [user, navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* App Branding */}
      <View style={styles.brandContainer}>
        <Text style={styles.brandTitle}>Credit Wise</Text>
        <Text style={styles.brandQuote}>
          “Take control of your finances and achieve your financial goals with
          our intuitive budgeting tools.”
        </Text>
        <Text style={styles.brandFooter}>— The Credit Wise Team</Text>
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
      <LoginForm navigation={navigation} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  brandContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  brandQuote: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 5,
  },
  brandFooter: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 350,
    alignSelf: "center",
  },
});
