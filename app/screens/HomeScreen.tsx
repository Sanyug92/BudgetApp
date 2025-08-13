import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { WeeklyBudgetScreen } from './WeeklyBudgetScreen';

export function HomeScreen() {
  const theme = useTheme();
  const [selectedTarget, setSelectedTarget] = useState<number | undefined>(undefined);
  
  // Get current week number (1-52)
  const currentWeek = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  // Get current day of week (0-6)
  const dayOfWeek = new Date().getDay();

  const handleTargetSelect = useCallback((target: number) => {
    setSelectedTarget(target);
    // You can add additional logic here when a target is selected
    console.log('Selected target:', target);
  }, []);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <WeeklyBudgetScreen 
        currentWeek={currentWeek}
        dayOfWeek={dayOfWeek}
        onTargetSelect={handleTargetSelect}
        selectedTarget={selectedTarget}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
