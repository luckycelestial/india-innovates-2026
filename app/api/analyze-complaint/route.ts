import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { description } = await request.json()
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
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
            content: 'You are a civic governance assistant. Analyze the user\'s complaint description and determine whether a photo upload is mandatory or optional. Complaints that describe physical, visible damage, obstructions, cleanliness issues, or physical hazards (e.g., potholes, garbage piles, broken lights, water leakages, building cracks, road blockages) MUST have a photo. Non-visual complaints, such as noise pollution, administrative delays, behavior issues, scheduling, or paperwork issues, should have photo as OPTIONAL. You must output JSON only, in this format: {"mandatory": true/false, "reason": "a brief 1-sentence explanation of why it is mandatory or optional"}'
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

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      return NextResponse.json({ error: 'Groq API error: ' + errorText }, { status: groqResponse.status })
    }

    const data = await groqResponse.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'Invalid response from Groq' }, { status: 500 })
    }

    const result = JSON.parse(content)
    return NextResponse.json({
      mandatory: !!result.mandatory,
      reason: result.reason || 'Analyzed'
    })
  } catch (e: any) {
    console.error('Error analyzing complaint description:', e)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
