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
      advisor_callback_requests: {
        Row: {
          company: string | null
          created_at: string | null
          description: string | null
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          preferred_time: string | null
          status: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          description?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          preferred_time?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_time?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_callback_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_chats: {
        Row: {
          created_at: string | null
          id: string
          message_count: number | null
          model_used: string | null
          title: string | null
          total_credits_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_count?: number | null
          model_used?: string | null
          title?: string | null
          total_credits_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_count?: number | null
          model_used?: string | null
          title?: string | null
          total_credits_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_credits: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          model_used: string | null
          stripe_payment_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          model_used?: string | null
          stripe_payment_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          model_used?: string | null
          stripe_payment_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          credits_used: number | null
          id: string
          role: string
          sources: Json | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          credits_used?: number | null
          id?: string
          role: string
          sources?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          credits_used?: number | null
          id?: string
          role?: string
          sources?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "advisor_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_users: {
        Row: {
          company: string | null
          created_at: string | null
          credits_balance: number | null
          email: string
          free_queries_reset_at: string | null
          free_queries_used: number | null
          id: string
          name: string | null
          password_hash: string
          role: string | null
          sector: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          credits_balance?: number | null
          email: string
          free_queries_reset_at?: string | null
          free_queries_used?: number | null
          id?: string
          name?: string | null
          password_hash: string
          role?: string | null
          sector?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          credits_balance?: number | null
          email?: string
          free_queries_reset_at?: string | null
          free_queries_used?: number | null
          id?: string
          name?: string | null
          password_hash?: string
          role?: string | null
          sector?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_model_settings: {
        Row: {
          action_type: string
          id: string
          model: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action_type: string
          id: string
          model?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action_type?: string
          id?: string
          model?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          action_type: string
          created_at: string
          error_message: string | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          response_time_ms: number | null
          success: boolean | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      case_study_jobs: {
        Row: {
          case_study_id: string | null
          completed_at: string | null
          created_at: string
          current_phase: string | null
          documents_count: number | null
          error_message: string | null
          id: string
          progress_percentage: number
          quality_score: number | null
          result_data: Json | null
          started_at: string | null
          status: string
          technologies_found: number | null
          technologies_new: number | null
          updated_at: string
        }
        Insert: {
          case_study_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_phase?: string | null
          documents_count?: number | null
          error_message?: string | null
          id?: string
          progress_percentage?: number
          quality_score?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
          technologies_found?: number | null
          technologies_new?: number | null
          updated_at?: string
        }
        Update: {
          case_study_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_phase?: string | null
          documents_count?: number | null
          error_message?: string | null
          id?: string
          progress_percentage?: number
          quality_score?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
          technologies_found?: number | null
          technologies_new?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_study_jobs_case_study_id_fkey"
            columns: ["case_study_id"]
            isOneToOne: false
            referencedRelation: "casos_de_estudio"
            referencedColumns: ["id"]
          },
        ]
      }
      case_study_technologies: {
        Row: {
          application_data: Json | null
          case_study_id: string
          created_at: string
          economic_analysis: Json | null
          id: string
          provider: string | null
          role: string
          scouting_queue_id: string | null
          selection_rationale: string | null
          technology_id: string | null
          technology_name: string
        }
        Insert: {
          application_data?: Json | null
          case_study_id: string
          created_at?: string
          economic_analysis?: Json | null
          id?: string
          provider?: string | null
          role: string
          scouting_queue_id?: string | null
          selection_rationale?: string | null
          technology_id?: string | null
          technology_name: string
        }
        Update: {
          application_data?: Json | null
          case_study_id?: string
          created_at?: string
          economic_analysis?: Json | null
          id?: string
          provider?: string | null
          role?: string
          scouting_queue_id?: string | null
          selection_rationale?: string | null
          technology_id?: string | null
          technology_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_study_technologies_case_study_id_fkey"
            columns: ["case_study_id"]
            isOneToOne: false
            referencedRelation: "casos_de_estudio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_study_technologies_scouting_queue_id_fkey"
            columns: ["scouting_queue_id"]
            isOneToOne: false
            referencedRelation: "scouting_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_study_technologies_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
        ]
      }
      casos_de_estudio: {
        Row: {
          capex: number | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          entity_type: string | null
          id: string
          lessons_learned: string | null
          name: string
          opex_year: number | null
          original_data: Json | null
          payback_months: number | null
          problem_parameters: Json | null
          quality_score: number | null
          results_achieved: string | null
          results_parameters: Json | null
          roi_percent: number | null
          roi_rationale: string | null
          sector: string | null
          solution_applied: string | null
          source_documents: Json | null
          source_folder: string | null
          source_technology_id: string | null
          status: string | null
          technology_types: string[] | null
          treatment_train: string[] | null
          updated_at: string | null
        }
        Insert: {
          capex?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_type?: string | null
          id?: string
          lessons_learned?: string | null
          name: string
          opex_year?: number | null
          original_data?: Json | null
          payback_months?: number | null
          problem_parameters?: Json | null
          quality_score?: number | null
          results_achieved?: string | null
          results_parameters?: Json | null
          roi_percent?: number | null
          roi_rationale?: string | null
          sector?: string | null
          solution_applied?: string | null
          source_documents?: Json | null
          source_folder?: string | null
          source_technology_id?: string | null
          status?: string | null
          technology_types?: string[] | null
          treatment_train?: string[] | null
          updated_at?: string | null
        }
        Update: {
          capex?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_type?: string | null
          id?: string
          lessons_learned?: string | null
          name?: string
          opex_year?: number | null
          original_data?: Json | null
          payback_months?: number | null
          problem_parameters?: Json | null
          quality_score?: number | null
          results_achieved?: string | null
          results_parameters?: Json | null
          roi_percent?: number | null
          roi_rationale?: string | null
          sector?: string | null
          solution_applied?: string | null
          source_documents?: Json | null
          source_folder?: string | null
          source_technology_id?: string | null
          status?: string | null
          technology_types?: string[] | null
          treatment_train?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          id: string
          tokens: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          id?: string
          tokens?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          category: string | null
          chunk_count: number | null
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          sector: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          chunk_count?: number | null
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          sector?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          chunk_count?: number | null
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          sector?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
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
          notes: string | null
          responsible_user_id: string | null
          status: string | null
          target_date: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          responsible_user_id?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          responsible_user_id?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rejected_technologies: {
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
          original_data: Json | null
          original_scouting_id: string | null
          "País de origen": string | null
          "Paises donde actua": string | null
          "Porque es innovadora": string | null
          "Proveedor / Empresa": string | null
          rejected_at: string
          rejected_by: string | null
          rejection_category: string | null
          rejection_reason: string
          "Sector y subsector": string | null
          sector_id: string | null
          Subcategoría: string | null
          subcategoria_id: number | null
          subsector_industrial: string | null
          "Tipo de tecnología": string
          tipo_id: number | null
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
          original_data?: Json | null
          original_scouting_id?: string | null
          "País de origen"?: string | null
          "Paises donde actua"?: string | null
          "Porque es innovadora"?: string | null
          "Proveedor / Empresa"?: string | null
          rejected_at?: string
          rejected_by?: string | null
          rejection_category?: string | null
          rejection_reason: string
          "Sector y subsector"?: string | null
          sector_id?: string | null
          Subcategoría?: string | null
          subcategoria_id?: number | null
          subsector_industrial?: string | null
          "Tipo de tecnología"?: string
          tipo_id?: number | null
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
          original_data?: Json | null
          original_scouting_id?: string | null
          "País de origen"?: string | null
          "Paises donde actua"?: string | null
          "Porque es innovadora"?: string | null
          "Proveedor / Empresa"?: string | null
          rejected_at?: string
          rejected_by?: string | null
          rejection_category?: string | null
          rejection_reason?: string
          "Sector y subsector"?: string | null
          sector_id?: string | null
          Subcategoría?: string | null
          subcategoria_id?: number | null
          subsector_industrial?: string | null
          "Tipo de tecnología"?: string
          tipo_id?: number | null
          "Ventaja competitiva clave"?: string | null
          "Web de la empresa"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rejected_technologies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_sectores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejected_technologies_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_subcategorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejected_technologies_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_ai_searches: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          name: string
          query: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          name: string
          query: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          name?: string
          query?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scouting_queue: {
        Row: {
          "Aplicación principal": string | null
          case_study_id: string | null
          "Casos de referencia": string | null
          "Comentarios del analista": string | null
          created_at: string
          created_by: string | null
          "Descripción técnica breve": string | null
          "Email de contacto": string | null
          "Estado del seguimiento": string | null
          "Fecha de scouting": string | null
          "Grado de madurez (TRL)": number | null
          id: string
          "Nombre de la tecnología": string
          notes: string | null
          "País de origen": string | null
          "Paises donde actua": string | null
          "Porque es innovadora": string | null
          priority: string | null
          "Proveedor / Empresa": string | null
          queue_status: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          "Sector y subsector": string | null
          sector_id: string | null
          source: string | null
          source_url: string | null
          Subcategoría: string | null
          subcategoria_id: number | null
          subsector_industrial: string | null
          "Tipo de tecnología": string
          tipo_id: number | null
          updated_at: string
          "Ventaja competitiva clave": string | null
          "Web de la empresa": string | null
        }
        Insert: {
          "Aplicación principal"?: string | null
          case_study_id?: string | null
          "Casos de referencia"?: string | null
          "Comentarios del analista"?: string | null
          created_at?: string
          created_by?: string | null
          "Descripción técnica breve"?: string | null
          "Email de contacto"?: string | null
          "Estado del seguimiento"?: string | null
          "Fecha de scouting"?: string | null
          "Grado de madurez (TRL)"?: number | null
          id?: string
          "Nombre de la tecnología": string
          notes?: string | null
          "País de origen"?: string | null
          "Paises donde actua"?: string | null
          "Porque es innovadora"?: string | null
          priority?: string | null
          "Proveedor / Empresa"?: string | null
          queue_status?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          "Sector y subsector"?: string | null
          sector_id?: string | null
          source?: string | null
          source_url?: string | null
          Subcategoría?: string | null
          subcategoria_id?: number | null
          subsector_industrial?: string | null
          "Tipo de tecnología"?: string
          tipo_id?: number | null
          updated_at?: string
          "Ventaja competitiva clave"?: string | null
          "Web de la empresa"?: string | null
        }
        Update: {
          "Aplicación principal"?: string | null
          case_study_id?: string | null
          "Casos de referencia"?: string | null
          "Comentarios del analista"?: string | null
          created_at?: string
          created_by?: string | null
          "Descripción técnica breve"?: string | null
          "Email de contacto"?: string | null
          "Estado del seguimiento"?: string | null
          "Fecha de scouting"?: string | null
          "Grado de madurez (TRL)"?: number | null
          id?: string
          "Nombre de la tecnología"?: string
          notes?: string | null
          "País de origen"?: string | null
          "Paises donde actua"?: string | null
          "Porque es innovadora"?: string | null
          priority?: string | null
          "Proveedor / Empresa"?: string | null
          queue_status?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          "Sector y subsector"?: string | null
          sector_id?: string | null
          source?: string | null
          source_url?: string | null
          Subcategoría?: string | null
          subcategoria_id?: number | null
          subsector_industrial?: string | null
          "Tipo de tecnología"?: string
          tipo_id?: number | null
          updated_at?: string
          "Ventaja competitiva clave"?: string | null
          "Web de la empresa"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouting_queue_case_study_id_fkey"
            columns: ["case_study_id"]
            isOneToOne: false
            referencedRelation: "casos_de_estudio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouting_queue_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_sectores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouting_queue_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_subcategorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouting_queue_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      scouting_session_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          phase: string | null
          session_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message: string
          phase?: string | null
          session_id: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
          phase?: string | null
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouting_session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scouting_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      scouting_sessions: {
        Row: {
          activity_timeline: Json | null
          completed_at: string | null
          config: Json | null
          created_at: string
          current_activity: string | null
          current_phase: string | null
          current_site: string | null
          error_message: string | null
          id: string
          last_heartbeat: string | null
          phase_details: Json | null
          progress_percentage: number | null
          session_id: string
          sites_examined: number | null
          started_at: string
          status: string
          summary: Json | null
          technologies_approved: number | null
          technologies_discarded: number | null
          technologies_found: number | null
          updated_at: string
        }
        Insert: {
          activity_timeline?: Json | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          current_activity?: string | null
          current_phase?: string | null
          current_site?: string | null
          error_message?: string | null
          id?: string
          last_heartbeat?: string | null
          phase_details?: Json | null
          progress_percentage?: number | null
          session_id: string
          sites_examined?: number | null
          started_at?: string
          status?: string
          summary?: Json | null
          technologies_approved?: number | null
          technologies_discarded?: number | null
          technologies_found?: number | null
          updated_at?: string
        }
        Update: {
          activity_timeline?: Json | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          current_activity?: string | null
          current_phase?: string | null
          current_site?: string | null
          error_message?: string | null
          id?: string
          last_heartbeat?: string | null
          phase_details?: Json | null
          progress_percentage?: number | null
          session_id?: string
          sites_examined?: number | null
          started_at?: string
          status?: string
          summary?: Json | null
          technologies_approved?: number | null
          technologies_discarded?: number | null
          technologies_found?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      scouting_sources: {
        Row: {
          activo: boolean | null
          calidad_score: number | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          frecuencia_escaneo: string | null
          id: string
          nombre: string
          notas: string | null
          pais: string | null
          proxima_revision: string | null
          sector_foco: string | null
          tecnologias_encontradas: number | null
          tecnologias_foco: string | null
          tipo: string | null
          ultima_revision: string | null
          updated_at: string
          url: string
        }
        Insert: {
          activo?: boolean | null
          calidad_score?: number | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          frecuencia_escaneo?: string | null
          id?: string
          nombre: string
          notas?: string | null
          pais?: string | null
          proxima_revision?: string | null
          sector_foco?: string | null
          tecnologias_encontradas?: number | null
          tecnologias_foco?: string | null
          tipo?: string | null
          ultima_revision?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          activo?: boolean | null
          calidad_score?: number | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          frecuencia_escaneo?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          pais?: string | null
          proxima_revision?: string | null
          sector_foco?: string | null
          tecnologias_encontradas?: number | null
          tecnologias_foco?: string | null
          tipo?: string | null
          ultima_revision?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      scouting_studies: {
        Row: {
          ai_session_id: string | null
          assigned_to: string | null
          completed_at: string | null
          constraints: string[] | null
          context: string | null
          created_at: string
          created_by: string | null
          current_phase: number
          description: string | null
          id: string
          name: string
          objectives: string[] | null
          problem_statement: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_session_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          constraints?: string[] | null
          context?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: number
          description?: string | null
          id?: string
          name: string
          objectives?: string[] | null
          problem_statement?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_session_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          constraints?: string[] | null
          context?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: number
          description?: string | null
          id?: string
          name?: string
          objectives?: string[] | null
          problem_statement?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouting_studies_ai_session_id_fkey"
            columns: ["ai_session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_evaluations: {
        Row: {
          ai_analysis_json: Json | null
          ai_analyzed_at: string | null
          ai_external_data: Json | null
          ai_generated: boolean
          ai_kb_insights: Json | null
          ai_recommendation: string | null
          ai_scores: Json | null
          ai_swot: Json | null
          benchmark_notes: string | null
          competitive_advantages: string[] | null
          competitive_disadvantages: string[] | null
          context_fit_score: number | null
          context_notes: string | null
          cost_notes: string | null
          cost_score: number | null
          evaluated_at: string
          evaluated_by: string | null
          id: string
          implementation_barriers: string[] | null
          innovation_potential_score: number | null
          market_position: string | null
          opportunities: string[] | null
          overall_score: number | null
          recommendation: string | null
          recommendation_notes: string | null
          requirements_met: string[] | null
          requirements_unmet: string[] | null
          scalability_notes: string | null
          scalability_score: number | null
          session_id: string | null
          shortlist_id: string
          strengths: string[] | null
          study_id: string
          threats: string[] | null
          trl_notes: string | null
          trl_score: number | null
          weaknesses: string[] | null
        }
        Insert: {
          ai_analysis_json?: Json | null
          ai_analyzed_at?: string | null
          ai_external_data?: Json | null
          ai_generated?: boolean
          ai_kb_insights?: Json | null
          ai_recommendation?: string | null
          ai_scores?: Json | null
          ai_swot?: Json | null
          benchmark_notes?: string | null
          competitive_advantages?: string[] | null
          competitive_disadvantages?: string[] | null
          context_fit_score?: number | null
          context_notes?: string | null
          cost_notes?: string | null
          cost_score?: number | null
          evaluated_at?: string
          evaluated_by?: string | null
          id?: string
          implementation_barriers?: string[] | null
          innovation_potential_score?: number | null
          market_position?: string | null
          opportunities?: string[] | null
          overall_score?: number | null
          recommendation?: string | null
          recommendation_notes?: string | null
          requirements_met?: string[] | null
          requirements_unmet?: string[] | null
          scalability_notes?: string | null
          scalability_score?: number | null
          session_id?: string | null
          shortlist_id: string
          strengths?: string[] | null
          study_id: string
          threats?: string[] | null
          trl_notes?: string | null
          trl_score?: number | null
          weaknesses?: string[] | null
        }
        Update: {
          ai_analysis_json?: Json | null
          ai_analyzed_at?: string | null
          ai_external_data?: Json | null
          ai_generated?: boolean
          ai_kb_insights?: Json | null
          ai_recommendation?: string | null
          ai_scores?: Json | null
          ai_swot?: Json | null
          benchmark_notes?: string | null
          competitive_advantages?: string[] | null
          competitive_disadvantages?: string[] | null
          context_fit_score?: number | null
          context_notes?: string | null
          cost_notes?: string | null
          cost_score?: number | null
          evaluated_at?: string
          evaluated_by?: string | null
          id?: string
          implementation_barriers?: string[] | null
          innovation_potential_score?: number | null
          market_position?: string | null
          opportunities?: string[] | null
          overall_score?: number | null
          recommendation?: string | null
          recommendation_notes?: string | null
          requirements_met?: string[] | null
          requirements_unmet?: string[] | null
          scalability_notes?: string | null
          scalability_score?: number | null
          session_id?: string | null
          shortlist_id?: string
          strengths?: string[] | null
          study_id?: string
          threats?: string[] | null
          trl_notes?: string | null
          trl_score?: number | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "study_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_evaluations_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "study_shortlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_evaluations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "scouting_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_longlist: {
        Row: {
          added_at: string
          added_by: string | null
          already_in_db: boolean | null
          applications: string[] | null
          brief_description: string | null
          casos_referencia: string | null
          confidence_score: number | null
          country: string | null
          email: string | null
          existing_technology_id: string | null
          id: string
          inclusion_reason: string | null
          innovacion: string | null
          paises_actua: string | null
          provider: string | null
          sector: string | null
          sector_id: string | null
          session_id: string | null
          solution_id: string | null
          source: string | null
          source_research_id: string | null
          status: string | null
          study_id: string
          subcategoria_id: number | null
          subcategory_suggested: string | null
          subsector_industrial: string | null
          technology_id: string | null
          technology_name: string
          tipo_id: number | null
          trl: number | null
          type_suggested: string | null
          ventaja_competitiva: string | null
          web: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          already_in_db?: boolean | null
          applications?: string[] | null
          brief_description?: string | null
          casos_referencia?: string | null
          confidence_score?: number | null
          country?: string | null
          email?: string | null
          existing_technology_id?: string | null
          id?: string
          inclusion_reason?: string | null
          innovacion?: string | null
          paises_actua?: string | null
          provider?: string | null
          sector?: string | null
          sector_id?: string | null
          session_id?: string | null
          solution_id?: string | null
          source?: string | null
          source_research_id?: string | null
          status?: string | null
          study_id: string
          subcategoria_id?: number | null
          subcategory_suggested?: string | null
          subsector_industrial?: string | null
          technology_id?: string | null
          technology_name: string
          tipo_id?: number | null
          trl?: number | null
          type_suggested?: string | null
          ventaja_competitiva?: string | null
          web?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          already_in_db?: boolean | null
          applications?: string[] | null
          brief_description?: string | null
          casos_referencia?: string | null
          confidence_score?: number | null
          country?: string | null
          email?: string | null
          existing_technology_id?: string | null
          id?: string
          inclusion_reason?: string | null
          innovacion?: string | null
          paises_actua?: string | null
          provider?: string | null
          sector?: string | null
          sector_id?: string | null
          session_id?: string | null
          solution_id?: string | null
          source?: string | null
          source_research_id?: string | null
          status?: string | null
          study_id?: string
          subcategoria_id?: number | null
          subcategory_suggested?: string | null
          subsector_industrial?: string | null
          technology_id?: string | null
          technology_name?: string
          tipo_id?: number | null
          trl?: number | null
          type_suggested?: string | null
          ventaja_competitiva?: string | null
          web?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_longlist_existing_technology_id_fkey"
            columns: ["existing_technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_longlist_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_sectores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_longlist_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_longlist_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "study_solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_longlist_source_research_id_fkey"
            columns: ["source_research_id"]
            isOneToOne: false
            referencedRelation: "study_research"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_longlist_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "scouting_studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_longlist_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_subcategorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_longlist_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_longlist_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      study_reports: {
        Row: {
          appendices: Json | null
          conclusions: string | null
          created_at: string
          created_by: string | null
          executive_summary: string | null
          file_path: string | null
          generated_by: string | null
          id: string
          methodology: string | null
          problem_analysis: string | null
          recommendations: string | null
          solutions_overview: string | null
          study_id: string
          technology_comparison: string | null
          title: string
          version: number
        }
        Insert: {
          appendices?: Json | null
          conclusions?: string | null
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          file_path?: string | null
          generated_by?: string | null
          id?: string
          methodology?: string | null
          problem_analysis?: string | null
          recommendations?: string | null
          solutions_overview?: string | null
          study_id: string
          technology_comparison?: string | null
          title: string
          version?: number
        }
        Update: {
          appendices?: Json | null
          conclusions?: string | null
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          file_path?: string | null
          generated_by?: string | null
          id?: string
          methodology?: string | null
          problem_analysis?: string | null
          recommendations?: string | null
          solutions_overview?: string | null
          study_id?: string
          technology_comparison?: string | null
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_reports_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "scouting_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_research: {
        Row: {
          ai_extracted: boolean | null
          ai_generated: boolean
          authors: string | null
          created_at: string
          created_by: string | null
          id: string
          key_findings: string[] | null
          knowledge_doc_id: string | null
          provider_mentioned: string | null
          publication_date: string | null
          relevance_score: number | null
          session_id: string | null
          source_type: string | null
          source_url: string | null
          study_id: string
          summary: string | null
          technology_mentioned: string | null
          title: string
        }
        Insert: {
          ai_extracted?: boolean | null
          ai_generated?: boolean
          authors?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_findings?: string[] | null
          knowledge_doc_id?: string | null
          provider_mentioned?: string | null
          publication_date?: string | null
          relevance_score?: number | null
          session_id?: string | null
          source_type?: string | null
          source_url?: string | null
          study_id: string
          summary?: string | null
          technology_mentioned?: string | null
          title: string
        }
        Update: {
          ai_extracted?: boolean | null
          ai_generated?: boolean
          authors?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_findings?: string[] | null
          knowledge_doc_id?: string | null
          provider_mentioned?: string | null
          publication_date?: string | null
          relevance_score?: number | null
          session_id?: string | null
          source_type?: string | null
          source_url?: string | null
          study_id?: string
          summary?: string | null
          technology_mentioned?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_research_knowledge_doc_id_fkey"
            columns: ["knowledge_doc_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_research_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_research_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "scouting_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_session_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          phase: string | null
          session_id: string
          study_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message: string
          phase?: string | null
          session_id: string
          study_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
          phase?: string | null
          session_id?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_session_logs_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "scouting_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          completed_at: string | null
          config: Json | null
          created_at: string
          current_phase: string | null
          error_message: string | null
          id: string
          progress_percentage: number | null
          session_type: string
          started_at: string | null
          status: string
          study_id: string
          summary: Json | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          current_phase?: string | null
          error_message?: string | null
          id?: string
          progress_percentage?: number | null
          session_type: string
          started_at?: string | null
          status?: string
          study_id: string
          summary?: Json | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          current_phase?: string | null
          error_message?: string | null
          id?: string
          progress_percentage?: number | null
          session_type?: string
          started_at?: string | null
          status?: string
          study_id?: string
          summary?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "scouting_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_shortlist: {
        Row: {
          id: string
          longlist_id: string
          notes: string | null
          priority: number | null
          selected_at: string
          selected_by: string | null
          selection_reason: string | null
          study_id: string
        }
        Insert: {
          id?: string
          longlist_id: string
          notes?: string | null
          priority?: number | null
          selected_at?: string
          selected_by?: string | null
          selection_reason?: string | null
          study_id: string
        }
        Update: {
          id?: string
          longlist_id?: string
          notes?: string | null
          priority?: number | null
          selected_at?: string
          selected_by?: string | null
          selection_reason?: string | null
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_shortlist_longlist_id_fkey"
            columns: ["longlist_id"]
            isOneToOne: false
            referencedRelation: "study_longlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_shortlist_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "scouting_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_solutions: {
        Row: {
          advantages: string[] | null
          applicable_contexts: string[] | null
          applicable_sectors: string[] | null
          case_studies: string[] | null
          category: string
          cost_range: string | null
          created_at: string
          created_by: string | null
          description: string | null
          detailed_info: string | null
          disadvantages: string[] | null
          estimated_trl_range: string | null
          id: string
          implementation_time: string | null
          key_providers: string[] | null
          name: string
          priority: number | null
          source_title: string | null
          source_url: string | null
          study_id: string
        }
        Insert: {
          advantages?: string[] | null
          applicable_contexts?: string[] | null
          applicable_sectors?: string[] | null
          case_studies?: string[] | null
          category: string
          cost_range?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          detailed_info?: string | null
          disadvantages?: string[] | null
          estimated_trl_range?: string | null
          id?: string
          implementation_time?: string | null
          key_providers?: string[] | null
          name: string
          priority?: number | null
          source_title?: string | null
          source_url?: string | null
          study_id: string
        }
        Update: {
          advantages?: string[] | null
          applicable_contexts?: string[] | null
          applicable_sectors?: string[] | null
          case_studies?: string[] | null
          category?: string
          cost_range?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          detailed_info?: string | null
          disadvantages?: string[] | null
          estimated_trl_range?: string | null
          id?: string
          implementation_time?: string | null
          key_providers?: string[] | null
          name?: string
          priority?: number | null
          source_title?: string | null
          source_url?: string | null
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_solutions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "scouting_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          last_error: string | null
          max_attempts: number | null
          next_retry_at: string | null
          operation: string
          payload: Json
          processed_at: string | null
          record_id: string
          status: string | null
          table_name: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          operation: string
          payload: Json
          processed_at?: string | null
          record_id: string
          status?: string | null
          table_name: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          operation?: string
          payload?: Json
          processed_at?: string | null
          record_id?: string
          status?: string | null
          table_name?: string
        }
        Relationships: []
      }
      taxonomy_sectores: {
        Row: {
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id: string
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      taxonomy_subcategorias: {
        Row: {
          codigo: string
          id: number
          nombre: string
          tipo_id: number | null
        }
        Insert: {
          codigo: string
          id?: number
          nombre: string
          tipo_id?: number | null
        }
        Update: {
          codigo?: string
          id?: number
          nombre?: string
          tipo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_subcategorias_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_tipos: {
        Row: {
          codigo: string
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          codigo: string
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          codigo?: string
          descripcion?: string | null
          id?: number
          nombre?: string
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
          original_data: Json | null
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
          original_data?: Json | null
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
          original_data?: Json | null
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
          reviewed_at: string | null
          reviewer_id: string | null
          "Sector y subsector": string | null
          sector_id: string | null
          status: string | null
          Subcategoría: string | null
          subcategoria_id: number | null
          subsector_industrial: string | null
          "Tipo de tecnología": string
          tipo_id: number | null
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
          reviewed_at?: string | null
          reviewer_id?: string | null
          "Sector y subsector"?: string | null
          sector_id?: string | null
          status?: string | null
          Subcategoría?: string | null
          subcategoria_id?: number | null
          subsector_industrial?: string | null
          "Tipo de tecnología": string
          tipo_id?: number | null
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
          reviewed_at?: string | null
          reviewer_id?: string | null
          "Sector y subsector"?: string | null
          sector_id?: string | null
          status?: string | null
          Subcategoría?: string | null
          subcategoria_id?: number | null
          subsector_industrial?: string | null
          "Tipo de tecnología"?: string
          tipo_id?: number | null
          updated_at?: string
          updated_by?: string | null
          "Ventaja competitiva clave"?: string | null
          "Web de la empresa"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technologies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_sectores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technologies_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_subcategorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technologies_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      technology_edits: {
        Row: {
          comments: string | null
          created_at: string
          created_by: string
          edit_type: string | null
          id: string
          original_data: Json | null
          proposed_changes: Json
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["edit_status"]
          technology_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          created_by: string
          edit_type?: string | null
          id?: string
          original_data?: Json | null
          proposed_changes: Json
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          technology_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          created_by?: string
          edit_type?: string | null
          id?: string
          original_data?: Json | null
          proposed_changes?: Json
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          technology_id?: string | null
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
      technology_subcategorias: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          subcategoria_id: number
          technology_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          subcategoria_id: number
          technology_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          subcategoria_id?: number
          technology_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technology_subcategorias_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_subcategorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technology_subcategorias_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
        ]
      }
      technology_tipos: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          technology_id: string
          tipo_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          technology_id: string
          tipo_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          technology_id?: string
          tipo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "technology_tipos_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technology_tipos_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_tipos"
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
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
        }
        Relationships: []
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
      approve_scouting_to_technologies: {
        Args: { scouting_id: string }
        Returns: string
      }
      check_scouting_duplicate: {
        Args: { p_exclude_id?: string; p_name: string; p_provider: string }
        Returns: {
          existing_scouting_id: string
          existing_tech_id: string
          in_scouting: boolean
          in_technologies: boolean
          message: string
        }[]
      }
      check_technology_duplicate: {
        Args: { p_exclude_id?: string; p_name: string; p_provider: string }
        Returns: {
          existing_id: string
          existing_name: string
          existing_provider: string
          is_duplicate: boolean
        }[]
      }
      close_zombie_jobs: { Args: { max_age_minutes?: number }; Returns: number }
      deduct_advisor_credits: {
        Args: {
          p_amount: number
          p_description: string
          p_model: string
          p_user_id: string
        }
        Returns: Json
      }
      force_close_scouting_job: {
        Args: { close_reason?: string; job_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_source_url: { Args: { url: string }; Returns: string }
      normalize_tech_name: { Args: { input_text: string }; Returns: string }
      reject_scouting_to_rejected: {
        Args: { category?: string; reason: string; scouting_id: string }
        Returns: string
      }
      search_technologies_by_keywords: {
        Args: {
          p_keywords: string[]
          p_max_results?: number
          p_min_trl?: number
        }
        Returns: {
          aplicacion: string
          casos_referencia: string
          descripcion: string
          id: string
          innovacion: string
          nombre: string
          pais: string
          proveedor: string
          relevance_score: number
          sector: string
          subcategoria: string
          tipo: string
          trl: number
          ventaja: string
          web: string
        }[]
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
