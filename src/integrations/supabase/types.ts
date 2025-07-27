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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_credits: {
        Row: {
          created_at: string
          current_credits: number
          id: string
          last_credit_reset: string
          total_credits_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_credits?: number
          id?: string
          last_credit_reset?: string
          total_credits_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_credits?: number
          id?: string
          last_credit_reset?: string
          total_credits_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cloud_n8n_instances: {
        Row: {
          basic_auth_password: string
          basic_auth_user: string
          created_at: string
          deployment_status: string
          id: string
          instance_name: string
          render_service_id: string | null
          render_service_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          basic_auth_password: string
          basic_auth_user: string
          created_at?: string
          deployment_status?: string
          id?: string
          instance_name: string
          render_service_id?: string | null
          render_service_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          basic_auth_password?: string
          basic_auth_user?: string
          created_at?: string
          deployment_status?: string
          id?: string
          instance_name?: string
          render_service_id?: string | null
          render_service_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cloud_runner_projects: {
        Row: {
          created_at: string
          deployment_status: string
          github_repo_name: string | null
          github_repo_url: string | null
          id: string
          project_name: string
          render_service_id: string | null
          render_service_url: string | null
          session_file_uploaded: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deployment_status?: string
          github_repo_name?: string | null
          github_repo_url?: string | null
          id?: string
          project_name: string
          render_service_id?: string | null
          render_service_url?: string | null
          session_file_uploaded?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deployment_status?: string
          github_repo_name?: string | null
          github_repo_url?: string | null
          id?: string
          project_name?: string
          render_service_id?: string | null
          render_service_url?: string | null
          session_file_uploaded?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credential_storage: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          node_id: string
          node_type: string
          updated_at: string
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          credentials: Json
          id?: string
          node_id: string
          node_type: string
          updated_at?: string
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          node_id?: string
          node_type?: string
          updated_at?: string
          user_id?: string
          workflow_id?: string | null
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
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          id: string
          plan_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_data: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          workflow_id: string
          workflow_json: Json
          workflow_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          workflow_id: string
          workflow_json: Json
          workflow_name: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          workflow_id?: string
          workflow_json?: Json
          workflow_name?: string
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
    Enums: {},
  },
} as const
