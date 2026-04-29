const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { createClient } = require("@supabase/supabase-js");
const { transcribeHandler } = require("./transcribe");
const { sentinelHandler } = require("./sentinel");
const { grievancesApiHandler } = require("./grievancesApi");
const { whatsappHandler } = require("./whatsapp");
const { twilioVoiceHandler } = require("./twilioVoice");

admin.initializeApp();

const ALLOWED_ORIGINS = [
  "https://prajavox.vercel.app",
  "http://localhost:5173",
];

const withCors = (req, res, handler) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type, x-user-id, x-praja-user-id, x-praja-user-role");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  return handler(req, res);
};

// GRIEVANCE AI
exports.grievanceAi = onRequest((req, res) => {
  return withCors(req, res, async (req, res) => {
    const path = req.path.split('/').pop() || '';

    if (path === 'photo-need') {
      return await handlePhotoNeed(req, res);
    } else if (path === 'verify-photo') {
      return await handleVerifyPhoto(req, res);
    }

    return res.status(404).json({ error: 'Route not found' });
  });
});

async function handlePhotoNeed(req, res) {
  try {
    const { title, description } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(200).json({ photo_need: "optional", prompt_to_user: "A photo is optional, but it can help us verify and resolve faster." });
    }
    const systemPrompt = `You are a municipal grievance classifier. Based on the following title and description of a complaint, determine if a photo is 'required' (for physical issues like potholes, garbage, leaks), 'not_needed' (for inquiries, status tracking, document requests), or 'optional'.
Respond ONLY with a valid JSON object:
{"need": "required|optional|not_needed", "prompt": "A short, helpful prompt to the user explaining why a photo is needed or not."}`;

    const reqBody = {
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: `${systemPrompt}\n\nTitle: ${title}\nDescription: ${description}` }],
      temperature: 0.1, max_tokens: 100, response_format: { type: "json_object" }
    };

    const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST", headers: { "Authorization": `Bearer ${geminiApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(reqBody)
    });
    const data = await geminiRes.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    let need = "optional"; let prompt = "A photo is optional, but it can help us verify and resolve faster.";
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.need) need = parsed.need;
      if (parsed.prompt) prompt = parsed.prompt;
    } catch (e) {}
    return res.status(200).json({ photo_need: need, prompt_to_user: prompt });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

async function handleVerifyPhoto(req, res) {
  try {
    const { title, description, photo_url, photo_base64 } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(200).json({ matches: true, reason: "Verification skipped (No API Key)" });
    }
    const systemPrompt = `You are a hyper-strict infrastructure and civic issue photo verification assistant. Your task is strictly to verify if the attached image visually and physically depicts the *exact* issue described below.
Title: ${title}\nDescription: ${description}\nIf the image is a certificate, document, or completely unrelated to a physical complaint issue (like an ID card, a selfie, a cartoon, text), return "matches": false and explain the mismatch in "reason". Respond ONLY with valid JSON. Schema: {"matches": true, "reason": "Short explanation"} or {"matches": false, "reason": "Explain why"}`;

    let imageUrl = photo_url || photo_base64;
    const reqBody = {
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: [{ type: "text", text: systemPrompt }, { type: "image_url", image_url: { url: imageUrl } }] }],
      temperature: 0.1, max_tokens: 100
    };

    const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST", headers: { "Authorization": `Bearer ${geminiApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(reqBody)
    });
    const data = await geminiRes.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    try {
      const matchPattern = rawContent.match(/\{[\s\S]*matches[\s\S]*\}/) || [];
      const parsed = JSON.parse(matchPattern[0] || rawContent);
      if (parsed.matches !== undefined) return res.status(200).json({ matches: parsed.matches, reason: parsed.reason || "Vision AI verification complete." });
    } catch(e) {}
    return res.status(200).json({ matches: true, reason: "Vision AI fallback acceptance." });
  } catch (error) {
    return res.status(200).json({ matches: true, reason: "Error contacting verification engine." });
  }
}

// GRIEVANCE SUBMIT & FCM NOTIFICATIONS
exports.grievanceSubmit = onRequest((req, res) => {
  return withCors(req, res, async (req, res) => {
    try {
      const { title, description, photo_url, user_location_text } = req.body;
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Missing auth headers' });

      const token = authHeader.replace('Bearer ', '');
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
      const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

      const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await supabase.auth.getUser(token);
      let citizenId = user?.id; let sb = supabase;

      if (!citizenId) {
        const headerUserId = req.headers['x-user-id'];
        if (!headerUserId) return res.status(401).json({ error: 'Could not identify user.' });
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);
        const { data: foundUser } = await supabaseAdmin.from('users').select('id').eq('id', headerUserId).maybeSingle();
        if (!foundUser) {
          const demoUser = { id: headerUserId, name: "Demo User " + headerUserId.substring(0,4), email: "demo_" + headerUserId.substring(0,8) + "@example.com", password_hash: "demo", role: "citizen" };
          await supabaseAdmin.from('users').insert(demoUser);
        }
        citizenId = headerUserId; sb = supabaseAdmin;
      }

      const trackingId = `PRJ-${new Date().toISOString().slice(2, 8).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const insertData = {
        tracking_id: trackingId, citizen_id: citizenId, title, description, ai_category: "General", ai_sentiment: "negative", priority: "medium", status: "open", channel: "web", sla_deadline: new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString()
      };
      if (photo_url) insertData.photo_url = photo_url;
      if (user_location_text) insertData.location = user_location_text;

      const { data: dbRes, error } = await sb.from('grievances').insert(insertData).select().single();
      if (error) return res.status(500).json({ error: error.message });

      // FCM Notification
      try {
        const message = { notification: { title: `New Grievance Submitted: ${trackingId}`, body: `Your issue regarding "${title}" has been recorded.` }, topic: `user_${citizenId}` };
        await admin.messaging().send(message);
      } catch (fcmErr) {}

      return res.status(201).json(dbRes);
    } catch (error) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  });
});

exports.transcribe = onRequest((req, res) => withCors(req, res, transcribeHandler));
exports.sentinel = onRequest((req, res) => withCors(req, res, sentinelHandler));
exports.grievancesApi = onRequest((req, res) => withCors(req, res, grievancesApiHandler));
exports.whatsappWebhook = onRequest((req, res) => withCors(req, res, whatsappHandler));
exports.twilioVoice = onRequest((req, res) => withCors(req, res, twilioVoiceHandler));

exports.devDummyEndpoint = onRequest((req, res) => {
  return withCors(req, res, async (req, res) => {
    res.status(200).json({ status: "ok" });
  });
});
