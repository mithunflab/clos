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
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: []
      }
      n8n_deployments: {
        Row: {
          created_at: string
          deployment_status: string
          deployment_url: string | null
          id: string
          n8n_workflow_id: string
          updated_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          deployment_status?: string
          deployment_url?: string | null
          id?: string
          n8n_workflow_id: string
          updated_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          deployment_status?: string
          deployment_url?: string | null
          id?: string
          n8n_workflow_id?: string
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
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_n8n_config: {
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
      user_plans: {
        Row: {
          created_at: string
          credits: number
          custom_features: Json | null
          expires_at: string | null
          id: string
          max_credits: number
          max_workflows: number | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          custom_features?: Json | null
          expires_at?: string | null
          id?: string
          max_credits?: number
          max_workflows?: number | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          custom_features?: Json | null
          expires_at?: string | null
          id?: string
          max_credits?: number
          max_workflows?: number | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          notifications_enabled: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_workflows: {
        Row: {
          created_at: string
          deployment_status: string | null
          deployment_url: string | null
          error_message: string | null
          github_repo_id: string | null
          github_repo_name: string
          github_repo_url: string
          id: string
          last_updated: string
          n8n_workflow_id: string | null
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          created_at?: string
          deployment_status?: string | null
          deployment_url?: string | null
          error_message?: string | null
          github_repo_id?: string | null
          github_repo_name: string
          github_repo_url: string
          id?: string
          last_updated?: string
          n8n_workflow_id?: string | null
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Update: {
          created_at?: string
          deployment_status?: string | null
          deployment_url?: string | null
          error_message?: string | null
          github_repo_id?: string | null
          github_repo_name?: string
          github_repo_url?: string
          id?: string
          last_updated?: string
          n8n_workflow_id?: string | null
          user_id?: string
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: []
      }
      workflow_data: {
        Row: {
          chat_storage_path: string | null
          compressed_chat_history: string | null
          compressed_workflow_json: string | null
          created_at: string
          deployment_status: string | null
          id: string
          metadata: Json | null
          n8n_url: string | null
          n8n_workflow_id: string | null
          updated_at: string
          user_id: string
          workflow_id: string
          workflow_name: string
          workflow_storage_path: string | null
        }
        Insert: {
          chat_storage_path?: string | null
          compressed_chat_history?: string | null
          compressed_workflow_json?: string | null
          created_at?: string
          deployment_status?: string | null
          id?: string
          metadata?: Json | null
          n8n_url?: string | null
          n8n_workflow_id?: string | null
          updated_at?: string
          user_id: string
          workflow_id: string
          workflow_name: string
          workflow_storage_path?: string | null
        }
        Update: {
          chat_storage_path?: string | null
          compressed_chat_history?: string | null
          compressed_workflow_json?: string | null
          created_at?: string
          deployment_status?: string | null
          id?: string
          metadata?: Json | null
          n8n_url?: string | null
          n8n_workflow_id?: string | null
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
      check_workflow_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      cleanup_old_workflows: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_user_bucket: {
        Args: { user_id_param: string }
        Returns: string
      }
      deduct_credit: {
        Args: {
          p_user_id: string
          p_workflow_id?: string
          p_description?: string
        }
        Returns: boolean
      }
      get_user_bucket: {
        Args: { user_id_param: string }
        Returns: string
      }
      replenish_daily_credits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      upsert_workflow: {
        Args: {
          p_workflow_id: string
          p_workflow_name: string
          p_user_id: string
          p_github_repo_name: string
          p_github_repo_url: string
          p_github_repo_id?: string
        }
        Returns: {
          id: string
          workflow_id: string
          workflow_name: string
          github_repo_name: string
          github_repo_url: string
        }[]
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
