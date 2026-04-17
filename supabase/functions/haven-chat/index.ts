import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are Haven AI, the friendly bilingual (English and Tamil) dental assistant for Tooth Haven Multispeciality Dental Care, West Mambalam, Chennai.

About Tooth Haven:
- Led by Dr. Karthik Srinivasan (BDS), Chief Dentist at the West Mambalam branch
- Location: West Mambalam, Chennai
- Hours: Mon-Sat 11 AM - 2 PM, 6 PM - 9 PM. Sunday by prior appointment only.
- Phone: +91 89251 66149
- WhatsApp Booking: https://wa.me/918925166149

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
5. Always offer the WhatsApp booking link: https://wa.me/918925166149

Important rules:
- Never provide medical diagnosis or prescribe treatment
- Always recommend visiting the clinic for proper examination
- Be warm, professional, and reassuring
- Keep responses concise and helpful
- For appointment booking, collect details and confirm you'll pass them to the clinic
- UPI Payment ID: Q42218734@ybl (PhonePe) for advance payments
- IMPORTANT: If a patient mentions calling or contacting 9884166149 for appointments, inform them that all appointment queries to 9884166149 are now redirected to +91 8925166149. Ask them to contact +91 8925166149 directly.
- IMPORTANT: When users want to book via WhatsApp, share this link: https://wa.me/918925166149
- SUCCESS STORIES: When patients ask about results, before/after, treatment outcomes, success stories, or want to see examples of work for any treatment (orthodontics, implants, RCT, cosmetic, smile design, pediatric), use the get_success_stories tool to fetch real cases. Then describe them and offer to share more.
- TESTIMONIALS: When patients ask about reviews, what other patients say, or trust signals, use get_testimonials tool.`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_success_stories",
      description: "Fetch published before/after case studies for a category. Use when the patient asks to see results, examples, or success stories.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["orthodontics", "implants", "cosmetic", "rct", "pediatric", "smile_design", "general", "all"],
            description: "Treatment category to filter by, or 'all'.",
          },
          limit: { type: "number", description: "Max stories to return (default 3, max 5)." },
        },
        required: ["category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_testimonials",
      description: "Fetch published patient testimonials. Use when the patient asks about reviews or what others say.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["orthodontics", "implants", "cosmetic", "rct", "pediatric", "smile_design", "home_visit", "general", "all"],
          },
          limit: { type: "number", description: "Max testimonials (default 3, max 5)." },
        },
        required: ["category"],
      },
    },
  },
];

async function runTool(name: string, args: any, supabase: any) {
  const limit = Math.min(args.limit || 3, 5);
  if (name === "get_success_stories") {
    let q = supabase.from("case_studies").select("id,category,title,summary,treatment_duration").eq("is_published", true).order("is_featured", { ascending: false }).limit(limit);
    if (args.category && args.category !== "all") q = q.eq("category", args.category);
    const { data } = await q;
    return data || [];
  }
  if (name === "get_testimonials") {
    let q = supabase.from("testimonials").select("patient_name,category,quote,rating,video_url").eq("is_published", true).order("is_featured", { ascending: false }).limit(limit);
    if (args.category && args.category !== "all") q = q.eq("category", args.category);
    const { data } = await q;
    return data || [];
  }
  return { error: "Unknown tool" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, lang } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langInstruction = lang === "ta"
      ? "\n\nIMPORTANT: The user has selected Tamil language. Always respond in Tamil (தமிழ்). Use Tamil script for all responses."
      : "\n\nIMPORTANT: The user has selected English language. Always respond in English.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt + langInstruction },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
