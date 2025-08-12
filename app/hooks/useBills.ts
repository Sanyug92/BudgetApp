import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Use relative path or configure module-resolver
import type { Bill, BillUpdate } from '@/types/bill.types';
import { remove } from '@/utils/storage';

export const useBills = (userId?: string) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const transformBill = (bill: any): Bill => ({
    ...bill,
    status: bill.status as 'paid' | 'unpaid' | 'unpaid',
    type: bill.is_mandatory ? 'mandatory' : 'optional',
    paid_by_credit_card: bill.paid_by_credit_card || false,
    due_date: bill.due_date || new Date().getTime(),
    created_at: bill.created_at || new Date().toISOString(),
    updated_at: bill.updated_at || new Date().toISOString()
  });

  const fetchBills = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Transform the data to match the Bill type
      const transformedBills = (data || []).map(transformBill);
      setBills(transformedBills);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addBill = useCallback(
    async (
      bill: Omit<
        Bill,
        'id' | 'created_at' | 'updated_at' | 'user_id' | 'status' | 'is_mandatory'
      >
    ) => {
      if (!userId) throw new Error('User not authenticated');
      const { type, ...billWithoutType } = bill;
      const updateBillData = {
        ...billWithoutType,
        user_id: userId,
        is_mandatory: type === 'mandatory',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      try {
        const { data, error } = await supabase
          .from('bills')
          .insert([
            {
              ...updateBillData,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // Transform the returned data to match the Bill type
        const transformedBill = transformBill(data);
        setBills(prev => [transformedBill, ...prev]);
        return { data: transformedBill, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    [userId]
  );

  const updateBill = useCallback(
    async (id: string, updates: Partial<BillUpdate>) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        // Handle both camelCase and snake_case fields
        if ('isPaid' in updates) {
          updateData.is_paid = updates.isPaid;
        } else if ('is_paid' in updates) {
          updateData.is_paid = updates.is_paid;
        }

        if ('status' in updates) {
          updateData.status = updates.status;
        }

        if ('dueDate' in updates) {
          updateData.due_date = updates.dueDate;
        } else if ('due_date' in updates) {
          updateData.due_date = updates.due_date;
        }

        if ('paidByCreditCard' in updates) {
          updateData.paid_by_credit_card = updates.paidByCreditCard;
        } else if ('paid_by_credit_card' in updates) {
          updateData.paid_by_credit_card = updates.paid_by_credit_card;
        }

        if ('name' in updates) updateData.name = updates.name;
        if ('amount' in updates) updateData.amount = updates.amount;

        if ('type' in updates) {
          updateData.is_mandatory = updates.type === 'mandatory';
        }
console.log("updateData type shit", updateData)
        if ('category' in updates) updateData.category = updates.category;

        const { data, error } = await supabase
          .from('bills')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        // Transform the updated bill
        const updatedBill = transformBill(data);
        setBills(prev => prev.map(bill => bill.id === id ? updatedBill : bill));
        return { data: updatedBill, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    [userId]
  );

  const deleteBill = useCallback(
    async (id: string) => {
      if (!userId) {
        const error = new Error('User not authenticated');
        setError(error);
        return { error };
      }

      try {
        const { error } = await supabase
          .from('bills')
          .delete()
          .match({ id, user_id: userId });

        if (error) throw error;

        setBills(prev => prev.filter(bill => bill.id !== id));
        return { error: null };
      } catch (err) {
        const error = err as Error;
        setError(error);
        return { error };
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return {
    bills,
    loading,
    error,
    addBill,
    updateBill,
    deleteBill,
    refreshBills: fetchBills,
  };
};
