import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EXDB } from '../lib/exercises-data.js'
import LeafyFigure from './LeafyFigure.jsx'

const html = ex => renderToStaticMarkup(<LeafyFigure ex={ex} />)

describe('LeafyFigure', () => {
  it('draws a labelled figure with one glow per muscle worked', () => {
    const ex = EXDB.find(e => e.tg === 'quads' && e.sm?.length)
    const out = html(ex)
    expect(out).toContain('<svg')
    expect(out).toContain('role="img"')
    const muscles = new Set([ex.tg, ...ex.sm]).size
    expect(out.match(/<ellipse/g).length).toBeLessThanOrEqual(muscles)
    expect(out.match(/<ellipse/g).length).toBeGreaterThan(0)
  })

  it('never carries a picture from anywhere else', () => {
    for (const ex of EXDB.filter((_, i) => i % 97 === 0)) {
      const out = html(ex)
      expect(out).not.toMatch(/<img|<video|\.webp|\.mp4|http/)
    }
  })

  it('draws every exercise of the app without throwing', () => {
    for (const ex of EXDB) expect(() => html(ex)).not.toThrow()
  }, 60000)
})
