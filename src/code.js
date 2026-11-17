import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { glass } from './glass.js'
import code from './code.txt?raw'

gsap.registerPlugin(ScrollTrigger)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis
if (!reduced) {
  lenis = new Lenis({ anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}

const fall = document.createElement('div')
fall.textContent = `${code}
${code}`
document.querySelector('.codefall').append(fall)

// Opening moment: the title rises letter by letter.
const title = document.querySelector('.intro__title')
const word = document.createElement('span')
word.className = 'word'
const chars = [...title.textContent.trim()].map((letter) => {
  const span = document.createElement('span')
  span.className = 'char'
  span.textContent = letter
  return span
})
word.append(...chars)
title.setAttribute('aria-label', title.textContent.trim())
title.replaceChildren(word)

if (!reduced) {
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from(chars, { yPercent: 110, duration: 1.3, stagger: 0.05 }, 0.1)
    .from('.intro__text > *', { autoAlpha: 0, y: 20, duration: 1, stagger: 0.12 }, 0.7)
    .from('.nav', { autoAlpha: 0, y: -16, duration: 1 }, 0.9)

  // Each demo tilts up out of the page and settles flat as it reaches you.
  for (const frame of document.querySelectorAll('.frame')) {
    gsap.fromTo(frame,
      { scale: 0.84, rotateX: 16, transformPerspective: 1600, transformOrigin: '50% 0%' },
      { scale: 1, rotateX: 0, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'top 22%', scrub: true } })
  }
  for (const head of document.querySelectorAll('.project__head h2')) {
    gsap.fromTo(head, { xPercent: -5 }, {
      xPercent: 3, ease: 'none',
      scrollTrigger: { trigger: head, start: 'top bottom', end: 'bottom top', scrub: true },
    })
  }
}

// Demos play silently while on screen. Clicking one focuses it: the page dims, the film is
// centred and sized to the screen, and it restarts with sound.
const frames = [...document.querySelectorAll('.frame')]
const backdrop = document.createElement('div')
backdrop.className = 'focus-backdrop'
document.body.append(backdrop)
let focused = null

function unfocus() {
  if (!focused) return
  const frame = focused
  const video = frame.querySelector('video')
  focused = null
  video.muted = true
  video.controls = false
  frame.classList.remove('is-focused')
  frame.style.scale = ''
  frame.querySelector('.sound').textContent = 'Play with sound'
  document.body.classList.remove('is-focusing')
}

function focus(frame) {
  if (focused === frame) return
  unfocus()
  focused = frame
  const video = frame.querySelector('video')
  const top = frame.getBoundingClientRect().top + scrollY
  const h = frame.offsetHeight
  const scale = Math.min((innerWidth * 0.94) / frame.offsetWidth, (innerHeight * 0.9) / h, 1.12)
  frame.style.scale = scale.toFixed(3)
  frame.classList.add('is-focused')
  frame.querySelector('.sound').textContent = 'Close'
  document.body.classList.add('is-focusing')
  video.muted = false
  video.controls = true
  video.currentTime = 0
  video.play().catch(() => {})
  // the frame scales from its top edge, so its centre lands at top + scaled height / 2
  const target = top + (scale * h) / 2 - innerHeight / 2
  if (lenis) lenis.scrollTo(target, { duration: 1.1 })
  else scrollTo({ top: target })
}

backdrop.addEventListener('click', unfocus)
addEventListener('keydown', (e) => { if (e.key === 'Escape') unfocus() })

for (const frame of frames) {
  const video = frame.querySelector('video')
  video.addEventListener('click', () => focus(frame))
  frame.querySelector('.sound').addEventListener('click', () => {
    if (focused === frame) unfocus()
    else focus(frame)
  })
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && (!reduced || focused === frame)) video.play().catch(() => {})
    else {
      video.pause()
      if (focused === frame) unfocus()
    }
  }, { threshold: 0.35 }).observe(video)
}

glass()
