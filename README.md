# adaptABILITY Tokens

Digital token boards and reinforcer choice for adaptABILITY Therapie. Runs in the browser, installs to the iPad Home Screen, works offline after the first load. No accounts, no server, no analytics, no uploads.

## Repository layout

```
index.html, sw.js, manifest.webmanifest, icons/, .nojekyll, _headers   ← the app (GitHub Pages serves these)
source/
  src/        editable source: core.js (rules), app.js (interface), themes.js (14 animated boards),
              sounds.js (synthesized sounds), pictures.js (Pick and Play pictures), i18n.js (EN/DE), styles.css, template.html
  build.py    rebuilds the app files at the repository root  →  cd source && python3 build.py
  test/       core.test.js (node source/test/core.test.js) and Playwright browser tests (e2e*.py, sound.py, photo.py)
  preview/    older theme preview page (reference only)
```

**GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / `(root)`. The site must be served over **https** for offline mode and Home Screen install.

## Add it to an iPad Home Screen

1. Open the site in **Safari** on the iPad.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open it from the new "Tokens" icon and do your setup there. The Home Screen app and the Safari tab keep **separate** storage.

## First steps

1. A new device starts with **no learners and no groups**. Only the nine built-in reinforcers are there.
2. Tap **Start a board** (staff PIN, default **1234**), or add learners under Learners.
3. Settings → change the staff PIN, and export a backup regularly.

For training or testing, open the app with `?demo=1` on an empty device to load four sample learners and four sample groups.

## Day to day

- **Start a board** (staff): pick the learner (or type a new name), pick one of the 14 animated boards, set the number of tokens, and pick what they are working for. Tap **Start full screen**. The board fills the screen and the reward sits in the top corner.
- **Reward timing** per learner: *before* (picked at setup), *when the board is full*, or *before, and again at the end* (picked at setup; when the board is full the child sees "Keep … or pick something else?").
- **Animated boards only:** cookie, pizza, ice cream, birthday cake, pink donut, rocket, train, robot, flower, hatching egg, dino eggs, rainbow, puzzle, treasure chest. Each token adds a piece with its own sound; a full board plays a big finish once. With reduced motion on, finished pictures appear without movement.
- **Reinforcer menu:** trampoline, bubbles, swing, light show, cars, animals, trains, balloons, candy. Staff choose the picture and type the name they use with that child; a photo can replace the picture. Items can be turned off for the day.
- **Pictures:** the app uses the same pictures as Pick and Play (activity schedule), no emojis. Learners show the first letter of their name, or a photo.
- **Learner view:** no staff buttons. Staff press and hold *Hold for staff* (bottom right) to give or undo tokens, confirm the reward, or exit.
- **Groups:** independent (everyone keeps their own board) or collective (one shared board: group total or individual contributions). Collective boards are animated boards too.
- **History:** every award, undo, choice, completion and exchange, exportable as CSV.

## Data and privacy

All data lives in the browser on one device. Clearing Safari/website data deletes it. Backups and CSVs contain client information. Store them only where the practice allows client data, and use nicknames or initials for learners.

## Not in this version

Live sync between devices, secure staff login (the PIN is a local lock only), shared profiles across therapists' devices (use backup/restore), session graphs beyond the CSV.
