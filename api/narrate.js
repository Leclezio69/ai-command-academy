export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    return res.status(503).json({
      error: 'ElevenLabs is not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in Vercel.'
    });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 4800) {
    return res.status(400).json({ error: 'Narration text must be between 1 and 4,800 characters.' });
  }

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
          voice_settings: {
            stability: Number(process.env.ELEVENLABS_STABILITY || 0.50),
            similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY_BOOST || 0.85),
            style: Number(process.env.ELEVENLABS_STYLE || 0.12),
            use_speaker_boost: true,
            speed: Number(process.env.ELEVENLABS_SPEED || 0.97)
          }
        })
      }
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('ElevenLabs error:', upstream.status, detail);
      return res.status(upstream.status).json({ error: 'ElevenLabs narration generation failed.' });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.status(200).send(audio);
  } catch (error) {
    console.error('Narration function error:', error);
    return res.status(500).json({ error: 'Narration service unavailable.' });
  }
}
