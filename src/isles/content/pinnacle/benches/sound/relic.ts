import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { BENCHES, relicId } from '../../spec';
import { OBS, VOICE, VOICE_LIT, note, voiceJar } from './art';

/**
 * The Choir Bench's relic: THE UNSTOPPERED JAR — the jar from the Vault door, the oldest voice,
 * its stopper out. The Part was one note for life; this undoes it. Every ability you cast (E, R,
 * F, Q — the click is breath, not a note) adds a note to a phrase over your shoulder, as long as
 * that ability is not already in the phrase. Three different notes make a tune of your own: the
 * jar SINGS — 30 damage to the foe if they are within 320 px, 10 health back, and your blows
 * 20% harder for 3 seconds. Repeat a note and you are singing one note again: the phrase starts
 * over from it. Eight seconds of silence and it is forgotten.
 */

const B = BENCHES.find((x) => x.isle === 'sound')!;
const ID = relicId(B.id);
const PHRASE = 3;
const FORGET = 8000;

const unstoppered: ItemScriptFactory = (ctx) => {
  let phrase: string[] = [];
  let lastAt = 0;
  let sangAt = -9999;
  let sangHit = false;
  return {
    update(time) {
      if (phrase.length && time - lastAt > FORGET) phrase = [];
    },
    onCast(_id, slot) {
      if (!slot || slot === 'click') return;
      const now = ctx.scene.time.now;
      lastAt = now;
      if (phrase.includes(slot)) { phrase = [slot]; return; }
      phrase.push(slot);
      if (phrase.length < PHRASE) { ctx.sfx('crystal-chime'); return; }
      phrase = [];
      sangAt = now;
      const p = ctx.player, n = ctx.npc;
      sangHit = n.active && n.hp > 0 && Math.hypot(n.x - p.x, n.y - p.y) < 320;
      if (sangHit) ctx.hit(n, 30, n.x, n.y);
      ctx.heal(p, 10);
      ctx.boostDamage(1.2, 3000);
      ctx.float(p.x, p.y - 60, 'A TUNE OF YOUR OWN', '#ffd2ec');
      ctx.sfx('holy-chord');
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!p.active || p.hp <= 0) return;
      const x = p.x - 30, y = p.y - 30;
      voiceJar(g, x, y + 8, 14, { glow: 0.5 + phrase.length * 0.25, open: true, label: false });
      // The phrase so far, on a scrap of stave beside the jar.
      for (let i = 0; i < 3; i++) { g.lineStyle(1, OBS.edge, 0.35); g.lineBetween(x - 2, y - 22 + i * 4, x + 34, y - 22 + i * 4); }
      phrase.forEach((_, i) => note(g, x + 6 + i * 10, y - 14 - i * 4, 2.6, VOICE, 1));
      // Singing: rings out of the jar, toward the foe.
      const s = time - sangAt;
      if (s < 700) {
        const k = s / 700;
        g.lineStyle(4 * (1 - k), VOICE_LIT, 1 - k); g.strokeCircle(x, y - 6, 12 + k * 90);
        if (sangHit) {
          const n = ctx.npc;
          for (let i = 0; i < 5; i++) {
            const f = (k + i / 5) % 1;
            note(g, x + (n.x - x) * f, y + (n.y - y) * f - Math.sin(f * Math.PI) * 40, 3.2, VOICE_LIT, 1 - k, i % 2 === 0);
          }
        }
      }
    },
  };
};

export const CHOIR_RELIC: IsleItemDef = {
  id: ID,
  name: 'The Unstoppered Jar',
  emoji: '🫙',
  kind: 'charm',
  flavor: 'The oldest voice in the Vault, its stopper out. It has stopped humming one note. It sings whatever it likes now.',
  script: ID,
  scriptText: [
    'Cast three different abilities in a row (E, R, F or Q — not the click) and the jar sings a tune of your own:',
    '30 damage to the foe within 320 px, 10 health, and +20% damage for 3 s.',
    'Repeating an ability already in the phrase starts it over. 8 s without a cast and it is forgotten.',
  ],
  isle: 'pinnacle',
};

export const CHOIR_SCRIPTS: Record<string, ItemScriptFactory> = { [ID]: unstoppered };
