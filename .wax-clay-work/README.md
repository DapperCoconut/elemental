# Wax / Clay / Biome Builder — work-in-progress folder (2026-10-12)

Resume by telling Claude: "continue the Wax/Clay work" — the memory note
`project_wax_clay_biome_revamp` has the decisions and the remaining checklist.

## Scripts (run from this folder; they need a Vite dev server on :5173 and a Chrome
## with --remote-debugging-port=9222)

    # Windows Chrome from WSL (headless, debuggable):
    setsid nohup "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
      --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir="C:\Temp\elem-chrome" \
      --no-first-run --disable-gpu --mute-audio about:blank > /dev/null 2>&1 &
    node verify-biomes.mjs      # Earth Biome Builder + Symbiosis (22 checks)
    node verify-wax.mjs         # Wax kit, upgrades, bot (31 checks)
    node verify-clay.mjs        # Clay kit, upgrades, mastery, bot (32 checks)
    node shot-closeup.mjs clay clay      # 2× clipped screenshot of a rig: close-<el>-<setup>.png
    node shot-closeup.mjs wax wax

`harness.mjs` stops Phaser's own rAF loop and steps frames from Node (`step(n)`), freezes
nothing by itself — tests set `npc.speed = 0` and override `kit.handleInput` because the
headless pointer sits at (0,0).

## prev-agent-draft/
The earlier agent's uncommitted files, kept only as reference text for the campaign
content still to be written (fights, story, boss, items, gimmicks, husks, boons, journal).
Its mechanics and visuals were replaced; do not copy code from it.
