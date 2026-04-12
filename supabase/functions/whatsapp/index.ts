// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// State machine states
enum ConversationState {
  ONBOARDING = "ONBOARDING",
  AWAITING_DESCRIPTION = "AWAITING_DESCRIPTION",
  AWAITING_LOCATION = "AWAITING_LOCATION",
  AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION",
  COMPLETE = "COMPLETE",
}

interface CallContext {
  state: ConversationState;
  chat_history: Array<{ role: "user" | "system" | "assistant"; content: string }>;
  extracted_data: {
    description?: string;
    location?: string;
    category?: string;
    priority?: string;
  };
  user_id?: string;
  attempts: number;
  created_at: string;
  last_updated: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const textData = await req.text()
    const searchParams = new URLSearchParams(textData)

    let from = searchParams.get('From') || 'Unknown'
    from = from.replace("whatsapp:", "") // Strip twilio whatsapp prefix
    let body = searchParams.get('Body') || ''
    const numMedia = parseInt(searchParams.get('NumMedia') || '0', 10);
    const mediaUrl0 = searchParams.get('MediaUrl0');
    const mediaContentType0 = searchParams.get('MediaContentType0') || '';

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log("Processing WhatsApp message from:", from, "Body:", body);

    // Handle voice transcription if media is present
    if (numMedia > 0 && mediaUrl0 && (mediaContentType0.includes('audio') || mediaContentType0.includes('video'))) {
      try {
        console.log(`Transcribing Twilio media URL: ${mediaUrl0}`);
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

        const audioRes = await fetch(mediaUrl0, {
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`)
          }
        });

        if (!audioRes.ok) {
          throw new Error('Failed to download media from Twilio');
        }
        const audioBlob = await audioRes.blob();

        const whisperFormData = new FormData();
        whisperFormData.append("file", audioBlob, 'whatsapp_audio.ogg');
        whisperFormData.append("model", "whisper-large-v3-turbo");

        const groqAudioRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqApiKey}`,
          },
          body: whisperFormData,
        });

        if (groqAudioRes.ok) {
          const groqAudioData = await groqAudioRes.json();
          if (groqAudioData.text) {
            body = groqAudioData.text;
            console.log("Transcribed text:", body);
          }
        } else {
          console.error("Groq Transcription failed:", await groqAudioRes.text());
        }
      } catch (err) {
        console.error("Error handling voice note:", err);
        return buildTwilioResponse(`Sorry, I couldn't process your voice note. Please try typing your message instead.`);
      }
    }

    // 1. Get or create user
    let { data: users } = await supabase.from('users').select('*').eq('phone', from);
    let user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      const { data: newUser } = await supabase.from('users').insert({
        phone: from,
        role: 'citizen',
        name: `Phone User ${from.slice(-4)}`,
        email: `tel_${from.replace('+', '')}@praja.local`,
        password_hash: 'dummy_hash_no_login_needed',
        aadhaar_number: `XXXX-XXXX-${from.slice(-4)}`
      }).select().single();

      user = newUser || null;
    }

    if (!user) {
      return buildTwilioResponse("Unable to create user account. Please try again.");
    }

    // ===== COMMAND HANDLING =====
    const bodyLower = body.trim().toLowerCase();

    // RESET command — replay the onboarding demo (no grievances deleted)
    if (bodyLower === 'reset') {
      // Clear aadhaar so user sees "Reply YES" flow again
      await supabase.from('users').update({ aadhaar_number: null }).eq('id', user.id);
      // Clear conversation context
      await supabase.from('call_contexts').delete().eq('call_sid', from);

      return buildTwilioResponse(
        `✅ *Demo Reset Successful*\n\n` +
        `Your conversation has been reset.\n` +
        `Send any message to start the onboarding experience again!`
      );
    }

    // HELP command
    if (bodyLower === 'help') {
      return buildTwilioResponse(
        `📋 *PRAJA Help*\n\n` +
        `• Reply *YES* to register\n` +
        `• Describe your complaint to file one\n` +
        `• *track* — view your complaints\n` +
        `• *track <id>* — check specific complaint\n` +
        `• *status* — latest complaint status\n` +
        `• *reset* — clear account & start over\n` +
        `• *help* — this message`
      );
    }

    // TRACK command (bare "track" = list all)
    if (bodyLower === 'track') {
      const { data: grievances } = await supabase
        .from('grievances')
        .select('tracking_id, description, ai_category, priority, status, created_at')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!grievances || grievances.length === 0) {
        return buildTwilioResponse("You have no complaints yet. Describe your issue to file one!");
      }

      let msg = `📋 *Your Recent Complaints:*\n\n`;
      grievances.forEach((g: any, idx: number) => {
        const emoji = g.status === 'resolved' ? '✅' : g.status === 'escalated' ? '🔴' : '🟡';
        msg += `${idx + 1}. ${emoji} *${g.ai_category || 'General'}*\n`;
        msg += `   ID: \`${g.tracking_id}\`\n`;
        msg += `   Status: ${g.status} | Priority: ${g.priority}\n\n`;
      });
      return buildTwilioResponse(msg);
    }

    // TRACK <id> command
    const trackIdMatch = bodyLower.match(/^track\s+(.+)$/);
    if (trackIdMatch) {
      const searchId = trackIdMatch[1].trim().toUpperCase();
      const { data: grievance } = await supabase
        .from('grievances')
        .select('*')
        .or(`tracking_id.eq.${searchId},id.eq.${searchId}`)
        .eq('citizen_id', user.id)
        .maybeSingle();

      if (!grievance) {
        return buildTwilioResponse(`❌ No complaint found with ID: ${searchId}\n\nType *track* to see all your complaints.`);
      }

      const statusEmoji = grievance.status === 'resolved' ? '✅' : grievance.status === 'escalated' ? '🔴' : '🟡';
      const priorityEmoji = grievance.priority === 'critical' ? '🔴' : grievance.priority === 'high' ? '🟠' : grievance.priority === 'medium' ? '🟡' : '🟢';

      return buildTwilioResponse(
        `📄 *Complaint Details*\n\n` +
        `🔖 ID: ${grievance.tracking_id}\n` +
        `${statusEmoji} Status: *${grievance.status}*\n` +
        `${priorityEmoji} Priority: ${grievance.priority}\n` +
        `📂 Category: ${grievance.ai_category || 'General'}\n` +
        `📍 Location: ${grievance.location || 'Not specified'}\n` +
        `📝 ${grievance.description?.substring(0, 200) || 'No description'}\n\n` +
        `📅 Filed: ${new Date(grievance.created_at).toLocaleDateString('en-IN')}\n` +
        (grievance.sla_deadline ? `⏰ SLA Deadline: ${new Date(grievance.sla_deadline).toLocaleDateString('en-IN')}` : '')
      );
    }

    // STATUS command
    if (bodyLower === 'status') {
      const { data: grievance } = await supabase
        .from('grievances')
        .select('tracking_id, status, ai_category, priority, created_at, sla_deadline')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!grievance) {
        return buildTwilioResponse("No active complaints found. Describe your issue to file one!");
      }

      const statusEmoji = grievance.status === 'resolved' ? '✅' : grievance.status === 'escalated' ? '🔴' : '🟡';
      return buildTwilioResponse(
        `${statusEmoji} *Latest Complaint Status*\n\n` +
        `🔖 ID: ${grievance.tracking_id}\n` +
        `📂 Category: ${grievance.ai_category || 'General'}\n` +
        `Status: *${grievance.status}* | Priority: ${grievance.priority}\n` +
        (grievance.sla_deadline ? `⏰ SLA: ${new Date(grievance.sla_deadline).toLocaleDateString('en-IN')}` : '')
      );
    }

    // ===== AADHAAR REGISTRATION FLOW =====
    if (!user.aadhaar_number) {
      if (bodyLower !== 'yes') {
        return buildTwilioResponse(
          `🙏 *Welcome to PRAJA!*\n\n` +
          `To ensure accountability and track your complaints effectively, we need to link your Aadhaar number.\n\n` +
          `🔒 Your data is secure and encrypted.\n\n` +
          `Reply *YES* to proceed with registration.`
        );
      }

      // User said YES → register with unique demo Aadhaar per user
      const last4 = from.slice(-4);
      const demoAadhaar = `XXXX-XXXX-${last4}`;
      const { error: updateError } = await supabase
        .from('users')
        .update({ aadhaar_number: demoAadhaar })
        .eq('id', user.id);

      if (updateError) {
        console.error("Error updating aadhaar_number:", updateError);
        return buildTwilioResponse("Registration failed. Please try again.");
      }

      return buildTwilioResponse(
        `✅ *Successfully Registered!*\n\n` +
        `Your Aadhaar has been linked (${demoAadhaar}).\n\n` +
        `Now, tell me about your complaint. What issue would you like to report?`
      );
    }

    // ===== CONVERSATIONAL GRIEVANCE FLOW =====

    // Load or create call context
    let callContext: CallContext | null = null;
    const { data: contextData } = await supabase
      .from('call_contexts')
      .select('data')
      .eq('call_sid', from)
      .maybeSingle();

    if (contextData && contextData.data) {
      callContext = contextData.data as CallContext;
    }

    // Initialize fresh context if none exists or if previous conversation completed
    if (!callContext || callContext.state === ConversationState.COMPLETE) {
      callContext = {
        state: ConversationState.AWAITING_DESCRIPTION,
        chat_history: [],
        extracted_data: {},
        user_id: user.id,
        attempts: 0,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };
    }

    // Update metadata
    callContext.attempts = (callContext.attempts || 0) + 1;
    callContext.last_updated = new Date().toISOString();

    // Add user message to chat history
    callContext.chat_history.push({ role: "user", content: body });

    // Keep chat history manageable (last 10 messages)
    if (callContext.chat_history.length > 10) {
      callContext.chat_history = callContext.chat_history.slice(-10);
    }

    // Build system prompt based on current state
    let systemPrompt = "";
    let replyText = "";

    if (callContext.state === ConversationState.AWAITING_DESCRIPTION) {
      systemPrompt = `You are Praja, a friendly Indian municipal complaint assistant on WhatsApp.

The citizen "${user.name}" just sent this message: "${body}"

CRITICAL LANGUAGE RULE (HIGHEST PRIORITY):
You MUST reply in the EXACT SAME language the citizen used. Detect their language from the message above.
- If the citizen writes in English → you MUST reply in English. Do NOT switch to Hindi.
- If the citizen writes in Hindi → reply in Hindi.
- If the citizen writes in Tamil → reply in Tamil.
- NEVER default to Hindi when the citizen used English. This is the most important rule.

TASK:
- Analyze the message as a complaint description.
- If the message is a clear complaint, extract the description and ask for the location (Ward/Area/City).
- If the message is vague or too short, ask ONE clarifying question.
- Be warm, concise, and use 1-2 sentences max.

Respond in JSON format ONLY:
{"type":"question","text":"your clarifying question in the SAME language as the citizen"}
OR
{"type":"acknowledged","description":"extracted clear description","text":"your response asking for location in the SAME language as the citizen"}`;

    } else if (callContext.state === ConversationState.AWAITING_LOCATION) {
      const desc = callContext.extracted_data.description || 'their complaint';

      systemPrompt = `You are Praja, extracting location for a grievance about: "${desc}"

The citizen just said: "${body}"

CRITICAL LANGUAGE RULE (HIGHEST PRIORITY):
You MUST reply in the EXACT SAME language the citizen is using in the conversation.
- If the citizen writes in English → you MUST reply in English. Do NOT switch to Hindi.
- If the citizen writes in Hindi → reply in Hindi.
- If the citizen writes in Tamil → reply in Tamil.
- NEVER default to Hindi when the citizen used English.

TASK:
- If they provided a location, extract it. Also auto-classify the issue category and priority.
- Categories: Pothole, Garbage, Drainage, Street Light, Water Supply, Roads, Encroachment, Sanitation, Health, Education, or Other.
- Priorities: low, medium, high, critical (based on urgency/safety).
- If location is missing, ask for it in one sentence.

Respond in JSON format ONLY:
{"type":"question","text":"ask for location in the SAME language as the citizen"}
OR
{"type":"ready","description":"${desc}","location":"extracted location","category":"category","priority":"low|medium|high|critical","text":"confirmation message in the SAME language as the citizen"}`;

    } else if (callContext.state === ConversationState.AWAITING_CONFIRMATION) {
      systemPrompt = `You are Praja. The citizen's grievance details are:
- Description: ${callContext.extracted_data.description}
- Location: ${callContext.extracted_data.location}
- Category: ${callContext.extracted_data.category}
- Priority: ${callContext.extracted_data.priority}

They just said: "${body}"

CRITICAL LANGUAGE RULE: Reply in the SAME language the citizen is using. If they speak English, reply English. If Hindi, reply Hindi. NEVER default to Hindi.

Determine if they are confirming (yes, ok, submit, haan, theek hai, sari, correct, etc.) or want to change something.

Respond in JSON format ONLY:
{"type":"confirmed"} — if they confirm
{"type":"modify","text":"what to ask them in the same language"} — if they want to change something
{"type":"restart"} — if they want to start over`;
    }

    // Call Groq if we have a prompt
    if (!systemPrompt) {
      replyText = "I'm here to help! Please describe the issue you'd like to report.";
      callContext.state = ConversationState.AWAITING_DESCRIPTION;
    } else {
      // Groq API call with 10s timeout (Twilio needs response within 15s)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let groqRes: Response;
      try {
        groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              ...callContext.chat_history
            ],
            temperature: 0.2,
            response_format: { type: "json_object" },
            max_tokens: 500
          }),
          signal: controller.signal
        });
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        console.error("Groq fetch error (timeout?):", fetchErr.message);
        return buildTwilioResponse("Sorry, the AI service is slow right now. Please try again in a moment.");
      }
      clearTimeout(timeout);

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        console.error("Groq API error:", errText);
        return buildTwilioResponse("Technical issue, please try again in a moment.");
      }

      const groqData = await groqRes.json();
      const aiResponseRaw = groqData.choices?.[0]?.message?.content || '{}';

      let aiResponse: Record<string, any> = {};
      try {
        aiResponse = JSON.parse(aiResponseRaw);
      } catch {
        console.error("Failed to parse Groq response:", aiResponseRaw);
        return buildTwilioResponse("I couldn't understand that. Can you say it differently?");
      }

      // Add assistant response to history
      callContext.chat_history.push({ role: "assistant", content: aiResponseRaw });

      // Handle state transitions
      if (aiResponse.type === 'question') {
        replyText = aiResponse.text || "Can you provide more details?";
        // Stay in current state (or advance from ONBOARDING)
        if (callContext.state === ConversationState.AWAITING_DESCRIPTION) {
          // Stay — needs more info
        }

      } else if (aiResponse.type === 'acknowledged') {
        callContext.extracted_data.description = aiResponse.description;
        replyText = aiResponse.text || "Thanks! What is your location (Ward/Area/City)?";
        callContext.state = ConversationState.AWAITING_LOCATION;

      } else if (aiResponse.type === 'ready') {
        callContext.extracted_data.description = aiResponse.description || callContext.extracted_data.description;
        callContext.extracted_data.location = aiResponse.location;
        callContext.extracted_data.category = aiResponse.category;
        callContext.extracted_data.priority = aiResponse.priority;

        const priorityEmoji = aiResponse.priority === 'critical' ? '🔴' : aiResponse.priority === 'high' ? '🟠' : aiResponse.priority === 'medium' ? '🟡' : '🟢';

        replyText = `📋 *Complaint Summary:*\n\n` +
          `📝 ${aiResponse.description}\n` +
          `📍 Location: ${aiResponse.location}\n` +
          `📂 Category: ${aiResponse.category}\n` +
          `${priorityEmoji} Priority: ${aiResponse.priority}\n\n` +
          `Reply *yes* to submit or tell me what to change.`;
        callContext.state = ConversationState.AWAITING_CONFIRMATION;

      } else if (aiResponse.type === 'confirmed') {
        // Submit the grievance to the database
        const trackingId = `PRJ-${new Date().toISOString().slice(2, 8).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

        const slaHoursMap: Record<string, number> = { critical: 24, high: 72, medium: 168, low: 720 };
        const slaHours = slaHoursMap[callContext.extracted_data.priority || 'medium'] || 168;
        const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

        const { error: insertError } = await supabase.from('grievances').insert({
          tracking_id: trackingId,
          citizen_id: user.id,
          title: (callContext.extracted_data.description || 'Complaint').substring(0, 100),
          description: callContext.extracted_data.description || '',
          location: callContext.extracted_data.location || '',
          ai_category: callContext.extracted_data.category || 'Other',
          priority: callContext.extracted_data.priority || 'medium',
          ai_sentiment: 'negative',
          status: 'open',
          channel: 'whatsapp',
          sla_deadline: slaDeadline,
        });

        if (insertError) {
          console.error("DB insert error:", insertError);
          replyText = "Sorry, there was an error submitting your complaint. Please try again.";
        } else {
          const priorityEmoji = callContext.extracted_data.priority === 'critical' ? '🔴' : callContext.extracted_data.priority === 'high' ? '🟠' : callContext.extracted_data.priority === 'medium' ? '🟡' : '🟢';
          const slaDate = new Date(slaDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

          replyText = `✅ *Grievance Submitted Successfully!*\n\n` +
            `🔖 Tracking ID: *${trackingId}*\n` +
            `📂 Category: ${callContext.extracted_data.category}\n` +
            `${priorityEmoji} Priority: ${callContext.extracted_data.priority}\n` +
            `📍 Location: ${callContext.extracted_data.location}\n` +
            `📝 ${callContext.extracted_data.description?.substring(0, 150)}\n\n` +
            `⏰ SLA Timeline: ${slaDate}\n\n` +
            `We'll keep you updated. Type *track ${trackingId}* to check status anytime.\n` +
            `Send another message to file a new complaint.`;
        }

        callContext.state = ConversationState.COMPLETE;

      } else if (aiResponse.type === 'modify') {
        replyText = aiResponse.text || "What would you like to change?";
        // Go back to appropriate state based on what they want to modify

      } else if (aiResponse.type === 'restart') {
        callContext.state = ConversationState.AWAITING_DESCRIPTION;
        callContext.chat_history = [];
        callContext.extracted_data = {};
        replyText = `Let's start fresh. Please describe the issue you'd like to report.`;

      } else {
        // Fallback
        replyText = aiResponse.text || "I'm here to help. Please describe your issue.";
      }
    }

    // Persist updated call context
    await supabase.from('call_contexts').upsert({
      call_sid: from,
      data: callContext
    }, { onConflict: 'call_sid' });

    return buildTwilioResponse(replyText);

  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
    const errObj = error as any;
    return buildTwilioResponse(`Sorry, something went wrong. Please try again. (${errObj.message || 'Unknown error'})`);
  }
});

function buildTwilioResponse(message: string): Response {
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${escapeXml(message)}</Message>
</Response>`;

  return new Response(xmlResponse, {
    headers: { 'Content-Type': 'text/xml' },
    status: 200,
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
