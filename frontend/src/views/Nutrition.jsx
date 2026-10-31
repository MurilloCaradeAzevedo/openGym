import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { MEALS, MACROS, entryFromFood, dayTotals, mealAt } from '../lib/nutrition.js'
import { searchFoods } from '../lib/taco-search.js'
import { readMealPhoto, scaleItem } from '../lib/food-photo.js'
import { fmtDate, fmtNum, todayISO, uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button, NumberField, Segmented, TextField } from '../components/ui.jsx'
import { confirmSheet } from '../sheets.jsx'

const update = fn => useStore.getState().update(s => { if (!Array.isArray(s.food)) s.food = []; fn(s) })
const toast = message => useUI.getState().toast(message)

// Literal t() calls, so check-source-strings sees every label.
const MEAL_LABEL = { breakfast: () => t('Breakfast'), lunch: () => t('Lunch'), snack: () => t('Snack'), dinner: () => t('Dinner') }
const MACRO_LABEL = { kcal: () => t('Calories'), p: () => t('Protein'), c: () => t('Carbs'), f: () => t('Fat') }
const unitOf = m => (m === 'kcal' ? 'kcal' : 'g')

const shiftDay = (d, n) => {
  const x = new Date(d + 'T12:00:00')
  x.setDate(x.getDate() + n)
  return x.toISOString().slice(0, 10)
}

function AddFood({ d, meal: firstMeal, close }) {
  const [meal, setMeal] = useState(firstMeal)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null)
  const [grams, setGrams] = useState(100)
  const [manual, setManual] = useState(null)
  const hits = picked || manual ? [] : searchFoods(query)

  const save = entry => {
    update(s => { s.food.push({ id: uid(), d, t: Date.now(), meal, ...entry }) })
    toast(t('Food added'))
    close()
  }
  const savePicked = () => {
    if (!(grams > 0)) { toast(t('Enter the amount in grams')); return }
    save(entryFromFood(picked, grams))
  }
  const saveManual = () => {
    const name = manual.name.trim()
    if (!name || !(manual.kcal >= 0)) { toast(t('Enter a name and the calories')); return }
    save({ name: name.slice(0, 80), g: null, kcal: Math.round(manual.kcal), p: +manual.p || 0, c: +manual.c || 0, f: +manual.f || 0 })
  }

  return <>
    <h3>{t('Add food')}</h3>
    <Segmented value={meal} onChange={setMeal} options={MEALS.map(m => ({ value: m, label: MEAL_LABEL[m]() }))} />
    <div style={{ height: 12 }} />
    {picked ? <>
      <div className="card">
        <b>{picked.name}</b>
        <div className="muted small" style={{ marginTop: 4 }}>{t('Per 100 g: {0} kcal, {1} g protein, {2} g carbs, {3} g fat', picked.kcal, picked.p, picked.c, picked.f)}</div>
      </div>
      <label className="measure-field">
        <span>{t('Amount (g)')}</span>
        <span className="measure-input"><NumberField value={grams} onChange={setGrams} /><i>g</i></span>
      </label>
      {grams > 0 && <div className="muted small" style={{ margin: '8px 2px' }}>
        {(e => t('{0} kcal, {1} g protein, {2} g carbs, {3} g fat', e.kcal, e.p, e.c, e.f))(entryFromFood(picked, grams))}
      </div>}
      <div style={{ height: 12 }} />
      <Button variant="primary" onClick={savePicked}>{t('Add')}</Button>
      <div style={{ height: 8 }} />
      <Button variant="ghost" className="dim" onClick={() => setPicked(null)}>{t('Back')}</Button>
    </> : manual ? <>
      <TextField value={manual.name} maxLength={80} placeholder={t('Food name')} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} />
      <div className="measure-form" style={{ marginTop: 10 }}>
        {MACROS.map(m => <label className="measure-field" key={m}>
          <span>{MACRO_LABEL[m]()}</span>
          <span className="measure-input"><NumberField nullable value={manual[m]} onChange={v => setManual(x => ({ ...x, [m]: v }))} /><i>{unitOf(m)}</i></span>
        </label>)}
      </div>
      <div style={{ height: 12 }} />
      <Button variant="primary" onClick={saveManual}>{t('Add')}</Button>
      <div style={{ height: 8 }} />
      <Button variant="ghost" className="dim" onClick={() => setManual(null)}>{t('Back')}</Button>
    </> : <>
      <TextField value={query} autoFocus placeholder={t('Search food (TACO table)')} onChange={e => setQuery(e.target.value)} />
      <div className="list" style={{ marginTop: 10, maxHeight: '45vh', overflowY: 'auto' }}>
        {hits.map(food => <button className="lrow" key={food.name} style={{ width: '100%', textAlign: 'start' }}
          onClick={() => { setPicked(food); setGrams(100) }}>
          <span className="lrow-m"><span className="lrow-t">{food.name}</span>
            <span className="lrow-s">{t('{0} kcal per 100 g', food.kcal)}</span></span>
        </button>)}
        {query.trim() && !hits.length && <div className="empty small">{t('Nothing found. Add it by hand.')}</div>}
      </div>
      <div style={{ height: 12 }} />
      <Button variant="ghost" icon="plus" onClick={() => setManual({ name: query, kcal: null, p: null, c: null, f: null })}>{t('Add by hand')}</Button>
      <div style={{ height: 8 }} />
      <Button variant="ghost" className="dim" onClick={close}>{t('Cancel')}</Button>
    </>}
  </>
}

function PhotoMeal({ d, close }) {
  const nav = useNavigate()
  const [meal, setMeal] = useState(mealAt())
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState(null)
  const fileRef = useRef(null)

  const onFile = async ev => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const found = await readMealPhoto(file)
      if (!found.length) toast(t('No food found in the photo. Try another one or add it by hand.'))
      setItems(found)
    } catch (e) {
      if (e.code === 'setup') { close(); nav('/coach/setup') }
      if (e.message && e.code !== 'declined') toast(e.message)
    } finally { setBusy(false) }
  }
  const save = () => {
    const keep = items.filter(x => x.g > 0 || x.kcal > 0)
    if (!keep.length) { close(); return }
    const now = Date.now()
    update(s => { for (const x of keep) s.food.push({ id: uid(), d, t: now, meal, ...x }) })
    toast(t('Food added'))
    close()
  }

  return <>
    <h3>{t('Meal photo')}</h3>
    <Segmented value={meal} onChange={setMeal} options={MEALS.map(m => ({ value: m, label: MEAL_LABEL[m]() }))} />
    <div style={{ height: 12 }} />
    {items && items.length ? <>
      <div className="muted small" style={{ marginBottom: 10 }}>{t('Check the portions. The numbers are estimates from the photo.')}</div>
      <div className="list">{items.map((x, i) => <div className="card" key={i}>
        <div className="row between">
          <b style={{ minWidth: 0 }}>{x.name}</b>
          <button className="iconbtn" style={{ color: 'var(--red)' }} onClick={() => setItems(xs => xs.filter((_, j) => j !== i))} aria-label={t('Delete')}><Icon name="trash" /></button>
        </div>
        <label className="measure-field">
          <span>{t('Amount (g)')}</span>
          <span className="measure-input"><NumberField value={x.g} onChange={g => setItems(xs => xs.map((y, j) => (j === i ? scaleItem(y, g) : y)))} /><i>g</i></span>
        </label>
        <div className="small dim">{t('{0} kcal, {1} g protein, {2} g carbs, {3} g fat', x.kcal, x.p, x.c, x.f)}</div>
      </div>)}</div>
      <div style={{ height: 12 }} />
      <Button variant="primary" onClick={save}>{t('Save')}</Button>
    </> : <>
      <div className="muted small" style={{ marginBottom: 12 }}>{t('Take a photo of your plate. Google Gemini lists the foods and estimates the calories, using your key.')}</div>
      <Button variant="primary" icon="camera" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? t('Reading the photo…') : t('Take photo')}</Button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
    </>}
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={close}>{t('Cancel')}</Button>
  </>
}

function Targets({ close }) {
  const cur = useStore(s => s.S.foodTargets) || {}
  const [v, setV] = useState({ kcal: cur.kcal ?? null, p: cur.p ?? null, c: cur.c ?? null, f: cur.f ?? null })
  const save = () => {
    const out = Object.fromEntries(MACROS.map(m => [m, v[m] > 0 ? Math.round(v[m]) : null]))
    update(s => { s.foodTargets = MACROS.some(m => out[m]) ? out : null })
    close()
  }
  return <>
    <h3>{t('Daily targets')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Leave a field empty to skip it. The Coach can suggest numbers if you ask.')}</div>
    <div className="measure-form">
      {MACROS.map(m => <label className="measure-field" key={m}>
        <span>{MACRO_LABEL[m]()}</span>
        <span className="measure-input"><NumberField nullable value={v[m]} onChange={x => setV(o => ({ ...o, [m]: x }))} /><i>{unitOf(m)}</i></span>
      </label>)}
    </div>
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={close}>{t('Cancel')}</Button>
  </>
}

export const addFoodSheet = (d = todayISO(), meal = mealAt()) => useUI.getState().openSheet(close => <AddFood d={d} meal={meal} close={close} />)
export const photoMealSheet = (d = todayISO()) => useUI.getState().openSheet(close => <PhotoMeal d={d} close={close} />)
const targetsSheet = () => useUI.getState().openSheet(close => <Targets close={close} />)

export default function Nutrition() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [d, setD] = useState(todayISO())
  const food = (S.food || []).filter(e => e && e.d === d)
  const total = dayTotals(S.food, d)
  const goal = S.foodTargets || {}

  const remove = e => confirmSheet({
    title: t('Remove food?'), message: e.name, confirmText: t('Delete'), danger: true,
    onConfirm: () => update(s => { s.food = s.food.filter(x => x.id !== e.id) }),
  })

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" data-back="/stats" onClick={() => nav('/stats')} aria-label={t('Stats')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('Nutrition')}</h1><div className="sub">{t('What you eat, next to how you train')}</div></div>
      <button className="iconbtn" onClick={targetsSheet} aria-label={t('Daily targets')}><Icon name="gear" /></button>
    </div>

    <div className="row between" style={{ margin: '0 2px 10px' }}>
      <button className="iconbtn" onClick={() => setD(shiftDay(d, -1))} aria-label={t('Previous day')}><Icon name="chevronLeft" /></button>
      <b>{d === todayISO() ? t('Today') : fmtDate(d, true)}</b>
      <button className="iconbtn" disabled={d >= todayISO()} onClick={() => setD(shiftDay(d, 1))} aria-label={t('Next day')}><Icon name="chevronRight" /></button>
    </div>

    <div className="card">
      {MACROS.map(m => {
        const g = goal[m]
        const pct = g ? Math.min(100, Math.round(total[m] / g * 100)) : 0
        return <div key={m} style={{ marginBottom: 10 }}>
          <div className="row between small">
            <span>{MACRO_LABEL[m]()}</span>
            <span><b>{fmtNum(total[m])}</b>{g ? ' / ' + fmtNum(g) : ''} {unitOf(m)}</span>
          </div>
          {g ? <div style={{ height: 6, borderRadius: 3, background: 'var(--fill-3, rgba(127,127,127,.2))', marginTop: 4 }}>
            <div style={{ width: pct + '%', height: '100%', borderRadius: 3, background: total[m] > g ? 'var(--red)' : 'var(--acc)' }} />
          </div> : null}
        </div>
      })}
      {!S.foodTargets && <Button size="sm" variant="tinted" onClick={targetsSheet}>{t('Set daily targets')}</Button>}
    </div>

    {MEALS.map(meal => {
      const items = food.filter(e => (e.meal || 'snack') === meal)
      const kcal = items.reduce((a, e) => a + (+e.kcal || 0), 0)
      return <div key={meal}>
        <div className="row between" style={{ margin: '18px 2px 8px' }}>
          <h4 className="sec" style={{ margin: 0 }}>{MEAL_LABEL[meal]()}{kcal ? ` · ${Math.round(kcal)} kcal` : ''}</h4>
          <Button size="sm" variant="ghost" icon="plus" onClick={() => addFoodSheet(d, meal)}>{t('Add')}</Button>
        </div>
        {items.length ? <div className="list">{items.map(e => <div className="card row between" key={e.id}>
          <div style={{ minWidth: 0 }}>
            <b>{e.name}</b>
            <div className="small dim" style={{ marginTop: 2 }}>
              {e.g ? fmtNum(e.g) + ' g · ' : ''}{Math.round(e.kcal)} kcal · {t('P {0} · C {1} · F {2}', fmtNum(e.p), fmtNum(e.c), fmtNum(e.f))}
            </div>
          </div>
          <button className="iconbtn" style={{ color: 'var(--red)' }} onClick={() => remove(e)} aria-label={t('Delete')}><Icon name="trash" /></button>
        </div>)}</div> : null}
      </div>
    })}
    <div style={{ height: 14 }} />
    <Button variant="primary" icon="camera" onClick={() => photoMealSheet(d)}>{t('Meal photo')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="tinted" icon="chat" onClick={() => nav('/coach')}>{t('Ask the Coach about my diet')}</Button>
  </div>
}
