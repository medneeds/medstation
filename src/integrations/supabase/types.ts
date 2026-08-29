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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notification_prefs: {
        Row: {
          created_at: string
          milestone: boolean
          new_user: boolean
          sale: boolean
          support_ticket: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          milestone?: boolean
          new_user?: boolean
          sale?: boolean
          support_ticket?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          milestone?: boolean
          new_user?: boolean
          sale?: boolean
          support_ticket?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          metadata: Json
          reference_id: string | null
          severity: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json
          reference_id?: string | null
          severity?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json
          reference_id?: string | null
          severity?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          assistant: string | null
          cost_usd: number | null
          created_at: string
          function_name: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          metadata: Json | null
          model: string | null
          output_tokens: number | null
          status: string | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          assistant?: string | null
          cost_usd?: number | null
          created_at?: string
          function_name: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          status?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          assistant?: string | null
          cost_usd?: number | null
          created_at?: string
          function_name?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          status?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          starts_at: string
          target: string
          target_value: string | null
          title: string
          updated_at: string
          variant: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string
          target?: string
          target_value?: string | null
          title: string
          updated_at?: string
          variant?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string
          target?: string
          target_value?: string | null
          title?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      case_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          chief_complaint: string | null
          consultation_date: string
          created_at: string
          folder_id: string | null
          id: string
          notes: string | null
          patient_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chief_complaint?: string | null
          consultation_date?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chief_complaint?: string | null
          consultation_date?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "case_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_policy: {
        Row: {
          created_at: string
          current_monthly_price_cents: number
          current_yearly_price_cents: number
          effective_at: string
          future_monthly_price_cents: number | null
          future_yearly_price_cents: number | null
          id: string
          legacy_full_access_until: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_monthly_price_cents: number
          current_yearly_price_cents: number
          effective_at: string
          future_monthly_price_cents?: number | null
          future_yearly_price_cents?: number | null
          id: string
          legacy_full_access_until: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_monthly_price_cents?: number
          current_yearly_price_cents?: number
          effective_at?: string
          future_monthly_price_cents?: number | null
          future_yearly_price_cents?: number | null
          id?: string
          legacy_full_access_until?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_type: string
          case_id: string | null
          created_at: string
          id: string
          last_message: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_type: string
          case_id?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_type?: string
          case_id?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      courtesy_access: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string
          id: string
          reason: string | null
          referral_id: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by: string
          id?: string
          reason?: string | null
          referral_id?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string
          id?: string
          reason?: string | null
          referral_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
      exam_requests: {
        Row: {
          case_id: string | null
          cid_code: string | null
          clinical_indication: string | null
          completed_date: string | null
          created_at: string
          exams: Json
          id: string
          observations: string | null
          patient_id: string
          priority: string
          request_number: string
          requested_date: string
          results_url: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          cid_code?: string | null
          clinical_indication?: string | null
          completed_date?: string | null
          created_at?: string
          exams?: Json
          id?: string
          observations?: string | null
          patient_id: string
          priority?: string
          request_number: string
          requested_date?: string
          results_url?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          cid_code?: string | null
          clinical_indication?: string | null
          completed_date?: string | null
          created_at?: string
          exams?: Json
          id?: string
          observations?: string | null
          patient_id?: string
          priority?: string
          request_number?: string
          requested_date?: string
          results_url?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          disabled_users: string[]
          enabled_global: boolean
          enabled_users: string[]
          key: string
          rollout_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          disabled_users?: string[]
          enabled_global?: boolean
          enabled_users?: string[]
          key: string
          rollout_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          disabled_users?: string[]
          enabled_global?: boolean
          enabled_users?: string[]
          key?: string
          rollout_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          converted_user_id: string | null
          created_at: string
          crm: string | null
          crm_state: string | null
          email: string
          full_name: string
          id: string
          phone: string
          referrer: string | null
          source: string
          updated_at: string
          utm: Json
        }
        Insert: {
          converted_user_id?: string | null
          created_at?: string
          crm?: string | null
          crm_state?: string | null
          email: string
          full_name: string
          id?: string
          phone: string
          referrer?: string | null
          source?: string
          updated_at?: string
          utm?: Json
        }
        Update: {
          converted_user_id?: string | null
          created_at?: string
          crm?: string | null
          crm_state?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          referrer?: string | null
          source?: string
          updated_at?: string
          utm?: Json
        }
        Relationships: []
      }
      legacy_trial_invites: {
        Row: {
          claimed_at: string | null
          created_at: string
          dismissed_at: string | null
          email: string | null
          email_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          email?: string | null
          email_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          email?: string | null
          email_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_documents: {
        Row: {
          case_id: string | null
          cid_code: string | null
          content: string
          created_at: string
          diagnosis: string | null
          document_number: string
          document_type: string
          id: string
          observations: string | null
          patient_id: string
          pdf_url: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          validity_days: number | null
        }
        Insert: {
          case_id?: string | null
          cid_code?: string | null
          content: string
          created_at?: string
          diagnosis?: string | null
          document_number: string
          document_type: string
          id?: string
          observations?: string | null
          patient_id: string
          pdf_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          validity_days?: number | null
        }
        Update: {
          case_id?: string | null
          cid_code?: string | null
          content?: string
          created_at?: string
          diagnosis?: string | null
          document_number?: string
          document_type?: string
          id?: string
          observations?: string | null
          patient_id?: string
          pdf_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          transcription: string | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          transcription?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      note_versions: {
        Row: {
          content: string
          created_at: string
          id: string
          note_id: string
          title: string
          version_number: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          note_id: string
          title: string
          version_number: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          note_id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          folder: string | null
          id: string
          locked: boolean
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          folder?: string | null
          id?: string
          locked?: boolean
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          folder?: string | null
          id?: string
          locked?: boolean
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          country: string | null
          created_at: string
          device: string | null
          id: string
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
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
      prescription_library: {
        Row: {
          cid_code: string | null
          content: string
          created_at: string
          id: string
          indication: string | null
          is_favorite: boolean
          source: string | null
          source_assistant: string | null
          tags: string[] | null
          title: string
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          cid_code?: string | null
          content?: string
          created_at?: string
          id?: string
          indication?: string | null
          is_favorite?: boolean
          source?: string | null
          source_assistant?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          cid_code?: string | null
          content?: string
          created_at?: string
          id?: string
          indication?: string | null
          is_favorite?: boolean
          source?: string | null
          source_assistant?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          case_id: string | null
          cid_code: string | null
          created_at: string
          diagnosis: string | null
          id: string
          medications: Json
          observations: string | null
          patient_id: string
          pdf_url: string | null
          prescription_number: string
          signature_id: string | null
          signature_metadata: Json | null
          signed_pdf_url: string | null
          status: string
          updated_at: string
          user_id: string
          validity_days: number
        }
        Insert: {
          case_id?: string | null
          cid_code?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          medications?: Json
          observations?: string | null
          patient_id: string
          pdf_url?: string | null
          prescription_number: string
          signature_id?: string | null
          signature_metadata?: Json | null
          signed_pdf_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          validity_days?: number
        }
        Update: {
          case_id?: string | null
          cid_code?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          medications?: Json
          observations?: string | null
          patient_id?: string
          pdf_url?: string | null
          prescription_number?: string
          signature_id?: string | null
          signature_metadata?: Json | null
          signed_pdf_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          cpf: string | null
          created_at: string
          crm: string | null
          crm_state: string | null
          date_of_birth: string | null
          full_name: string | null
          gender: string | null
          graduation_year: number | null
          id: string
          phone: string | null
          postal_code: string | null
          rqe: string | null
          specialty: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          crm?: string | null
          crm_state?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_year?: number | null
          id: string
          phone?: string | null
          postal_code?: string | null
          rqe?: string | null
          specialty?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          crm?: string | null
          crm_state?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_year?: number | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          rqe?: string | null
          specialty?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          fingerprint: string | null
          function_name: string
          id: string
          request_count: number | null
          updated_at: string | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          fingerprint?: string | null
          function_name: string
          id?: string
          request_count?: number | null
          updated_at?: string | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          fingerprint?: string | null
          function_name?: string
          id?: string
          request_count?: number | null
          updated_at?: string | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_settings: {
        Row: {
          active: boolean
          block_existing_referrers: boolean
          created_at: string
          id: number
          lead_reward_enabled: boolean
          max_rewards_per_referrer: number
          referred_discount_percent: number
          referred_stripe_coupon: string
          referrer_reward_days: number
          require_crm: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          block_existing_referrers?: boolean
          created_at?: string
          id?: number
          lead_reward_enabled?: boolean
          max_rewards_per_referrer?: number
          referred_discount_percent?: number
          referred_stripe_coupon?: string
          referrer_reward_days?: number
          require_crm?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          block_existing_referrers?: boolean
          created_at?: string
          id?: number
          lead_reward_enabled?: boolean
          max_rewards_per_referrer?: number
          referred_discount_percent?: number
          referred_stripe_coupon?: string
          referrer_reward_days?: number
          require_crm?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          blocked_reason: string | null
          code: string
          created_at: string
          id: string
          ip_address: string | null
          referred_crm: string | null
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string
          reward_applied_at: string | null
          reward_credit_days: number | null
          reward_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          code: string
          created_at?: string
          id?: string
          ip_address?: string | null
          referred_crm?: string | null
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id: string
          reward_applied_at?: string | null
          reward_credit_days?: number | null
          reward_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          code?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          referred_crm?: string | null
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          reward_applied_at?: string | null
          reward_credit_days?: number | null
          reward_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          excerpt: string | null
          fingerprint: string | null
          function_name: string
          id: string
          ip_address: string | null
          metadata: Json
          pattern_matched: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string
          excerpt?: string | null
          fingerprint?: string | null
          function_name: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          pattern_matched?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          excerpt?: string | null
          fingerprint?: string | null
          function_name?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          pattern_matched?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          last_event_id: string | null
          last_payment_failed_at: string | null
          last_payment_succeeded_at: string | null
          past_due_since: string | null
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          last_event_id?: string | null
          last_payment_failed_at?: string | null
          last_payment_succeeded_at?: string | null
          past_due_since?: string | null
          price_id?: string | null
          product_id?: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          last_event_id?: string | null
          last_payment_failed_at?: string | null
          last_payment_succeeded_at?: string | null
          past_due_since?: string | null
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          last_error: string | null
          processed_at: string | null
          status: string
          stripe_event_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          last_error?: string | null
          processed_at?: string | null
          status: string
          stripe_event_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          last_error?: string | null
          processed_at?: string | null
          status?: string
          stripe_event_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          ai_context_snapshot: Json | null
          assigned_to: string | null
          category: string
          created_at: string
          first_response_at: string | null
          id: string
          last_message_at: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_context_snapshot?: Json | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_context_snapshot?: Json | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_access: {
        Row: {
          created_at: string
          trial_consumed_at: string
          trial_ends_at: string
          trial_source: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          trial_consumed_at: string
          trial_ends_at: string
          trial_source?: string
          trial_started_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          trial_consumed_at?: string
          trial_ends_at?: string
          trial_source?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          assistant: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          session_id: string | null
          user_id: string
        }
        Insert: {
          assistant?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          session_id?: string | null
          user_id: string
        }
        Update: {
          assistant?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          primary_goal: string | null
          primary_path: string | null
          recommended_tools: string[]
          routine_pain: string | null
          updated_at: string
          user_id: string
          work_setting: string | null
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          primary_goal?: string | null
          primary_path?: string | null
          recommended_tools?: string[]
          routine_pain?: string | null
          updated_at?: string
          user_id: string
          work_setting?: string | null
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          primary_goal?: string | null
          primary_path?: string | null
          recommended_tools?: string[]
          routine_pain?: string | null
          updated_at?: string
          user_id?: string
          work_setting?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ward_admissions: {
        Row: {
          admitted_on: string
          bed_id: string | null
          comorbidities: string | null
          created_at: string
          date_of_birth: string | null
          discharge_summary: string | null
          discharged_on: string | null
          id: string
          main_diagnosis: string | null
          notes: string | null
          patient_name: string
          record_number: string | null
          status: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admitted_on?: string
          bed_id?: string | null
          comorbidities?: string | null
          created_at?: string
          date_of_birth?: string | null
          discharge_summary?: string | null
          discharged_on?: string | null
          id?: string
          main_diagnosis?: string | null
          notes?: string | null
          patient_name: string
          record_number?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admitted_on?: string
          bed_id?: string | null
          comorbidities?: string | null
          created_at?: string
          date_of_birth?: string | null
          discharge_summary?: string | null
          discharged_on?: string | null
          id?: string
          main_diagnosis?: string | null
          notes?: string | null
          patient_name?: string
          record_number?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_admissions_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "ward_beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_admissions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "ward_units"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_beds: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_beds_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "ward_units"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_movements: {
        Row: {
          admission_id: string
          created_at: string
          from_bed_id: string | null
          from_label: string | null
          id: string
          reason: string | null
          to_bed_id: string | null
          to_label: string | null
          user_id: string
        }
        Insert: {
          admission_id: string
          created_at?: string
          from_bed_id?: string | null
          from_label?: string | null
          id?: string
          reason?: string | null
          to_bed_id?: string | null
          to_label?: string | null
          user_id: string
        }
        Update: {
          admission_id?: string
          created_at?: string
          from_bed_id?: string | null
          from_label?: string | null
          id?: string
          reason?: string | null
          to_bed_id?: string | null
          to_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_movements_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "ward_admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_rounds: {
        Row: {
          admission_id: string
          content: string
          created_at: string
          id: string
          origin: string
          round_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admission_id: string
          content?: string
          created_at?: string
          id?: string
          origin?: string
          round_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admission_id?: string
          content?: string
          created_at?: string
          id?: string
          origin?: string
          round_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_rounds_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "ward_admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_units: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_admin_notification: {
        Args: {
          p_link?: string
          p_message?: string
          p_metadata?: Json
          p_reference_id?: string
          p_severity?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_message: string
          p_reference_id?: string
          p_reference_type?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      generate_document_number: { Args: { doc_type: string }; Returns: string }
      generate_exam_request_number: { Args: never; Returns: string }
      generate_prescription_number: { Args: never; Returns: string }
      get_public_referral_settings: {
        Args: never
        Returns: {
          active: boolean
          max_rewards_per_referrer: number
          referred_discount_percent: number
          referrer_reward_days: number
        }[]
      }
      has_active_courtesy: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_feature_enabled: { Args: { _key: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
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
      app_role: "admin" | "user" | "support"
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
      app_role: ["admin", "user", "support"],
    },
  },
} as const
