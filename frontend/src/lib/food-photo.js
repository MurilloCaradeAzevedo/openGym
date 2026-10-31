// A meal photo read by Google Gemini with the key this phone's Coach already holds
// (Settings → AI Coach → own key). The answer is a list of foods with an estimated portion and
// its calories and macros; the person corrects it before anything reaches the diary.
//
// shortcut: needs the phone's own Gemini key (BYOK); a server-side route with the key kept on the
// server and a per-user limit belongs here once the app runs against a hosted openGym.
import { loadCoachDevice } from './coach-device.js'
import { getApiKey } from './coach-secrets.js'
import { nativeFetch } from './capacitor-fetch.js'
import { HTTP_PROVIDERS, baseUrlFor } from '../../../api/coach/core/providers.js'
import { getLang, t } from './i18n.js'

export const MAX_ITEMS = 20
const MAX_SIDE = 1024
const r1 = x => Math.round(x * 10) / 10
const clamp = (v, hi) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(hi, n) : 0 }

/** The model's JSON, bounded: [{ name, g, kcal, p, c, f }]. Anything malformed reads as nothing. */
export function parseFoodReply(text) {
  let data
  try { data = JSON.parse(String(text || '').replace(/^```(?:json)?\s*|\s*```$/g, '')) } catch { return [] }
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
  return items.filter(x => x && typeof x === 'object' && typeof x.name === 'string' && x.name.trim())
    .slice(0, MAX_ITEMS)
    .map(x => ({
      name: x.name.trim().slice(0, 80),
      g: Math.round(clamp(x.g ?? x.grams, 3000)),
      kcal: Math.round(clamp(x.kcal, 5000)),
      p: r1(clamp(x.p ?? x.protein, 500)), c: r1(clamp(x.c ?? x.carbs, 1000)), f: r1(clamp(x.f ?? x.fat, 500)),
    }))
}

/** An item at a new portion, its calories and macros scaled from the old one. */
export function scaleItem(item, grams) {
  const g = Math.max(0, Math.round(+grams || 0))
  const k = item.g > 0 ? g / item.g : 0
  return { ...item, g, kcal: Math.round(item.kcal * k), p: r1(item.p * k), c: r1(item.c * k), f: r1(item.f * k) }
}

// A phone photo is 3-12 MB; the model needs no more than this to see a plate.
async function jpegBase64(file) {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * s)
  canvas.height = Math.round(bmp.height * s)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
}

const fail = message => Object.assign(new Error(message), { quiet: false })

const PROMPT = lang => `You are a nutritionist reading a photo of a meal. List each food you can see, with the portion in grams you estimate from the plate, and the calories (kcal), protein (p), carbohydrate (c) and fat (f) in grams for that portion, using Brazilian food composition values (TACO) where they apply. Write the food names in the language with code "${lang}". If the photo shows no food, return an empty list. Answer with JSON only: {"items":[{"name":"","g":0,"kcal":0,"p":0,"c":0,"f":0}]}`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, g: { type: 'NUMBER' }, kcal: { type: 'NUMBER' }, p: { type: 'NUMBER' }, c: { type: 'NUMBER' }, f: { type: 'NUMBER' } },
        required: ['name', 'g', 'kcal', 'p', 'c', 'f']
      }
    }
  },
  required: ['items']
}

/** Reads a meal photo. Throws an Error whose message can be shown as it is. */
export async function readMealPhoto(file) {
  const d = await loadCoachDevice()
  if (d.mode !== 'byok' || d.provider !== 'gemini') throw Object.assign(fail(t('Connect a Google Gemini key in Settings → AI Coach to read meal photos.')), { code: 'setup' })
  const key = await getApiKey()
  if (!key) throw Object.assign(fail(t('Connect a Google Gemini key in Settings → AI Coach to read meal photos.')), { code: 'setup' })
  const { ensureAiConsent } = await import('./coach-api.js')
  await ensureAiConsent()

  const model = d.model || HTTP_PROVIDERS.gemini.defaultModel
  const base = baseUrlFor('gemini', { provider: 'gemini', providerOptions: d.baseUrl ? { gemini: { baseUrl: d.baseUrl } } : {} })
  const res = await nativeFetch(`${base.replace(/\/$/, '')}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: 'image/jpeg', data: await jpegBase64(file) } }, { text: PROMPT(getLang()) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, maxOutputTokens: 4096 }
    })
  })
  let data = null
  try { data = await res.json() } catch { /* read below */ }
  if (!res.ok) throw fail(t('Gemini could not read the photo: {0}', data?.error?.message || res.status))
  const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')
  return parseFoodReply(text)
}
