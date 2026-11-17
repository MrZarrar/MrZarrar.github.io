export function bindDividerDrag(divider, split, state, portrait, render) {
  let drag = null
  const setPosition = value => {
    state.p = state.target = Math.max(10, Math.min(90, value))
    render()
  }
  divider.addEventListener('pointerdown', event => {
    if (state.locked || drag || !event.isPrimary || event.button !== 0) return
    const rect = split.getBoundingClientRect()
    drag = {
      id: event.pointerId,
      vertical: portrait.matches,
      start: portrait.matches ? event.clientY : event.clientX,
      size: portrait.matches ? rect.height : rect.width,
      position: state.p,
    }
    divider.setPointerCapture(event.pointerId)
    event.preventDefault()
  })
  divider.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return
    const current = drag.vertical ? event.clientY : event.clientX
    setPosition(drag.position + (current - drag.start) / drag.size * 100)
  })
  const finish = event => {
    if (!drag || event.pointerId !== drag.id) return
    drag = null
    if (divider.hasPointerCapture(event.pointerId)) divider.releasePointerCapture(event.pointerId)
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    divider.addEventListener(event, finish)
  }
  divider.addEventListener('keydown', event => {
    if (state.locked || drag) return
    const values = { ArrowUp: state.p - 2, ArrowLeft: state.p - 2, ArrowDown: state.p + 2, ArrowRight: state.p + 2, Home: 10, End: 90 }
    if (!(event.key in values)) return
    event.preventDefault()
    setPosition(values[event.key])
  })
  return () => drag !== null
}
