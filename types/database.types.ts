export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      credit_cards: {
        Row: {
          id: string
          user_id: string
          name: string
          limit: number
          available: number
          balance: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          limit: number
          available: number
          balance: number
            last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          limit?: number
          available?: number
          balance?: number
          last_updated?: string
          created_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          monthly_income: number
          savings_goal: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          monthly_income: number
          savings_goal: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          monthly_income?: number
          savings_goal?: number
          created_at?: string
          updated_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          due_date: number
          is_mandatory: boolean
          is_paid: boolean
          created_at: string
          updated_at: string
          paid_by_credit_card: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          due_date: number
          is_mandatory: boolean
          is_paid?: boolean
          created_at?: string
          updated_at?: string
          paid_by_credit_card?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          due_date?: number
          is_mandatory?: boolean
          is_paid?: boolean
          created_at?: string
          updated_at?: string
          paid_by_credit_card?: boolean
        }
      },
      profiles: {
        Row: {
          id: string;
          username?: string;
          avatar_url?: string;
          updated_at?: string;
        };
        Insert: {
          id: string;
          username?: string;
          avatar_url?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          avatar_url?: string;
          updated_at?: string;
        };
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
