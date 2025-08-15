import React, { JSX, useEffect, useState } from "react";
import { View, FlatList, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import {
  TextInput,
  Switch,
  Text,
} from "react-native-paper";
import { Modal } from 'react-native';

import Icon from "react-native-vector-icons/Feather";
import { Bill } from "@/types/bill.types";
import { useBudgetContext } from "@/context/BudgetContext";
import { format } from "date-fns";

export function BillsScreen(): JSX.Element {
  // Context
  const { budgetData: data, updateBill, addBill, deleteBill } = useBudgetContext();

  // Helpers (pure functions — no hooks inside)
  const isBillPastDue = (dueDate: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    return currentDay > dueDate;
  };

  const createBill = (bill: any): Bill => ({
    ...bill,
    id: bill.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
    user_id: bill.user_id || "current-user-id",
    created_at: bill.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // original logic: map status/is_paid/fields as before
    is_paid: !!(bill.is_paid || bill.status === "paid"),
    due_date: bill.due_date || bill.dueDate || 1,
    // note: original code set status to "paid" when past due — preserved
    status: isBillPastDue(bill.due_date || bill.dueDate || 1) ? "paid" : (bill.status || "unpaid"),
    is_mandatory: bill.type === "mandatory",
    paid_by_credit_card: bill.paid_by_credit_card !== undefined ? bill.paid_by_credit_card : (bill.paidByCreditCard || false),
    amount: typeof bill.amount === "number" ? bill.amount : Number(bill.amount || 0),
    name: bill.name || "Untitled Bill"
  });

  const initializeBills = (): Bill[] => {
    const mandatory = (data?.mandatoryBills || []).map(b => createBill({ ...b, type: "mandatory" }));
    const optional = (data?.optionalBills || []).map(b => createBill({ ...b, type: "optional" }));
    return [...mandatory, ...optional];
  };

  const updateBillStatuses = (billsArr: Bill[]): Bill[] => {
    return billsArr.map(bill => {
      if (bill.status === "paid") return bill;
      return {
        ...bill,
        status: isBillPastDue(bill.due_date) ? "paid" : bill.status
      };
    });
  };

  // State (hooks are top-level; no hooks inside helper funcs)
  const [bills, setBills] = useState<Bill[]>(() => initializeBills());
  const [filterType, setFilterType] = useState<"all" | "mandatory" | "optional">("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "amount" | "name">("dueDate");
  const [newBill, setNewBill] = useState<Partial<Bill>>({
    name: "",
    amount: 0,
    due_date: 1,
    type: "mandatory",
    status: "unpaid",
    paid_by_credit_card: false
  });
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [billToPay, setBillToPay] = useState<Bill | null>(null);
  const [billToUnpay, setBillToUnpay] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [paidDate, setPaidDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [newDueDate, setNewDueDate] = useState<number>(1);

  // Reinitialize when budgetData changes (keeps original logic flow)
  useEffect(() => {
    setBills(initializeBills());
  }, [data]);

  // Run the status update once on mount (original code updated statuses on initial load)
  useEffect(() => {
    setBills(prev => updateBillStatuses(prev));
    // runs once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter + sort derived data
  const filteredBills = bills
    .filter(bill => filterType === "all" || bill.type === filterType)
    .sort((a, b) => {
      if (sortBy === "dueDate") return a.due_date - b.due_date;
      if (sortBy === "amount") return b.amount - a.amount;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  // Totals
  const mandatoryTotal = bills.filter(b => b.type === "mandatory").reduce((s, b) => s + (b.amount || 0), 0);
  const optionalTotal = bills.filter(b => b.type === "optional").reduce((s, b) => s + (b.amount || 0), 0);

  // Handlers
  const handleDeleteBill = (id: string) => {
    Alert.alert(
      "Delete bill",
      "Are you sure you want to delete this bill?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await deleteBill(id);
              if (error) {
                console.error("Error deleting bill:", error);
                return;
              }
              setBills(prev => prev.filter(b => b.id !== id));
            } catch (err) {
              console.error("Error in handleDeleteBill:", err);
            }
          }
        }
      ]
    );
  };

  const onAddBill = async () => {
    if (!newBill.name || !newBill.amount || !newBill.due_date) return;

    try {
      const billData = {
        name: newBill.name,
        amount: newBill.amount,
        due_date: newBill.due_date,
        is_mandatory: newBill.type === "mandatory",
        type: newBill.type || "mandatory",
        status: newBill.status || "unpaid",
        is_paid: newBill.status === "paid",
        paid_by_credit_card: newBill.paid_by_credit_card !== false
      };

      const result = await addBill(billData);

      if (result?.error) {
        console.error("Error adding bill:", result.error);
        return;
      }

      if (result?.data) {
        setBills(prev => [...prev, createBill(result.data)]);
        setNewBill({
          name: "",
          amount: 0,
          due_date: 1,
          type: "mandatory",
          status: "unpaid",
          paid_by_credit_card: true
        });
        setIsAddingBill(false);
      }
    } catch (error) {
      console.error("Error in addBill:", error);
    }
  };


  const handleBillStatusChange = async (id: string, newStatus: "unpaid" | "paid") => {
    const new_is_paid = newStatus === "paid";
    // Update the UI optimistically
    setBills(prev => prev.map(bill =>
      bill.id === id
        ? { ...bill, status: newStatus, is_paid: new_is_paid }
        : bill
    ));
    console.log("handleBillStatusChange", id, newStatus);
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    try {
      if (new_is_paid) {
        console.log("handleBillStatusChange paidxx", id, newStatus);
        setBillToPay(bill);
      } else if (!new_is_paid) {
        console.log("handleBillStatusChange unpaid", id, newStatus);
        setBillToUnpay(bill);
        setNewDueDate(bill.due_date || 1);
      }
console.log("handleBillStatusChange hit", new_is_paid);
      const updates = {
        isPaid: new_is_paid,
        status: newStatus,
        updated_at: new Date().toISOString()
      };
console.log("handleBillStatusChange updates", updates);
      const { error } = await updateBill(id, updates);

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

  const handleUpdateBill = async (id: string, updates: Partial<Bill>) => {
    try {
      const billToUpdate = bills.find(b => b.id === id);
      if (!billToUpdate) return;

      const updatePayload = {
        name: updates.name || billToUpdate.name,
        amount: updates.amount !== undefined ? updates.amount : billToUpdate.amount,
        due_date: updates.due_date !== undefined ? updates.due_date : billToUpdate.due_date,
        is_mandatory: updates.type ? updates.type === "mandatory" : billToUpdate.type === "mandatory",
        type: updates.type || billToUpdate.type,
        is_paid: updates.status ? updates.status === "paid" : billToUpdate.status === "paid",
        paid_by_credit_card:
          updates.paid_by_credit_card !== undefined ? updates.paid_by_credit_card : billToUpdate.paid_by_credit_card,
        updated_at: new Date().toISOString()
      };
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

  const formatDueDate = (day: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dueDate = new Date(currentYear, currentMonth, day);
    return dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };


  return (
    <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bills Management</Text>
          <Text style={styles.subtitle}>Track your monthly expenses</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setIsAddingBill(true)} 
          style={styles.addButton}
        >
          <Icon name="plus" size={20} color="white" />
        </TouchableOpacity>
      </View>
  
      {/* Summary Cards - Horizontal Scroll */}
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.summaryContainer}
        >
          <View style={[styles.summaryCard, styles.mandatoryCard]}>
            <Text style={styles.summaryCardTitle}>Mandatory</Text>
            <Text style={styles.summaryCardAmount}>${mandatoryTotal.toLocaleString()}</Text>
            <Text style={styles.summaryCardCount}>
              {bills.filter(b => b.type === "mandatory").length} bills
            </Text>
          </View>
    
          <View style={[styles.summaryCard, styles.optionalCard]}>
            <Text style={styles.summaryCardTitle}>Optional</Text>
            <Text style={styles.summaryCardAmount}>${optionalTotal.toLocaleString()}</Text>
            <Text style={styles.summaryCardCount}>
              {bills.filter(b => b.type === "optional").length} bills
            </Text>
          </View>
        </ScrollView>
        
        <View style={[styles.summaryCard, styles.totalCard, {width: '100%', marginTop: 16}]}>
          <Text style={styles.summaryCardTitle}>Total</Text>
          <Text style={styles.summaryCardAmount}>${(mandatoryTotal + optionalTotal).toLocaleString()}</Text>
          <Text style={styles.summaryCardCount}>All bills</Text>
        </View>
      </View>
  
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterType === 'all' && styles.activeFilterTab
          ]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[
            styles.filterTabText,
            filterType === 'all' && styles.activeFilterTabText
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterType === 'mandatory' && styles.activeFilterTab
          ]}
          onPress={() => setFilterType('mandatory')}
        >
          <Text style={[
            styles.filterTabText,
            filterType === 'mandatory' && styles.activeFilterTabText
          ]}>
            Mandatory
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterType === 'optional' && styles.activeFilterTab
          ]}
          onPress={() => setFilterType('optional')}
        >
          <Text style={[
            styles.filterTabText,
            filterType === 'optional' && styles.activeFilterTabText
          ]}>
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
            onPress={() => setEditingBill(bill)}
          >
            <View style={styles.billLeft}>
              <View style={[
                styles.billTypeIndicator,
                bill.type === 'mandatory' 
                  ? styles.mandatoryIndicator 
                  : styles.optionalIndicator
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
                    <Icon name="credit-card" size={14} color="#3b82f6" />
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
                  onValueChange={(checked) =>{
                    console.log("handleBillStatusChange toggle", bill.id, checked ? "paid" : "unpaid")
                    handleBillStatusChange(bill.id, checked ? "paid" : "unpaid")
                 
                  }
                    }
                  trackColor={{
                    false: '#e5e7eb',
                    true: bill.type === 'mandatory' ? '#10b981' : '#3b82f6'
                  }}
                />
                <Text style={styles.billStatusText}>
                  {bill.is_paid ? 'Paid' : 'Unpaid'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
  
      {/* Add Bill FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setIsAddingBill(true)}
      >
        <Icon name="plus" size={24} color="white" />
      </TouchableOpacity>
    </ScrollView>
  
    {/* Add Bill Modal */}
    <Modal
      visible={isAddingBill}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Bill</Text>
            <TouchableOpacity onPress={() => setIsAddingBill(false)}>
              <Icon name="x" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
  
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bill Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Electricity Bill"
                value={newBill.name || ""}
                onChangeText={text => setNewBill(prev => ({ ...prev, name: text }))}
              />
            </View>
  
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={newBill.amount ? String(newBill.amount) : ""}
                onChangeText={text => setNewBill(prev => ({ ...prev, amount: parseFloat(text) || 0 }))}
              />
            </View>
  
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Due Date (Day of Month)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="15"
                keyboardType="numeric"
                value={newBill.due_date ? String(newBill.due_date) : "1"}
                onChangeText={text => setNewBill(prev => ({ ...prev, due_date: parseInt(text) || 1 }))}
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
                    <Icon name="check" size={16} color="white" />
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
              onPress={onAddBill}
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
          <Icon name="x" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bill Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Electricity Bill"
            value={editingBill?.name || ""}
            onChangeText={text => setEditingBill(prev => prev ? {...prev, name: text} : null)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.textInput}
            placeholder="0.00"
            keyboardType="numeric"
            value={editingBill?.amount ? String(editingBill.amount) : ""}
            onChangeText={text => setEditingBill(prev => prev ? {...prev, amount: parseFloat(text) || 0} : null)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Due Date (Day of Month)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="15"
            keyboardType="numeric"
            value={editingBill?.due_date ? String(editingBill.due_date) : "1"}
            onChangeText={text => setEditingBill(prev => prev ? {...prev, due_date: parseInt(text) || 1} : null)}
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
              onPress={() => setEditingBill(prev => prev ? {...prev, type: 'mandatory'} : null)}
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
              onPress={() => setEditingBill(prev => prev ? {...prev, type: 'optional'} : null)}
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
            onPress={() => setEditingBill(prev => prev ? {...prev, paid_by_credit_card: !prev.paid_by_credit_card} : null)}
          >
            <View style={[
              styles.checkboxBox,
              editingBill?.paid_by_credit_card && styles.checkboxBoxChecked
            ]}>
              {editingBill?.paid_by_credit_card && (
                <Icon name="check" size={16} color="white" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Paid by Credit Card</Text>
          </TouchableOpacity>
        </View>
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
                status: editingBill.status,
                paid_by_credit_card: editingBill.paid_by_credit_card
              });
            }
          }}
        >
          <Text style={styles.submitButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
  
    {/* Edit Bill Modal would be similar to Add Bill Modal */}
  </View>
  );
}

const styles = StyleSheet.create({
  // Base styles
  root: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  container: {
    padding: 16,
    paddingBottom: 100
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 24
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2
  },
  
  // Summary Cards
  summaryContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 24
  },
  summaryCard: {
    width: 160,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  mandatoryCard: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981'
  },
  optionalCard: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6'
  },
  totalCard: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 4,
    borderLeftColor: '#0f172a'
  },
  summaryCardTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4
  },
  summaryCardAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4
  },
  summaryCardCount: {
    fontSize: 13,
    color: '#64748b'
  },
  
  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 16
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeFilterTab: {
    borderBottomColor: '#3b82f6'
  },
  filterTabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500'
  },
  activeFilterTabText: {
    color: '#3b82f6'
  },
  
  // Bills List
  billsList: {
    paddingBottom: 32
  },
  billItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  billTypeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12
  },
  mandatoryIndicator: {
    backgroundColor: '#10b981'
  },
  optionalIndicator: {
    backgroundColor: '#3b82f6'
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4
  },
  billMeta: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  billDueDate: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 8
  },
  billRight: {
    alignItems: 'flex-end'
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8
  },
  billStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  billStatusText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#3b82f6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a'
  },
  modalContent: {
    padding: 16
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  
  // Form Elements
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500'
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  typeButtons: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  typeButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6'
  },
  typeButtonText: {
    color: '#64748b',
    fontWeight: '500'
  },
  typeButtonTextActive: {
    color: 'white'
  },
  checkboxContainer: {
    marginTop: 8
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxBoxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  checkboxLabel: {
    color: '#334155'
  },
  
  // Buttons
  cancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginRight: 8
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '500'
  },
  submitButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500'
  },
  deleteButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginRight: 8,
    flex: 1
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontWeight: '500'
  }
});
