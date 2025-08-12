import React, { useEffect, useRef, useState, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { Card, Title, Paragraph, Chip, ProgressBar } from "react-native-paper";
import { Calendar, AlertCircle, CheckCircle2, Info } from "lucide-react-native";
import { NavigationProp } from "@react-navigation/native";
import { useBudgetContext } from "@/context/BudgetContext";
import { useAuth } from '@/context/AuthContext';

interface WeeklyBudgetScreenProps {
  currentWeek: number;
  dayOfWeek: number;
  onTargetSelect: (target: number) => void;
  selectedTarget?: number;
  route?: any;
  navigation?: NavigationProp<any>;
}

interface BudgetTarget {
  multiplier: number;
  label: string;
  description: string;
  catchphrase: string;
  icon: string;
  color: "success" | "primary" | "warning" | "orange" | "destructive";
  value: number;
  remaining: number;
  dailyRemaining: number;
  overBudget: boolean;
  onTrack: boolean;
  gettingTight: boolean;
  selected: boolean;
  onClick: () => void;
  isBest: boolean;
}

const WeeklyBudgetScreen: React.FC<WeeklyBudgetScreenProps> = ({
  currentWeek,
  dayOfWeek,
  onTargetSelect,
  selectedTarget,
}) => {
  const { budgetData, loading, error, fetchAndCalculateBudget } = useBudgetContext();
  const [refreshing, setRefreshing] = useState(false);
    const { user, loading: authLoading } = useAuth();
  const isInitialMount = useRef(true);
  const hasAutoSelected = useRef(false);

  // Refresh budget data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAndCalculateBudget(user);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAndCalculateBudget]);

  // Initial data load
  useEffect(() => {
    if (isInitialMount.current) {
      handleRefresh();
      isInitialMount.current = false;
    }
  }, [handleRefresh]);

  // Handle loading state
  if (loading && !budgetData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Handle error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading budget data. Please try again.</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getCurrentWeekLabel = (): string => {
    const weekLabels = ["First Week", "Second Week", "Third Week", "Fourth Week"];
    return weekLabels[Math.min(Math.max(currentWeek - 1, 0), 3)] || `Week ${currentWeek}`;
  };

  const getDayOfWeekLabel = (): string => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[Math.min(Math.max(dayOfWeek, 0), 6)] || `Day ${dayOfWeek + 1}`;
  };

  const getWeeklyBudgetScenarios = (): BudgetTarget[] => {
    const { discretionLimit, discretionaryLeft } = budgetData;
    const baseWeekly = discretionLimit / 4 || 0;

    const tiers: Array<{
      multiplier: number;
      label: string;
      description: string;
      catchphrase: string;
      icon: string;
      color: "success" | "primary" | "warning" | "orange" | "destructive";
    }> = [
      {
        multiplier: 1.0,
        label: "Main Character Money",
        description: "You're thriving.",
        catchphrase: "I'll take the vibe AND the fries.",
        icon: "",
        color: "success",
      },
      {
        multiplier: 0.8,
        label: "Soft Flex Zone",
        description: "Bills are paid.",
        catchphrase: "Not rich, not broke.",
        icon: "",
        color: "primary",
      },
      {
        multiplier: 0.6,
        label: "Watch Yo' Wallet",
        description: "You're okay… if nothing weird happens.",
        catchphrase: "Maybe skip the oat milk.",
        icon: "",
        color: "warning",
      },
      {
        multiplier: 0.4,
        label: "Venmo Me $5",
        description: "Living off leftovers.",
        catchphrase: "Is tap water free?",
        icon: "",
        color: "orange",
      },
      {
        multiplier: 0.2,
        label: "Card Declined Era",
        description: "Budgeting air.",
        catchphrase: "Do you take vibes?",
        icon: "",
        color: "destructive",
      },
    ];

    let bestAffordableIndex = -1;
    const options = tiers.map((tier, index) => {
      const weeklyTarget = baseWeekly * tier.multiplier;
      const toSpendThisWeek = discretionaryLeft - weeklyTarget * 3;
      const remaining = Math.max(0, toSpendThisWeek);
      const dailyRemaining = Math.max(0, remaining / 7);
      const isAffordable = toSpendThisWeek >= 0;

      if (bestAffordableIndex === -1 && isAffordable) {
        bestAffordableIndex = index;
      }

      return {
        ...tier,
        value: weeklyTarget,
        remaining,
        dailyRemaining,
        overBudget: remaining === 0,
        onTrack: isAffordable,
        gettingTight: remaining < weeklyTarget * 0.5,
        selected: selectedTarget === weeklyTarget,
        onClick: () => onTargetSelect(weeklyTarget),
        isBest: false,
      } as BudgetTarget;
    });

    if (discretionaryLeft <= 0) {
      options[options.length - 1].isBest = true;
    } else if (bestAffordableIndex >= 0) {
      options[bestAffordableIndex].isBest = true;
    } else {
      options[0].isBest = true;
    }

    return options;
  };

  const targets = getWeeklyBudgetScenarios();
  const recommendedTarget = targets.find((t) => t.isBest);

  useEffect(() => {
    if (recommendedTarget && selectedTarget == null && !hasAutoSelected.current) {
      onTargetSelect(recommendedTarget.value);
      hasAutoSelected.current = true;
    }
  }, [recommendedTarget, selectedTarget, onTargetSelect]);

  const renderMonthlyProgressCard = () => (
    <Card style={styles.card} mode="contained">
      <Card.Content>
        <View>
          <Card.Title title="Monthly Progress" left={(props) => <Calendar {...props} size={20} />} />
          <Paragraph>
            {`Spent: $${budgetData.discretionarySpent.toFixed(2)} / $${budgetData.discretionLimit.toFixed(2)}`}
          </Paragraph>
          <ProgressBar
            progress={
              budgetData.discretionLimit
                ? Math.min(1, budgetData.discretionarySpent / budgetData.discretionLimit)
                : 0
            }
            color={
              budgetData.discretionarySpent > budgetData.discretionLimit ? "destructive": "success"
            }
            style={{ marginVertical: 8 }}
          />
          {budgetData.totalSpent > budgetData.monthlyIncome ? (
            <Text style={styles.alertText}>
              You've spent $
              {(budgetData.totalSpent - budgetData.monthlyIncome).toFixed(2)} more
              than you made.
            </Text>
          ) : budgetData.totalSpent / budgetData.monthlyIncome >= 0.8 ? (
            <Text style={styles.warningText}>
              You're close to dipping into savings. Cut back a bit.
            </Text>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );

  const renderTargetCard = (target: BudgetTarget, index: number) => {
    const isSelected = !!target.selected;
    const iconColor = 
      target.color === "success" ? "success" :
      target.color === "primary" ? "primary" :
      target.color === "warning" ? "warning" :
      target.color === "destructive" ? "destructive": "primary";

    return (
      <TouchableOpacity key={index} onPress={target.onClick}>
        <Card mode="contained" style={[styles.card, isSelected && styles.selectedCard]}>
          <Card.Content>
            <View>
              <View style={styles.targetHeader}>
                <Text style={styles.targetIcon}>{target.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Title style={styles.targetTitle}>{target.label}</Title>
                  {target.isBest && <Chip style={styles.chip}>Recommended</Chip>}
                  <Text>${target.value.toFixed(2)} per week • {target.description}</Text>
                  <Text style={styles.catchphrase}>{target.catchphrase}</Text>
                </View>
              </View>

              <View style={styles.metrics}>
                <View>
                  <Text>Remaining This Week</Text>
                  <Text style={{ 
                    color: target.remaining >= 0 ? "success" : "destructive", 
                    fontWeight: "bold" 
                  }}>
                    ${Math.abs(target.remaining).toFixed(2)}
                  </Text>
                </View>

                <View>
                  <Text>Daily Budget</Text>
                  <Text style={{ 
                    color: target.dailyRemaining > 0 ? "primary" : "destructive", 
                    fontWeight: "bold" 
                  }}>
                    ${target.dailyRemaining.toFixed(2)}
                  </Text>
                </View>
              </View>

              {isSelected && (
                <View style={[styles.statusBox, { borderColor: iconColor }]}>
                  {target.overBudget ? (
                    <AlertCircle size={18} color={iconColor}/>
                  ) : target.onTrack ? (
                    <CheckCircle2 size={18} color={iconColor} />
                  ) : (
                    <Info size={18} color={iconColor} />
                  )}
                  <Text style={{ marginLeft: 8 }}>
                    {target.overBudget
                      ? "Budget exceeded — adjust spending."
                      : target.onTrack
                      ? "On track with your weekly budget."
                      : "Getting close to your limit."}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Title>Weekly Budget Targets</Title>
        <Text>
          {getCurrentWeekLabel()} • {getDayOfWeekLabel()}
        </Text>
      </View>

      <Card style={styles.card} mode="contained">
        <Card.Title title="How it works" />
        <Card.Content>
          <Text style={{ fontSize: 13 }}>
            Weekly targets are based on what's left after savings and bills. 
            Adjust dynamically based on your spending. Weeks run Sunday–Saturday.
          </Text>
        </Card.Content>
      </Card>

      {renderMonthlyProgressCard()}
      {targets.map(renderTargetCard)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    padding: 16 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: { alignItems: "center", marginBottom: 16 },
  card: { marginBottom: 16 },
  selectedCard: { borderWidth: 2, borderColor: "blue" },
  targetHeader: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    marginBottom: 8 
  },
  targetIcon: { fontSize: 28, marginRight: 12 },
  targetTitle: { fontSize: 16 },
  chip: { 
    marginTop: 4, 
    alignSelf: "flex-start" 
  },
  catchphrase: { 
    fontStyle: "italic", 
    fontSize: 12, 
    marginTop: 4 
  },
  metrics: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 8 
  },
  statusBox: { 
    flexDirection: "row", 
    alignItems: "center", 
    borderWidth: 1, 
    padding: 8, 
    marginTop: 8, 
    borderRadius: 6 
  },
  alertText: { color: "destructive"},
  warningText: { color: "orange" },
});

export default WeeklyBudgetScreen;