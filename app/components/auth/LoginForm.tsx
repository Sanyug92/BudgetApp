import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { TextInput, Button } from "react-native-paper";
import { AlertCircle } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";

interface LoginFormProps {
  navigation: any; 
}

export function LoginForm({ navigation }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      navigation.navigate('Home'); // Specify the route name to navigate to after login
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
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
