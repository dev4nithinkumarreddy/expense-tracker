export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          recurring_source_id: string | null
          created_at?: string
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
          recurring_source_id?: string | null
          created_at?: string
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
          recurring_source_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          id: string
          user_id: string
          title: string
          amount: number
          auto_deduct: boolean
          category: string
          due_day: number | null
          due_date: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          amount: number
          auto_deduct?: boolean
          category: string
          due_day?: number | null
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          amount?: number
          auto_deduct?: boolean
          category?: string
          due_day?: number | null
          due_date?: string | null
          created_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          monthly_limit: number
          month: string
          created_at?: string
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
        Relationships: []
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
          privacy_mode: boolean
          theme: string
          category_emojis: Json
          notifications_enabled: boolean
          user_name: string | null
          updated_at?: string
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
          privacy_mode?: boolean
          theme?: string
          category_emojis?: Json
          notifications_enabled?: boolean
          user_name?: string | null
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
          privacy_mode?: boolean
          theme?: string
          category_emojis?: Json
          notifications_enabled?: boolean
          user_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          billing_cycle: string
          next_billing_date: string
          category: string
          created_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          billing_cycle: string
          next_billing_date: string
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          billing_cycle?: string
          next_billing_date?: string
          category?: string
          created_at?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          id: string
          user_id: string
          person_name: string
          amount: number
          type: string
          status: string
          date: string
          due_date: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          person_name: string
          amount: number
          type: string
          status?: string
          date?: string
          due_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          person_name?: string
          amount?: number
          type?: string
          status?: string
          date?: string
          due_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          id: string
          user_id: string
          item_name: string
          estimated_amount: number | null
          category: string | null
          is_purchased: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_name: string
          estimated_amount?: number | null
          category?: string | null
          is_purchased?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_name?: string
          estimated_amount?: number | null
          category?: string | null
          is_purchased?: boolean
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          keys_p256dh?: string | null
          keys_auth?: string | null
          p256dh?: string | null
          auth?: string | null
          user_agent: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          keys_p256dh?: string | null
          keys_auth?: string | null
          p256dh?: string | null
          auth?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          keys_p256dh?: string | null
          keys_auth?: string | null
          p256dh?: string | null
          auth?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          user_id: string | null
          email: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      automated_rules: {
        Row: {
          id: string
          rule_type: string
          name: string
          title: string
          body: string
          target_url: string
          is_enabled: boolean
          trigger_time: string
          last_triggered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rule_type: string
          name: string
          title: string
          body: string
          target_url?: string
          is_enabled?: boolean
          trigger_time?: string
          last_triggered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rule_type?: string
          name?: string
          title?: string
          body?: string
          target_url?: string
          is_enabled?: boolean
          trigger_time?: string
          last_triggered_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          id: string
          created_at: string
          scheduled_at: string
          title: string
          body: string
          target_url: string | null
          target_audience: string | null
          status: string | null
          sent_at: string | null
          recipient_count: number | null
          created_by: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          scheduled_at: string
          title: string
          body: string
          target_url?: string | null
          target_audience?: string | null
          status?: string | null
          sent_at?: string | null
          recipient_count?: number | null
          created_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          scheduled_at?: string
          title?: string
          body?: string
          target_url?: string | null
          target_audience?: string | null
          status?: string | null
          sent_at?: string | null
          recipient_count?: number | null
          created_by?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          created_at: string
          title: string
          body: string
          target_audience: string
          target_url: string
          total_recipients: number
          successful_deliveries: number
          failed_deliveries: number
          opened_count: number | null
          triggered_by: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          body: string
          target_audience?: string
          target_url?: string
          total_recipients?: number
          successful_deliveries?: number
          failed_deliveries?: number
          opened_count?: number | null
          triggered_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          body?: string
          target_audience?: string
          target_url?: string
          total_recipients?: number
          successful_deliveries?: number
          failed_deliveries?: number
          opened_count?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id?: string | null
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Insert: {
          id: string
          user_id?: string | null
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
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
