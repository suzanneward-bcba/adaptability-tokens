import asyncio, sys
from playwright.async_api import async_playwright
SH='/home/claude/tokens/shots/'
SPY = """window.__n=0; const AC=window.AudioContext; window.AudioContext=class extends AC{createOscillator(){const o=super.createOscillator();const s=o.start.bind(o);o.start=t=>{window.__n++;s(t)};return o}createBufferSource(){const o=super.createBufferSource();const s=o.start.bind(o);o.start=t=>{window.__n++;s(t)};return o}};"""
def ok(c,m):
    if not c: print('✗',m); sys.exit(1)
    print('✓',m)
async def hold(pg, sel, ms=1200):
    b=await pg.locator(sel).first.bounding_box(); await pg.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2); await pg.mouse.down(); await pg.wait_for_timeout(ms); await pg.mouse.up()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1180,'height':820}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.add_init_script(SPY); await pg.goto('http://localhost:8765/?demo=1'); await pg.wait_for_selector('.tile')
        ok(await pg.locator('.tile[data-id="l-noor"] svg.th-flower').count()==1,'home tile shows themed mini board')
        await pg.screenshot(path=SH+'50-home-themes.png', full_page=True)
        await pg.click('.tile[data-id="l-noor"]'); await pg.wait_for_selector('svg.th-flower')
        await pg.click('[data-a="openChoice"]'); await pg.click('.choice[data-r="r-swing"]'); await pg.click('.modal [data-a="closeModal"]')
        await pg.evaluate('window.__n=0'); await pg.click('.award'); n1=await pg.evaluate('window.__n')
        ok(n1>=1,'theme token sound plays'); ok(await pg.locator('svg.th-flower .pnew').count()>=1,'new piece animates in')
        for i in range(4): await pg.wait_for_timeout(650); await pg.evaluate('window.__n=0'); await pg.click('.award')
        ok(await pg.evaluate('window.__n')>=8,'theme finish sound plays (flower harp)')
        cls = await pg.locator('svg.th-flower').get_attribute('class')
        ok('done' in cls and 'big' in cls and 'rm' not in cls,'big finish animates on completion')
        await pg.wait_for_timeout(2500); await pg.screenshot(path=SH+'51-flower-done.png')
        await pg.click('[data-a="deliver"]')
        cls = await pg.locator('svg.th-flower').get_attribute('class')
        ok('rm' in cls,'finish does not replay on later taps (shown still)')
        await pg.reload(); await pg.wait_for_selector('svg.th-flower')
        ok('rm' in await pg.locator('svg.th-flower').get_attribute('class'),'finish does not replay after reload')
        await pg.click('[data-a="newBoard"]'); ok('done' not in await pg.locator('svg.th-flower').get_attribute('class'),'new board starts empty theme')
        # collective themed rocket
        await pg.click('.brand'); await pg.click('.tile[data-id="g-rocket"]'); await pg.wait_for_selector('svg.th-rocket')
        for i in range(8): await pg.wait_for_timeout(650); await pg.click('.award')
        ok('done' in await pg.locator('svg.th-rocket').get_attribute('class'),'collective rocket completes')
        await pg.wait_for_timeout(1500); await pg.screenshot(path=SH+'52-rocket-launch.png')
        ok(await pg.evaluate('window.__AT.state.learners.find(l=>l.id==="l-mia").board.earned')==0,'collective theme does not touch individual boards')
        # independent group card with theme
        await pg.click('.brand'); await pg.click('.tile[data-id="g-morning"]')
        ok(await pg.locator('.gcard svg.th-flower').count()==1,"independent group shows Noor's flower")
        await pg.screenshot(path=SH+'53-independent-themes.png', full_page=True)
        # learner view: choose-after learner auto-opens menu AFTER finish
        await pg.click('.nav [data-to="learners"]')
        for d in '1234': await pg.click(f'.pinpad button[data-v="{d}"]')
        await pg.click('[data-a="editLearner"][data-id="l-leo"]')
        await pg.wait_for_selector('.themepick')
        await pg.click('.themepick [data-v="egg"]')
        await pg.screenshot(path=SH+'54-editor-theme.png', full_page=True)
        await pg.click('[data-a="saveLearner"]')
        ok(await pg.evaluate('window.__AT.state.learners.find(l=>l.id==="l-leo").theme')=='egg','theme saved from editor')
        await pg.click('[data-a="openBoard"][data-id="l-leo"]'); await pg.click('[data-a="lv"]'); await pg.wait_for_selector('.lv svg.th-egg')
        await hold(pg,'.staffcorner')
        for i in range(3): await pg.wait_for_timeout(650); await pg.click('.sheet .award')
        await hold(pg,'.staffcorner')  # close sheet
        await pg.wait_for_timeout(1000); ok(await pg.locator('.modal').count()==0,'choice menu waits while the egg hatches')
        await pg.wait_for_timeout(2800); ok(await pg.locator('.modal .choice').count()>0,'choice menu opens after the finish')
        await pg.screenshot(path=SH+'55-after-hatch.png')
        # reduced motion
        await pg.click('.modal [data-a="closeModal"]'); await hold(pg,'.staffcorner'); await pg.click('[data-a="exitLV"]')
        ok(not errs,'no errors '+str(errs))
        await b.close()
asyncio.run(main())
