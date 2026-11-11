import asyncio, json, sys
from playwright.async_api import async_playwright
URL='http://localhost:8765/?demo=1'
SH='/home/claude/tokens/shots/'
errors=[]
def ok(c,m):
    if not c: print('✗',m); sys.exit(1)
    print('✓',m)
async def hold(page, sel, ms=950):
    el = page.locator(sel).first; b = await el.bounding_box()
    await page.mouse.move(b['x']+b['width']/2, b['y']+b['height']/2); await page.mouse.down(); await page.wait_for_timeout(ms); await page.mouse.up()
async def count(page): return (await page.locator('.count').first.inner_text()).split('\n')[0]
async def pin(page):
    for d in '1234': await page.click(f'.pinpad button[data-v="{d}"]')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':1180,'height':820}, has_touch=False, accept_downloads=True)
        page = await ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
        await page.goto(URL); await page.wait_for_selector('.tile')
        await page.screenshot(path=SH+'01-home.png', full_page=True)
        # individual board
        await page.click('.tile[data-id="l-mia"]'); await page.wait_for_selector('.award')
        await page.click('[data-a="openChoice"]'); await page.click('.choice[data-r="r-bubbles"]'); await page.click('.modal [data-a="closeModal"]')
        await page.click('.award'); await page.wait_for_timeout(700); await page.click('.award')
        ok(await count(page)=='2 of 5','two tokens awarded')
        await page.click('.award'); # immediate double tap blocked
        ok(await count(page)=='3 of 5','third award after debounce window? (expect 3)') if False else None
        await page.wait_for_timeout(50)
        c = await count(page); ok(c in ('2 of 5',),'rapid double tap ignored')
        await hold(page,'[data-hold="undo"]')
        ok(await count(page)=='1 of 5','hold-to-undo removed one token')
        await page.click('[data-a="openChoice"]'); await page.click('.choice[data-r="r-swing"]'); await page.click('.modal [data-a="closeModal"]')
        ok(await count(page)=='1 of 5','switching reinforcer kept progress')
        ok('Swing' in await page.locator('.wf-card').inner_text(),'new reinforcer shown')
        for i in range(4):
            await page.wait_for_timeout(650); await page.click('.award')
        ok(await count(page)=='5 of 5','board full')
        ok(await page.locator('.award').count()==0,'no more awarding when full')
        await page.screenshot(path=SH+'02-complete.png', full_page=True)
        await page.click('[data-a="deliver"]')
        ok(await page.locator('[data-a="deliver"]').count()==0,'delivery confirm only once')
        ok(await count(page)=='5 of 5','tokens not erased after delivery')
        st = await page.evaluate('window.__AT.state.log.filter(e=>e.kind==="exchange").length'); ok(st==1,'one exchange logged')
        await page.click('[data-a="timer"]'); await page.wait_for_selector('.timer'); await page.wait_for_timeout(600)
        await page.screenshot(path=SH+'03-timer.png'); await page.click('[data-a="timerPause"]'); await page.click('[data-a="timerClose"]')
        ok(await count(page)=='5 of 5','timer did not change tokens')
        await page.click('[data-a="newBoard"]'); ok(await count(page)=='0 of 5','new cycle started')
        await page.click('.award'); await page.wait_for_timeout(700); await page.click('.award')
        await page.reload(); await page.wait_for_selector('.count')
        ok(await count(page)=='2 of 5','progress survives refresh (and route restored)')
        # learner view
        await page.click('[data-a="lv"]'); await page.wait_for_selector('.lv')
        ok(await page.locator('.award').count()==0,'learner view hides staff controls')
        await page.screenshot(path=SH+'04-learnerview.png')
        await hold(page,'.staffcorner',1200); await page.wait_for_selector('.sheet')
        await page.click('.sheet .award'); ok(await count(page)=='3 of 5','award from staff sheet')
        await page.screenshot(path=SH+'05-sheet.png')
        await page.click('[data-a="exitLV"]')
        # group A
        await page.click('.brand'); await page.click('.tile[data-id="g-morning"]'); await page.wait_for_selector('.gcard')
        await page.click('.award[data-id="l-leo"]')
        st = await page.evaluate('[window.__AT.state.learners.find(l=>l.id==="l-leo").board.earned, window.__AT.state.learners.find(l=>l.id==="l-mia").board.earned]')
        ok(st==[1,3],'group A: Leo +1, Mia unchanged')
        await page.screenshot(path=SH+'06-groupA.png', full_page=True)
        # team
        await page.click('.brand'); await page.click('.tile[data-id="g-kitchen"]'); await page.wait_for_selector('.chips')
        await page.click('.chip[data-i="2"]'); await page.click('.award')
        ok(await count(page)=='1 of 10','team token')
        await page.screenshot(path=SH+'07-team.png', full_page=True)
        await page.click('[data-a="lv"]'); await page.wait_for_selector('.lv')
        txt = await page.locator('.lv').inner_text(); ok('Sharing materials' in txt and 'Mia' not in txt,'team display shows example, no names')
        await page.screenshot(path=SH+'08-team-display.png')
        await hold(page,'.staffcorner',1200); await page.click('[data-a="exitLV"]')
        # shared
        await page.click('.brand'); await page.click('.tile[data-id="g-friday"]'); await page.wait_for_selector('.contrib')
        await page.click('.award[data-l="l-leo"]'); await page.wait_for_timeout(100); await page.click('.award[data-l="l-noor"]')
        ok(await count(page)=='2 of 12','shared total')
        await page.screenshot(path=SH+'09-shared.png', full_page=True)
        await page.click('[data-a="lv"]'); await page.wait_for_selector('.lv')
        txt = await page.locator('.lv').inner_text(); ok(all(n not in txt for n in ['Mia','Leo','Noor','J.K.']),'shared display has no names')
        await page.screenshot(path=SH+'10-shared-display.png')
        await hold(page,'.staffcorner',1200); await page.click('[data-a="exitLV"]')
        # PIN + setup
        await page.click('.nav [data-to="learners"]'); await page.wait_for_selector('.pinpad')
        for d in '9999': await page.click(f'.pinpad button[data-v="{d}"]')
        ok('not correct' in await page.locator('.modal .err').inner_text(),'wrong PIN refused')
        await pin(page); await page.wait_for_selector('h1:has-text("Learners")')
        ok(True,'PIN unlocks setup')
        await page.click('[data-a="editLearner"]:not([data-id])'); await page.fill('#f-name','T.B.'); await page.fill('#f-goal','Wait for a turn')
        await page.click('.pick button[data-f="target"][data-v="3"]')
        await page.check('input[data-check="reinforcerIds"][value="r-lightshow"]')
        await page.screenshot(path=SH+'11-edit.png', full_page=True)
        await page.click('[data-a="saveLearner"]')
        ok(await page.evaluate('window.__AT.state.learners.some(l=>l.name==="T.B." && l.target===3)'),'new learner saved')
        # reinforcers unavailable
        await page.click('.nav [data-to="reinforcers"]'); await page.click('[data-a="toggleR"][data-id="r-lightshow"]')
        await page.screenshot(path=SH+'12-reinforcers.png', full_page=True)
        # backup & restore
        await page.click('.nav [data-to="settings"]')
        async with page.expect_download() as dl: await page.click('[data-a="backup"]')
        d = await dl.value; path = await d.path(); backup = open(path).read()
        ok(json.loads(backup)['app']=='adaptability-tokens','backup downloaded')
        await page.evaluate('window.__AT.state.learners.find(l=>l.id==="l-mia").board.earned=0')
        await page.click('[data-a="restore"]'); await page.fill('#restoreText', backup); await page.click('[data-a="restoreGo"]'); await page.click('[data-a="confirmOk"]')
        ok(await page.evaluate('window.__AT.state.learners.find(l=>l.id==="l-mia").board.earned')==3,'restore brings data back')
        async with page.expect_download() as dl: 
            await page.click('.nav [data-to="history"]'); await page.click('[data-a="csv"]')
        csv = open(await (await dl.value).path(), encoding='utf-8-sig').read()
        ok(csv.startswith('timestamp,event') and 'exchange' in csv,'CSV export has awards and exchanges')
        await page.screenshot(path=SH+'13-history.png')
        # German
        await page.click('[data-a="lang"]'); await page.click('.brand')
        ok('Tokenpläne' in await page.locator('h1').first.inner_text(),'German UI')
        await page.screenshot(path=SH+'14-home-de.png', full_page=True)
        await page.click('[data-a="lang"]')
        # service worker
        await page.wait_for_timeout(800)
        ok(await page.evaluate('navigator.serviceWorker.getRegistration().then(r=>!!r)'),'service worker registered')
        # portrait iPad
        await page.set_viewport_size({'width':820,'height':1180}); await page.click('.tile[data-id="l-leo"]')
        await page.screenshot(path=SH+'15-portrait.png', full_page=True)
        # phone
        await page.set_viewport_size({'width':390,'height':844}); await page.screenshot(path=SH+'16-phone.png', full_page=True)
        sw = await page.evaluate('document.documentElement.scrollWidth'); ok(sw<=390,'no sideways scroll on phone')
        # older theme + dark
        await page.set_viewport_size({'width':1180,'height':820})
        await page.emulate_media(color_scheme='dark'); await page.screenshot(path=SH+'17-dark.png')
        ok(not errors, 'no console errors ' + str(errors))
        await b.close()
asyncio.run(main())
