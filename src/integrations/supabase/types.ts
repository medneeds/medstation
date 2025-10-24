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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cases: {
        Row: {
          chief_complaint: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chief_complaint?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chief_complaint?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      evidences: {
        Row: {
          author: string | null
          case_id: string | null
          confidence_score: number | null
          content: string | null
          created_at: string
          document_date: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          origin: string | null
          source_type: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string | null
          case_id?: string | null
          confidence_score?: number | null
          content?: string | null
          created_at?: string
          document_date?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          origin?: string | null
          source_type?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string | null
          case_id?: string | null
          confidence_score?: number | null
          content?: string | null
          created_at?: string
          document_date?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          origin?: string | null
          source_type?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidences_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          archived: boolean | null
          cpf: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          crm: string | null
          full_name: string | null
          id: string
          specialty: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crm?: string | null
          full_name?: string | null
          id: string
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crm?: string | null
          full_name?: string | null
          id?: string
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_cases: {
        Args: { search_query: string; user_uuid: string }
        Returns: {
          chief_complaint: string
          created_at: string
          id: string
          notes: string
          patient_name: string
          rank: number
          status: string
          tags: string[]
          title: string
          updated_at: string
        }[]
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
