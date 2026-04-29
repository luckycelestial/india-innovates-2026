const Busboy = require("busboy");

exports.transcribeHandler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const busboy = Busboy({ headers: req.headers });
  let base64Audio = "";
  let audioBuffer = null;

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (fieldname === "audio") {
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        audioBuffer = Buffer.concat(chunks);
        base64Audio = audioBuffer.toString("base64");
      });
    } else {
      file.resume();
    }
  });

  busboy.on("finish", async () => {
    if (!base64Audio) {
      return res.status(400).json({ error: "Missing audio file" });
    }

    try {
      // Google Cloud Speech-to-Text v2 API
      const gcpProjectId = process.env.GCP_PROJECT_ID || "dummy-project";
      const gcpLocation = "global";
      const sttApiKey = process.env.GCP_STT_API_KEY || process.env.GEMINI_API_KEY;

      let nativeText = "";

      if (sttApiKey) {
        const sttRes = await fetch(`https://speech.googleapis.com/v2/projects/${gcpProjectId}/locations/${gcpLocation}/recognizers/_:recognize?key=${sttApiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            config: {
              languageCodes: ["en-IN", "hi-IN", "ta-IN", "te-IN"],
              autoDecodingConfig: {},
              model: "latest_long",
            },
            content: base64Audio,
          }),
        });

        if (!sttRes.ok) {
          const errText = await sttRes.text();
          console.error("STT API Error:", errText);
          throw new Error(`Transcription failed: ${errText}`);
        }

        const sttData = await sttRes.json();
        const results = sttData.results || [];
        nativeText = results.map((r) => r.alternatives?.[0]?.transcript || "").join(" ");
      } else {
         // Mock response if no API key is provided
         nativeText = "Mock native text response from Firebase Functions without API key";
      }

      if (!nativeText) {
        return res.status(200).json({ original_text: "", english_text: "" });
      }

      const translateRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
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

      return res.status(200).json({
        original_text: nativeText,
        english_text: englishText,
      });
    } catch (error) {
      console.error("Transcribe API Error:", error.message);
      return res.status(500).json({ error: error.message });
    }
  });

  busboy.end(req.rawBody);
};
