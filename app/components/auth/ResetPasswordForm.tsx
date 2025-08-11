import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, ScrollView } from "react-native";
import { Text, TextInput, Button, HelperText, Card } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { AlertCircle } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigators/AppNavigator";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, "ResetPassword">>();
  const { resetPassword } = useAuth();

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const { error } = await resetPassword(email.trim());
      if (error) throw error;
      setMessage("Check your email for the password reset link");
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Card.Title title="Reset Password" />
          <Card.Content>
            <Text style={styles.subtext}>
              Enter your email to receive a password reset link.
            </Text>

            {error && (
              <HelperText type="error" style={styles.helperText}>
                <AlertCircle size={14} color="red" /> {error}
              </HelperText>
            )}

            {message && (
              <HelperText type="info" style={styles.helperText}>
                <AlertCircle size={14} color="green" /> {message}
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
              disabled={loading}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              style={styles.button}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate("Login")}
              disabled={loading}
              style={styles.button}
            >
              Back to Login
            </Button>
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
    marginTop: 12,
    marginBottom: 12,
  },
  button: {
    marginTop: 12,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 8,
  },
});
