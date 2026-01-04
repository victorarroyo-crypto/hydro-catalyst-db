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
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_technologies: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          project_id: string
          technology_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          project_id: string
          technology_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          project_id?: string
          technology_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_technologies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_technologies_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      technological_trends: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          sector: string | null
          source_technology_id: string | null
          subcategory: string | null
          technology_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          sector?: string | null
          source_technology_id?: string | null
          subcategory?: string | null
          technology_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          sector?: string | null
          source_technology_id?: string | null
          subcategory?: string | null
          technology_type?: string
        }
        Relationships: []
      }
      technologies: {
        Row: {
          "Aplicación principal": string | null
          "Casos de referencia": string | null
          "Comentarios del analista": string | null
          created_at: string
          "Descripción técnica breve": string | null
          "Email de contacto": string | null
          "Estado del seguimiento": string | null
          "Fecha de scouting": string | null
          "Grado de madurez (TRL)": number | null
          id: string
          "Nombre de la tecnología": string
          "País de origen": string | null
          "Paises donde actua": string | null
          "Porque es innovadora": string | null
          "Proveedor / Empresa": string | null
          quality_score: number | null
          review_requested_at: string | null
          review_requested_by: string | null
          review_status: string | null
          reviewer_id: string | null
          "Sector y subsector": string | null
          status: string | null
          Subcategoría: string | null
          "Tipo de tecnología": string
          updated_at: string
          updated_by: string | null
          "Ventaja competitiva clave": string | null
          "Web de la empresa": string | null
        }
        Insert: {
          "Aplicación principal"?: string | null
          "Casos de referencia"?: string | null
          "Comentarios del analista"?: string | null
          created_at?: string
          "Descripción técnica breve"?: string | null
          "Email de contacto"?: string | null
          "Estado del seguimiento"?: string | null
          "Fecha de scouting"?: string | null
          "Grado de madurez (TRL)"?: number | null
          id?: string
          "Nombre de la tecnología": string
          "País de origen"?: string | null
          "Paises donde actua"?: string | null
          "Porque es innovadora"?: string | null
          "Proveedor / Empresa"?: string | null
          quality_score?: number | null
          review_requested_at?: string | null
          review_requested_by?: string | null
          review_status?: string | null
          reviewer_id?: string | null
          "Sector y subsector"?: string | null
          status?: string | null
          Subcategoría?: string | null
          "Tipo de tecnología": string
          updated_at?: string
          updated_by?: string | null
          "Ventaja competitiva clave"?: string | null
          "Web de la empresa"?: string | null
        }
        Update: {
          "Aplicación principal"?: string | null
          "Casos de referencia"?: string | null
          "Comentarios del analista"?: string | null
          created_at?: string
          "Descripción técnica breve"?: string | null
          "Email de contacto"?: string | null
          "Estado del seguimiento"?: string | null
          "Fecha de scouting"?: string | null
          "Grado de madurez (TRL)"?: number | null
          id?: string
          "Nombre de la tecnología"?: string
          "País de origen"?: string | null
          "Paises donde actua"?: string | null
          "Porque es innovadora"?: string | null
          "Proveedor / Empresa"?: string | null
          quality_score?: number | null
          review_requested_at?: string | null
          review_requested_by?: string | null
          review_status?: string | null
          reviewer_id?: string | null
          "Sector y subsector"?: string | null
          status?: string | null
          Subcategoría?: string | null
          "Tipo de tecnología"?: string
          updated_at?: string
          updated_by?: string | null
          "Ventaja competitiva clave"?: string | null
          "Web de la empresa"?: string | null
        }
        Relationships: []
      }
      technology_edits: {
        Row: {
          comments: string | null
          created_at: string
          created_by: string
          id: string
          original_data: Json | null
          proposed_changes: Json
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["edit_status"]
          technology_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          created_by: string
          id?: string
          original_data?: Json | null
          proposed_changes: Json
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          technology_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          created_by?: string
          id?: string
          original_data?: Json | null
          proposed_changes?: Json
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          technology_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technology_edits_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          technology_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          technology_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          technology_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "supervisor"
        | "analyst"
        | "client_basic"
        | "client_professional"
        | "client_enterprise"
      edit_status: "pending" | "approved" | "rejected"
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
      app_role: [
        "admin",
        "supervisor",
        "analyst",
        "client_basic",
        "client_professional",
        "client_enterprise",
      ],
      edit_status: ["pending", "approved", "rejected"],
    },
  },
} as const
