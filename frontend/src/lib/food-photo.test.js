import { describe, expect, it } from 'vitest'
import { parseFoodReply, scaleItem, MAX_ITEMS } from './food-photo.js'

describe('parseFoodReply', () => {
  it('reads the items and bounds every number', () => {
    const text = JSON.stringify({ items: [
      { name: ' Arroz branco ', g: 150, kcal: 192, p: 3.84, c: 42.2, f: 0.3 },
      { name: 'Feijão', grams: '100', kcal: -5, protein: 4.8, carbs: 13.6, fat: 'x' },
      { name: '', g: 10 }, null, 'pão',
    ] })
    expect(parseFoodReply(text)).toEqual([
      { name: 'Arroz branco', g: 150, kcal: 192, p: 3.8, c: 42.2, f: 0.3 },
      { name: 'Feijão', g: 100, kcal: 0, p: 4.8, c: 13.6, f: 0 },
    ])
  })
  it('takes a fenced answer or a bare list, and caps how many', () => {
    expect(parseFoodReply('```json\n[{"name":"Ovo","g":50,"kcal":73,"p":6.5,"c":0.3,"f":4.9}]\n```')).toHaveLength(1)
    const many = Array.from({ length: 50 }, (_, i) => ({ name: 'x' + i, g: 1, kcal: 1, p: 0, c: 0, f: 0 }))
    expect(parseFoodReply(JSON.stringify(many))).toHaveLength(MAX_ITEMS)
  })
  it('reads garbage as nothing', () => {
    expect(parseFoodReply('not json')).toEqual([])
    expect(parseFoodReply('{"items":"no"}')).toEqual([])
  })
})

describe('scaleItem', () => {
  it('scales calories and macros with the portion', () => {
    expect(scaleItem({ name: 'A', g: 100, kcal: 128, p: 2.5, c: 28.1, f: 0.2 }, 150))
      .toEqual({ name: 'A', g: 150, kcal: 192, p: 3.8, c: 42.2, f: 0.3 })
  })
  it('zeroes an item set to nothing', () => {
    expect(scaleItem({ name: 'A', g: 100, kcal: 128, p: 2.5, c: 28.1, f: 0.2 }, 0)).toMatchObject({ g: 0, kcal: 0 })
  })
})
