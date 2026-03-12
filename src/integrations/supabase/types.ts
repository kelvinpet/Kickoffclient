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
      ai_reports: {
        Row: {
          created_at: string
          id: string
          kickoff_email: string | null
          milestones: Json | null
          missing_info: Json | null
          risks: Json | null
          scope_doc: string | null
          submission_id: string
          summary: string | null
          timeline: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kickoff_email?: string | null
          milestones?: Json | null
          missing_info?: Json | null
          risks?: Json | null
          scope_doc?: string | null
          submission_id: string
          summary?: string | null
          timeline?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kickoff_email?: string | null
          milestones?: Json | null
          missing_info?: Json | null
          risks?: Json | null
          scope_doc?: string | null
          submission_id?: string
          summary?: string | null
          timeline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          id: string
          ip_address: string | null
          signature_data: string
          signed_at: string
          signer_email: string
          signer_name: string
          submission_id: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          signature_data: string
          signed_at?: string
          signer_email: string
          signer_name: string
          submission_id: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          signature_data?: string
          signed_at?: string
          signer_email?: string
          signer_name?: string
          submission_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          notify_change_request: boolean
          notify_client_approval: boolean
          notify_deposit_paid: boolean
          notify_new_submission: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_change_request?: boolean
          notify_client_approval?: boolean
          notify_deposit_paid?: boolean
          notify_new_submission?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_change_request?: boolean
          notify_client_approval?: boolean
          notify_deposit_paid?: boolean
          notify_new_submission?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          name?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      proposal_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          is_change_order: boolean
          submission_id: string
          version_number: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_change_order?: boolean
          submission_id: string
          version_number?: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_change_order?: boolean
          submission_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          client_email: string
          client_name: string
          id: string
          reminder_type: string
          sent_at: string
          submission_id: string
          workspace_id: string
        }
        Insert: {
          client_email: string
          client_name: string
          id?: string
          reminder_type?: string
          sent_at?: string
          submission_id: string
          workspace_id: string
        }
        Update: {
          client_email?: string
          client_name?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          submission_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          answers: Json
          approved_at: string | null
          approved_version_id: string | null
          client_change_request: string | null
          client_email: string
          client_name: string
          contract_content: string | null
          created_at: string
          files: Json | null
          followup_answers: Json | null
          id: string
          portal_token: string | null
          section_feedback: Json | null
          status: string
          status_comment: string | null
          template_id: string
        }
        Insert: {
          answers?: Json
          approved_at?: string | null
          approved_version_id?: string | null
          client_change_request?: string | null
          client_email: string
          client_name: string
          contract_content?: string | null
          created_at?: string
          files?: Json | null
          followup_answers?: Json | null
          id?: string
          portal_token?: string | null
          section_feedback?: Json | null
          status?: string
          status_comment?: string | null
          template_id: string
        }
        Update: {
          answers?: Json
          approved_at?: string | null
          approved_version_id?: string | null
          client_change_request?: string | null
          client_email?: string
          client_name?: string
          contract_content?: string | null
          created_at?: string
          files?: Json | null
          followup_answers?: Json | null
          id?: string
          portal_token?: string | null
          section_feedback?: Json | null
          status?: string
          status_comment?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          next_payment_date: string | null
          plan: string
          provider: string
          status: string
          updated_at: string
          workspace_id: string
          user_id: string | null
          expires_at: string | null
          tx_ref: string | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          next_payment_date?: string | null
          plan?: string
          provider?: string
          status?: string
          updated_at?: string
          workspace_id: string
          user_id?: string | null
          expires_at?: string | null
          tx_ref?: string | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          next_payment_date?: string | null
          plan?: string
          provider?: string
          status?: string
          updated_at?: string
          workspace_id?: string
          user_id?: string | null
          expires_at?: string | null
          tx_ref?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_fields: {
        Row: {
          field_type: string
          id: string
          label: string
          options: Json | null
          position: number
          required: boolean
          template_id: string
        }
        Insert: {
          field_type?: string
          id?: string
          label: string
          options?: Json | null
          position?: number
          required?: boolean
          template_id: string
        }
        Update: {
          field_type?: string
          id?: string
          label?: string
          options?: Json | null
          position?: number
          required?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          public_id: string
          status: string
          title: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          public_id?: string
          status?: string
          title?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          public_id?: string
          status?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_secrets: {
        Row: {
          created_at: string
          id: string
          key_name: string
          key_value: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_name: string
          key_value: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_name?: string
          key_value?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_secrets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          brand_color: string | null
          business_name: string
          created_at: string
          id: string
          logo_url: string | null
          monthly_submission_limit: number
          owner_user_id: string
          paystack_plan_code: string | null
          plan: string
        }
        Insert: {
          brand_color?: string | null
          business_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          monthly_submission_limit?: number
          owner_user_id: string
          paystack_plan_code?: string | null
          plan?: string
        }
        Update: {
          brand_color?: string | null
          business_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          monthly_submission_limit?: number
          owner_user_id?: string
          paystack_plan_code?: string | null
          plan?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_submission_by_portal_token: {
        Args: { p_token: string }
        Returns: Json
      }
      save_portal_feedback: {
        Args: {
          p_followup_answers?: Json
          p_section_feedback?: Json
          p_token: string
        }
        Returns: boolean
      }
      update_submission_status: {
        Args: { p_comment?: string; p_status: string; p_token: string }
        Returns: boolean
      }
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
