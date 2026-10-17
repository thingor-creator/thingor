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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          is_custom: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_custom?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_custom?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          acquired_year: number | null
          catalog_number: string | null
          collection_id: string
          collector_grade: string | null
          created_at: string
          custom_attributes: Json
          estimated_collector_value: number | null
          id: string
          item_id: string
          rarity: string | null
        }
        Insert: {
          acquired_year?: number | null
          catalog_number?: string | null
          collection_id: string
          collector_grade?: string | null
          created_at?: string
          custom_attributes?: Json
          estimated_collector_value?: number | null
          id?: string
          item_id: string
          rarity?: string | null
        }
        Update: {
          acquired_year?: number | null
          catalog_number?: string | null
          collection_id?: string
          collector_grade?: string | null
          created_at?: string
          custom_attributes?: Json
          estimated_collector_value?: number | null
          id?: string
          item_id?: string
          rarity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          collection_type: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_type?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_type?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      container_items: {
        Row: {
          container_id: string
          created_at: string | null
          household_id: string | null
          id: string
          min_quantity: number | null
          name: string
          notes: string | null
          ownership_scope: string
          quantity: number
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          container_id: string
          created_at?: string | null
          household_id?: string | null
          id?: string
          min_quantity?: number | null
          name: string
          notes?: string | null
          ownership_scope?: string
          quantity?: number
          unit?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          container_id?: string
          created_at?: string | null
          household_id?: string | null
          id?: string
          min_quantity?: number | null
          name?: string
          notes?: string | null
          ownership_scope?: string
          quantity?: number
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "container_items_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "storage_containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          created_at: string | null
          expires_at: string | null
          household_id: string | null
          id: string
          invited_by: string | null
          invited_email: string
          role: string | null
          status: string | null
          title: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          household_id?: string | null
          id?: string
          invited_by?: string | null
          invited_email: string
          role?: string | null
          status?: string | null
          title?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          household_id?: string | null
          id?: string
          invited_by?: string | null
          invited_email?: string
          role?: string | null
          status?: string | null
          title?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          allowed_category_ids: string[] | null
          allowed_location_ids: string[] | null
          allowed_modules: Json | null
          excluded_item_ids: string[] | null
          household_id: string | null
          id: string
          joined_at: string | null
          role: string | null
          sharing_mode: string | null
          title: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          allowed_category_ids?: string[] | null
          allowed_location_ids?: string[] | null
          allowed_modules?: Json | null
          excluded_item_ids?: string[] | null
          household_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          sharing_mode?: string | null
          title?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          allowed_category_ids?: string[] | null
          allowed_location_ids?: string[] | null
          allowed_modules?: Json | null
          excluded_item_ids?: string[] | null
          household_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          sharing_mode?: string | null
          title?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          owner_id: string | null
          shared_category_ids: string[] | null
          shared_location_ids: string[] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          owner_id?: string | null
          shared_category_ids?: string[] | null
          shared_location_ids?: string[] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          shared_category_ids?: string[] | null
          shared_location_ids?: string[] | null
        }
        Relationships: []
      }
      item_documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_name: string
          file_url: string
          id: string
          is_vault_protected: boolean
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          is_vault_protected?: boolean
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          is_vault_protected?: boolean
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_documents_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_financings: {
        Row: {
          created_at: string | null
          down_payment: number | null
          end_date: string | null
          financed_amount: number
          id: string
          item_id: string | null
          monthly_installment: number
          next_payment_date: string | null
          notes: string | null
          original_price: number
          paid_installments: number | null
          provider: string
          remaining_debt: number
          remaining_installments: number
          start_date: string | null
          total_installments: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          down_payment?: number | null
          end_date?: string | null
          financed_amount: number
          id?: string
          item_id?: string | null
          monthly_installment: number
          next_payment_date?: string | null
          notes?: string | null
          original_price: number
          paid_installments?: number | null
          provider: string
          remaining_debt: number
          remaining_installments: number
          start_date?: string | null
          total_installments: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          down_payment?: number | null
          end_date?: string | null
          financed_amount?: number
          id?: string
          item_id?: string | null
          monthly_installment?: number
          next_payment_date?: string | null
          notes?: string | null
          original_price?: number
          paid_installments?: number | null
          provider?: string
          remaining_debt?: number
          remaining_installments?: number
          start_date?: string | null
          total_installments?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_financings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_loans: {
        Row: {
          actual_return_date: string | null
          borrower_contact: string | null
          borrower_email: string | null
          borrower_name: string
          created_at: string
          expected_return_date: string | null
          id: string
          item_id: string
          lent_date: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_return_date?: string | null
          borrower_contact?: string | null
          borrower_email?: string | null
          borrower_name: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          item_id: string
          lent_date?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_return_date?: string | null
          borrower_contact?: string | null
          borrower_email?: string | null
          borrower_name?: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          item_id?: string
          lent_date?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_loans_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_relations: {
        Row: {
          created_at: string | null
          id: string
          relation_type: string
          source_item_id: string | null
          target_item_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          relation_type?: string
          source_item_id?: string | null
          target_item_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          relation_type?: string
          source_item_id?: string | null
          target_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_relations_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_relations_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_repairs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          expected_completion: string | null
          fault_description: string | null
          fault_title: string
          id: string
          is_warranty: boolean | null
          item_id: string | null
          labor_cost: number | null
          notes: string | null
          parts_cost: number | null
          repairer_name: string | null
          reported_date: string
          status: string | null
          still_usable: boolean | null
          total_cost: number | null
          urgency: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          expected_completion?: string | null
          fault_description?: string | null
          fault_title: string
          id?: string
          is_warranty?: boolean | null
          item_id?: string | null
          labor_cost?: number | null
          notes?: string | null
          parts_cost?: number | null
          repairer_name?: string | null
          reported_date?: string
          status?: string | null
          still_usable?: boolean | null
          total_cost?: number | null
          urgency?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          expected_completion?: string | null
          fault_description?: string | null
          fault_title?: string
          id?: string
          is_warranty?: boolean | null
          item_id?: string | null
          labor_cost?: number | null
          notes?: string | null
          parts_cost?: number | null
          repairer_name?: string | null
          reported_date?: string
          status?: string | null
          still_usable?: boolean | null
          total_cost?: number | null
          urgency?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_repairs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_shares: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          item_id: string
          permissions: Json
          purpose: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          item_id: string
          permissions?: Json
          purpose?: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          item_id?: string
          permissions?: Json
          purpose?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_shares_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          additional_photos: string[] | null
          category_id: string | null
          condition: string
          container_id: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          household_id: string | null
          id: string
          is_vault_protected: boolean
          location_id: string | null
          name: string
          notes: string | null
          ownership_scope: string | null
          photo_url: string | null
          purchase_date: string | null
          purchase_price: number | null
          status: string | null
          store_seller: string | null
          updated_at: string | null
          user_id: string
          warranty_end: string | null
          warranty_start: string | null
        }
        Insert: {
          additional_photos?: string[] | null
          category_id?: string | null
          condition?: string
          container_id?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          household_id?: string | null
          id?: string
          is_vault_protected?: boolean
          location_id?: string | null
          name: string
          notes?: string | null
          ownership_scope?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string | null
          store_seller?: string | null
          updated_at?: string | null
          user_id: string
          warranty_end?: string | null
          warranty_start?: string | null
        }
        Update: {
          additional_photos?: string[] | null
          category_id?: string | null
          condition?: string
          container_id?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          household_id?: string | null
          id?: string
          is_vault_protected?: boolean
          location_id?: string | null
          name?: string
          notes?: string | null
          ownership_scope?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string | null
          store_seller?: string | null
          updated_at?: string | null
          user_id?: string
          warranty_end?: string | null
          warranty_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "storage_containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string | null
          household_id: string | null
          id: string
          name: string
          ownership_scope: string | null
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          household_id?: string | null
          id?: string
          name: string
          ownership_scope?: string | null
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          household_id?: string | null
          id?: string
          name?: string
          ownership_scope?: string | null
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          dedup_key: string | null
          description: string
          id: string
          is_read: boolean
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedup_key?: string | null
          description: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedup_key?: string | null
          description?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          category: string | null
          created_at: string
          current_quantity: number
          expiration_date: string | null
          household_id: string | null
          id: string
          is_staple: boolean
          location_id: string | null
          min_threshold: number
          name: string
          notes: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_quantity?: number
          expiration_date?: string | null
          household_id?: string | null
          id?: string
          is_staple?: boolean
          location_id?: string | null
          min_threshold?: number
          name: string
          notes?: string | null
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_quantity?: number
          expiration_date?: string | null
          household_id?: string | null
          id?: string
          is_staple?: boolean
          location_id?: string | null
          min_threshold?: number
          name?: string
          notes?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          preferences: Json | null
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          preferences?: Json | null
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          preferences?: Json | null
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_notes: {
        Row: {
          content: string
          converted_item_id: string | null
          created_at: string | null
          id: string
          is_converted: boolean | null
          location_hint: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          converted_item_id?: string | null
          created_at?: string | null
          id?: string
          is_converted?: boolean | null
          location_hint?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          converted_item_id?: string | null
          created_at?: string | null
          id?: string
          is_converted?: boolean | null
          location_hint?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_notes_converted_item_id_fkey"
            columns: ["converted_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          announcement: string | null
          contact_email: string | null
          email_notifications_enabled: boolean
          favicon_url: string | null
          hero_subtitle: string | null
          hero_title: string
          id: string
          logo_url: string | null
          maintenance_message: string | null
          maintenance_mode: boolean
          meta_description: string | null
          notifications_enabled: boolean
          primary_color: string | null
          registration_enabled: boolean
          registration_paused_message: string | null
          registration_paused_title: string | null
          site_description: string | null
          site_name: string
          support_email: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          announcement?: string | null
          contact_email?: string | null
          email_notifications_enabled?: boolean
          favicon_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string
          id?: string
          logo_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          meta_description?: string | null
          notifications_enabled?: boolean
          primary_color?: string | null
          registration_enabled?: boolean
          registration_paused_message?: string | null
          registration_paused_title?: string | null
          site_description?: string | null
          site_name?: string
          support_email?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          announcement?: string | null
          contact_email?: string | null
          email_notifications_enabled?: boolean
          favicon_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string
          id?: string
          logo_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          meta_description?: string | null
          notifications_enabled?: boolean
          primary_color?: string | null
          registration_enabled?: boolean
          registration_paused_message?: string | null
          registration_paused_title?: string | null
          site_description?: string | null
          site_name?: string
          support_email?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      storage_containers: {
        Row: {
          color: string | null
          container_type: string
          created_at: string | null
          household_id: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          ownership_scope: string
          parent_container_id: string | null
          photo_url: string | null
          qr_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          container_type?: string
          created_at?: string | null
          household_id?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          ownership_scope?: string
          parent_container_id?: string | null
          photo_url?: string | null
          qr_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          container_type?: string
          created_at?: string | null
          household_id?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          ownership_scope?: string
          parent_container_id?: string | null
          photo_url?: string | null
          qr_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_containers_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_containers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_containers_parent_container_id_fkey"
            columns: ["parent_container_id"]
            isOneToOne: false
            referencedRelation: "storage_containers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          email_enabled: boolean
          financing_enabled: boolean
          inapp_enabled: boolean
          repair_enabled: boolean
          updated_at: string
          user_id: string
          warranty_enabled: boolean
        }
        Insert: {
          email_enabled?: boolean
          financing_enabled?: boolean
          inapp_enabled?: boolean
          repair_enabled?: boolean
          updated_at?: string
          user_id: string
          warranty_enabled?: boolean
        }
        Update: {
          email_enabled?: boolean
          financing_enabled?: boolean
          inapp_enabled?: boolean
          repair_enabled?: boolean
          updated_at?: string
          user_id?: string
          warranty_enabled?: boolean
        }
        Relationships: []
      }
      vault_settings: {
        Row: {
          auto_lock_minutes: number
          created_at: string | null
          id: string
          pin_hash: string
          salt: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_lock_minutes?: number
          created_at?: string | null
          id?: string
          pin_hash: string
          salt: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_lock_minutes?: number
          created_at?: string | null
          id?: string
          pin_hash?: string
          salt?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_container_item_quantity: {
        Args: { p_delta: number; p_item_id: string }
        Returns: number
      }
      can_access_shared_category: {
        Args: { p_category_id: string; p_category_user_id: string }
        Returns: boolean
      }
      can_access_shared_item:
        | {
            Args: {
              p_item_category_id: string
              p_item_household_id: string
              p_item_location_id: string
              p_item_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_item_category_id: string
              p_item_household_id: string
              p_item_id: string
              p_item_location_id: string
              p_item_user_id: string
            }
            Returns: boolean
          }
      can_access_shared_location: {
        Args: {
          p_location_household_id: string
          p_location_id: string
          p_location_parent_id?: string
          p_location_user_id: string
        }
        Returns: boolean
      }
      get_dashboard_metrics: { Args: never; Returns: Json }
      get_my_household_ids: {
        Args: never
        Returns: {
          household_id: string
        }[]
      }
      get_shared_item: { Args: { share_token: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_any_household_member: { Args: never; Returns: boolean }
      is_household_admin: {
        Args: { check_household_id: string }
        Returns: boolean
      }
      is_household_editor: {
        Args: { check_household_id: string }
        Returns: boolean
      }
      is_household_member: {
        Args: { check_household_id: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
