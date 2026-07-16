# PromptOS — AI Command Academy

A white-background, voice-guided enterprise AI academy with ten fully integrated training programs.

## Included experience

- Ten complete program workspaces
- Three guided missions in every program
- A scored three-decision capstone in every program
- Exportable evidence portfolios
- Browser-saved progress across all programs
- Standalone AI War Room sales demonstration
- ElevenLabs cloned-voice narration for the guided tour, program briefings and lessons

## Files

- `index.html` — complete standalone academy
- `api/narrate.js` — secure Vercel function for live ElevenLabs narration
- `scripts/generate_narration.py` — generates all pre-recorded narration tracks
- `audio/` — place generated MP3 files here
- `.env.example` — ElevenLabs settings
- `vercel.json` — Vercel deployment configuration

## Narration architecture

The site attempts narration in this order:

1. A pre-generated MP3 in `audio/`
2. Secure live generation through `/api/narrate`
3. Browser speech as a local preview fallback

The generator now produces **50 tracks**:

- 10 guided-tour scenes
- 10 program briefings
- 30 guided lesson narrations

List the tracks without using ElevenLabs credits:

```bash
python3 scripts/generate_narration.py --list
```

## Add your cloned voice

```bash
cp .env.example .env
```

Add:

```text
ELEVENLABS_API_KEY=your_private_api_key
ELEVENLABS_VOICE_ID=your_cloned_voice_id
```

Do not commit `.env`.

Generate all MP3 files:

```bash
python3 scripts/generate_narration.py
```

Regenerate after narration changes:

```bash
python3 scripts/generate_narration.py --overwrite
```

## Local preview

Static preview with pre-generated MP3s or browser fallback:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

Full Vercel function preview:

```bash
npm i -g vercel
vercel dev
```

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repository into Vercel.
3. Select **Other** as the framework preset.
4. Add `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` to Vercel environment variables.
5. Deploy.

Pre-generated audio is recommended for immediate playback and predictable ElevenLabs cost.
