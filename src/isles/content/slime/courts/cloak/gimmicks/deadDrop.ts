import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { dropBox, letter, nail } from '../art';
import { LAMP, PAPER, WAX, WAX_LIT } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Dead Drop — Courier Cipher.
 *
 * A sealed letter flutters down onto the floor. Whoever walks over it picks it up — and carries
 * a denunciation. Three iron drop-boxes stand round the room; one has its lamp lit. Post the
 * letter in the lit box and it is *read*: a storm of nailed pages falls on the carrier's foe,
 * hurting them and pinning them to the spot. Then another box lights and another letter falls.
 *
 * But a carrier is slowed by the bundle and marked by the seal (blows land harder on them), and
 * a carrier who is struck hard enough drops the letter where they stand — for anyone. Cipher is
 * a courier: fast to the letter, straight to the box. Get between him and the lamp.
 */

const PICK_R = 34;
const POST_R = 42;
const DROP_AFTER = 18;
const READ_DMG = 20;

interface Letter { x: number; y: number; landAt: number; carrier: Fighter | null; hurt: number; noPick: Fighter | null; noPickUntil: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const boxes: Pt[] = [{ x: 74, y: top + 150 }, { x: W - 74, y: top + 150 }, { x: W / 2, y: H - 46 }];
  let live = Math.floor(rng() * 3);
  let note: Letter | null = null;
  let nextLetter = 0;
  let started = false;
  const reads: { x: number; y: number; at: number }[] = [];

  function spawnLetter(time: number): void {
    // Somewhere away from both fighters, not on a box.
    let best: Pt = { x: W / 2, y: (top + H) / 2 };
    let bs = -1;
    for (let i = 0; i < 12; i++) {
      const p = { x: 120 + rng() * (W - 240), y: top + 90 + rng() * (H - top - 170) };
      const s = Math.min(dist(p.x, p.y, player.x, player.y), dist(p.x, p.y, npc.x, npc.y), ...boxes.map((b) => dist(p.x, p.y, b.x, b.y) + 60));
      if (s > bs) { bs = s; best = p; }
    }
    note = { x: best.x, y: best.y, landAt: time + 700, carrier: null, hurt: 0, noPick: null, noPickUntil: 0 };
    ctx.float(best.x, best.y - 40, 'A LETTER', '#f4ead8');
    ctx.sfx('whoosh');
  }

  function drop(time: number): void {
    if (!note || !note.carrier) return;
    const f = note.carrier;
    note.noPick = f;
    note.noPickUntil = time + 900;
    note.x = clamp(f.x, 60, W - 60); note.y = clamp(f.y + 10, top + 50, H - 40);
    note.carrier = null;
    note.hurt = 0;
    note.landAt = time;
    ctx.float(f.x, f.y - 50, 'DROPPED IT', '#f4ead8');
    ctx.sfx('hit-light');
  }

  function post(time: number): void {
    if (!note || !note.carrier) return;
    const f = note.carrier;
    const foe = f === player ? npc : player;
    note = null;
    nextLetter = time + 2600;
    const b = boxes[live];
    live = (live + 1 + Math.floor(rng() * 2)) % 3;
    ctx.flash(b.x, b.y - 30, LAMP);
    ctx.sfx('stone-slam');
    if (alive(foe)) {
      reads.push({ x: foe.x, y: foe.y, at: time });
      ctx.banner(f === player ? 'DENOUNCED — THE LETTER IS READ' : 'YOU ARE DENOUNCED', '#ffd0d6');
      tkHit(foe, READ_DMG);
      ctx.root(foe, 900);
    }
  }

  /** The reading hurts whoever is named — scaled like the foe's own blows when it is you. */
  function tkHit(f: Fighter, amount: number): void {
    if (f === player) ctx.tk.hitPlayer(amount, f.x, f.y);
    else ctx.hit(f, ctx.hard ? amount + 4 : amount, f.x, f.y);
  }

  const carrying = (f: Fighter) => !!note && note.carrier === f;

  return {
    update(time) {
      if (!started) { started = true; nextLetter = time + 1200; }
      if (!note && time >= nextLetter) spawnLetter(time);
      if (!note) return;
      if (!note.carrier) {
        if (time < note.landAt) return;
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          if (f === note.noPick && time < note.noPickUntil) continue;
          if (dist(f.x, f.y, note.x, note.y) < PICK_R) {
            note.carrier = f;
            note.hurt = 0;
            ctx.float(f.x, f.y - 50, f === player ? 'YOU CARRY THE LETTER' : 'CIPHER HAS IT', '#ffd0d6');
            ctx.sfx('status-debuff');
            break;
          }
        }
      } else {
        const f = note.carrier;
        if (!alive(f)) { drop(time); return; }
        const b = boxes[live];
        if (dist(f.x, f.y, b.x, b.y + 4) < POST_R) post(time);
      }
    },

    onPlayerHurt(amount) { if (note && note.carrier === player) { note.hurt += amount; if (note.hurt >= DROP_AFTER) drop(ctx.scene.time.now); } },
    onNpcHurt(amount) { if (note && note.carrier === npc) { note.hurt += amount; if (note.hurt >= DROP_AFTER) drop(ctx.scene.time.now); } },

    playerSpeedMult() { return carrying(player) ? 0.78 : 1; },
    npcSpeedMult() { return carrying(npc) ? 0.78 : 1; },
    playerTakenMult() { return carrying(player) ? 1.25 : 1; },
    npcTakenMult() { return carrying(npc) ? 1.25 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      const b = boxes[live];
      if (note && note.carrier === npc) return { x: b.x, y: b.y + 8 };
      if (note && note.carrier === player) {
        // Get between the player and the lit box.
        return { x: player.x + (b.x - player.x) * 0.45, y: player.y + (b.y - player.y) * 0.45 };
      }
      if (note) return { x: note.x, y: note.y };
      return { x: clamp(player.x + 160, 60, W - 60), y: clamp(player.y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      boxes.forEach((b, i) => {
        if (i === live) {
          glow(g, b.x, b.y, 50, LAMP, 0.04, 3);
          g.lineStyle(2, LAMP, 0.35 + Math.sin(time / 200) * 0.15); g.strokeCircle(b.x, b.y + 4, POST_R);
        }
      });
      // A faint trail of wax drops from the carrier toward the lit box.
      if (note && note.carrier) {
        const f = note.carrier, b = boxes[live];
        for (let k = 1; k < 8; k++) {
          const t = k / 8 + ((time / 900) % (1 / 8));
          if (t >= 1) continue;
          g.fillStyle(WAX, 0.35 * (1 - t)); g.fillCircle(f.x + (b.x - f.x) * t, f.y + (b.y - f.y) * t, 2.5);
        }
      }
      // Reading: pages nailed down round the denounced, spiralling in.
      for (let i = reads.length - 1; i >= 0; i--) {
        const r = reads[i];
        const k = (time - r.at) / 900;
        if (k > 1.6) { reads.splice(i, 1); continue; }
        for (let j = 0; j < 10; j++) {
          const a = (j / 10) * Math.PI * 2 + k * 2;
          const d = 70 * Math.max(0, 1 - k) + 22;
          const x = r.x + Math.cos(a) * d, y = r.y + Math.sin(a) * d * 0.6;
          letter(g, x, y, 0.9, a + k * 4, k < 1, clamp(1.6 - k, 0, 1));
          if (k >= 1) nail(g, x, y - 3, 1);
        }
      }
    },

    drawAir(g, time) {
      boxes.forEach((b, i) => dropBox(g, b.x, b.y, 0.9, i === live));
      if (!note) return;
      if (!note.carrier) {
        const falling = time < note.landAt;
        const k = falling ? 1 - (note.landAt - time) / 700 : 1;
        const y = note.y - (1 - k) * 160;
        const rot = falling ? Math.sin(time / 90) * 0.9 : Math.sin(time / 400) * 0.08;
        if (!falling) { glow(g, note.x, note.y, 22, PAPER, 0.05, 3); g.fillStyle(0x000000, 0.25); g.fillEllipse(note.x, note.y + 6, 26, 7); }
        letter(g, note.x + (falling ? Math.sin(time / 140) * 14 : 0), y - (falling ? 0 : 4 + Math.sin(time / 300) * 2), 1.4, rot);
      } else {
        // Held overhead, and the carrier's seal-mark ringed round their feet.
        const f = note.carrier;
        letter(g, f.x + 8, f.y - 66 + Math.sin(time / 200) * 2, 1.2, 0.2);
        g.lineStyle(2, WAX_LIT, 0.6); g.strokeEllipse(f.x, f.y + 2, 46, 16);
        g.fillStyle(WAX, 0.9); g.fillCircle(f.x - 18, f.y - 2, 4); g.fillStyle(WAX_LIT, 0.7); g.fillCircle(f.x - 19, f.y - 3, 1.5);
        // How hard it has been knocked: the letter's grip, as a little bar.
        const k = clamp(note.hurt / DROP_AFTER, 0, 1);
        if (k > 0) { g.fillStyle(0x000000, 0.5); g.fillRect(f.x - 16, f.y - 78, 32, 4); g.fillStyle(WAX_LIT, 1); g.fillRect(f.x - 16, f.y - 78, 32 * k, 4); }
      }
    },
  };
}

export const DEAD_DROP: GimmickDef = {
  id: 'cloak-dead-drop',
  rules: 'A sealed letter falls. Carry it to the lit drop-box and it is read: your foe is hurt and pinned. Carriers are slowed, take more damage and drop it when struck.',
  make,
};
