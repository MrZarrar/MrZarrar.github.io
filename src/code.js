import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { glass } from './glass.js'
import code from './code.txt?raw'

gsap.registerPlugin(ScrollTrigger)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

if (!reduced) {
  const lenis = new Lenis({ anchors: true })
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

// Demos play silently while on screen; the button restarts one with sound and mutes the rest.
const frames = [...document.querySelectorAll('.frame')]

function setSound(frame, on) {
  const video = frame.querySelector('video')
  frame.classList.toggle('is-unmuted', on)
  frame.querySelector('.sound').textContent = on ? 'Mute' : 'Play with sound'
  video.muted = !on
  video.controls = on
}

for (const frame of frames) {
  const video = frame.querySelector('video')
  frame.querySelector('.sound').addEventListener('click', () => {
    const on = video.muted
    for (const other of frames) if (other !== frame) setSound(other, false)
    setSound(frame, on)
    if (on) {
      video.currentTime = 0
      video.play().catch(() => {})
    }
  })
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && (!reduced || !video.muted)) video.play().catch(() => {})
    else {
      video.pause()
      if (!video.muted) setSound(frame, false)
    }
  }, { threshold: 0.35 }).observe(video)
}

glass()
