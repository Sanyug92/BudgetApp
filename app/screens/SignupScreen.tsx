import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { SignupForm } from "@/components/auth/SignupForm";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigators/AppNavigator";
import { FC } from "react";

interface SignupScreenProps {
  navigation: NativeStackNavigationProp<AppStackParamList, "Signup">;
}

export const SignupScreen: FC<SignupScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const route = useRoute();

  // Get the "from" route or fallback to Home
  const from = (route.params as any)?.from || "Home";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* App Branding */}
      <View style={styles.brandContainer}>
        <Text style={styles.brandTitle}>Daily Dough</Text>
        <Text style={styles.brandQuote}>
          “Say goodbye to credit card debt and hello to financial freedom.”
        </Text>
        <Text style={styles.brandFooter}>— The Daily Dough Team</Text>
      </View>

      {/* Signup Form */}
      <View style={styles.formContainer}>
        <SignupForm navigation={navigation} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  brandContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  brandQuote: {
    fontSize: 16,
    color: "#4a4a4a",
    textAlign: "center",
    marginBottom: 8,
    fontStyle: "italic",
  },
  brandFooter: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
    width: "100%",
    paddingRight: 20,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
});

export default SignupScreen;
