import assert from 'node:assert/strict'

// Run with a Playwright Chromium browser and the local Vite URL.
export async function checkHomeDrag(browser, url = 'http://127.0.0.1:5173/') {
  const results = []
  for (const [name, width, height, reducedMotion] of [
    ['portrait', 390, 844, 'no-preference'],
    ['landscape', 844, 390, 'no-preference'],
    ['reduced motion', 390, 844, 'reduce'],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion })
    try {
      const page = await context.newPage()
      await page.goto(url)
      await page.waitForTimeout(3200)
      const divider = page.locator('.split > .divider')
      assert.equal(await divider.evaluate(el => getComputedStyle(el).pointerEvents), 'auto', `${name}: barrier accepts touch`)
      assert.equal(await divider.evaluate(el => getComputedStyle(el).touchAction), 'none', `${name}: dragging owns the gesture`)
      const box = await divider.boundingBox()
      const split = await page.locator('.split').boundingBox()
      const vertical = height > width
      const position = () => page.locator('.split').evaluate(el => Number(el.style.getPropertyValue('--p')))
      const start = await position()
      const x = box.x + box.width / 2 + (vertical ? 0 : 14)
      const y = box.y + box.height / 2 + (vertical ? 14 : 0)
      const session = await context.newCDPSession(page)
      const touch = (type, px, py) => session.send('Input.dispatchTouchEvent', {
        type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x: px, y: py }],
      })
      const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await touch('touchStart', x, y)
      await frame()
      assert.ok(Math.abs(await position() - start) < 1, `${name}: grabbing off centre does not jump`)
      await touch('touchMove', x + (vertical ? 0 : 140), y + (vertical ? 140 : 0))
      await frame()
      const expected = Math.min(90, start + 140 / (vertical ? split.height : split.width) * 100)
      assert.ok(Math.abs(await position() - expected) < 1, `${name}: barrier follows the finger without easing`)
      await touch('touchEnd')
      const released = await position()
      await page.waitForTimeout(3000)
      assert.ok(Math.abs(await position() - released) < 0.1, `${name}: released position stays put`)
      assert.equal(new URL(page.url()).pathname, '/', `${name}: dragging does not open a side`)
      assert.equal(await page.evaluate(() => scrollY), 0, `${name}: dragging does not scroll`)
      // A cancelled drag must release ownership for the next finger.
      const next = await divider.boundingBox()
      await touch('touchStart', next.x + next.width / 2, next.y + next.height / 2)
      await touch('touchCancel')
      await touch('touchStart', next.x + next.width / 2, next.y + next.height / 2)
      await touch('touchMove', next.x + next.width / 2 - (vertical ? 0 : 50), next.y + next.height / 2 - (vertical ? 50 : 0))
      await frame()
      assert.ok(await position() < released - 3, `${name}: dragging works after cancellation`)
      await touch('touchEnd')
      results.push(`${name}: direct drag, release, cancellation passed`)
    } finally {
      await context.close()
    }
  }
  return results
}
