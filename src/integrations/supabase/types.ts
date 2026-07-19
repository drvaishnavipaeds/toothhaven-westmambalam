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
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          submitted_at: string | null
          submitted_by: string | null
          title: string
          title_ta: string | null
          updated_at: string
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
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
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          title_ta?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
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
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          title_ta?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
        }
        Relationships: []
      }
      admin_phones: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          in_charge: string | null
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          in_charge?: string | null
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          in_charge?: string | null
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          submitted_by: string | null
          summary: string | null
          summary_ta: string | null
          title: string
          title_ta: string | null
          treatment_duration: string | null
          updated_at: string
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
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
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          summary?: string | null
          summary_ta?: string | null
          title: string
          title_ta?: string | null
          treatment_duration?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
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
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          summary?: string | null
          summary_ta?: string | null
          title?: string
          title_ta?: string | null
          treatment_duration?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
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
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          submitted_by: string | null
          title: string
          title_ta: string | null
          updated_at: string
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
        }
        Insert: {
          content?: string | null
          content_ta?: string | null
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          title_ta?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
        }
        Update: {
          content?: string | null
          content_ta?: string | null
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          title_ta?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          address: string | null
          clinic_name: string
          created_at: string
          id: string
          invoice_counter: number | null
          invoice_prefix: string | null
          notification_email: string | null
          notification_phone: string | null
          primary_email: string | null
          primary_phone: string | null
          tax_percent: number | null
          updated_at: string
          working_hours: string | null
        }
        Insert: {
          address?: string | null
          clinic_name?: string
          created_at?: string
          id?: string
          invoice_counter?: number | null
          invoice_prefix?: string | null
          notification_email?: string | null
          notification_phone?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          tax_percent?: number | null
          updated_at?: string
          working_hours?: string | null
        }
        Update: {
          address?: string | null
          clinic_name?: string
          created_at?: string
          id?: string
          invoice_counter?: number | null
          invoice_prefix?: string | null
          notification_email?: string | null
          notification_phone?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          tax_percent?: number | null
          updated_at?: string
          working_hours?: string | null
        }
        Relationships: []
      }
      communication_campaigns: {
        Row: {
          audience: string | null
          channel: string
          created_at: string
          id: string
          message: string
          name: string
          sent_at: string | null
          sent_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          channel: string
          created_at?: string
          id?: string
          message: string
          name: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          channel?: string
          created_at?: string
          id?: string
          message?: string
          name?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          payment_mode: string | null
          receipt_url: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          payment_mode?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          payment_mode?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string
          expiry_date: string | null
          id: string
          name: string
          notes: string | null
          quantity: number
          reorder_level: number | null
          supplier: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          reorder_level?: number | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          reorder_level?: number | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          discount: number
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          patient_id: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          discount?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          patient_id: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          discount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          patient_id?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          description: string | null
          id: string
          included_services: string | null
          is_active: boolean
          name: string
          price: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          included_services?: string | null
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
          validity_days?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          included_services?: string | null
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
          validity_days?: number
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
      patient_memberships: {
        Row: {
          created_at: string
          end_date: string
          id: string
          membership_id: string
          patient_id: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          membership_id: string
          patient_id: string
          start_date?: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          membership_id?: string
          patient_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_memberships_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_memberships_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "patients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      prescriptions: {
        Row: {
          created_at: string
          diagnosis: string | null
          doctor_name: string | null
          drugs: Json
          id: string
          notes: string | null
          patient_id: string
          prescribed_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          doctor_name?: string | null
          drugs?: Json
          id?: string
          notes?: string | null
          patient_id: string
          prescribed_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          doctor_name?: string | null
          drugs?: Json
          id?: string
          notes?: string | null
          patient_id?: string
          prescribed_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string | null
          id: string
          join_date: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          join_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          join_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          video_url: string | null
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
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
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          video_url?: string | null
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
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
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          video_url?: string | null
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
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
      treatment_catalog: {
        Row: {
          category: string | null
          created_at: string
          default_price: number
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      tutorials: {
        Row: {
          category: string | null
          content_type: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      content_workflow_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
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
      content_workflow_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
      ],
    },
  },
} as const
