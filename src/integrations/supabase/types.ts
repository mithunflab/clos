export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_credits: {
        Row: {
          created_at: string
          current_credits: number
          id: string
          last_credit_reset: string | null
          total_credits_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_credits?: number
          id?: string
          last_credit_reset?: string | null
          total_credits_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_credits?: number
          id?: string
          last_credit_reset?: string | null
          total_credits_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      n8n_configs: {
        Row: {
          created_at: string
          id: string
          n8n_api_key: string | null
          n8n_url: string | null
          updated_at: string
          use_casel_cloud: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          n8n_api_key?: string | null
          n8n_url?: string | null
          updated_at?: string
          use_casel_cloud?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          n8n_api_key?: string | null
          n8n_url?: string | null
          updated_at?: string
          use_casel_cloud?: boolean
          user_id?: string
        }
        Relationships: []
      }
      n8n_deployments: {
        Row: {
          created_at: string
          deployment_status: string
          deployment_url: string | null
          error_message: string | null
          id: string
          n8n_workflow_id: string | null
          updated_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          deployment_status?: string
          deployment_url?: string | null
          error_message?: string | null
          id?: string
          n8n_workflow_id?: string | null
          updated_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          deployment_status?: string
          deployment_url?: string | null
          error_message?: string | null
          id?: string
          n8n_workflow_id?: string | null
          updated_at?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          id: string
          promo_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          credits_to_add: number
          current_uses: number
          expires_at: string | null
          id: string
          max_uses: number | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          credits_to_add?: number
          current_uses?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          credits_to_add?: number
          current_uses?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_data: {
        Row: {
          chat_storage_path: string | null
          created_at: string
          deployment_status: string | null
          description: string | null
          id: string
          metadata: Json | null
          n8n_url: string | null
          n8n_workflow_id: string | null
          storage_bucket_id: string | null
          updated_at: string
          user_id: string
          workflow_id: string
          workflow_name: string
          workflow_storage_path: string | null
        }
        Insert: {
          chat_storage_path?: string | null
          created_at?: string
          deployment_status?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          n8n_url?: string | null
          n8n_workflow_id?: string | null
          storage_bucket_id?: string | null
          updated_at?: string
          user_id: string
          workflow_id: string
          workflow_name: string
          workflow_storage_path?: string | null
        }
        Update: {
          chat_storage_path?: string | null
          created_at?: string
          deployment_status?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          n8n_url?: string | null
          n8n_workflow_id?: string | null
          storage_bucket_id?: string | null
          updated_at?: string
          user_id?: string
          workflow_id?: string
          workflow_name?: string
          workflow_storage_path?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_promo_code: {
        Args: { p_user_id: string; p_promo_code: string }
        Returns: Json
      }
      create_user_bucket: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_workflow_limit: {
        Args: { user_id_param: string }
        Returns: number
      }
      reset_daily_credits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      plan_type: "free" | "pro" | "custom"
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
      plan_type: ["free", "pro", "custom"],
    },
  },
} as const
