import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, document_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY")!;
    const ext = createClient(externalUrl, externalKey);

    // Find documents with raw_text but no structured data
    let query = ext
      .from("chem_contract_documents")
      .select("id, datos_extraidos, nombre_archivo, tipo_documento")
      .eq("project_id", project_id);

    if (document_id) {
      query = query.eq("id", document_id);
    }

    const { data: docs, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    // Filter: has raw_text but no supplier_name
    const toProcess = (docs || []).filter(
      (d: any) => d.datos_extraidos?.raw_text && !d.datos_extraidos?.supplier_name
    );

    if (toProcess.length === 0) {
      return new Response(
        JSON.stringify({ message: "No documents to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const doc of toProcess) {
      // Mark as processing
      await ext
        .from("chem_contract_documents")
        .update({ estado_extraccion: "procesando" })
        .eq("id", doc.id);

      try {
        const rawText = doc.datos_extraidos.raw_text;

        const prompt = `Eres un auditor experto en contratos de suministro de productos químicos industriales. Analiza el siguiente texto de contrato y extrae TODOS los datos estructurados posibles.

TEXTO DEL CONTRATO:
---
${rawText}
---

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta. Para campos no encontrados usa null. No inventes datos.

{
  "supplier_name": "nombre del proveedor/suministrador",
  "supplier_cif": "CIF/NIF del proveedor",
  "plazo_pago_dias": número_días_plazo_pago,
  "pronto_pago_descuento_pct": porcentaje_descuento_pronto_pago,
  "pronto_pago_dias": días_para_pronto_pago,
  "duracion_contrato_meses": duración_en_meses,
  "fecha_inicio": "YYYY-MM-DD",
  "fecha_vencimiento": "YYYY-MM-DD",
  "renovacion_automatica": true/false,
  "preaviso_no_renovacion_dias": días_preaviso,
  "take_or_pay": true/false,
  "volumen_comprometido_anual": kg_por_año,
  "penalizacion_take_or_pay": "detalle de la penalización",
  "formula_revision_detalle": "descripción de la fórmula de revisión de precios",
  "indice_vinculado": "nombre del índice (ICIS, etc.)",
  "frecuencia_revision": "mensual/trimestral/anual/etc.",
  "rappel_detalle": "detalle de rappels o descuentos por volumen",
  "detalle_servicio_tecnico": "descripción del servicio técnico incluido",
  "detalle_comodato": "equipos en comodato/préstamo",
  "productos_mencionados": [
    {
      "nombre": "nombre del producto",
      "precio_kg": precio_por_kg_en_euros,
      "formato": "envase/formato",
      "incoterm": "DAP/EXW/etc.",
      "concentracion": porcentaje_concentración,
      "volumen_anual": kg_anuales,
      "tipo_precio": "fijo/variable/indexado"
    }
  ],
  "alertas_auditor": [
    "Lista de alertas relevantes para un auditor de costes. Ejemplos: TAE implícita del pronto pago, vencimientos próximos, cláusulas take-or-pay, rappels potencialmente no cobrados, ausencia de cláusula MFN, ausencia de cap/floor en fórmulas de revisión, etc."
  ],
  "confianza_por_campo": {
    "supplier_name": 0.0_a_1.0,
    "plazo_pago_dias": 0.0_a_1.0
  }
}

REGLAS:
1. Si el pronto pago tiene descuento, calcula la TAE implícita: TAE = (descuento/(1-descuento)) * (365/(plazo_normal - plazo_pronto)) * 100. Inclúyela como alerta.
2. Si el contrato vence en los próximos 90 días, genera alerta de vencimiento.
3. Si hay take-or-pay, genera alerta indicando el riesgo.
4. Si NO hay cláusula de revisión de precios, genera alerta.
5. Si NO hay cláusula MFN (Most Favored Nation), genera alerta.
6. Confianza: 1.0 = dato explícito en el texto, 0.7 = inferido/calculado, 0.3 = muy incierto.`;

        // Call Lovable AI (Gemini 2.5 Flash)
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

        const aiResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/ai`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: prompt }],
            }),
          }
        );

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          throw new Error(`AI API error: ${aiResponse.status} - ${errText}`);
        }

        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content || "";

        // Parse JSON from response (handle markdown code blocks)
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1];
        jsonStr = jsonStr.trim();

        const structured = JSON.parse(jsonStr);

        // Calculate average confidence
        let avgConfianza = null;
        if (structured.confianza_por_campo) {
          const vals = Object.values(structured.confianza_por_campo).filter(
            (v: any) => typeof v === "number"
          ) as number[];
          if (vals.length > 0) {
            avgConfianza = vals.reduce((a, b) => a + b, 0) / vals.length;
          }
        }

        // Merge with existing datos_extraidos (keep raw_text, chars, pages)
        const mergedData = {
          ...doc.datos_extraidos,
          ...structured,
        };

        // Update document
        const { error: updateErr } = await ext
          .from("chem_contract_documents")
          .update({
            datos_extraidos: mergedData,
            estado_extraccion: "completado",
            confianza_extraccion: avgConfianza,
          })
          .eq("id", doc.id);

        if (updateErr) throw updateErr;

        results.push({
          id: doc.id,
          nombre: doc.nombre_archivo,
          status: "success",
          supplier: structured.supplier_name,
          fields_extracted: Object.keys(structured).filter(
            (k) => structured[k] != null && k !== "confianza_por_campo"
          ).length,
        });
      } catch (docErr: any) {
        console.error(`Error processing doc ${doc.id}:`, docErr);
        await ext
          .from("chem_contract_documents")
          .update({
            estado_extraccion: "error",
            error_message: docErr.message?.substring(0, 500),
          })
          .eq("id", doc.id);
        results.push({
          id: doc.id,
          nombre: doc.nombre_archivo,
          status: "error",
          error: docErr.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

