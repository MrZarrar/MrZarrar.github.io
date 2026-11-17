// Liquid glass: each .glass element gets its own SVG filter whose displacement map bends the
// backdrop near its rounded edges, like a thick lens. Only Chromium applies SVG filters inside
// backdrop-filter; elsewhere glass stays frosted unless the page builds its own lens (home.js).
const NS = 'http://www.w3.org/2000/svg'
export const refracts = !!navigator.userAgentData?.brands?.some((b) => b.brand === 'Chromium')

let defs
let count = 0

function ensureDefs() {
  if (defs) return defs
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
  defs = document.createElementNS(NS, 'defs')
  svg.append(defs)
  document.body.append(svg)
  return defs
}

// Encodes, per pixel, which way to sample the backdrop: R is x, G is y, 128 means stay put.
// ponytail: one CPU pass per size change; move to a cached map per aspect ratio if huge frames lag.
function displacementMap(w, h, radius, bezel) {
  const step = w * h > 400_000 ? 2 : 1
  const cw = Math.ceil(w / step)
  const ch = Math.ceil(h / step)
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(cw, ch)
  const hw = w / 2
  const hh = h / 2
  const r = Math.min(radius, hw, hh)

  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const x = px * step - hw
      const y = py * step - hh
      const qx = Math.abs(x) - (hw - r)
      const qy = Math.abs(y) - (hh - r)
      let nx
      let ny
      let dist
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy) || 1
        dist = len - r
        nx = (qx / len) * Math.sign(x)
        ny = (qy / len) * Math.sign(y)
      } else if (qx > qy) {
        dist = qx - r
        nx = Math.sign(x)
        ny = 0
      } else {
        dist = qy - r
        nx = 0
        ny = Math.sign(y)
      }
      const t = Math.min(Math.max(-dist / bezel, 0), 1)
      const strength = (1 - t) ** 2.4
      const i = (py * cw + px) * 4
      img.data[i] = 128 - nx * strength * 127
      img.data[i + 1] = 128 - ny * strength * 127
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

function build(el, filter) {
  // offset sizes ignore transforms, so a frame mid-scale still gets a full-size map
  const w = el.offsetWidth
  const h = el.offsetHeight
  if (!w || !h) return
  const key = `${w}x${h}`
  if (el.dataset.glassKey === key) return
  el.dataset.glassKey = key

  const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
  const bezel = Number(el.dataset.glassBezel) || Math.min(36, Math.min(w, h) / 2.4)
  const scale = Number(el.dataset.glassScale) || 70
  const blur = el.dataset.glassBlur ?? 1.2

  const map = displacementMap(w, h, radius, bezel)
  // The filter region is the element's own box (objectBoundingBox) and feImage takes that region
  // by default: Safari draws nothing when these are given in userSpaceOnUse pixels.
  filter.innerHTML = `
    <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="soft" />
    <feImage href="${map}" xlink:href="${map}" preserveAspectRatio="none" result="map" />
    <feDisplacementMap in="soft" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="bent" />
    <feColorMatrix in="bent" type="saturate" values="1.6" />`
}

export function glass(root = document) {
  const d = ensureDefs()
  for (const el of root.querySelectorAll('.glass:not(.is-refracting)')) {
    if (!refracts) return
    const id = `liquid-glass-${++count}`
    const filter = document.createElementNS(NS, 'filter')
    filter.id = id
    for (const [k, v] of Object.entries({ x: 0, y: 0, width: 1, height: 1 })) filter.setAttribute(k, v)
    filter.setAttribute('primitiveUnits', 'userSpaceOnUse')
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    d.append(filter)
    build(el, filter)
    el.classList.add('is-refracting')
    el.style.backdropFilter = `url(#${id})`
    let pending
    new ResizeObserver(() => {
      clearTimeout(pending)
      pending = setTimeout(() => build(el, filter), 120)
    }).observe(el)
  }
}
