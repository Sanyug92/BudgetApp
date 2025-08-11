import { useState, useEffect } from "react";
import { Picker } from "@react-native-picker/picker";
import { View, FlatList, StyleSheet, ScrollView, Pressable } from "react-native";
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


// Example usage in React Native component:
<View>
  <Icon name="credit-card" size={24} color="#000" />
  <Icon name="plus" size={24} color="#000" />
  <Icon name="filter" size={24} color="#000" />
  <Icon name="calendar" size={24} color="#000" />
  <Icon name="check" size={24} color="#000" />
  <Icon name="x" size={24} color="#000" />
  <Icon name="edit-2" size={24} color="#000" />
</View>


// Add these styles to your StyleSheet
const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  cardContent: {
    padding: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 8,
  },
  tabsContainer: {
    minWidth: 300,
  },
  segmentedButtons: {
    height: 36,
  },
  tableContainer: {
    maxHeight: 500,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerCell: {
    padding: 12,
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: '600',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    padding: 16,
    justifyContent: 'center',
  },
  dueDateCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueDateText: {
    color: '#4b5563',
  },
  badge: {
    alignSelf: 'flex-start',
  },
  badgeDestructive: {
    backgroundColor: '#fecaca',
    color: '#b91c1c',
  },
  badgeSecondary: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: '#4b5563',
  },
  paymentText: {
    color: '#4b5563',
    fontSize: 14,
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    margin: 0,
  },
  deleteButton: {
    minWidth: 0,
    padding: 0,
  },
  space: {
    gap: 12
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8
  }
});

interface BillsScreenProps {
  data: BudgetData;
  updateSpentAmount: (amount: number) => void;
}

export function BillsScreen({ data, updateSpentAmount }: BillsScreenProps) {
  const { updateBill, addBill, deleteBill } = useBudgetContext();
  const [billToPay, setBillToPay] = useState<Bill | null>(null);
  const [billToUnpay, setBillToUnpay] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [paidDate, setPaidDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [newDueDate, setNewDueDate] = useState<number>(1);
 
  // Function to check if a bill is past its due date
  const isBillPastDue = (dueDate: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    return currentDay > dueDate;
  };

  // Initialize bills and check their status based on due date
  const initializeBills = (): Bill[] => {
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const [bills, setBills] = useState<Bill[]>(() => initializeBills());
    const createBill = (bill: any): Bill => ({
      ...bill,
      id: bill.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
      user_id: bill.user_id || 'current-user-id', // You'll need to get this from your auth context
      created_at: bill.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_paid: bill.status === 'paid',
      due_date: bill.due_date || bill.dueDate || 1,
      status: isBillPastDue(bill.due_date || bill.dueDate || 1) ? "paid" : "unpaid",
      type: bill.type || "mandatory",
      paidByCreditCard: bill.paidByCreditCard || false
    });
  
    return [
      ...(data.mandatoryBills || []).map(bill => createBill({ ...bill, type: "mandatory" })),
      ...(data.optionalBills || []).map(bill => createBill({ ...bill, type: "optional" }))
    ];
  };

  const [bills, setBills] = useState<Bill[]>(initializeBills);

  const [filterType, setFilterType] = useState<"all" | "mandatory" | "optional">("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "amount" | "name">("dueDate");
  const [newBill, setNewBill] = useState<Partial<Bill>>({
    name: "",
    amount: 0,
    due_date: 1,
    type: "mandatory",
    status: "unpaid"
  });
  const [isAddingBill, setIsAddingBill] = useState(false);

  // Update bill statuses based on due date whenever bills change
  const updateBillStatuses = (bills: Bill[]): Bill[] => {
    return bills.map(bill => {
      if (bill.status === "paid") return bill; // Don't modify already paid bills
      return {
        ...bill,
        status: isBillPastDue(bill.due_date) ? "paid" : bill.status
      };
    });
  };

  // Update bill statuses only on initial load or when bills are added/removed
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      const updatedBills = updateBillStatuses([...bills]);
      setBills(updatedBills);
      setInitialized(true);
    }
  }, [bills.length]); // Only run when bills array length changes

  const filteredBills = bills
    .filter(bill => filterType === "all" || bill.type === filterType)
    .sort((a, b) => {
      if (sortBy === "dueDate") return a.due_date - b.due_date;
      if (sortBy === "amount") return b.amount - a.amount;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  const handleDeleteBill = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;

    try {
      const { error } = await deleteBill(id);

      if (error) {
        console.error('Error deleting bill:', error);
        return;
      }

      // Update local state to remove the deleted bill
      setBills(prevBills => prevBills.filter(bill => bill.id !== id));

    } catch (error) {
      console.error('Error in handleDeleteBill:', error);
    }
  };

  const onAddBill = async () => {
    if (!newBill.name || !newBill.amount || !newBill.due_date) return;

    try {
      const billData = {
        name: newBill.name,
        amount: newBill.amount,
        due_date: newBill.due_date,  // Changed from dueDate to due_date
        type: newBill.type || "mandatory",
        status: newBill.status || "unpaid",
        is_paid: newBill.status === "paid",
        paid_by_credit_card: newBill.paid_by_credit_card !== false  // Changed from paidByCreditCard to paid_by_credit_card
      };

      // Use the addBill function from BudgetContext which will handle user_id
      const result = await addBill(billData);

      if (result.error) {
        console.error('Error adding bill:', result.error);
        return;
      }

      if (result.data) {
        // Update local state with the created bill
        setBills(prevBills => [...prevBills, result.data]);

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
      }
    } catch (error) {
      console.error('Error in addBill:', error);
    }
  };

  const handlePaidDateSubmit = async () => {
    if (!billToPay) return;

    try {
      const paidDateObj = new Date(paidDate);
      const newDueDate = paidDateObj.getDate(); // Get day of month from paid date

      // Update the bill in the database
      const updates = {
        isPaid: true,
        dueDate: newDueDate,
        paid_by_credit_card: billToPay.paid_by_credit_card,
        status: 'paid' as const,
        updated_at: new Date().toISOString()
      };

      console.log('Updating bill with:', updates);
      const { error } = await updateBill(billToPay.id, updates);

      if (error) {
        console.error('Error updating bill:', error);
        return;
      }

      // Update local state
      setBills(prevBills => {
        return prevBills.map(bill =>
          bill.id === billToPay.id
            ? {
              ...bill,
              is_paid: true,
              dueDate: newDueDate,
              status: 'paid' as const,
              paid_by_credit_card: billToPay.paid_by_credit_card
            }
            : bill
        );
      });

      // Update spent amount
      updateSpentAmount(billToPay.amount);

      // Reset state
      setBillToPay(null);
      setPaidDate(format(new Date(), 'yyyy-MM-dd'));

    } catch (error) {
      console.error('Error in handlePaidDateSubmit:', error);
    }
  };

  const handlePaidByCreditCardToggle = async (id: string, currentValue: boolean) => {
    const newValue = !currentValue;
    try {
      const updates = {
        paid_by_credit_card: newValue,
        updated_at: new Date().toISOString()
      };

      console.log('Sending update with payload:', updates);
      const { data: updatedBill, error } = await updateBill(id, updates);
      console.log('Update response:', { updatedBill, error });

      if (error) {
        console.error('Error updating paid by credit card status:', error);
        return;
      }

      // Update local state with the response from the server
      setBills(prevBills => {
        return prevBills.map(bill =>
          bill.id === id
            ? {
              ...bill,
              paid_by_credit_card: newValue
            }
            : bill
        );
      });

    } catch (error) {
      console.error('Error in handlePaidByCreditCardToggle:', error);
    }
  };

  const handleUnpaidDateSubmit = async () => {
    if (!billToUnpay) return;

    try {
      const updates = {
        isPaid: false,
        status: 'unpaid' as const,
        due_date: newDueDate,
        paid_by_credit_card: billToUnpay.paid_by_credit_card,
        updated_at: new Date().toISOString()
      };

      console.log('Marking bill as unpaid with:', updates);
      const { error } = await updateBill(billToUnpay.id, updates);

      if (error) {
        console.error('Error updating bill status:', error);
        return;
      }

      // Update local state
      setBills(prevBills => {
        return prevBills.map(bill =>
          bill.id === billToUnpay.id
            ? {
              ...bill,
              status: 'unpaid',
              due_date: newDueDate,
              is_paid: false,
              paid_by_credit_card: billToUnpay.paid_by_credit_card
            }
            : bill
        );
      });

      // Reset state
      setBillToUnpay(null);
      setNewDueDate(1);

    } catch (error) {
      console.error('Error in handleUnpaidDateSubmit:', error);
    }
  };

  const handleBillStatusChange = async (id: string, newStatus: 'unpaid' | 'paid' | 'overdue') => {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    try {
      if (newStatus === 'paid') {
        // For marking as paid, show the paid date dialog
        setBillToPay(bill);
        return;
      } else if (newStatus === 'unpaid' && bill.status === 'paid') {
        // For marking as unpaid, show the due date dialog
        setBillToUnpay(bill);
        setNewDueDate(bill.due_date);
        return;
      }

      // For other status changes (like overdue)
      const updates = {
        isPaid: false,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      const { error } = await updateBill(id, updates);

      if (error) {
        console.error('Error updating bill status:', error);
        return;
      }

      // Update local state
      setBills(prevBills => {
        return prevBills.map(bill =>
          bill.id === id
            ? {
              ...bill,
              status: newStatus,
              is_paid: false
            }
            : bill
        );
      });
    } catch (error) {
      console.error('Error in handleBillStatusChange:', error);
    }
  };

  const handleUpdateBill = async (id: string, updates: Partial<Bill>) => {
    try {
      const billToUpdate = bills.find(bill => bill.id === id);
      if (!billToUpdate) return;

      // Prepare the update payload with database field names
      const updatePayload = {
        name: updates.name || billToUpdate.name,
        amount: updates.amount !== undefined ? updates.amount : billToUpdate.amount,
        due_date: updates.due_date !== undefined ? updates.due_date : billToUpdate.due_date,
        is_mandatory: updates.type ? updates.type === 'mandatory' : billToUpdate.type === 'mandatory',
        is_paid: updates.status ? updates.status === 'paid' : billToUpdate.status === 'paid',
        paid_by_credit_card: updates.paid_by_credit_card !== undefined
          ? updates.paid_by_credit_card
          : billToUpdate.paid_by_credit_card,
        updated_at: new Date().toISOString(),
      };

      console.log('Sending update payload:', updatePayload);

      // Update the bill in the database
      const { error } = await updateBill(id, updatePayload);

      if (!error) {
        console.log('Bill updated successfully', updatePayload);
        // Update local state if database update is successful
        setBills(prevBills =>
          prevBills.map(bill =>
            bill.id === id ? {
              ...bill,
              ...updates,
              // Map database fields back to UI fields
              dueDate: updates.due_date !== undefined ? updates.due_date : bill.due_date,
              type: updates.type || bill.type,
              status: updates.status !== undefined ? updates.status : bill.status,
              paid_by_credit_card: updates.paid_by_credit_card !== undefined
                ? updates.paid_by_credit_card
                : bill.paid_by_credit_card
            } : bill
          )
        );
        setEditingBill(null);
      } else {
        console.error('Error updating bill:', error);
      }
    } catch (error) {
      console.error('Error in handleUpdateBill:', error);
    }
  };

  const onDeleteBill = (id: string) => {
    setBills(bills.filter(bill => bill.id !== id));
  };

  // Format due date to show as "Month Day" (e.g., "August 15")
  const formatDueDate = (day: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Create a date object for the bill's due date
    const dueDate = new Date(currentYear, currentMonth, day);

    // Format as "Month Day" (e.g., "August 15")
    return dueDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: Bill["status"]) => {
    switch (status) {
      case "paid": return "bg-gradient-success text-white";
      case "overdue": return "bg-destructive text-white";
      default: return "bg-warning text-black";
    }
  };

  const mandatoryTotal = bills
    .filter(bill => bill.type === "mandatory")
    .reduce((sum, bill) => sum + bill.amount, 0);

  const optionalTotal = bills
    .filter(bill => bill.type === "optional")
    .reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary bg-clip-text">Bills Management</h1>
            <p className="text-muted-foreground">Track your mandatory and optional bills</p>
          </div>
          <Portal>
            <Modal
              visible={isAddingBill}
              onDismiss={() => setIsAddingBill(false)}
              contentContainerStyle={{ backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 }}
            >
              <View style={{ padding: 16 }}>
                <Title>Add New Bill</Title>
                <View style={{ marginTop: 16 }}>
                  <Text>Bill Name</Text>
                  <TextInput
                    mode="outlined"
                    label="Bill Name"
                    placeholder="Electric Bill"
                    value={newBill.name || ""}
                    onChangeText={(text) => setNewBill({ ...newBill, name: text })}
                    style={{ marginTop: 4, marginBottom: 12 }}
                  />
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text>Amount</Text>
                  <TextInput
                    mode="outlined"
                    label="Amount"
                    keyboardType="numeric"
                    placeholder="150"
                    value={newBill.amount ? newBill.amount.toString() : ""}
                    onChangeText={(text) => setNewBill({ ...newBill, amount: parseFloat(text) || 0 })}
                    style={{ marginTop: 4, marginBottom: 12 }}
                  />
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text>Due Date (Day of Month)</Text>
                  <TextInput
                    mode="outlined"
                    label="Due Date"
                    keyboardType="numeric"
                    placeholder="15"
                    value={newBill.due_date ? newBill.due_date.toString() : ""}
                    onChangeText={(text) => setNewBill({ ...newBill, due_date: parseInt(text) || 1 })}
                    style={{ marginTop: 4, marginBottom: 12 }}
                    maxLength={2}
                  />
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text>Type</Text>
                  <Picker
                    selectedValue={newBill.type || "mandatory"}
                    style={{ height: 50, width: '100%' }}
                    onValueChange={(itemValue: string) => setNewBill({ ...newBill, type: itemValue as "mandatory" | "optional" })}
                  >
                    <Picker.Item label="Mandatory" value="mandatory" />
                    <Picker.Item label="Optional" value="optional" />
                  </Picker>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 }}>
                  <Switch
                    value={newBill.paid_by_credit_card !== false}
                    onValueChange={(value) => setNewBill({ ...newBill, paid_by_credit_card: value })}
                  />
                  <Text style={{ marginLeft: 8 }}>Paid by Credit Card</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                  <PaperButton
                    mode="outlined"
                    onPress={() => setIsAddingBill(false)}
                    style={{ marginRight: 8 }}
                  >
                    Cancel
                  </PaperButton>
                  <PaperButton
                    mode="contained"
                    onPress={onAddBill}
                  >
                    Add Bill
                  </PaperButton>
                </View>
              </View>
            </Modal>
          </Portal>
        </div>

        {/* Summary Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -8 }}>
          {/* Mandatory Bills Card */}
          <View style={{ width: '100%', padding: 8, marginBottom: 16 }}>
            <Card style={{
              backgroundColor: 'white',
              borderRadius: 8,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}>
              <Card.Content>
                <Title style={{ fontSize: 18, marginBottom: 8 }}>Mandatory Bills</Title>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#dc2626' }}>
                  ${mandatoryTotal.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  {bills.filter(b => b.type === "mandatory").length} bills
                </Text>
              </Card.Content>
            </Card>
          </View>

          {/* Optional Bills Card */}
          <View style={{ width: '100%', padding: 8, marginBottom: 16 }}>
            <Card style={{
              backgroundColor: 'white',
              borderRadius: 8,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}>
              <Card.Content>
                <Title style={{ fontSize: 18, marginBottom: 8 }}>Optional Bills</Title>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b' }}>
                  ${optionalTotal.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  {bills.filter(b => b.type === "optional").length} bills
                </Text>
              </Card.Content>
            </Card>
          </View>

          {/* Total Monthly Card */}
          <View style={{ width: '100%', padding: 8, marginBottom: 16 }}>
            <Card style={{
              backgroundColor: 'white',
              borderRadius: 8,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}>
              <Card.Content>
                <Title style={{ fontSize: 18, marginBottom: 8 }}>Total Monthly</Title>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>
                  ${(mandatoryTotal + optionalTotal).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  All bills combined
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Paid Date Dialog */}
        <Portal>
          <Dialog visible={!!billToPay} onDismiss={() => setBillToPay(null)}>
            <Dialog.Title>Mark Bill as Paid</Dialog.Title>
            <Dialog.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
                <Text style={{ marginRight: 16 }}>Paid Date:</Text>
                <TextInput
                  mode="outlined"
                  style={{ flex: 1 }}
                  value={paidDate}
                  onChangeText={setPaidDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
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
        </Portal>

        {/* Unpaid Date Dialog */}
        <Portal>
          <Dialog visible={!!billToUnpay} onDismiss={() => setBillToUnpay(null)}>
            <Dialog.Title>Update Due Date</Dialog.Title>
            <Dialog.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
                <Text style={{ marginRight: 16 }}>New Due Day:</Text>
                <TextInput
                  mode="outlined"
                  style={{ flex: 1 }}
                  value={newDueDate?.toString()}
                  onChangeText={(text) => setNewDueDate(parseInt(text) || 1)}
                  keyboardType="number-pad"
                  maxLength={2}
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
        </Portal>

        {/* Edit Bill Dialog */}
        <Portal>
          <Dialog visible={!!editingBill} onDismiss={() => setEditingBill(null)}>
            <Dialog.Title>Edit Bill</Dialog.Title>
            <Dialog.Content>
              {editingBill && (
                <View style={{ gap: 16 }}>
                  <TextInput
                    mode="outlined"
                    label="Name"
                    value={editingBill.name}
                    onChangeText={(text) => setEditingBill({ ...editingBill, name: text })}
                  />
                  <TextInput
                    mode="outlined"
                    label="Amount"
                    value={editingBill.amount?.toString()}
                    onChangeText={(text) => setEditingBill({ ...editingBill, amount: Number(text) })}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    mode="outlined"
                    label="Due Date (Day of Month)"
                    value={editingBill.due_date?.toString()}
                    onChangeText={(text) => setEditingBill({ ...editingBill, due_date: Number(text) })}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Picker
                    selectedValue={editingBill.type}
                    onValueChange={(value) => setEditingBill({ ...editingBill, type: value as 'mandatory' | 'optional' })}
                    style={{ backgroundColor: 'white', marginTop: 8 }}
                  >
                    <Picker.Item label="Mandatory" value="mandatory" />
                    <Picker.Item label="Optional" value="optional" />
                  </Picker>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Switch
                      value={editingBill.paid_by_credit_card}
                      onValueChange={(value) => setEditingBill({ ...editingBill, paid_by_credit_card: value })}
                    />
                    <Text style={{ marginLeft: 8 }}>Paid by Credit Card</Text>
                  </View>
                </View>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton onPress={() => setEditingBill(null)}>Cancel</PaperButton>
              <PaperButton
                mode="contained"
                onPress={() => handleUpdateBill(editingBill?.id || '', {
                  name: editingBill?.name || '',
                  amount: editingBill?.amount || 0,
                  due_date: editingBill?.due_date || 1,
                  type: editingBill?.type || 'mandatory',
                  paid_by_credit_card: editingBill?.paid_by_credit_card || false,
                  status: editingBill?.status || 'unpaid'
                })}
              >
                Save Changes
              </PaperButton>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Bills Table */}
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Icon name="credit-card" size={20} color="#3b82f6" style={styles.headerIcon} />
                <Title>All Bills</Title>
              </View>
              <View style={styles.headerRight}>
                <Icon name="filter" size={20} color="#6b7280" style={styles.filterIcon} />
                <View style={styles.tabsContainer}>
                  <SegmentedButtons
                    value={filterType}
                    onValueChange={(value) => setFilterType(value as "all" | "mandatory" | "optional")}
                    buttons={[
                      { value: 'all', label: 'All' },
                      { value: 'mandatory', label: 'Mandatory' },
                      { value: 'optional', label: 'Optional' },
                    ]}
                    style={styles.segmentedButtons}
                  />
                </View>
              </View>
            </View>

            <View style={styles.tableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Pressable
                      style={[styles.headerCell, { width: 150 }]}
                      onPress={() => setSortBy("name")}
                    >
                      <Text style={styles.headerText}>
                        Bill Name {sortBy === "name" && "↕"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.headerCell, { width: 100 }]}
                      onPress={() => setSortBy("amount")}
                    >
                      <Text style={styles.headerText}>
                        Amount {sortBy === "amount" && "↕"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.headerCell, { width: 120 }]}
                      onPress={() => setSortBy("dueDate")}
                    >
                      <Text style={styles.headerText}>
                        Due Date {sortBy === "dueDate" && "↕"}
                      </Text>
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

                  {/* Table Rows */}
                  <FlatList
                    data={filteredBills}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: bill }) => (
                      <View style={styles.tableRow}>
                        <View style={[styles.tableCell, { width: 150 }]}>
                          <Text>{bill.name}</Text>
                        </View>
                        <View style={[styles.tableCell, { width: 100 }]}>
                          <Text>${bill.amount.toLocaleString()}</Text>
                        </View>
                        <View style={[styles.tableCell, { width: 120 }]}>
                          <View style={styles.dueDateCell}>
                            <Icon name="calendar" size={16} color="#6b7280" />
                            <Text style={styles.dueDateText}>
                              {formatDueDate(bill.due_date)}
                            </Text>
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
                              value={bill.status === 'paid'}
                              onValueChange={(checked) => {
                                handleBillStatusChange(bill.id, checked ? 'paid' : 'unpaid');
                              }}
                              color="#10b981"
                            />
                            <Text style={styles.statusText}>
                              {bill.status === 'paid' ? 'Paid' : 'Unpaid'}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.tableCell, { width: 150 }]}>
                          <View style={styles.switchContainer}>
                            <Switch
                              value={bill.paid_by_credit_card === true}
                              onValueChange={() => {
                                handlePaidByCreditCardToggle(bill.id, bill.paid_by_credit_card || false);
                              }}
                              color="#3b82f6"
                            />
                            <Text style={styles.paymentText}>
                              {bill.paid_by_credit_card ? 'Credit Card' : 'Other'}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.tableCell, styles.actionsCell, { width: 150 }]}>
                          <IconButton
                            icon="pencil"
                            size={20}
                            onPress={() => setEditingBill(bill)}
                            style={styles.actionButton}
                          />
                          <PaperButton
                            mode="text"
                            onPress={() => handleDeleteBill(bill.id)}
                            textColor="#ef4444"
                            style={styles.deleteButton}
                          >
                            Delete
                          </PaperButton>
                        </View>
                      </View>
                    )}
                  />
                </View>
              </ScrollView>
            </View>
          </Card.Content>
        </Card>


        <Portal>
          {/* Mark as Paid Dialog */}
          <Dialog visible={!!billToPay} onDismiss={() => setBillToPay(null)}>
            <Dialog.Title>Mark Bill as Paid</Dialog.Title>
            <Dialog.Content>
              <Text>Paid Date</Text>
              <TextInput
                mode="outlined"
                placeholder="YYYY-MM-DD"
                value={paidDate}
                onChangeText={setPaidDate}
                maxLength={10}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton onPress={() => setBillToPay(null)}>Cancel</PaperButton>
              <PaperButton onPress={handlePaidDateSubmit}>Mark as Paid</PaperButton>
            </Dialog.Actions>
          </Dialog>

          {/* Update Due Date Dialog */}
          <Dialog visible={!!billToUnpay} onDismiss={() => setBillToUnpay(null)}>
            <Dialog.Title>Update Due Date</Dialog.Title>
            <Dialog.Content>
              <Text>New Due Day</Text>
              <TextInput
                mode="outlined"
                keyboardType="numeric"
                value={String(newDueDate)}
                onChangeText={(text) => setNewDueDate(parseInt(text) || 1)}
                maxLength={2}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton onPress={() => setBillToUnpay(null)}>Cancel</PaperButton>
              <PaperButton onPress={handleUnpaidDateSubmit}>Update Due Date</PaperButton>
            </Dialog.Actions>
          </Dialog>

          {/* Edit Bill Dialog */}
          {editingBill && (
          <Dialog visible={!!editingBill} onDismiss={() => setEditingBill(null)}>
            <Dialog.Title>Edit Bill</Dialog.Title>
            <Dialog.Content>
           
                <View style={styles.space}>
                  <Text>Name</Text>
                  <TextInput
                    mode="outlined"
                    value={editingBill.name}
                    onChangeText={(text) => setEditingBill({ ...editingBill, name: text })}
                  />

                  <Text>Amount</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    value={String(editingBill.amount)}
                    onChangeText={(text) => setEditingBill({ ...editingBill, amount: Number(text) })}
                  />

                  <Text>Due Date (Day of Month)</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    value={String(editingBill.due_date)}
                    onChangeText={(text) => setEditingBill({ ...editingBill, due_date: Number(text) })}
                    maxLength={2}
                  />

                  <Text>Type</Text>
                  <Picker
                    selectedValue={editingBill.type}
                    onValueChange={(value) =>
                      setEditingBill({ ...editingBill, type: value })
                    }
                  >
                    <Picker.Item label="Mandatory" value="mandatory" />
                    <Picker.Item label="Optional" value="optional" />
                  </Picker>

                  <View style={styles.switchRow}>
                    <Switch
                      value={editingBill.paid_by_credit_card}
                      onValueChange={(val) => setEditingBill({ ...editingBill, paid_by_credit_card: val })}
                    />
                    <Text>Paid by Credit Card</Text>
                  </View>
                </View>
            
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton onPress={() => setEditingBill(null)}>Cancel</PaperButton>
              <PaperButton
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

      </div>
    </div>
  );
}
