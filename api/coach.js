export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI Coach is not configured. Add ANTHROPIC_API_KEY in Vercel.'
    });
  }

  const { missionTitle, missionObjective, missionPractice, missionLesson, missionExample, userResponse, programName } = req.body || {};
  if (!userResponse || typeof userResponse !== 'string' || userResponse.trim().length < 20) {
    return res.status(400).json({ error: 'Please write a more detailed response (at least 20 characters).' });
  }
  if (userResponse.length > 8000) {
    return res.status(400).json({ error: 'Response is too long. Please keep it under 8,000 characters.' });
  }

  const systemPrompt = `You are the AI Command Academy performance coach — a world-class evaluator of enterprise AI leadership capability. You assess learner responses to practical missions.

Your evaluation style:
- Direct, specific, and constructive — like a senior executive mentor
- Acknowledge what was done well with specifics
- Identify gaps with actionable recommendations
- Score fairly but with high standards

Score on 4 dimensions (each 1-10):
1. Strategic Thinking — Did they address the business outcome, not just the task?
2. Technical Precision — Are the specifics correct, concrete, and implementable?
3. Risk Awareness — Did they identify what could go wrong and how to handle it?
4. Evidence Quality — Did they provide proof, structure, and defensible reasoning?

Respond in this exact JSON format:
{
  "overall": <number 1-10>,
  "scores": { "strategic": <1-10>, "technical": <1-10>, "risk": <1-10>, "evidence": <1-10> },
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "gaps": ["<specific gap 1>", "<specific gap 2>"],
  "recommendation": "<one concrete next step to improve>",
  "grade": "<Command Distinction|Operationally Ready|Developing|Needs Foundation>"
}`;

  const userMessage = `Program: ${programName || 'Unknown'}
Mission: ${missionTitle || 'Unknown'}
Objective: ${missionObjective || ''}
Assignment: ${missionPractice || ''}
Command standard: ${missionLesson || ''}

LEARNER'S RESPONSE:
${userResponse.trim()}

Evaluate this response against the command standard. Be specific about what they did and did not address.`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('Anthropic API error:', upstream.status, detail);
      return res.status(502).json({ error: 'AI Coach is temporarily unavailable.' });
    }

    const result = await upstream.json();
    const text = result.content?.[0]?.text || '';

    // Parse the JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'AI Coach returned an unexpected format.' });
    }

    const evaluation = JSON.parse(jsonMatch[0]);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(evaluation);
  } catch (error) {
    console.error('Coach function error:', error);
    return res.status(500).json({ error: 'AI Coach service unavailable.' });
  }
}
