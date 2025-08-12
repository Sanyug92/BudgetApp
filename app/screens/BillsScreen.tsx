import React, { JSX, useEffect, useState } from "react";
import { View, FlatList, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  Card,
  Portal,
  Modal,
  TextInput,
  Switch,
  Button as PaperButton,
  Title,
  Text,
  Badge,
  Dialog,
  SegmentedButtons,
  IconButton
} from "react-native-paper";
import Icon from "react-native-vector-icons/Feather";
import { Bill } from "@/types/bill.types";
import { BudgetData, useBudgetContext } from "@/context/BudgetContext";
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
    type: bill.type || "mandatory",
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
          paid_by_credit_card: false
        });
        setIsAddingBill(false);
      }
    } catch (error) {
      console.error("Error in addBill:", error);
    }
  };

  const handlePaidDateSubmit = async () => {
    if (!billToPay) return;

    try {
      const paidDateObj = new Date(paidDate);
      const dayOfMonth = paidDateObj.getDate();

      const updates = {
        isPaid: true,
        dueDate: dayOfMonth,
        paid_by_credit_card: billToPay.paid_by_credit_card,
        status: "paid" as const,
        updated_at: new Date().toISOString()
      };

      const { error } = await updateBill(billToPay.id, updates);

      if (error) {
        console.error("Error updating bill:", error);
        return;
      }

      setBills(prev =>
        prev.map(b =>
          b.id === billToPay.id
            ? {
                ...b,
                is_paid: true,
                due_date: dayOfMonth,
                status: "paid",
                paid_by_credit_card: billToPay.paid_by_credit_card
              }
            : b
        )
      );

      setBillToPay(null);
      setPaidDate(format(new Date(), "yyyy-MM-dd"));
    } catch (err) {
      console.error("Error in handlePaidDateSubmit:", err);
    }
  };

  const handlePaidByCreditCardToggle = async (id: string, currentValue: boolean) => {
    const newValue = !currentValue;
    try {
      const updates = {
        paid_by_credit_card: newValue,
        updated_at: new Date().toISOString()
      };

      const { data: updatedBill, error } = await updateBill(id, updates);

      if (error) {
        console.error("Error updating paid by credit card status:", error);
        return;
      }

      setBills(prev =>
        prev.map(b => (b.id === id ? { ...b, paid_by_credit_card: newValue } : b))
      );
    } catch (err) {
      console.error("Error in handlePaidByCreditCardToggle:", err);
    }
  };

  const handleUnpaidDateSubmit = async () => {
    if (!billToUnpay) return;

    try {
      const updates = {
        isPaid: false,
        status: "unpaid" as const,
        due_date: newDueDate,
        paid_by_credit_card: billToUnpay.paid_by_credit_card,
        updated_at: new Date().toISOString()
      };

      const { error } = await updateBill(billToUnpay.id, updates);

      if (error) {
        console.error("Error updating bill status:", error);
        return;
      }

      setBills(prev =>
        prev.map(b =>
          b.id === billToUnpay.id
            ? {
                ...b,
                status: "unpaid",
                due_date: newDueDate,
                is_paid: false,
                paid_by_credit_card: billToUnpay.paid_by_credit_card
              }
            : b
        )
      );

      setBillToUnpay(null);
      setNewDueDate(1);
    } catch (err) {
      console.error("Error in handleUnpaidDateSubmit:", err);
    }
  };

  const handleBillStatusChange = async (id: string, newStatus: "unpaid" | "paid" ) => {
    // Update the UI optimistically
    setBills(prev => prev.map(bill => 
      bill.id === id 
        ? { ...bill, status: newStatus, is_paid: newStatus === 'paid' }
        : bill
    ));
 console.log("handleBillStatusChange", id, newStatus);
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    try {
      if (newStatus === "paid") {
        setBillToPay(bill);
        return;
      } else if (newStatus === "unpaid" && bill.status === "paid") {
        setBillToUnpay(bill);
        setNewDueDate(bill.due_date || 1);
        return;
      }

      const updates = {
        isPaid: newStatus.toString() === "paid",
        status: newStatus,
        updated_at: new Date().toISOString()
      };

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
        is_paid: updates.status ? updates.status === "paid" : billToUpdate.status === "paid",
        paid_by_credit_card:
          updates.paid_by_credit_card !== undefined ? updates.paid_by_credit_card : billToUpdate.paid_by_credit_card,
        updated_at: new Date().toISOString()
      };

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

  const getStatusColor = (status: Bill["status"]) => {
    switch (status) {
      case "paid":
        return { backgroundColor: "#10b981", color: "white" };
      case "unpaid":
        return { backgroundColor: "#ef4444", color: "white" };
      default:
        return { backgroundColor: "#f59e0b", color: "black" };
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="headlineLarge" style={styles.title}>
              Bills Management
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Track your mandatory and optional bills
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable onPress={() => setIsAddingBill(true)} style={styles.iconButton}>
              <Icon name="plus" size={20} color="#111827" />
            </Pressable>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Title style={styles.cardTitle}>Mandatory Bills</Title>
              <Text style={styles.cardAmount}>${mandatoryTotal.toLocaleString()}</Text>
              <Text>{bills.filter(b => b.type === "mandatory").length} bills</Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Title style={styles.cardTitle}>Optional Bills</Title>
              <Text style={styles.cardAmount}>${optionalTotal.toLocaleString()}</Text>
              <Text>{bills.filter(b => b.type === "optional").length} bills</Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Title style={styles.cardTitle}>Total Monthly</Title>
              <Text style={styles.cardAmount}>${(mandatoryTotal + optionalTotal).toLocaleString()}</Text>
              <Text>All bills combined</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Table Card */}
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Icon name="credit-card" size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Title>All Bills</Title>
              </View>

              <View style={styles.headerRight}>
                <Icon name="filter" size={20} color="#6b7280" />
                <SegmentedButtons
                  value={filterType}
                  onValueChange={val => setFilterType(val as "all" | "mandatory" | "optional")}
                  buttons={[
                    { value: "all", label: "All" },
                    { value: "mandatory", label: "Mandatory" },
                    { value: "optional", label: "Optional" }
                  ]}
                  style={styles.segmentedButtons}
                />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Pressable style={[styles.headerCell, { width: 150 }]} onPress={() => setSortBy("name")}>
                    <Text style={styles.headerText}>Bill Name {sortBy === "name" && "↕"}</Text>
                  </Pressable>

                  <Pressable style={[styles.headerCell, { width: 100 }]} onPress={() => setSortBy("amount")}>
                    <Text style={styles.headerText}>Amount {sortBy === "amount" && "↕"}</Text>
                  </Pressable>

                  <Pressable style={[styles.headerCell, { width: 120 }]} onPress={() => setSortBy("dueDate")}>
                    <Text style={styles.headerText}>Due Date {sortBy === "dueDate" && "↕"}</Text>
                  </Pressable>

                  <View style={[styles.headerCell, { width: 100 }]}>
                    <Text style={styles.headerText}>Type</Text>
                  </View>

                  <View style={[styles.headerCell, { width: 120 }]}>
                    <Text style={styles.headerText}>Status</Text>
                  </View>

                  <View style={[styles.headerCell, { width: 150 }]}>
                    <Text style={styles.headerText}>Paid by CC</Text>
                  </View>

                  <View style={[styles.headerCell, { width: 150 }]}>
                    <Text style={styles.headerText}>Actions</Text>
                  </View>
                </View>

                {/* Rows */}
                <FlatList
                  data={filteredBills}
                  keyExtractor={item => item.id}
                  renderItem={({ item: bill }) => (
                    <View style={styles.tableRow}>
                      <View style={[styles.tableCell, { width: 150 }]}>
                        <Text>{bill.name}</Text>
                      </View>

                      <View style={[styles.tableCell, { width: 100 }]}>
                        <Text>${(bill.amount || 0).toLocaleString()}</Text>
                      </View>

                      <View style={[styles.tableCell, { width: 120 }]}>
                        <View style={styles.dueDateCell}>
                          <Icon name="calendar" size={16} color="#6b7280" />
                          <Text style={styles.dueDateText}>{formatDueDate(bill.due_date)}</Text>
                        </View>
                      </View>

                      <View style={[styles.tableCell, { width: 100 }]}>
                        <Badge
                          style={[
                            styles.badge,
                            bill.type === "mandatory" ? styles.badgeDestructive : styles.badgeSecondary
                          ]}
                        >
                          {bill.type}
                        </Badge>
                      </View>

                      <View style={[styles.tableCell, { width: 120 }]}>
                        <View style={styles.switchContainer}>
                          <Switch
                            value={bill.status === "paid"}
                            onValueChange={(checked) => {
                              handleBillStatusChange(bill.id, checked ? "paid" : "unpaid");
                            }}
                          />
                          <Text style={styles.statusText}>{bill.status === "paid" ? "Paid" : "Unpaid"}</Text>
                        </View>
                      </View>

                      <View style={[styles.tableCell, { width: 150 }]}>
                        <View style={styles.switchContainer}>
                          <Switch
                            value={bill.paid_by_credit_card === true}
                            onValueChange={() => handlePaidByCreditCardToggle(bill.id, bill.paid_by_credit_card || false)}
                          />
                          <Text style={styles.paymentText}>{bill.paid_by_credit_card ? "Credit Card" : "Other"}</Text>
                        </View>
                      </View>

                      <View style={[styles.tableCell, styles.actionsCell, { width: 150 }]}>
                        <IconButton icon="pencil" size={20} onPress={() => setEditingBill(bill)} />
                        <PaperButton mode="text" onPress={() => handleDeleteBill(bill.id)}>
                          Delete
                        </PaperButton>
                      </View>
                    </View>
                  )}
                />
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Portals / Dialogs / Modals */}
        <Portal>
          {/* Add Bill Modal */}
          <Modal visible={isAddingBill} onDismiss={() => setIsAddingBill(false)} contentContainerStyle={styles.modalContainer}>
            <View>
              <Title>Add New Bill</Title>

              <TextInput
                mode="outlined"
                label="Bill Name"
                placeholder="Electric Bill"
                value={newBill.name || ""}
                onChangeText={text => setNewBill(prev => ({ ...prev, name: text }))}
                style={{ marginTop: 8 }}
              />

              <TextInput
                mode="outlined"
                label="Amount"
                keyboardType="numeric"
                placeholder="150"
                value={newBill.amount ? String(newBill.amount) : ""}
                onChangeText={text => setNewBill(prev => ({ ...prev, amount: parseFloat(text) || 0 }))}
                style={{ marginTop: 8 }}
              />

              <TextInput
                mode="outlined"
                label="Due Date (Day of Month)"
                keyboardType="numeric"
                placeholder="15"
                value={newBill.due_date ? String(newBill.due_date) : "1"}
                onChangeText={text => setNewBill(prev => ({ ...prev, due_date: parseInt(text) || 1 }))}
                style={{ marginTop: 8 }}
                maxLength={2}
              />

              <View style={{ marginTop: 8 }}>
                <Picker
                  selectedValue={newBill.type || "mandatory"}
                  onValueChange={(val: string) => setNewBill(prev => ({ ...prev, type: val as "mandatory" | "optional" }))}
                >
                  <Picker.Item label="Mandatory" value="mandatory" />
                  <Picker.Item label="Optional" value="optional" />
                </Picker>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <Switch
                  value={newBill.paid_by_credit_card === true}
                  onValueChange={val => setNewBill(prev => ({ ...prev, paid_by_credit_card: val }))}
                />
                <Text style={{ marginLeft: 8 }}>Paid by Credit Card</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16 }}>
                <PaperButton mode="outlined" onPress={() => setIsAddingBill(false)} style={{ marginRight: 8 }}>
                  Cancel
                </PaperButton>
                <PaperButton mode="contained" onPress={onAddBill}>
                  Add Bill
                </PaperButton>
              </View>
            </View>
          </Modal>

          {/* Mark as Paid Dialog */}
          <Dialog visible={!!billToPay} onDismiss={() => setBillToPay(null)}>
            <Dialog.Title>Mark Bill as Paid</Dialog.Title>
            <Dialog.Content>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ marginRight: 12 }}>Paid Date:</Text>
                <TextInput
                  mode="outlined"
                  placeholder="YYYY-MM-DD"
                  value={paidDate}
                  onChangeText={setPaidDate}
                  keyboardType="numbers-and-punctuation"
                  style={{ flex: 1 }}
                />
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton onPress={() => setBillToPay(null)}>Cancel</PaperButton>
              <PaperButton mode="contained" onPress={handlePaidDateSubmit}>
                Mark as Paid
              </PaperButton>
            </Dialog.Actions>
          </Dialog>

          {/* Update Due Date (mark unpaid) */}
          <Dialog visible={!!billToUnpay} onDismiss={() => setBillToUnpay(null)}>
            <Dialog.Title>Update Due Date</Dialog.Title>
            <Dialog.Content>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ marginRight: 12 }}>New Due Day:</Text>
                <TextInput
                  mode="outlined"
                  keyboardType="number-pad"
                  value={String(newDueDate)}
                  onChangeText={text => setNewDueDate(parseInt(text) || 1)}
                  maxLength={2}
                  style={{ flex: 1 }}
                />
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton onPress={() => setBillToUnpay(null)}>Cancel</PaperButton>
              <PaperButton mode="contained" onPress={handleUnpaidDateSubmit}>
                Update Due Date
              </PaperButton>
            </Dialog.Actions>
          </Dialog>

          {/* Edit Bill Dialog */}
          {editingBill && (
            <Dialog visible={!!editingBill} onDismiss={() => setEditingBill(null)}>
              <Dialog.Title>Edit Bill</Dialog.Title>
              <Dialog.Content>
                <View>
                  <TextInput
                    mode="outlined"
                    label="Name"
                    value={editingBill.name}
                    onChangeText={text => setEditingBill(prev => prev ? { ...prev, name: text } : null)}
                    style={{ marginBottom: 8 }}
                  />

                  <TextInput
                    mode="outlined"
                    label="Amount"
                    keyboardType="numeric"
                    value={String(editingBill.amount || "")}
                    onChangeText={text => setEditingBill(prev => prev ? { ...prev, amount: Number(text) } : null)}
                    style={{ marginBottom: 8 }}
                  />

                  <TextInput
                    mode="outlined"
                    label="Due Date (Day)"
                    keyboardType="numeric"
                    value={String(editingBill.due_date || "")}
                    onChangeText={text => setEditingBill(prev => prev ? { ...prev, due_date: Number(text) } : null)}
                    maxLength={2}
                    style={{ marginBottom: 8 }}
                  />

                  <Picker
                    selectedValue={editingBill.type}
                    onValueChange={(val: string) => setEditingBill(prev => prev ? { ...prev, type: val as 'mandatory' | 'optional' } : null)}
                  >
                    <Picker.Item label="Mandatory" value="mandatory" />
                    <Picker.Item label="Optional" value="optional" />
                  </Picker>

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                    <Switch
                      value={editingBill.paid_by_credit_card}
                      onValueChange={val => setEditingBill(prev => prev ? { ...prev, paid_by_credit_card: val } : null)}
                    />
                    <Text style={{ marginLeft: 8 }}>Paid by Credit Card</Text>
                  </View>
                </View>
              </Dialog.Content>

              <Dialog.Actions>
                <PaperButton onPress={() => setEditingBill(null)}>Cancel</PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={() =>
                    handleUpdateBill(editingBill.id, {
                      name: editingBill.name,
                      amount: editingBill.amount,
                      due_date: editingBill.due_date,
                      type: editingBill.type,
                      paid_by_credit_card: editingBill.paid_by_credit_card,
                      status: editingBill.status
                    })
                  }
                >
                  Save Changes
                </PaperButton>
              </Dialog.Actions>
            </Dialog>
          )}
        </Portal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  subtitle: { color: "#6b7280" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconButton: { padding: 8, backgroundColor: "white", borderRadius: 999 },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, gap: 8 },
  summaryCard: { flex: 1, marginRight: 8, borderRadius: 8, elevation: 2 },

  card: { marginTop: 8, borderRadius: 8, elevation: 3 },
  cardContent: { padding: 0 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  segmentedButtons: { height: 36, marginLeft: 12 },

  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  headerCell: { padding: 12, justifyContent: "center" },
  headerText: { fontWeight: "600", color: "#374151" },

  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", alignItems: "center" },
  tableCell: { padding: 12, justifyContent: "center" },
  dueDateCell: { flexDirection: "row", alignItems: "center" },
  dueDateText: { color: "#4b5563", marginLeft: 6 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 6 },
  badgeDestructive: { backgroundColor: "#fecaca", color: "#b91c1c" },
  badgeSecondary: { backgroundColor: "#dbeafe", color: "#1d4ed8" },

  switchContainer: { flexDirection: "row", alignItems: "center" },
  statusText: { color: "#4b5563", marginLeft: 8 },
  paymentText: { color: "#4b5563", fontSize: 14, marginLeft: 8 },
  actionsCell: { flexDirection: "row", alignItems: "center", gap: 8 },

  modalContainer: { backgroundColor: "white", padding: 20, margin: 20, borderRadius: 8 },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  cardAmount: { fontSize: 22, fontWeight: "700", marginBottom: 4 }
});
