import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bindDividerDrag } from '../src/divider-drag.js'

function setup(vertical = true) {
  const divider = new EventTarget()
  let captured = null
  divider.setPointerCapture = id => { captured = id }
  divider.hasPointerCapture = id => captured === id
  divider.releasePointerCapture = () => { captured = null }
  const split = { getBoundingClientRect: () => ({ top: 100, left: 20, width: 800, height: 600 }) }
  const state = { p: 50, target: 50, locked: false }
  let rendered = null
  const dragging = bindDividerDrag(divider, split, state, { matches: vertical }, () => { rendered = state.p })
  const send = (type, props = {}) => {
    const event = new Event(type, { cancelable: true })
    Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, clientX: 434, clientY: 414 }, props)
    divider.dispatchEvent(event)
    return event
  }
  return { state, send, dragging, captured: () => captured, rendered: () => rendered }
}

for (const vertical of [true, false]) {
  test(`${vertical ? 'portrait' : 'landscape'}: follows the drag immediately without jumping on grab`, () => {
    const c = setup(vertical)
    c.send('pointerdown')
    assert.equal(c.captured(), 1)
    assert.equal(c.dragging(), true)
    assert.equal(c.state.p, 50)
    c.send('pointermove', vertical ? { clientY: 534 } : { clientX: 594 })
    assert.equal(c.state.p, 70)
    assert.equal(c.state.target, 70)
    assert.equal(c.rendered(), 70)
    c.send('pointerup')
    assert.equal(c.dragging(), false)
    assert.equal(c.captured(), null)
    c.send('pointermove', { clientX: 0, clientY: 0 })
    assert.equal(c.state.p, 70)
  })
}

test('clamps travel, ignores other fingers, and recovers from cancellation or capture loss', () => {
  const c = setup()
  c.send('pointerdown')
  c.send('pointermove', { pointerId: 2, clientY: 900 })
  assert.equal(c.state.p, 50)
  c.send('pointermove', { clientY: 1200 })
  assert.equal(c.state.p, 90)
  c.send('pointermove', { clientY: -1000 })
  assert.equal(c.state.p, 10)
  c.send('pointercancel')
  assert.equal(c.dragging(), false)
  c.send('pointerdown')
  assert.equal(c.dragging(), true)
  c.send('lostpointercapture')
  assert.equal(c.dragging(), false)
})

test('leaves the intro and secondary pointers alone', () => {
  const c = setup()
  c.state.locked = true
  c.send('pointerdown')
  assert.equal(c.dragging(), false)
  c.state.locked = false
  c.send('pointerdown', { isPrimary: false })
  assert.equal(c.dragging(), false)
  c.send('pointerdown', { button: 2 })
  assert.equal(c.dragging(), false)
})

test('supports arrow keys and travel endpoints', () => {
  const c = setup()
  assert.equal(c.send('keydown', { key: 'ArrowDown' }).defaultPrevented, true)
  assert.equal(c.state.p, 52)
  c.send('keydown', { key: 'Home' })
  assert.equal(c.state.p, 10)
  c.send('keydown', { key: 'End' })
  assert.equal(c.state.p, 90)
  assert.equal(c.send('keydown', { key: 'Tab' }).defaultPrevented, false)
})
