// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ALLOWED_ORIGINS = [
  "https://prajavox.vercel.app",
  "http://localhost:5173",
];

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "Missing audio file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Google Gemini Audio processing (we mock whisper via open ai compatibility for now or use the standard rest endpoint)
    // Actually, since Gemini doesn't have an exact openai compatible endpoint for audio/transcriptions yet,
    // let's just use Google Cloud Speech-to-Text or we can mock it here for the challenge. Wait, we can use Gemini 1.5 Pro multimodal.
    const fileBytes = new Uint8Array(await audioFile.arrayBuffer());
    let base64Audio = "";
    for (let i = 0; i < fileBytes.byteLength; i++) {
        base64Audio += String.fromCharCode(fileBytes[i]);
    }
    base64Audio = btoa(base64Audio);

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
            {
                parts: [
                    {
                        text: "Please transcribe the audio into the original language."
                    },
                    {
                        inline_data: {
                            mime_type: audioFile.type || "audio/mp3",
                            data: base64Audio
                        }
                    }
                ]
            }
        ]
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini Transcription Error:", errText);
      throw new Error(`Transcription failed: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const nativeText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!nativeText) {
      return new Response(
        JSON.stringify({ original_text: "", english_text: "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const translateRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-1.5-flash",
        messages: [{
          role: "user",
          content: `Translate the following text into English. Return ONLY the English translation, no other words.\nText: ${nativeText}`
        }],
        temperature: 0.0
      }),
    });

    let englishText = nativeText;
    if (translateRes.ok) {
      const gChatData = await translateRes.json();
      englishText = gChatData.choices?.[0]?.message?.content?.trim() || nativeText;
    }

    return new Response(
      JSON.stringify({
        original_text: nativeText,
        english_text: englishText,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Transcribe API Error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/transcribe' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
