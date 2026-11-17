import gsap from 'gsap'
import Lenis from 'lenis'
import { glass } from './glass.js'
import code from './code.txt?raw'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const portrait = matchMedia('(max-aspect-ratio: 1/1)')
const split = document.querySelector('.split')

if (!reduced) new Lenis({ autoRaf: true })

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
const names = [...document.querySelectorAll('.name')].map((name) =>
  [...name.children].flatMap((word) => {
    const letters = [...word.textContent]
    word.textContent = ''
    return letters.map((letter) => {
      const span = document.createElement('span')
      span.className = 'char'
      span.textContent = letter
      word.append(span)
      return span
    })
  }),
)

// The divider: the side under the pointer opens up, and it sways on its own when left alone.
const state = { p: reduced ? 50 : 100, target: 50 }
let locked = !reduced
let lastMove = -Infinity
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
})

// Choosing a side: that side sweeps across the whole screen, then the page changes.
for (const side of document.querySelectorAll('.side')) {
  side.addEventListener('click', (e) => {
    if (reduced || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return
    e.preventDefault()
    locked = true
    cursor.classList.remove('is-live')
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
}

// PC setup clip: hidden until the file exists, plays only while on screen.
const setup = document.querySelector('.setup')
const video = setup.querySelector('video')
video.addEventListener('error', () => { setup.hidden = true })
new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting && !reduced) video.play().catch(() => {})
  else video.pause()
}).observe(video)

glass()
