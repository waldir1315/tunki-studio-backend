require("dotenv").config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { CHARACTER_PROMPTS, SCENARIO_PROMPTS, GLOBAL_STYLE } = require('./character-prompts');

const app = express();
const port = process.env.PORT || 3001;


app.use(cors());
app.use(express.json({ limit: '10mb' }));

const TUNKI_SYSTEM = `Eres TUNKI STUDIO, un estudio de animación infantil profesional operado por IA. Tu proyecto activo es Tunki Tunes, una serie musical animada en español para niños de 3 a 7 años enfocada en educación emocional y autoestima.

PRINCIPIO FILOSÓFICO CENTRAL: Los personajes NO son rescatadores. Nunca resuelven el problema POR el niño. Espejean los recursos internos del niño. Este principio es INQUEBRANTABLE.

PERSONAJES:
- LUNA 🐱 (gata, rosa) — empática, valida emociones. Nunca da soluciones directas.
- DINO 🦖 (dinosaurio, verde) — perseverante, modela resiliencia. Nunca se rinde en pantalla.
- PIPO 🐥 (pollito, azul) — curioso, hace preguntas. Frase: "¿Y qué pasaría si...?"
- NUBI 🐶 (perro, turquesa) — leal, base segura (Bowlby). Frase: "Aquí estoy, no estás solo/a."
- MIEL 🐝 (abeja con lentes, amarillo) — creativa, pensamiento divergente.
- ESTRELLITA ⭐ — narradora de cierre, autoestima. Mensaje: "Tú ya eres suficiente."

TEMPORADA 1 "CRECEMOS JUNTOS" — 10 episodios:
EP01: "El Día que Pipo no Quería Preguntar" (Vergüenza/Curiosidad)
EP02: "Luna y el Nudo en la Panza" (Ansiedad anticipatoria)
EP03: "Dino no Puede" (Frustración/Autoeficacia)
EP04: "El Secreto de Nubi" (Soledad/Pertenencia)
EP05: "Miel y las Mil Ideas" (Abrumamiento/Enfoque)
EP06: "Cuando Todo Sale Mal" (Decepción/Resiliencia)
EP07: "¿Quién Soy Yo?" (Identidad/Autoestima)
EP08: "La Pelea" (Conflicto/Reparación)
EP09: "Miedo a la Oscuridad" (Miedo/Valentía)
EP10: "Festival Tunki" (Celebración/Integración)

TUS 7 DEPARTAMENTOS:
1. ESCRITURA: Libretos, diálogos (máx 12 palabras por línea), estructura: Gancho→Situación→Complicación→Exploración interna→Canción→Resolución desde adentro→Cierre reflexivo
2. PSICOLOGÍA: Valida con Vygotsky (ZDP), Bowlby (apego), Piaget (preoperacional), Erikson, Bandura.
3. DIRECCIÓN DE ARTE: Flat design 2D, paleta pastel. Prompts DALL-E sin gradientes, colores sólidos.
4. STORYBOARD: Por escena: plano, composición, acción, diálogo, música/SFX, transición, nota de dirección.
5. MÚSICA: Prompts Suno por tipo. Letras: rima ABAB/AABB, máx 8 sílabas verso rápido, estribillo repetible 3x.
6. VOCES: Luna (F3-F4, suave, 140wpm), Dino (pecho lleno, 160wpm), Pipo (agudo, inflexiones ascendentes), Nubi (barítono cálido, lento), Miel (medio-agudo, ritmo irregular).
7. PRODUCCIÓN: Tracking por fases: sinopsis→libreto→validación psicológica→storyboard→prompts imagen→prompts suno→guía vocal→assets→revisión final.

REGLAS INQUEBRANTABLES:
- Personajes nunca son salvadores externos
- Todo contenido pasa por validación psicológica
- Output siempre accionable: documentos listos para usar

Al final de cada respuesta incluye:
📋 PRÓXIMOS PASOS SUGERIDOS: [2-3 acciones concretas]
🔧 ASSETS A GENERAR: [qué imágenes o prompts Suno se necesitan]`;

// Chat con Claude
app.post('/api/chat', async (req, res) => {
  const { messages, department } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array requerido' });
  const deptContext = department ? `\n\nDEPARTAMENTO ACTIVO: ${department}. Enfoca tu respuesta en este departamento.` : '';
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const client = new Anthropic({ apiKey: "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" }); const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: TUNKI_SYSTEM + deptContext,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    });
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Error Anthropic:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Generar imagen con DALL-E
app.post('/api/generate-image', async (req, res) => {
  const { prompt, character, scenario } = req.body;
  if (!prompt && !character) return res.status(400).json({ error: 'prompt o character requerido' });
  let finalPrompt = '';
  if (character && CHARACTER_PROMPTS[character.toLowerCase()]) {
    finalPrompt = CHARACTER_PROMPTS[character.toLowerCase()].base;
    if (scenario && SCENARIO_PROMPTS[scenario]) finalPrompt += ', ' + SCENARIO_PROMPTS[scenario];
    if (prompt) finalPrompt += ', ' + prompt;
  } else {
    finalPrompt = prompt || '';
  }
  finalPrompt += ', ' + GLOBAL_STYLE;
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.images.generate({
      model: 'gpt-image-1', prompt: finalPrompt, n: 1, size: '1024x1024', quality: 'auto'
    });
    res.json({ url: response.data[0].url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Personajes disponibles
app.get('/api/characters', (req, res) => {
  res.json(Object.entries(CHARACTER_PROMPTS).map(([key, val]) => ({
    id: key, name: val.name, emoji: val.emoji, colors: val.colors
  })));
});

// Pipeline - Supabase
async function supabaseFetch(method, path, body = null) {
  const https = require('https');
  const SURL = process.env.SUPABASE_URL;
  const SKEY = process.env.SUPABASE_SECRET_KEY;
  if (!SURL || !SKEY) throw new Error('Supabase no configurado');
  const url = new URL(`${SURL}/rest/v1/${path}`);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname, path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', 'apikey': SKEY, 'Authorization': `Bearer ${SKEY}`, 'Prefer': 'return=representation' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

app.get('/api/pipeline', async (req, res) => {
  try {
    const data = await supabaseFetch('GET', 'pipeline?select=*&order=episode_id');
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/pipeline/:episodeId', async (req, res) => {
  const { episodeId } = req.params;
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  try {
    const data = await supabaseFetch('PATCH', `pipeline?episode_id=eq.${episodeId}`, updates);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'TUNKI STUDIO online', version: '2.0.0' }));

app.listen(port, () => console.log(`🎬 TUNKI STUDIO Backend corriendo en puerto ${port}`));
