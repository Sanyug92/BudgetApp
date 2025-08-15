import React, { useEffect, useRef, useState, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { Card, ProgressBar, useTheme } from "react-native-paper";
import { Calendar, AlertCircle, CheckCircle2, Info, X, ChevronRight } from "lucide-react-native";
import { NavigationProp } from "@react-navigation/native";
import { useBudgetContext } from "@/context/BudgetContext";
import { useAuth } from '@/context/AuthContext';
import { Animated } from "react-native";
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
  color: string;
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

export const WeeklyBudgetScreen: React.FC<WeeklyBudgetScreenProps> = ({
  
  onTargetSelect,
  selectedTarget,
}) => {
  const theme = useTheme();
  const { budgetData, loading, error, fetchAndCalculateBudget } = useBudgetContext();
  const [refreshing, setRefreshing] = useState(false);
  const [showInfoCard, setShowInfoCard] = useState(true);
  const { user } = useAuth();
  const isInitialMount = useRef(true);
  const hasAutoSelected = useRef(false);

  // Drawer animation
  const minDrawerHeight = 80;
  
  // Color definitions
  const colors = {
    success: '#10b981',
    primary: '#3b82f6',
    warning: '#f59e0b',
    orange: '#f97316',
    destructive: '#ef4444',
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAndCalculateBudget(user);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAndCalculateBudget]);

  useEffect(() => {
    if (isInitialMount.current) {
      handleRefresh();
      isInitialMount.current = false;
    }
  }, [handleRefresh]);

  if (loading && !budgetData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={32} color={colors.destructive} style={styles.errorIcon} />
        <Text style={styles.errorText}>Error loading budget data</Text>
        <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
        <TouchableOpacity onPress={handleRefresh} style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getWeeklyBudgetScenarios = (): BudgetTarget[] => {
    const { discretionLimit, discretionaryLeft } = budgetData || { discretionLimit: 0, discretionaryLeft: 0 };
    const baseWeekly = discretionLimit / 4 || 0;

    const tiers = [
      {
        multiplier: 1.0,
        label: "Main Character Money",
        description: "You're thriving",
        catchphrase: "I'll take the vibe AND the fries",
        icon: "",
        color: colors.success,
      },
      {
        multiplier: 0.8,
        label: "Soft Flex Zone",
        description: "Bills are paid",
        catchphrase: "Not rich, not broke",
        icon: "",
        color: colors.primary,
      },
      {
        multiplier: 0.6,
        label: "Watch Yo' Wallet",
        description: "You're okay… if nothing weird happens",
        catchphrase: "Maybe skip the oat milk",
        icon: "",
        color: colors.warning,
      },
      {
        multiplier: 0.4,
        label: "Venmo Me $5",
        description: "Living off leftovers",
        catchphrase: "Is tap water free?",
        icon: "",
        color: colors.orange,
      },
      {
        multiplier: 0.2,
        label: "Card Declined Era",
        description: "Budgeting air",
        catchphrase: "Do you take vibes?",
        icon: "",
        color: colors.destructive,
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
    <Card style={[styles.card, styles.progressCard]}>
      <View style={styles.cardHeader}>
        <Calendar size={20} color={theme.colors.primary} />
        <Text style={styles.cardTitle}>Monthly Progress</Text>
      </View>
      <View style={styles.progressContent}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Spent:</Text>
          <Text style={styles.progressValue}>
            ${budgetData?.discretionarySpent?.toFixed(2) || '0.00'} / ${budgetData?.discretionLimit?.toFixed(2) || '0.00'}
          </Text>
        </View>
        <ProgressBar
          progress={
            budgetData?.discretionLimit
              ? Math.min(1, (budgetData.discretionarySpent || 0) / budgetData.discretionLimit)
              : 0
          }
          color={
            (budgetData?.discretionarySpent || 0) > (budgetData?.discretionLimit || 0)
              ? colors.destructive
              : colors.success
          }
          style={styles.progressBar}
        />
        {(budgetData?.totalSpent || 0) > (budgetData?.monthlyIncome || 0) ? (
          <View style={[styles.alertBox, { backgroundColor: '#fee2e2' }]}>
            <AlertCircle size={16} color={colors.destructive} />
            <Text style={[styles.alertText, { color: colors.destructive }]}>
              You've spent ${((budgetData.totalSpent || 0) - (budgetData.monthlyIncome || 0)).toFixed(2)} over budget
            </Text>
          </View>
        ) : (budgetData?.totalSpent || 0) / (budgetData?.monthlyIncome || 1) >= 0.8 ? (
          <View style={[styles.alertBox, { backgroundColor: '#fef3c7' }]}>
            <Info size={16} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.warning }]}>
              You're close to dipping into savings
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );

  const renderTargetCard = (target: BudgetTarget, index: number) => {
    const isSelected = !!target.selected;
    const IconComponent = target.overBudget ? AlertCircle : target.onTrack ? CheckCircle2 : Info;

    return (
      <TouchableOpacity key={index} onPress={target.onClick}>
        <Card style={[
          styles.card,
          styles.targetCard,
          isSelected && { borderColor: target.color, borderWidth: 2 },
          target.isBest && styles.bestTargetCard
        ]}>
          <View style={styles.targetCardHeader}>
            <View style={[styles.targetColorIndicator, { backgroundColor: target.color }]} />
            <View style={styles.targetHeaderContent}>
              <Text style={styles.targetTitle}>{target.label}</Text>
              {target.isBest && (
                <View style={[styles.recommendedBadge, { backgroundColor: target.color }]}>
                  <Text style={styles.recommendedBadgeText}>Recommended</Text>
                </View>
              )}
            </View>
            <ChevronRight size={20} color="#64748b" />
          </View>

          <View style={styles.targetCardContent}>
            <Text style={styles.targetDescription}>{target.description}</Text>
            <Text style={styles.targetCatchphrase}>"{target.catchphrase}"</Text>

            <View style={styles.targetAmountRow}>
              <Text style={styles.targetAmountLabel}>Weekly Budget:</Text>
              <Text style={[styles.targetAmount, { color: target.color }]}>
                ${target.value.toFixed(2)}
              </Text>
            </View>

            <View style={styles.targetMetrics}>
              <View style={styles.targetMetric}>
                <Text style={styles.targetMetricLabel}>Remaining This Week</Text>
                <Text style={[
                  styles.targetMetricValue,
                  { color: target.remaining >= 0 ? colors.success : colors.destructive }
                ]}>
                  ${Math.abs(target.remaining).toFixed(2)}
                </Text>
              </View>

              <View style={styles.targetMetric}>
                <Text style={styles.targetMetricLabel}>Daily Budget</Text>
                <Text style={[
                  styles.targetMetricValue,
                  { color: target.dailyRemaining > 0 ? colors.primary : colors.destructive }
                ]}>
                  ${target.dailyRemaining.toFixed(2)}
                </Text>
              </View>
            </View>

            {isSelected && (
              <View style={[
                styles.targetStatusBox,
                {
                  backgroundColor: target.overBudget ? '#fee2e2' :
                    target.onTrack ? '#ecfdf5' : '#fef3c7',
                  borderColor: target.overBudget ? colors.destructive :
                    target.onTrack ? colors.success : colors.warning
                }
              ]}>
                <IconComponent size={18} color={
                  target.overBudget ? colors.destructive :
                    target.onTrack ? colors.success : colors.warning
                } />
                <Text style={styles.targetStatusText}>
                  {target.overBudget
                    ? "Budget exceeded — adjust spending"
                    : target.onTrack
                      ? "On track with your weekly budget"
                      : "Getting close to your limit"}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: minDrawerHeight + 20 } // Add padding for the drawer
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weekly Budget</Text>
        </View>

        {showInfoCard && (
  <Card style={[styles.card, styles.infoCard]}>
    <View style={styles.cardHeader}>
      <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
        <Info size={20} color={theme.colors.primary} />
        <Text style={styles.cardTitle}>How it works</Text>
      </View>
      <TouchableOpacity 
        onPress={() => setShowInfoCard(false)}
        style={styles.closeButton}
      >
        <X size={20} color="#6b7280" />
      </TouchableOpacity>
    </View>
    <Text style={styles.infoText}>
      We crunch your numbers and turn them into five spending 'vibes' — from Main Character Money to Card Declined Era.
      Each week, you'll get a weekly budget, your daily budget, and get a heads-up before you start spending money you don't have.
    </Text>
  </Card>
)}

        {renderMonthlyProgressCard()}

        <Text style={styles.sectionTitle}>Choose Your Weekly Target</Text>
        {[...targets]
          .sort((a, b) => b.isBest ? 1 : -1) // Sort to put recommended card first
          .map(renderTargetCard)}
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  drawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  drawerHandleContainer: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
  },
  drawerContent: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  infoCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  progressCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 8,
  },
  progressContent: {
    marginTop: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
    backgroundColor: '#e5e7eb',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  alertText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
    marginTop: 8,
  },
  targetCard: {
    padding: 0,
    overflow: 'hidden',
  },
  bestTargetCard: {
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  targetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  targetColorIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  targetHeaderContent: {
    flex: 1,
  },
  targetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  recommendedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  targetCardContent: {
    padding: 16,
  },
  targetDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  targetCatchphrase: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  targetAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  targetAmountLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  targetAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  targetMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  targetMetric: {
    flex: 1,
  },
  targetMetricLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  targetMetricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  targetStatusText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});

export default WeeklyBudgetScreen;