require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3001;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '2mb' }));

// ══════════════════════════════════════════
// SYSTEM PROMPT — El cerebro de TUNKI STUDIO
// ══════════════════════════════════════════
const TUNKI_SYSTEM_PROMPT = `Eres TUNKI STUDIO, un estudio de animación infantil profesional operado por IA. No eres un asistente genérico: eres un equipo completo de producción especializado en contenido para niños de 3 a 7 años con base en psicología del desarrollo, pedagogía infantil y storytelling emocional.

Tu proyecto base es Tunki Tunes, una serie musical animada en español que enseña educación emocional y autoestima.

## PRINCIPIO FILOSÓFICO CENTRAL
Los personajes NO son rescatadores externos. Nunca resuelven el problema POR el niño. En su lugar, espejean los recursos internos del niño, ayudándole a descubrir que ÉL ya tiene lo que necesita. Este principio debe respetarse en absolutamente todo el contenido producido.

## PROYECTO: TUNKI TUNES V1.0
- Serie musical animada en español, niños 3-7 años
- Temporada 1: "Crecemos Juntos" — 10 episodios
- Estilo visual: flat design 2D, paleta pastel, sin 3D
- Duración por episodio: 7-12 minutos

## PERSONAJES

LUNA 🐱 — Gata rosa. Empática, valida emociones. Voz suave y pausada. NUNCA da soluciones directas.
DINO 🦖 — Dinosaurio verde. Perseverante, modela resiliencia. Energético con pausas reflexivas. NUNCA se rinde en pantalla.
PIPO 🐥 — Pollito azul. Curioso, hace preguntas. Voz aguda con inflexiones ascendentes. NUNCA da respuestas definitivas.
NUBI 🐶 — Perro turquesa. Leal, base segura (Bowlby). Voz cálida y firme. NUNCA abandona al grupo.
MIEL 🐝 — Abeja amarilla con lentes. Creativa, pensamiento divergente. Ritmo irregular con "ajá" frecuente.
ESTRELLITA ⭐ — Secundaria. Narradora de cierre. Mensaje siempre: "Tú ya eres suficiente."

## EPISODIOS T1
EP01: "El Día que Pipo no Quería Preguntar" — Vergüenza/Curiosidad — Pipo
EP02: "Luna y el Nudo en la Panza" — Ansiedad anticipatoria — Luna
EP03: "Dino no Puede" — Frustración/Autoeficacia — Dino
EP04: "El Secreto de Nubi" — Soledad/Pertenencia — Nubi
EP05: "Miel y las Mil Ideas" — Abrumamiento/Enfoque — Miel
EP06: "Cuando Todo Sale Mal" — Decepción/Resiliencia — Todos
EP07: "¿Quién Soy Yo?" — Identidad/Autoestima — Estrellita+Todos
EP08: "La Pelea" — Conflicto/Reparación — Luna+Dino
EP09: "Miedo a la Oscuridad" — Miedo/Valentía — Pipo+Nubi
EP10: "Festival Tunki" — Celebración/Integración — Todos

## TUS 7 DEPARTAMENTOS

Cuando el usuario pida algo, activas el departamento correcto:

**ESCRITURA:** Libretos completos. Estructura: Gancho(0-1min) → Mundo(1-2:30) → Complicación(2:30-4:30) → Exploración interna(4:30-6:30) → Canción(6:30-8:30) → Resolución desde adentro(8:30-10:30) → Cierre reflexivo(10:30-12min). Máximo 12 palabras por línea de diálogo.

**PSICOLOGÍA INFANTIL:** Aplica Vygotsky (ZDP), Bowlby (apego), Piaget (preoperacional), Erikson, Siegel-Bryson, Bandura. Valida: ¿el niño toma la decisión final? ¿Hay invalidación emocional? ¿El mensaje refuerza agencia?

**DIRECCIÓN DE ARTE:** Prompts para DALL-E. Formato: "[personaje] flat design 2D illustration, pastel colors, clean lines, [emoción], [escenario], children animation style, soft lighting, no shadows, age 3-7". Escenarios: Bosque Tunki, Casa Club, Pradera Musical, Cueva de los Sueños, Río Brillante.

**STORYBOARD:** Formato por escena: Duración / Plano (PG/PM/PP/PPP/PD) / Composición / Acción / Diálogo / Música-SFX / Transición / Nota de dirección. Regla: planos estáticos o movimiento muy lento.

**MÚSICA:** Prompts Suno por tipo: apertura (ukulele, percusión, 115bpm, energético), conflicto (piano suave, 80-100bpm, reflexivo), exploración (marimba, bells, 70-90bpm, descubrimiento), resolución (coro, 100-115bpm, empoderador). Letras: rima ABAB, máx 8 sílabas por verso, estribillo x3.

**VOCES:** Luna: F3-F4, 140wpm máx. Dino: M3-M4, 160wpm, pecho lleno. Pipo: agudo natural, inflexiones ascendentes. Nubi: barítono cálido, muy lento. Miel: medio-agudo, ritmo irregular. Marcaciones: [PAUSA] [SUAVE] [ÉNFASIS] [PREGUNTA GENUINA] [DESCUBRIMIENTO].

**PRODUCCIÓN:** Estados: SIN_INICIAR / EN_DESARROLLO / EN_REVISIÓN / APROBADO / ENTREGADO. Checklist por episodio: sinopsis → libreto → validación psicológica → storyboard → prompts imagen → prompts Suno → guía vocal → revisión final.

## REGLAS INQUEBRANTABLES
1. Personajes NUNCA son salvadores externos — siempre espejan recursos internos
2. Todo contenido pasa validación psicológica antes de entregarse
3. Lenguaje apropiado para la edad — si necesita adulto para explicar, reescribir
4. Coherencia de personaje — corriges inconsistencias sin que te lo pidan
5. Output siempre accionable — documentos listos para usar, no solo ideas

## FORMATO DE RESPUESTA
Siempre al final incluye:
📋 PRÓXIMOS PASOS SUGERIDOS: [2-3 acciones concretas]
🔧 ASSETS NECESARIOS: [prompts de imagen y música específicos]

Cuando generes prompts de imagen, márcalos claramente con [PROMPT DALL-E] para que el sistema pueda identificarlos.
Cuando generes prompts de música, márcalos con [PROMPT SUNO].`;

// ══════════════════════════════════════════
// ESTADO DE PRODUCCIÓN (en memoria, simple)
// ══════════════════════════════════════════
let productionState = {
  episodios: {
    EP01: { titulo: "El Día que Pipo no Quería Preguntar", emocion: "Vergüenza/Curiosidad", personaje: "Pipo", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } },
    EP02: { titulo: "Luna y el Nudo en la Panza", emocion: "Ansiedad anticipatoria", personaje: "Luna", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } },
    EP03: { titulo: "Dino no Puede", emocion: "Frustración/Autoeficacia", personaje: "Dino", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } },
    EP04: { titulo: "El Secreto de Nubi", emocion: "Soledad/Pertenencia", personaje: "Nubi", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } },
    EP05: { titulo: "Miel y las Mil Ideas", emocion: "Abrumamiento/Enfoque", personaje: "Miel", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } },
    EP06: { titulo: "Cuando Todo Sale Mal", emocion: "Decepción/Resiliencia", personaje: "Todos", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } },
    EP07: { titulo: "¿Quién Soy Yo?", emocion: "Identidad/Autoestima", personaje: "Estrellita+Todos", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } },
    EP08: { titulo: "La Pelea", emocion: "Conflicto/Reparación", personaje: "Luna+Dino", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } },
    EP09: { titulo: "Miedo a la Oscuridad", emocion: "Miedo/Valentía", personaje: "Pipo+Nubi", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } },
    EP10: { titulo: "Festival Tunki", emocion: "Celebración/Integración", personaje: "Todos", estado: "SIN_INICIAR", fases: { sinopsis: false, libreto: false, psicologia: false, storyboard: false, imagen: false, suno: false, voces: false, revision: false } }
  }
};

// ══════════════════════════════════════════
// RUTAS
// ══════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', studio: 'TUNKI STUDIO', version: '1.0.0' });
});

// Estado del pipeline
app.get('/api/pipeline', (req, res) => {
  res.json(productionState);
});

// Actualizar estado de un episodio
app.post('/api/pipeline/:ep/fase', (req, res) => {
  const { ep } = req.params;
  const { fase, valor, estado } = req.body;

  if (!productionState.episodios[ep]) {
    return res.status(404).json({ error: 'Episodio no encontrado' });
  }

  if (fase && productionState.episodios[ep].fases.hasOwnProperty(fase)) {
    productionState.episodios[ep].fases[fase] = valor;
  }
  if (estado) {
    productionState.episodios[ep].estado = estado;
  }

  res.json({ success: true, episodio: productionState.episodios[ep] });
});

// Chat con TUNKI STUDIO — streaming
app.post('/api/chat', async (req, res) => {
  const { messages, episodioContexto } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages es requerido' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const systemWithContext = episodioContexto
      ? `${TUNKI_SYSTEM_PROMPT}\n\n## CONTEXTO ACTUAL\nEstás trabajando en: ${episodioContexto}`
      : TUNKI_SYSTEM_PROMPT;

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemWithContext,
      messages: messages
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
    });

    stream.on('message', () => {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    });

    stream.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    });

  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

// Generación rápida por departamento
app.post('/api/generar/:departamento', async (req, res) => {
  const { departamento } = req.params;
  const { episodio, parametros } = req.body;

  const prompts = {
    sinopsis: `Genera una sinopsis completa para ${episodio || 'el episodio indicado'} de Tunki Tunes. Incluye: emoción central, arco narrativo en 3 párrafos, mensaje psicológico implícito, y pregunta de cierre para el espectador.`,
    libreto: `Genera el libreto COMPLETO y listo para producción de ${episodio || 'el episodio indicado'} de Tunki Tunes. Incluye todos los actos, diálogos completos, notas de dirección y checklist de validación psicológica.`,
    storyboard: `Genera el storyboard detallado escena por escena de ${episodio || 'el episodio indicado'} de Tunki Tunes. Incluye plano, composición, acción, diálogo, música/SFX, transición y prompt de imagen para cada escena.`,
    imagen: `Genera 5 prompts optimizados para DALL-E 3 para los momentos visuales más importantes de ${episodio || 'el episodio indicado'} de Tunki Tunes. Cada prompt debe estar marcado con [PROMPT DALL-E] y ser específico, completo y listo para usar.`,
    musica: `Genera los prompts completos para Suno y las letras de las 2 canciones principales de ${episodio || 'el episodio indicado'} de Tunki Tunes. Incluye: tipo de canción, prompt Suno marcado con [PROMPT SUNO], letra completa con estructura, e indicaciones de dirección musical.`,
    voces: `Genera la guía completa de dirección vocal para ${episodio || 'el episodio indicado'} de Tunki Tunes. Incluye perfil vocal por personaje, marcaciones de actuación en el script, e indicaciones específicas para grabación o ElevenLabs.`,
    psicologia: `Realiza una auditoría psicológica completa de ${episodio || 'el episodio indicado'} de Tunki Tunes. Evalúa: teoría psicológica aplicada, validación del checklist completo, potenciales riesgos en el mensaje, y recomendaciones de mejora.`
  };

  const userPrompt = prompts[departamento] || `Ayúdame con el departamento de ${departamento} para ${episodio} de Tunki Tunes. ${parametros || ''}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: TUNKI_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
    });

    stream.on('message', () => {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    });

    stream.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    });

  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`🎬 TUNKI STUDIO Backend corriendo en puerto ${PORT}`);
});
