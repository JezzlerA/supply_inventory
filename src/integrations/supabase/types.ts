export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assigned_items: {
        Row: {
          condition_status: string
          created_at: string
          current_location: string | null
          date_assigned: string
          id: string
          inventory_item_id: string | null
          item_name: string
          notes: string | null
          possession_status: string
          serial_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          condition_status?: string
          created_at?: string
          current_location?: string | null
          date_assigned?: string
          id?: string
          inventory_item_id?: string | null
          item_name: string
          notes?: string | null
          possession_status?: string
          serial_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          condition_status?: string
          created_at?: string
          current_location?: string | null
          date_assigned?: string
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          notes?: string | null
          possession_status?: string
          serial_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assigned_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_admin_message: boolean
          is_broadcast: boolean
          message: string
          read: boolean
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_message?: boolean
          is_broadcast?: boolean
          message: string
          read?: boolean
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_message?: boolean
          is_broadcast?: boolean
          message?: string
          read?: boolean
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      damaged_returns: {
        Row: {
          created_at: string
          date_returned: string
          id: string
          item_code: string | null
          item_name: string
          notes: string | null
          photo_url: string | null
          quantity: number
          reason: string
          reported_by: string | null
          returning_office: string
          status: string
        }
        Insert: {
          created_at?: string
          date_returned?: string
          id?: string
          item_code?: string | null
          item_name: string
          notes?: string | null
          photo_url?: string | null
          quantity: number
          reason?: string
          reported_by?: string | null
          returning_office: string
          status?: string
        }
        Update: {
          created_at?: string
          date_returned?: string
          id?: string
          item_code?: string | null
          item_name?: string
          notes?: string | null
          photo_url?: string | null
          quantity?: number
          reason?: string
          reported_by?: string | null
          returning_office?: string
          status?: string
        }
        Relationships: []
      }
      distributions: {
        Row: {
          created_at: string
          date_issued: string
          id: string
          inventory_item_id: string | null
          issued_by: string | null
          item_name: string
          quantity: number
          receiving_office: string
          remarks: string | null
          request_id: string | null
          supply_officer: string
        }
        Insert: {
          created_at?: string
          date_issued?: string
          id?: string
          inventory_item_id?: string | null
          issued_by?: string | null
          item_name: string
          quantity: number
          receiving_office: string
          remarks?: string | null
          request_id?: string | null
          supply_officer?: string
        }
        Update: {
          created_at?: string
          date_issued?: string
          id?: string
          inventory_item_id?: string | null
          issued_by?: string | null
          item_name?: string
          quantity?: number
          receiving_office?: string
          remarks?: string | null
          request_id?: string | null
          supply_officer?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "supply_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_history: {
        Row: {
          action: string
          created_at: string
          id: string
          inventory_item_id: string | null
          new_quantity: number | null
          notes: string | null
          performed_by: string | null
          previous_quantity: number | null
          quantity_change: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          new_quantity?: number | null
          notes?: string | null
          performed_by?: string | null
          previous_quantity?: number | null
          quantity_change?: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          new_quantity?: number | null
          notes?: string | null
          performed_by?: string | null
          previous_quantity?: number | null
          quantity_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_history_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category_id: string | null
          condition: string
          created_at: string
          description: string | null
          id: string
          item_name: string
          serial_number: string | null
          size: string | null
          status: string
          stock_quantity: number
          unit_cost: number
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          serial_number?: string | null
          size?: string | null
          status?: string
          stock_quantity?: number
          unit_cost?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          serial_number?: string | null
          size?: string | null
          status?: string
          stock_quantity?: number
          unit_cost?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      item_status_history: {
        Row: {
          assigned_item_id: string
          created_at: string
          id: string
          new_condition_status: string | null
          new_possession_status: string | null
          notes: string | null
          previous_condition_status: string | null
          previous_possession_status: string | null
          updated_by: string | null
        }
        Insert: {
          assigned_item_id: string
          created_at?: string
          id?: string
          new_condition_status?: string | null
          new_possession_status?: string | null
          notes?: string | null
          previous_condition_status?: string | null
          previous_possession_status?: string | null
          updated_by?: string | null
        }
        Update: {
          assigned_item_id?: string
          created_at?: string
          id?: string
          new_condition_status?: string | null
          new_possession_status?: string | null
          notes?: string | null
          previous_condition_status?: string | null
          previous_possession_status?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_status_history_assigned_item_id_fkey"
            columns: ["assigned_item_id"]
            isOneToOne: false
            referencedRelation: "assigned_items"
            referencedColumns: ["id"]
          },
        ]
      }
      office_logs: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_office: string | null
          old_office: string | null
          user_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_office?: string | null
          old_office?: string | null
          user_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_office?: string | null
          old_office?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "office_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      offices: {
        Row: {
          created_at: string
          id: string
          office_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          office_name: string
        }
        Update: {
          created_at?: string
          id?: string
          office_name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          contact_number: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          office_location: string | null
          status: string
        }
        Insert: {
          avatar_url?: string | null
          contact_number?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          office_location?: string | null
          status?: string
        }
        Update: {
          avatar_url?: string | null
          contact_number?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          office_location?: string | null
          status?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          approved_by: string | null
          approved_by_name: string | null
          category: string | null
          created_at: string
          date_approved: string
          department: string
          id: string
          item_name: string
          quantity: number
          receipt_number: string
          request_id: string | null
          status: string
          total_value: number
          transaction_id: string | null
          unit_value: number
          user_id: string
          user_name: string
        }
        Insert: {
          approved_by?: string | null
          approved_by_name?: string | null
          category?: string | null
          created_at?: string
          date_approved?: string
          department?: string
          id?: string
          item_name: string
          quantity?: number
          receipt_number: string
          request_id?: string | null
          status?: string
          total_value?: number
          transaction_id?: string | null
          unit_value?: number
          user_id: string
          user_name?: string
        }
        Update: {
          approved_by?: string | null
          approved_by_name?: string | null
          category?: string | null
          created_at?: string
          date_approved?: string
          department?: string
          id?: string
          item_name?: string
          quantity?: number
          receipt_number?: string
          request_id?: string | null
          status?: string
          total_value?: number
          transaction_id?: string | null
          unit_value?: number
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "supply_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "user_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_records: {
        Row: {
          category_id: string | null
          created_at: string
          date_received: string
          description: string | null
          id: string
          inventory_item_id: string | null
          item_name: string
          quantity: number
          received_by: string | null
          reference_number: string | null
          size: string | null
          supplier: string
          unit_cost: number
          unit_of_measure: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          date_received?: string
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          item_name: string
          quantity: number
          received_by?: string | null
          reference_number?: string | null
          size?: string | null
          supplier: string
          unit_cost?: number
          unit_of_measure: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          date_received?: string
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          quantity?: number
          received_by?: string | null
          reference_number?: string | null
          size?: string | null
          supplier?: string
          unit_cost?: number
          unit_of_measure?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_records_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_records_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_requests: {
        Row: {
          created_at: string
          date_requested: string
          id: string
          item_name: string
          notes: string | null
          quantity: number
          requested_by: string
          requesting_office: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_requested?: string
          id?: string
          item_name: string
          notes?: string | null
          quantity: number
          requested_by: string
          requesting_office: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_requested?: string
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          requested_by?: string
          requesting_office?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_transactions: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          item_name: string
          notes: string | null
          quantity: number
          related_id: string | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          item_name: string
          notes?: string | null
          quantity: number
          related_id?: string | null
          status?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          notes?: string | null
          quantity?: number
          related_id?: string | null
          status?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
