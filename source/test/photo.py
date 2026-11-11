import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1180,'height':820})
        await pg.goto('http://localhost:8765/?demo=1'); await pg.wait_for_selector('.tile')
        # real upload through the editor
        from PIL import Image; Image.new('RGB',(800,600),(42,96,166)).save('/tmp/a.png')
        await pg.click('.nav [data-to="learners"]')
        for d in '1234': await pg.click(f'.pinpad button[data-v="{d}"]')
        await pg.click('[data-a="editLearner"][data-id="l-mia"]')
        await pg.set_input_files('input[data-upload="avatarImage"]','/tmp/a.png'); await pg.wait_for_selector('img.thumb')
        await pg.click('[data-a="saveLearner"]'); await pg.wait_for_timeout(500)
        await pg.evaluate('window.__AT.state.learners[0].board.earned=0')
        await pg.click('.brand'); await pg.click('.tile[data-id="l-mia"]'); await pg.click('.award'); await pg.reload(); await pg.wait_for_selector('.count')
        r = await pg.evaluate('[window.__AT.state.learners.find(l=>l.id==="l-mia").avatarImage?.slice(0,15), window.__AT.state.learners.find(l=>l.id==="l-mia").board.earned]')
        print('photo kept + progress:', r); assert r[0]=='data:image/jpeg' and r[1]>=1
        await b.close()
asyncio.run(main())
