require("dotenv").config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Sistema base de TUNKI STUDIO
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

TUS 7 DEPARTAMENTOS — actívalos según lo que se pide:

1. ESCRITURA: Libretos, diálogos (máx 12 palabras por línea), estructura: Gancho→Situación→Complicación→Exploración interna→Canción→Resolución desde adentro→Cierre reflexivo

2. PSICOLOGÍA: Valida con Vygotsky (ZDP), Bowlby (apego), Piaget (preoperacional), Erikson, Bandura. Checklist: ¿El niño decide al final? ¿Hay invalidación emocional? ¿Refuerza agencia?

3. DIRECCIÓN DE ARTE: Flat design 2D, paleta pastel 60-70% saturación. Formato prompt DALL-E: "[personaje] flat design 2D illustration, pastel colors, clean lines, children animation style, [emoción], [escenario], no shadows, ages 3-7"

4. STORYBOARD: Por escena: plano, composición, acción, diálogo, música/SFX, transición, nota de dirección. Planos estáticos o movimientos lentos. Max 3 personajes en frame.

5. MÚSICA: Prompts Suno por tipo (apertura/conflicto/exploración/resolución/tema_principal). Letras: rima ABAB/AABB, máx 8 sílabas verso rápido, estribillo repetible 3x mínimo.

6. VOCES: Luna (F3-F4, suave, 140wpm), Dino (pecho lleno, 160wpm), Pipo (agudo, inflexiones ascendentes), Nubi (barítono cálido, lento), Miel (medio-agudo, ritmo irregular).

7. PRODUCCIÓN: Tracking por fases: sinopsis→libreto→validación psicológica→storyboard→prompts imagen→prompts suno→guía vocal→assets notion→revisión final.

ESCENARIOS: Bosque Tunki, Casa Club, Pradera Musical, Cueva de los Sueños, Río Brillante.

REGLAS INQUEBRANTABLES:
- Personajes nunca son salvadores externos
- Todo contenido pasa por validación psicológica
- Lenguaje comprensible para niño de 4 años sin adulto
- Output siempre accionable: documentos listos para usar

Al final de cada respuesta incluye siempre:
📋 PRÓXIMOS PASOS SUGERIDOS: [2-3 acciones concretas]
🔧 ASSETS A GENERAR: [qué imágenes o prompts Suno se necesitan]`;

// Endpoint principal de chat
app.post('/api/chat', async (req, res) => {
  const { messages, department } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array requerido' });
  }

  // Sistema específico por departamento si se especifica
  const deptContext = department ? `\n\nDEPARTAMENTO ACTIVO: ${department}. Enfoca tu respuesta en este departamento específicamente.` : '';

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
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
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Endpoint para generar prompt de imagen (DALL-E)
app.post('/api/generate-image-prompt', async (req, res) => {
  const { personaje, escenario, emocion, accion } = req.body;

  const prompt = `${personaje} character, flat design 2D illustration, pastel colors, clean lines, children animation style, ${emocion} expression, ${accion}, ${escenario} background, no shadows, soft lighting, friendly and approachable, ages 3-7, Tunki Tunes animated series style`;

  res.json({ prompt });
});

// Endpoint para generar prompt de Suno
app.post('/api/generate-suno-prompt', async (req, res) => {
  const { tipo, emocion, personaje, episodio } = req.body;

  const templates = {
    apertura: `upbeat children's song in Spanish, Latin American style, warm and playful melody, ukulele and light percussion, xylophone accents, child-friendly vocals, energetic but not overwhelming, 60-90 seconds, mood: joyful and welcoming, theme: ${emocion || 'adventure and friendship'}, ${personaje ? `featuring ${personaje},` : ''} ages 3-7, repetitive melodic phrases, sing-along friendly`,
    conflicto: `gentle children's song in Spanish, introspective mood, soft piano and strings, warm and calm, medium-slow tempo 80-100 BPM, vocals warm and reassuring, mood: ${emocion || 'reflective and empathetic'}, no resolution yet, accompanies emotional exploration, ages 3-7, 45-75 seconds`,
    exploracion: `curious and gentle children's song in Spanish, soft wonder-filled melody, acoustic instruments, bells soft guitar light marimba, slow to medium tempo 70-90 BPM, mood: discovery wonder inner exploration, theme: ${emocion || 'finding your own answer'}, soft and encouraging vocals, ages 3-7, 45-60 seconds`,
    resolucion: `uplifting children's song in Spanish, warm and affirming, happy and grounded energy, ukulele light percussion choir, medium-upbeat 100-115 BPM, mood: proud peaceful empowered from within, message: inner resources self-esteem agency, ${personaje ? `main voice: ${personaje},` : ''} ages 3-7, 45-75 seconds`,
    tema_principal: `main theme song children's animated series in Spanish, fun and memorable, ukulele percussion bells light brass, upbeat 115 BPM, catchy and singable chorus, mix of child voices and warm adult voice, message: authenticity being yourself inner strength, ages 3-7, Latin American style, 90 seconds total`
  };

  const prompt = templates[tipo] || templates.tema_principal;

  res.json({
    prompt,
    instrucciones: [
      'Ir a suno.com → New Song',
      'Seleccionar modo "Custom"',
      'Pegar el prompt en Description',
      'En Style of Music: children animation, educational, Latin',
      'Generar 2-3 variantes y elegir la mejor'
    ]
  });
});

// Endpoint generación de imagen con DALL-E 3
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt requerido' });

  const tunkiPrompt = prompt + ', flat design 2D illustration, pastel colors, clean lines, children animation style, no shadows, friendly, ages 3-7, Tunki Tunes animated series';

  try {
    const response = await openaiClient.images.generate({
      model: 'gpt-image-1',
      prompt: tunkiPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'auto',
    });
    res.json({ url: response.data[0].url, revised_prompt: response.data[0].revised_prompt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); // Health check
app.get('/health', (req, res) => res.json({ status: 'TUNKI STUDIO online', version: '1.0.0' }));

app.listen(port, () => console.log(`🎬 TUNKI STUDIO Backend corriendo en puerto ${port}`));
