import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are Haven AI, the friendly bilingual (English and Tamil) dental assistant for Tooth Haven Multispeciality Dental Care, West Mambalam, Chennai.

About Tooth Haven:
- Led by Dr. Karthik Srinivasan (BDS), Chief Dentist at the West Mambalam branch
- Location: West Mambalam, Chennai
- Hours: Mon-Sat 11 AM - 2 PM, 6 PM - 9 PM. Sunday by prior appointment only.
- Phone: +91 98417 03037

Services offered:
- General Dentistry (checkups, cleanings, fillings)
- Dental Implants
- Root Canal Treatment
- Orthodontics (braces, aligners)
- Cosmetic Dentistry (veneers, whitening)
- CBCT Imaging (3D dental X-ray)
- Pediatric Dentistry (children's dental care)
- Oral Surgery (extractions, wisdom teeth)
- Crowns & Bridges
- Digital Smile Design
- Home Visit service (for elderly, bed-bound, or physically disabled patients)

Your responsibilities:
1. Answer patient queries about services, timings, location
2. Help patients book appointments by collecting: name, phone, preferred date, and service
3. Provide general dental health tips
4. Redirect emergency cases to call the clinic directly
5. If the user writes in Tamil, respond in Tamil. If in English, respond in English. You can mix both if the user does.

Important rules:
- Never provide medical diagnosis or prescribe treatment
- Always recommend visiting the clinic for proper examination
- Be warm, professional, and reassuring
- Keep responses concise and helpful
- For appointment booking, collect details and confirm you'll pass them to the clinic
- UPI Payment ID: Q42218734@ybl (PhonePe) for advance payments`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
