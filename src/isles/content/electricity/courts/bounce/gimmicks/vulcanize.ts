import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit, mixC } from '../../../../../art/IsleArt';
import { sulphurVat } from '../art';
import { HOT, HOT_LIT, RUBBER, RUBBER_SHEEN, SULPHUR, TOY_BLUE, TOY_RED } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Vulcanize — Curer Sulph.
 *
 * The curing floor is ankle-deep in warm sulphur dust, and anyone who walks it trails hot latex
 * from their boots. A fresh trail glows orange: it is *yours*, and it scalds and sticks to the
 * other fighter's feet. A few seconds on it cures — sets black into a low wall of vulcanized
 * rubber. Rubber walls belong to nobody: anyone who walks into one bounces off it, and a shot
 * that meets one bounces straight back at whoever fired it.
 *
 * The great vat at the top of the floor bubbles over on a beat and spits gobs of hot latex down
 * across the room. A gob that meets a rubber wall *bounces off it*, faster, and a gob burns
 * whoever it hits — either fighter. So the walls you lay are a backboard: bank the vat's gobs
 * off them into Sulph. Every so often the vat tips and a tongue of latex runs straight down the
 * floor; it sets into a long wall across the middle.
 */

const DROP_EVERY = 26;
const HOT_MS = 2300;
const SET_MS = 9500;
const NUB_R = 11;
const MAX_POINTS = 240;
const GOB_R = 8;
/** A bounced shot is left alone this long, so it is not turned twice on the same nub. */
const REBOUND_MS = 260;

type Owner = 'p' | 'n' | 'v';
interface Drop { x: number; y: number; owner: Owner; at: number }
interface Gob { x: number; y: number; vx: number; vy: number; at: number; bounces: number; hitCd: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const VAT = { x: W / 2, y: top + 64 };
  const drops: Drop[] = [];
  const gobs: Gob[] = [];
  const lastDrop = new Map<Fighter, { x: number; y: number }>();
  const lastScald = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const onHot = new Map<Fighter, boolean>([[player, false], [npc, false]]);
  const spitEvery = ctx.hard ? 3600 : 4600;
  const spillEvery = ctx.hard ? 9500 : 11500;
  let nextSpit = 0;
  let spitWarnAt = -1;
  let nextSpill = 0;
  let spillWarnAt = -1;
  let spillX = W / 2;
  let started = false;
  let orbitA = 0;
  /** Where fighters' shots just rebounded off rubber. */
  const rebounds: { x: number; y: number; at: number }[] = [];

  const ownerOf = (f: Fighter): Owner => (f === player ? 'p' : 'n');
  const isSet = (d: Drop, time: number) => time - d.at >= HOT_MS;
  const addDrop = (x: number, y: number, owner: Owner, time: number) => {
    drops.push({ x, y, owner, at: time });
    if (drops.length > MAX_POINTS) drops.splice(0, drops.length - MAX_POINTS);
  };

  function spit(time: number): void {
    const a0 = Math.atan2(player.y - VAT.y, player.x - VAT.x);
    const n = ctx.hard ? 6 : 5;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * 0.32;
      gobs.push({ x: VAT.x, y: VAT.y + 20, vx: Math.cos(a) * 230, vy: Math.max(60, Math.sin(a) * 230), at: time, bounces: 0, hitCd: 0 });
    }
    ctx.sfx('slime-splat');
  }

  function spill(time: number): void {
    for (let y = VAT.y + 50; y < H - 30; y += DROP_EVERY * 0.8) {
      for (const dx of [-26, 0, 26]) addDrop(spillX + dx + Math.sin(y / 30) * 10, y, 'v', time + (y - VAT.y) * 1.2);
    }
    ctx.sfx('oil-splash');
    ctx.banner('THE VAT TIPS', '#ffc070');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSpit = time + 2200; nextSpill = time + spillEvery; }
      orbitA += dt * 0.7;

      // Boots trail hot latex.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const last = lastDrop.get(f);
        if (!last || dist(last.x, last.y, f.x, f.y) >= DROP_EVERY) {
          lastDrop.set(f, { x: f.x, y: f.y });
          if (last) addDrop(f.x, f.y + 12, ownerOf(f), time);
        }
      }
      // Hot trails scald the other side; set rubber bounces everyone.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        let hot = false;
        for (const d of drops) {
          if (time < d.at) continue;
          const dd = dist(f.x, f.y + 12, d.x, d.y);
          if (!isSet(d, time)) {
            if (d.owner !== ownerOf(f) && dd < 16) hot = true;
          } else if (dd < NUB_R + 14) {
            const a = Math.atan2(f.y + 12 - d.y, f.x - d.x);
            const push = NUB_R + 14 - dd + 3;
            ctx.nudge(f, Math.cos(a) * push, Math.sin(a) * push);
          }
        }
        onHot.set(f, hot);
        if (hot && time - (lastScald.get(f) ?? 0) > 520) {
          lastScald.set(f, time);
          ctx.hit(f, ctx.hard ? 4 : 3, f.x, f.y);
          if (rng() < 0.4) ctx.sfx('sizzle');
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) if (time - drops[i].at > SET_MS) drops.splice(i, 1);

      // Fighters' shots bounce off set rubber, back on whoever fired them.
      for (let i = rebounds.length - 1; i >= 0; i--) if (time - rebounds[i].at > REBOUND_MS) rebounds.splice(i, 1);
      if (drops.some((d) => time >= d.at && isSet(d, time))) {
        for (const sh of ctx.shotsNear(W / 2, (top + H) / 2, W)) {
          if (rebounds.some((r) => dist(r.x, r.y, sh.x, sh.y) < NUB_R + 34)) continue;
          const d = drops.find((q) => time >= q.at && isSet(q, time) && dist(sh.x, sh.y, q.x, q.y - 4) < NUB_R + 8);
          if (!d) continue;
          sh.reflect(sh.x - d.x, sh.y - (d.y - 4));
          rebounds.push({ x: sh.x, y: sh.y, at: time });
          ctx.sfx('boing');
        }
      }

      // The vat spits on a beat.
      if (spitWarnAt < 0 && time >= nextSpit - 800) { spitWarnAt = time; ctx.sfx('bubble'); }
      if (time >= nextSpit) { nextSpit = time + spitEvery; spitWarnAt = -1; spit(time); }
      if (spillWarnAt < 0 && time >= nextSpill - 1300) {
        spillWarnAt = time;
        spillX = clamp(player.x + (rng() - 0.5) * 160, 120, W - 120);
      }
      if (time >= nextSpill) { nextSpill = time + spillEvery; spillWarnAt = -1; spill(time); }

      // Gobs: fly, bounce off set rubber (faster each time), burn whoever they meet.
      for (let i = gobs.length - 1; i >= 0; i--) {
        const b = gobs[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 20 || b.x > W - 20 || b.y < top || b.y > H - 10 || time - b.at > 5000) { gobs.splice(i, 1); continue; }
        for (const d of drops) {
          if (time < d.at || !isSet(d, time)) continue;
          const dd = dist(b.x, b.y, d.x, d.y);
          if (dd < NUB_R + GOB_R && b.bounces < 4) {
            const nx = (b.x - d.x) / (dd || 1), ny = (b.y - d.y) / (dd || 1);
            const dot = b.vx * nx + b.vy * ny;
            if (dot < 0) {
              b.vx = (b.vx - 2 * dot * nx) * 1.12; b.vy = (b.vy - 2 * dot * ny) * 1.12;
              b.bounces++;
              b.x = d.x + nx * (NUB_R + GOB_R + 1); b.y = d.y + ny * (NUB_R + GOB_R + 1);
              ctx.sfx('boing');
            }
            break;
          }
        }
        if (time < b.hitCd) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(b.x, b.y, f.x, f.y) > GOB_R + 20) continue;
          ctx.hit(f, (ctx.hard ? 10 : 8) + b.bounces * 2, f.x, f.y);
          ctx.float(f.x, f.y - 46, b.bounces ? `BANKED ×${b.bounces}` : 'SCALDED', '#ffc070');
          gobs.splice(i, 1);
          break;
        }
      }
    },

    playerSpeedMult: () => (onHot.get(player) ? 0.65 : 1),
    npcSpeedMult: () => (onHot.get(npc) ? 0.65 : 1),

    npcSeek() {
      // Sulph circles you, laying hot latex in a ring you have to cross.
      const r = 200;
      const x = clamp(player.x + Math.cos(orbitA) * r, 60, W - 60);
      const y = clamp(player.y + Math.sin(orbitA) * r * 0.8, top + 90, H - 40);
      return { x, y };
    },

    drawGround(g, time) {
      // Sulphur dust over the floor near the vat.
      for (let i = 0; i < 26; i++) {
        const x = VAT.x - 220 + ((i * 97) % 440), y = top + 110 + ((i * 53) % 80);
        g.fillStyle(SULPHUR, 0.12); g.fillCircle(x, y, 6 + (i % 4) * 3);
      }
      // Where the vat will tip.
      if (spillWarnAt >= 0) {
        const k = clamp((time - spillWarnAt) / 1300, 0, 1);
        g.fillStyle(HOT, 0.1 + k * 0.18); g.fillRect(spillX - 44, VAT.y + 40, 88, H - VAT.y - 70);
        g.lineStyle(2, HOT_LIT, 0.4 + k * 0.5); g.strokeRect(spillX - 44, VAT.y + 40, 88, H - VAT.y - 70);
      }
      for (const d of drops) {
        if (time < d.at) continue;
        const age = time - d.at;
        if (age < HOT_MS) {
          const k = age / HOT_MS;
          const c = d.owner === 'p' ? mixC(HOT, TOY_BLUE, 0.25) : d.owner === 'n' ? mixC(HOT, TOY_RED, 0.25) : HOT;
          g.fillStyle(c, 0.75 - k * 0.25); g.fillEllipse(d.x, d.y, 22, 13);
          g.fillStyle(HOT_LIT, 0.6 * (1 - k)); g.fillEllipse(d.x - 3, d.y - 2, 9, 4);
          if (Math.sin(time / 90 + d.x) > 0.8) { g.fillStyle(0xd8d0c0, 0.25); g.fillCircle(d.x, d.y - 8 - (time % 400) / 40, 4); }
        } else {
          const fade = clamp((SET_MS - age) / 800, 0, 1);
          // A nub of cured rubber, glossy black with a blue sheen.
          g.fillStyle(0x000000, 0.3 * fade); g.fillEllipse(d.x, d.y + 4, NUB_R * 2.4, NUB_R);
          g.fillStyle(RUBBER, fade); g.fillEllipse(d.x, d.y - 2, NUB_R * 2.1, NUB_R * 1.5);
          g.fillStyle(RUBBER, fade); g.fillRect(d.x - NUB_R, d.y - 10, NUB_R * 2, 8);
          g.fillStyle(RUBBER_SHEEN, 0.6 * fade); g.fillEllipse(d.x - 3, d.y - 10, NUB_R * 1.1, 4);
        }
      }
    },

    drawAir(g, time) {
      // The vat, glowing harder before it spits.
      const warn = spitWarnAt >= 0 ? clamp((time - spitWarnAt) / 800, 0, 1) : 0;
      glow(g, VAT.x, VAT.y - 30, 70 + warn * 30, HOT, 0.04 + warn * 0.05, 4);
      sulphurVat(g, VAT.x, VAT.y + 30, 30);
      for (let i = 0; i < 4; i++) {
        const ph = (time / 700 + i / 4) % 1;
        g.fillStyle(HOT_LIT, (1 - ph) * (0.6 + warn * 0.4)); g.fillCircle(VAT.x - 22 + i * 15, VAT.y - 22 - ph * (10 + warn * 20), 3 + warn * 3);
        g.fillStyle(0xd8d0c0, 0.15 * (1 - ph)); g.fillCircle(VAT.x - 20 + i * 14 + Math.sin(time / 400 + i) * 8, VAT.y - 40 - ph * 60, 10 + ph * 14);
      }
      if (warn > 0) {
        const a0 = Math.atan2(player.y - VAT.y, player.x - VAT.x);
        for (let i = -2; i <= 2; i++) {
          const a = a0 + i * 0.32;
          g.lineStyle(2, HOT_LIT, 0.15 + warn * 0.4);
          g.lineBetween(VAT.x + Math.cos(a) * 40, VAT.y + 20 + Math.sin(a) * 40, VAT.x + Math.cos(a) * (60 + warn * 110), VAT.y + 20 + Math.sin(a) * (60 + warn * 110));
        }
      }
      for (const b of gobs) {
        const sp = Math.hypot(b.vx, b.vy);
        const a = Math.atan2(b.vy, b.vx);
        g.fillStyle(HOT, 0.35); g.fillEllipse(b.x - Math.cos(a) * 10, b.y - Math.sin(a) * 10, GOB_R * 2.2, GOB_R * 1.4);
        g.fillStyle(b.bounces ? lit(HOT, 0.2 + b.bounces * 0.1) : HOT, 1); g.fillCircle(b.x, b.y, GOB_R + b.bounces);
        g.fillStyle(HOT_LIT, 1); g.fillCircle(b.x - 2, b.y - 2, GOB_R * 0.45);
        if (sp > 300) { g.lineStyle(2, HOT_LIT, 0.5); g.lineBetween(b.x, b.y, b.x - b.vx * 0.06, b.y - b.vy * 0.06); }
      }
      // Shots ringing off the rubber.
      for (const r of rebounds) {
        const k = clamp((time - r.at) / REBOUND_MS, 0, 1);
        g.lineStyle(3 * (1 - k) + 0.5, RUBBER_SHEEN, 1 - k); g.strokeCircle(r.x, r.y, 6 + k * 14);
      }
      // Sticky feet.
      for (const f of [player, npc]) {
        if (!onHot.get(f) || !alive(f)) continue;
        for (let i = 0; i < 3; i++) { g.lineStyle(2, HOT_LIT, 0.6); g.lineBetween(f.x - 10 + i * 10, f.y + 18, f.x - 12 + i * 10, f.y + 6 - Math.sin(time / 80 + i) * 4); }
      }
    },
  };
}

export const VULCANIZE: GimmickDef = {
  id: 'bounce-vulcanize',
  rules: 'You trail hot latex that scalds your foe, then sets into rubber walls. Rubber bounces shots back at their firer; the vat\'s gobs bounce off it faster and burn whoever they hit.',
  make,
};
