import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { segText } from '../art';
import { COPPER, COPPER_DARK, DIODE, FAULT, FILAMENT, IRON, IRON_DARK, SILK, SOLDER, SOLDER_DARK, SOLDER_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Logic Gates — Gatekeeper Nand.
 *
 * Nand keeps the gate-yard where the court's apprentices learn their logic, and she teaches it the
 * hard way. Two steel walls cut the yard into three cells, and the doors in them are gates:
 * • the **AND** door (west wall, top) opens only while plates **A** and **B** are both stood on;
 * • the **NOT** door (west wall, bottom) is open — *unless* someone stands on plate **C**;
 * • the **OR** door (east wall) opens while **C** or **D** is stood on.
 * Every gate has a propagation delay: it switches a beat after its inputs change, so you can step
 * off a plate and still slip through the door you opened. The steel stops shots as well as
 * fighters: nothing flies through a wall except by an open door.
 *
 * In one of the two end cells stands Nand's turret, and it moves between them. While its cell is
 * *sealed* — every door of it shut — it fires on whoever is shut in with it. The law is the law:
 * that includes Nand. Hold plate C and a foe in the west cell is locked in with the turret;
 * leave the east cell's plates alone and the east cell seals itself.
 */

const WALLS = [320, 640];
const WALL_HALF = 9;
const PLATE_R = 30;

type DoorId = 'and' | 'not' | 'or';
interface Door { id: DoorId; wall: number; y0: number; y1: number; logic: boolean; open: boolean; changeAt: number }
interface Plate { id: 'A' | 'B' | 'C' | 'D'; x: number; y: number; on: boolean }
interface Bolt { x: number; y: number; vx: number; vy: number; born: number; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const DELAY = ctx.hard ? 700 : 900;
  const FIRE_MS = ctx.hard ? 650 : 820;
  const DMG = ctx.hard ? 9 : 8;
  const plates: Plate[] = [
    { id: 'A', x: 160, y: 200, on: false },
    { id: 'B', x: 480, y: 180, on: false },
    { id: 'C', x: 480, y: 560, on: false },
    { id: 'D', x: 724, y: 450, on: false },
  ];
  const doors: Door[] = [
    { id: 'and', wall: 0, y0: top + 50, y1: top + 160, logic: false, open: false, changeAt: -1 },
    { id: 'not', wall: 0, y0: H - 170, y1: H - 60, logic: true, open: true, changeAt: -1 },
    { id: 'or', wall: 1, y0: 320, y1: 430, logic: false, open: false, changeAt: -1 },
  ];
  /** Turret spots: the west cell and the east cell. */
  const SPOTS: Pt[] = [{ x: 150, y: 420 }, { x: 830, y: 230 }];
  let turretCell = rng() < 0.5 ? 0 : 2;
  let moveAt = 0;
  let moveWarnAt = -1;
  let nextShot = 0;
  let sealedSince = -1;
  let started = false;
  const bolts: Bolt[] = [];
  /** Where a shot just rang off the steel. */
  const sparksAt: { x: number; y: number; at: number }[] = [];
  const prevX = new Map<Fighter, number>([[player, player.x], [npc, npc.x]]);
  const MOVE_EVERY = 8000;
  const MOVE_WARN = 1600;

  const cellOf = (x: number): number => (x < WALLS[0] ? 0 : x < WALLS[1] ? 1 : 2);
  const turretPos = (): Pt => (turretCell === 0 ? SPOTS[0] : SPOTS[1]);
  const doorsOf = (cell: number): Door[] => doors.filter((d) => (cell === 0 ? d.wall === 0 : cell === 2 ? d.wall === 1 : true));
  const sealed = (cell: number): boolean => doorsOf(cell).every((d) => !d.open);

  /** The gates' logic for a given set of pressed plates. */
  function logicFor(on: (id: Plate['id']) => boolean): Record<DoorId, boolean> {
    return { and: on('A') && on('B'), not: !on('C'), or: on('C') || on('D') };
  }

  function wallBlock(f: Fighter): void {
    const px = prevX.get(f) ?? f.x;
    let x = f.x;
    WALLS.forEach((wx, wi) => {
      const near = Math.abs(x - wx) < WALL_HALF + 14;
      const crossed = (px - wx) * (x - wx) < 0;
      if (!near && !crossed) return;
      const inDoor = doors.some((d) => d.wall === wi && d.open && f.y > d.y0 + 6 && f.y < d.y1 - 6);
      if (inDoor) return;
      const side = Math.sign(px - wx) || Math.sign(x - wx) || 1;
      const tx = wx + side * (WALL_HALF + 14);
      ctx.nudge(f, tx - x, 0);
      x = tx;
    });
    prevX.set(f, x);
  }

  /** Fighters' shots meeting a wall anywhere but an open door are stopped on the steel. */
  function wallShots(): void {
    const cy = (top + H) / 2, reach = (H - top) / 2 + 24;
    WALLS.forEach((wx, wi) => {
      for (const s of ctx.shotsNear(wx, cy, reach)) {
        if (Math.abs(s.x - wx) > WALL_HALF + 6) continue;
        if (doors.some((d) => d.wall === wi && d.open && s.y > d.y0 && s.y < d.y1)) continue;
        s.block();
        sparksAt.push({ x: wx, y: s.y, at: ctx.scene.time.now });
      }
    });
  }

  function shoot(f: Fighter, time: number): void {
    const t = turretPos();
    const a = Math.atan2(f.y - t.y, f.x - t.x);
    bolts.push({ x: t.x + Math.cos(a) * 26, y: t.y - 22 + Math.sin(a) * 26, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, born: time, dealt: false });
    ctx.sfx('musket');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; moveAt = time + MOVE_EVERY; }
      // Plates.
      for (const p of plates) p.on = [player, npc].some((f) => alive(f) && dist(p.x, p.y, f.x, f.y) < PLATE_R);
      const logic = logicFor((id) => plates.find((p) => p.id === id)?.on ?? false);
      // Gates follow their logic after the propagation delay.
      for (const d of doors) {
        const want = logic[d.id];
        if (want !== d.logic) { d.logic = want; d.changeAt = time + DELAY; }
        if (d.changeAt > 0 && time >= d.changeAt) {
          d.changeAt = -1;
          if (d.open !== d.logic) { d.open = d.logic; ctx.sfx(d.open ? 'gear-turn' : 'clang'); }
        }
      }
      // Walls hold.
      for (const f of [player, npc]) if (alive(f)) wallBlock(f);
      wallShots();
      for (let i = sparksAt.length - 1; i >= 0; i--) if (time - sparksAt[i].at > 300) sparksAt.splice(i, 1);
      // The turret moves cells now and then.
      if (moveWarnAt < 0 && time >= moveAt - MOVE_WARN) { moveWarnAt = time; ctx.banner('THE TURRET IS MOVING', '#ffd890'); }
      if (time >= moveAt) {
        moveAt = time + MOVE_EVERY;
        moveWarnAt = -1;
        turretCell = turretCell === 0 ? 2 : 0;
        sealedSince = -1;
        ctx.sfx('gear-turn');
      }
      // Sealed in with the turret: it fires.
      if (sealed(turretCell)) {
        if (sealedSince < 0) { sealedSince = time; nextShot = time + 700; ctx.float(turretPos().x, turretPos().y - 60, 'SEALED', '#ff6a6a'); }
        if (time >= nextShot) {
          nextShot = time + FIRE_MS;
          for (const f of [player, npc]) if (alive(f) && cellOf(f.x) === turretCell) shoot(f, time);
        }
      } else sealedSince = -1;
      // Bolts hit whoever they meet — and stop at the walls.
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        const ox = b.x;
        b.x += b.vx * dt; b.y += b.vy * dt;
        const hitWall = WALLS.some((wx) => (ox - wx) * (b.x - wx) < 0);
        if (hitWall || b.x < 0 || b.x > W || b.y < top || b.y > H || time - b.born > 3000) { bolts.splice(i, 1); continue; }
        for (const f of [player, npc]) {
          if (b.dealt || !alive(f)) continue;
          if (dist(b.x, b.y, f.x, f.y) < 22) {
            b.dealt = true;
            ctx.hit(f, DMG, b.x, b.y);
            ctx.sfx('hit-medium');
          }
        }
        if (b.dealt) bolts.splice(i, 1);
      }
    },

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      const myCell = cellOf(npc.x);
      const pCell = cellOf(player.x);
      const playerOn = (id: Plate['id']) => { const p = plates.find((q) => q.id === id); return !!p && dist(p.x, p.y, player.x, player.y) < PLATE_R; };
      // Locked in with the turret myself: get to whatever opens a door, or out of the line of fire.
      if (myCell === turretCell && sealed(myCell)) {
        if (myCell === 2) return { x: plates[3].x, y: plates[3].y };
        const open = doorsOf(myCell).find((d) => d.logic);
        if (open) return { x: WALLS[open.wall] - 30, y: (open.y0 + open.y1) / 2 };
        return { x: 60, y: H - 60 };
      }
      // Seal the player in: try each plate in my own cell and keep one that does it.
      if (pCell === turretCell && pCell !== myCell) {
        for (const p of plates) {
          if (cellOf(p.x) !== myCell) continue;
          const l = logicFor((id) => id === p.id || playerOn(id));
          const shut = (pCell === 0 ? [l.and, l.not] : [l.or]).every((o) => !o);
          if (shut) return { x: p.x, y: p.y };
        }
      }
      // Otherwise keep my own cell open and close in on the player.
      if (myCell === turretCell) {
        const d = doorsOf(myCell).find((q) => q.open);
        if (d && pCell !== myCell) return { x: WALLS[d.wall] + (myCell === 0 ? -40 : 40), y: (d.y0 + d.y1) / 2 };
      }
      return { x: clamp(player.x + (npc.x < player.x ? -160 : 160), 60, W - 60), y: clamp(player.y, top + 50, H - 50) };
    },

    drawGround(g, time) {
      // Cell floors: the turret's cell tinted, red when sealed.
      const tc = turretCell;
      const cx0 = tc === 0 ? 0 : WALLS[1], cx1 = tc === 0 ? WALLS[0] : W;
      g.fillStyle(sealed(tc) ? FAULT : FILAMENT, sealed(tc) ? 0.08 + Math.sin(time / 120) * 0.03 : 0.04);
      g.fillRect(cx0, top, cx1 - cx0, H - top);
      // Wires from plates to the gates they feed.
      const wire = (p: Plate, d: Door) => {
        const wx = WALLS[d.wall], dy = (d.y0 + d.y1) / 2;
        g.lineStyle(4, p.on ? COPPER : COPPER_DARK, 0.8);
        g.lineBetween(p.x, p.y, p.x, dy + (p.y < dy ? -20 : 20));
        g.lineBetween(p.x, dy + (p.y < dy ? -20 : 20), wx + (p.x < wx ? -WALL_HALF : WALL_HALF), dy + (p.y < dy ? -20 : 20));
      };
      wire(plates[0], doors[0]); wire(plates[1], doors[0]);
      wire(plates[2], doors[1]); wire(plates[2], doors[2]); wire(plates[3], doors[2]);
      // Plates: steel discs with their letter, lit when stood on.
      for (const p of plates) {
        g.fillStyle(IRON_DARK, 1); g.fillCircle(p.x, p.y + 2, PLATE_R);
        g.fillStyle(p.on ? lit(SOLDER, 0.2) : SOLDER_DARK, 1); g.fillCircle(p.x, p.y, PLATE_R - 2);
        g.lineStyle(2, p.on ? DIODE : IRON, 1); g.strokeCircle(p.x, p.y, PLATE_R - 6);
        if (p.on) { g.fillStyle(DIODE, 0.15); g.fillCircle(p.x, p.y, PLATE_R + 8); }
        segText(g, p.x - 6, p.y - 10, p.id, 20, p.on ? DIODE : SILK, 0.95);
      }
      // The turret's next spot, while it is about to move.
      if (moveWarnAt >= 0) {
        const nx = turretCell === 0 ? SPOTS[1] : SPOTS[0];
        const k = clamp((time - moveWarnAt) / MOVE_WARN, 0, 1);
        g.lineStyle(2, FILAMENT, 0.3 + k * 0.6); g.strokeCircle(nx.x, nx.y, 34 - k * 10);
      }
    },

    drawAir(g, time) {
      // The walls and their doors, with the gate symbol on each.
      WALLS.forEach((wx, wi) => {
        const myDoors = doors.filter((d) => d.wall === wi).sort((a, b) => a.y0 - b.y0);
        let y = top;
        const seg = (y0: number, y1: number) => {
          if (y1 <= y0) return;
          g.fillStyle(IRON_DARK, 1); g.fillRect(wx - WALL_HALF - 2, y0, WALL_HALF * 2 + 4, y1 - y0);
          g.fillStyle(IRON, 1); g.fillRect(wx - WALL_HALF, y0, WALL_HALF * 2, y1 - y0);
          g.fillStyle(lit(IRON, 0.25), 1); g.fillRect(wx - WALL_HALF, y0, 3, y1 - y0);
          for (let r = y0 + 10; r < y1; r += 22) { g.fillStyle(SOLDER, 0.9); g.fillCircle(wx, r, 1.6); }
        };
        for (const d of myDoors) {
          seg(y, d.y0);
          const pending = d.changeAt > 0;
          const blink = pending && Math.floor(time / 90) % 2 === 0;
          if (!d.open) {
            for (let by = d.y0 + 6; by < d.y1; by += 14) {
              g.fillStyle(blink ? FILAMENT : SOLDER_DARK, 1); g.fillRect(wx - WALL_HALF + 2, by, WALL_HALF * 2 - 4, 8);
              g.fillStyle(SOLDER_LIT, 0.5); g.fillRect(wx - WALL_HALF + 2, by, WALL_HALF * 2 - 4, 2);
            }
          } else {
            g.fillStyle(DIODE, blink ? 0.3 : 0.12); g.fillRect(wx - WALL_HALF, d.y0, WALL_HALF * 2, d.y1 - d.y0);
          }
          // Door frame stubs.
          g.fillStyle(IRON_DARK, 1); g.fillRect(wx - WALL_HALF - 6, d.y0 - 4, WALL_HALF * 2 + 12, 6); g.fillRect(wx - WALL_HALF - 6, d.y1 - 2, WALL_HALF * 2 + 12, 6);
          gateSymbol(g, wx, d.y0 - 26, d.id, d.open);
          y = d.y1;
        }
        seg(y, H);
      });
      // The turret: a riveted dome on a post, its barrel tracking whoever it would shoot.
      const t = turretPos();
      const target = [player, npc].find((f) => alive(f) && cellOf(f.x) === turretCell);
      const a = target ? Math.atan2(target.y - (t.y - 22), target.x - t.x) : time / 900;
      const live = sealed(turretCell);
      g.fillStyle(0x000000, 0.3); g.fillEllipse(t.x, t.y + 4, 56, 16);
      g.fillStyle(IRON_DARK, 1); g.fillRect(t.x - 8, t.y - 20, 16, 22);
      g.fillStyle(IRON, 1); g.fillCircle(t.x, t.y - 24, 20);
      g.fillStyle(lit(IRON, 0.3), 1); g.fillCircle(t.x - 6, t.y - 30, 7);
      g.lineStyle(7, IRON_DARK, 1); g.lineBetween(t.x, t.y - 24, t.x + Math.cos(a) * 32, t.y - 24 + Math.sin(a) * 32);
      g.lineStyle(4, SOLDER, 1); g.lineBetween(t.x, t.y - 24, t.x + Math.cos(a) * 30, t.y - 24 + Math.sin(a) * 30);
      g.fillStyle(live ? FAULT : dim(FAULT, 0.6), 1); g.fillCircle(t.x, t.y - 24, 5);
      if (live) { g.fillStyle(FAULT, 0.15 + Math.sin(time / 80) * 0.08); g.fillCircle(t.x, t.y - 24, 30); }
      // Shots stopped on the steel: a short white ring.
      for (const sp of sparksAt) {
        const k = clamp((time - sp.at) / 300, 0, 1);
        g.lineStyle(2 * (1 - k) + 0.5, 0xffffff, 1 - k); g.strokeCircle(sp.x, sp.y, 4 + k * 12);
      }
      // Bolts.
      for (const b of bolts) {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        g.lineStyle(5, FAULT, 0.35); g.lineBetween(b.x, b.y, b.x - (b.vx / sp) * 22, b.y - (b.vy / sp) * 22);
        g.fillStyle(0xffffff, 1); g.fillCircle(b.x, b.y, 3.5);
        g.fillStyle(FAULT, 1); g.fillCircle(b.x, b.y, 2.4);
      }
    },

    drawHud(g) {
      // The truth table, live: inputs A B C D and the three outputs.
      const x = W / 2 - 110, y = top + 6;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, 220, 20, 6);
      plates.forEach((p, i) => {
        g.fillStyle(p.on ? DIODE : 0x334433, 1); g.fillRect(x + 8 + i * 22, y + 5, 14, 10);
        segText(g, x + 11 + i * 22, y + 6, p.id, 8, p.on ? 0x0a1a0a : SILK, 0.9);
      });
      doors.forEach((d, i) => {
        g.fillStyle(d.open ? DIODE : FAULT, 0.95); g.fillRect(x + 110 + i * 36, y + 5, 30, 10);
        segText(g, x + 113 + i * 36, y + 6, d.id === 'and' ? 'AND' : d.id === 'or' ? 'OR' : 'NOT', 8, 0x0a0a0a, 0.9);
      });
    },
  };
}

/** The gate's own symbol painted over its door: AND's D, OR's shield, NOT's triangle and bubble. */
function gateSymbol(g: G, x: number, y: number, id: DoorId, open: boolean): void {
  const c = open ? DIODE : FAULT;
  g.fillStyle(0x0c0e10, 0.85); g.fillRoundedRect(x - 22, y - 14, 44, 28, 6);
  g.lineStyle(2, c, 1);
  if (id === 'and') {
    g.lineBetween(x - 10, y - 9, x, y - 9); g.lineBetween(x - 10, y + 9, x, y + 9); g.lineBetween(x - 10, y - 9, x - 10, y + 9);
    g.beginPath(); g.arc(x, y, 9, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
  } else if (id === 'or') {
    g.beginPath(); g.arc(x - 18, y, 12, -0.8, 0.8, false); g.strokePath();
    g.beginPath(); g.arc(x - 8, y + 18, 26, -Math.PI / 2 - 0.2, -0.45, false); g.strokePath();
    g.beginPath(); g.arc(x - 8, y - 18, 26, 0.45, Math.PI / 2 + 0.2, false); g.strokePath();
  } else {
    g.strokeTriangle(x - 10, y - 9, x - 10, y + 9, x + 6, y);
    g.strokeCircle(x + 10, y, 3.5);
  }
}

export const LOGIC_GATES: GimmickDef = {
  id: 'circuit-logic-gates',
  rules: 'Plates drive AND, OR and NOT doors. Walls stop shots except at an open door. Whoever is sealed in a cell with the turret is shot — Nand included. Gates switch a beat late.',
  make,
};
