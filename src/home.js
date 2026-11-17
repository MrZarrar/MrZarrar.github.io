import gsap from 'gsap'
import Lenis from 'lenis'
import { glass, refracts } from './glass.js'
import code from './code.txt?raw'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const portrait = matchMedia('(max-aspect-ratio: 1/1)')
const split = document.querySelector('.split')

const lenis = reduced ? null : new Lenis({ autoRaf: true })

// Night side: real Noctis source, doubled so the scroll loops without a seam.
const fall = document.createElement('div')
fall.textContent = `${code}\n${code}`
document.querySelector('.codefall').append(fall)

// Day side: the artworks, drifting in tilted columns.
const works = [
  'joker-art', 'heart-art', 'cards-art', 'moonknight-art', 'batman-art', 'inception-art',
  'spiderverse-art', 'icarus-art', 'evil-queen-art', 'paris-art', 'london-art', 'zenitsu-art',
  'warrior-art', 'keyhole-art', 'winter-cottage-art', 'lake-art', 'portrait-art', 'ds9-art',
  'flowers-art', 'goku-progress-art', 'rhul-art', '208-art', 'knight-sketch', 'fal-abi-art',
]
const columns = portrait.matches ? 4 : 6
const wall = document.querySelector('.wall')
for (let c = 0; c < columns; c++) {
  const col = document.createElement('div')
  col.className = 'wall__col'
  col.style.setProperty('--speed', `${70 + ((c * 17) % 40)}s`)
  const picks = works.filter((_, i) => i % columns === c)
  for (const name of [...picks, ...picks]) {
    const img = new Image()
    img.src = `./art/media/artworks/${name}-640.webp`
    img.alt = ''
    img.decoding = 'async'
    col.append(img)
  }
  wall.append(col)
}

// Split each letter of both copies of the name so they can rise in step.
for (const word of document.querySelectorAll('.name > span')) {
  const letters = [...word.textContent]
  word.textContent = ''
  for (const letter of letters) {
    const span = document.createElement('span')
    span.className = 'char'
    span.textContent = letter
    word.append(span)
  }
}

// Safari and Firefox can't bend a backdrop, so there the divider holds three bands of a live
// copy of both sides: magnified through the middle, squeezed and pulled inward at the edges.
// Plain transforms only, so it stays smooth; Chromium uses the real refraction from glass.js.
const divider = document.querySelector('.divider')
const bands = []
if (!refracts) {
  divider.classList.add('has-lens')
  const sides = document.querySelectorAll('.split > .side')
  for (const [start, end, scale, shift] of [[0, 0.2, 0.62, 0.16], [0.2, 0.8, 1.14, 0], [0.8, 1, 0.62, -0.16]]) {
    const band = document.createElement('div')
    band.className = 'divider__band'
    const copy = document.createElement('div')
    copy.className = 'divider__clone'
    copy.inert = true
    for (const side of sides) {
      const c = side.cloneNode(true)
      c.removeAttribute('href')
      copy.append(c)
    }
    band.append(copy)
    divider.append(band)
    bands.push({ band, copy, start, end, scale, shift })
  }
}

let W = 0
let H = 0
let D = 0
function measure() {
  W = split.clientWidth
  H = split.clientHeight
  const vertical = !portrait.matches
  D = vertical ? divider.offsetWidth : divider.offsetHeight
  for (const b of bands) {
    Object.assign(b.copy.style, { width: `${W}px`, height: `${H}px` })
    const pos = `${b.start * 100}%`
    const size = `${(b.end - b.start) * 100}%`
    Object.assign(b.band.style, vertical
      ? { left: pos, width: size, top: '0', height: '100%' }
      : { top: pos, height: size, left: '0', width: '100%' })
  }
}
new ResizeObserver(measure).observe(split)

// Lines each band's copy up with the page: what shows at a point in the band is the page at the
// divider's centre plus (distance from centre / scale), nudged by the band's shift.
function placeLens(x, y) {
  const vertical = !portrait.matches
  const c = D / 2
  for (const b of bands) {
    const a = b.start * D
    const origin = (vertical ? x : y) + c + b.shift * D
    const t = c - a - origin * b.scale
    b.copy.style.transform = vertical
      ? `translate(${t}px, ${-y}px) scale(${b.scale}, 1)`
      : `translate(${-x}px, ${t}px) scale(1, ${b.scale})`
  }
}

const names = [...document.querySelectorAll('.name')].map((name) => [...name.querySelectorAll('.char')])

// The divider: the side under the pointer opens up, and it sways on its own when left alone.
const state = { p: reduced ? 50 : 100, target: 50 }
let locked = !reduced
let lastMove = -Infinity
// A glass drop hanging off the divider says there's more below, and scrolls there.
const about = document.querySelector('.about')
about.id = 'about'
const cue = document.createElement('a')
cue.className = 'scroll-cue glass'
cue.href = '#about'
cue.dataset.glassScale = '36'
cue.innerHTML = '<span>About me</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5"/></svg>'
split.append(cue)
cue.addEventListener('click', (e) => {
  if (!lenis) return
  e.preventDefault()
  lenis.scrollTo(about, { duration: 1.4 })
})
addEventListener('scroll', () => {
  cue.style.opacity = String(Math.max(0, 1 - scrollY / 240))
}, { passive: true })

const cursor = document.querySelector('.cursor')
const cursorLabel = cursor.querySelector('span')
const moveX = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' })
const moveY = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' })

function fraction(e) {
  const r = split.getBoundingClientRect()
  return portrait.matches ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width
}

split.addEventListener('pointermove', (e) => {
  const f = fraction(e)
  if (!reduced) state.target = 50 - (f * 100 - 50) * 0.55
  lastMove = performance.now()
  moveX(e.clientX)
  moveY(e.clientY)
  const side = f * 100 < state.p ? 'night' : 'day'
  if (cursor.dataset.side !== side) {
    cursor.dataset.side = side
    split.dataset.hover = side
    cursorLabel.textContent = side === 'night' ? 'Software' : 'Art'
  }
  cursor.classList.add('is-live')
})

gsap.ticker.add(() => {
  if (!locked && !reduced) {
    const now = performance.now()
    if (now - lastMove > 2600) state.target = 50 + Math.sin(now / 1900) * 8
    state.p += (state.target - state.p) * 0.065
  }
  split.style.setProperty('--p', state.p.toFixed(3))
  const x = portrait.matches ? 12 : (state.p / 100) * W - 38
  const y = portrait.matches ? (state.p / 100) * H - 30 : 14
  if (bands.length) placeLens(x, y)
})

split.addEventListener('pointerleave', () => { delete split.dataset.hover })

// Choosing a side: that side sweeps across the whole screen, then the page changes.
for (const side of document.querySelectorAll('.side')) {
  side.addEventListener('click', (e) => {
    if (reduced || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return
    e.preventDefault()
    locked = true
    cursor.classList.remove('is-live')
    const chosen = side.dataset.side
    gsap.to(`.mask--${chosen}`, { scale: 2.2, rotate: 0, duration: 0.8, ease: 'expo.inOut' })
    gsap.to(`.mask--${chosen === 'night' ? 'day' : 'night'}`, { autoAlpha: 0, scale: 0.4, duration: 0.5, ease: 'power3.in' })
    gsap.to(state, {
      p: side.dataset.side === 'night' ? 104 : -4,
      duration: 0.8,
      ease: 'expo.inOut',
      onComplete: () => { location.href = side.href },
    })
  })
}

addEventListener('pageshow', (e) => {
  if (!e.persisted) return
  gsap.killTweensOf(state)
  gsap.set('.mask', { clearProps: 'all' })
  state.p = 50
  locked = false
})

// The one opening moment: the name rises, then day slides in from the right.
if (!reduced) {
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { locked = false } })
  for (const chars of names) intro.from(chars, { yPercent: 108, duration: 1.3, stagger: 0.045 }, 0.15)
  intro
    .to(state, { p: 50, duration: 1.6, ease: 'expo.inOut' }, 0.55)
    .from('.side__label', { autoAlpha: 0, y: 18, duration: 1, stagger: 0.12 }, 1.3)
    .from('.nav', { autoAlpha: 0, y: -16, duration: 1 }, 1.5)
    .from(cue, { autoAlpha: 0, y: 24, duration: 1, clearProps: 'transform,visibility' }, 1.9)
    .from('.mask', { autoAlpha: 0, scale: 0.3, duration: 1.2, stagger: 0.12, ease: 'back.out(1.6)', clearProps: 'transform,opacity,visibility' }, 1.2)
}

// The desk clip behind the about section plays only while it's on screen.
const desk = document.querySelector('.about__bg')
new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting && !reduced) desk.play().catch(() => {})
  else desk.pause()
}).observe(desk)

glass()
