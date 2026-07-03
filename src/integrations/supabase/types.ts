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
      comments: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
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
      dispatches: {
        Row: {
          carrier: string | null
          created_at: string
          created_by: string | null
          dispatch_date: string
          dispatch_no: string
          id: string
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
      favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
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
          external_ref: Json | null
          id: string
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
          external_ref?: Json | null
          id?: string
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
          external_ref?: Json | null
          id?: string
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
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          notes: string | null
          product_id: string | null
          quantity_on_hand: number
          reorder_level: number
          stock_code: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          product_id?: string | null
          quantity_on_hand?: number
          reorder_level?: number
          stock_code: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          product_id?: string | null
          quantity_on_hand?: number
          reorder_level?: number
          stock_code?: string
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
      payment_links: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency_code: string
          expires_at: string | null
          id: string
          invoice_id: string
          link_no: string
          provider: string
          provider_link_id: string | null
          short_url: string | null
          status: Database["public"]["Enums"]["payment_link_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          expires_at?: string | null
          id?: string
          invoice_id: string
          link_no: string
          provider?: string
          provider_link_id?: string | null
          short_url?: string | null
          status?: Database["public"]["Enums"]["payment_link_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          expires_at?: string | null
          id?: string
          invoice_id?: string
          link_no?: string
          provider?: string
          provider_link_id?: string | null
          short_url?: string | null
          status?: Database["public"]["Enums"]["payment_link_status"]
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
      products: {
        Row: {
          category_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          default_unit: Database["public"]["Enums"]["product_unit"]
          description: string | null
          external_ref: Json | null
          finish: Database["public"]["Enums"]["stone_finish"] | null
          hsn_code: string | null
          id: string
          is_active: boolean
          name: string
          origin_country: string | null
          product_code: string
          stone_type: Database["public"]["Enums"]["stone_type"] | null
          thickness_mm: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          default_unit?: Database["public"]["Enums"]["product_unit"]
          description?: string | null
          external_ref?: Json | null
          finish?: Database["public"]["Enums"]["stone_finish"] | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          origin_country?: string | null
          product_code: string
          stone_type?: Database["public"]["Enums"]["stone_type"] | null
          thickness_mm?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          default_unit?: Database["public"]["Enums"]["product_unit"]
          description?: string | null
          external_ref?: Json | null
          finish?: Database["public"]["Enums"]["stone_finish"] | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          origin_country?: string | null
          product_code?: string
          stone_type?: Database["public"]["Enums"]["stone_type"] | null
          thickness_mm?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
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
          project_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
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
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
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
          external_ref: string | null
          id: string
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
          external_ref?: string | null
          id?: string
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
          external_ref?: string | null
          id?: string
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
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          enquiry_item_id: string | null
          id: string
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
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
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
          external_ref: Json | null
          gst_number: string | null
          id: string
          ifsc: string | null
          is_active: boolean
          lead_time_days: number | null
          notes: string | null
          pan: string | null
          payment_terms: string | null
          pincode: string | null
          preferred_transport:
            | Database["public"]["Enums"]["preferred_transport"]
            | null
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
          external_ref?: Json | null
          gst_number?: string | null
          id?: string
          ifsc?: string | null
          is_active?: boolean
          lead_time_days?: number | null
          notes?: string | null
          pan?: string | null
          payment_terms?: string | null
          pincode?: string | null
          preferred_transport?:
            | Database["public"]["Enums"]["preferred_transport"]
            | null
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
          external_ref?: Json | null
          gst_number?: string | null
          id?: string
          ifsc?: string | null
          is_active?: boolean
          lead_time_days?: number | null
          notes?: string | null
          pan?: string | null
          payment_terms?: string | null
          pincode?: string | null
          preferred_transport?:
            | Database["public"]["Enums"]["preferred_transport"]
            | null
          rating?: number | null
          state?: string | null
          updated_at?: string
          vendor_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
      recalc_invoice_totals: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      recalc_quote_totals: { Args: { _quote_id: string }; Returns: undefined }
      recalc_vendor_performance: {
        Args: { _vendor_id: string }
        Returns: undefined
      }
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
      preferred_transport: "road" | "rail" | "sea" | "air" | "mixed"
      product_unit:
        | "sqft"
        | "sqm"
        | "piece"
        | "slab"
        | "linear_ft"
        | "linear_m"
        | "cbm"
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
