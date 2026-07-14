export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assets: {
        Row: {
          cluster_key: string | null
          cluster_url: string | null
          created_at: string
          filename: string
          id: string
          is_public: boolean
          key: string
          mime_type: string
          original_key: string | null
          original_url: string | null
          project_id: string
          size_bytes: number | null
          thumb_key: string | null
          thumb_url: string | null
          url: string
        }
        Insert: {
          cluster_key?: string | null
          cluster_url?: string | null
          created_at?: string
          filename: string
          id?: string
          is_public?: boolean
          key: string
          mime_type: string
          original_key?: string | null
          original_url?: string | null
          project_id: string
          size_bytes?: number | null
          thumb_key?: string | null
          thumb_url?: string | null
          url: string
        }
        Update: {
          cluster_key?: string | null
          cluster_url?: string | null
          created_at?: string
          filename?: string
          id?: string
          is_public?: boolean
          key?: string
          mime_type?: string
          original_key?: string | null
          original_url?: string | null
          project_id?: string
          size_bytes?: number | null
          thumb_key?: string | null
          thumb_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          changed: string[] | null
          created_at: string
          error_message: string | null
          id: string
          project_id: string
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor: string
          changed?: string[] | null
          created_at?: string
          error_message?: string | null
          id?: string
          project_id: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          status?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          changed?: string[] | null
          created_at?: string
          error_message?: string | null
          id?: string
          project_id?: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          created_at: string
          id: string
          order: number
          page_id: string
          parent_block_id: string | null
          props: Json
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          order: number
          page_id: string
          parent_block_id?: string | null
          props?: Json
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          order?: number
          page_id?: string
          parent_block_id?: string | null
          props?: Json
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_parent_block_id_fkey"
            columns: ["parent_block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks_history: {
        Row: {
          block_id: string
          changed_by: string | null
          created_at: string
          id: string
          props: Json
        }
        Insert: {
          block_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          props: Json
        }
        Update: {
          block_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          props?: Json
        }
        Relationships: [
          {
            foreignKeyName: "blocks_history_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_manuals: {
        Row: {
          colors: Json
          colors_dark: Json
          created_at: string
          custom_css: string | null
          draft_overrides: Json | null
          favicon_url: string | null
          id: string
          layout: Json
          legal_info: Json
          logo_url: string | null
          og_image_url: string | null
          project_id: string
          radii: Json
          shadows: Json
          spacing: Json
          typography: Json
          updated_at: string
          version: number
        }
        Insert: {
          colors?: Json
          colors_dark?: Json
          created_at?: string
          custom_css?: string | null
          draft_overrides?: Json | null
          favicon_url?: string | null
          id?: string
          layout?: Json
          legal_info?: Json
          logo_url?: string | null
          og_image_url?: string | null
          project_id: string
          radii?: Json
          shadows?: Json
          spacing?: Json
          typography?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          colors?: Json
          colors_dark?: Json
          created_at?: string
          custom_css?: string | null
          draft_overrides?: Json | null
          favicon_url?: string | null
          id?: string
          layout?: Json
          legal_info?: Json
          logo_url?: string | null
          og_image_url?: string | null
          project_id?: string
          radii?: Json
          shadows?: Json
          spacing?: Json
          typography?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "brand_manuals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_manuals_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          manual_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          manual_id: string
          snapshot: Json
          version: number
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          manual_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "brand_manuals_history_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "brand_manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          fields: Json
          full_path: string
          id: string
          order: number
          project_id: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          fields?: Json
          full_path: string
          id?: string
          order?: number
          project_id: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          fields?: Json
          full_path?: string
          id?: string
          order?: number
          project_id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
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
            foreignKeyName: "collection_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          schema: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          schema?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          schema?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          cf_cache_rule_id: string | null
          cf_redirect_rule_id: string | null
          cf_zone_id: string | null
          created_at: string
          dns_verified_at: string | null
          domain: string
          error_message: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          project_id: string
          status: string
          vercel_domain_id: string | null
        }
        Insert: {
          cf_cache_rule_id?: string | null
          cf_redirect_rule_id?: string | null
          cf_zone_id?: string | null
          created_at?: string
          dns_verified_at?: string | null
          domain: string
          error_message?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          project_id: string
          status?: string
          vercel_domain_id?: string | null
        }
        Update: {
          cf_cache_rule_id?: string | null
          cf_redirect_rule_id?: string | null
          cf_zone_id?: string | null
          created_at?: string
          dns_verified_at?: string | null
          domain?: string
          error_message?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          project_id?: string
          status?: string
          vercel_domain_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domains_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip: string
          succeeded: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip: string
          succeeded?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip?: string
          succeeded?: boolean
        }
        Relationships: []
      }
      pages: {
        Row: {
          archived_at: string | null
          canonical_url: string | null
          created_at: string
          full_path: string
          id: string
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          parent_id: string | null
          project_id: string
          robots: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          canonical_url?: string | null
          created_at?: string
          full_path: string
          id?: string
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          parent_id?: string | null
          project_id: string
          robots?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          canonical_url?: string | null
          created_at?: string
          full_path?: string
          id?: string
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          parent_id?: string | null
          project_id?: string
          robots?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          agency_only: boolean
          description: string
          id: string
          name: string
        }
        Insert: {
          agency_only?: boolean
          description: string
          id?: string
          name: string
        }
        Update: {
          agency_only?: boolean
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "project_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "project_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          project_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          project_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          canonical_domain: string | null
          created_at: string
          default_robots: string
          features: Json
          footer_props: Json
          ga4_id: string | null
          header_props: Json
          id: string
          name: string
          site_name: string | null
          slug: string
          title_separator: string
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          canonical_domain?: string | null
          created_at?: string
          default_robots?: string
          features?: Json
          footer_props?: Json
          ga4_id?: string | null
          header_props?: Json
          id?: string
          name: string
          site_name?: string | null
          slug: string
          title_separator?: string
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          canonical_domain?: string | null
          created_at?: string
          default_robots?: string
          features?: Json
          footer_props?: Json
          ga4_id?: string | null
          header_props?: Json
          id?: string
          name?: string
          site_name?: string | null
          slug?: string
          title_separator?: string
          twitter_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          agency_role: string | null
          created_at: string
          display_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_role?: string | null
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_role?: string | null
          created_at?: string
          display_name?: string | null
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
      auth_project_ids: { Args: never; Returns: string[] }
      can_edit_content: { Args: { p_project_id: string }; Returns: boolean }
      is_agency_admin: { Args: never; Returns: boolean }
      is_project_owner: { Args: { p_project_id: string }; Returns: boolean }
      user_has_permission: {
        Args: { p_project_id: string; perm: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

