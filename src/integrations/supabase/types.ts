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
      casos_de_estudio: {
        Row: {
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          entity_type: string | null
          id: string
          name: string
          original_data: Json | null
          sector: string | null
          source_technology_id: string | null
          technology_types: string[] | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_type?: string | null
          id?: string
          name: string
          original_data?: Json | null
          sector?: string | null
          source_technology_id?: string | null
          technology_types?: string[] | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_type?: string | null
          id?: string
          name?: string
          original_data?: Json | null
          sector?: string | null
          source_technology_id?: string | null
          technology_types?: string[] | null
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
          chunk_count: number | null
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          status: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          chunk_count?: number | null
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          status?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          chunk_count?: number | null
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
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
          completed_at: string | null
          config: Json | null
          created_at: string
          current_phase: string | null
          error_message: string | null
          id: string
          last_heartbeat: string | null
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
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          current_phase?: string | null
          error_message?: string | null
          id?: string
          last_heartbeat?: string | null
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
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          current_phase?: string | null
          error_message?: string | null
          id?: string
          last_heartbeat?: string | null
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
        Relationships: []
      }
      study_evaluations: {
        Row: {
          ai_analysis_json: Json | null
          ai_analyzed_at: string | null
          ai_external_data: Json | null
          ai_kb_insights: Json | null
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
          ai_kb_insights?: Json | null
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
          ai_kb_insights?: Json | null
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
          brief_description: string | null
          country: string | null
          id: string
          inclusion_reason: string | null
          provider: string | null
          solution_id: string | null
          source: string | null
          study_id: string
          technology_id: string | null
          technology_name: string
          trl: number | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          brief_description?: string | null
          country?: string | null
          id?: string
          inclusion_reason?: string | null
          provider?: string | null
          solution_id?: string | null
          source?: string | null
          study_id: string
          technology_id?: string | null
          technology_name: string
          trl?: number | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          brief_description?: string | null
          country?: string | null
          id?: string
          inclusion_reason?: string | null
          provider?: string | null
          solution_id?: string | null
          source?: string | null
          study_id?: string
          technology_id?: string | null
          technology_name?: string
          trl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_longlist_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "study_solutions"
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
            foreignKeyName: "study_longlist_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
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
          authors: string | null
          created_at: string
          created_by: string | null
          id: string
          key_findings: string[] | null
          knowledge_doc_id: string | null
          publication_date: string | null
          relevance_score: number | null
          source_type: string | null
          source_url: string | null
          study_id: string
          summary: string | null
          title: string
        }
        Insert: {
          ai_extracted?: boolean | null
          authors?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_findings?: string[] | null
          knowledge_doc_id?: string | null
          publication_date?: string | null
          relevance_score?: number | null
          source_type?: string | null
          source_url?: string | null
          study_id: string
          summary?: string | null
          title: string
        }
        Update: {
          ai_extracted?: boolean | null
          authors?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_findings?: string[] | null
          knowledge_doc_id?: string | null
          publication_date?: string | null
          relevance_score?: number | null
          source_type?: string | null
          source_url?: string | null
          study_id?: string
          summary?: string | null
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
            foreignKeyName: "study_research_study_id_fkey"
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
          category: string
          cost_range: string | null
          created_at: string
          created_by: string | null
          description: string | null
          disadvantages: string[] | null
          estimated_trl_range: string | null
          id: string
          implementation_time: string | null
          name: string
          priority: number | null
          study_id: string
        }
        Insert: {
          advantages?: string[] | null
          applicable_contexts?: string[] | null
          category: string
          cost_range?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          disadvantages?: string[] | null
          estimated_trl_range?: string | null
          id?: string
          implementation_time?: string | null
          name: string
          priority?: number | null
          study_id: string
        }
        Update: {
          advantages?: string[] | null
          applicable_contexts?: string[] | null
          category?: string
          cost_range?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          disadvantages?: string[] | null
          estimated_trl_range?: string | null
          id?: string
          implementation_time?: string | null
          name?: string
          priority?: number | null
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
      close_zombie_jobs: { Args: { max_age_minutes?: number }; Returns: number }
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
      reject_scouting_to_rejected: {
        Args: { category?: string; reason: string; scouting_id: string }
        Returns: string
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
