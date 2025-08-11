import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { TextInput, Button, Card, Paragraph, Switch, Text, Divider, ActivityIndicator } from "react-native-paper";
import { DollarSign, PiggyBank, CreditCard, Trash2, PlusCircle } from "lucide-react-native";
import { useBudgetContext } from "@/context/BudgetContext";
import type { Bill } from "@/types/bill.types";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { DemoTabParamList } from "@/navigators/DemoNavigator";

type Props = BottomTabScreenProps<DemoTabParamList, "Budget">;

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

export default function BudgetSetupScreen({}: Props) {
  const { budgetData, bills: contextBills, updateBudgetData } = useBudgetContext();

  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text>Loading your budget data...</Text>
      </View>
    );
  }

  const mandatoryBills = bills.filter(bill => bill.type === "mandatory");
  const optionalBills = bills.filter(bill => bill.type === "optional");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Monthly Income */}
      <CardSection
        title="Monthly Income"
        icon={<DollarSign size={20} />}
        description="Your total monthly take-home income"
      >
        <TextInput
          mode="outlined"
          keyboardType="numeric"
          value={monthlyIncome.toString()}
          onChangeText={text => setMonthlyIncome(Number(text))}
        />
      </CardSection>

      {/* Bills */}
      <Card style={styles.card}>
        <Card.Title title="Monthly Bills" left={() => <CreditCard size={20} />} />
        <Card.Content>
          {bills.map((bill, index) => (
            <View key={bill.id} style={styles.billItem}>
              <TextInput
                mode="outlined"
                label="Bill Name"
                value={bill.name}
                onChangeText={text => handleBillChange(index, "name", text)}
              />
              <TextInput
                mode="outlined"
                label="Amount"
                keyboardType="numeric"
                value={bill.amount.toString()}
                onChangeText={text => handleBillChange(index, "amount", Number(text))}
              />
              <TextInput
                mode="outlined"
                label="Due Date"
                keyboardType="numeric"
                value={bill.due_date.toString()}
                onChangeText={text => handleBillChange(index, "due_date", Number(text))}
              />
              <View style={styles.switchRow}>
                <Text>Paid by Credit Card</Text>
                <Switch
                  value={bill.paid_by_credit_card}
                  onValueChange={val => handleBillChange(index, "paid_by_credit_card", val)}
                />
              </View>
              <Button
                icon={() => <Trash2 size={18} />}
                onPress={() => setBills(prev => prev.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
              <Divider style={{ marginVertical: 10 }} />
            </View>
          ))}
          <Button icon={() => <PlusCircle size={18} />} mode="outlined" onPress={handleAddBill}>
            Add Another Bill
          </Button>
        </Card.Content>
      </Card>

      {/* Savings Goal */}
      <CardSection title="Monthly Savings Goal" icon={<PiggyBank size={20} />}>
        <TextInput
          mode="outlined"
          keyboardType="numeric"
          value={savingsGoal.toString()}
          onChangeText={text => setSavingsGoal(Number(text))}
        />
      </CardSection>

      {/* Save Button */}
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
      >
        Save Budget
      </Button>
    </ScrollView>
  );
}

function CardSection({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <Card.Title title={title} left={() => icon} />
      <Card.Content>
        {description && <Paragraph>{description}</Paragraph>}
        {children}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: { marginBottom: 16 },
  billItem: { marginBottom: 16 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
