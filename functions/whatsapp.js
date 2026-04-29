const { createClient } = require("@supabase/supabase-js");

const ConversationState = {
  ONBOARDING: 'onboarding',
  AWAITING_DESCRIPTION: 'awaiting_description',
  AWAITING_LOCATION: 'awaiting_location',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  COMPLETE: 'complete'
};

function buildTwilioResponse(message) {
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return { xml: xmlResponse };
}

function escapeXml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

exports.whatsappHandler = async (req, res) => {
  try {
    const textData = req.rawBody ? req.rawBody.toString() : '';
    const searchParams = new URLSearchParams(textData);

    let from = searchParams.get('From');
    if (from && from.startsWith('whatsapp:')) from = from.replace("whatsapp:", "");
    const body = searchParams.get('Body') || '';

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    let user = null;
    if (from) {
      let { data: users } = await supabase.from('users').select('*').eq('phone', from);
      if (users && users.length > 0) user = users[0];
      if (!user) {
        const { data: newUser } = await supabase.from('users').insert({
          phone: from, role: 'citizen', name: `WhatsApp User`, email: `wa_${from.replace('+', '') || Math.random().toString().slice(2,8)}@praja.local`, password_hash: 'dummy'
        }).select().single();
        user = newUser;
      }
    }

    if (!user) {
      const response = buildTwilioResponse("Could not identify user. Please register first.");
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(response.xml);
    }

    let callContext = { state: ConversationState.ONBOARDING, chat_history: [], extracted_data: {} };
    const { data: contextData } = await supabase.from('call_contexts').select('data').eq('call_sid', from).maybeSingle();

    if (contextData && contextData.data) {
      callContext = contextData.data;
    }

    const lowerBody = body.toLowerCase();
    if (lowerBody === 'hi' || lowerBody === 'hello' || lowerBody === 'start' || lowerBody === 'help') {
      callContext.state = ConversationState.AWAITING_DESCRIPTION;
      callContext.chat_history = [];
      callContext.extracted_data = {};
      const replyText = `🙏 Welcome to Praja!\nI am your AI assistant for municipal complaints.\n\nPlease describe the issue you'd like to report (e.g., "Pothole near main market").`;
      await supabase.from('call_contexts').upsert({ call_sid: from, data: callContext }, { onConflict: 'call_sid' });
      const response = buildTwilioResponse(replyText);
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(response.xml);
    }

    if (lowerBody.startsWith('track')) {
      const trackingId = body.replace(/track/i, '').trim().toUpperCase();
      let replyText = "";
      if (!trackingId) {
        replyText = "Please provide your tracking ID. Example: *track PRJ-12345*";
      } else {
        const { data: tix } = await supabase.from('grievances').select('*').ilike('tracking_id', `%${trackingId}%`).limit(1);
        if (tix && tix.length > 0) {
          const t = tix[0];
          replyText = `📊 *Status for ${t.tracking_id}*\n\nStatus: *${t.status.toUpperCase()}*\nCategory: ${t.ai_category}\nPriority: ${t.priority.toUpperCase()}`;
        } else {
          replyText = `Sorry, I couldn't find a complaint with ID ${trackingId}.`;
        }
      }
      const response = buildTwilioResponse(replyText);
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(response.xml);
    }

    callContext.chat_history.push({ role: "user", content: body });
    if (callContext.chat_history.length > 10) callContext.chat_history = callContext.chat_history.slice(-10);

    let systemPrompt = "";
    let replyText = "";
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (callContext.state === ConversationState.AWAITING_DESCRIPTION) {
      systemPrompt = `You are Praja, a friendly Indian municipal complaint assistant on WhatsApp.\nThe citizen "${user.name}" just sent a message. Analyze it as a complaint description.\nRULES:\n- Respond in the SAME LANGUAGE the citizen uses (Hindi, Tamil, Telugu, Kannada, English, etc.)\n- If the message is a clear complaint, extract the description and ask for the location (Ward/Area/City).\n- If the message is vague or too short, ask ONE clarifying question.\n- Be warm, concise, and use 1-2 sentences max.\nRespond in JSON format ONLY:\n{"type":"question","text":"your clarifying question"} — if description needs more detail\nOR\n{"type":"acknowledged","description":"extracted clear description","text":"your response asking for location"}`;
    } else if (callContext.state === ConversationState.AWAITING_LOCATION) {
      const desc = callContext.extracted_data.description || 'their complaint';
      systemPrompt = `You are Praja, extracting location for a grievance about: "${desc}"\nThe citizen just said: "${body}"\nRULES:\n- Respond in the SAME LANGUAGE the citizen used.\n- If they provided a location, extract it. Also auto-classify the issue category and priority.\n- Categories: Pothole, Garbage, Drainage, Street Light, Water Supply, Roads, Encroachment, Sanitation, Health, Education, or Other.\n- Priorities: low, medium, high, critical (based on urgency/safety).\n- If location is missing, ask for it in one sentence.\nRespond in JSON format ONLY:\n{"type":"question","text":"Please provide your location..."} — if location unclear\nOR\n{"type":"ready","description":"${desc}","location":"extracted location","category":"category","priority":"low|medium|high|critical","text":"confirmation message summarizing the complaint"}`;
    } else if (callContext.state === ConversationState.AWAITING_CONFIRMATION) {
      systemPrompt = `You are Praja. The citizen's grievance details are:\n- Description: ${callContext.extracted_data.description}\n- Location: ${callContext.extracted_data.location}\n- Category: ${callContext.extracted_data.category}\n- Priority: ${callContext.extracted_data.priority}\nThey just said: "${body}"\nDetermine if they are confirming (yes, ok, submit, haan, theek hai, sari, correct, etc.) or want to change something.\nRespond in JSON format ONLY:\n{"type":"confirmed"} — if they confirm\n{"type":"modify","text":"what to ask them"} — if they want to change something\n{"type":"restart"} — if they want to start over`;
    }

    if (!systemPrompt) {
      replyText = "I'm here to help! Please describe the issue you'd like to report.";
      callContext.state = ConversationState.AWAITING_DESCRIPTION;
    } else if (geminiApiKey) {
      const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${geminiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gemini-2.0-flash", messages: [ { role: "system", content: systemPrompt }, ...callContext.chat_history ], temperature: 0.2, response_format: { type: "json_object" }, max_tokens: 500 })
      });

      if (!geminiRes.ok) {
        replyText = "Technical issue, please try again in a moment.";
      } else {
        const geminiData = await geminiRes.json();
        const aiResponseRaw = geminiData.choices?.[0]?.message?.content || '{}';
        let aiResponse = {};
        try { aiResponse = JSON.parse(aiResponseRaw); } catch (e) {}

        callContext.chat_history.push({ role: "assistant", content: aiResponseRaw });

        if (aiResponse.type === 'question') {
          replyText = aiResponse.text || "Can you provide more details?";
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
          replyText = `📋 *Complaint Summary:*\n\n📝 ${aiResponse.description}\n📍 Location: ${aiResponse.location}\n📂 Category: ${aiResponse.category}\n${priorityEmoji} Priority: ${aiResponse.priority}\n\nReply *yes* to submit or tell me what to change.`;
          callContext.state = ConversationState.AWAITING_CONFIRMATION;
        } else if (aiResponse.type === 'confirmed') {
          const trackingId = `PRJ-${new Date().toISOString().slice(2, 8).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
          const slaHoursMap = { critical: 24, high: 72, medium: 168, low: 720 };
          const slaHours = slaHoursMap[callContext.extracted_data.priority || 'medium'] || 168;
          const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

          const { error: insertError } = await supabase.from('grievances').insert({
            tracking_id: trackingId, citizen_id: user.id, title: (callContext.extracted_data.description || 'Complaint').substring(0, 100), description: callContext.extracted_data.description || '', location: callContext.extracted_data.location || '', ai_category: callContext.extracted_data.category || 'Other', priority: callContext.extracted_data.priority || 'medium', ai_sentiment: 'negative', status: 'open', channel: 'whatsapp', sla_deadline: slaDeadline,
          });

          if (insertError) {
            replyText = "Sorry, there was an error submitting your complaint. Please try again.";
          } else {
            const priorityEmoji = callContext.extracted_data.priority === 'critical' ? '🔴' : callContext.extracted_data.priority === 'high' ? '🟠' : callContext.extracted_data.priority === 'medium' ? '🟡' : '🟢';
            const slaDate = new Date(slaDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            replyText = `✅ *Grievance Submitted Successfully!*\n\n🔖 Tracking ID: *${trackingId}*\n📂 Category: ${callContext.extracted_data.category}\n${priorityEmoji} Priority: ${callContext.extracted_data.priority}\n📍 Location: ${callContext.extracted_data.location}\n📝 ${callContext.extracted_data.description?.substring(0, 150)}\n\n⏰ SLA Timeline: ${slaDate}\n\nWe'll keep you updated. Type *track ${trackingId}* to check status anytime.\nSend another message to file a new complaint.`;
          }
          callContext.state = ConversationState.COMPLETE;
        } else if (aiResponse.type === 'modify') {
          replyText = aiResponse.text || "What would you like to change?";
        } else if (aiResponse.type === 'restart') {
          callContext.state = ConversationState.AWAITING_DESCRIPTION;
          callContext.chat_history = [];
          callContext.extracted_data = {};
          replyText = `Let's start fresh. Please describe the issue you'd like to report.`;
        } else {
          replyText = aiResponse.text || "I'm here to help. Please describe your issue.";
        }
      }
    } else {
      replyText = "System is unavailable. Please try again later.";
    }

    await supabase.from('call_contexts').upsert({ call_sid: from, data: callContext }, { onConflict: 'call_sid' });
    const response = buildTwilioResponse(replyText);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(response.xml);
  } catch (error) {
    const response = buildTwilioResponse(`Sorry, something went wrong. Please try again. (${error.message || 'Unknown error'})`);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(response.xml);
  }
};
