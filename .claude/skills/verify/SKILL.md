---
name: verify
description: Build/launch/drive recipe for verifying Elemental (Phaser browser game) changes end-to-end from WSL.
---

# Verifying Elemental changes

## Launch

```bash
npm run dev            # vite on http://localhost:5173 (background it)
```

## Browser handle (WSL → Windows Chrome)

Playwright's Linux chromium is broken here (missing libnspr4). Use **Windows Chrome + puppeteer-core** (devDep):

```bash
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --remote-debugging-port=9333 --user-data-dir='C:\Users\Public\chrome-e2e-inv' \
  --no-first-run --mute-audio about:blank &
sleep 6   # then connect
```

Networking is mirrored: both `localhost:9333` (DevTools) and `localhost:5173` work from both sides.

In a `.mjs` script (run it with plain `node`; puppeteer-core must be imported by absolute path because scratchpad scripts are outside the repo):

```js
const puppeteer = (await import('/home/kids/dev/elemental/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).default;
const browser = await puppeteer.connect({ browserURL: 'http://localhost:9333', defaultViewport: null });
```

`browser.close()` kills Chrome — relaunch it before every script run (or use `browser.disconnect()`).

## Driving the game

- `window.game` (Phaser.Game) and `window.net` are exposed by main.ts. Canvas is 960×640, unscaled.
- Jump anywhere directly: `game.scene.getScene('TitleScene').scene.start('ArenaScene', { elementId: 'fire', enemyElementId: 'water', difficulty: 3 })` — add `mode: 'invasion'` for invasion.
- Find UI buttons by scanning a scene's children for their Text objects (`c.text.includes('INVASION')` — labels are UPPERCASE) and click at their x/y + canvas offset.
- **Clicks must be slow**: move → down → hold ~150ms → up. Fast `mouse.click()` falls between Phaser frames.
- Inspect private scene state freely at runtime: `sc.enemies`, `sc.player.hp`, `sc.invasionKit.shardsEarned`, etc.
- Persistence lives in `localStorage['elemental_save']` (underscore, not dash).

## Flows worth driving

- Title → mode button → MenuScene element pick → Arena; fight by clicking at enemy positions (click ability aims at pointer).
- Death path: set `sc.player.hp = 12` and let enemies finish the kill (direct hp writes don't emit 'defeated'; the killing blow must come from `takeDamage`).
- Match restart / kit reset: from GameOverScene, `scene.start('ArenaScene', {...})` again with a different element.
- Capture `page.on('pageerror')` + console errors; a lone 404 (favicon) is pre-existing noise.
