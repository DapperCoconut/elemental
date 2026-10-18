import { World } from '../../data/Worlds';
import { PropKind, TownTheme } from './TownTheme';

/**
 * Deterministic town layout for one campaign world.
 *
 * The same world id always produces the same town: the seed is the id, so a player who
 * walks out of Fire Town and back finds every house, lamp and vent where they left it.
 *
 * Shape of a town:
 *   - a central plaza (monument, shop, market stall, the fast-travel kiosk);
 *   - one road out to each neighbouring town — the parent and every child in the realm's
 *     tree — leaving at the compass bearing that town sits at on the world map, so walking
 *     "west-south-west" out of Fire Town drops you in at Water Town's east-north-east gate;
 *   - an organic ring road with lanes and spurs, lined with houses;
 *   - five menacing red-door buildings strung around the ring, in order;
 *   - the castle in the widest gap between exits, at the end of its own road;
 *   - optionally a river or chasm crossing town, bridged wherever a road crosses it;
 *   - decor scattered through whatever is left.
 *
 * Everything here is pure geometry — no Phaser — so the renderer, collision and NPC
 * wandering all read from one description.
 */

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Circle { x: number; y: number; r: number }

export interface Road { pts: Pt[]; w: number; kind: 'main' | 'ring' | 'lane' }

export type BuildingKind = 'house' | 'fight' | 'castle' | 'shop';

export interface Building {
  kind: BuildingKind;
  /** Footprint on the ground — this is the collider. Art rises above it. */
  rect: Rect;
  /** Where the player stands to use the door. */
  door: Pt;
  /** 1..5 for fight buildings. */
  fightIndex?: number;
  seed: number;
}

export interface TownExit {
  worldId: string;
  isParent: boolean;
  /** Unit vector pointing out of town. */
  dir: Pt;
  /** Where the road leaves the map. */
  edge: Pt;
  /** Arrival point when walking in from that town. */
  spawn: Pt;
  /** Signpost foot. */
  sign: Pt;
  /** The barricade footprint, used only while the road is locked. */
  barricade: Rect;
}

export interface Prop { kind: PropKind; x: number; y: number; s: number; seed: number }

export interface Bridge { a: Pt; b: Pt; w: number }

export interface Band {
  pts: Pt[];
  thick: number;
  axis: 'h' | 'v';
  bridges: Bridge[];
  /** Per-sample flag: true where a road crosses (walkable). */
  open: boolean[];
}

export interface TownSpots {
  monument: Pt;
  stall: Pt;
  stallKeeper: Pt;
  shopKeeper: Pt;
  kiosk: Pt;
  fingerpost: Pt;
  gauntlet: Pt;
  grate: Pt;
  guard: Pt;
  portal?: Pt;
  portal2?: Pt;
  amalgam?: Pt;
}

export interface TownLayout {
  W: number;
  H: number;
  plaza: Circle;
  roads: Road[];
  buildings: Building[];
  exits: TownExit[];
  props: Prop[];
  lamps: Pt[];
  band: Band | null;
  spots: TownSpots;
  colliders: Rect[];
  circles: Circle[];
  spawnDefault: Pt;
  castleAngle: number;
}

// ── RNG ──────────────────────────────────────────────────────────────────

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Geometry helpers ─────────────────────────────────────────────────────

export function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const x = a.x + dx * t, y = a.y + dy * t;
  return Math.hypot(p.x - x, p.y - y);
}

export function distToPolyline(p: Pt, pts: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, distToSeg(p, pts[i], pts[i + 1]));
  return best;
}

function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

function rectCircle(r: Rect, c: Circle): boolean {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
  const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
  return Math.hypot(nx - c.x, ny - c.y) < c.r;
}

/** Shortest distance from any of a rect's sample points to a polyline (cheap, conservative). */
function rectDistToPolyline(r: Rect, pts: Pt[]): number {
  const samples: Pt[] = [];
  const nx = Math.max(2, Math.ceil(r.w / 40));
  const ny = Math.max(2, Math.ceil(r.h / 40));
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= ny; j++) {
      if (i !== 0 && i !== nx && j !== 0 && j !== ny) continue;
      samples.push({ x: r.x + (r.w * i) / nx, y: r.y + (r.h * j) / ny });
    }
  }
  samples.push({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  let best = Infinity;
  for (const s of samples) best = Math.min(best, distToPolyline(s, pts));
  return best;
}

const angDiff = (a: number, b: number): number => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
};

/** Props whose base is broad enough to need a wider collider. */
const BIG_PROPS = new Set<PropKind>([
  'windmill', 'derrick', 'tent', 'tree', 'willow', 'fountain', 'statue', 'goldStatue', 'boulder',
  'obsidianSpire', 'teslaCoil', 'serverRack', 'cannon', 'heartArch', 'chimneyForge', 'antlerTotem',
  'echoBell', 'eyeStatue', 'brokenPillar', 'mineCart', 'speaker',
]);

// ── Build ────────────────────────────────────────────────────────────────

/**
 * @param world   the world being laid out
 * @param realm   every world in the same realm (for parent/children)
 * @param theme   the world's atmosphere (props, feature)
 * @param extras  realm-root extras — the portal(s) and the Amalgam's pit
 */
export function buildTownLayout(
  world: World, realm: World[], theme: TownTheme,
  extras: { portals: number; amalgam: boolean },
): TownLayout {
  const rng = mulberry32(hashString(`town:${world.id}`));
  const rand = (a: number, b: number) => a + rng() * (b - a);
  const pick = <X>(arr: X[]): X => arr[Math.floor(rng() * arr.length)];

  const W = Math.round(rand(3000, 3400));
  const H = Math.round(rand(2100, 2400));
  const plaza: Circle = { x: W / 2 + rand(-120, 120), y: H / 2 + rand(-80, 80), r: 230 };
  const MAIN_W = 112;
  const LANE_W = 78;

  // ── Exits ───────────────────────────────────────────────────────────
  const parent = world.parentId ? realm.find((w) => w.id === world.parentId) : undefined;
  const children = realm.filter((w) => w.parentId === world.id);
  const neighbours: { w: World; isParent: boolean; ang: number }[] = [];
  if (parent) neighbours.push({ w: parent, isParent: true, ang: Math.atan2(parent.mapY - world.mapY, parent.mapX - world.mapX) });
  for (const c of children) neighbours.push({ w: c, isParent: false, ang: Math.atan2(c.mapY - world.mapY, c.mapX - world.mapX) });

  // Relax bearings apart so two roads never leave through the same gap.
  const MIN_SEP = 0.62;
  for (let iter = 0; iter < 40; iter++) {
    let moved = false;
    for (let i = 0; i < neighbours.length; i++) {
      for (let j = i + 1; j < neighbours.length; j++) {
        const a = neighbours[i], b = neighbours[j];
        const d = angDiff(a.ang, b.ang);
        if (d < MIN_SEP) {
          const push = (MIN_SEP - d) / 2 + 0.01;
          // Which way round is b from a?
          const sgn = Math.sin(b.ang - a.ang) >= 0 ? 1 : -1;
          a.ang -= push * sgn;
          b.ang += push * sgn;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  const EDGE_M = 0;
  const rayToEdge = (ang: number): Pt => {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let t = Infinity;
    if (dx > 1e-6) t = Math.min(t, (W - EDGE_M - plaza.x) / dx);
    if (dx < -1e-6) t = Math.min(t, (EDGE_M - plaza.x) / dx);
    if (dy > 1e-6) t = Math.min(t, (H - EDGE_M - plaza.y) / dy);
    if (dy < -1e-6) t = Math.min(t, (EDGE_M - plaza.y) / dy);
    return { x: plaza.x + dx * t, y: plaza.y + dy * t };
  };

  const exits: TownExit[] = [];
  const roads: Road[] = [];
  for (const n of neighbours) {
    const edge = rayToEdge(n.ang);
    // The outward direction is the edge's normal, so the last stretch runs straight off the map.
    let dir: Pt;
    if (edge.x <= 1) dir = { x: -1, y: 0 };
    else if (edge.x >= W - 1) dir = { x: 1, y: 0 };
    else if (edge.y <= 1) dir = { x: 0, y: -1 };
    else dir = { x: 0, y: 1 };
    // Keep the gate off the very corners.
    if (dir.x !== 0) edge.y = Math.max(260, Math.min(H - 260, edge.y));
    else edge.x = Math.max(300, Math.min(W - 300, edge.x));

    const straight = { x: edge.x - dir.x * 340, y: edge.y - dir.y * 340 };
    const mid = {
      x: (plaza.x + straight.x) / 2 + rand(-110, 110) * Math.abs(dir.y || 0.5),
      y: (plaza.y + straight.y) / 2 + rand(-80, 80) * Math.abs(dir.x || 0.5),
    };
    roads.push({
      kind: 'main', w: MAIN_W,
      pts: [{ x: plaza.x, y: plaza.y }, mid, straight, { x: edge.x + dir.x * 60, y: edge.y + dir.y * 60 }],
    });
    const perp = { x: -dir.y, y: dir.x };
    const bw = dir.x !== 0 ? 46 : MAIN_W + 90;
    const bh = dir.x !== 0 ? MAIN_W + 90 : 46;
    const bc = { x: edge.x - dir.x * 110, y: edge.y - dir.y * 110 };
    exits.push({
      worldId: n.w.id, isParent: n.isParent, dir,
      edge,
      spawn: { x: edge.x - dir.x * 170, y: edge.y - dir.y * 170 },
      sign: {
        x: edge.x - dir.x * 250 + perp.x * (MAIN_W / 2 + 34),
        y: edge.y - dir.y * 250 + perp.y * (MAIN_W / 2 + 34) + (dir.x !== 0 ? 0 : 0),
      },
      barricade: { x: bc.x - bw / 2, y: bc.y - bh / 2, w: bw, h: bh },
    });
  }

  // ── Castle bearing: the widest gap between exits ──────────────────
  const exitAngs = exits.map((e) => Math.atan2(e.edge.y - plaza.y, e.edge.x - plaza.x)).sort((a, b) => a - b);
  let castleAngle = -Math.PI / 2;
  if (exitAngs.length === 1) castleAngle = exitAngs[0] + Math.PI;
  else if (exitAngs.length > 1) {
    let bestGap = -1;
    for (let i = 0; i < exitAngs.length; i++) {
      const a = exitAngs[i];
      const b = i + 1 < exitAngs.length ? exitAngs[i + 1] : exitAngs[0] + Math.PI * 2;
      if (b - a > bestGap) { bestGap = b - a; castleAngle = (a + b) / 2; }
    }
  }

  // ── Band (river / chasm) ────────────────────────────────────────────
  let band: Band | null = null;
  if (theme.feature.kind !== 'none') {
    const axis: 'h' | 'v' = rng() < 0.6 ? 'h' : 'v';
    const thick = theme.feature.kind === 'chasm' ? rand(110, 140) : rand(90, 120);
    const side = rng() < 0.5 ? -1 : 1;
    const pts: Pt[] = [];
    const amp = rand(40, 80), wl = rand(600, 900), ph = rand(0, Math.PI * 2);
    if (axis === 'h') {
      const y0 = plaza.y + side * rand(400, 470);
      for (let x = -20; x <= W + 20; x += 30) pts.push({ x, y: y0 + Math.sin((x / wl) * Math.PI * 2 + ph) * amp });
    } else {
      const x0 = plaza.x + side * rand(520, 620);
      for (let y = -20; y <= H + 20; y += 30) pts.push({ x: x0 + Math.sin((y / wl) * Math.PI * 2 + ph) * amp, y });
    }
    band = { pts, thick, axis, bridges: [], open: pts.map(() => false) };
  }
  const inBand = (p: Pt, pad: number): boolean =>
    !!band && distToPolyline(p, band.pts) < band.thick / 2 + pad;
  const rectInBand = (r: Rect, pad: number): boolean =>
    !!band && rectDistToPolyline(r, band.pts) < band.thick / 2 + pad;

  // ── Castle ──────────────────────────────────────────────────────────
  const CW = 400, CH = 250;
  let castleRect: Rect = { x: 0, y: 0, w: CW, h: CH };
  {
    const dx = Math.cos(castleAngle), dy = Math.sin(castleAngle);
    const edge = rayToEdge(castleAngle);
    const full = Math.hypot(edge.x - plaza.x, edge.y - plaza.y);
    let placed = false;
    for (const f of [0.72, 0.64, 0.8, 0.56, 0.86, 0.5]) {
      const cx = plaza.x + dx * full * f, cy = plaza.y + dy * full * f;
      const r: Rect = {
        x: Math.max(140, Math.min(W - 140 - CW, cx - CW / 2)),
        y: Math.max(200, Math.min(H - 200 - CH, cy - CH / 2)),
        w: CW, h: CH,
      };
      if (rectInBand(r, 60)) continue;
      if (roads.some((rd) => rectDistToPolyline(r, rd.pts) < rd.w / 2 + 40)) continue;
      castleRect = r; placed = true; break;
    }
    if (!placed) {
      const cx = plaza.x + dx * full * 0.7, cy = plaza.y + dy * full * 0.7;
      castleRect = {
        x: Math.max(140, Math.min(W - 140 - CW, cx - CW / 2)),
        y: Math.max(200, Math.min(H - 200 - CH, cy - CH / 2)), w: CW, h: CH,
      };
    }
  }
  const castleDoor: Pt = { x: castleRect.x + CW / 2, y: castleRect.y + CH + 26 };
  {
    // The castle road always arrives at the front gate from the south.
    const apron = { x: castleDoor.x, y: castleDoor.y + 110 };
    const pts: Pt[] = [{ x: plaza.x, y: plaza.y }];
    if (castleRect.y + CH / 2 > plaza.y + 60) {
      // Castle south of the plaza: swing round its flank.
      const flankX = castleDoor.x + (plaza.x < castleDoor.x ? -1 : 1) * (CW / 2 + 90);
      pts.push({ x: flankX, y: castleRect.y - 60 });
      pts.push({ x: flankX, y: apron.y });
    } else {
      pts.push({ x: (plaza.x + apron.x) / 2 + rand(-60, 60), y: (plaza.y + apron.y) / 2 });
    }
    pts.push(apron, { x: castleDoor.x, y: castleDoor.y - 20 });
    roads.push({ kind: 'main', w: MAIN_W - 10, pts });
  }

  // ── Ring road ───────────────────────────────────────────────────────
  {
    const rx = Math.min(plaza.x - 260, W - plaza.x - 260, W * 0.31);
    const ry = Math.min(plaza.y - 230, H - plaza.y - 230, H * 0.3);
    const pts: Pt[] = [];
    const N = 22;
    const ph = rand(0, Math.PI * 2);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + ph;
      const k = 1 + Math.sin(a * 3 + ph) * 0.06 + rand(-0.04, 0.04);
      pts.push({ x: plaza.x + Math.cos(a) * rx * k, y: plaza.y + Math.sin(a) * ry * k });
    }
    pts.push({ ...pts[0] });
    roads.push({ kind: 'ring', w: LANE_W + 10, pts });
  }
  const ring = roads[roads.length - 1];

  // ── Lanes: plaza↔ring connectors and outward spurs ──────────────────
  const usedAngles = [...exitAngs, castleAngle];
  const gapAngle = (pref?: number): number => {
    let best = 0, bestScore = -Infinity;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 - Math.PI;
      let score = Math.min(...usedAngles.map((u) => angDiff(a, u)));
      if (pref !== undefined) score -= angDiff(a, pref) * 0.25;
      if (score > bestScore) { bestScore = score; best = a; }
    }
    return best;
  };
  const ringPointAt = (ang: number): Pt => {
    let best = ring.pts[0], bd = Infinity;
    for (const p of ring.pts) {
      const d = angDiff(Math.atan2(p.y - plaza.y, p.x - plaza.x), ang);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };
  for (let i = 0; i < 3; i++) {
    const a = gapAngle();
    usedAngles.push(a);
    const rp = ringPointAt(a);
    roads.push({ kind: 'lane', w: LANE_W, pts: [{ x: plaza.x, y: plaza.y }, { x: (plaza.x + rp.x) / 2 + rand(-40, 40), y: (plaza.y + rp.y) / 2 + rand(-40, 40) }, rp] });
  }
  for (let i = 0; i < 7; i++) {
    const a = gapAngle() + rand(-0.2, 0.2);
    usedAngles.push(a);
    const rp = ringPointAt(a);
    const out = { x: Math.cos(a), y: Math.sin(a) };
    const len = rand(240, 380);
    const end = {
      x: Math.max(160, Math.min(W - 160, rp.x + out.x * len)),
      y: Math.max(160, Math.min(H - 160, rp.y + out.y * len)),
    };
    roads.push({ kind: 'lane', w: LANE_W - 6, pts: [rp, { x: (rp.x + end.x) / 2 + rand(-50, 50), y: (rp.y + end.y) / 2 + rand(-50, 50) }, end] });
  }

  // ── Band crossings → bridges ────────────────────────────────────────
  if (band) {
    for (const rd of roads) {
      for (let i = 0; i < band.pts.length; i++) {
        if (distToPolyline(band.pts[i], rd.pts) < rd.w / 2 + 6) band.open[i] = true;
      }
      // One bridge per road segment that crosses.
      for (let s = 0; s < rd.pts.length - 1; s++) {
        const a = rd.pts[s], b = rd.pts[s + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.ceil(len / 12);
        let hitAt: Pt | null = null;
        let bestD = Infinity;
        for (let k = 0; k <= steps; k++) {
          const p = { x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps };
          const d = distToPolyline(p, band.pts);
          if (d < bestD) { bestD = d; hitAt = p; }
        }
        if (hitAt && bestD < 8) {
          const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
          const half = band.thick / 2 + 26;
          // Oblique crossings need a longer span.
          const along = band.axis === 'h' ? Math.abs(uy) : Math.abs(ux);
          const span = Math.min(half / Math.max(0.5, along), half * 1.8);
          band.bridges.push({
            a: { x: hitAt.x - ux * span, y: hitAt.y - uy * span },
            b: { x: hitAt.x + ux * span, y: hitAt.y + uy * span },
            w: rd.w * 0.86,
          });
        }
      }
    }
  }

  const onAnyRoad = (p: Pt, pad: number): boolean => roads.some((rd) => distToPolyline(p, rd.pts) < rd.w / 2 + pad);
  const rectNearRoad = (r: Rect, pad: number): boolean => roads.some((rd) => rectDistToPolyline(r, rd.pts) < rd.w / 2 + pad);

  // ── Plaza furniture ─────────────────────────────────────────────────
  const plazaAt = (ang: number, k: number): Pt => ({ x: plaza.x + Math.cos(ang) * plaza.r * k, y: plaza.y + Math.sin(ang) * plaza.r * k });
  const roadAngs = roads.filter((r) => r.kind !== 'ring')
    .map((r) => Math.atan2(r.pts[1].y - plaza.y, r.pts[1].x - plaza.x));
  const plazaGap = (pref: number, taken: number[]): number => {
    let best = pref, bestScore = -Infinity;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2 - Math.PI;
      const clear = Math.min(...[...roadAngs, ...taken].map((u) => angDiff(a, u)));
      const score = Math.min(clear, 0.9) * 3 - angDiff(a, pref) * 0.6;
      if (score > bestScore) { bestScore = score; best = a; }
    }
    return best;
  };

  const buildings: Building[] = [];
  const colliders: Rect[] = [];
  const circles: Circle[] = [];
  const reserved: Circle[] = [];
  const taken: number[] = [];

  // The shop: a storefront on the plaza's north rim, door facing the square.
  const shopAng = plazaGap(-Math.PI / 2, taken); taken.push(shopAng);
  const SW = 230, SH = 130;
  const shopFront = plazaAt(shopAng, 1.08);
  const shopRect: Rect = { x: shopFront.x - SW / 2, y: shopFront.y - SH - 30, w: SW, h: SH };
  buildings.push({ kind: 'shop', rect: shopRect, door: { x: shopRect.x + SW / 2, y: shopRect.y + SH + 24 }, seed: 1 });
  const shopKeeper = { x: shopRect.x + SW / 2 - 50, y: shopRect.y + SH + 16 };

  const stallAng = plazaGap(shopAng + 1.9, taken); taken.push(stallAng);
  const stall = plazaAt(stallAng, 0.62);
  const stallKeeper = { x: stall.x, y: stall.y - 18 };
  const kioskAng = plazaGap(shopAng - 1.9, taken); taken.push(kioskAng);
  const kiosk = plazaAt(kioskAng, 0.66);
  const fpAng = plazaGap(shopAng + Math.PI, taken); taken.push(fpAng);
  const fingerpost = plazaAt(fpAng, 0.72);
  const monument = { x: plaza.x, y: plaza.y };

  let portal: Pt | undefined, portal2: Pt | undefined, amalgam: Pt | undefined;
  if (extras.portals > 0) {
    const a = plazaGap(shopAng + 0.95, taken); taken.push(a);
    portal = plazaAt(a, 1.32);
  }
  if (extras.portals > 1) {
    const a = plazaGap(shopAng - 0.95, taken); taken.push(a);
    portal2 = plazaAt(a, 1.32);
  }
  if (extras.amalgam) {
    const a = plazaGap(shopAng + Math.PI, taken); taken.push(a);
    amalgam = plazaAt(a, 1.4);
  }

  // Interactive furniture is solid; keep a little room around each.
  circles.push({ x: monument.x, y: monument.y, r: 46 });
  circles.push({ x: stall.x, y: stall.y + 6, r: 34 });
  circles.push({ x: kiosk.x, y: kiosk.y, r: 20 });
  circles.push({ x: fingerpost.x, y: fingerpost.y, r: 10 });
  if (portal) circles.push({ x: portal.x, y: portal.y - 10, r: 30 });
  if (portal2) circles.push({ x: portal2.x, y: portal2.y - 10, r: 30 });
  for (const p of [monument, stall, kiosk, fingerpost, portal, portal2, amalgam]) {
    if (p) reserved.push({ x: p.x, y: p.y, r: 90 });
  }
  reserved.push({ x: shopKeeper.x, y: shopKeeper.y, r: 60 });

  buildings.push({ kind: 'castle', rect: castleRect, door: castleDoor, seed: 2 });
  const guard = { x: castleDoor.x + 90, y: castleDoor.y + 10 };
  reserved.push({ x: castleDoor.x, y: castleDoor.y + 60, r: 150 });
  for (const e of exits) {
    reserved.push({ x: e.edge.x - e.dir.x * 150, y: e.edge.y - e.dir.y * 150, r: 210 });
  }

  const blocked = (r: Rect, pad: number): boolean => {
    if (r.x < 70 || r.y < 90 || r.x + r.w > W - 70 || r.y + r.h > H - 70) return true;
    if (rectCircle(r, { x: plaza.x, y: plaza.y, r: plaza.r + 34 })) return true;
    for (const b of buildings) if (rectsOverlap(r, b.rect, pad)) return true;
    for (const c of reserved) if (rectCircle(r, c)) return true;
    if (rectInBand(r, 24)) return true;
    return false;
  };

  // ── Fight lots ──────────────────────────────────────────────────────
  type Cand = { rect: Rect; ang: number };
  const tryLots = (rd: Road, size: () => { w: number; h: number }, gap: number, northOnly: boolean, out: Rect[], others: Rect[]): void => {
    for (let s = 0; s < rd.pts.length - 1; s++) {
      const a = rd.pts[s], b = rd.pts[s + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1) continue;
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      for (let d = 30; d < len; d += 46) {
        const p = { x: a.x + ux * d, y: a.y + uy * d };
        for (const side of [-1, 1]) {
          const nx = -uy * side, ny = ux * side;
          if (northOnly && ny > -0.35) continue;
          const { w, h } = size();
          const off = rd.w / 2 + gap + (w / 2) * Math.abs(nx) + (h / 2) * Math.abs(ny);
          const c = { x: p.x + nx * off, y: p.y + ny * off };
          const r: Rect = { x: c.x - w / 2, y: c.y - h / 2, w, h };
          if (blocked(r, 22)) continue;
          if (rectNearRoad(r, 14)) continue;
          if (others.some((o) => rectsOverlap(r, o, 26))) continue;
          if (out.some((o) => rectsOverlap(r, o, 26))) continue;
          // The door must open onto open ground.
          const door = { x: c.x, y: r.y + h + 24 };
          if (inBand(door, 10)) continue;
          out.push(r);
        }
      }
    }
  };

  const fightCands: Rect[] = [];
  const fightSize = () => ({ w: 210, h: 150 });
  tryLots(ring, fightSize, 22, true, fightCands, []);
  for (const rd of roads.filter((r) => r.kind === 'lane')) tryLots(rd, fightSize, 22, true, fightCands, []);
  if (fightCands.length < 5) {
    for (const rd of roads) tryLots(rd, fightSize, 22, false, fightCands, []);
  }
  // Start the sweep at the parent's gate (or opposite the castle), and sweep toward the castle.
  const parentExit = exits.find((e) => e.isParent);
  const startAng = parentExit ? Math.atan2(parentExit.edge.y - plaza.y, parentExit.edge.x - plaza.x) : castleAngle + Math.PI;
  const sweepDir = Math.sin(castleAngle - startAng) >= 0 ? 1 : -1;
  const sweep = (r: Rect): number => {
    const a = Math.atan2(r.y + r.h / 2 - plaza.y, r.x + r.w / 2 - plaza.x);
    let d = (a - startAng) * sweepDir;
    d = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return d;
  };
  const cands: Cand[] = fightCands.map((rect) => ({ rect, ang: sweep(rect) })).sort((a, b) => a.ang - b.ang);
  const chosen: Rect[] = [];
  if (cands.length >= 5) {
    for (let i = 0; i < 5; i++) {
      const idx = Math.round((i * (cands.length - 1)) / 4);
      chosen.push(cands[idx].rect);
    }
  } else {
    for (const c of cands) chosen.push(c.rect);
    // Last resort: rows around the plaza. Never expected with these sizes.
    let k = 0;
    while (chosen.length < 5 && k < 60) {
      const a = (k / 60) * Math.PI * 2;
      const c = { x: plaza.x + Math.cos(a) * 520, y: plaza.y + Math.sin(a) * 400 };
      const r: Rect = { x: c.x - 105, y: c.y - 75, w: 210, h: 150 };
      if (!blocked(r, 10) && !chosen.some((o) => rectsOverlap(r, o, 20))) chosen.push(r);
      k++;
    }
  }
  chosen.forEach((r, i) => {
    buildings.push({
      kind: 'fight', rect: r, fightIndex: i + 1, seed: 10 + i,
      door: { x: r.x + r.w / 2, y: r.y + r.h + 22 },
    });
    reserved.push({ x: r.x + r.w / 2, y: r.y + r.h + 40, r: 46 });
  });

  // ── Houses ──────────────────────────────────────────────────────────
  const houseRects: Rect[] = [];
  const houseSize = () => ({ w: Math.round(rand(130, 210)), h: Math.round(rand(90, 130)) });
  const order = [...roads].sort(() => rng() - 0.5);
  for (const rd of order) tryLots(rd, houseSize, 18, false, houseRects, []);
  // A second row behind the street frontage makes the blocks read as a town, not a ribbon.
  for (const rd of order) if (rd.kind !== 'lane') tryLots(rd, houseSize, 175, false, houseRects, []);
  houseRects.forEach((r, i) => {
    buildings.push({ kind: 'house', rect: r, door: { x: r.x + r.w / 2, y: r.y + r.h + 18 }, seed: 100 + i });
  });

  for (const b of buildings) colliders.push(b.rect);

  // ── Gauntlet cellar: against the plaza-nearest house that has room ─
  let gauntlet: Pt = plazaAt(plazaGap(shopAng + 2.6, taken), 1.25);
  {
    const houses = buildings.filter((b) => b.kind === 'house')
      .map((b) => ({ b, d: Math.hypot(b.rect.x + b.rect.w / 2 - plaza.x, b.rect.y + b.rect.h / 2 - plaza.y) }))
      .sort((a, b) => a.d - b.d);
    let found = false;
    for (const { b } of houses) {
      if (found) break;
      for (const sx of [1, -1]) {
        const p = { x: sx > 0 ? b.rect.x + b.rect.w + 34 : b.rect.x - 34, y: b.rect.y + b.rect.h - 26 };
        const probe: Rect = { x: p.x - 30, y: p.y - 24, w: 60, h: 48 };
        if (buildings.some((o) => rectsOverlap(probe, o.rect, 4))) continue;
        if (rectNearRoad(probe, 0) || rectInBand(probe, 10)) continue;
        if (reserved.some((c) => rectCircle(probe, { ...c, r: c.r * 0.6 }))) continue;
        gauntlet = p;
        found = true;
        break;
      }
    }
  }
  reserved.push({ x: gauntlet.x, y: gauntlet.y, r: 70 });

  // ── Sewer grate: in the street, on the ring road ───────────────────
  let grate: Pt = ringPointAt(castleAngle + Math.PI);
  {
    let best: Pt | null = null, bestScore = -Infinity;
    for (let i = 0; i < ring.pts.length - 1; i++) {
      const a = ring.pts[i], b = ring.pts[i + 1];
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (inBand(m, 30)) continue;
      const nearest = Math.min(...buildings.filter((x) => x.kind === 'fight').map((x) => Math.hypot(x.door.x - m.x, x.door.y - m.y)), 9999);
      const score = Math.min(nearest, 400) - angDiff(Math.atan2(m.y - plaza.y, m.x - plaza.x), castleAngle + Math.PI) * 60;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    if (best) grate = best;
  }
  reserved.push({ x: grate.x, y: grate.y, r: 70 });

  // ── Band colliders ──────────────────────────────────────────────────
  if (band) {
    for (let i = 0; i < band.pts.length; i++) {
      if (band.open[i]) continue;
      const p = band.pts[i];
      const t = band.thick * 0.82;
      colliders.push(band.axis === 'h'
        ? { x: p.x - 17, y: p.y - t / 2, w: 34, h: t }
        : { x: p.x - t / 2, y: p.y - 17, w: t, h: 34 });
    }
  }

  // ── Lamps ───────────────────────────────────────────────────────────
  const lamps: Pt[] = [];
  for (const rd of roads) {
    let acc = 0, flip = 1;
    for (let s = 0; s < rd.pts.length - 1; s++) {
      const a = rd.pts[s], b = rd.pts[s + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1) continue;
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      for (let d = 0; d < len; d += 20) {
        acc += 20;
        if (acc < 280) continue;
        const p = { x: a.x + ux * d - uy * flip * (rd.w / 2 + 16), y: a.y + uy * d + ux * flip * (rd.w / 2 + 16) };
        if (Math.hypot(p.x - plaza.x, p.y - plaza.y) < plaza.r + 20) continue;
        if (p.x < 40 || p.y < 40 || p.x > W - 40 || p.y > H - 40) continue;
        if (buildings.some((bd) => rectsOverlap({ x: p.x - 8, y: p.y - 8, w: 16, h: 16 }, bd.rect, 10))) continue;
        if (inBand(p, 10) || onAnyRoad(p, 2)) continue;
        if (reserved.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < c.r * 0.85)) continue;
        lamps.push(p);
        circles.push({ x: p.x, y: p.y, r: 7 });
        acc = 0; flip = -flip;
      }
    }
  }
  // Plaza ring of lamps.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const p = plazaAt(a, 0.93);
    if (roadAngs.some((r) => angDiff(r, a) < 0.3)) continue;
    if (taken.some((t) => angDiff(t, a) < 0.25)) continue;
    lamps.push(p);
    circles.push({ x: p.x, y: p.y, r: 7 });
  }

  // ── Props ───────────────────────────────────────────────────────────
  const props: Prop[] = [];
  const count = Math.round((W * H) / 52000);
  const FLAT = new Set<PropKind>([
    'lavaVent', 'oilSlick', 'acidPool', 'shadowPool', 'fogPatch', 'runeCircle', 'chalkDoodle', 'crater',
    'snowdrift', 'mushroomRing', 'flowerbed', 'cloudPuff', 'ironFilings', 'bouncePad', 'swirl', 'duneMound',
    'wheat', 'lilyPond',
  ]);
  for (let tries = 0; tries < count * 12 && props.length < count; tries++) {
    const kind = pick(theme.props);
    const flat = FLAT.has(kind);
    const p = { x: rand(50, W - 50), y: rand(70, H - 40) };
    const r = flat ? 40 : 26;
    if (Math.hypot(p.x - plaza.x, p.y - plaza.y) < plaza.r + 40) continue;
    if (onAnyRoad(p, flat ? 20 : r + 6)) continue;
    if (inBand(p, r)) continue;
    const pr: Rect = { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
    if (buildings.some((b) => rectsOverlap(pr, b.rect, 14))) continue;
    if (reserved.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < c.r + r * 0.4)) continue;
    if (props.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < (flat ? 80 : 60))) continue;
    if (lamps.some((l) => Math.hypot(l.x - p.x, l.y - p.y) < 40)) continue;
    const s = rand(0.85, 1.2);
    props.push({ kind, x: p.x, y: p.y, s, seed: Math.floor(rng() * 1e9) });
    if (!flat) circles.push({ x: p.x, y: p.y - 4, r: (BIG_PROPS.has(kind) ? 26 : 13) * s });
  }

  // Spawn on the plaza's south rim, facing the square — on the first clear spot.
  const free = (p: Pt, m: number): boolean =>
    !colliders.some((r) => p.x > r.x - m && p.x < r.x + r.w + m && p.y > r.y - m && p.y < r.y + r.h + m)
    && !circles.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < c.r + m);
  let spawnDefault = plazaAt(Math.PI / 2, 0.75);
  search: for (const k of [0.75, 0.6, 0.85, 0.5, 0.95, 0.4]) {
    for (let i = 0; i < 24; i++) {
      const a = Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.13;
      const p = plazaAt(a, k);
      if (free(p, 20)) { spawnDefault = p; break search; }
    }
  }

  return {
    W, H, plaza, roads, buildings, exits, props, lamps, band,
    spots: { monument, stall, stallKeeper, shopKeeper, kiosk, fingerpost, gauntlet, grate, guard, portal, portal2, amalgam },
    colliders, circles, spawnDefault, castleAngle,
  };
}
