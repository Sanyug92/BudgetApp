import React from "react"
import { View, StyleSheet } from "react-native"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"

export function ResetPasswordScreen() {
  return (
    <View style={styles.container}>
      <ResetPasswordForm />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
})
