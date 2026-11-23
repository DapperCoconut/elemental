import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { GOLD, GOLD_DARK, GOLD_LIT, PARCH, PARCH_DARK, ROBE, SUN, SUN_HOT, WAX } from '../palette';
import { alive, asSlot, clamp, dist, slotOfAbility, type Slot } from '../util';

/**
 * Sworn Oath — Oath-Keeper Vow.
 *
 * Vow is devotion: she believes a promise kept is the only light that does not burn. Each fighter
 * is made to swear an oath, written on a scroll over their head — I will not dash; I will not cast
 * my Q (or my F); I will stand my ground (stay in the ring chalked where you swore); I will not flee
 * my accuser (stay near the other fighter). Keep it for ten seconds and you are absolved: healed,
 * and warded so the next blow lands soft. Break it and a bolt of judgement falls on you.
 *
 * Both of you are sworn, and the oaths are different, so the rule is a game of making the other
 * break theirs: back away from a foe sworn to stand their ground, crowd a foe sworn not to flee,
 * and bait out the Q they swore to keep in its sheath.
 */

type OathKind = 'dash' | 'q' | 'f' | 'ground' | 'near';
const OATHS: Record<OathKind, string> = {
  dash: 'I WILL NOT DASH',
  q: 'I WILL NOT CAST MY Q',
  f: 'I WILL NOT CAST MY F',
  ground: 'I WILL STAND MY GROUND',
  near: 'I WILL NOT FLEE MY ACCUSER',
};
const KINDS = Object.keys(OATHS) as OathKind[];

const KEEP_MS = 10000;
const GROUND_R = 95;
const NEAR_R = 330;
const GRACE_MS = 450;
const BOLT_MS = 520;

interface Oath {
  kind: OathKind; state: 'sworn' | 'bolt' | 'rest';
  at: number; anchor: Pt; strayAt: number;
  wardUntil: number; restUntil: number;
  label: Phaser.GameObjects.Text;
  fx: number; fxKind: 'kept' | 'broken' | '';
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const mk = (f: Fighter): Oath => ({
    kind: 'dash', state: 'rest', at: 0, anchor: { x: f.x, y: f.y }, strayAt: 0, wardUntil: 0, restUntil: ctx.scene.time.now + 1500,
    label: ctx.scene.add.text(f.x, f.y - 80, '', {
      fontFamily: '"Times New Roman", Georgia, serif', fontSize: '12px', color: '#2a1a10', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(41),
    fx: -9999, fxKind: '',
  });
  const oaths = new Map<Fighter, Oath>([[player, mk(player)], [npc, mk(npc)]]);
  const other = (f: Fighter) => (f === player ? npc : player);

  function swear(f: Fighter, time: number): void {
    const o = oaths.get(f);
    const theirs = oaths.get(other(f));
    if (!o) return;
    const pool = KINDS.filter((k) => k !== o.kind && !(theirs && theirs.state === 'sworn' && theirs.kind === k));
    o.kind = pool[Math.floor(rng() * pool.length)] ?? 'dash';
    o.state = 'sworn';
    o.at = time;
    o.anchor = { x: f.x, y: f.y };
    o.strayAt = 0;
    o.label.setText(OATHS[o.kind]);
    ctx.sfx('holy-chord');
  }

  function broken(f: Fighter, time: number): void {
    const o = oaths.get(f);
    if (!o || o.state !== 'sworn') return;
    o.state = 'bolt';
    o.at = time;
    o.anchor = { x: f.x, y: f.y };
    o.fx = time; o.fxKind = 'broken';
    o.label.setText('— OATH BROKEN —');
    ctx.float(f.x, f.y - 54, 'OATH BROKEN', '#ff9a8a');
    ctx.sfx('curse-cast');
  }

  function cast(f: Fighter, slot: Slot | null): void {
    const o = oaths.get(f);
    if (!o || o.state !== 'sworn') return;
    if ((o.kind === 'q' && slot === 'q') || (o.kind === 'f' && slot === 'f')) broken(f, ctx.scene.time.now);
  }

  return {
    update(time) {
      for (const [f, o] of oaths) {
        o.label.setPosition(f.x, f.y - 86);
        o.label.setVisible(alive(f) && (o.state !== 'rest'));
        if (!alive(f)) continue;
        if (o.state === 'rest') { if (time >= o.restUntil) swear(f, time); continue; }
        if (o.state === 'bolt') {
          if (time - o.at >= BOLT_MS) {
            // The bolt lands where the oath was broken — and follows the oath-breaker, not the floor.
            ctx.hit(f, ctx.hard ? 18 : 14, f.x, f.y);
            ctx.flash(f.x, f.y, GOLD_LIT);
            ctx.sfx('judgement');
            o.state = 'rest';
            o.restUntil = time + 2400;
          }
          continue;
        }
        // Sworn: test the oath.
        let stray = false;
        if (o.kind === 'dash' && ctx.dashing(f)) { broken(f, time); continue; }
        if (o.kind === 'ground') stray = dist(f.x, f.y, o.anchor.x, o.anchor.y) > GROUND_R;
        if (o.kind === 'near') stray = alive(other(f)) && dist(f.x, f.y, other(f).x, other(f).y) > NEAR_R;
        if (stray) { if (!o.strayAt) o.strayAt = time; else if (time - o.strayAt > GRACE_MS) { broken(f, time); continue; } }
        else o.strayAt = 0;
        if (time - o.at >= KEEP_MS) {
          o.state = 'rest';
          o.restUntil = time + 1800;
          o.wardUntil = time + 6000;
          o.fx = time; o.fxKind = 'kept';
          ctx.heal(f, ctx.hard ? 10 : 12);
          ctx.float(f.x, f.y - 54, 'ABSOLVED', '#fff0a8');
          ctx.sfx('heal');
          o.label.setText('');
        }
      }
    },

    onPlayerCast(_id, slot) { cast(player, asSlot(slot)); },
    onNpcCast(id) { cast(npc, slotOfAbility(npc, id)); },
    onPlayerHurt() { const o = oaths.get(player); if (o && o.wardUntil > ctx.scene.time.now) o.wardUntil = 0; },
    onNpcHurt() { const o = oaths.get(npc); if (o && o.wardUntil > ctx.scene.time.now) o.wardUntil = 0; },
    playerTakenMult: () => ((oaths.get(player)?.wardUntil ?? 0) > ctx.scene.time.now ? 0.45 : 1),
    npcTakenMult: () => ((oaths.get(npc)?.wardUntil ?? 0) > ctx.scene.time.now ? 0.45 : 1),

    npcSeek() {
      const o = oaths.get(npc);
      if (o?.state === 'sworn' && o.kind === 'ground') return o.anchor;
      if (o?.state === 'sworn' && o.kind === 'near') {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 200, 60, W - 60), y: clamp(player.y + Math.sin(a) * 180, top + 60, H - 40) };
      }
      // Work on your oath: crowd a player sworn to their ground from outside it, flee one sworn to stay near.
      const p = oaths.get(player);
      if (p?.state === 'sworn' && p.kind === 'near') {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 420, 60, W - 60), y: clamp(player.y + Math.sin(a) * 360, top + 60, H - 40) };
      }
      if (p?.state === 'sworn' && p.kind === 'ground') {
        const a = Math.atan2(npc.y - p.anchor.y, npc.x - p.anchor.x);
        return { x: clamp(p.anchor.x + Math.cos(a) * 260, 60, W - 60), y: clamp(p.anchor.y + Math.sin(a) * 220, top + 60, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const [f, o] of oaths) {
        if (!alive(f)) continue;
        if (o.state === 'sworn' && o.kind === 'ground') {
          const k = clamp((time - o.at) / KEEP_MS, 0, 1);
          g.fillStyle(SUN, 0.08); g.fillCircle(o.anchor.x, o.anchor.y, GROUND_R);
          g.lineStyle(2, f === player ? GOLD : ROBE, 0.7); g.strokeCircle(o.anchor.x, o.anchor.y, GROUND_R);
          // Chalk ticks round the rim, filling as the oath holds.
          for (let i = 0; i < 24; i++) {
            if (i / 24 > k) break;
            const a = -Math.PI / 2 + (i / 24) * Math.PI * 2;
            g.lineStyle(2, GOLD_LIT, 0.9);
            g.lineBetween(o.anchor.x + Math.cos(a) * (GROUND_R - 6), o.anchor.y + Math.sin(a) * (GROUND_R - 6), o.anchor.x + Math.cos(a) * (GROUND_R + 4), o.anchor.y + Math.sin(a) * (GROUND_R + 4));
          }
        }
        if (o.state === 'sworn' && o.kind === 'near' && alive(other(f))) {
          const d = dist(f.x, f.y, other(f).x, other(f).y);
          const tight = clamp(d / NEAR_R, 0, 1.4);
          g.lineStyle(2, tight > 1 ? WAX : GOLD, 0.25 + tight * 0.4);
          g.lineBetween(f.x, f.y, other(f).x, other(f).y);
        }
        if (o.state === 'bolt') {
          const k = clamp((time - o.at) / BOLT_MS, 0, 1);
          g.lineStyle(3, GOLD_LIT, 0.4 + k * 0.6); g.strokeCircle(f.x, f.y, 50 - k * 30);
          g.fillStyle(SUN_HOT, 0.1 + k * 0.25); g.fillCircle(f.x, f.y, 50 - k * 30);
        }
      }
    },

    drawAir(g, time) {
      for (const [f, o] of oaths) {
        if (!alive(f)) continue;
        // The scroll the oath is written on, and a ring of wax seals counting down to absolution.
        if (o.state === 'sworn' || o.state === 'bolt') {
          const x = f.x, y = f.y - 86;
          const w = Math.max(120, (o.label.width || 130) + 22);
          g.fillStyle(PARCH_DARK, 1); g.fillRoundedRect(x - w / 2 - 2, y - 11, w + 4, 22, 4);
          g.fillStyle(PARCH, 1); g.fillRect(x - w / 2, y - 9, w, 18);
          for (const k of [-1, 1]) { g.fillStyle(GOLD_DARK, 1); g.fillCircle(x + k * (w / 2 + 2), y, 6); g.fillStyle(GOLD, 1); g.fillCircle(x + k * (w / 2 + 2), y - 1, 4.5); }
          if (o.state === 'sworn') {
            const k = clamp((time - o.at) / KEEP_MS, 0, 1);
            g.fillStyle(GOLD, 0.9); g.fillRect(x - w / 2, y + 10, w * k, 3);
            if (o.strayAt) { g.lineStyle(2, WAX, 0.6 + Math.sin(time / 40) * 0.4); g.strokeRect(x - w / 2 - 3, y - 12, w + 6, 24); }
          }
        }
        if (o.state === 'bolt') {
          // The bolt of judgement: a gold column falling out of the glare.
          const k = clamp((time - o.at) / BOLT_MS, 0, 1);
          const yTop = f.y - 400 + k * 380;
          g.lineStyle(10 * k, SUN_HOT, 0.3 * k); g.lineBetween(f.x, top, f.x, yTop);
          g.lineStyle(3, GOLD_LIT, 0.4 + k * 0.6); g.lineBetween(f.x, top, f.x, yTop);
        }
        const fk = clamp((time - o.fx) / 700, 0, 1);
        if (fk < 1 && o.fxKind === 'kept') {
          glow(g, f.x, f.y - 10, 40 + fk * 30, GOLD_LIT, 0.1 * (1 - fk), 3);
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(SUN, 1 - fk); g.fillCircle(f.x + Math.cos(a) * (20 + fk * 40), f.y - 10 + Math.sin(a) * (20 + fk * 40), 2.5); }
        }
        // A ward from a kept oath: a thin gold halo until the next blow.
        if (o.wardUntil > time) { g.lineStyle(2, GOLD_LIT, 0.5 + Math.sin(time / 120) * 0.2); g.strokeEllipse(f.x, f.y - 46, 26, 8); }
      }
    },

    destroy() { for (const o of oaths.values()) o.label.destroy(); },
  };
}

export const SWORN_OATH: GimmickDef = {
  id: 'tribunal-sworn-oath',
  rules: 'Each fighter swears an oath over their head — no dash, no Q or F, stand your ground, stay near. Keep it 10s to be healed and warded; break it and judgement strikes.',
  make,
};
