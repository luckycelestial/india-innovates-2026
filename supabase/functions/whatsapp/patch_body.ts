    console.log("Processing WhatsApp message from:", from);

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
        return buildTwilioResponse(`Sorry, I couldn't process your voice note.`);
      }
    }

    // 1. Get or create user
    let { data: users, error: usersError } = await supabase.from('users').select('*').eq('phone', from);
    let user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      const { data: newUser, error } = await supabase.from('users').insert({
        phone: from,
        role: 'citizen',
        name: `Phone User ${from.slice(-4)}`,
        email: `tel_${from.replace('+', '')}@praja.local`,
        password_hash: 'dummy_hash_no_login_needed'
      }).select().single();
      
      user = newUser || null;
    }

    if (!user) {
      return buildTwilioResponse("Unable to create user account. Please try again.");
    }

    // ===== NEW: Handle conversational commands and aadhaar flow =====
    const bodyLower = body.toLowerCase();

    // RESET flow: delete aadhaar_number and all grievances
    if (bodyLower === 'reset') {
      // Delete all grievances for this user
      const { error: deleteGrievanceError } = await supabase
        .from('grievances')
        .delete()
        .eq('citizen_id', user.id);

      if (deleteGrievanceError) {
        console.error("Error deleting grievances:", deleteGrievanceError);
        return buildTwilioResponse("Error resetting complaints. Please try again.");
      }

      // Set aadhaar_number to null
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ aadhaar_number: null })
        .eq('id', user.id);

      if (updateUserError) {
        console.error("Error updating user:", updateUserError);
        return buildTwilioResponse("Error resetting account. Please try again.");
      }

      // Return exact message from 4th image
      const resetMessage = "Demo Reset Successful. Your account has been cleared. Aadhaar link removed. All grievances deleted. Reply YES to re-register.";
      return buildTwilioResponse(resetMessage);
    }

    // TRACK / HELP / STATUS flows: handle without Groq
    if (bodyLower === 'track') {
      const { data: grievances, error } = await supabase
        .from('grievances')
        .select('id, description, category, priority, status, created_at')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      let trackMessage = "Your recent complaints:\n";
      if (grievances && grievances.length > 0) {
        grievances.forEach((g: any, idx: number) => {
          trackMessage += `${idx + 1}. ${g.category} - ${g.status} (ID: ${g.id.slice(0, 8)})\n`;
        });
      } else {
        trackMessage = "You have no complaints yet.";
      }
      return buildTwilioResponse(trackMessage);
    }

    if (bodyLower === 'help') {
      const helpMessage = `PRAJA Help:
• Reply YES to register
• Describe your complaint
• TRACK - view your complaints
• STATUS - check complaint status
• RESET - start over
• HELP - this message`;
      return buildTwilioResponse(helpMessage);
    }

    if (bodyLower === 'status') {
      const { data: grievances, error } = await supabase
        .from('grievances')
        .select('status, category')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let statusMessage = "No active complaints.";
      if (grievances) {
        statusMessage = `Your latest complaint (${grievances.category}) is: ${grievances.status}`;
      }
      return buildTwilioResponse(statusMessage);
    }

    // ===== AADHAAR REGISTRATION FLOW =====
    if (!user.aadhaar_number) {
      // Aadhaar is missing: check if user said "YES"
      if (bodyLower !== 'yes') {
        const welcomeMessage = `Welcome to PRAJA! To ensure accountability and track your complaints effectively, we need to link your Aadhaar number.

Your data is secure and encrypted. Reply YES to proceed with registration.`;
        return buildTwilioResponse(welcomeMessage);
      }

      // User said "YES": register with dummy Aadhaar
      const { error: updateError } = await supabase
        .from('users')
        .update({ aadhaar_number: 'XXXX-XXXX-2816' })
        .eq('id', user.id);

      if (updateError) {
        console.error("Error updating aadhaar_number:", updateError);
        return buildTwilioResponse("Registration failed. Please try again.");
      }

      const successMessage = `Successfully Registered! Your Aadhaar has been linked (XXXX-XXXX-2816).

Now, tell me about your complaint. What issue would you like to report?`;
      return buildTwilioResponse(successMessage);
    }

    // ===== ALL CHECKS PASSED: Load or create call context and send to Groq =====

    // 2. Load or create call context using phone as identifier
    let callContext: CallContext | null = null;
    const { data: contextData, error: contextError } = await supabase.from('call_contexts').select('data').eq('call_sid', from).maybeSingle();
    
    if (contextData && contextData.data) {
      callContext = contextData.data as CallContext;
    }

    // Initialize or reset context
    if (!callContext) {
      callContext = {
        state: ConversationState.ONBOARDING,
        chat_history: [],
        extracted_data: {},
        user_id: user.id,
        attempts: 0,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };
    }

    // Increment attempts and update last_updated
    callContext.attempts = (callContext.attempts || 0) + 1;
    callContext.last_updated = new Date().toISOString();

    // Add user message to chat history
    callContext.chat_history.push({
      role: "user",
      content: body
    });

    // 3. Determine next state and craft system prompt
    let systemPrompt = "";
    let nextState = callContext.state;
    let replyText = "";

    // [Groq logic starts here]

