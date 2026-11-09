// Friends (api/social.js): your streak, a fire row of friends (lit when they trained this week,
// an ember when not, tap for a nudge), the week's race and friends' workouts with a 🔥 to give.
// Needs a server account; a phone on its own has nobody to be friends with.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtNum, todayISO } from '../lib/format.js'
import { t, tn } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button, TextField } from '../components/ui.jsx'
import { confirmSheet } from '../sheets.jsx'
import '../friends.css'

const toast = message => useUI.getState().toast(message)
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) })
const NUDGE_AFTER_DAYS = 3

// Literal t() calls, so check-source-strings sees every message.
const ERRORS = {
  'unknown-code': () => t('No one has that code. Check it and try again.'),
  self: () => t('That is your own code.'),
  limit: () => t('You have reached the friend limit.'),
  recent: () => t('They trained in the last few days. No nudge needed.'),
  again: () => t('You already nudged them today.'),
}
const errorText = e => ERRORS[e?.data?.code]?.() || e?.message || t('Something went wrong.')

// One colour per person, stable across screens, from the app's own palette.
const TINTS = ['--blue', '--teal', '--indigo', '--pink', '--green', '--orange']
const tintOf = id => `var(${TINTS[[...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length]})`
const Avatar = ({ id, name }) => <span className="fr-av" style={{ background: tintOf(id) }} aria-hidden="true">{(name || '?').trim().charAt(0).toUpperCase()}</span>

const canNudge = f => f.daysAway == null || f.daysAway >= NUDGE_AFTER_DAYS

function AddFriend({ code: mine, close, onDone }) {
  const [code, setCode] = useState('')
  const share = async () => {
    const text = t('Add me on Leafy with my friend code: {0}', mine)
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(mine); toast(t('Code copied')) }
    } catch { /* closed the share sheet */ }
  }
  const add = async () => {
    try {
      const r = await post('/api/social/request', { code })
      toast(r.status === 'friends' ? t('You are now friends') : t('Request sent'))
      close(); onDone()
    } catch (e) { toast(errorText(e)) }
  }
  return <>
    <h3>{t('Add a friend')}</h3>
    <div className="muted small">{t('Your friend code')}</div>
    <div className="fr-code">{mine}</div>
    <Button variant="tinted" icon="share" onClick={share}>{t('Share my code')}</Button>
    <div style={{ height: 20 }} />
    <div className="muted small" style={{ marginBottom: 8 }}>{t('Got a friend’s code? Type it here.')}</div>
    <TextField value={code} maxLength={12} placeholder={t('Friend code')} autoCapitalize="characters"
      onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && code.trim()) add() }} />
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={add} disabled={!code.trim()}>{t('Send request')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={close}>{t('Cancel')}</Button>
  </>
}

function FriendSheet({ f, lit, close, onDone }) {
  const nudge = async () => {
    try { await post('/api/social/nudge', { id: f.id }); toast(t('Nudge sent')); close(); onDone() } catch (e) { toast(errorText(e)) }
  }
  const remove = () => { close(); confirmSheet({
    title: t('Remove friend?'), message: f.name, confirmText: t('Remove'), danger: true,
    onConfirm: async () => { try { await post('/api/social/remove', { id: f.id }); onDone() } catch (e) { toast(errorText(e)) } },
  }) }
  return <>
    <div className="row" style={{ gap: 12, marginBottom: 14 }}>
      <span style={{ width: 48, height: 48, display: 'inline-block' }}><Avatar id={f.id} name={f.name} /></span>
      <div><h3 style={{ margin: 0 }}>{f.name}</h3>
        <div className="muted small">{f.daysAway == null ? t('No workouts yet') : f.daysAway === 0 ? t('Trained today') : tn('Last workout {0} day ago', 'Last workout {0} days ago', f.daysAway)}</div></div>
    </div>
    <p className="fr-empty" style={{ margin: '0 0 16px' }}>
      {lit ? tn('On fire: {0} week in a row.', 'On fire: {0} weeks in a row.', f.streak) : t('No workout this week yet.')}
    </p>
    {canNudge(f)
      ? <Button variant="primary" icon="flame" onClick={nudge}>{t('Nudge {0}', f.name)}</Button>
      : <div className="muted small" style={{ marginBottom: 4 }}>{t('They trained in the last few days. No nudge needed.')}</div>}
    <div style={{ height: 8 }} />
    <Button variant="ghost" style={{ color: 'var(--red)' }} onClick={remove}>{t('Remove friend')}</Button>
  </>
}

export default function Friends() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const [info, setInfo] = useState(null)
  const [feed, setFeed] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const [i, f] = await Promise.all([api('/api/social'), api('/api/social/feed')])
      setInfo(i); setFeed(f); setError(null)
    } catch (e) { setError(errorText(e)) }
  }, [])
  useEffect(() => { if (user) load() }, [user, load])
  // Nudges are shown once: seen as soon as this screen has shown them.
  useEffect(() => { if (info?.nudges?.length) post('/api/social/nudges/seen').catch(() => {}) }, [info])

  const act = async (fn, done) => {
    try { await fn(); if (done) toast(done); await load() } catch (e) { toast(errorText(e)) }
  }
  const fire = async w => {
    // Shown at once, put right by the reload.
    setFeed(f => ({ ...f, feed: f.feed.map(x => (x === w ? { ...x, fired: !x.fired, fires: x.fires + (x.fired ? -1 : 1) } : x)) }))
    try { await post('/api/social/fire', { id: w.who, wid: w.wid }) } catch (e) { toast(errorText(e)) }
    load()
  }
  const addSheet = () => useUI.getState().openSheet(close => <AddFriend code={info.code} close={close} onDone={load} />)

  const header = <div className="hdr">
    <button className="iconbtn" data-back="/home" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
    <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('Friends')}</h1></div>
    {info && <button className="iconbtn" onClick={addSheet} aria-label={t('Add a friend')}><Icon name="plus" /></button>}
  </div>

  if (!user) return <div className="narrow">{header}
    <p className="fr-empty">{t('Friends need an account on a Leafy server. Sign in or connect this phone to your server first.')}</p>
    <Button variant="primary" onClick={() => nav('/settings')}>{t('Open settings')}</Button>
  </div>

  if (!info) return <div className="narrow">{header}
    {error ? <><p className="fr-empty" style={{ color: 'var(--red)' }}>{error}</p><Button onClick={load}>{t('Try again')}</Button></>
      : <p className="fr-empty">{t('Loading…')}</p>}
  </div>

  const rank = feed?.ranking || []
  const week = Object.fromEntries(rank.map(p => [p.id, p]))
  const me = week[user.id] || { workouts: 0, streak: 0 }
  const lit = f => (week[f.id]?.workouts || 0) > 0
  const friends = [...info.friends].sort((a, b) => lit(b) - lit(a) || (b.streak - a.streak))
  const litNames = friends.filter(lit).map(f => f.name)
  const most = Math.max(1, ...rank.map(p => p.workouts))
  const friendSheet = f => useUI.getState().openSheet(close => <FriendSheet f={f} lit={lit(f)} close={close} onDone={load} />)

  return <div className="narrow">{header}
    {info.nudges.map(n => <div className="card row" key={n.from + n.at} style={{ gap: 10 }}>
      <Icon name="flame" style={{ color: 'var(--orange)', flexShrink: 0 }} />
      <span>{t('{0} misses you at the gym', n.name)}</span>
    </div>)}

    {info.incoming.length > 0 && <div className="fr-feed">{info.incoming.map(r => <div className="fr-item" key={r.id}>
      <Avatar id={r.id} name={r.name} />
      <div className="fr-item-t">{t('{0} wants to be your friend', r.name)}</div>
      <div className="row" style={{ gap: 6 }}>
        <Button size="sm" variant="primary" onClick={() => act(() => post('/api/social/accept', { id: r.id }), t('You are now friends'))}>{t('Accept')}</Button>
        <Button size="sm" variant="ghost" onClick={() => act(() => post('/api/social/remove', { id: r.id }))}>{t('Decline')}</Button>
      </div>
    </div>)}</div>}

    <div className="fr-streak">
      <div className="fr-streak-n"><Icon name="flame" />{me.streak}</div>
      <div className="fr-streak-t">
        <b>{tn('{0} week in a row', '{0} weeks in a row', me.streak)}</b><br />
        {litNames.length ? t('Also training this week: {0}', litNames.join(', ')) : friends.length ? t('None of your friends has trained this week yet.') : t('Add friends to train side by side.')}
      </div>
    </div>

    <div className="fr-fires" role="list">
      {friends.map(f => <button className={'fr-fire' + (lit(f) ? '' : ' is-ember')} key={f.id} role="listitem" onClick={() => friendSheet(f)}
        aria-label={lit(f) ? t('{0}, trained this week', f.name) : t('{0}, no workout this week', f.name)}>
        <span className="fr-ring"><Avatar id={f.id} name={f.name} />
          {f.streak > 0 && <span className="fr-badge"><Icon name="flame" />{f.streak}</span>}
        </span>
        <span className="fr-fire-name">{f.name}</span>
      </button>)}
      <button className="fr-fire is-add" role="listitem" onClick={addSheet} aria-label={t('Add a friend')}>
        <span className="fr-ring"><Icon name="plus" /></span>
        <span className="fr-fire-name">{t('Add')}</span>
      </button>
    </div>

    {info.outgoing.length > 0 && <p className="fr-empty">{t('Waiting for: {0}', info.outgoing.map(r => r.name).join(', '))}</p>}

    {rank.length > 1 && <>
      <h2 className="fr-h">{t('This week’s race')}</h2>
      <div className="fr-race">{rank.map((p, i) => <div key={p.id}
        className={'fr-lane' + (p.id === user.id ? ' is-me' : '') + (i === 0 && p.workouts > 0 ? ' is-lead' : '')}>
        <span className="fr-lane-name">{p.id === user.id ? t('You') : p.name}</span>
        <span className="fr-track"><span className="fr-bar" style={{ width: (p.workouts / most * 100) + '%' }} /></span>
        <span className="fr-lane-n">{p.workouts}</span>
      </div>)}</div>
    </>}

    <h2 className="fr-h">{t('Recent workouts')}</h2>
    {feed?.feed?.length ? <div className="fr-feed">{feed.feed.map(w => <div className="fr-item" key={w.who + (w.wid || w.d + w.title)}>
      <Avatar id={w.who} name={w.name} />
      <div style={{ minWidth: 0 }}>
        <div className="fr-item-t">{t('{0} trained {1}', w.name, w.title || t('Workout'))}</div>
        <div className="fr-item-s">
          {w.d === todayISO() ? t('Today') : fmtDate(w.d, true)}{w.minutes ? `, ${w.minutes} min` : ''}, {tn('{0} set', '{0} sets', w.sets)}
          {w.prs > 0 && <>, <span className="fr-pr">{tn('{0} record', '{0} records', w.prs)}</span></>}
        </div>
      </div>
      {w.wid && <button className={'fr-react' + (w.fired ? ' is-on' : '')} onClick={() => fire(w)}
        aria-pressed={w.fired} aria-label={w.fired ? t('Take back your fire') : t('Give a fire')}>
        <Icon name="flame" />{w.fires || ''}
      </button>}
    </div>)}</div> : <p className="fr-empty">{friends.length ? t('Your friends’ workouts show up here.') : t('Share your code to add your first friend.')}</p>}
  </div>
}
