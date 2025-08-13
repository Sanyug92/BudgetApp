import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, } from "react-native";
import { TextInput, Button, Card, Switch, Text, ActivityIndicator, Divider } from "react-native-paper";
import { DollarSign, PiggyBank, CreditCard, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react-native";
import { useBudgetContext } from "@/context/BudgetContext";
import type { Bill } from "@/types/bill.types";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NavigatorParamList } from "@/navigators/Navigator";

type Props = BottomTabScreenProps<NavigatorParamList, "Budget">;

const DEFAULT_BILL: Omit<Bill, "id"> = {
  name: "",
  amount: 0,
  due_date: 1,
  type: "mandatory",
  paid_by_credit_card: false,
  status: "unpaid",
  user_id: "current-user-id",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_paid: false,
};

export default function BudgetSetupScreen({ }: Props) {
  const { budgetData, bills: contextBills, updateBudgetData } = useBudgetContext();

  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBillIndex, setExpandedBillIndex] = useState<number | null>(null);

  useEffect(() => {
    if (budgetData) {
      setMonthlyIncome(budgetData.monthlyIncome || 0);
      setSavingsGoal(budgetData.savingsGoal || 0);
      setBills(contextBills || []);
      setIsLoading(false);
    }
  }, [budgetData, contextBills]);

  const handleAddBill = () => {
    setBills(prev => [
      { ...DEFAULT_BILL, id: `temp-${Date.now()}` } as Bill,
      ...prev,
    ]);
    setExpandedBillIndex(0);
  };

  const handleBillChange = useCallback(
    (index: number, field: keyof Bill, value: any) => {
      setBills(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  const toggleBillExpansion = (index: number) => {
    setExpandedBillIndex(expandedBillIndex === index ? null : index);
  };

  const handleDeleteBill = (index: number) => {
    setBills(prev => prev.filter((_, i) => i !== index));
    if (expandedBillIndex === index) {
      setExpandedBillIndex(null);
    } else if (expandedBillIndex !== null && expandedBillIndex > index) {
      setExpandedBillIndex(expandedBillIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your budget data...</Text>
      </View>
    );
  }

  const mandatoryBills = bills.filter(bill => bill.type === "mandatory");
  const optionalBills = bills.filter(bill => bill.type === "optional");
  // Add these calculations near your other state variables
  const totalMandatory = mandatoryBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalOptional = optionalBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalCommitted = totalMandatory + totalOptional + savingsGoal + budgetData?.discretionarySpent ;
  const remainingForDiscretionary = monthlyIncome - totalCommitted ;
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Income Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Monthly Income</Text>
          </View>
          <Text style={styles.sectionDescription}>Your total monthly take-home income</Text>
          <TextInput
            mode="outlined"
            label="Amount"
            keyboardType="numeric"
            value={monthlyIncome.toString()}
            onChangeText={text => setMonthlyIncome(Number(text))}
            style={styles.input}
            left={<TextInput.Affix text="$" />}
          />
        </View>

        {/* Bills Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Monthly Bills</Text>
          </View>

          <FlatList
            data={bills}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item: bill, index }) => (
              <View style={styles.billCard}>
                <TouchableOpacity
                  style={styles.billHeader}
                  onPress={() => toggleBillExpansion(index)}
                >
                  <Text style={styles.billName}>
                    {bill.name || "New Bill"}
                  </Text>
                  <View style={styles.billHeaderRight}>
                    <Text style={styles.billAmount}>
                      ${bill.amount ? bill.amount.toFixed(2) : "0.00"}
                    </Text>
                    {expandedBillIndex === index ? (
                      <ChevronUp size={20} color="#64748b" />
                    ) : (
                      <ChevronDown size={20} color="#64748b" />
                    )}
                  </View>
                </TouchableOpacity>

                {expandedBillIndex === index && (
                  <View style={styles.billDetails}>
                    <TextInput
                      mode="outlined"
                      label="Bill Name"
                      value={bill.name}
                      onChangeText={text => handleBillChange(index, "name", text)}
                      style={styles.input}
                    />

                    <TextInput
                      mode="outlined"
                      label="Amount"
                      keyboardType="numeric"
                      value={bill.amount.toString()}
                      onChangeText={text => handleBillChange(index, "amount", Number(text))}
                      style={styles.input}
                      left={<TextInput.Affix text="$" />}
                    />

                    <TextInput
                      mode="outlined"
                      label="Due Date (Day of Month)"
                      keyboardType="numeric"
                      value={bill.due_date.toString()}
                      onChangeText={text => handleBillChange(index, "due_date", Number(text))}
                      style={styles.input}
                    />

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Paid by Credit Card</Text>
                      <Switch
                        value={bill.paid_by_credit_card}
                        onValueChange={val => handleBillChange(index, "paid_by_credit_card", val)}
                        color="#3b82f6"
                      />
                    </View>

                    <Button
                      mode="outlined"
                      onPress={() => handleDeleteBill(index)}
                      textColor="#ef4444"
                      style={styles.deleteButton}
                    >
                      Remove Bill
                    </Button>
                  </View>
                )}
              </View>
            )}
          />

          <Button
            mode="contained-tonal"
            onPress={handleAddBill}
            style={styles.addButton}
            icon={() => <Plus size={20} color="#3b82f6" />}
          >
            Add Bill
          </Button>
        </View>

        {/* Savings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PiggyBank size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Savings Goal</Text>
          </View>
          <Text style={styles.sectionDescription}>How much you want to save each month</Text>
          <TextInput
            mode="outlined"
            label="Amount"
            keyboardType="numeric"
            value={savingsGoal.toString()}
            onChangeText={text => setSavingsGoal(Number(text))}
            style={styles.input}
            left={<TextInput.Affix text="$" />}
          />
        </View>
      </ScrollView>

      {/* Summary Section */}
      {/* Summary card component */}
      <Card style={styles.summaryCard}>
        <Card.Title
          title="Budget Summary"
          subtitle="Your zero-based budget breakdown"
          titleStyle={styles.summaryTitle}
          subtitleStyle={styles.summarySubtitle}
        />
        <Card.Content>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryLabel}>Monthly Income</Text>
              <Text style={[styles.summaryValue, styles.primaryText]}>
                ${monthlyIncome.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryLabel}>Total Committed</Text>
              <Text style={styles.summaryValue}>
                ${totalCommitted.toFixed(2)}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.summaryList}>
            <View style={styles.summaryListItem}>
              <Text>Mandatory Bills:</Text>
              <Text style={[styles.summaryListValue, styles.destructiveText]}>
                ${totalMandatory.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryListItem}>
              <Text>Optional Bills:</Text>
              <Text style={[styles.summaryListValue, styles.warningText]}>
                ${totalOptional.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryListItem}>
              <Text>Savings Goal:</Text>
              <Text style={[styles.summaryListValue, styles.successText]}>
                ${savingsGoal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryListItem}>
              <Text>Discretionary Spent:</Text>
              <Text style={[styles.summaryListValue, styles.destructiveText]}>
                ${budgetData?.discretionarySpent?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.discretionaryRow}>
            <Text style={styles.discretionaryLabel}>
              Available for Discretionary Spending:
            </Text>
            <Text style={[
              styles.discretionaryValue,
              remainingForDiscretionary >= 0 ? styles.successText : styles.destructiveText
            ]}>
              ${remainingForDiscretionary.toFixed(2)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Fixed Save Button */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() =>
            updateBudgetData({
              monthlyIncome,
              savingsGoal,
              mandatoryBills,
              optionalBills,
              creditCards: [],
              discretionarySpent: 0,
              discretionaryLeft: 0,
              discretionaryLeftPercentage: 0,
              discretionLimit: 0,
              totalSpent: 0,
              lastUpdated: Date.now(),
            })
          }
          style={styles.saveButton}
          labelStyle={styles.saveButtonLabel}
        >
          Save Budget
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'white',
    marginBottom: 16,
  },
  billCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  billHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 12,
  },
  billDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    color: '#334155',
  },
  deleteButton: {
    borderColor: '#fee2e2',
    backgroundColor: '#fee2e2',
  },
  addButton: {
    marginTop: 8,
    borderColor: '#e0f2fe',
    backgroundColor: '#e0f2fe',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#f5f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  summarySubtitle: {
    color: '#64748b',
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryGridItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryList: {
    marginVertical: 8,
  },
  summaryListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryListValue: {
    fontWeight: '600',
  },
  discretionaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  discretionaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  discretionaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#e2e8f0',
  },
  // Color styles
  primaryText: {
    color: '#3b82f6',
  },
  destructiveText: {
    color: '#ef4444',
  },
  warningText: {
    color: '#f59e0b',
  },
  successText: {
    color: '#10b981',
  },
});