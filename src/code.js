import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import Lenis from 'lenis'
import { glass } from './glass.js'
import { projects } from './projects.js'

gsap.registerPlugin(Flip)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const lenis = reduced ? null : new Lenis({ autoRaf: true })

const gallery = document.querySelector('.gallery')
const detail = document.querySelector('.detail')
const stage = detail.querySelector('.detail__stage')
const info = detail.querySelector('.detail__info')
const closeButton = detail.querySelector('.detail__close')
const prevButton = detail.querySelector('.detail__prev')
const nextButton = detail.querySelector('.detail__next')
const outside = [gallery, document.querySelector('.intro'), document.querySelector('.nav'), document.querySelector('.footer')]

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

// Lie Detector has no film yet, so its tile is a diff, which is what the tool reads.
function diffArt() {
  const art = el('div', 'media media--diff')
  art.setAttribute('aria-hidden', 'true')
  art.append(
    el('p', 'diff__head', 'agent summary vs git diff'),
    el('p', 'diff__line diff__line--minus', '- Added tests for every edge case'),
    el('p', 'diff__line diff__line--plus', '+ 0 test files changed'),
    el('p', 'diff__line diff__line--minus', '- Refactored the parser'),
    el('p', 'diff__line diff__line--plus', '+ parser.py untouched'),
    el('p', 'diff__verdict', '2 claims the diff does not back up'),
  )
  return art
}

function makeMedia(p) {
  if (p.art === 'diff') return diffArt()
  if (p.video) {
    const video = el('video', 'media')
    Object.assign(video, { src: p.video, poster: p.poster, muted: true, loop: true, playsInline: true, preload: 'metadata' })
    return video
  }
  const img = el('img', `media${p.fit === 'contain' ? ' media--contain' : ''}`)
  Object.assign(img, { src: p.poster, alt: '', loading: 'lazy', decoding: 'async' })
  return img
}

const items = projects.map((p, index) => {
  const tile = el('button', `tile tile--${p.id}`)
  tile.type = 'button'
  tile.setAttribute('aria-haspopup', 'dialog')
  tile.style.setProperty('--glow', p.glow)
  if (p.poster) tile.style.setProperty('--poster', `url("${p.poster}")`)
  const slot = el('span', 'tile__slot')
  const media = makeMedia(p)
  slot.append(media)
  const text = el('span', 'tile__text')
  text.append(el('strong', '', p.title), el('span', '', p.tagline))
  tile.append(slot, text)
  if (p.video || p.youtube) {
    const play = el('span', 'tile__play')
    play.setAttribute('aria-label', 'Has a demo film')
    play.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z"/></svg>'
    tile.append(play)
  }
  tile.addEventListener('click', () => open(index))
  if (media.tagName === 'VIDEO' && index > 0) {
    tile.addEventListener('pointerenter', () => { if (current !== index) media.play().catch(() => {}) })
    tile.addEventListener('pointerleave', () => { if (current !== index) media.pause() })
  }
  gallery.append(tile)
  return { p, tile, slot, media }
})

// The big tile plays on its own; the rest wake up on hover.
const lead = items[0].media
lead.addEventListener('loadedmetadata', () => { if (current !== 0) lead.currentTime = 20 }, { once: true })
if (!reduced) lead.play().catch(() => {})

let current = -1

function fill(p) {
  detail.style.setProperty('--glow', p.glow)
  info.querySelector('.detail__tagline').textContent = p.tagline
  info.querySelector('.detail__title').textContent = p.title
  info.querySelector('.detail__body').replaceChildren(...p.body.map((t) => el('p', '', t)))
  info.querySelector('.detail__facts').replaceChildren(...p.facts.map(([k, v]) => {
    const row = el('div')
    row.append(el('dt', '', k), el('dd', '', v))
    return row
  }))
  info.querySelector('.detail__links').replaceChildren(...p.links.map(([label, href]) => {
    const a = el('a', '', label)
    Object.assign(a, { href, target: '_blank', rel: 'noopener' })
    return a
  }))
  const n = items.length
  const prev = items[(current - 1 + n) % n].p
  const next = items[(current + 1) % n].p
  prevButton.textContent = `Previous: ${prev.title}`
  nextButton.textContent = `Next: ${next.title}`
}

function startFilm(it) {
  if (it.media.tagName === 'VIDEO') {
    Object.assign(it.media, { muted: false, controls: true, currentTime: 0 })
    it.media.play().catch(() => {})
  } else if (it.p.youtube) {
    const frame = el('iframe', 'detail__embed')
    Object.assign(frame, {
      src: `https://www.youtube-nocookie.com/embed/${it.p.youtube}?autoplay=1&rel=0`,
      title: `${it.p.title} demo`,
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
    })
    stage.append(frame)
  }
}

function park(it) {
  stage.querySelector('.detail__embed')?.remove()
  if (it.media.tagName === 'VIDEO') {
    Object.assign(it.media, { muted: true, controls: false })
    if (it.media !== lead) it.media.pause()
  }
  it.slot.append(it.media)
  it.tile.classList.remove('is-out')
}

function reveal() {
  if (reduced) return
  gsap.fromTo(info.children, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'expo.out', delay: 0.25 })
}

// Opening: the tile's own film or picture flies out of the grid into the stage.
function open(index, animate = !reduced) {
  if (current !== -1) return
  current = index
  const it = items[index]
  fill(it.p)
  detail.hidden = false
  const state = Flip.getState(it.media)
  stage.append(it.media)
  it.tile.classList.add('is-out')
  requestAnimationFrame(() => detail.classList.add('is-open'))
  for (const node of outside) node.inert = true
  lenis?.stop()
  history.replaceState(null, '', `#${it.p.id}`)
  closeButton.focus({ preventScroll: true })
  if (animate) {
    Flip.from(state, { duration: 0.85, ease: 'expo.inOut', absolute: true, zIndex: 60, onComplete: () => startFilm(it) })
    reveal()
  } else {
    startFilm(it)
  }
}

function close() {
  if (current === -1) return
  const it = items[current]
  current = -1
  const state = Flip.getState(it.media)
  park(it)
  detail.classList.remove('is-open')
  for (const node of outside) node.inert = false
  lenis?.start()
  history.replaceState(null, '', location.pathname)
  it.tile.focus({ preventScroll: true })
  const done = () => { if (current === -1) detail.hidden = true }
  if (reduced) return done()
  Flip.from(state, { duration: 0.7, ease: 'expo.inOut', absolute: true, zIndex: 60, onComplete: done })
}

// Previous and next swap projects inside the open view without going back to the grid.
function step(by) {
  if (current === -1) return
  const n = items.length
  const target = (current + by + n) % n
  park(items[current])
  current = target
  const it = items[target]
  fill(it.p)
  stage.append(it.media)
  it.tile.classList.add('is-out')
  history.replaceState(null, '', `#${it.p.id}`)
  startFilm(it)
  if (!reduced) {
    gsap.fromTo(it.media, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out', clearProps: 'all' })
    reveal()
  }
}

closeButton.addEventListener('click', close)
prevButton.addEventListener('click', () => step(-1))
nextButton.addEventListener('click', () => step(1))
detail.addEventListener('click', (e) => { if (e.target === detail) close() })
addEventListener('keydown', (e) => {
  if (current === -1) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
})

// Opening moment: the title rises, then the tiles settle into the grid.
const title = document.querySelector('.intro__title')
if (!reduced) {
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from(title, { yPercent: 40, autoAlpha: 0, duration: 1.1 }, 0.05)
    .from('.intro__text', { autoAlpha: 0, y: 16, duration: 0.9 }, 0.3)
    .from(items.map((it) => it.tile), { autoAlpha: 0, y: 40, scale: 0.96, duration: 1, stagger: 0.06, clearProps: 'transform,opacity,visibility' }, 0.35)
    .from('.nav', { autoAlpha: 0, y: -16, duration: 1 }, 0.6)
}

// A link like /code/#glycolens opens that project straight away.
const linked = items.findIndex((it) => `#${it.p.id}` === location.hash)
if (linked !== -1) open(linked, false)

glass()
