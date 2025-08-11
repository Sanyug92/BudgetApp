import React, { useState, useEffect, useRef } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Card, Title, Paragraph, Chip, ProgressBar, Text } from "react-native-paper";
import { AlertCircle, CheckCircle2, Info, DollarSign, Calendar } from "lucide-react-native";
import { BudgetData } from "@/context/BudgetContext";

interface WeeklyBudgetScreenProps {
  data: BudgetData;
  currentWeek: number;
  dayOfWeek: number;
  onTargetSelect: (target: number) => void;
  selectedTarget?: number;
}

export function WeeklyBudgetScreen({
  data,
  currentWeek,
  dayOfWeek,
  onTargetSelect,
  selectedTarget
}: WeeklyBudgetScreenProps) {
  const isInitialMount = useRef(true);
  const hasAutoSelected = useRef(false);

  const [budgetData, setBudgetData] = useState<BudgetData>({
    monthlyIncome: data.monthlyIncome || 0,
    mandatoryBills: data.mandatoryBills || [],
    optionalBills: data.optionalBills || [],
    savingsGoal: data.savingsGoal || 0,
    creditCards: data.creditCards || [],
    discretionarySpent: data.discretionarySpent || 0,
    discretionaryLeft: data.discretionaryLeft || 0,
    discretionaryLeftPercentage: data.discretionaryLeftPercentage || 0,
    discretionLimit: data.discretionLimit || 0,
    totalSpent: data.totalSpent || 0,
    lastUpdated: data.lastUpdated || Date.now()
  });

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setBudgetData({ ...budgetData, ...data });
  }, [data]);

  const getCurrentWeekLabel = () => {
    const weekLabels = ["First Week", "Second Week", "Third Week", "Fourth Week"];
    return weekLabels[Math.min(currentWeek - 1, 3)] || `Week ${currentWeek}`;
  };

  const getDayOfWeekLabel = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayOfWeek] || `Day ${dayOfWeek + 1}`;
  };

  const targets = getWeeklyBudgetScenarios({
    discretionaryAmount: budgetData?.discretionLimit || 0,
    amountLeftThisMonth: budgetData?.discretionaryLeft || 0,
    discretionarySpent: budgetData?.discretionarySpent || 0,
    selectedTarget,
    onTargetSelect,
  });

  const recommendedTarget = targets.find(t => t.isBest);

  useEffect(() => {
    if (recommendedTarget && !selectedTarget && !hasAutoSelected.current) {
      onTargetSelect(recommendedTarget.value);
      hasAutoSelected.current = true;
    }
  }, [recommendedTarget, selectedTarget]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Title>Weekly Budget Targets</Title>
        <Paragraph>{getCurrentWeekLabel()} • {getDayOfWeekLabel()}</Paragraph>
      </View>

      {/* Monthly Progress Card */}
      <Card style={styles.card}>
        <Card.Title title="Monthly Progress" left={() => <Calendar size={20} />} />
        <Card.Content>
          <Paragraph>
            Spent: ${budgetData.discretionarySpent.toFixed(2)} / ${budgetData.discretionLimit.toFixed(2)}
          </Paragraph>
          <ProgressBar
            progress={
              budgetData.discretionLimit
                ? Math.min(1, budgetData.discretionarySpent / budgetData.discretionLimit)
                : 0
            }
            color={budgetData.discretionarySpent > budgetData.discretionLimit ? "red" : "green"}
            style={{ marginVertical: 8 }}
          />
          {budgetData.totalSpent > budgetData.monthlyIncome ? (
            <Paragraph style={styles.alertText}>
              🚨 You've spent ${(budgetData.totalSpent - budgetData.monthlyIncome).toFixed(2)} more than you made.
            </Paragraph>
          ) : (budgetData.totalSpent / budgetData.monthlyIncome) >= 0.8 ? (
            <Paragraph style={styles.warningText}>
              ⚠️ You're close to dipping into savings. Cut back a bit.
            </Paragraph>
          ) : null}
        </Card.Content>
      </Card>

      {/* Info Card */}
      <Card style={styles.card}>
        <Card.Title title="How it works" />
        <Card.Content>
          <Paragraph style={{ fontSize: 13 }}>
            Weekly targets are based on what’s left after savings and bills.
            Adjust dynamically based on your spending. Weeks run Sunday–Saturday.
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Targets */}
      {targets.map((target, index) => {
        const isSelected = target.selected;
        const iconColor =
          target.color === "success"
            ? "green"
            : target.color === "primary"
            ? "blue"
            : target.color === "warning"
            ? "orange"
            : target.color === "destructive"
            ? "red"
            : "gray";

        return (
          <TouchableOpacity key={index} onPress={target.onClick}>
            <Card style={[styles.card, isSelected && styles.selectedCard]}>
              <Card.Content>
                <View style={styles.targetHeader}>
                  <Text style={styles.targetIcon}>{target.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Title style={styles.targetTitle}>{target.label}</Title>
                    {target.isBest && <Chip style={styles.chip}>Recommended</Chip>}
                    <Paragraph>${target.value.toFixed(2)} per week • {target.description}</Paragraph>
                    <Paragraph style={styles.catchphrase}>"{target.catchphrase}"</Paragraph>
                  </View>
                </View>
                <View style={styles.metrics}>
                  <View>
                    <Paragraph>Remaining This Week</Paragraph>
                    <Text style={{ color: target.remaining >= 0 ? "green" : "red", fontWeight: "bold" }}>
                      ${Math.abs(target.remaining).toFixed(2)}
                    </Text>
                  </View>
                  <View>
                    <Paragraph>Daily Budget</Paragraph>
                    <Text style={{ color: target.dailyRemaining > 0 ? "blue" : "red", fontWeight: "bold" }}>
                      ${target.dailyRemaining.toFixed(2)}
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <View style={[styles.statusBox, { borderColor: iconColor }]}>
                    {target.overBudget ? (
                      <AlertCircle size={18} color="red" />
                    ) : target.onTrack ? (
                      <CheckCircle2 size={18} color="green" />
                    ) : (
                      <Info size={18} color="orange" />
                    )}
                    <Paragraph style={{ marginLeft: 8 }}>
                      {target.overBudget
                        ? "Budget exceeded — adjust spending."
                        : target.onTrack
                        ? "On track with your weekly budget."
                        : "Getting close to your limit."}
                    </Paragraph>
                  </View>
                )}
              </Card.Content>
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// --- Helper Function ---
function getWeeklyBudgetScenarios({ discretionaryAmount, amountLeftThisMonth, discretionarySpent, selectedTarget, onTargetSelect }: any) {
  const baseWeekly = discretionaryAmount / 4;
  const tiers = [
    { multiplier: 1.0, label: "Main Character Money", description: "You're thriving.", catchphrase: "I'll take the vibe AND the fries.", icon: "🤑", color: "success" },
    { multiplier: 0.8, label: "Soft Flex Zone", description: "Bills are paid.", catchphrase: "Not rich, not broke.", icon: "👌", color: "primary" },
    { multiplier: 0.6, label: "Watch Yo' Wallet", description: "You're okay… if nothing weird happens.", catchphrase: "Maybe skip the oat milk.", icon: "🧐", color: "warning" },
    { multiplier: 0.4, label: "Venmo Me $5", description: "Living off leftovers.", catchphrase: "Is tap water free?", icon: "😬", color: "orange" },
    { multiplier: 0.2, label: "Card Declined Era", description: "Budgeting air.", catchphrase: "Do you take vibes?", icon: "🫠", color: "destructive" }
  ];

  let bestAffordableIndex = -1;
  const options = tiers.map((tier, index) => {
    const weeklyTarget = baseWeekly * tier.multiplier;
    const toSpendThisWeek = amountLeftThisMonth - (weeklyTarget * 3);
    const remaining = Math.max(0, toSpendThisWeek);
    const dailyRemaining = Math.max(0, remaining / 7);
    const isAffordable = toSpendThisWeek >= 0;
    if (bestAffordableIndex === -1 && isAffordable) bestAffordableIndex = index;

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
      isBest: false
    };
  });

  if (amountLeftThisMonth <= 0) {
    options[options.length - 1].isBest = true;
  } else if (bestAffordableIndex >= 0) {
    options[bestAffordableIndex].isBest = true;
  } else {
    options[0].isBest = true;
  }

  return options;
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { alignItems: "center", marginBottom: 16 },
  card: { marginBottom: 12 },
  selectedCard: { borderWidth: 2, borderColor: "blue" },
  targetHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  targetIcon: { fontSize: 28, marginRight: 12 },
  targetTitle: { fontSize: 16 },
  chip: { marginTop: 4, alignSelf: "flex-start" },
  catchphrase: { fontStyle: "italic", fontSize: 12, marginTop: 4 },
  metrics: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  statusBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, padding: 8, marginTop: 8, borderRadius: 6 },
  alertText: { color: "red" },
  warningText: { color: "orange" }
});
