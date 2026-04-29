const { createClient } = require("@supabase/supabase-js");

const NO_SPEECH_MSG = "No input was received. Please call back and describe your complaint, or send us an SMS.";

exports.twilioVoiceHandler = async (req, res) => {
  try {
    const step = req.query.step || 'inbound';
    const textData = req.rawBody ? req.rawBody.toString() : '';
    const searchParams = new URLSearchParams(textData);

    let from = searchParams.get('From');
    if (from && from.startsWith('whatsapp:')) from = from.replace("whatsapp:", "");
    const speechResult = searchParams.get('SpeechResult') || '';

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const baseActionUrl = '/twilioVoice';
    let xml = '';

    if (step === 'inbound') {
      xml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
          <Gather input="speech" action="${baseActionUrl}?step=menu" method="POST" timeout="8" speechTimeout="auto" language="en-IN" enhanced="true">
              <Say voice="Polly.Aditi" language="en-IN">Welcome to Praja voice assistant. Please speak naturally. Say "file complaint" to register a new complaint, or say "track ticket" to check status.</Say>
          </Gather>
          <Say voice="Polly.Aditi" language="en-IN">${NO_SPEECH_MSG}</Say>
      </Response>`;
    } else if (step === 'menu') {
      const spoken = speechResult.toLowerCase();
      const wantsFile = spoken.includes('file') || spoken.includes('complaint') || spoken.includes('issue');
      const wantsTrack = spoken.includes('track') || spoken.includes('status') || spoken.includes('ticket');

      if (wantsFile) {
        xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Gather input="speech" action="${baseActionUrl}?step=issue" method="POST" timeout="8" speechTimeout="auto" language="en-IN" enhanced="true">
                <Say voice="Polly.Aditi" language="en-IN">Please describe your issue briefly.</Say>
            </Gather>
            <Say voice="Polly.Aditi" language="en-IN">No issue captured. Please call again.</Say>
        </Response>`;
      } else if (wantsTrack) {
         xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Gather input="speech" action="${baseActionUrl}?step=track" method="POST" timeout="8" speechTimeout="auto" language="en-IN" enhanced="true">
                <Say voice="Polly.Aditi" language="en-IN">Please say your ticket I D slowly.</Say>
            </Gather>
            <Say voice="Polly.Aditi" language="en-IN">No ticket captured. Please call again.</Say>
        </Response>`;
      } else {
         xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Aditi" language="en-IN">I could not understand. Please say file complaint or track ticket.</Say>
            <Hangup/>
        </Response>`;
      }
    } else if (step === 'issue') {
      const issueText = speechResult.trim();
      if (!issueText) {
          xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Aditi" language="en-IN">Sorry, I could not hear you.</Say><Hangup/></Response>`;
      } else {
          const encodedIssue = encodeURIComponent(issueText);
          xml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
              <Gather input="speech" action="${baseActionUrl}?step=location&amp;issue=${encodedIssue}" method="POST" timeout="8" speechTimeout="auto" language="en-IN" enhanced="true">
                  <Say voice="Polly.Aditi" language="en-IN">Now tell the exact location, such as area name, street, and nearby landmark.</Say>
              </Gather>
              <Say voice="Polly.Aditi" language="en-IN">No location captured. Please call again.</Say>
          </Response>`;
      }
    } else if (step === 'location') {
      const locationText = speechResult.trim();
      const issueText = req.query.issue || 'Unknown Issue';

      let user = null;
      if (from) {
        let { data: users } = await supabase.from('users').select('*').eq('phone', from);
        if (users && users.length > 0) user = users[0];

        if (!user) {
          const { data: newUser } = await supabase.from('users').insert({
            phone: from,
            role: 'citizen',
            name: `Phone User`,
            email: `tel_${from.replace('+', '') || Math.random().toString().slice(2,8)}@praja.local`,
            password_hash: 'dummy'
          }).select().single();
          user = newUser;
        }
      }

      const trackingId = `PRJ-${new Date().toISOString().slice(2, 8).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const combinedDesc = `Issue: ${issueText} \nLocation: ${locationText}`;

      if (user) {
        await supabase.from('grievances').insert({
          tracking_id: trackingId,
          citizen_id: user.id,
          title: issueText.split(' ').slice(0, 5).join(' ') + '...',
          description: combinedDesc,
          location: locationText,
          ai_category: 'Street/Traffic/Civic',
          channel: 'voice',
          status: 'open',
        });
      }

      const spokenTicket = trackingId.split('').join(' ');

      xml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
          <Say voice="Polly.Aditi" language="en-IN">Thank you. Your complaint has been registered safely. Your ticket I D is ${spokenTicket}. You will also receive SMS updates. Goodbye!</Say>
          <Hangup/>
      </Response>`;
    } else if (step === 'track') {
       const spokenId = speechResult.trim();
       const normalizedId = spokenId.toUpperCase().replace(/[^A-Z0-9]/g, '');
       let foundTicket = null;

       if (normalizedId) {
         let { data: tix } = await supabase.from('grievances').select('*').ilike('tracking_id', `%${normalizedId}%`).limit(1);
         if (tix && tix.length > 0) foundTicket = tix[0];
       }

       if (foundTicket) {
         xml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
              <Say voice="Polly.Aditi" language="en-IN">Your ticket is currently ${foundTicket.status}. The category is ${foundTicket.ai_category || 'General'}. We are working on it.</Say>
              <Hangup/>
          </Response>`;
       } else {
         xml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
              <Say voice="Polly.Aditi" language="en-IN">Sorry, I could not find a ticket matching ${spokenId}. Please try again later or text us on WhatsApp.</Say>
              <Hangup/>
          </Response>`;
       }
    }

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(xml);
  } catch (error) {
    console.error("Twilio Voice Error:", error);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Aditi" language="en-IN">An unexpected technical error occurred. Please try again.</Say><Hangup/></Response>`);
  }
};
