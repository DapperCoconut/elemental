import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { glow } from '../../../../../art/IsleArt';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { chainRun, riteRune } from '../art';
import { B, VEN, VEN_CSS, VEN_DARK, VEN_DEEP, VEN_LIT, VEN_LIT_CSS, VIOLET_CSS, type Who, WHO, alive, clamp, other } from '../palette';

/**
 * Seat of Surety — the Decree of the Binding Rite.
 *
 * The Mark was never a bite. It was a rite: a covenant the bitten were bound into, link by link, by
 * the god that answers chains. Six runes are inlaid round the middle of the floor and the god names
 * them one at a time — the lit rune. STRIKE the lit rune and you forge a link; forge three and the
 * god binds your foe where they stand (stunned, and +50% taken while the chains hold). But a rune
 * struck out of turn breaks one of your links — so spray carelessly near the circle and you unbind
 * yourself. If nobody answers, the god names another.
 *
 * The councilor's chain drags you away from the lit rune and his revenants run you down while you
 * reach for it. A clever player makes him spray into the wrong runes.
 */

const ID = `${B.id}-rite`;

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top } = ctx;
  const CX = W / 2, CY = (top + H) / 2 + 4;
  const RX = 290, RY = 200;
  const NEED = 3;
  const RELIGHT = ctx.hard ? 700 : 900;
  const PATIENCE = 7000;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const runeAt = (i: number): Pt => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 6;
    return { x: CX + Math.cos(a) * RX, y: CY + Math.sin(a) * RY };
  };

  let lit = -1;
  let litAt = 0;
  let relightAt = 0;
  let prevLit = -1;
  const links: Record<Who, number> = { player: 0, npc: 0 };
  const lastGood: Record<Who, number> = { player: 0, npc: 0 };
  const boundUntil: Record<Who, number> = { player: 0, npc: 0 };
  let bindAt = -9999;
  let bindWho: Who = 'npc';
  const lock: Record<Who, number>[] = Array.from({ length: 6 }, () => ({ player: 0, npc: 0 }));
  const flare: number[] = new Array(6).fill(-9999);
  const broke: number[] = new Array(6).fill(-9999);

  const relight = (time: number) => {
    let i = Math.floor(ctx.rng() * 6);
    if (i === prevLit || i === lit) i = (i + 1 + Math.floor(ctx.rng() * 4)) % 6;
    lit = i; litAt = time; prevLit = i;
    ctx.sfx('crystal-chime');
  };

  const bind = (w: Who, time: number) => {
    const f = fighter(w);
    bindAt = time; bindWho = w;
    boundUntil[w] = time + 4000;
    ctx.stun(f, w === 'player' ? 1400 : 1800);
    links.player = 0; links.npc = 0;
    ctx.sfx('chain'); ctx.sfx('curse-cast');
    ctx.banner(w === 'npc' ? 'THE GOD BINDS THE COUNCILOR' : 'THE GOD BINDS YOU', w === 'npc' ? VEN_CSS : VIOLET_CSS);
  };

  const runes = [0, 1, 2, 3, 4, 5].map((i) => {
    const p = runeAt(i);
    return ctx.target({
      x: p.x, y: p.y, r: 30, passThrough: true,
      onStruck(by) {
        const now = ctx.scene.time.now;
        if (now < lock[i][by]) return;
        lock[i][by] = now + 900;
        if (i === lit) {
          links[by] = Math.min(NEED, links[by] + 1);
          lastGood[by] = now;
          flare[i] = now;
          lit = -1; relightAt = now + RELIGHT;
          ctx.sfx('chain');
          ctx.float(p.x, p.y - 40, `LINK ${links[by]} OF ${NEED}`, by === 'player' ? VEN_LIT_CSS : VIOLET_CSS);
          if (links[by] >= NEED) bind(other(by), now);
        } else if (lit >= 0 && now - lastGood[by] > 250 && links[by] > 0) {
          links[by]--;
          broke[i] = now;
          ctx.sfx('clang');
          ctx.float(p.x, p.y - 40, 'OUT OF TURN', by === 'player' ? '#c9b0ff' : VEN_LIT_CSS);
        }
      },
    });
  });

  return {
    update(time) {
      if (relightAt === 0) { relightAt = time + 2200; ctx.banner('STRIKE THE RUNE THE GOD NAMES — THREE LINKS BIND YOUR FOE', VEN_CSS); }
      if (lit < 0 && time >= relightAt) relight(time);
      if (lit >= 0 && time - litAt > PATIENCE) { const was = lit; lit = -1; relightAt = time + 300; prevLit = was; }
    },
    playerTakenMult() { return ctx.scene.time.now < boundUntil.player ? 1.5 : 1; },
    npcTakenMult() { return ctx.scene.time.now < boundUntil.npc ? 1.5 : 1; },
    npcSeek() {
      if (lit < 0) return null;
      const p = runeAt(lit);
      // Stand just inside the circle from the rune: close enough that a cast strikes it.
      return { x: p.x + (CX - p.x) * 0.12, y: p.y + (CY - p.y) * 0.12 };
    },
    drawGround(g, time) {
      const t = time / 1000;
      // The rite circle: two inlaid rings, the hexagram between the runes, a sigil of the Mark at its heart.
      g.lineStyle(10, OBS.glass, 1); g.strokeEllipse(CX, CY, RX * 2, RY * 2);
      g.lineStyle(2, VEN_DEEP, 0.9); g.strokeEllipse(CX, CY, RX * 2 + 8, RY * 2 + 8);
      g.lineStyle(1.2, VEN, 0.45); g.strokeEllipse(CX, CY, RX * 2 - 8, RY * 2 - 8);
      for (let i = 0; i < 6; i++) {
        const a = runeAt(i), b = runeAt((i + 2) % 6);
        g.lineStyle(1.4, VEN_DARK, 0.9); g.lineBetween(a.x, a.y, b.x, b.y);
      }
      for (let i = 0; i < 48; i++) {
        const an = (i / 48) * Math.PI * 2 + t * 0.05;
        const x = CX + Math.cos(an) * (RX + 22), y = CY + Math.sin(an) * (RY + 22);
        g.fillStyle(VEN_DEEP, 0.6); g.fillRect(x - 2, y - 1, i % 4 ? 3 : 6, 2);
      }
      g.lineStyle(2, VEN_DEEP, 0.7); g.strokeCircle(CX, CY, 36);
      for (const s of [-1, 1]) { g.fillStyle(VEN, 0.5); g.fillEllipse(CX + s * 10, CY + 4, 6, 11); }
      // Chords flare from the lit rune to the centre.
      if (lit >= 0) {
        const p = runeAt(lit);
        seam(g, [{ x: CX, y: CY }, { x: (CX + p.x) / 2, y: (CY + p.y) / 2 + 6 }, p], 2, 0.7, 0.5 + 0.5 * Math.sin(t * 6), VEN);
      }
      for (let i = 0; i < 6; i++) {
        const p = runeAt(i);
        const heat = i === lit ? 0.75 + 0.25 * Math.sin(t * 7) : clamp(1 - (time - flare[i]) / 600, 0, 1);
        riteRune(g, p.x, p.y, 28, i, heat);
        const bk = clamp(1 - (time - broke[i]) / 500, 0, 1);
        if (bk > 0) { g.lineStyle(3, OBS.seamLit, bk); g.lineBetween(p.x - 24, p.y - 24, p.x + 24, p.y + 24); g.lineBetween(p.x + 24, p.y - 24, p.x - 24, p.y + 24); }
        if (i === lit) {
          // How long the god will wait.
          const k = clamp(1 - (time - litAt) / PATIENCE, 0, 1);
          g.lineStyle(3, VEN_LIT, 0.8); g.beginPath(); g.arc(p.x, p.y, 38, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      if (lit >= 0) {
        // A column of light over the named rune.
        const p = runeAt(lit);
        glow(g, p.x, p.y - 60, 50, VEN, 0.05, 3);
        g.fillStyle(VEN, 0.12); g.fillRect(p.x - 18, p.y - 180, 36, 180);
        g.fillStyle(VEN_LIT, 0.18); g.fillRect(p.x - 5, p.y - 180, 10, 180);
        for (let i = 0; i < 5; i++) {
          const ph = (t * 0.7 + i / 5) % 1;
          g.fillStyle(VEN_LIT, 1 - ph); g.fillCircle(p.x + Math.sin(i * 3 + t * 2) * 12, p.y - ph * 170, 2);
        }
      }
      // Links each fighter has forged, turning round them.
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        for (let i = 0; i < links[w]; i++) {
          const an = t * 2 + (i * Math.PI * 2) / NEED;
          const x = f.x + Math.cos(an) * 30, y = f.y - 10 + Math.sin(an) * 12;
          g.lineStyle(2.4, w === 'player' ? VEN_LIT : OBS.seamLit, 0.95); g.strokeEllipse(x, y, 10, 6);
        }
        if (ctx.scene.time.now < boundUntil[w]) {
          for (let i = 0; i < 3; i++) {
            g.lineStyle(3, VEN_DEEP, 0.9); g.strokeEllipse(f.x, f.y - 6 + i * 10, 52, 14);
            g.lineStyle(1.2, VEN_LIT, 0.8); g.strokeEllipse(f.x, f.y - 7 + i * 10, 52, 14);
          }
        }
      }
      // The binding: chains from four runes to the bound, and the god's eye opening over them.
      const k = (time - bindAt) / 1400;
      if (k >= 0 && k <= 1) {
        const f = fighter(bindWho);
        const reach = clamp(k * 2.5, 0, 1);
        for (const i of [0, 2, 3, 5]) {
          const p = runeAt(i);
          chainRun(g, p.x, p.y, p.x + (f.x - p.x) * reach, p.y + (f.y - p.y) * reach, 12, VEN, 1 - k * 0.6);
        }
        const ey = f.y - 120, open = Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * (1 - clamp((k - 0.7) / 0.3, 0, 1));
        glow(g, f.x, ey, 70, VEN, 0.05 * open, 3);
        g.fillStyle(0x020302, 0.9 * open); g.fillEllipse(f.x, ey, 120, 44 * open);
        g.fillStyle(VEN, open); g.fillEllipse(f.x, ey, 34, 34 * open);
        g.fillStyle(0x000000, open); g.fillEllipse(f.x, ey, 8, 30 * open);
        g.lineStyle(2, OBS.edge, 0.7 * open); g.strokeEllipse(f.x, ey, 120, 44 * open);
      }
    },
    drawHud(g) {
      const cx = W / 2, cy = top + 16;
      g.fillStyle(0x030503, 0.85); g.fillRoundedRect(cx - 104, cy - 11, 208, 22, 8);
      g.lineStyle(1.5, OBS.edge, 0.6); g.strokeRoundedRect(cx - 104, cy - 11, 208, 22, 8);
      for (let i = 0; i < NEED; i++) {
        g.lineStyle(2.4, i < links.player ? VEN_LIT : VEN_DARK, 1); g.strokeEllipse(cx - 30 - i * 22, cy, 16, 9);
        g.lineStyle(2.4, i < links.npc ? OBS.seamLit : VEN_DARK, 1); g.strokeEllipse(cx + 30 + i * 22, cy, 16, 9);
      }
      g.fillStyle(VEN, 0.9); g.fillCircle(cx, cy, 4);
    },
    destroy() { for (const r of runes) r.remove(); },
  };
};

export const DECREE_RITE: GimmickDef = {
  id: ID,
  rules: 'Whoever strikes the rune the god names shall forge a link, and three links bind their foe; a rune struck out of turn unbinds the striker.',
  make,
};

