import React, { useState } from "react";
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, HelperText, Card } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { AlertCircle } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigators/AppNavigator";

type SignupFormNavigationProp = NativeStackNavigationProp<AppStackParamList, 'Signup'>;

interface SignupFormProps {
  navigation: SignupFormNavigationProp;
}

export function SignupForm({ navigation }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();

  const handleSubmit = async () => {
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const { error } = await signUp(email.trim(), password);
      if (error) throw error;
      navigation.navigate("Home"); // or your main dashboard screen
    } catch (err: any) {
      setError(err?.message || "Failed to create an account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Card.Title title="Create an account" />
          <Card.Content>
            <Text style={styles.subtext}>Enter your details to get started</Text>

            {error && (
              <HelperText type="error" style={styles.helperText}>
                <AlertCircle size={14} color="red" /> {error}
              </HelperText>
            )}

            <TextInput
              label="Email"
              placeholder="name@example.com"
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />

            <TextInput
              label="Password"
              mode="outlined"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            <Text style={styles.passwordNote}>
              Password must be at least 6 characters
            </Text>

            <TextInput
              label="Confirm Password"
              mode="outlined"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>

            <View style={styles.signinTextContainer}>
              <Text>Already have an account? </Text>
              <Text
                style={styles.signinLink}
                onPress={() => navigation.navigate("Login")}
              >
                Sign in
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  card: {
    borderRadius: 12,
    elevation: 3,
  },
  subtext: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  passwordNote: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 8,
  },
  signinTextContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  signinLink: {
    color: "#6200ee",
    fontWeight: "bold",
  },
});
