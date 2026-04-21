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
          patient_id: string | null
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
          patient_id?: string | null
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
          patient_id?: string | null
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
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
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
      studius_achievements: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      studius_conversations: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studius_decks: {
        Row: {
          card_count: number
          category: string
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_count?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_count?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studius_flashcard_reviews: {
        Row: {
          flashcard_id: string
          id: string
          quality: number
          reviewed_at: string
          user_id: string
        }
        Insert: {
          flashcard_id: string
          id?: string
          quality: number
          reviewed_at?: string
          user_id: string
        }
        Update: {
          flashcard_id?: string
          id?: string
          quality?: number
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studius_flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "studius_flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      studius_flashcards: {
        Row: {
          back: string
          created_at: string
          deck_id: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          last_reviewed_at: string | null
          next_review_date: string
          repetitions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          deck_id: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_date?: string
          repetitions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          deck_id?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_date?: string
          repetitions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studius_flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "studius_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      studius_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "studius_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "studius_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      studius_preferences: {
        Row: {
          created_at: string
          goals: string[] | null
          id: string
          onboarding_completed: boolean | null
          specialty: string | null
          study_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goals?: string[] | null
          id?: string
          onboarding_completed?: boolean | null
          specialty?: string | null
          study_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goals?: string[] | null
          id?: string
          onboarding_completed?: boolean | null
          specialty?: string | null
          study_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studius_quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          correct_answers: number
          created_at: string
          id: string
          quiz_id: string
          score: number
          started_at: string
          time_spent_seconds: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          id?: string
          quiz_id: string
          score?: number
          started_at?: string
          time_spent_seconds?: number | null
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          started_at?: string
          time_spent_seconds?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studius_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "studius_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      studius_quiz_questions: {
        Row: {
          correct_answer: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          options: Json
          question_order: number
          question_text: string
          quiz_id: string
        }
        Insert: {
          correct_answer: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json
          question_order?: number
          question_text: string
          quiz_id: string
        }
        Update: {
          correct_answer?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json
          question_order?: number
          question_text?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studius_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "studius_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      studius_quizzes: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string
          id: string
          question_count: number
          time_limit_minutes: number | null
          title: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          question_count?: number
          time_limit_minutes?: number | null
          title: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          question_count?: number
          time_limit_minutes?: number | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studius_stats: {
        Row: {
          articles_read: number | null
          created_at: string
          flashcards_reviewed: number | null
          id: string
          last_streak_date: string | null
          messages_sent: number | null
          streak_days: number | null
          study_date: string
          study_time_minutes: number | null
          updated_at: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          articles_read?: number | null
          created_at?: string
          flashcards_reviewed?: number | null
          id?: string
          last_streak_date?: string | null
          messages_sent?: number | null
          streak_days?: number | null
          study_date?: string
          study_time_minutes?: number | null
          updated_at?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          articles_read?: number | null
          created_at?: string
          flashcards_reviewed?: number | null
          id?: string
          last_streak_date?: string | null
          messages_sent?: number | null
          streak_days?: number | null
          study_date?: string
          study_time_minutes?: number | null
          updated_at?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: []
      }
      studius_user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studius_user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "studius_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      studius_user_progress: {
        Row: {
          created_at: string
          current_level: number
          current_streak: number
          display_name: string | null
          id: string
          is_public: boolean
          last_activity_date: string | null
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_streak?: number
          display_name?: string | null
          id?: string
          is_public?: boolean
          last_activity_date?: string | null
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          current_streak?: number
          display_name?: string | null
          id?: string
          is_public?: boolean
          last_activity_date?: string | null
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      studius_leaderboard: {
        Row: {
          current_level: number | null
          current_streak: number | null
          display_name: string | null
          id: string | null
          longest_streak: number | null
          total_xp: number | null
        }
        Insert: {
          current_level?: number | null
          current_streak?: number | null
          display_name?: string | null
          id?: string | null
          longest_streak?: number | null
          total_xp?: number | null
        }
        Update: {
          current_level?: number | null
          current_streak?: number | null
          display_name?: string | null
          id?: string | null
          longest_streak?: number | null
          total_xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_level: { Args: { xp: number }; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
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
      has_active_courtesy: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
