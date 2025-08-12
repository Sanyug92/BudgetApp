import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { TextInput, Button } from "react-native-paper";
import { AlertCircle } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useBudgetContext } from "@/context/BudgetContext";

interface LoginFormProps {
  navigation: any; 
}

export function LoginForm({ navigation }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();

  const { budgetData, loading: budgetLoading } = useBudgetContext();
  const [isCheckingBudget, setIsCheckingBudget] = useState(false);

  useEffect(() => {
    // This effect will run when the auth state changes
    if (user && !loading) {
      console.log('User authenticated, navigating to Home');
      navigation.replace('Home');
    }
  }, [user, loading, navigation]);

  useEffect(() => {
    // This effect will run after successful login when budgetData is available
    if (isCheckingBudget && !budgetLoading) {
      const hasBudget = budgetData && budgetData.monthlyIncome > 0;
      // Always navigate to 'Home' which is part of the tab navigator
      // The Home screen can then handle the redirection to Budget if needed
      navigation.replace('Home');
      setIsCheckingBudget(false);
      setLoading(false);
    }
  }, [budgetData, budgetLoading, isCheckingBudget, navigation]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting to sign in...');
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }
      
      console.log('Sign in successful, waiting for auth state update...');
      
      // The navigation will be handled by the useEffect that watches for auth state changes
      // We don't need to navigate here as the AuthProvider will handle it
      
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
      </View>

      {/* Error Alert */}
      {error && (
        <View style={styles.errorBox}>
          <AlertCircle size={18} color="#B00020" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Email Input */}
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="name@example.com"
        style={styles.input}
      />

      {/* Password Input */}
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
        right={<TextInput.Icon icon="eye" />} // optional: toggle password visibility
      />

      {/* Forgot password */}
      <TouchableOpacity
        onPress={() => navigation.navigate("ForgotPassword")}
        style={styles.forgotPassword}
      >
        <Text style={styles.link}>Forgot password?</Text>
      </TouchableOpacity>

      {/* Submit */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>

      {/* Sign Up Link */}
      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.link}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 350,
    alignSelf: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDECEA",
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: "#B00020",
    fontSize: 14,
    flexShrink: 1,
  },
  input: {
    marginBottom: 12,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  link: {
    color: "#007AFF",
    fontWeight: "600",
  },
  button: {
    marginBottom: 16,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  signupText: {
    fontSize: 14,
    color: "#555",
  },
});
