import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { feather, heartJar } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, CREPE, FOE, GOLD, GOLD_LIT, IRON, MINE, SOUL_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Weighing of Hearts — Psychopomp Feather.
 *
 * The great feather-scale hangs over the gorge, one pan for each of you, a heart in a jar on each.
 * Every blow you land makes your heart heavier (it is the weight of what you have done). Every
 * twelve seconds the scale tips: the heavier heart is judged — a jaw of light opens in the floor
 * under that fighter and snaps shut a beat later — and the lighter heart is eased, healed by how
 * much lighter it was. Then the pans are emptied.
 *
 * So the fight has a rhythm: spend your blows just after a weighing, go gentle before one, dodge the
 * jaw when it is yours. And Feather sheds: a long white feather drifts down through the arena.
 * Strike it and it is blown onto your foe's pan — the weight of truth, added to their side.
 */

const JAW_R = 72;
const JAW_WARN = 1050;
const FEATHER_WEIGHT = 24;

interface Jaw { f: Fighter; x: number; y: number; at: number; dealt: boolean }
interface Plume { x: number; y: number; vx: number; bornAt: number; target: StrikeTarget | null; blownTo: Fighter | null; blownAt: number; fromX: number; fromY: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const every = ctx.hard ? 10000 : 12000;
  const TIP_WARN = 2200;
  const heart = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const jaws: Jaw[] = [];
  let plume: Plume | null = null;
  let nextPlume = 0;
  let nextTip = 0;
  let warned = false;
  let started = false;
  let tilt = 0;
  let selfHit = false;
  let verdictFx: { at: number; text: string } | null = null;

  const other = (f: Fighter) => (f === player ? npc : player);

  function dropPlume(time: number): void {
    const p: Plume = { x: 120 + rng() * (W - 240), y: top + 10, vx: (rng() - 0.5) * 30, bornAt: time, target: null, blownTo: null, blownAt: 0, fromX: 0, fromY: 0 };
    p.target = ctx.target({
      x: p.x, y: p.y, r: 22,
      onStruck: (by) => {
        if (p.blownTo) return;
        const to = by === 'player' ? npc : player;
        p.blownTo = to;
        p.blownAt = ctx.scene.time.now;
        p.fromX = p.x; p.fromY = p.y;
        p.target?.remove();
        heart.set(to, (heart.get(to) ?? 0) + FEATHER_WEIGHT);
        ctx.float(p.x, p.y - 20, by === 'player' ? 'ONTO HIS PAN' : 'ONTO YOUR PAN', by === 'player' ? '#ffe2a0' : '#d8c8ff');
        ctx.sfx('wings');
      },
    });
    plume = p;
  }

  function tip(time: number): void {
    const hp = heart.get(player) ?? 0, hn = heart.get(npc) ?? 0;
    const diff = Math.abs(hp - hn);
    ctx.sfx('judgement');
    if (diff < 8) {
      verdictFx = { at: time, text: 'BALANCED' };
      for (const f of [player, npc]) if (alive(f)) ctx.heal(f, 6);
    } else {
      const heavy = hp > hn ? player : npc;
      const light = other(heavy);
      verdictFx = { at: time, text: heavy === player ? 'YOUR HEART IS HEAVY' : 'HIS HEART IS HEAVY' };
      if (alive(heavy)) jaws.push({ f: heavy, x: heavy.x, y: heavy.y, at: time + JAW_WARN, dealt: false });
      if (alive(light)) ctx.heal(light, Math.round(Math.min(ctx.hard ? 18 : 22, 8 + diff * 0.25)));
    }
    ctx.banner(verdictFx.text, heavyCss(hp, hn, diff));
    heart.set(player, 0);
    heart.set(npc, 0);
  }

  const heavyCss = (hp: number, hn: number, diff: number) => (diff < 8 ? '#fff2c0' : hp > hn ? '#ffb0a0' : '#ffe2a0');

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextTip = time + every; nextPlume = time + 3000; }

      if (!warned && time >= nextTip - TIP_WARN) {
        warned = true;
        ctx.banner('THE SCALE BEGINS TO TIP', '#fff2c0');
        ctx.sfx('holy-chord');
      }
      if (time >= nextTip) { warned = false; nextTip = time + every; tip(time); }

      const want = clamp(((heart.get(player) ?? 0) - (heart.get(npc) ?? 0)) / 60, -1, 1) * 0.32;
      tilt += (want - tilt) * Math.min(1, dt * 3);

      // The jaws of light.
      for (const j of jaws) {
        if (j.dealt || time < j.at) continue;
        j.dealt = true;
        ctx.sfx('crystal-shatter');
        if (alive(j.f) && dist(j.f.x, j.f.y, j.x, j.y) < JAW_R) {
          selfHit = true;
          ctx.hit(j.f, ctx.hard ? 20 : 16, j.f.x, j.f.y);
          selfHit = false;
          ctx.float(j.f.x, j.f.y - 50, 'JUDGED', '#fff2c0');
        }
      }
      for (let i = jaws.length - 1; i >= 0; i--) if (jaws[i].dealt && time > jaws[i].at + 500) jaws.splice(i, 1);

      // The feather.
      if (!plume && time >= nextPlume) dropPlume(time);
      if (plume) {
        const p = plume;
        if (p.blownTo) {
          if (time - p.blownAt > 700) { plume = null; nextPlume = time + 4500; }
        } else {
          p.y += 26 * dt;
          p.x += (p.vx + Math.sin(time / 600) * 40) * dt;
          p.x = clamp(p.x, 40, W - 40);
          p.target?.moveTo(p.x, p.y);
          if (p.y > H - 30 || time - p.bornAt > 16000) { p.target?.remove(); plume = null; nextPlume = time + 2500; }
        }
      }
    },

    onNpcHurt(amount) { if (!selfHit) heart.set(player, (heart.get(player) ?? 0) + amount); },
    onPlayerHurt(amount) { if (!selfHit) heart.set(npc, (heart.get(npc) ?? 0) + amount); },

    npcSeek() {
      const time = ctx.scene.time.now;
      // A jaw opening under him: out of it.
      const j = jaws.find((jj) => !jj.dealt && jj.f === npc);
      if (j) {
        const a = Math.atan2(npc.y - j.y, npc.x - j.x) || 0.5;
        return { x: clamp(j.x + Math.cos(a) * (JAW_R + 70), 60, W - 60), y: clamp(j.y + Math.sin(a) * (JAW_R + 70), top + 50, H - 40) };
      }
      // The feather drifting near: go and strike it onto your pan.
      if (plume && !plume.blownTo && dist(npc.x, npc.y, plume.x, plume.y) < 320) return { x: plume.x, y: clamp(plume.y + 30, top + 50, H - 40) };
      // Heavy before a weighing: keep moving, out of reach.
      const heavy = (heart.get(npc) ?? 0) > (heart.get(player) ?? 0) + 8 && nextTip - time < 3000;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + (heavy ? 0.9 : 0);
      const r = heavy ? 320 : 210;
      return { x: clamp(player.x + Math.cos(a) * r, 60, W - 60), y: clamp(player.y + Math.sin(a) * r, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const j of jaws) {
        const k = clamp(1 - (j.at - time) / JAW_WARN, 0, 1);
        if (j.dealt) {
          const f = clamp((time - j.at) / 500, 0, 1);
          g.fillStyle(0xffffff, 0.5 * (1 - f)); g.fillCircle(j.x, j.y, JAW_R);
          continue;
        }
        // The jaw: a ring of light teeth rising out of the floor, leaning in as it closes.
        g.fillStyle(GOLD, 0.1 + k * 0.15); g.fillCircle(j.x, j.y, JAW_R);
        g.lineStyle(2, GOLD_LIT, 0.5 + k * 0.4); g.strokeCircle(j.x, j.y, JAW_R);
        const n = 16;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const bx = j.x + Math.cos(a) * JAW_R, by = j.y + Math.sin(a) * JAW_R * 0.9;
          const len = 10 + k * 26;
          const lean = a + Math.PI;
          const tx = bx + Math.cos(lean) * len * 0.5, ty = by + Math.sin(lean) * len * 0.5 - len * 0.6;
          g.fillStyle(i % 2 ? GOLD_LIT : 0xffffff, 0.55 + k * 0.4);
          g.fillTriangle(bx - Math.sin(a) * 5, by + Math.cos(a) * 5, bx + Math.sin(a) * 5, by - Math.cos(a) * 5, tx, ty);
        }
      }
    },

    drawAir(g, time) {
      if (!plume) return;
      const p = plume;
      if (p.blownTo) {
        const k = clamp((time - p.blownAt) / 700, 0, 1);
        const tx = p.blownTo === player ? W / 2 - 80 : W / 2 + 80, ty = top + 40;
        const x = p.fromX + (tx - p.fromX) * k, y = p.fromY + (ty - p.fromY) * k - Math.sin(k * Math.PI) * 80;
        feather(g, x - 20, y, 44, -0.4 + k * 6, CREPE, 1 - k * 0.5);
        return;
      }
      glow(g, p.x, p.y, 34, SOUL_LIT, 0.06, 2);
      feather(g, p.x - 22, p.y + Math.sin(time / 300) * 6, 46, -0.35 + Math.sin(time / 500) * 0.3, CREPE, 1);
      g.lineStyle(1, GOLD, 0.35 + Math.sin(time / 200) * 0.2); g.strokeCircle(p.x, p.y, 26);
    },

    drawHud(g, time) {
      // The scale, hanging just below the HUD: your pan left (gold), his right (violet).
      const cx = W / 2, by = top + 8, L = 120;
      const ex = Math.cos(tilt) * L, ey = Math.sin(tilt) * L;
      g.fillStyle(0x000000, 0.25); g.fillRoundedRect(cx - L - 50, by - 6, (L + 50) * 2, 70, 10);
      g.fillStyle(BRASS_DARK, 1); g.fillRect(cx - 4, by - 6, 8, 16);
      g.lineStyle(6, BRASS_DARK, 1); g.lineBetween(cx - ex, by - ey + 8, cx + ex, by + ey + 8);
      g.lineStyle(3, BRASS, 1); g.lineBetween(cx - ex, by - ey + 7, cx + ex, by + ey + 7);
      g.fillStyle(GOLD, 1); g.fillCircle(cx, by + 8, 6);
      // The tip clock round the pivot.
      const left = clamp((nextTip - time) / every, 0, 1);
      g.lineStyle(2, left < TIP_WARN / every ? 0xffb0a0 : BRASS_LIT, 0.9);
      g.beginPath(); g.arc(cx, by + 8, 11, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      for (const [f, k, col] of [[player, -1, MINE], [npc, 1, FOE]] as [Fighter, number, number][]) {
        const px = cx + k * ex, py = by + 8 + k * ey;
        const panY = py + 34;
        g.lineStyle(1, IRON, 1); g.lineBetween(px, py, px - 14, panY); g.lineBetween(px, py, px + 14, panY);
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(px, panY + 1, 36, 9);
        g.fillStyle(BRASS, 1); g.fillEllipse(px, panY, 34, 7);
        const w = heart.get(f) ?? 0;
        heartJar(g, px, panY - 1, 0.85, lit(col, 0.1), clamp(w / 60, 0, 1));
        g.lineStyle(2, col, 0.8); g.strokeEllipse(px, panY, 38, 10);
      }
      if (verdictFx && time - verdictFx.at < 900) {
        const k = (time - verdictFx.at) / 900;
        g.lineStyle(3 * (1 - k), GOLD_LIT, 1 - k); g.strokeCircle(cx, by + 8, 20 + k * 60);
      }
    },

    destroy() { plume?.target?.remove(); },
  };
}

export const WEIGHING: GimmickDef = {
  id: 'lantern-weighing',
  rules: 'Your heart grows heavier with every blow you land. When the scale tips, the heavier heart is judged by a jaw of light; the lighter is healed.',
  make,
};
