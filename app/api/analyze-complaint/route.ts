import { NextResponse } from 'next/server'

const CATEGORIES_LIST = ['road', 'water', 'electricity', 'sanitation', 'streetlight', 'drainage', 'waste', 'parks', 'noise', 'other']

export async function POST(request: Request) {
  try {
    const { description } = await request.json()
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    let isPhotoMandatory = false
    let reason = ''
    let category = 'other'
    let usedOllama = false

    // Try Local Ollama first
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1000)
      
      const tagsResponse = await fetch('http://localhost:11434/api/tags', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json()
        const models = tagsData.models || []
        const modelName = models.length > 0 ? models[0].name : 'llama3'

        const ollamaController = new AbortController()
        const ollamaTimeout = setTimeout(() => ollamaController.abort(), 5000)

        const systemPrompt = `You are a civic governance assistant. Analyze the user's complaint description.
1. Determine whether a photo upload is mandatory (mandatory: true/false). Visible physical issues (potholes, garbage, leakages, broken lights/roads/drains) MUST have a photo. Non-visual issues (noise, delays, behavior) are optional.
2. Classify the complaint into exactly one of these categories: ${CATEGORIES_LIST.join(', ')}.
Output JSON format only: {"mandatory": boolean, "reason": "1-sentence explanation", "category": "category_name"}`

        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelName,
            prompt: `System: ${systemPrompt}\nUser Description: ${description}`,
            format: 'json',
            stream: false
          }),
          signal: ollamaController.signal
        })
        clearTimeout(ollamaTimeout)

        if (ollamaResponse.ok) {
          const ollamaData = await ollamaResponse.json()
          const result = JSON.parse(ollamaData.response)
          isPhotoMandatory = !!result.mandatory
          reason = result.reason || 'Analyzed by Ollama'
          if (CATEGORIES_LIST.includes(result.category)) {
            category = result.category
          }
          usedOllama = true
        }
      }
    } catch (ollamaErr) {
      console.warn('Ollama connection failed or timed out, falling back to Groq:', ollamaErr)
    }

    // Fallback to Groq if Ollama was not successful
    if (!usedOllama) {
      const apiKey = process.env.GROQ_API_KEY
      if (!apiKey) {
        // Simple regex fallback if both Groq and Ollama are unavailable
        const text = description.toLowerCase()
        if (text.includes('pothole') || text.includes('road') || text.includes('pavement')) {
          category = 'road'
          isPhotoMandatory = true
        } else if (text.includes('water') || text.includes('leak') || text.includes('pipe')) {
          category = 'water'
          isPhotoMandatory = true
        } else if (text.includes('electricity') || text.includes('power') || text.includes('wire')) {
          category = 'electricity'
          isPhotoMandatory = true
        } else if (text.includes('garbage') || text.includes('waste') || text.includes('trash')) {
          category = 'waste'
          isPhotoMandatory = true
        } else if (text.includes('light') || text.includes('bulb') || text.includes('dark')) {
          category = 'streetlight'
          isPhotoMandatory = true
        } else if (text.includes('drain') || text.includes('sewage') || text.includes('overflow')) {
          category = 'drainage'
          isPhotoMandatory = true
        } else if (text.includes('noise') || text.includes('loud') || text.includes('music')) {
          category = 'noise'
          isPhotoMandatory = false
        } else if (text.includes('park') || text.includes('tree') || text.includes('garden')) {
          category = 'parks'
          isPhotoMandatory = true
        }
        return NextResponse.json({
          mandatory: isPhotoMandatory,
          reason: 'Rule-based categorization fallback',
          category
        })
      }

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a civic governance assistant. Analyze the user's complaint description.
1. Determine whether a photo upload is mandatory (mandatory: true/false). Visible physical issues (potholes, garbage, leakages, broken lights/roads/drains) MUST have a photo. Non-visual issues (noise, delays, behavior) are optional.
2. Classify the complaint into exactly one of these categories: ${CATEGORIES_LIST.join(', ')}.
Output JSON format only: {"mandatory": boolean, "reason": "1-sentence explanation", "category": "category_name"}`
            },
            {
              role: 'user',
              content: `Description: ${description}`
            }
          ],
          response_format: {
            type: 'json_object'
          },
          temperature: 0.1
        })
      })

      if (groqResponse.ok) {
        const data = await groqResponse.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          const result = JSON.parse(content)
          isPhotoMandatory = !!result.mandatory
          reason = result.reason || 'Analyzed'
          if (CATEGORIES_LIST.includes(result.category)) {
            category = result.category
          }
        }
      }
    }

    return NextResponse.json({
      mandatory: isPhotoMandatory,
      reason,
      category
    })
  } catch (e: any) {
    console.error('Error analyzing complaint description:', e)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
