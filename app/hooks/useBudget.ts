import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type Budget = Database['public']['Tables']['budgets']['Row'];

export const useBudget = (userId: string | undefined) => {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBudget = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setBudget(data || null);
    } catch (err) {
      setError(err as Error);
      setBudget(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateBudget = useCallback(
    async (updates: Partial<Budget>) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const { data, error } = await supabase
          .from('budgets')
          .upsert({
            ...updates,
            user_id: userId,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        setBudget(data || null);

        return { data, error: null };
      } catch (error) {
        console.error('Error updating budget:', error);
        return { data: null, error: error as Error };
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  return {
    budget,
    loading,
    error,
    updateBudget,
    refresh: fetchBudget,
  };
};
