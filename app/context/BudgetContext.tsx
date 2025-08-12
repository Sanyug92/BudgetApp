import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bill } from '@/types/bill.types';
import { useAuth } from './AuthContext';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useBills } from '@/hooks/useBills';
import { useBudget } from '@/hooks/useBudget';

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  available: number;
  balance?: number; // Computed as limit - available
  lastUpdated: string;
}

export interface BudgetContextType {
  // Budget Data
  budgetData: BudgetData;
  updateBudgetData: (newData: BudgetData) => void;
  fetchAndCalculateBudget: (currentUser?: any) => Promise<void>;

  // Credit Cards
  addCreditCard: (card: { name: string; limit: number; available: number }) => Promise<{ error: Error | null }>;
  updateCreditCard: (creditCardId: string, updates: Partial<CreditCard>) => Promise<{ error: Error | null }>;
  deleteCreditCard: (creditCardId: string) => Promise<{ error: Error | null }>;
  initializeCreditCards: (cards: CreditCard[]) => void;

  // Bills
  addBill: (bill: Omit<Bill, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<{ data: any; error: Error | null }>;
  updateBill: (id: string, updates: Partial<Bill>) => Promise<{ data: any; error: Error | null }>;
  deleteBill: (id: string) => Promise<{ error: Error | null }>;

  // State
  loading: boolean;
  error: Error | null;
  bills: Bill[];
}

export interface BudgetData {
  monthlyIncome: number;
  mandatoryBills: Bill[];
  optionalBills: Bill[];
  creditCards: CreditCard[];
  savingsGoal: number;
  discretionarySpent: number;
  discretionaryLeft: number;
  discretionaryLeftPercentage: number;
  discretionLimit: number;
  totalSpent: number;
  lastUpdated: number;
}

export const convertToBudgetData = (setupData: {
  monthlyIncome: number;
  mandatoryBills: Bill[];
  optionalBills: Bill[];
  creditCards: CreditCard[];
  savingsGoal: number;
  discretionarySpent: number;
}): BudgetData => {
  const totalSpent = setupData.mandatoryBills.reduce((sum, bill) => sum + bill.amount, 0) +
    setupData.optionalBills.reduce((sum, bill) => sum + bill.amount, 0);

  return {
    ...setupData,
    discretionaryLeft: setupData.monthlyIncome - totalSpent - setupData.savingsGoal,
    discretionaryLeftPercentage: setupData.monthlyIncome > 0
      ? ((setupData.monthlyIncome - totalSpent - setupData.savingsGoal) / setupData.monthlyIncome) * 100
      : 0,
    discretionLimit: setupData.monthlyIncome - totalSpent - setupData.savingsGoal - (setupData.discretionarySpent || 0),
    totalSpent,
    lastUpdated: Date.now()
  };
};

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function useBudgetContext() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudgetContext must be used within a BudgetProvider');
  }
  return context;
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading = true } = useAuth();
  
  // Debug logs
  useEffect(() => {
    console.log('BudgetProvider: Auth state:', { 
      hasUser: !!user, 
      userId: user?.id,
      authLoading 
    });
  }, [user, authLoading]);

  // Only fetch budget data if we have a user and auth is done loading
  const shouldFetchData = authLoading === false && !!user?.id;
  
  const { 
    budget, 
    updateBudget, 
    loading: budgetLoading, 
    error: budgetError 
  } = useBudget(shouldFetchData ? user.id : undefined);
  
  const { 
    cards, 
    addCreditCard, 
    updateCreditCard, 
    deleteCreditCard, 
    loading: cardsLoading, 
    error: cardsError 
  } = useCreditCards(shouldFetchData ? user?.id : undefined);
  
  const { 
    bills, 
    addBill, 
    updateBill, 
    deleteBill, 
    loading: billsLoading, 
    error: billsError 
  } = useBills(shouldFetchData ? user?.id : undefined);

  // Combine all loading states
  const loading = authLoading || budgetLoading || cardsLoading || billsLoading;
  
  // Debug logs for data loading state
  useEffect(() => {
    if (!authLoading) {
      console.log('BudgetProvider: Data loading state:', {
        budgetLoading,
        cardsLoading,
        billsLoading,
        hasBudget: !!budget,
        cardsCount: cards?.length || 0,
        billsCount: bills?.length || 0,
      });
    }
  }, [authLoading, budgetLoading, cardsLoading, billsLoading, budget, cards, bills]);
  
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [budgetData, setBudgetData] = useState<BudgetData>({
    monthlyIncome: 0,
    mandatoryBills: [],
    optionalBills: [],
    creditCards: [],
    savingsGoal: 0,
    discretionarySpent: 0,
    totalSpent: 0,
    discretionLimit: 0,
    discretionaryLeft: 0,
    discretionaryLeftPercentage: 0,
    lastUpdated: Date.now()
  });
  
  // Add debug logs for auth state changes
  useEffect(() => {
    console.log('Auth state in BudgetProvider:', {
      hasUser: !!user,
      userId: user?.id,
      authLoading,
      budgetLoading,
      budgetExists: !!budget,
      cardsLoading,
      billsLoading,
      isInitialized
    });
  }, [user, loading, isInitialized, budget]);

  // Create a default budget if one doesn't exist
  useEffect(() => {
    if (user?.id && !budget && !budgetLoading) {
      console.log('No budget found for user, creating default budget');
      updateBudget({
        monthly_income: 0,
        savings_goal: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).catch(console.error);
    }
  }, [user?.id, budget, budgetLoading, updateBudget]);

  const fetchAndCalculateBudget = useCallback(async (currentUser = user) => {
    console.log('Fetching and calculating budget...');
    console.log('Current user in fetchAndCalculateBudget:', currentUser?.id || 'No user');
    console.log('Budget data:', budget);
    
    try {
      if (!currentUser?.id) {
        console.log('Skipping budget calculation: No user');
        return;
      }
      
      if (!budget) {
        console.log('No budget data available yet');
        return;
      }

      // Use the latest bills and cards data
      const currentBills = bills || [];
      const currentCards = cards || [];

      // Get current date at start of day for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const processBill = (bill: any) => {
        // Get current date components
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();
        
        // Create a date object for the bill's due date in the current month/year
        const billDueDate = new Date(currentYear, currentMonth, bill.due_date);
        
        // Log dates for debugging
        console.log('Processing bill:', {
          billId: bill.id,
          billName: bill.name,
          dueDay: bill.due_date,
          currentDate: currentDate,
        });

        // Check if the bill is due today or in the past and not paid
        const isPaid = bill.is_paid || 
          (bill.due_date <= currentDate && bill.auto_pay);

        // If bill is due today or in the past and not paid, mark it as paid
        if (bill.due_date <= currentDate && !bill.is_paid && bill.auto_pay) {
          console.log(`Marking bill as paid: ${bill.name} (Due on day ${bill.due_date} of month)`);
          // Update the bill in the database
          updateBill(bill.id, { is_paid: true }).catch(console.error);
        } else {
          console.log(`Bill ${bill.name} not marked as paid. Due day: ${bill.due_date}, Current day: ${currentDate}, isPaid: ${bill.is_paid}`);
        }

        return {
          id: bill.id,
          user_id: bill.user_id || currentUser?.id || '',
          name: bill.name,
          amount: bill.amount,
          due_date: bill.due_date,
          is_paid: isPaid,
          status: isPaid ? 'paid' as const : 'unpaid' as const,
          type: bill.is_mandatory ? 'mandatory' as const : 'optional' as const,
          paid_by_credit_card: bill.paid_by_credit_card || false,
          created_at: bill.created_at || new Date().toISOString(),
          updated_at: bill.updated_at || new Date().toISOString()
        };
      };

      console.log("xxcurrentBills", currentBills)
      // Separate bills into mandatory and optional
      const mandatoryBills = currentBills
        .filter(bill => bill.type === "mandatory")
        .map(processBill);

      const optionalBills = currentBills
        .filter(bill => bill.type !== "mandatory")
        .map(processBill);

        console.log("xxmandatoryBills", mandatoryBills)
        console.log("xxoptionalBills", optionalBills)

      // Map credit cards to match the CreditCard type
      const mappedCards: CreditCard[] = currentCards.map(card => ({
        id: card.id,
        name: card.name,
        limit: card.limit,
        available: card.available,
        balance: card.limit - card.available,
        lastUpdated: card.last_updated || new Date().toISOString()
      }));

      // Calculate total spent on credit cards
      const totalCreditCardSpent = mappedCards.reduce(
        (sum, card) => sum + (card.limit - card.available),
        0
      );

      // Calculate total bills
      const totalBills = mandatoryBills.reduce((sum, bill) => sum + bill.amount, 0) +
        optionalBills.reduce((sum, bill) => sum + bill.amount, 0);

      // Calculate total of bills paid by credit card
      const totalCreditCardBills = [...mandatoryBills, ...optionalBills]
        .filter(bill => bill.status === 'paid' && bill.paid_by_credit_card)
        .reduce((sum, bill) => sum + bill.amount, 0);

      // Calculate discretionary values
      const monthlyIncome = budget?.monthly_income || 0;
      const savingsGoal = budget?.savings_goal || 0;
      const discretionLimit = Math.max(0, monthlyIncome - totalBills - savingsGoal);
      const discretionarySpent = Math.max(0, totalCreditCardSpent - totalCreditCardBills);
      const discretionaryLeft = Math.max(0, discretionLimit - discretionarySpent);
      const discretionaryLeftPercentage = discretionLimit > 0
        ? (discretionaryLeft / discretionLimit) * 100
        : 0;
      console.log('xxDiscretionarySpent:', discretionarySpent);
      console.log("xxtotalCreditCardBill",totalCreditCardBills)
        console.log("xxbills", bills)
      // Update the budget data
      setBudgetData({
        monthlyIncome,
        mandatoryBills,
        optionalBills,
        creditCards: mappedCards,
        savingsGoal,
        discretionarySpent,
        discretionaryLeft,
        discretionaryLeftPercentage,
        discretionLimit,
        totalSpent: totalBills + discretionarySpent,
        lastUpdated: Date.now()
      });
    } catch (err) {
      console.error('Error fetching and calculating budget:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch budget data'));
    }
  }, [user?.id, budget, bills, cards, updateBill, updateCreditCard, updateBudget]);

  // Effect for initial data loading
  useEffect(() => {
    if (!user?.id) {
      console.log('No user, skipping budget initialization');
      return;
    }

    if (isInitialized) {
      console.log('Already initialized, skipping');
      return;
    }

    if (budgetLoading) {
      console.log('Budget still loading, waiting...');
      return;
    }

    console.log('Initializing budget data for user:', user.id);
    fetchAndCalculateBudget(user);
    setIsInitialized(true);
  }, [user, isInitialized, fetchAndCalculateBudget, budgetLoading]);



  const recalculateBudget = useCallback((
    prevData: BudgetData,
    updatedCreditCards: CreditCard[] = prevData.creditCards
  ): BudgetData => {
    const totalSpent = updatedCreditCards.reduce(
      (sum, card) => sum + (card.limit - card.available),
      0
    );

    const mandatoryBillsTotal = prevData.mandatoryBills.reduce(
      (sum, bill) => sum + ((bill.paid_by_credit_card !== false) ? (bill.amount || 0) : 0),
      0
    );

    const optionalBillsTotal = prevData.optionalBills.reduce(
      (sum, bill) => sum + ((bill.paid_by_credit_card !== false) ? (bill.amount || 0) : 0),
      0
    );

    const discretionarySpent = Math.max(0, totalSpent - (mandatoryBillsTotal + optionalBillsTotal));
    const totalBills = prevData.mandatoryBills.reduce((sum, bill) => sum + bill.amount, 0) +
      prevData.optionalBills.reduce((sum, bill) => sum + bill.amount, 0);

    const actualDiscretionLimit = Math.max(0, prevData.monthlyIncome - totalBills - prevData.savingsGoal);
    const discretionaryLeft = Math.max(0, actualDiscretionLimit - discretionarySpent);
    const discretionaryLeftPercentage = actualDiscretionLimit > 0
      ? (discretionaryLeft / actualDiscretionLimit) * 100
      : 0;

    return {
      ...prevData,
      creditCards: updatedCreditCards,
      totalSpent,
      discretionarySpent,
      discretionaryLeft,
      discretionaryLeftPercentage,
      discretionLimit: actualDiscretionLimit,
      lastUpdated: Date.now()
    };
  }, []);

  const updateBudgetData = useCallback(async (newData: BudgetData) => {
    if (!user?.id) return;

    try {
      // This will upsert the budget data
      const { error } = await updateBudget({
        monthly_income: newData.monthlyIncome,
        savings_goal: newData.savingsGoal,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      // Recalculate the budget data to ensure all derived values are correct
      const updatedData = {
        ...newData,
        lastUpdated: Date.now(),
        // Recalculate discretionary values
        totalSpent: newData.mandatoryBills.reduce((sum, bill) => sum + bill.amount, 0) +
          newData.optionalBills.reduce((sum, bill) => sum + bill.amount, 0),
        discretionaryLeft: Math.max(0, newData.monthlyIncome -
          newData.mandatoryBills.reduce((sum, bill) => sum + bill.amount, 0) -
          newData.optionalBills.reduce((sum, bill) => sum + bill.amount, 0) -
          newData.savingsGoal),
        discretionaryLeftPercentage: newData.monthlyIncome > 0
          ? ((newData.discretionLimit) / newData.monthlyIncome) * 100
          : 0
      };

      // Update local state with the recalculated data
      setBudgetData(prev => ({
        ...prev,
        ...updatedData,
        lastUpdated: Date.now()
      }));

      return { error: null };
    } catch (err) {
      const error = err as Error;
      console.error('Error updating budget:', error);
      setError(error);
      return { error };
    }
  }, [user?.id, updateBudget]);

  const handleUpdateCreditCard = useCallback(async (creditCardId: string, updates: Omit<Partial<CreditCard>, 'id' | 'lastUpdated'>) => {
    if (!user?.id) return { error: new Error('User not authenticated') };

    try {
      const { limit, available, ...rest } = updates;

      // Update local state optimistically
      setBudgetData(prev => {
        const updatedCards = prev.creditCards.map(card =>
          card.id === creditCardId
            ? {
              ...card,
              ...rest,
              ...(limit !== undefined && { limit }),
              ...(available !== undefined && { available }),
              lastUpdated: new Date().toISOString()
            }
            : card
        );

        return {
          ...prev,
          creditCards: updatedCards
        };
      });

      // Only include the fields that are allowed to be updated
      const updateData: Omit<Partial<CreditCard>, 'id' | 'lastUpdated' | 'balance'> = {
        ...rest,
        ...(limit !== undefined && { limit: Number(limit) }),
        ...(available !== undefined && { available: Number(available) })
      };

      const { error } = await updateCreditCard(creditCardId, updateData, user.id);

      if (error) {
        // Revert optimistic update on error
        setBudgetData(prev => ({
          ...prev,
          creditCards: prev.creditCards // This will trigger a re-fetch
        }));
        throw error;
      }

      return { error: null };
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error updating credit card:', error);
      return { error };
    }
  }, [user?.id, updateCreditCard]);

  const handleAddCreditCard = useCallback(async (card: { name: string; limit: number; available: number }) => {
    if (!user?.id) return { error: new Error('User not authenticated') };

    try {
      await addCreditCard(card);
      return { error: null };
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error adding credit card:', error);
      return { error };
    }
  }, [user?.id, addCreditCard]);

  const handleDeleteCreditCard = useCallback(async (creditCardId: string) => {
    if (!user?.id) {
      const error = new Error('User not authenticated');
      setError(error);
      console.error('Error deleting credit card:', error);
      return { error };
    }

    try {
      const { error } = await deleteCreditCard(creditCardId, user.id);
      if (error) throw error;
      return { error: null };
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error deleting credit card:', error);
      return { error };
    }
  }, [user?.id, deleteCreditCard]);

  const initializeCreditCards = useCallback((cards: CreditCard[]) => {
    setBudgetData(prev => recalculateBudget(prev, cards));
  }, [recalculateBudget]);

  // Helper function to transform bill data to match Bill type
  const transformBill = useCallback((bill: any): Bill => {
    // Handle both camelCase and snake_case properties
    const isPaid = bill.isPaid ?? bill.is_paid ?? false;
    const paidByCreditCard = bill.paidByCreditCard ?? bill.paid_by_credit_card ?? false;
    const dueDate = bill.dueDate ?? bill.due_date ?? new Date().getTime();
    const billType = bill.type ?? (bill.is_mandatory ? 'mandatory' : 'optional');
    
    return {
      id: bill.id,
      user_id: bill.user_id || user?.id || '',
      name: bill.name || '',
      amount: bill.amount || 0,
      due_date: dueDate,
      is_paid: isPaid,
      status: isPaid ? 'paid' as const : 'unpaid' as const,
      type: billType as 'mandatory' | 'optional',
      paid_by_credit_card: paidByCreditCard,
      created_at: bill.created_at || new Date().toISOString(),
      updated_at: bill.updated_at || new Date().toISOString(),
      // Include any other fields from DatabaseBill that might be needed
      ...(bill.category && { category: bill.category })
    };
  }, [user?.id]);

  // Initialize data when user changes or data loads
  useEffect(() => {
    if (user && budget && cards && bills) {
      // Transform all bills to match the Bill type
      const allBills = bills.map(transformBill);
      const mandatoryBills = allBills.filter(bill => bill.type === 'mandatory');
      const optionalBills = allBills.filter(bill => bill.type === 'optional');

      // Map cards to match the CreditCard type
      const mappedCards: CreditCard[] = cards.map(card => ({
        id: card.id,
        name: card.name,
        limit: card.limit,
        available: card.available,
        balance: card.limit - card.available,
        lastUpdated: card.last_updated || new Date().toISOString()
      }));

      // Calculate total mandatory bills
      const totalMandatoryBills = mandatoryBills.reduce((sum, bill) => sum + bill.amount, 0);

      // Calculate initial budget data without depending on previous state
      const initialBudgetData: BudgetData = {
        monthlyIncome: budget.monthly_income || 0,
        mandatoryBills: mandatoryBills,
        optionalBills: optionalBills,
        creditCards: mappedCards,
        savingsGoal: budget.savings_goal || 0,
        discretionarySpent: 0, // This should be calculated based on actual spending
        discretionLimit: Math.max(0, (budget.monthly_income || 0) - totalMandatoryBills - (budget.savings_goal || 0)),
        totalSpent: 0, // This should be calculated based on actual spending
        lastUpdated: Date.now(),
        discretionaryLeft: 0, // These will be calculated by recalculateBudget
        discretionaryLeftPercentage: 0
      };

      // Recalculate derived values and update state once
      setBudgetData(prevData => {
        // Only update if the data has actually changed to prevent unnecessary re-renders
        if (JSON.stringify(prevData) !== JSON.stringify(initialBudgetData)) {
          return recalculateBudget(initialBudgetData);
        }
        return prevData;
      });
    }
  }, [bills, cards, budget, user, recalculateBudget]);

  const handleAddBill = useCallback(async (bill: Omit<Bill, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    const dbBill = {
      name: bill.name,
      amount: bill.amount,
      due_date: bill.due_date,
      type: bill.type,
      is_mandatory: bill.type === 'mandatory',
      is_paid: bill.status === 'paid',
      paid_by_credit_card: bill.paid_by_credit_card || false,
    };
    return addBill(dbBill);
  }, [addBill]);

  const handleUpdateBill = useCallback(async (id: string, updates: Partial<Bill>) => {
    console.log('Updating bill with:', updates);
    try {
      // Convert frontend bill properties to database format
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      // Map all possible fields from the updates
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      
      // Handle due date updates (support both dueDate and due_date)
      const dueDate = updates.due_date !== undefined ? updates.due_date : 
                    updates.due_date !== undefined ? updates.due_date : undefined;
      
      if (dueDate !== undefined) {
        dbUpdates.due_date = dueDate;
        
        // Check if we need to update the is_paid status based on the new due date
        const today = new Date();
        const currentDate = today.getDate();
        const newDueDate = typeof dueDate === 'number' 
          ? dueDate 
          : new Date(dueDate).getDate();
        
        // If the new due date is today or in the past, mark as paid
        if (newDueDate <= currentDate) {
          dbUpdates.is_paid = true;
        } else if (updates.status === undefined && updates.is_paid === undefined) {
          // If due date is in the future and status isn't explicitly set, mark as unpaid
          dbUpdates.is_paid = false;
        }
      }
      
      console.log('Updating bill type with:', updates.type);
      // Handle type
      if (updates.type !== undefined) {
        dbUpdates.type = updates.type;
      }
      
      // Handle status/is_paid
      if (updates.status !== undefined) {
        dbUpdates.is_paid = updates.status === 'paid';
      } else if (updates.is_paid !== undefined) {
        dbUpdates.is_paid = updates.is_paid;
      }
      
      // Handle paid by credit card
      if (updates.paid_by_credit_card !== undefined) {
        dbUpdates.paid_by_credit_card = updates.paid_by_credit_card;
      }
      
      console.log('Sending database updates:', dbUpdates);
      const result = await updateBill(id, dbUpdates);
      
      // If the update was successful and we changed the due date, trigger a budget recalculation
      if (updates.due_date !== undefined) {
        await fetchAndCalculateBudget(user);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating bill:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to update bill')
      };
    }
  }, [updateBill, fetchAndCalculateBudget]);

  const handleDeleteBill = useCallback(async (id: string) => {
    return deleteBill(id);
  }, [deleteBill]);

  // Effect to handle initial data loading when user logs in
  useEffect(() => {
    if (user?.id && budget && !isInitialized) {
      console.log('Initial budget calculation for user:', user.id);
      fetchAndCalculateBudget(user);
      setIsInitialized(true);
    } else if (!user?.id && isInitialized) {
      // Reset initialization state when user logs out
      setIsInitialized(false);
    }
  }, [user?.id, budget, isInitialized, fetchAndCalculateBudget]);

  // Effect to handle updates to bills or cards
  useEffect(() => {
    if (!user?.id || !budget || !isInitialized) {
      return;
    }

    console.log('Recalculating budget due to data changes');
    fetchAndCalculateBudget(user);
  }, [bills, cards, user, budget, isInitialized, fetchAndCalculateBudget]);

  const value = {
    budgetData,
    updateBudgetData: updateBudgetData,
    fetchAndCalculateBudget,
    addCreditCard: handleAddCreditCard,
    updateCreditCard: handleUpdateCreditCard,
    deleteCreditCard: handleDeleteCreditCard,
    initializeCreditCards,
    addBill: handleAddBill,
    updateBill: handleUpdateBill,
    deleteBill: handleDeleteBill,
    loading,
    error: error || budgetError || cardsError || billsError,
    bills: budgetData.mandatoryBills.concat(budgetData.optionalBills)
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
}