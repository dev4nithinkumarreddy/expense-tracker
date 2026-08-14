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
      expenses: {
        Row: {
          id: string
          user_id: string
          amount: number
          description: string
          category: string
          date: string
          notes: string | null
          receipt_url: string | null
          recurrence: string
          next_occurrence: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          description: string
          category: string
          date: string
          notes?: string | null
          receipt_url?: string | null
          recurrence?: string
          next_occurrence?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          description?: string
          category?: string
          date?: string
          notes?: string | null
          receipt_url?: string | null
          recurrence?: string
          next_occurrence?: string | null
        }
      }
      bills: {
        Row: {
          id: string
          user_id: string
          title: string
          amount: number
          auto_deduct: boolean
          category: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          amount: number
          auto_deduct: boolean
          category: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          amount?: number
          auto_deduct?: boolean
          category?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          monthly_limit: number
          month: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          monthly_limit: number
          month: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          monthly_limit?: number
          month?: string
          created_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          monthly_income: number
          currency: string
          dark_mode: boolean
          categories: string[]
          carry_forward: boolean
          category_budgets: Json
          quick_adds: Json
          updated_at: string
        }
        Insert: {
          user_id: string
          monthly_income?: number
          currency?: string
          dark_mode?: boolean
          categories?: string[]
          carry_forward?: boolean
          category_budgets?: Json
          quick_adds?: Json
          updated_at?: string
        }
        Update: {
          user_id?: string
          monthly_income?: number
          currency?: string
          dark_mode?: boolean
          categories?: string[]
          carry_forward?: boolean
          category_budgets?: Json
          quick_adds?: Json
          updated_at?: string
        }
      }
    }
  }
}
