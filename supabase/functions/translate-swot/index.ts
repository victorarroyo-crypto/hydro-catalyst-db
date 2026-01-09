import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluationToTranslate {
  id: string;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  threats?: string[];
  competitive_advantages?: string[];
  implementation_barriers?: string[];
}

interface TranslatedEvaluation extends EvaluationToTranslate {
  was_translated: boolean;
}

// Detect language based on common words
function detectLanguage(texts: string[]): 'en' | 'es' | 'unknown' {
  const allText = texts.join(' ').toLowerCase();
  
  // Common English words in technical texts
  const englishWords = ['the', 'and', 'with', 'for', 'is', 'are', 'has', 'have', 'high', 'low', 
    'cost', 'proven', 'technology', 'system', 'based', 'which', 'that', 'this', 'from', 'can',
    'will', 'be', 'to', 'of', 'in', 'on', 'at', 'by', 'an', 'as'];
  
  // Common Spanish words
  const spanishWords = ['el', 'la', 'los', 'las', 'con', 'para', 'es', 'son', 'tiene', 'tienen',
    'alto', 'bajo', 'costo', 'probada', 'tecnología', 'sistema', 'basado', 'que', 'este', 'esta',
    'puede', 'será', 'ser', 'de', 'en', 'por', 'un', 'una', 'como'];

  let englishCount = 0;
  let spanishCount = 0;

  for (const word of englishWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = allText.match(regex);
    if (matches) englishCount += matches.length;
  }

  for (const word of spanishWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = allText.match(regex);
    if (matches) spanishCount += matches.length;
  }

  console.log(`Language detection - English: ${englishCount}, Spanish: ${spanishCount}`);

  if (englishCount > spanishCount * 1.5) return 'en';
  if (spanishCount > englishCount * 1.5) return 'es';
  if (englishCount > spanishCount) return 'en';
  if (spanishCount > englishCount) return 'es';
  return 'unknown';
}

// Collect all texts from evaluations for language detection
function collectAllTexts(evaluations: EvaluationToTranslate[]): string[] {
  const texts: string[] = [];
  for (const eval_ of evaluations) {
    if (eval_.strengths) texts.push(...eval_.strengths);
    if (eval_.weaknesses) texts.push(...eval_.weaknesses);
    if (eval_.opportunities) texts.push(...eval_.opportunities);
    if (eval_.threats) texts.push(...eval_.threats);
    if (eval_.competitive_advantages) texts.push(...eval_.competitive_advantages);
    if (eval_.implementation_barriers) texts.push(...eval_.implementation_barriers);
  }
  return texts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { evaluations } = await req.json() as { evaluations: EvaluationToTranslate[] };

    if (!evaluations || evaluations.length === 0) {
      return new Response(
        JSON.stringify({ translations: [], detected_language: 'unknown' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect all texts and detect language
    const allTexts = collectAllTexts(evaluations);
    const detectedLanguage = detectLanguage(allTexts);

    console.log(`Detected language: ${detectedLanguage}`);

    // If already in Spanish, return without translation
    if (detectedLanguage === 'es') {
      const translations: TranslatedEvaluation[] = evaluations.map(e => ({
        ...e,
        was_translated: false
      }));
      return new Response(
        JSON.stringify({ translations, detected_language: 'es' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If unknown or English, translate
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      // Return original content as fallback
      const translations: TranslatedEvaluation[] = evaluations.map(e => ({
        ...e,
        was_translated: false
      }));
      return new Response(
        JSON.stringify({ translations, detected_language: detectedLanguage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare batch translation request
    const translationPrompt = `Traduce los siguientes puntos de análisis SWOT del inglés al español profesional.

INSTRUCCIONES:
- Mantén el formato con asteriscos para negritas (**texto**)
- Mantén el mismo significado y tono técnico
- NO añadas ni elimines información
- Traduce términos técnicos de forma apropiada para el sector industrial
- Mantén las siglas técnicas (TRL, MBR, etc.) sin traducir

Devuelve SOLO un JSON válido con la misma estructura, sin explicaciones adicionales.

Datos a traducir:
${JSON.stringify(evaluations, null, 2)}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Eres un traductor técnico especializado en tecnología industrial y consultoría. Traduces del inglés al español manteniendo la precisión técnica. Siempre respondes con JSON válido.'
          },
          {
            role: 'user',
            content: translationPrompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI Gateway error:', response.status, await response.text());
      // Return original content as fallback
      const translations: TranslatedEvaluation[] = evaluations.map(e => ({
        ...e,
        was_translated: false
      }));
      return new Response(
        JSON.stringify({ translations, detected_language: detectedLanguage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse the JSON response from AI
    let translatedData: EvaluationToTranslate[];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        translatedData = JSON.parse(jsonMatch[0]);
      } else {
        translatedData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('AI response content:', content);
      // Return original content as fallback
      const translations: TranslatedEvaluation[] = evaluations.map(e => ({
        ...e,
        was_translated: false
      }));
      return new Response(
        JSON.stringify({ translations, detected_language: detectedLanguage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as translated
    const translations: TranslatedEvaluation[] = translatedData.map(e => ({
      ...e,
      was_translated: true
    }));

    console.log(`Successfully translated ${translations.length} evaluations`);

    return new Response(
      JSON.stringify({ translations, detected_language: 'en' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in translate-swot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
