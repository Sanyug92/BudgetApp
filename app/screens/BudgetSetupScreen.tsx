import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Keyboard, UIManager, findNodeHandle, Modal } from "react-native";
import { TextInput, Button, Card, Switch, Text, ActivityIndicator, Divider, Menu } from "react-native-paper";
import { DollarSign, PiggyBank, CreditCard, Plus, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react-native";
import { useBudgetContext } from "@/context/BudgetContext";
import type { Bill } from "@/types/bill.types";
import type { NavigationProp, RouteProp } from '@react-navigation/native';

type BudgetScreenParams = {};
type Props = {
  navigation?: NavigationProp<any>;
  route?: RouteProp<any>;
} & BudgetScreenParams;

const DEFAULT_BILL: Omit<Bill, "id"> = {
  name: "",
  amount: 0,
  due_date: 1,
  paid_by_credit_card: true,
  type: "mandatory",
  status: "unpaid",
  user_id: "current-user-id",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_paid: false,
};

const BudgetSetupScreen = (props: Props = {}) => {
  const context = useBudgetContext();
  
  // Add a check to ensure context is loaded
  if (!context) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { budgetData, bills: contextBills, updateBudgetData } = context;

  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBillIndex, setExpandedBillIndex] = useState<number | null>(null);
  const [isBillsSectionOpen, setIsBillsSectionOpen] = useState(true);
  const [showBillTypeMenu, setShowBillTypeMenu] = useState(false);

  useEffect(() => {
    if (budgetData) {
      setMonthlyIncome(budgetData.monthlyIncome || 0);
      setSavingsGoal(budgetData.savingsGoal || 0);
      setBills(contextBills || []);
      setIsLoading(false);
    }
  }, [budgetData, contextBills]);

  const scrollViewRef = useRef<ScrollView>(null);

  const billItemRefs = useRef<{[key: string]: View | null}>({});
  const handleAddBill = () => {
    setBills(prev => {
      const newBill = { ...DEFAULT_BILL, id: `temp-${Date.now()}` } as Bill;
      const updated = [...prev, newBill];
      const newIndex = updated.length - 1;
      setExpandedBillIndex(newIndex);
      return updated;
    });
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
  const totalMandatory = mandatoryBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalOptional = optionalBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalCommitted = totalMandatory + totalOptional + savingsGoal + (budgetData?.discretionarySpent || 0);
  const remainingForDiscretionary = monthlyIncome - totalCommitted;

  return (
    <View style={styles.container}>
      <View style={{flex: 1}}>
        <ScrollView 
          ref={scrollViewRef} 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollViewContent, {paddingBottom: 100}]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setIsBillsSectionOpen(prev => !prev)}
            >
              <CreditCard size={20} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Monthly Bills</Text>
              {isBillsSectionOpen ? (
                <ChevronUp size={20} color="#64748b" style={{ marginLeft: 'auto' }} />
              ) : (
                <ChevronDown size={20} color="#64748b" style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>

            {isBillsSectionOpen && (
              <>
                <FlatList
                  data={bills}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item: bill, index }) => (
                    <View
                      style={styles.billCard}
                      ref={(ref) => {
                        billItemRefs.current[bill.id] = ref;
                      }}
                      collapsable={false} // Important for Android measurement
                    >
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
                          <View style={styles.dropdownContainer}>
                            <Text style={styles.dropdownLabel}>Bill Type</Text>
                            <Menu
                              visible={expandedBillIndex === index && showBillTypeMenu}
                              onDismiss={() => setShowBillTypeMenu(false)}
                              anchor={
                                <TouchableOpacity
                                  style={styles.dropdownButton}
                                  onPress={() => {
                                    setExpandedBillIndex(index);
                                    setShowBillTypeMenu(true);
                                  }}
                                >
                                  <Text style={styles.dropdownButtonText}>
                                    {bill.type === 'mandatory' ? 'Mandatory' : 'Optional'}
                                  </Text>
                                  <ChevronsUpDown size={16} color="#64748b" />
                                </TouchableOpacity>
                              }
                            >
                              <Menu.Item
                                onPress={() => {
                                  handleBillChange(index, "type", "mandatory");
                                  setShowBillTypeMenu(false);
                                }}
                                title="Mandatory"
                                style={bill.type === 'mandatory' ? styles.menuItemActive : {}}
                                titleStyle={bill.type === 'mandatory' ? styles.menuItemTextActive : {}}
                              />
                              <Divider />
                              <Menu.Item
                                onPress={() => {
                                  handleBillChange(index, "type", "optional");
                                  setShowBillTypeMenu(false);
                                }}
                                title="Optional"
                                style={bill.type === 'optional' ? styles.menuItemActive : {}}
                                titleStyle={bill.type === 'optional' ? styles.menuItemTextActive : {}}
                              />
                            </Menu>
                          </View>
                          <View style={[styles.switchRow, { marginTop: 8 }]}>
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
              </>
            )}
          </View>

          {/* Savings Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <PiggyBank size={20} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Monthly Savings Goal</Text>
            </View>
            <Text style={styles.sectionDescription}>
              How much you want to save each month
            </Text>

            {monthlyIncome > 0 && (
              <View style={styles.recommendationContainer}>
                <Text style={styles.recommendationText}>
                  Save 20% of your monthly income: ${Math.round(monthlyIncome * 0.2).toLocaleString()}
                </Text>
              </View>
            )}

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

          {/* Summary Section */}
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
        </ScrollView>

        {/* Sticky Save Button - moved outside ScrollView */}
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={() => {
              Keyboard.dismiss();
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
              });
            }}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
          >
            Save Budget
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginLeft: 8 },
  sectionDescription: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  input: { backgroundColor: 'white', marginBottom: 16 },
  billCard: { backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  billHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  billName: { fontSize: 16, fontWeight: '500', color: '#0f172a', flex: 1, marginRight: 8 },
  billAmount: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginRight: 12 },
  billDetails: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  typeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  typeToggleText: {
    fontSize: 14,
    color: '#64748b',
    marginHorizontal: 4,
  },
  typeToggleActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  typeToggle: {
    marginHorizontal: 4,
  },
  switchLabel: {
    fontSize: 14,
    color: '#334155',
    marginRight: 8,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 12,
    backgroundColor: 'white',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#334155',
  },
  menuItemActive: {
    backgroundColor: '#f1f5f9',
  },
  menuItemTextActive: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recommendationText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
  },
  recommendationButton: {
    marginLeft: 12,
    borderColor: '#3b82f6',
  },
  recommendationButtonText: {
    color: '#3b82f6',
    fontSize: 12,
  },
  deleteButton: { borderColor: '#fee2e2', backgroundColor: '#fee2e2' },
  addButton: { marginTop: 8, borderColor: '#e0f2fe', backgroundColor: '#e0f2fe' },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginBottom: 100, // Add margin to account for the CreditCardDrawer
  },
  saveButton: { borderRadius: 8, paddingVertical: 8, backgroundColor: '#3b82f6' },
  saveButtonLabel: { fontSize: 16, fontWeight: '600' },
  summaryCard: { backgroundColor: '#f5f9ff', borderWidth: 1, borderColor: '#e0f2fe', borderRadius: 12, marginBottom: 16 },
  summaryTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  summarySubtitle: { color: '#64748b', fontSize: 14 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryGridItem: { flex: 1 },
  summaryLabel: { fontSize: 14, color: '#64748b' },
  summaryValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  summaryList: { marginVertical: 8 },
  summaryListItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryListValue: { fontWeight: '600' },
  discretionaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  discretionaryLabel: { fontSize: 16, fontWeight: '600', flex: 1 },
  discretionaryValue: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  divider: { marginVertical: 12, backgroundColor: '#e2e8f0' },
  primaryText: { color: '#3b82f6' },
  destructiveText: { color: '#ef4444' },
  warningText: { color: '#f59e0b' },
  successText: { color: '#10b981' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, color: '#64748b' },
});

export default BudgetSetupScreen;
