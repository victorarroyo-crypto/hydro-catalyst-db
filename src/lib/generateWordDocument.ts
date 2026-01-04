import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import type { Technology } from "@/types/database";

interface TaxonomyData {
  tipo?: { codigo: string; nombre: string } | null;
  subcategoria?: { codigo: string; nombre: string } | null;
  sector?: { id: string; nombre: string } | null;
}

export async function generateTechnologyWordDocument(
  technology: Technology,
  taxonomyData?: TaxonomyData
) {
  try {
    // Fetch the template
    const response = await fetch("/templates/Plantilla_Ficha_Tecnologia.docx");
    if (!response.ok) {
      throw new Error("No se pudo cargar la plantilla");
    }
    const content = await response.arrayBuffer();

    // Load template into PizZip and Docxtemplater
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Format date
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return "N/A";
      try {
        return new Date(dateStr).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return dateStr;
      }
    };

    // Format TRL
    const formatTRL = (trl: number | null) => {
      if (trl === null || trl === undefined) return "N/A";
      return `TRL ${trl}`;
    };

    // Prepare data for the template
    const data = {
      // Main fields
      nombre: technology["Nombre de la tecnología"] || "N/A",
      proveedor: technology["Proveedor / Empresa"] || "N/A",
      pais_origen: technology["País de origen"] || "N/A",
      web_empresa: technology["Web de la empresa"] || "N/A",
      email_contacto: technology["Email de contacto"] || "N/A",
      
      // Technology classification
      tipo_tecnologia: taxonomyData?.tipo 
        ? `${taxonomyData.tipo.codigo} - ${taxonomyData.tipo.nombre}` 
        : (technology["Tipo de tecnología"] || "N/A"),
      subcategoria: taxonomyData?.subcategoria 
        ? `${taxonomyData.subcategoria.codigo} - ${taxonomyData.subcategoria.nombre}` 
        : (technology["Subcategoría"] || "N/A"),
      sector: taxonomyData?.sector 
        ? `${taxonomyData.sector.id} - ${taxonomyData.sector.nombre}` 
        : (technology["Sector y subsector"] || "N/A"),
      
      // Technical details
      aplicacion_principal: technology["Aplicación principal"] || "N/A",
      descripcion_tecnica: technology["Descripción técnica breve"] || "N/A",
      ventaja_competitiva: technology["Ventaja competitiva clave"] || "N/A",
      porque_innovadora: technology["Porque es innovadora"] || "N/A",
      casos_referencia: technology["Casos de referencia"] || "N/A",
      paises_actua: technology["Paises donde actua"] || "N/A",
      
      // Metadata
      trl: formatTRL(technology["Grado de madurez (TRL)"]),
      trl_numero: technology["Grado de madurez (TRL)"] ?? "N/A",
      estado_seguimiento: technology["Estado del seguimiento"] || "N/A",
      comentarios_analista: technology["Comentarios del analista"] || "N/A",
      fecha_scouting: formatDate(technology["Fecha de scouting"]),
      fecha_creacion: formatDate(technology.created_at),
      fecha_actualizacion: formatDate(technology.updated_at),
      status: technology.status === "inactive" ? "Inactiva" : "Activa",
      quality_score: technology.quality_score ?? "N/A",
    };

    // Render data into template
    doc.render(data);

    // Generate and download the document
    const blob = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // Create filename from technology name
    const safeName = technology["Nombre de la tecnología"]
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);
    
    saveAs(blob, `Ficha_${safeName}.docx`);
    
    return true;
  } catch (error) {
    console.error("Error generating Word document:", error);
    throw error;
  }
}
