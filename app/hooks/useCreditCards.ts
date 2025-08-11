import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type CreditCard = Database['public']['Tables']['credit_cards']['Row'];

export const useCreditCards = (userId: string | undefined) => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCreditCards = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching credit cards:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addCreditCard = useCallback(
    async (card: { name: string; limit: number; available: number }) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const { data, error } = await supabase
          .from('credit_cards')
          .insert([
            {
              name: card.name,
              limit: card.limit,
              available: card.available,
              balance: card.limit - card.available,
              user_id: userId,
              created_at: new Date().toISOString(),
              last_updated: new Date().toISOString(),
            },
          ])
          .select();

        if (error) throw error;
        if (data) {
          setCards((prev) => [data[0], ...prev]);
        }
        return { data, error: null };
      } catch (err) {
        console.error('Error adding credit card:', err);
        return { data: null, error: err as Error };
      }
    },
    [userId]
  );

  const updateCreditCard = useCallback(
    async (
      id: string,
      updates: Omit<
        Partial<CreditCard>,
        'balance' | 'user_id' | 'id' | 'created_at' | 'last_updated'
      >,
      userIdParam?: string
    ) => {
      const uid = userIdParam || userId;
      if (!uid) throw new Error('User ID is required to update a credit card');

      try {
        const cardData = {
          id,
          ...updates,
          user_id: uid,
          last_updated: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('credit_cards')
          .upsert(cardData, { onConflict: 'id' })
          .select()
          .single();

        if (error) throw error;

        setCards((prevCards) => {
          const updatedCards = prevCards.map((card) =>
            card.id === id ? { ...card, ...data } : card
          );

          if (!prevCards.some((card) => card.id === id)) {
            updatedCards.unshift(data);
          }

          return updatedCards;
        });

        return { data, error: null };
      } catch (err) {
        console.error('Error upserting credit card:', err);
        return { data: null, error: err as Error };
      }
    },
    [userId]
  );

  const deleteCreditCard = useCallback(
    async (id: string, userIdParam?: string) => {
      const uid = userIdParam || userId;
      if (!uid) {
        const error = new Error('User not authenticated');
        console.error(error);
        return { error };
      }

      try {
        const { error } = await supabase
          .from('credit_cards')
          .delete()
          .match({ id, user_id: uid });

        if (error) throw error;

        setCards((prev) => prev.filter((card) => card.id !== id));
        return { error: null };
      } catch (err) {
        const error = err as Error;
        setError(error);
        console.error('Error deleting credit card:', error);
        return { error };
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchCreditCards();
  }, [fetchCreditCards]);

  return {
    cards,
    loading,
    error,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    refresh: fetchCreditCards,
  };
};
