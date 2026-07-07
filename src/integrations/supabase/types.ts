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
      activity_log: {
        Row: {
          action: Database["public"]["Enums"]["activity_action"]
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          field_name: string | null
          id: number
          is_demo: boolean
          new_value: Json | null
          old_value: Json | null
          project_id: string | null
          summary: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["activity_action"]
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          field_name?: string | null
          id?: number
          is_demo?: boolean
          new_value?: Json | null
          old_value?: Json | null
          project_id?: string | null
          summary?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["activity_action"]
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          field_name?: string | null
          id?: number
          is_demo?: boolean
          new_value?: Json | null
          old_value?: Json | null
          project_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      applications: {
        Row: {
          code: string
          created_at: string
          id: string
          indoor_ok: boolean
          is_active: boolean
          name: string
          notes: string | null
          outdoor_ok: boolean
          sort_order: number
          updated_at: string
          wet_area_ok: boolean
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          indoor_ok?: boolean
          is_active?: boolean
          name: string
          notes?: string | null
          outdoor_ok?: boolean
          sort_order?: number
          updated_at?: string
          wet_area_ok?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          indoor_ok?: boolean
          is_active?: boolean
          name?: string
          notes?: string | null
          outdoor_ok?: boolean
          sort_order?: number
          updated_at?: string
          wet_area_ok?: boolean
        }
        Relationships: []
      }
      artwork_approvals: {
        Row: {
          artwork_id: string
          created_at: string
          customer_id: string | null
          decided_at: string | null
          decided_by: string | null
          feedback: string | null
          id: string
          is_demo: boolean
          status: string
          updated_at: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          customer_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          feedback?: string | null
          id?: string
          is_demo?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          customer_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          feedback?: string | null
          id?: string
          is_demo?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artwork_approvals_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "product_artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_approvals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_imports: {
        Row: {
          created_at: string
          created_by: string | null
          error_count: number
          errors: Json
          filename: string | null
          id: string
          row_count: number
          success_count: number
          target_table: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_count?: number
          errors?: Json
          filename?: string | null
          id?: string
          row_count?: number
          success_count?: number
          target_table: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_count?: number
          errors?: Json
          filename?: string | null
          id?: string
          row_count?: number
          success_count?: number
          target_table?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          is_demo: boolean
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_demo?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_demo?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount: number
          cn_no: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          invoice_id: string | null
          is_demo: boolean
          issued_at: string
          reason: string | null
          remarks: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          cn_no?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          invoice_id?: string | null
          is_demo?: boolean
          issued_at?: string
          reason?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cn_no?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          invoice_id?: string | null
          is_demo?: boolean
          issued_at?: string
          reason?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          created_at: string
          customer_id: string
          designation: Database["public"]["Enums"]["contact_designation"]
          email: string | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          designation?: Database["public"]["Enums"]["contact_designation"]
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          designation?: Database["public"]["Enums"]["contact_designation"]
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          customer_id: string
          tag_id: string
        }
        Insert: {
          customer_id: string
          tag_id: string
        }
        Update: {
          customer_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address: string | null
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_code: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          external_ref: Json | null
          gst_number: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          name: string
          notes: string | null
          pan: string | null
          pincode: string | null
          primary_email: string | null
          primary_phone: string | null
          source: string | null
          state: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          workflow_state: Json | null
        }
        Insert: {
          billing_address?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_code: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          external_ref?: Json | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name: string
          notes?: string | null
          pan?: string | null
          pincode?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          workflow_state?: Json | null
        }
        Update: {
          billing_address?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_code?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          external_ref?: Json | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name?: string
          notes?: string | null
          pan?: string | null
          pincode?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          workflow_state?: Json | null
        }
        Relationships: []
      }
      debit_notes: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          dn_no: string
          id: string
          invoice_id: string | null
          is_demo: boolean
          issued_at: string
          reason: string | null
          remarks: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          dn_no?: string
          id?: string
          invoice_id?: string | null
          is_demo?: boolean
          issued_at?: string
          reason?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          dn_no?: string
          id?: string
          invoice_id?: string | null
          is_demo?: boolean
          issued_at?: string
          reason?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          carrier: string | null
          created_at: string
          created_by: string | null
          dispatch_date: string
          dispatch_no: string
          id: string
          is_demo: boolean
          notes: string | null
          sales_order_id: string | null
          status: Database["public"]["Enums"]["dispatch_status"]
          tracking_no: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_date?: string
          dispatch_no: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          tracking_no?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_date?: string
          dispatch_no?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          tracking_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_lineage: {
        Row: {
          converted_at: string
          converted_by: string | null
          customer_id: string | null
          id: string
          meta: Json
          project_id: string | null
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Insert: {
          converted_at?: string
          converted_by?: string | null
          customer_id?: string | null
          id?: string
          meta?: Json
          project_id?: string | null
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Update: {
          converted_at?: string
          converted_by?: string | null
          customer_id?: string | null
          id?: string
          meta?: Json
          project_id?: string | null
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_lineage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_lineage_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_finishes: {
        Row: {
          code: string
          cost_multiplier: number
          created_at: string
          id: string
          is_active: boolean
          machine_required: boolean
          name: string
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          cost_multiplier?: number
          created_at?: string
          id?: string
          is_active?: boolean
          machine_required?: boolean
          name: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          cost_multiplier?: number
          created_at?: string
          id?: string
          is_active?: boolean
          machine_required?: boolean
          name?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          assigned_to: string | null
          budget_inr: number | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string
          enquiry_no: string
          external_ref: Json | null
          id: string
          is_demo: boolean
          lost_reason: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["enquiry_priority"]
          project_id: string | null
          required_delivery_date: string | null
          requirement: string | null
          source: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
          workflow_state: Json | null
        }
        Insert: {
          assigned_to?: string | null
          budget_inr?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id: string
          enquiry_no: string
          external_ref?: Json | null
          id?: string
          is_demo?: boolean
          lost_reason?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["enquiry_priority"]
          project_id?: string | null
          required_delivery_date?: string | null
          requirement?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
          workflow_state?: Json | null
        }
        Update: {
          assigned_to?: string | null
          budget_inr?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string
          enquiry_no?: string
          external_ref?: Json | null
          id?: string
          is_demo?: boolean
          lost_reason?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["enquiry_priority"]
          project_id?: string | null
          required_delivery_date?: string | null
          requirement?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
          workflow_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_items: {
        Row: {
          created_at: string
          enquiry_id: string
          id: string
          is_demo: boolean
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          remarks: string | null
          sort_order: number
          target_price: number | null
          unit: Database["public"]["Enums"]["product_unit"]
        }
        Insert: {
          created_at?: string
          enquiry_id: string
          id?: string
          is_demo?: boolean
          product_id?: string | null
          product_name_snapshot: string
          quantity?: number
          remarks?: string | null
          sort_order?: number
          target_price?: number | null
          unit?: Database["public"]["Enums"]["product_unit"]
        }
        Update: {
          created_at?: string
          enquiry_id?: string
          id?: string
          is_demo?: boolean
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          remarks?: string | null
          sort_order?: number
          target_price?: number | null
          unit?: Database["public"]["Enums"]["product_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_items_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          enquiry_id: string
          from_stage: Database["public"]["Enums"]["lead_stage"] | null
          id: string
          note: string | null
          to_stage: Database["public"]["Enums"]["lead_stage"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          enquiry_id: string
          from_stage?: Database["public"]["Enums"]["lead_stage"] | null
          id?: string
          note?: string | null
          to_stage: Database["public"]["Enums"]["lead_stage"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          enquiry_id?: string
          from_stage?: Database["public"]["Enums"]["lead_stage"] | null
          id?: string
          note?: string | null
          to_stage?: Database["public"]["Enums"]["lead_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_stage_history_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_tags: {
        Row: {
          enquiry_id: string
          tag_id: string
        }
        Insert: {
          enquiry_id: string
          tag_id: string
        }
        Update: {
          enquiry_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_tags_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_sequences: {
        Row: {
          last_value: number
          prefix: string
          width: number
        }
        Insert: {
          last_value?: number
          prefix: string
          width?: number
        }
        Update: {
          last_value?: number
          prefix?: string
          width?: number
        }
        Relationships: []
      }
      estimate_cost_components: {
        Row: {
          amount: number
          estimate_id: string
          id: string
          is_demo: boolean
          kind: string
          label: string | null
          quantity: number
          sort_order: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          amount?: number
          estimate_id: string
          id?: string
          is_demo?: boolean
          kind: string
          label?: string | null
          quantity?: number
          sort_order?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number
          estimate_id?: string
          id?: string
          is_demo?: boolean
          kind?: string
          label?: string | null
          quantity?: number
          sort_order?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_cost_components_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_documents: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          created_by: string | null
          estimate_id: string
          file_id: string | null
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["estimate_document_kind"]
          subject: string | null
          version: number
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          estimate_id: string
          file_id?: string | null
          id?: string
          is_demo?: boolean
          kind: Database["public"]["Enums"]["estimate_document_kind"]
          subject?: string | null
          version?: number
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          estimate_id?: string
          file_id?: string | null
          id?: string
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["estimate_document_kind"]
          subject?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_documents_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          category: Database["public"]["Enums"]["estimate_item_category"]
          description: string
          estimate_id: string
          id: string
          is_demo: boolean
          line_total: number
          product_id: string | null
          quantity: number
          sort_order: number
          tax_pct: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["estimate_item_category"]
          description: string
          estimate_id: string
          id?: string
          is_demo?: boolean
          line_total?: number
          product_id?: string | null
          quantity?: number
          sort_order?: number
          tax_pct?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["estimate_item_category"]
          description?: string
          estimate_id?: string
          id?: string
          is_demo?: boolean
          line_total?: number
          product_id?: string | null
          quantity?: number
          sort_order?: number
          tax_pct?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_payment_schedules: {
        Row: {
          amount: number
          due_offset_days: number
          estimate_id: string
          id: string
          is_demo: boolean
          label: string
          pct: number
          sort_order: number
        }
        Insert: {
          amount?: number
          due_offset_days?: number
          estimate_id: string
          id?: string
          is_demo?: boolean
          label: string
          pct: number
          sort_order?: number
        }
        Update: {
          amount?: number
          due_offset_days?: number
          estimate_id?: string
          id?: string
          is_demo?: boolean
          label?: string
          pct?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_payment_schedules_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          adhesives_cost: number
          chemicals_cost: number
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string | null
          enquiry_id: string | null
          estimate_no: string
          freight_cost: number
          gst_amount: number
          gst_pct: number
          id: string
          installation_cost: number
          is_demo: boolean
          manufacturing_cost: number
          margin_amount: number
          margin_pct: number
          material_cost: number
          notes: string | null
          other_cost: number
          packing_cost: number
          payment_schedule_kind: string
          project_id: string | null
          sealer_cost: number
          source_quote_id: string | null
          status: Database["public"]["Enums"]["estimate_status"]
          subtotal: number
          template: Database["public"]["Enums"]["estimate_template"]
          terms: string | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          adhesives_cost?: number
          chemicals_cost?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string | null
          enquiry_id?: string | null
          estimate_no?: string
          freight_cost?: number
          gst_amount?: number
          gst_pct?: number
          id?: string
          installation_cost?: number
          is_demo?: boolean
          manufacturing_cost?: number
          margin_amount?: number
          margin_pct?: number
          material_cost?: number
          notes?: string | null
          other_cost?: number
          packing_cost?: number
          payment_schedule_kind?: string
          project_id?: string | null
          sealer_cost?: number
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal?: number
          template: Database["public"]["Enums"]["estimate_template"]
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          adhesives_cost?: number
          chemicals_cost?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string | null
          enquiry_id?: string | null
          estimate_no?: string
          freight_cost?: number
          gst_amount?: number
          gst_pct?: number
          id?: string
          installation_cost?: number
          is_demo?: boolean
          manufacturing_cost?: number
          margin_amount?: number
          margin_pct?: number
          material_cost?: number
          notes?: string | null
          other_cost?: number
          packing_cost?: number
          payment_schedule_kind?: string
          project_id?: string | null
          sealer_cost?: number
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal?: number
          template?: Database["public"]["Enums"]["estimate_template"]
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_demo: boolean
          label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_demo?: boolean
          label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_demo?: boolean
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      file_objects: {
        Row: {
          bucket: string
          entity_id: string
          entity_type: string
          file_name: string
          folder: Database["public"]["Enums"]["file_folder"]
          id: string
          is_demo: boolean
          mime_type: string | null
          object_path: string
          project_id: string | null
          size_bytes: number | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          bucket: string
          entity_id: string
          entity_type: string
          file_name: string
          folder?: Database["public"]["Enums"]["file_folder"]
          id?: string
          is_demo?: boolean
          mime_type?: string | null
          object_path: string
          project_id?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          folder?: Database["public"]["Enums"]["file_folder"]
          id?: string
          is_demo?: boolean
          mime_type?: string | null
          object_path?: string
          project_id?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          assigned_to: string | null
          channel: Database["public"]["Enums"]["followup_channel"]
          company_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          enquiry_id: string | null
          entity_id: string | null
          entity_type: string | null
          external_ref: Json | null
          id: string
          is_demo: boolean
          next_followup_id: string | null
          notes: string | null
          outcome_notes: string | null
          project_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["followup_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel?: Database["public"]["Enums"]["followup_channel"]
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          enquiry_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          external_ref?: Json | null
          id?: string
          is_demo?: boolean
          next_followup_id?: string | null
          notes?: string | null
          outcome_notes?: string | null
          project_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: Database["public"]["Enums"]["followup_channel"]
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          enquiry_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          external_ref?: Json | null
          id?: string
          is_demo?: boolean
          next_followup_id?: string | null
          notes?: string | null
          outcome_notes?: string | null
          project_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_next_followup_id_fkey"
            columns: ["next_followup_id"]
            isOneToOne: false
            referencedRelation: "followups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          arrival_date: string | null
          block_no: string | null
          bundle_qty: number | null
          bundle_uom: string | null
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          location: string | null
          lot_no: string | null
          notes: string | null
          origin_country: string | null
          product_id: string | null
          quantity_on_hand: number
          reorder_level: number
          size_length_mm: number | null
          size_width_mm: number | null
          slab_no: string | null
          stock_code: string
          thickness_mm: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          arrival_date?: string | null
          block_no?: string | null
          bundle_qty?: number | null
          bundle_uom?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          location?: string | null
          lot_no?: string | null
          notes?: string | null
          origin_country?: string | null
          product_id?: string | null
          quantity_on_hand?: number
          reorder_level?: number
          size_length_mm?: number | null
          size_width_mm?: number | null
          slab_no?: string | null
          stock_code: string
          thickness_mm?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          arrival_date?: string | null
          block_no?: string | null
          bundle_qty?: number | null
          bundle_uom?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          location?: string | null
          lot_no?: string | null
          notes?: string | null
          origin_country?: string | null
          product_id?: string | null
          quantity_on_hand?: number
          reorder_level?: number
          size_length_mm?: number | null
          size_width_mm?: number | null
          slab_no?: string | null
          stock_code?: string
          thickness_mm?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          is_demo: boolean
          line_total: number
          product_id: string | null
          quantity: number
          sort_order: number
          tax_pct: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          is_demo?: boolean
          line_total?: number
          product_id?: string | null
          quantity?: number
          sort_order?: number
          tax_pct?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          is_demo?: boolean
          line_total?: number
          product_id?: string | null
          quantity?: number
          sort_order?: number
          tax_pct?: number
          unit?: string | null
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
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
          company_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string
          due_date: string | null
          external_ref: string | null
          id: string
          invoice_no: string
          is_demo: boolean
          issue_date: string
          notes: string | null
          project_id: string
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          terms: string | null
          total: number
          updated_at: string
          workflow_state: Json | null
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id: string
          due_date?: string | null
          external_ref?: string | null
          id?: string
          invoice_no: string
          is_demo?: boolean
          issue_date?: string
          notes?: string | null
          project_id: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          total?: number
          updated_at?: string
          workflow_state?: Json | null
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string
          due_date?: string | null
          external_ref?: string | null
          id?: string
          invoice_no?: string
          is_demo?: boolean
          issue_date?: string
          notes?: string | null
          project_id?: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          total?: number
          updated_at?: string
          workflow_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturing_stages: {
        Row: {
          code: string
          created_at: string
          default_owner: Database["public"]["Enums"]["stage_owner"]
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sort_order: number
          typical_days: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_owner?: Database["public"]["Enums"]["stage_owner"]
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sort_order?: number
          typical_days?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_owner?: Database["public"]["Enums"]["stage_owner"]
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sort_order?: number
          typical_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      message_delivery_events: {
        Row: {
          event: string
          id: string
          message_id: string
          occurred_at: string
          payload: Json
          provider: string | null
          provider_ref: string | null
        }
        Insert: {
          event: string
          id?: string
          message_id: string
          occurred_at?: string
          payload?: Json
          provider?: string | null
          provider_ref?: string | null
        }
        Update: {
          event?: string
          id?: string
          message_id?: string
          occurred_at?: string
          payload?: Json
          provider?: string | null
          provider_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_delivery_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "message_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      message_queue: {
        Row: {
          attempts: number
          bcc_address: string | null
          body: string
          cc_address: string | null
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          failed_reason: string | null
          id: string
          last_error: string | null
          max_attempts: number
          message_no: string
          next_retry_at: string | null
          provider: string | null
          provider_message_id: string | null
          read_at: string | null
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_code: string | null
          to_address: string
          updated_at: string
          variables: Json
        }
        Insert: {
          attempts?: number
          bcc_address?: string | null
          body: string
          cc_address?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          failed_reason?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          message_no?: string
          next_retry_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_code?: string | null
          to_address: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          attempts?: number
          bcc_address?: string | null
          body?: string
          cc_address?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          failed_reason?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          message_no?: string
          next_retry_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_code?: string | null
          to_address?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          category: string
          channel: string
          code: string
          created_at: string
          entity_type: string | null
          id: string
          is_active: boolean
          name: string
          subject: string | null
          template_kind: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          category?: string
          channel: string
          code: string
          created_at?: string
          entity_type?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject?: string | null
          template_kind?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          category?: string
          channel?: string
          code?: string
          created_at?: string
          entity_type?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string | null
          template_kind?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          error: string | null
          event_id: string
          id: string
          provider_message_id: string | null
          recipient: string
          recipient_user_id: string | null
          scheduled_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error?: string | null
          event_id: string
          id?: string
          provider_message_id?: string | null
          recipient: string
          recipient_user_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error?: string | null
          event_id?: string
          id?: string
          provider_message_id?: string | null
          recipient?: string
          recipient_user_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event: Database["public"]["Enums"]["notification_event"]
          id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event: Database["public"]["Enums"]["notification_event"]
          id?: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event?: Database["public"]["Enums"]["notification_event"]
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      packaging_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_export_ok: boolean
          name: string
          notes: string | null
          sort_order: number
          typical_weight_kg: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_export_ok?: boolean
          name: string
          notes?: string | null
          sort_order?: number
          typical_weight_kg?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_export_ok?: boolean
          name?: string
          notes?: string | null
          sort_order?: number
          typical_weight_kg?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          currency_code: string
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          invoice_id: string
          is_demo: boolean
          link_no: string
          meta: Json
          provider: string
          provider_link_id: string | null
          provider_ref: string | null
          short_url: string | null
          status: Database["public"]["Enums"]["payment_link_status"]
          token: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          currency_code?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          invoice_id: string
          is_demo?: boolean
          link_no: string
          meta?: Json
          provider?: string
          provider_link_id?: string | null
          provider_ref?: string | null
          short_url?: string | null
          status?: Database["public"]["Enums"]["payment_link_status"]
          token?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          currency_code?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          invoice_id?: string
          is_demo?: boolean
          link_no?: string
          meta?: Json
          provider?: string
          provider_link_id?: string | null
          provider_ref?: string | null
          short_url?: string | null
          status?: Database["public"]["Enums"]["payment_link_status"]
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency_code: string
          id: string
          invoice_id: string
          is_demo: boolean
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          payment_link_id: string | null
          payment_no: string
          razorpay_link_id: string | null
          razorpay_payment_id: string | null
          recorded_by: string | null
          reference_no: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code?: string
          id?: string
          invoice_id: string
          is_demo?: boolean
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          payment_link_id?: string | null
          payment_no: string
          razorpay_link_id?: string | null
          razorpay_payment_id?: string | null
          recorded_by?: string | null
          reference_no?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          id?: string
          invoice_id?: string
          is_demo?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          payment_link_id?: string | null
          payment_no?: string
          razorpay_link_id?: string | null
          razorpay_payment_id?: string | null
          recorded_by?: string | null
          reference_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_link_id_fkey"
            columns: ["payment_link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
        ]
      }
      product_artworks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          file_object_id: string
          id: string
          is_approved: boolean
          kind: string
          notes: string | null
          product_id: string | null
          production_order_id: string | null
          revision: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          file_object_id: string
          id?: string
          is_approved?: boolean
          kind: string
          notes?: string | null
          product_id?: string | null
          production_order_id?: string | null
          revision?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          file_object_id?: string
          id?: string
          is_approved?: boolean
          kind?: string
          notes?: string | null
          product_id?: string | null
          production_order_id?: string | null
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_artworks_file_object_id_fkey"
            columns: ["file_object_id"]
            isOneToOne: false
            referencedRelation: "file_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_artworks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_artworks_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_families: {
        Row: {
          code: string
          configurable_attributes: Json
          created_at: string
          default_uom: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          requires_artwork: boolean
          requires_configurator: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          configurable_attributes?: Json
          created_at?: string
          default_uom?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          requires_artwork?: boolean
          requires_configurator?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          configurable_attributes?: Json
          created_at?: string
          default_uom?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          requires_artwork?: boolean
          requires_configurator?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          file_object_id: string | null
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string | null
        }
        Insert: {
          created_at?: string
          file_object_id?: string | null
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url?: string | null
        }
        Update: {
          created_at?: string
          file_object_id?: string | null
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          captured_at: string
          currency: string
          id: string
          kind: string
          price_inr: number
          product_id: string
          source_ref: string | null
        }
        Insert: {
          captured_at?: string
          currency?: string
          id?: string
          kind: string
          price_inr: number
          product_id: string
          source_ref?: string | null
        }
        Update: {
          captured_at?: string
          currency?: string
          id?: string
          kind?: string
          price_inr?: number
          product_id?: string
          source_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_similar: {
        Row: {
          created_at: string
          id: string
          product_id: string
          similar_product_id: string
          source: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          similar_product_id: string
          source?: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          similar_product_id?: string
          source?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_similar_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_similar_similar_product_id_fkey"
            columns: ["similar_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_technical_docs: {
        Row: {
          created_at: string
          file_object_id: string | null
          id: string
          kind: string
          product_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          file_object_id?: string | null
          id?: string
          kind: string
          product_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          file_object_id?: string | null
          id?: string
          kind?: string
          product_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_technical_docs_file_object_id_fkey"
            columns: ["file_object_id"]
            isOneToOne: false
            referencedRelation: "file_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_technical_docs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_veneer_specs: {
        Row: {
          backing_type: string | null
          bend_radius_mm: number | null
          fire_rating: string | null
          form: string | null
          indoor_ok: boolean
          outdoor_ok: boolean
          product_id: string
          sheet_length_mm: number | null
          sheet_width_mm: number | null
          updated_at: string
          weight_kg_m2: number | null
        }
        Insert: {
          backing_type?: string | null
          bend_radius_mm?: number | null
          fire_rating?: string | null
          form?: string | null
          indoor_ok?: boolean
          outdoor_ok?: boolean
          product_id: string
          sheet_length_mm?: number | null
          sheet_width_mm?: number | null
          updated_at?: string
          weight_kg_m2?: number | null
        }
        Update: {
          backing_type?: string | null
          bend_radius_mm?: number | null
          fire_rating?: string | null
          form?: string | null
          indoor_ok?: boolean
          outdoor_ok?: boolean
          product_id?: string
          sheet_length_mm?: number | null
          sheet_width_mm?: number | null
          updated_at?: string
          weight_kg_m2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_veneer_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          bundle_no: string | null
          completed_at: string | null
          crate_no: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          drawing_ref: string | null
          elevation: string | null
          enquiry_id: string | null
          id: string
          install_sequence: number | null
          is_demo: boolean
          mfg_no: string
          notes: string | null
          planned_end: string | null
          planned_start: string | null
          product_id: string
          project_id: string | null
          quantity: number
          revision: string | null
          room: string | null
          sales_order_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["production_status"]
          unit: string
          updated_at: string
          wall: string | null
        }
        Insert: {
          bundle_no?: string | null
          completed_at?: string | null
          crate_no?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          drawing_ref?: string | null
          elevation?: string | null
          enquiry_id?: string | null
          id?: string
          install_sequence?: number | null
          is_demo?: boolean
          mfg_no?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          product_id: string
          project_id?: string | null
          quantity: number
          revision?: string | null
          room?: string | null
          sales_order_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["production_status"]
          unit?: string
          updated_at?: string
          wall?: string | null
        }
        Update: {
          bundle_no?: string | null
          completed_at?: string | null
          crate_no?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          drawing_ref?: string | null
          elevation?: string | null
          enquiry_id?: string | null
          id?: string
          install_sequence?: number | null
          is_demo?: boolean
          mfg_no?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          product_id?: string
          project_id?: string | null
          quantity?: number
          revision?: string | null
          room?: string | null
          sales_order_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["production_status"]
          unit?: string
          updated_at?: string
          wall?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_pieces: {
        Row: {
          bundle_no: string | null
          crate_no: string | null
          created_at: string
          drawing_ref: string | null
          elevation: string | null
          id: string
          install_sequence: number | null
          is_demo: boolean
          notes: string | null
          piece_no: string
          production_order_id: string
          project_id: string | null
          revision: string | null
          room: string | null
          status: Database["public"]["Enums"]["installation_status"]
          status_at: string
          updated_at: string
          wall: string | null
        }
        Insert: {
          bundle_no?: string | null
          crate_no?: string | null
          created_at?: string
          drawing_ref?: string | null
          elevation?: string | null
          id?: string
          install_sequence?: number | null
          is_demo?: boolean
          notes?: string | null
          piece_no: string
          production_order_id: string
          project_id?: string | null
          revision?: string | null
          room?: string | null
          status?: Database["public"]["Enums"]["installation_status"]
          status_at?: string
          updated_at?: string
          wall?: string | null
        }
        Update: {
          bundle_no?: string | null
          crate_no?: string | null
          created_at?: string
          drawing_ref?: string | null
          elevation?: string | null
          id?: string
          install_sequence?: number | null
          is_demo?: boolean
          notes?: string | null
          piece_no?: string
          production_order_id?: string
          project_id?: string | null
          revision?: string | null
          room?: string | null
          status?: Database["public"]["Enums"]["installation_status"]
          status_at?: string
          updated_at?: string
          wall?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_pieces_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_pieces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stage_files: {
        Row: {
          caption: string | null
          created_at: string
          file_object_id: string
          id: string
          stage_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_object_id: string
          id?: string
          stage_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_object_id?: string
          id?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stage_files_file_object_id_fkey"
            columns: ["file_object_id"]
            isOneToOne: false
            referencedRelation: "file_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stage_files_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "production_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stages: {
        Row: {
          actual_completed_at: string | null
          actual_start: string | null
          assigned_user_id: string | null
          assigned_vendor_id: string | null
          created_at: string
          delay_reason: string | null
          id: string
          is_demo: boolean
          is_outsourced: boolean
          notes: string | null
          planned_date: string | null
          planned_start: string | null
          production_order_id: string
          qc_checklist: Json
          sort_order: number
          stage_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_completed_at?: string | null
          actual_start?: string | null
          assigned_user_id?: string | null
          assigned_vendor_id?: string | null
          created_at?: string
          delay_reason?: string | null
          id?: string
          is_demo?: boolean
          is_outsourced?: boolean
          notes?: string | null
          planned_date?: string | null
          planned_start?: string | null
          production_order_id: string
          qc_checklist?: Json
          sort_order?: number
          stage_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_completed_at?: string | null
          actual_start?: string | null
          assigned_user_id?: string | null
          assigned_vendor_id?: string | null
          created_at?: string
          delay_reason?: string | null
          id?: string
          is_demo?: boolean
          is_outsourced?: boolean
          notes?: string | null
          planned_date?: string | null
          planned_start?: string | null
          production_order_id?: string
          qc_checklist?: Json
          sort_order?: number
          stage_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stages_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stages_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stages_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_tags: string[]
          application_ids: string[]
          auto_description: string | null
          category_id: string | null
          colour: string | null
          colour_id: string | null
          commercial_name: string | null
          company_id: string | null
          config_hash: string | null
          config_json: Json | null
          created_at: string
          created_by: string | null
          default_unit: Database["public"]["Enums"]["product_unit"]
          description: string | null
          edge_finish_id: string | null
          estimated_mfg_days: number | null
          external_ref: Json | null
          family_id: string | null
          finish: Database["public"]["Enums"]["stone_finish"] | null
          gst_pct: number | null
          hsn_code: string | null
          id: string
          is_active: boolean
          is_custom: boolean
          is_demo: boolean
          last_purchase_price_inr: number | null
          last_selling_price_inr: number | null
          market_price_inr: number | null
          name: string
          origin_country: string | null
          origin_id: string | null
          packaging_type_id: string | null
          processing: Json
          product_code: string
          quality_grade_id: string | null
          required_capabilities: string[]
          size_length_mm: number | null
          size_width_mm: number | null
          sku: string | null
          stone_type: Database["public"]["Enums"]["stone_type"] | null
          stone_type_id: string | null
          surface_finish_id: string | null
          technical_description: string | null
          technical_specs: Json
          thickness_id: string | null
          thickness_mm: number | null
          uom_id: string | null
          updated_at: string
          waste_pct: number | null
          weight_kg_per_unit: number | null
        }
        Insert: {
          ai_tags?: string[]
          application_ids?: string[]
          auto_description?: string | null
          category_id?: string | null
          colour?: string | null
          colour_id?: string | null
          commercial_name?: string | null
          company_id?: string | null
          config_hash?: string | null
          config_json?: Json | null
          created_at?: string
          created_by?: string | null
          default_unit?: Database["public"]["Enums"]["product_unit"]
          description?: string | null
          edge_finish_id?: string | null
          estimated_mfg_days?: number | null
          external_ref?: Json | null
          family_id?: string | null
          finish?: Database["public"]["Enums"]["stone_finish"] | null
          gst_pct?: number | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          is_demo?: boolean
          last_purchase_price_inr?: number | null
          last_selling_price_inr?: number | null
          market_price_inr?: number | null
          name: string
          origin_country?: string | null
          origin_id?: string | null
          packaging_type_id?: string | null
          processing?: Json
          product_code: string
          quality_grade_id?: string | null
          required_capabilities?: string[]
          size_length_mm?: number | null
          size_width_mm?: number | null
          sku?: string | null
          stone_type?: Database["public"]["Enums"]["stone_type"] | null
          stone_type_id?: string | null
          surface_finish_id?: string | null
          technical_description?: string | null
          technical_specs?: Json
          thickness_id?: string | null
          thickness_mm?: number | null
          uom_id?: string | null
          updated_at?: string
          waste_pct?: number | null
          weight_kg_per_unit?: number | null
        }
        Update: {
          ai_tags?: string[]
          application_ids?: string[]
          auto_description?: string | null
          category_id?: string | null
          colour?: string | null
          colour_id?: string | null
          commercial_name?: string | null
          company_id?: string | null
          config_hash?: string | null
          config_json?: Json | null
          created_at?: string
          created_by?: string | null
          default_unit?: Database["public"]["Enums"]["product_unit"]
          description?: string | null
          edge_finish_id?: string | null
          estimated_mfg_days?: number | null
          external_ref?: Json | null
          family_id?: string | null
          finish?: Database["public"]["Enums"]["stone_finish"] | null
          gst_pct?: number | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          is_demo?: boolean
          last_purchase_price_inr?: number | null
          last_selling_price_inr?: number | null
          market_price_inr?: number | null
          name?: string
          origin_country?: string | null
          origin_id?: string | null
          packaging_type_id?: string | null
          processing?: Json
          product_code?: string
          quality_grade_id?: string | null
          required_capabilities?: string[]
          size_length_mm?: number | null
          size_width_mm?: number | null
          sku?: string | null
          stone_type?: Database["public"]["Enums"]["stone_type"] | null
          stone_type_id?: string | null
          surface_finish_id?: string | null
          technical_description?: string | null
          technical_specs?: Json
          thickness_id?: string | null
          thickness_mm?: number | null
          uom_id?: string | null
          updated_at?: string
          waste_pct?: number | null
          weight_kg_per_unit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "stone_colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_edge_finish_id_fkey"
            columns: ["edge_finish_id"]
            isOneToOne: false
            referencedRelation: "edge_finishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "stone_origins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_packaging_type_id_fkey"
            columns: ["packaging_type_id"]
            isOneToOne: false
            referencedRelation: "packaging_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_quality_grade_id_fkey"
            columns: ["quality_grade_id"]
            isOneToOne: false
            referencedRelation: "quality_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_stone_type_id_fkey"
            columns: ["stone_type_id"]
            isOneToOne: false
            referencedRelation: "stone_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_surface_finish_id_fkey"
            columns: ["surface_finish_id"]
            isOneToOne: false
            referencedRelation: "surface_finishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_thickness_id_fkey"
            columns: ["thickness_id"]
            isOneToOne: false
            referencedRelation: "thicknesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_demo_mode: boolean
          phone: string | null
          preferences: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          is_demo_mode?: boolean
          phone?: string | null
          preferences?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_demo_mode?: boolean
          phone?: string | null
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_demo: boolean
          project_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_demo?: boolean
          project_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tags: {
        Row: {
          project_id: string
          tag_id: string
        }
        Insert: {
          project_id: string
          tag_id: string
        }
        Update: {
          project_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          architect_contact_id: string | null
          architect_name: string | null
          area_sqft: number | null
          city: string | null
          company_id: string | null
          contractor_name: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string
          expected_completion_date: string | null
          expected_start_date: string | null
          expected_value_inr: number | null
          external_ref: Json | null
          id: string
          is_active: boolean
          is_demo: boolean
          name: string
          notes: string | null
          owner_user_id: string | null
          pincode: string | null
          project_code: string
          project_type: Database["public"]["Enums"]["project_type"]
          purchase_contact_id: string | null
          site_address: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          state: string | null
          updated_at: string
          workflow_state: Json | null
        }
        Insert: {
          architect_contact_id?: string | null
          architect_name?: string | null
          area_sqft?: number | null
          city?: string | null
          company_id?: string | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id: string
          expected_completion_date?: string | null
          expected_start_date?: string | null
          expected_value_inr?: number | null
          external_ref?: Json | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name: string
          notes?: string | null
          owner_user_id?: string | null
          pincode?: string | null
          project_code: string
          project_type?: Database["public"]["Enums"]["project_type"]
          purchase_contact_id?: string | null
          site_address?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          state?: string | null
          updated_at?: string
          workflow_state?: Json | null
        }
        Update: {
          architect_contact_id?: string | null
          architect_name?: string | null
          area_sqft?: number | null
          city?: string | null
          company_id?: string | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string
          expected_completion_date?: string | null
          expected_start_date?: string | null
          expected_value_inr?: number | null
          external_ref?: Json | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          pincode?: string | null
          project_code?: string
          project_type?: Database["public"]["Enums"]["project_type"]
          purchase_contact_id?: string | null
          site_address?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          state?: string | null
          updated_at?: string
          workflow_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_architect_contact_id_fkey"
            columns: ["architect_contact_id"]
            isOneToOne: false
            referencedRelation: "customer_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_purchase_contact_id_fkey"
            columns: ["purchase_contact_id"]
            isOneToOne: false
            referencedRelation: "customer_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          expected_date: string | null
          external_ref: string | null
          id: string
          is_demo: boolean
          notes: string | null
          order_date: string
          po_no: string
          project_id: string | null
          rfq_id: string | null
          status: Database["public"]["Enums"]["purchase_order_status"]
          updated_at: string
          vendor_id: string | null
          workflow_state: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          expected_date?: string | null
          external_ref?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          order_date?: string
          po_no: string
          project_id?: string | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          updated_at?: string
          vendor_id?: string | null
          workflow_state?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          expected_date?: string | null
          external_ref?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          order_date?: string
          po_no?: string
          project_id?: string | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          updated_at?: string
          vendor_id?: string | null
          workflow_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_results: {
        Row: {
          checked_at: string | null
          created_at: string
          id: string
          image_urls: string[]
          inspector_id: string | null
          is_demo: boolean
          item_id: string | null
          label: string
          outcome: Database["public"]["Enums"]["qc_outcome"]
          production_stage_id: string
          remarks: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          created_at?: string
          id?: string
          image_urls?: string[]
          inspector_id?: string | null
          is_demo?: boolean
          item_id?: string | null
          label: string
          outcome?: Database["public"]["Enums"]["qc_outcome"]
          production_stage_id: string
          remarks?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          created_at?: string
          id?: string
          image_urls?: string[]
          inspector_id?: string | null
          is_demo?: boolean
          item_id?: string | null
          label?: string
          outcome?: Database["public"]["Enums"]["qc_outcome"]
          production_stage_id?: string
          remarks?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_results_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "qc_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_results_production_stage_id_fkey"
            columns: ["production_stage_id"]
            isOneToOne: false
            referencedRelation: "production_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_results_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "qc_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_template_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          label: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          label: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          label?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "qc_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_templates: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          family_id: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sort_order: number
          stage_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          created_by?: string | null
          family_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sort_order?: number
          stage_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          family_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sort_order?: number
          stage_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_templates_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_grades: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rank: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rank?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rank?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          is_demo: boolean
          line_total: number
          product_id: string | null
          quantity: number
          quote_id: string
          sort_order: number
          tax_pct: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_demo?: boolean
          line_total?: number
          product_id?: string | null
          quantity?: number
          quote_id: string
          sort_order?: number
          tax_pct?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_demo?: boolean
          line_total?: number
          product_id?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          tax_pct?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string
          enquiry_id: string | null
          estimate_id: string | null
          external_ref: string | null
          id: string
          is_demo: boolean
          issue_date: string
          notes: string | null
          project_id: string
          quote_no: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          terms: string | null
          total: number
          updated_at: string
          valid_until: string | null
          workflow_state: Json | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id: string
          enquiry_id?: string | null
          estimate_id?: string | null
          external_ref?: string | null
          id?: string
          is_demo?: boolean
          issue_date?: string
          notes?: string | null
          project_id: string
          quote_no: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
          workflow_state?: Json | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string
          enquiry_id?: string | null
          estimate_id?: string | null
          external_ref?: string | null
          id?: string
          is_demo?: boolean
          issue_date?: string
          notes?: string | null
          project_id?: string
          quote_no?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
          workflow_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          receipt_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          receipt_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          account_used: string | null
          allocated_amount: number
          amount: number
          attachment_file_id: string | null
          bank_charges: number
          bank_name: string | null
          cheque_date: string | null
          cheque_no: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string
          id: string
          is_demo: boolean
          method: Database["public"]["Enums"]["payment_method"]
          net_amount: number | null
          provider: string | null
          provider_ref: string | null
          receipt_no: string
          received_at: string
          received_by: string | null
          reference_no: string | null
          remarks: string | null
          status: string
          tds_amount: number
          unallocated_amount: number | null
          updated_at: string
        }
        Insert: {
          account_used?: string | null
          allocated_amount?: number
          amount: number
          attachment_file_id?: string | null
          bank_charges?: number
          bank_name?: string | null
          cheque_date?: string | null
          cheque_no?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id: string
          id?: string
          is_demo?: boolean
          method: Database["public"]["Enums"]["payment_method"]
          net_amount?: number | null
          provider?: string | null
          provider_ref?: string | null
          receipt_no?: string
          received_at?: string
          received_by?: string | null
          reference_no?: string | null
          remarks?: string | null
          status?: string
          tds_amount?: number
          unallocated_amount?: number | null
          updated_at?: string
        }
        Update: {
          account_used?: string | null
          allocated_amount?: number
          amount?: number
          attachment_file_id?: string | null
          bank_charges?: number
          bank_name?: string | null
          cheque_date?: string | null
          cheque_no?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string
          id?: string
          is_demo?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          net_amount?: number | null
          provider?: string | null
          provider_ref?: string | null
          receipt_no?: string
          received_at?: string
          received_by?: string | null
          reference_no?: string | null
          remarks?: string | null
          status?: string
          tds_amount?: number
          unallocated_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_attachment_file_id_fkey"
            columns: ["attachment_file_id"]
            isOneToOne: false
            referencedRelation: "file_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          bank_name: string | null
          created_at: string
          created_by: string | null
          credit_note_id: string | null
          customer_id: string
          id: string
          is_demo: boolean
          method: Database["public"]["Enums"]["payment_method"]
          receipt_id: string | null
          reference_no: string | null
          refund_no: string
          refunded_at: string
          remarks: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_id?: string | null
          customer_id: string
          id?: string
          is_demo?: boolean
          method: Database["public"]["Enums"]["payment_method"]
          receipt_id?: string | null
          reference_no?: string | null
          refund_no?: string
          refunded_at?: string
          remarks?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_id?: string | null
          customer_id?: string
          id?: string
          is_demo?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          receipt_id?: string | null
          reference_no?: string | null
          refund_no?: string
          refunded_at?: string
          remarks?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          enquiry_item_id: string | null
          id: string
          is_demo: boolean
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          rfq_id: string
          sort_order: number
          specs: string | null
          unit: Database["public"]["Enums"]["product_unit"]
        }
        Insert: {
          enquiry_item_id?: string | null
          id?: string
          is_demo?: boolean
          product_id?: string | null
          product_name_snapshot: string
          quantity: number
          rfq_id: string
          sort_order?: number
          specs?: string | null
          unit?: Database["public"]["Enums"]["product_unit"]
        }
        Update: {
          enquiry_item_id?: string | null
          id?: string
          is_demo?: boolean
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          rfq_id?: string
          sort_order?: number
          specs?: string | null
          unit?: Database["public"]["Enums"]["product_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_enquiry_item_id_fkey"
            columns: ["enquiry_item_id"]
            isOneToOne: false
            referencedRelation: "enquiry_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          due_date: string | null
          enquiry_id: string
          external_ref: Json | null
          id: string
          is_demo: boolean
          notes: string | null
          project_id: string
          rfq_no: string
          status: Database["public"]["Enums"]["rfq_status"]
          updated_at: string
          workflow_state: Json | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          due_date?: string | null
          enquiry_id: string
          external_ref?: Json | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          project_id: string
          rfq_no: string
          status?: Database["public"]["Enums"]["rfq_status"]
          updated_at?: string
          workflow_state?: Json | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          due_date?: string | null
          enquiry_id?: string
          external_ref?: Json | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          project_id?: string
          rfq_no?: string
          status?: Database["public"]["Enums"]["rfq_status"]
          updated_at?: string
          workflow_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          customer_id: string | null
          delivery_date: string | null
          external_ref: string | null
          id: string
          is_demo: boolean
          notes: string | null
          order_date: string
          project_id: string | null
          quote_id: string | null
          so_no: string
          status: Database["public"]["Enums"]["sales_order_status"]
          updated_at: string
          workflow_state: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          external_ref?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          order_date?: string
          project_id?: string | null
          quote_id?: string | null
          so_no: string
          status?: Database["public"]["Enums"]["sales_order_status"]
          updated_at?: string
          workflow_state?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          external_ref?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          order_date?: string
          project_id?: string | null
          quote_id?: string | null
          so_no?: string
          status?: Database["public"]["Enums"]["sales_order_status"]
          updated_at?: string
          workflow_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          attendees: string[] | null
          conducted_at: string | null
          conducted_by: string | null
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          project_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["site_visit_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          conducted_at?: string | null
          conducted_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          project_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["site_visit_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          conducted_at?: string | null
          conducted_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          project_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["site_visit_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stone_colours: {
        Row: {
          code: string
          created_at: string
          family: string | null
          hex: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          family?: string | null
          hex?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          family?: string | null
          hex?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      stone_origins: {
        Row: {
          code: string
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          region: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          region?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          region?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      stone_types: {
        Row: {
          code: string
          created_at: string
          density_kg_m3: number | null
          id: string
          indoor_ok: boolean
          is_active: boolean
          mohs_hardness: number | null
          name: string
          notes: string | null
          outdoor_ok: boolean
          recommended_applications: string[]
          slip_rating: string | null
          sort_order: number
          updated_at: string
          uv_resistance: string | null
          water_absorption_pct: number | null
          weather_resistance: string | null
        }
        Insert: {
          code: string
          created_at?: string
          density_kg_m3?: number | null
          id?: string
          indoor_ok?: boolean
          is_active?: boolean
          mohs_hardness?: number | null
          name: string
          notes?: string | null
          outdoor_ok?: boolean
          recommended_applications?: string[]
          slip_rating?: string | null
          sort_order?: number
          updated_at?: string
          uv_resistance?: string | null
          water_absorption_pct?: number | null
          weather_resistance?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          density_kg_m3?: number | null
          id?: string
          indoor_ok?: boolean
          is_active?: boolean
          mohs_hardness?: number | null
          name?: string
          notes?: string | null
          outdoor_ok?: boolean
          recommended_applications?: string[]
          slip_rating?: string | null
          sort_order?: number
          updated_at?: string
          uv_resistance?: string | null
          water_absorption_pct?: number | null
          weather_resistance?: string | null
        }
        Relationships: []
      }
      surface_finishes: {
        Row: {
          anti_slip: boolean
          applicable_stone_type_ids: string[]
          code: string
          cost_multiplier: number
          created_at: string
          id: string
          indoor_ok: boolean
          is_active: boolean
          lead_time_days_delta: number
          name: string
          notes: string | null
          outdoor_ok: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          anti_slip?: boolean
          applicable_stone_type_ids?: string[]
          code: string
          cost_multiplier?: number
          created_at?: string
          id?: string
          indoor_ok?: boolean
          is_active?: boolean
          lead_time_days_delta?: number
          name: string
          notes?: string | null
          outdoor_ok?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          anti_slip?: boolean
          applicable_stone_type_ids?: string[]
          code?: string
          cost_multiplier?: number
          created_at?: string
          id?: string
          indoor_ok?: boolean
          is_active?: boolean
          lead_time_days_delta?: number
          name?: string
          notes?: string | null
          outdoor_ok?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_demo: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_demo?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_demo?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      thicknesses: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_slab_std: boolean
          is_veneer: boolean
          mm: number
          name: string
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_slab_std?: boolean
          is_veneer?: boolean
          mm: number
          name: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_slab_std?: boolean
          is_veneer?: boolean
          mm?: number
          name?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      uoms: {
        Row: {
          code: string
          created_at: string
          dimension: string
          factor_to_base: number | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sort_order: number
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          dimension: string
          factor_to_base?: number | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sort_order?: number
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          dimension?: string
          factor_to_base?: number | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sort_order?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_capabilities: {
        Row: {
          capability: Database["public"]["Enums"]["vendor_capability"]
          notes: string | null
          vendor_id: string
        }
        Insert: {
          capability: Database["public"]["Enums"]["vendor_capability"]
          notes?: string | null
          vendor_id: string
        }
        Update: {
          capability?: Database["public"]["Enums"]["vendor_capability"]
          notes?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_capabilities_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_contacts: {
        Row: {
          created_at: string
          designation: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          vendor_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          vendor_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          vendor_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_finishes: {
        Row: {
          surface_finish_id: string
          vendor_id: string
        }
        Insert: {
          surface_finish_id: string
          vendor_id: string
        }
        Update: {
          surface_finish_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_finishes_surface_finish_id_fkey"
            columns: ["surface_finish_id"]
            isOneToOne: false
            referencedRelation: "surface_finishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_finishes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_performance_cache: {
        Row: {
          approval_pct: number
          avg_dispatch_days: number | null
          avg_response_hours: number | null
          completion_pct: number
          delay_pct: number
          is_preferred: boolean
          last_order_at: string | null
          last_rfq_at: string | null
          orders_count: number
          purchase_value: number
          quotes_approved: number
          quotes_submitted: number
          recomputed_at: string
          rfqs_received: number
          score: number
          vendor_id: string
        }
        Insert: {
          approval_pct?: number
          avg_dispatch_days?: number | null
          avg_response_hours?: number | null
          completion_pct?: number
          delay_pct?: number
          is_preferred?: boolean
          last_order_at?: string | null
          last_rfq_at?: string | null
          orders_count?: number
          purchase_value?: number
          quotes_approved?: number
          quotes_submitted?: number
          recomputed_at?: string
          rfqs_received?: number
          score?: number
          vendor_id: string
        }
        Update: {
          approval_pct?: number
          avg_dispatch_days?: number | null
          avg_response_hours?: number | null
          completion_pct?: number
          delay_pct?: number
          is_preferred?: boolean
          last_order_at?: string | null
          last_rfq_at?: string | null
          orders_count?: number
          purchase_value?: number
          quotes_approved?: number
          quotes_submitted?: number
          recomputed_at?: string
          rfqs_received?: number
          score?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_performance_cache_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_product_categories: {
        Row: {
          category_id: string
          vendor_id: string
        }
        Insert: {
          category_id: string
          vendor_id: string
        }
        Update: {
          category_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_products: {
        Row: {
          lead_time_days: number | null
          price_per_unit: number | null
          product_id: string
          remarks: string | null
          vendor_id: string
        }
        Insert: {
          lead_time_days?: number | null
          price_per_unit?: number | null
          product_id: string
          remarks?: string | null
          vendor_id: string
        }
        Update: {
          lead_time_days?: number | null
          price_per_unit?: number | null
          product_id?: string
          remarks?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_quote_items: {
        Row: {
          id: string
          is_demo: boolean
          line_total: number | null
          price_per_unit: number
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          remarks: string | null
          rfq_item_id: string | null
          unit: Database["public"]["Enums"]["product_unit"]
          vendor_quote_id: string
        }
        Insert: {
          id?: string
          is_demo?: boolean
          line_total?: number | null
          price_per_unit?: number
          product_id?: string | null
          product_name_snapshot: string
          quantity?: number
          remarks?: string | null
          rfq_item_id?: string | null
          unit?: Database["public"]["Enums"]["product_unit"]
          vendor_quote_id: string
        }
        Update: {
          id?: string
          is_demo?: boolean
          line_total?: number | null
          price_per_unit?: number
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          remarks?: string | null
          rfq_item_id?: string | null
          unit?: Database["public"]["Enums"]["product_unit"]
          vendor_quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quote_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quote_items_vendor_quote_id_fkey"
            columns: ["vendor_quote_id"]
            isOneToOne: false
            referencedRelation: "vendor_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_quotes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency_code: string
          dispatch_days: number | null
          external_ref: Json | null
          freight_inr: number
          gst_included: boolean
          id: string
          is_approved: boolean
          is_demo: boolean
          quote_no: string | null
          quote_pdf_file_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          remarks: string | null
          revision_of: string | null
          stock_available: boolean | null
          submitted_at: string
          submitted_by: string | null
          total_inr: number
          updated_at: string
          valid_until: string | null
          vendor_request_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency_code?: string
          dispatch_days?: number | null
          external_ref?: Json | null
          freight_inr?: number
          gst_included?: boolean
          id?: string
          is_approved?: boolean
          is_demo?: boolean
          quote_no?: string | null
          quote_pdf_file_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          remarks?: string | null
          revision_of?: string | null
          stock_available?: boolean | null
          submitted_at?: string
          submitted_by?: string | null
          total_inr?: number
          updated_at?: string
          valid_until?: string | null
          vendor_request_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency_code?: string
          dispatch_days?: number | null
          external_ref?: Json | null
          freight_inr?: number
          gst_included?: boolean
          id?: string
          is_approved?: boolean
          is_demo?: boolean
          quote_no?: string | null
          quote_pdf_file_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          remarks?: string | null
          revision_of?: string | null
          stock_available?: boolean | null
          submitted_at?: string
          submitted_by?: string | null
          total_inr?: number
          updated_at?: string
          valid_until?: string | null
          vendor_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_quotes_quote_pdf_file_id_fkey"
            columns: ["quote_pdf_file_id"]
            isOneToOne: false
            referencedRelation: "file_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quotes_revision_of_fkey"
            columns: ["revision_of"]
            isOneToOne: false
            referencedRelation: "vendor_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quotes_vendor_request_id_fkey"
            columns: ["vendor_request_id"]
            isOneToOne: true
            referencedRelation: "vendor_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_requests: {
        Row: {
          created_at: string
          first_viewed_at: string | null
          id: string
          is_demo: boolean
          last_reminder_at: string | null
          notes: string | null
          reminder_count: number
          response_status: Database["public"]["Enums"]["vendor_request_status"]
          revision_note: string | null
          revision_requested_at: string | null
          rfq_id: string
          sent_at: string | null
          sent_by: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          first_viewed_at?: string | null
          id?: string
          is_demo?: boolean
          last_reminder_at?: string | null
          notes?: string | null
          reminder_count?: number
          response_status?: Database["public"]["Enums"]["vendor_request_status"]
          revision_note?: string | null
          revision_requested_at?: string | null
          rfq_id: string
          sent_at?: string | null
          sent_by?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          first_viewed_at?: string | null
          id?: string
          is_demo?: boolean
          last_reminder_at?: string | null
          notes?: string | null
          reminder_count?: number
          response_status?: Database["public"]["Enums"]["vendor_request_status"]
          revision_note?: string | null
          revision_requested_at?: string | null
          rfq_id?: string
          sent_at?: string | null
          sent_by?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_requests_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_rfq_views: {
        Row: {
          id: string
          user_id: string
          vendor_request_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vendor_request_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vendor_request_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_rfq_views_vendor_request_id_fkey"
            columns: ["vendor_request_id"]
            isOneToOne: false
            referencedRelation: "vendor_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_stone_types: {
        Row: {
          stone_type_id: string
          vendor_id: string
        }
        Insert: {
          stone_type_id: string
          vendor_id: string
        }
        Update: {
          stone_type_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_stone_types_stone_type_id_fkey"
            columns: ["stone_type_id"]
            isOneToOne: false
            referencedRelation: "stone_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_stone_types_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_tags: {
        Row: {
          tag_id: string
          vendor_id: string
        }
        Insert: {
          tag_id: string
          vendor_id: string
        }
        Update: {
          tag_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_tags_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_users: {
        Row: {
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["vendor_portal_role"]
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["vendor_portal_role"]
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["vendor_portal_role"]
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_users_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          city: string | null
          company_id: string | null
          company_name: string
          country: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          daily_capacity: number | null
          daily_capacity_uom: string | null
          external_ref: Json | null
          gst_number: string | null
          id: string
          ifsc: string | null
          is_active: boolean
          is_demo: boolean
          lead_time_days: number | null
          max_slab_length_mm: number | null
          max_slab_width_mm: number | null
          moq: number | null
          moq_uom: string | null
          notes: string | null
          pan: string | null
          payment_terms: string | null
          pincode: string | null
          preferred_transport:
            | Database["public"]["Enums"]["preferred_transport"]
            | null
          quality_rating: number | null
          rating: number | null
          state: string | null
          updated_at: string
          vendor_code: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          city?: string | null
          company_id?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          daily_capacity?: number | null
          daily_capacity_uom?: string | null
          external_ref?: Json | null
          gst_number?: string | null
          id?: string
          ifsc?: string | null
          is_active?: boolean
          is_demo?: boolean
          lead_time_days?: number | null
          max_slab_length_mm?: number | null
          max_slab_width_mm?: number | null
          moq?: number | null
          moq_uom?: string | null
          notes?: string | null
          pan?: string | null
          payment_terms?: string | null
          pincode?: string | null
          preferred_transport?:
            | Database["public"]["Enums"]["preferred_transport"]
            | null
          quality_rating?: number | null
          rating?: number | null
          state?: string | null
          updated_at?: string
          vendor_code: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          city?: string | null
          company_id?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          daily_capacity?: number | null
          daily_capacity_uom?: string | null
          external_ref?: Json | null
          gst_number?: string | null
          id?: string
          ifsc?: string | null
          is_active?: boolean
          is_demo?: boolean
          lead_time_days?: number | null
          max_slab_length_mm?: number | null
          max_slab_width_mm?: number | null
          moq?: number | null
          moq_uom?: string | null
          notes?: string | null
          pan?: string | null
          payment_terms?: string | null
          pincode?: string | null
          preferred_transport?:
            | Database["public"]["Enums"]["preferred_transport"]
            | null
          quality_rating?: number | null
          rating?: number | null
          state?: string | null
          updated_at?: string
          vendor_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_ledger: {
        Row: {
          credit: number | null
          customer_id: string | null
          debit: number | null
          entry_date: string | null
          entry_type: string | null
          ref_id: string | null
          ref_no: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      convert_quote_to_invoice: {
        Args: { p_due_date?: string; p_quote_id: string }
        Returns: {
          amount_paid: number
          balance_due: number
          company_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string
          due_date: string | null
          external_ref: string | null
          id: string
          invoice_no: string
          is_demo: boolean
          issue_date: string
          notes: string | null
          project_id: string
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          terms: string | null
          total: number
          updated_at: string
          workflow_state: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_demo_mode: { Args: never; Returns: boolean }
      current_vendor_id: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_access: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_of: {
        Args: { _user_id: string; _vendor_id: string }
        Returns: boolean
      }
      log_notification_event: {
        Args: {
          _entity_id: string
          _entity_type: string
          _event: Database["public"]["Enums"]["notification_event"]
          _payload?: Json
        }
        Returns: string
      }
      next_code: { Args: { _prefix: string }; Returns: string }
      recalc_estimate_totals: {
        Args: { _estimate_id: string }
        Returns: undefined
      }
      recalc_invoice_totals: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      recalc_invoice_with_receipts: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      recalc_quote_totals: { Args: { _quote_id: string }; Returns: undefined }
      recalc_vendor_performance: {
        Args: { _vendor_id: string }
        Returns: undefined
      }
      recommend_vendors_for_rfq: {
        Args: { p_rfq_id: string }
        Returns: {
          approval_pct: number
          avg_response_hours: number
          capability_match_count: number
          city: string
          company_name: string
          is_preferred: boolean
          lead_time_days: number
          orders_count: number
          rating: number
          score: number
          stone_match: boolean
          vendor_code: string
          vendor_id: string
        }[]
      }
      reset_demo_data: { Args: never; Returns: undefined }
      seed_demo_data: { Args: never; Returns: undefined }
      send_rfq: {
        Args: {
          p_due_date: string
          p_enquiry_id: string
          p_notes?: string
          p_vendor_ids: string[]
        }
        Returns: {
          company_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          due_date: string | null
          enquiry_id: string
          external_ref: Json | null
          id: string
          is_demo: boolean
          notes: string | null
          project_id: string
          rfq_no: string
          status: Database["public"]["Enums"]["rfq_status"]
          updated_at: string
          workflow_state: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "rfqs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_to_manufacturing: {
        Args: { p_sales_order_id: string }
        Returns: {
          bundle_no: string | null
          completed_at: string | null
          crate_no: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          drawing_ref: string | null
          elevation: string | null
          enquiry_id: string | null
          id: string
          install_sequence: number | null
          is_demo: boolean
          mfg_no: string
          notes: string | null
          planned_end: string | null
          planned_start: string | null
          product_id: string
          project_id: string | null
          quantity: number
          revision: string | null
          room: string | null
          sales_order_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["production_status"]
          unit: string
          updated_at: string
          wall: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "production_orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      activity_action:
        | "created"
        | "updated"
        | "deleted"
        | "status_changed"
        | "assigned"
        | "file_uploaded"
        | "rfq_sent"
        | "quote_received"
        | "quote_approved"
        | "followup_completed"
        | "note_added"
        | "quote_sent"
        | "quote_accepted"
        | "invoice_issued"
        | "payment_received"
      app_role: "admin" | "sales_manager" | "sales" | "purchase"
      contact_designation:
        | "owner"
        | "architect"
        | "purchase_manager"
        | "site_engineer"
        | "accounts"
        | "procurement"
        | "other"
      customer_type:
        | "builder"
        | "architect"
        | "interior_designer"
        | "contractor"
        | "individual"
        | "company"
        | "government"
        | "other"
      dispatch_status: "planned" | "in_transit" | "delivered" | "cancelled"
      enquiry_priority: "low" | "normal" | "high" | "urgent"
      estimate_document_kind:
        | "customer_pdf"
        | "cost_sheet_pdf"
        | "whatsapp_text"
        | "email_html"
      estimate_item_category:
        | "material"
        | "manufacturing"
        | "installation"
        | "consumable"
        | "other"
      estimate_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
        | "cancelled"
      estimate_template:
        | "material_supply"
        | "material_install"
        | "custom_articles"
        | "custom_manufacturing"
      file_folder:
        | "product_image"
        | "site_image"
        | "drawing"
        | "boq"
        | "quotation"
        | "purchase_order"
        | "invoice"
        | "delivery_challan"
        | "transport_document"
        | "sample_photo"
        | "reference"
        | "other"
      followup_channel: "call" | "whatsapp" | "email" | "meeting" | "site_visit"
      followup_status: "pending" | "done" | "snoozed" | "missed" | "cancelled"
      installation_status:
        | "ready"
        | "packed"
        | "loaded"
        | "dispatched"
        | "delivered"
        | "installed"
        | "damaged"
        | "replacement_required"
        | "replaced"
        | "returned"
      invoice_status:
        | "draft"
        | "sent"
        | "partially_paid"
        | "paid"
        | "cancelled"
        | "overdue"
      lead_stage:
        | "new_lead"
        | "contacted"
        | "site_visit_scheduled"
        | "site_visit_completed"
        | "sample_sent"
        | "customer_quotation_sent"
        | "negotiation"
        | "rfq_sent"
        | "vendor_quote_received"
        | "vendor_approved"
        | "customer_approved"
        | "production"
        | "dispatch"
        | "completed"
        | "lost"
        | "cancelled"
      notification_channel: "email" | "whatsapp" | "sms" | "push"
      notification_event:
        | "RFQ_CREATED"
        | "RFQ_REMINDER"
        | "QUOTE_SUBMITTED"
        | "QUOTE_UPDATED"
        | "QUOTE_APPROVED"
        | "QUOTE_REJECTED"
        | "ORDER_CONFIRMED"
        | "PRODUCTION_STARTED"
        | "DISPATCH_REQUESTED"
        | "DISPATCH_COMPLETED"
        | "REVISION_REQUESTED"
      notification_status: "pending" | "sent" | "failed" | "skipped"
      payment_link_status:
        | "created"
        | "sent"
        | "partially_paid"
        | "paid"
        | "cancelled"
        | "expired"
      payment_method:
        | "razorpay"
        | "bank_transfer"
        | "upi_manual"
        | "cheque"
        | "cash"
        | "other"
        | "neft"
        | "rtgs"
        | "imps"
        | "card"
        | "gateway"
      preferred_transport: "road" | "rail" | "sea" | "air" | "mixed"
      product_unit:
        | "sqft"
        | "sqm"
        | "piece"
        | "slab"
        | "linear_ft"
        | "linear_m"
        | "cbm"
      production_status:
        | "planned"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
      project_type:
        | "residential"
        | "commercial"
        | "hospitality"
        | "healthcare"
        | "institutional"
        | "industrial"
        | "villa"
        | "apartment"
        | "other"
      purchase_order_status:
        | "draft"
        | "sent"
        | "acknowledged"
        | "partially_received"
        | "received"
        | "cancelled"
      qc_outcome:
        | "pass"
        | "fail"
        | "rework"
        | "approved"
        | "rejected"
        | "not_checked"
      quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
      rfq_status:
        | "draft"
        | "sent"
        | "partially_received"
        | "fully_received"
        | "closed"
        | "cancelled"
      sales_order_status:
        | "draft"
        | "confirmed"
        | "in_production"
        | "ready"
        | "shipped"
        | "delivered"
        | "cancelled"
      site_visit_status: "scheduled" | "completed" | "cancelled" | "rescheduled"
      stage_owner: "vendor" | "employee" | "either"
      stone_finish:
        | "polished"
        | "honed"
        | "leather"
        | "flamed"
        | "brushed"
        | "sandblasted"
        | "bush_hammered"
        | "antique"
        | "other"
      stone_type:
        | "marble"
        | "granite"
        | "quartz"
        | "sandstone"
        | "limestone"
        | "travertine"
        | "onyx"
        | "slate"
        | "engineered"
        | "other"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "overdue"
      vendor_capability:
        | "cnc"
        | "waterjet"
        | "inlay"
        | "flexible_stone"
        | "calibration"
        | "edge_processing"
        | "polishing"
        | "metal_inlay"
        | "sculpture"
        | "rockface"
        | "splitface"
        | "shot_blast"
        | "bush_hammer"
        | "polished"
        | "honed"
        | "leather"
        | "bevel"
        | "bullnose"
        | "brass_inlay"
        | "semi_precious_inlay"
      vendor_portal_role: "vendor_owner" | "vendor_member"
      vendor_request_status:
        | "pending"
        | "submitted"
        | "declined"
        | "expired"
        | "closed_lost"
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
      activity_action: [
        "created",
        "updated",
        "deleted",
        "status_changed",
        "assigned",
        "file_uploaded",
        "rfq_sent",
        "quote_received",
        "quote_approved",
        "followup_completed",
        "note_added",
        "quote_sent",
        "quote_accepted",
        "invoice_issued",
        "payment_received",
      ],
      app_role: ["admin", "sales_manager", "sales", "purchase"],
      contact_designation: [
        "owner",
        "architect",
        "purchase_manager",
        "site_engineer",
        "accounts",
        "procurement",
        "other",
      ],
      customer_type: [
        "builder",
        "architect",
        "interior_designer",
        "contractor",
        "individual",
        "company",
        "government",
        "other",
      ],
      dispatch_status: ["planned", "in_transit", "delivered", "cancelled"],
      enquiry_priority: ["low", "normal", "high", "urgent"],
      estimate_document_kind: [
        "customer_pdf",
        "cost_sheet_pdf",
        "whatsapp_text",
        "email_html",
      ],
      estimate_item_category: [
        "material",
        "manufacturing",
        "installation",
        "consumable",
        "other",
      ],
      estimate_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
        "cancelled",
      ],
      estimate_template: [
        "material_supply",
        "material_install",
        "custom_articles",
        "custom_manufacturing",
      ],
      file_folder: [
        "product_image",
        "site_image",
        "drawing",
        "boq",
        "quotation",
        "purchase_order",
        "invoice",
        "delivery_challan",
        "transport_document",
        "sample_photo",
        "reference",
        "other",
      ],
      followup_channel: ["call", "whatsapp", "email", "meeting", "site_visit"],
      followup_status: ["pending", "done", "snoozed", "missed", "cancelled"],
      installation_status: [
        "ready",
        "packed",
        "loaded",
        "dispatched",
        "delivered",
        "installed",
        "damaged",
        "replacement_required",
        "replaced",
        "returned",
      ],
      invoice_status: [
        "draft",
        "sent",
        "partially_paid",
        "paid",
        "cancelled",
        "overdue",
      ],
      lead_stage: [
        "new_lead",
        "contacted",
        "site_visit_scheduled",
        "site_visit_completed",
        "sample_sent",
        "customer_quotation_sent",
        "negotiation",
        "rfq_sent",
        "vendor_quote_received",
        "vendor_approved",
        "customer_approved",
        "production",
        "dispatch",
        "completed",
        "lost",
        "cancelled",
      ],
      notification_channel: ["email", "whatsapp", "sms", "push"],
      notification_event: [
        "RFQ_CREATED",
        "RFQ_REMINDER",
        "QUOTE_SUBMITTED",
        "QUOTE_UPDATED",
        "QUOTE_APPROVED",
        "QUOTE_REJECTED",
        "ORDER_CONFIRMED",
        "PRODUCTION_STARTED",
        "DISPATCH_REQUESTED",
        "DISPATCH_COMPLETED",
        "REVISION_REQUESTED",
      ],
      notification_status: ["pending", "sent", "failed", "skipped"],
      payment_link_status: [
        "created",
        "sent",
        "partially_paid",
        "paid",
        "cancelled",
        "expired",
      ],
      payment_method: [
        "razorpay",
        "bank_transfer",
        "upi_manual",
        "cheque",
        "cash",
        "other",
        "neft",
        "rtgs",
        "imps",
        "card",
        "gateway",
      ],
      preferred_transport: ["road", "rail", "sea", "air", "mixed"],
      product_unit: [
        "sqft",
        "sqm",
        "piece",
        "slab",
        "linear_ft",
        "linear_m",
        "cbm",
      ],
      production_status: [
        "planned",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
      project_type: [
        "residential",
        "commercial",
        "hospitality",
        "healthcare",
        "institutional",
        "industrial",
        "villa",
        "apartment",
        "other",
      ],
      purchase_order_status: [
        "draft",
        "sent",
        "acknowledged",
        "partially_received",
        "received",
        "cancelled",
      ],
      qc_outcome: [
        "pass",
        "fail",
        "rework",
        "approved",
        "rejected",
        "not_checked",
      ],
      quote_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
      ],
      rfq_status: [
        "draft",
        "sent",
        "partially_received",
        "fully_received",
        "closed",
        "cancelled",
      ],
      sales_order_status: [
        "draft",
        "confirmed",
        "in_production",
        "ready",
        "shipped",
        "delivered",
        "cancelled",
      ],
      site_visit_status: ["scheduled", "completed", "cancelled", "rescheduled"],
      stage_owner: ["vendor", "employee", "either"],
      stone_finish: [
        "polished",
        "honed",
        "leather",
        "flamed",
        "brushed",
        "sandblasted",
        "bush_hammered",
        "antique",
        "other",
      ],
      stone_type: [
        "marble",
        "granite",
        "quartz",
        "sandstone",
        "limestone",
        "travertine",
        "onyx",
        "slate",
        "engineered",
        "other",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "overdue",
      ],
      vendor_capability: [
        "cnc",
        "waterjet",
        "inlay",
        "flexible_stone",
        "calibration",
        "edge_processing",
        "polishing",
        "metal_inlay",
        "sculpture",
        "rockface",
        "splitface",
        "shot_blast",
        "bush_hammer",
        "polished",
        "honed",
        "leather",
        "bevel",
        "bullnose",
        "brass_inlay",
        "semi_precious_inlay",
      ],
      vendor_portal_role: ["vendor_owner", "vendor_member"],
      vendor_request_status: [
        "pending",
        "submitted",
        "declined",
        "expired",
        "closed_lost",
      ],
    },
  },
} as const
