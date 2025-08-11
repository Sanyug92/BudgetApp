import { Database } from '@/types/database.types';

export type DatabaseBill = Database['public']['Tables']['bills']['Row'];

export type Bill = Omit<DatabaseBill, 'is_mandatory'> & {
  status: 'paid' | 'unpaid' | 'overdue';
  type: 'mandatory' | 'optional';
  paid_by_credit_card?: boolean;
  due_date?: number;
}
export type BillUpdate = Partial<Omit<Bill, 'id' | 'user_id' | 'created_at'>> & {
  // Database fields
  due_date?: number;
  is_paid?: boolean;
  paid_by_credit_card?: boolean;
  
  // UI fields
  dueDate?: number;
  isPaid?: boolean;
  paidByCreditCard?: boolean;
  
  // Common fields
  updated_at?: string;
  status?: 'paid' | 'unpaid' | 'overdue';
  type?: 'mandatory' | 'optional';
  name?: string;
  amount?: number;
};
