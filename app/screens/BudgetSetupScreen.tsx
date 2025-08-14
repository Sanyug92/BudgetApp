import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Text as RNText, Alert, Switch, ActivityIndicator, FlatList, Modal, Keyboard } from 'react-native';
import { Text, TextInput, Button, Checkbox, Surface, Divider, Menu, Portal, Dialog, Card, useTheme } from 'react-native-paper';
import { DollarSign, PiggyBank, CreditCard, Plus, ChevronDown, ChevronUp, ChevronsUpDown, X } from "lucide-react-native";
import { useBudgetContext } from "@/context/BudgetContext";
import type { Bill } from "@/types/bill.types";
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';

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
  const { addBill, updateBill, deleteBill } = useBudgetContext();
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isBillsSectionOpen, setIsBillsSectionOpen] = useState(true);
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [filterType, setFilterType] = useState<"all" | "mandatory" | "optional">("all");
  const [newBill, setNewBill] = useState<Partial<Bill>>({
    name: "",
    amount: 0,
    due_date: 1,
    type: "mandatory",
    status: "unpaid",
    paid_by_credit_card: true
  });

  useEffect(() => {
    if (budgetData) {
      setMonthlyIncome(budgetData.monthlyIncome || 0);
      setSavingsGoal(budgetData.savingsGoal || 0);
      setBills(contextBills || []);
      setIsLoading(false);
    }
  }, [budgetData, contextBills]);

  const scrollViewRef = useRef<ScrollView>(null);

  const billItemRefs = useRef<{ [key: string]: View | null }>({});
  const handleAddNewBill = () => {
    setNewBill({
      name: "",
      amount: 0,
      due_date: 1,
      type: "mandatory",
      paid_by_credit_card: true,
      status: "unpaid",
      user_id: "current-user-id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_paid: false,
    });
    setIsAddingBill(true);
  };

  const handleBillChange = (id: string, updates: Partial<Bill>) => {
    setBills(prev =>
      prev.map(bill =>
        bill.id === id ? { ...bill, ...updates } : bill
      )
    );
  };

  const handleAddBill = async () => {
    if (!newBill.name || !newBill.amount || !newBill.due_date) return;

    try {
      // Check if the due date has passed
      const today = new Date();
      const currentDay = today.getDate();
      const isPastDue = newBill.due_date < currentDay;

      // Create the bill data
      const billData = {
        name: newBill.name,
        amount: newBill.amount,
        due_date: newBill.due_date,
        is_mandatory: newBill.type === "mandatory",
        type: newBill.type || "mandatory",
        status: isPastDue ? "paid" : (newBill.status || "unpaid"),
        is_paid: isPastDue ? true : (newBill.status === "paid"),
        paid_by_credit_card: newBill.paid_by_credit_card !== false
      };

      // Add the bill to the database
      const { data, error } = await addBill(billData);

      if (error) {
        console.error('Error adding bill:', error);
        Alert.alert('Error', 'Failed to add bill. Please try again.');
        return;
      }

      // Reset the form
      setNewBill({
        name: "",
        amount: 0,
        due_date: 1,
        type: "mandatory",
        status: "unpaid",
        paid_by_credit_card: true
      });
      setIsAddingBill(false);

    } catch (error) {
      console.error('Error in handleAddBill:', error);
      Alert.alert('Error', 'An unexpected error occurred while adding the bill.');
    }
  };

  const handleUpdateBill = async (id: string, updates: Partial<Bill>) => {
    try {
      const billToUpdate = bills.find(b => b.id === id);
      if (!billToUpdate) return;

      const updatePayload: any = {
        name: updates.name !== undefined ? updates.name : billToUpdate.name,
        amount: updates.amount !== undefined ? updates.amount : billToUpdate.amount,
        due_date: updates.due_date !== undefined ? updates.due_date : billToUpdate.due_date,
        is_mandatory: updates.type ? updates.type === "mandatory" : billToUpdate.type === "mandatory",
        type: updates.type || billToUpdate.type,
        paid_by_credit_card: updates.paid_by_credit_card !== undefined
          ? updates.paid_by_credit_card
          : billToUpdate.paid_by_credit_card,
        updated_at: new Date().toISOString()
      };

      // Handle is_paid and status updates
      if (updates.is_paid !== undefined) {
        updatePayload.is_paid = updates.is_paid;
        updatePayload.status = updates.is_paid ? 'paid' : 'unpaid';
      } else if (updates.status !== undefined) {
        updatePayload.status = updates.status;
        updatePayload.is_paid = updates.status === 'paid';
      } else {
        // If neither is_paid nor status is in updates, use the current values
        updatePayload.is_paid = billToUpdate.is_paid;
        updatePayload.status = billToUpdate.status;
      }
      console.log("handleUpdateBill", updatePayload, updates)
      const { error } = await updateBill(id, updatePayload);

      if (!error) {
        setBills(prev =>
          prev.map(b =>
            b.id === id
              ? {
                ...b,
                ...updates,
                due_date: updates.due_date !== undefined ? updates.due_date : b.due_date,
                type: updates.type || b.type,
                status: updates.status !== undefined ? updates.status : b.status,
                paid_by_credit_card:
                  updates.paid_by_credit_card !== undefined ? updates.paid_by_credit_card : b.paid_by_credit_card
              }
              : b
          )
        );
        setEditingBill(null);
      } else {
        console.error("Error updating bill:", error);
      }
    } catch (err) {
      console.error("Error in handleUpdateBill:", err);
    }
  };

  const handleDeleteBill = async (id: string) => {
    Alert.alert(
      "Delete Bill",
      "Are you sure you want to delete this bill?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await deleteBill(id);
              if (!error) {
                setBills(prev => prev.filter(bill => bill.id !== id));
                if (editingBill?.id === id) {
                  setEditingBill(null);
                }
              } else {
                console.error("Error deleting bill:", error);
                Alert.alert("Error", "Failed to delete the bill. Please try again.");
              }
            } catch (err) {
              console.error("Error in handleDeleteBill:", err);
              Alert.alert("Error", "An unexpected error occurred while deleting the bill.");
            }
          }
        }
      ]
    );
  };

  const handleBillStatusChange = async (id: string, newStatus: "unpaid" | "paid") => {
    const new_is_paid = newStatus === "paid";

    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    try {
      const updates = {
        is_paid: new_is_paid,  // Changed from isPaid to is_paid
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      console.log("handleBillStatusChange", id, newStatus, updates);

      const { error } = await updateBill(id, updates);
      console.log("handleBillStatusChange error", error);
      if (error) {
        // Revert the UI if the update fails
        console.error("Error updating bill status:", error);
        setBills(prev => prev.map(b =>
          b.id === id
            ? { ...b, status: bill.status, is_paid: bill.is_paid }
            : b
        ));
      }
    } catch (err) {
      console.error("Error in handleBillStatusChange:", err);
      // Revert the UI on error
      setBills(prev => prev.map(b =>
        b.id === id
          ? { ...b, status: bill.status, is_paid: bill.is_paid }
          : b
      ));
    }
  };

  const formatDueDate = (day: number) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const dueDay = Math.min(day, daysInMonth);
    const dueDate = new Date(currentYear, currentMonth, dueDay);

    return format(dueDate, 'MMM do');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const mandatoryBills = bills.filter(bill => bill.type === "mandatory");
  const optionalBills = bills.filter(bill => bill.type === 'optional');
  const filteredBills = bills
    .filter(bill => filterType === "all" || bill.type === filterType)
    .sort((a, b) => a.due_date - b.due_date);
  const totalMandatory = mandatoryBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalOptional = optionalBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalCommitted = totalMandatory + totalOptional + savingsGoal + (budgetData?.discretionarySpent || 0);
  const remainingForDiscretionary = monthlyIncome - totalCommitted;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your budget data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollViewContent, { paddingBottom: 100 }]}
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
            <View style={styles.sectionHeader}>
              <CreditCard size={20} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Monthly Bills</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
              <TouchableOpacity
                style={[styles.filterTab, filterType === 'all' && { borderBottomColor: '#3b82f6' }]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterTabText, filterType === 'all' && { color: '#3b82f6', fontWeight: '600' }]}>
                  All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, filterType === 'mandatory' && { borderBottomColor: '#3b82f6' }]}
                onPress={() => setFilterType('mandatory')}
              >
                <Text style={[styles.filterTabText, filterType === 'mandatory' && { color: '#3b82f6', fontWeight: '600' }]}>
                  Mandatory
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, filterType === 'optional' && { borderBottomColor: '#3b82f6' }]}
                onPress={() => setFilterType('optional')}
              >
                <Text style={[styles.filterTabText, filterType === 'optional' && { color: '#3b82f6', fontWeight: '600' }]}>
                  Optional
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bills List */}
            <FlatList
              data={filteredBills}
              scrollEnabled={false}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.billsList}
              renderItem={({ item: bill }) => (
                <TouchableOpacity
                  style={styles.billItem}
                  onPress={() => setEditingBill(JSON.parse(JSON.stringify(bill))) // makes a shallow copy
                  }
                >
                  <View style={styles.billLeft}>
                    <View style={[
                      styles.billTypeIndicator,
                      bill.type === 'mandatory' ? styles.mandatoryIndicator : styles.optionalIndicator
                    ]} />

                    <View>
                      <Text style={styles.billName} numberOfLines={1}>
                        {bill.name}
                      </Text>
                      <View style={styles.billMeta}>
                        <Text style={styles.billDueDate}>
                          Due on {formatDueDate(bill.due_date)}
                        </Text>
                        {bill.paid_by_credit_card && (
                          <CreditCard size={14} color="#3b82f6" />
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.billRight}>
                    <Text style={styles.billAmount}>
                      ${bill.amount?.toFixed(2)}
                    </Text>

                    <View style={styles.billStatusContainer}>
                      <Switch
                        value={bill.is_paid}
                        onValueChange={(checked) => {
                          console.log("handleBillStatusChange toggle", bill.id, checked ? "paid" : "unpaid")

                          handleBillStatusChange(bill.id, checked ? "paid" : "unpaid");
                        }}
                        trackColor={{
                          false: '#e5e7eb',
                          true: bill.type === 'mandatory' ? '#10b981' : '#3b82f6'
                        }}
                      />
                      <Text style={styles.billStatusText}>
                        {bill.status === 'paid' ? 'Paid' : 'Unpaid'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />

            {/* Add Bill Button */}
            <Button
              mode="contained-tonal"
              onPress={handleAddNewBill}
              style={styles.addButton}
              icon={() => <Plus size={20} color="#3b82f6" />}
            >
              Add Bill
            </Button>
          </View>

          // Replace the existing modals with these new ones
{/* Add Bill Modal */}
<Modal
  visible={isAddingBill}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setIsAddingBill(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add New Bill</Text>
        <TouchableOpacity onPress={() => setIsAddingBill(false)}>
          <X size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bill Name</Text>
          <TextInput
            mode="outlined"
            placeholder="Electricity Bill"
            value={newBill.name || ""}
            onChangeText={text => setNewBill(prev => ({ ...prev, name: text }))}
            style={styles.textInput}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            mode="outlined"
            placeholder="0.00"
            keyboardType="numeric"
            value={newBill.amount ? newBill.amount.toString() : ""}
            onChangeText={text => {
              const num = parseFloat(text) || 0;
              setNewBill(prev => ({ ...prev, amount: num }));
            }}
            style={styles.textInput}
            left={<TextInput.Affix text="$" />}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Due Date (Day of Month)</Text>
          <TextInput
            mode="outlined"
            placeholder="15"
            keyboardType="numeric"
            value={newBill.due_date ? newBill.due_date.toString() : "1"}
            onChangeText={text => {
              const num = Math.min(31, Math.max(1, parseInt(text) || 1));
              setNewBill(prev => ({ ...prev, due_date: num }));
            }}
            style={styles.textInput}
            maxLength={2}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Type</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                newBill.type === 'mandatory' && styles.typeButtonActive
              ]}
              onPress={() => setNewBill(prev => ({ ...prev, type: 'mandatory' }))}
            >
              <Text style={[
                styles.typeButtonText,
                newBill.type === 'mandatory' && styles.typeButtonTextActive
              ]}>
                Mandatory
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                newBill.type === 'optional' && styles.typeButtonActive
              ]}
              onPress={() => setNewBill(prev => ({ ...prev, type: 'optional' }))}
            >
              <Text style={[
                styles.typeButtonText,
                newBill.type === 'optional' && styles.typeButtonTextActive
              ]}>
                Optional
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setNewBill(prev => ({ ...prev, paid_by_credit_card: !prev.paid_by_credit_card }))}
          >
            <View style={[
              styles.checkboxBox,
              newBill.paid_by_credit_card && styles.checkboxBoxChecked
            ]}>
              {newBill.paid_by_credit_card && (
                <Checkbox.Android status="checked" color="#3b82f6" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Paid by Credit Card</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setIsAddingBill(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleAddBill}
        >
          <Text style={styles.submitButtonText}>Add Bill</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

{/* Edit Bill Modal */}
<Modal
  visible={!!editingBill}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setEditingBill(null)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Edit Bill</Text>
        <TouchableOpacity onPress={() => setEditingBill(null)}>
          <X size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bill Name</Text>
          <TextInput
            mode="outlined"
            placeholder="Electricity Bill"
            value={editingBill?.name || ""}
            onChangeText={text => editingBill && setEditingBill({...editingBill, name: text})}
            style={styles.textInput}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            mode="outlined"
            placeholder="0.00"
            keyboardType="numeric"
            value={editingBill?.amount ? editingBill.amount.toString() : ""}
            onChangeText={text => {
              const num = parseFloat(text) || 0;
              editingBill && setEditingBill({...editingBill, amount: num});
            }}
            style={styles.textInput}
            left={<TextInput.Affix text="$" />}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Due Date (Day of Month)</Text>
          <TextInput
            mode="outlined"
            placeholder="15"
            keyboardType="numeric"
            value={editingBill?.due_date ? editingBill.due_date.toString() : "1"}
            onChangeText={text => {
              const num = Math.min(31, Math.max(1, parseInt(text) || 1));
              editingBill && setEditingBill({...editingBill, due_date: num});
            }}
            style={styles.textInput}
            maxLength={2}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Type</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                editingBill?.type === 'mandatory' && styles.typeButtonActive
              ]}
              onPress={() => editingBill && setEditingBill({...editingBill, type: 'mandatory'})}
            >
              <Text style={[
                styles.typeButtonText,
                editingBill?.type === 'mandatory' && styles.typeButtonTextActive
              ]}>
                Mandatory
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                editingBill?.type === 'optional' && styles.typeButtonActive
              ]}
              onPress={() => editingBill && setEditingBill({...editingBill, type: 'optional'})}
            >
              <Text style={[
                styles.typeButtonText,
                editingBill?.type === 'optional' && styles.typeButtonTextActive
              ]}>
                Optional
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => editingBill && setEditingBill({
              ...editingBill,
              paid_by_credit_card: !editingBill.paid_by_credit_card
            })}
          >
            <View style={[
              styles.checkboxBox,
              editingBill?.paid_by_credit_card && styles.checkboxBoxChecked
            ]}>
              {editingBill?.paid_by_credit_card && (
                <Checkbox.Android status="checked" color="#3b82f6" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Paid by Credit Card</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => editingBill && setEditingBill({
              ...editingBill,
              is_paid: !editingBill.is_paid
            })}
          >
            <View style={[
              styles.checkboxBox,
              editingBill?.is_paid && styles.checkboxBoxChecked
            ]}>
              {editingBill?.is_paid && (
                <Checkbox.Android status="checked" color="#3b82f6" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Paid</Text>
          </TouchableOpacity>
        </View>

        {/* <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => editingBill && setEditingBill({
              ...editingBill,
              is_paid: !editingBill.is_paid,
              status: editingBill.is_paid ? 'unpaid' : 'paid'
            })}
          >
            <View style={[
              styles.checkboxBox,
              editingBill?.is_paid && styles.checkboxBoxChecked,
              { backgroundColor: editingBill?.type === 'mandatory' && editingBill?.is_paid ? '#10b981' : undefined }
            ]}>
              {editingBill?.is_paid && (
                <Checkbox.Android status="checked" color="white" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              Mark as {editingBill?.is_paid ? 'Paid' : 'Unpaid'}
            </Text>
          </TouchableOpacity>
        </View> */}
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            if (editingBill) {
              handleDeleteBill(editingBill.id);
              setEditingBill(null);
            }
          }}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => {
            if (editingBill) {
              handleUpdateBill(editingBill.id, {
                name: editingBill.name,
                amount: editingBill.amount,
                due_date: editingBill.due_date,
                type: editingBill.type,
                status: editingBill.is_paid ? 'paid' : 'unpaid',
                is_paid: editingBill.is_paid,
                paid_by_credit_card: editingBill.paid_by_credit_card
              });
              setEditingBill(null);
            }
          }}
        >
          <Text style={styles.submitButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

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
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%'
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginBottom: 100,
  },

  // Sections
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
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16
  },

  // Inputs
  input: {
    backgroundColor: 'white',
    marginBottom: 16
  },

  // Bill List
  billName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    flex: 1,
    marginRight: 8
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 12
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabText: {
    color: '#666',
    fontWeight: '400',
  },
  billsList: {
    paddingHorizontal: 16,
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  billLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  billTypeIndicator: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  mandatoryIndicator: {
    backgroundColor: '#3b82f6',
  },
  optionalIndicator: {
    backgroundColor: '#10b981',
  },
  billMeta: {
    flex: 1,
  },
  billDueDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  billRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billStatusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  billStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Buttons
  saveButton: {
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: '#3b82f6'
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  deleteButton: {
    borderColor: '#fee2e2',
    backgroundColor: '#fee2e2',
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addButton: {
    marginTop: 8,
    borderColor: '#e0f2fe',
    backgroundColor: '#e0f2fe'
  },

  // Recommendations
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

  // Summary Card
  summaryCard: {
    backgroundColor: '#f5f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    borderRadius: 12,
    marginBottom: 16
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a'
  },
  summarySubtitle: {
    color: '#64748b',
    fontSize: 14
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  summaryGridItem: {
    flex: 1
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b'
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4
  },
  summaryList: {
    marginVertical: 8
  },
  summaryListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  summaryListValue: {
    fontWeight: '600'
  },

  // Text Styles
  primaryText: {
    color: '#3b82f6'
  },
  destructiveText: {
    color: '#ef4444'
  },
  warningText: {
    color: '#f59e0b'
  },
  successText: {
    color: '#10b981'
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b'
  },

  // Utility
  divider: {
    marginVertical: 12,
    backgroundColor: '#e2e8f0'
  },
  discretionaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  discretionaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  },
  discretionaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  typeButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  checkboxContainer: {
    marginTop: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
  },
  modalContent: {
    padding: 16
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
});

export default BudgetSetupScreen;
