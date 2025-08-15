import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

export const LoadingScreen = () => {
  const theme = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary} 
          style={styles.spinner}
        />
        <Text variant="titleMedium" style={[styles.text, { color: theme.colors.onBackground }]}>
          Loading your budget...
        </Text>
        <Text variant="bodySmall" style={[styles.subtext, { color: theme.colors.onSurfaceVariant }]}>
          Just a moment, we're getting everything ready
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  text: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default LoadingScreen;
