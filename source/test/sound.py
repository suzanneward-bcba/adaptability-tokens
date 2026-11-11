import asyncio, sys
from playwright.async_api import async_playwright
def ok(c,m):
    if not c: print('✗',m); sys.exit(1)
    print('✓',m)
SPY = """
window.__osc=0;
const AC = window.AudioContext; window.AudioContext = class extends AC {
  createOscillator(){ const o=super.createOscillator(); const st=o.start.bind(o); o.start=(t)=>{ window.__osc++; st(t); }; return o; }
  createBufferSource(){ const o=super.createBufferSource(); const st=o.start.bind(o); o.start=(t)=>{ window.__osc++; st(t); }; return o; } };
"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg=await b.new_page(viewport={'width':1180,'height':820})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(SPY); await pg.goto('http://localhost:8765/?demo=1'); await pg.wait_for_selector('.tile')
        await pg.click('.tile[data-id="l-mia"]'); await pg.click('.award'); await pg.wait_for_timeout(200)
        ok(await pg.evaluate('window.__osc')>=1,'theme token sound plays')
        for i in range(4):
            await pg.wait_for_timeout(650); await pg.evaluate('window.__osc=0'); await pg.click('.award') if await pg.locator('.award').count() else None
        ok(await pg.evaluate('window.__osc')>=3,'theme finish sound plays when the board is full')
        await pg.click('.nav [data-to="settings"]')
        for d in '1234': await pg.click(f'.pinpad button[data-v="{d}"]')
        ok('Token sound' not in await pg.locator('main').inner_text(),'old picture-token sound picker is gone')
        await pg.click('[data-f="s.sound"][data-v="false"]'); await pg.evaluate('window.__osc=0')
        await pg.click('.brand'); await pg.click('.tile[data-id="l-leo"]'); await pg.click('.award'); await pg.wait_for_timeout(200)
        ok(await pg.evaluate('window.__osc')==0,'sounds off = silent')
        ok(not errs,'no errors '+str(errs))
        await b.close()
asyncio.run(main())
