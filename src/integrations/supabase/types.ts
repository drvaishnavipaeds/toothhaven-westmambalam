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
      achievements: {
        Row: {
          achieved_on: string | null
          badge_type: string
          created_at: string
          description: string | null
          description_ta: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          title: string
          title_ta: string | null
          updated_at: string
        }
        Insert: {
          achieved_on?: string | null
          badge_type?: string
          created_at?: string
          description?: string | null
          description_ta?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title: string
          title_ta?: string | null
          updated_at?: string
        }
        Update: {
          achieved_on?: string | null
          badge_type?: string
          created_at?: string
          description?: string | null
          description_ta?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title?: string
          title_ta?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_phones: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string
          role?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          id: string
          notes: string | null
          patient_id: string | null
          patient_name: string
          patient_phone: string
          source: string
          status: string
          treatment_type: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name: string
          patient_phone: string
          source?: string
          status?: string
          treatment_type?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string
          patient_phone?: string
          source?: string
          status?: string
          treatment_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      case_studies: {
        Row: {
          anonymization_level: string
          category: string
          consent_id: string | null
          created_at: string
          id: string
          is_featured: boolean
          is_published: boolean
          patient_id: string | null
          summary: string | null
          summary_ta: string | null
          title: string
          title_ta: string | null
          treatment_duration: string | null
          updated_at: string
        }
        Insert: {
          anonymization_level?: string
          category?: string
          consent_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          patient_id?: string | null
          summary?: string | null
          summary_ta?: string | null
          title: string
          title_ta?: string | null
          treatment_duration?: string | null
          updated_at?: string
        }
        Update: {
          anonymization_level?: string
          category?: string
          consent_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          patient_id?: string | null
          summary?: string | null
          summary_ta?: string | null
          title?: string
          title_ta?: string | null
          treatment_duration?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_studies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      case_study_media: {
        Row: {
          caption: string | null
          caption_ta: string | null
          case_study_id: string
          created_at: string
          id: string
          media_type: string
          sort_order: number
          stage: string
          url: string
        }
        Insert: {
          caption?: string | null
          caption_ta?: string | null
          case_study_id: string
          created_at?: string
          id?: string
          media_type?: string
          sort_order?: number
          stage?: string
          url: string
        }
        Update: {
          caption?: string | null
          caption_ta?: string | null
          case_study_id?: string
          created_at?: string
          id?: string
          media_type?: string
          sort_order?: number
          stage?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_study_media_case_study_id_fkey"
            columns: ["case_study_id"]
            isOneToOne: false
            referencedRelation: "case_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_content: {
        Row: {
          content: string | null
          content_ta: string | null
          content_type: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          title: string
          title_ta: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          content_ta?: string | null
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
          title_ta?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          content_ta?: string | null
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
          title_ta?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_consents: {
        Row: {
          created_at: string
          granted: boolean
          granted_at: string
          id: string
          notes: string | null
          patient_id: string
          revoked_at: string | null
          scope: string
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          revoked_at?: string | null
          scope: string
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          revoked_at?: string | null
          scope?: string
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_investigations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          investigation_type: string
          is_series: boolean
          is_visible_to_patient: boolean
          media_type: string
          patient_id: string
          procedure_category: string
          series_paths: string[] | null
          sort_order: number
          taken_on: string | null
          thumbnail_url: string | null
          title: string
          tooth_number: string | null
          treatment_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          investigation_type?: string
          is_series?: boolean
          is_visible_to_patient?: boolean
          media_type?: string
          patient_id: string
          procedure_category?: string
          series_paths?: string[] | null
          sort_order?: number
          taken_on?: string | null
          thumbnail_url?: string | null
          title: string
          tooth_number?: string | null
          treatment_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          investigation_type?: string
          is_series?: boolean
          is_visible_to_patient?: boolean
          media_type?: string
          patient_id?: string
          procedure_category?: string
          series_paths?: string[] | null
          sort_order?: number
          taken_on?: string | null
          thumbnail_url?: string | null
          title?: string
          tooth_number?: string | null
          treatment_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          gender: string | null
          id: string
          medical_history: string | null
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          medical_history?: string | null
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          medical_history?: string | null
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string | null
          payment_date: string
          payment_method: string
          payment_status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_date?: string
          payment_method?: string
          payment_status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_date?: string
          payment_method?: string
          payment_status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          category: string
          consent_id: string | null
          created_at: string
          id: string
          is_featured: boolean
          is_published: boolean
          patient_id: string | null
          patient_name: string
          patient_name_ta: string | null
          quote: string
          quote_ta: string | null
          rating: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string
          consent_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          patient_id?: string | null
          patient_name: string
          patient_name_ta?: string | null
          quote: string
          quote_ta?: string | null
          rating?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          consent_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          patient_id?: string | null
          patient_name?: string
          patient_name_ta?: string | null
          quote?: string
          quote_ta?: string | null
          rating?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          patient_id: string
          status: string
          tooth_number: string | null
          treatment_date: string | null
          treatment_name: string
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          status?: string
          tooth_number?: string | null
          treatment_date?: string | null
          treatment_name: string
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
          tooth_number?: string | null
          treatment_date?: string | null
          treatment_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
