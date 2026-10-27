import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI, FONT_MONO } from '../../ui';
import { Music, Sfx } from '../../audio';
import * as PlayerData from '../../data/PlayerData';
import { BossRig, BossRigFrame } from '../../boss/framework/BossRig';
import type { WorldBossDef } from '../../boss/framework/BossDefs';
import { TownWalker } from '../../campaign/town/TownWalker';
import * as Save from '../IslesSave';
import {
  getArea, getEncounter, getIslesBoss, bossIdFor, getWanderer, isleOf,
  allQuests, getIsle, allAreas, getIsleItem, courtOfArea, getCourt,
} from '../IslesRegistry';
import type {
  AreaDef, AreaExit, EncounterDef, NpcDef, NpcLook, Poi, Pt, Rect, Talk, IslesFightPayload, WorldHazard,
} from '../IslesTypes';
import { mulberry, hashStr, motes, dim, lit } from '../art/IsleArt';
import { drawNpc } from './NpcArt';
import { WorldDialogue, DialogueOpts } from './WorldDialogue';
import { LedgerPanel, openShop, openBakery, openDock } from './Counters';
import { Fishing } from './Fishing';
import * as Quests from '../systems/Quests';
import { prepareLoadout } from '../systems/Genome';

/**
 * The Ten Isles' open world. One area at a time — a court, the port, a dungeon — painted by its
 * def, walked with WASD, and played entirely in place: E talks, fights, fishes, trades, pulls
 * levers. Walking off a road loads the neighbouring area. The only screens that leave the world
 * are the inventory (TAB), genes (G) and the isle map (M); fights go to the arena and come back.
 */

const R_PLAYER = 11;
const WALK = 210;
const RUN = 330;
const EXIT_DEPTH = 120;
const EXIT_WIDTH = 140;
const REACH = 70;
const HUD_Z = 20000;

interface Actor {
  def: NpcDef;
  x: number; y: number;
  tx: number; ty: number;
  moving: boolean;
  idleUntil: number;
  look: number;
  g: Phaser.GameObjects.Graphics;
  plate: Phaser.GameObjects.Text;
  bubble: { t: Phaser.GameObjects.Text; until: number } | null;
  nextBark: number;
  talking: boolean;
  wanderer?: boolean;
}

interface CrowdWalker {
  look: NpcLook;
  path: Pt[];
  seg: number;
  t: number;
  dir: 1 | -1;
  speed: number;
  x: number; y: number;
  g: Phaser.GameObjects.Graphics;
  idleUntil: number;
  bubble: { t: Phaser.GameObjects.Text; until: number } | null;
  nextBark: number;
}

interface Champion {
  enc: EncounterDef;
  walker: TownWalker;
  plate: Phaser.GameObjects.Text;
  beaten: boolean;
}

interface BossStand {
  kind: 'prince' | 'monarch';
  id: string;
  at: Pt;
  def: WorldBossDef;
  rig: BossRig;
  g: Phaser.GameObjects.Graphics;
  plate: Phaser.GameObjects.Text;
}

interface Interactable {
  x: number; y: number; r: number;
  label: () => string;
  use: () => void;
  /** Lower wins when two overlap. */
  prio: number;
  /** An NPC that moves — the spot follows them. */
  src?: Actor;
  /** The champion / quest foe this is the challenge for (so a departing foe takes it along). */
  championOf?: Champion;
}

/** Per-session talk counters so repeat chats rotate through what someone has to say. */
const TALKS = new Map<string, number>();

export class IsleWorldScene extends Phaser.Scene {
  private def!: AreaDef;
  private px = 0;
  private py = 0;
  private facing = Math.PI / 2;
  private moving = false;
  private leaving = false;
  private initData: { area?: string; pos?: Pt; arriveFrom?: string; after?: IslesFightPayload } = {};

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private walker!: TownWalker;
  private actors: Actor[] = [];
  private crowd: CrowdWalker[] = [];
  private champions: Champion[] = [];
  private bosses: BossStand[] = [];
  private pieces: { g: Phaser.GameObjects.Graphics; x0: number; y0: number; x1: number; y1: number }[] = [];
  private gAnim!: Phaser.GameObjects.Graphics;
  private gOver!: Phaser.GameObjects.Graphics;
  private gPoi!: Phaser.GameObjects.Graphics;
  private gHaz!: Phaser.GameObjects.Graphics;
  private gMarks!: Phaser.GameObjects.Graphics;
  private gloomRt: Phaser.GameObjects.RenderTexture | null = null;
  private gloomBrush: Phaser.GameObjects.Graphics | null = null;
  private rng: () => number = Math.random;

  private dialogue!: WorldDialogue;
  private ledger!: LedgerPanel;
  private fishing!: Fishing;

  private interactables: Interactable[] = [];
  private current: Interactable | null = null;
  private exitRects: { exit: AreaExit; rect: Rect; open: boolean }[] = [];
  private lastCheckpoint: Pt | null = null;
  private graceUntil = 0;
  private saveAt = 0;

  // HUD
  private hudG!: Phaser.GameObjects.Graphics;
  private hudCoins!: Phaser.GameObjects.Text;
  private hudTracker!: Phaser.GameObjects.Text;
  private hudPrompt!: Phaser.GameObjects.Text;
  private hudArea!: Phaser.GameObjects.Text;
  private miniG!: Phaser.GameObjects.Graphics;
  private toasts: { t: Phaser.GameObjects.Text; until: number }[] = [];
  private labels: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: 'IsleWorldScene' }); }

  init(data: { area?: string; pos?: Pt; arriveFrom?: string; after?: IslesFightPayload }): void {
    this.initData = data ?? {};
    this.leaving = false;
    this.actors = [];
    this.crowd = [];
    this.champions = [];
    this.bosses = [];
    this.pieces = [];
    this.interactables = [];
    this.current = null;
    this.exitRects = [];
    this.toasts = [];
    this.labels = [];
    this.lastCheckpoint = null;
    this.gloomRt = null;
    this.gloomBrush = null;
  }

  create(): void {
    if (!Save.hasActive()) { this.scene.start('IslesSlotScene'); return; }
    const s = Save.S();
    const areaId = this.initData.area ?? s.area;
    const def = getArea(areaId) ?? getArea('emberport') ?? allAreas()[0];
    this.def = def;
    this.rng = mulberry(hashStr(def.id));
    Music.play('campaign');
    Quests.bindNpcNames((id) => this.npcName(id));

    this.cameras.main.setBackgroundColor(def.bg);

    this.bakeGround();
    this.gAnim = this.add.graphics().setDepth(-9000);
    this.gHaz = this.add.graphics().setDepth(-8500);
    this.gMarks = this.add.graphics().setDepth(-8000);
    this.gPoi = this.add.graphics().setDepth(-7000);
    this.gOver = this.add.graphics().setDepth(9000);
    this.buildPieces();
    this.placePlayer();
    this.buildExits();
    this.buildNpcs();
    this.buildCrowd();
    this.buildChampions();
    this.buildBosses();
    this.buildInteractables();
    if (def.gloom) this.buildGloom();

    this.updateCamera(true);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE,ENTER,TAB,G,M,ESC,Q,I') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture('TAB,SPACE');
    this.dialogue = new WorldDialogue(this);
    this.ledger = new LedgerPanel(this);
    this.fishing = new Fishing(this);
    this.buildHud();
    this.input.on('pointerdown', () => {
      if (this.dialogue.isOpen) this.dialogue.advance();
    });

    const onResume = () => { this.graceUntil = this.time.now + 150; this.refreshHud(); };
    this.events.on('resume', onResume);
    // Scene events outlive a restart — unhook so returning to an area doesn't stack handlers.
    this.events.once('shutdown', () => this.events.off('resume', onResume));

    this.graceUntil = this.time.now + 400;
    this.saveAt = this.time.now + 4000;
    Save.setPlace(def.id, { x: this.px, y: this.py });
    if (Save.touchWaystone(def.id)) { /* areas are discovered by visiting */ }
    this.areaBanner();
    this.cameras.main.fadeIn(350, 0, 0, 0);
    if (!Save.hasFlag('isles-prologue')) this.time.delayedCall(900, () => this.prologue());
  }

  /** First landfall: the ferryman who rowed you in, and the shape of the whole campaign. */
  private prologue(): void {
    Save.setFlag('isles-prologue');
    const look: NpcLook = { body: 0x6a5a4a, accent: 0x2a2a34, hat: 'hood', traits: ['lantern', 'beard'], size: 1.1 };
    this.dialogue.open({
      name: 'The Ferryman', title: 'who rowed you in', look, accent: 0x8a9ab8,
      lines: [
        'Brandmark. End of the line — nobody pays me enough to row any closer to that smoke.',
        'Ten isles out here, and ten crowned tyrants sat on them. This one is King Ashgrave. Brands his people like cattle.',
        'His six children run the courts for him. Beat a court\'s five champions and its prince has to face you himself.',
        'Free all six courts and the Kiln up the mountain opens. Then it\'s you and the Brand-King.',
        'Folk here need help. Help them — they pay in Orbs, and Orbs grow your genes. Press G once you have a few.',
        'TAB is your bag, M your map. Touch the waystones and they\'ll carry you back across the isle.',
        'And past all ten isles, they say, a black spire waits. Good luck, wanderer.',
      ],
      onDone: () => this.toast('📜 Look for someone in Emberport who needs a hand.'),
    });
  }

  // ── Building ─────────────────────────────────────────────────────────

  private bakeGround(): void {
    const def = this.def;
    const g = this.make.graphics({}, false);
    try { def.painter.ground(g, mulberry(hashStr(def.id + ':ground'))); } catch (e) { console.error('[isles] ground painter failed', def.id, e); g.fillStyle(def.bg, 1); g.fillRect(0, 0, def.w, def.h); }
    const rt = this.add.renderTexture(0, 0, def.w, def.h).setOrigin(0, 0).setDepth(-10000);
    rt.draw(g);
    g.destroy();
  }

  private buildPieces(): void {
    const r = mulberry(hashStr(this.def.id + ':pieces'));
    for (const p of this.def.painter.pieces ?? []) {
      const g = this.add.graphics().setDepth(p.y);
      try { p.draw(g, r); } catch (e) { console.error('[isles] piece failed', this.def.id, e); }
      this.pieces.push({ g, x0: p.x - p.w / 2 - 20, y0: p.y - p.h - 20, x1: p.x + p.w / 2 + 20, y1: p.y + 40 });
    }
  }

  private placePlayer(): void {
    const def = this.def;
    const s = Save.S();
    let p: Pt | null = null;
    const d = this.initData;
    if (d.pos && d.pos.x >= 0) p = { ...d.pos };
    else if (d.arriveFrom) {
      const ex = def.exits.find((e) => e.to === d.arriveFrom);
      if (ex) p = this.exitInside(ex);
      const door = def.pois.find((q): q is Extract<Poi, { kind: 'door' }> => q.kind === 'door' && q.to === d.arriveFrom);
      if (!p && door) p = { x: door.at.x, y: door.at.y + 50 };
    } else if (s.area === def.id && s.pos.x >= 0) p = { ...s.pos };
    p ??= { ...def.spawn };
    this.px = p.x;
    this.py = p.y;
    this.resolveCollisions();
    this.walker = new TownWalker(this, s.element, this.px, this.py);
    this.lastCheckpoint = { x: this.px, y: this.py };
  }

  private exitRect(ex: AreaExit): Rect {
    const { w, h } = this.def;
    const at = ex.at ?? (ex.side === 'n' || ex.side === 's' ? w / 2 : h / 2);
    switch (ex.side) {
      case 'n': return { x: at - EXIT_WIDTH / 2, y: -40, w: EXIT_WIDTH, h: 40 + 14 };
      case 's': return { x: at - EXIT_WIDTH / 2, y: h - 14, w: EXIT_WIDTH, h: 54 };
      case 'w': return { x: -40, y: at - EXIT_WIDTH / 2, w: 54, h: EXIT_WIDTH };
      case 'e': return { x: w - 14, y: at - EXIT_WIDTH / 2, w: 54, h: EXIT_WIDTH };
    }
  }

  private exitInside(ex: AreaExit): Pt {
    const { w, h } = this.def;
    const at = ex.at ?? (ex.side === 'n' || ex.side === 's' ? w / 2 : h / 2);
    switch (ex.side) {
      case 'n': return { x: at, y: 90 };
      case 's': return { x: at, y: h - 90 };
      case 'w': return { x: 90, y: at };
      case 'e': return { x: w - 90, y: at };
    }
  }

  private buildExits(): void {
    for (const ex of this.def.exits) {
      const open = Save.test(ex.open) && !!getArea(ex.to);
      this.exitRects.push({ exit: ex, rect: this.exitRect(ex), open });
      const inside = this.exitInside(ex);
      const lx = ex.side === 'w' ? 70 : ex.side === 'e' ? this.def.w - 70 : inside.x;
      const ly = ex.side === 'n' ? 40 : ex.side === 's' ? this.def.h - 40 : inside.y - 40;
      const dest = getArea(ex.to);
      const arrow = { n: '▲', s: '▼', w: '◀', e: '▶' }[ex.side];
      const t = this.add.text(lx, ly, `${arrow} ${ex.label}${open ? '' : '  🔒'}`, {
        fontFamily: FONT_DISPLAY, fontSize: '13px', color: open ? '#ffe2b0' : '#c88a7a', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(9100);
      if (!dest) t.setText(`${arrow} ${ex.label}  (uncharted)`);
      this.labels.push(t);
    }
  }

  private presentNpcs(): NpcDef[] {
    return this.def.npcs.filter((n) => Save.test(n.present));
  }

  private buildNpcs(): void {
    for (const n of this.presentNpcs()) this.actors.push(this.makeActor(n));
    // The wanderer stands a little way in from where you arrived.
    const isleId = isleOf(this.def.id);
    const w = isleId ? getWanderer(isleId) : undefined;
    if (w) {
      const near = { x: this.px + 110, y: this.py - 40 };
      const spot = this.freeSpotNear(near);
      const def: NpcDef = {
        id: w.id, name: w.name, title: w.title, look: w.look, at: spot, wander: 140, talks: [],
      };
      const a = this.makeActor(def);
      a.wanderer = true;
      this.actors.push(a);
    }
  }

  private freeSpotNear(p: Pt): Pt {
    for (let k = 0; k < 24; k++) {
      const a = k * 0.9, r = 40 + k * 14;
      const q = { x: Phaser.Math.Clamp(p.x + Math.cos(a) * r, 60, this.def.w - 60), y: Phaser.Math.Clamp(p.y + Math.sin(a) * r, 60, this.def.h - 60) };
      if (!this.blocked(q.x, q.y, 16)) return q;
    }
    return { ...p };
  }

  private makeActor(n: NpcDef): Actor {
    const plate = this.add.text(n.at.x, n.at.y - 54 * (n.look.size ?? 1), n.name, {
      fontFamily: FONT_UI, fontSize: '11px', color: '#fff3dc', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9200).setAlpha(0);
    return {
      def: n, x: n.at.x, y: n.at.y, tx: n.at.x, ty: n.at.y, moving: false, idleUntil: 0, look: Math.PI / 2,
      g: this.add.graphics().setDepth(n.at.y), plate, bubble: null, nextBark: this.time.now + 2000 + Math.random() * 6000, talking: false,
    };
  }

  private buildCrowd(): void {
    const c = this.def.crowd;
    if (!c || !c.paths.length || !c.looks.length) return;
    const r = this.rng;
    for (let i = 0; i < c.count; i++) {
      const path = c.paths[i % c.paths.length];
      if (path.length < 2) continue;
      const seg = Math.floor(r() * (path.length - 1));
      const w: CrowdWalker = {
        look: c.looks[Math.floor(r() * c.looks.length)], path, seg, t: r(), dir: r() < 0.5 ? 1 : -1,
        speed: 30 + r() * 28, x: 0, y: 0, g: this.add.graphics(), idleUntil: 0, bubble: null,
        nextBark: this.time.now + 3000 + r() * 9000,
      };
      this.placeCrowd(w);
      this.crowd.push(w);
    }
  }

  private placeCrowd(w: CrowdWalker): void {
    const a = w.path[w.seg], b = w.path[w.seg + 1];
    w.x = a.x + (b.x - a.x) * w.t;
    w.y = a.y + (b.y - a.y) * w.t;
  }

  private buildChampions(): void {
    const court = courtOfArea(this.def.id);
    const encs: EncounterDef[] = court ? [...court.encounters] : [];
    for (const p of this.def.pois) if (p.kind === 'encounter') { const e = getEncounter(p.id); if (e && !encs.includes(e)) encs.push(e); }
    // A quest's own foe stands here only while that quest is waiting on the fight.
    for (const e of Quests.duelsIn(this.def.id)) if (!encs.includes(e)) encs.push(e);
    for (const enc of encs) this.addChampion(enc);
  }

  private addChampion(enc: EncounterDef): Champion {
    const beaten = !enc.quest && Save.S().encounters.includes(enc.id);
    const walker = new TownWalker(this, enc.foeElement, enc.at.x, enc.at.y, { bare: true });
    if (beaten) walker.container.setAlpha(0.55);
    const plate = this.add.text(enc.at.x, enc.at.y - 62, beaten ? `${enc.foeName}` : `⚔ ${enc.foeName}\n${enc.name}`, {
      fontFamily: FONT_UI, fontSize: '11px', color: beaten ? '#a8a090' : enc.quest ? '#9dd8ff' : '#ffcf9a', stroke: '#000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5, 1).setDepth(9200);
    const c: Champion = { enc, walker, plate, beaten };
    this.champions.push(c);
    return c;
  }

  private championInteractable(c: Champion): Interactable {
    return {
      x: c.enc.at.x, y: c.enc.at.y, r: REACH + 6, prio: 2,
      label: () => (c.beaten ? `${c.enc.foeName} (beaten)` : `Challenge ${c.enc.foeName}`),
      use: () => this.approachChampion(c),
    };
  }

  /** A quest that just reached (or left) its duel stage: stand its foe up, or send them off. */
  private syncDuels(): void {
    const live = Quests.duelsIn(this.def.id);
    for (const c of [...this.champions]) {
      if (!c.enc.quest || live.includes(c.enc)) continue;
      c.walker.destroy();
      c.plate.destroy();
      this.champions.splice(this.champions.indexOf(c), 1);
      this.interactables = this.interactables.filter((it) => it.championOf !== c);
    }
    for (const enc of live) {
      if (this.champions.some((c) => c.enc === enc)) continue;
      const c = this.addChampion(enc);
      this.interactables.push({ ...this.championInteractable(c), championOf: c });
      Sfx.play('whoosh');
    }
  }

  private buildBosses(): void {
    for (const p of this.def.pois) {
      if (p.kind !== 'prince' && p.kind !== 'monarch') continue;
      const done = p.kind === 'prince' ? Save.S().princes.includes(p.id) : Save.S().monarchs.includes(p.id);
      if (done) continue;
      const def = getIslesBoss(bossIdFor(p.id));
      if (!def) continue;
      const rig = new BossRig();
      rig.reset(p.at.x, p.at.y - 40);
      const plate = this.add.text(p.at.x, p.at.y - 112, `${def.name}\n${def.title}`, {
        fontFamily: FONT_DISPLAY, fontSize: '12px', color: '#ffb47a', stroke: '#000', strokeThickness: 4, align: 'center',
      }).setOrigin(0.5, 1).setDepth(9200);
      this.bosses.push({ kind: p.kind, id: p.id, at: p.at, def, rig, g: this.add.graphics().setDepth(p.at.y), plate });
    }
  }

  private buildGloom(): void {
    const W = this.scale.width, H = this.scale.height;
    this.gloomRt = this.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setScrollFactor(0).setDepth(9800);
    const b = this.make.graphics({}, false);
    for (let k = 14; k >= 1; k--) { b.fillStyle(0xffffff, 0.09); b.fillCircle(170, 170, 12 * k); }
    this.gloomBrush = b;
  }

  // ── Interactables ────────────────────────────────────────────────────

  private buildInteractables(): void {
    const list: Interactable[] = [];
    for (const a of this.actors) {
      list.push({ x: a.x, y: a.y, r: REACH, prio: 1, src: a, label: () => `Talk to ${a.def.name}`, use: () => this.talkTo(a) });
    }
    for (const c of this.champions) list.push({ ...this.championInteractable(c), championOf: c });
    for (const b of this.bosses) {
      list.push({ x: b.at.x, y: b.at.y, r: REACH + 30, prio: 2, label: () => `Face ${b.def.name}`, use: () => this.approachBoss(b) });
    }
    for (const p of this.def.pois) {
      switch (p.kind) {
        case 'waystone':
          list.push({ x: p.at.x, y: p.at.y, r: REACH, prio: 3, label: () => 'Waystone — fast travel', use: () => this.useWaystone() });
          break;
        case 'sign':
          list.push({ x: p.at.x, y: p.at.y, r: REACH - 10, prio: 4, label: () => 'Read sign', use: () => this.dialogue.open({ name: 'Signpost', lines: [p.text], accent: 0xc8a06a, portrait: signPortrait }) });
          break;
        case 'chest':
          list.push({
            x: p.at.x, y: p.at.y, r: REACH - 10, prio: 3,
            label: () => (Save.S().chests.includes(p.id) ? 'Empty chest' : Save.test(p.open) ? 'Open chest' : 'Locked chest'),
            use: () => this.openChest(p),
          });
          break;
        case 'door':
          list.push({ x: p.at.x, y: p.at.y, r: REACH + 10, prio: 2, label: () => (Save.test(p.open) ? p.label : `${p.label} (sealed)`), use: () => this.useDoor(p) });
          break;
        case 'lever':
          list.push({ x: p.at.x, y: p.at.y, r: REACH - 10, prio: 2, label: () => (Save.hasFlag(p.flag) ? `${p.label} (pulled)` : `Pull: ${p.label}`), use: () => this.pullLever(p) });
          break;
        case 'mooring':
          list.push({ x: p.at.x, y: p.at.y, r: REACH + 10, prio: 3, label: () => 'Mooring — boats & sailing', use: () => this.openDockPanel() });
          break;
        default: break;
      }
    }
    this.interactables = list;
  }

  private nearestInteractable(): Interactable | null {
    let best: Interactable | null = null;
    let bd = Infinity;
    for (const it of this.interactables) {
      if (it.src) { it.x = it.src.x; it.y = it.src.y; }
      const d = Math.hypot(it.x - this.px, it.y - this.py);
      if (d > it.r) continue;
      const score = d + it.prio * 6;
      if (score < bd) { bd = score; best = it; }
    }
    if (best) return best;
    // Water: anywhere near a fishing shape.
    for (const p of this.def.pois) {
      if (p.kind !== 'water') continue;
      const q = nearestInRect(p.shape, this.px, this.py);
      if (Math.hypot(q.x - this.px, q.y - this.py) <= 64) {
        return { x: q.x, y: q.y, r: 64, prio: 5, label: () => 'Fish here', use: () => this.startFishing(p) };
      }
    }
    return null;
  }

  // ── Talk ─────────────────────────────────────────────────────────────

  private npcName(id: string): string {
    for (const a of allAreas()) {
      const n = a.npcs.find((x) => x.id === id);
      if (n) return n.name;
    }
    return id;
  }

  private pickTalk(key: string, blocks: Talk[]): Talk | null {
    const holding = blocks.filter((b) => Save.test(b.when));
    if (!holding.length) return null;
    // State-specific blocks first (they react to what just happened); after that, rotate.
    const n = TALKS.get(key) ?? 0;
    TALKS.set(key, n + 1);
    const specific = holding.filter((b) => b.when && !(b.sets && Save.hasFlag(b.sets)));
    if (n === 0 && specific.length) return specific[0];
    return holding[n % holding.length];
  }

  private say(a: Actor, o: Omit<DialogueOpts, 'name' | 'look'>): void {
    a.talking = true;
    a.look = Math.atan2(this.py - a.y, this.px - a.x);
    this.dialogue.open({
      name: a.def.name, title: a.def.title, look: a.def.look, accent: a.def.look.accent, ...o,
      onDone: () => { a.talking = false; o.onDone?.(); },
    });
  }

  private talkTo(a: Actor): void {
    if (a.wanderer) { this.talkWanderer(a); return; }
    const id = a.def.id;
    // 1. A live quest wants this conversation.
    const obj = Quests.talkObjectiveFor(id);
    if (obj && (obj.o.kind === 'talk' || obj.o.kind === 'deliver')) {
      this.say(a, { lines: obj.o.lines, onDone: () => { this.toastAll(obj.run()); this.afterQuestTalk(obj.q.id, a); } });
      return;
    }
    // 2. A quest from them is ready to hand in.
    const ready = allQuests().find((q) => q.giver === id && Quests.isReady(q));
    if (ready) {
      this.say(a, { lines: ready.complete, onDone: () => this.toastAll(Quests.complete(ready)) });
      return;
    }
    // 3. They have something to ask of you.
    const offer = allQuests().find((q) => q.giver === id && Quests.offerable(q));
    if (offer) {
      this.say(a, {
        lines: offer.offer,
        choices: [
          { label: `Accept: ${offer.name}`, pick: () => {
            Quests.accept(offer.id);
            Sfx.play('unlock');
            this.say(a, { lines: offer.accept, onDone: () => this.toast(`📜 New quest — ${offer.name}`) });
          } },
          { label: 'Not now', pick: () => {} },
        ],
      });
      return;
    }
    // 4. Small talk, then the counter if they keep one.
    const block = this.pickTalk(id, a.def.talks);
    const lines = block?.lines ?? ['…'];
    const active = allQuests().find((q) => q.giver === id && Quests.isActive(q.id));
    const remind = active && !Quests.isReady(active) ? [`(${active.name}: ${active.stages[Quests.state(active.id)!.stage]?.hint ?? ''})`] : [];
    const role = a.def.role;
    this.say(a, {
      lines: [...lines, ...remind],
      choices: role ? [{ label: roleVerb(role.kind), pick: () => this.openRole(role.kind, role.id, a.def.look.accent) }, { label: 'Leave', pick: () => {} }] : undefined,
      onDone: () => { if (block?.sets) Save.setFlag(block.sets); },
    });
  }

  private afterQuestTalk(_q: string, _a: Actor): void { this.refreshHud(); }

  private talkWanderer(a: Actor): void {
    const isleId = isleOf(this.def.id);
    const w = isleId ? getWanderer(isleId) : undefined;
    if (!w) return;
    const areaBlocks = w.byArea[this.def.id] ?? [];
    const n = TALKS.get(`wanderer:${this.def.id}`) ?? 0;
    const block = (n % 3 !== 2 ? this.pickTalk(`wanderer:${this.def.id}`, areaBlocks) : null)
      ?? this.pickTalk('wanderer:general', w.general);
    if (n % 3 === 2) TALKS.set(`wanderer:${this.def.id}`, n + 1);
    this.say(a, { lines: block?.lines ?? ['Mind how you go.'], onDone: () => { if (block?.sets) Save.setFlag(block.sets); } });
  }

  private openRole(kind: string, id: string, accent: number): void {
    if (kind === 'shop' || kind === 'tackle' || kind === 'banker') openShop(this.ledger, id, accent, () => this.refreshHud());
    else if (kind === 'bakery') openBakery(this.ledger, id, accent, () => this.refreshHud(), (l) => this.toast(l));
    else if (kind === 'dock') this.openDockPanel();
  }

  private openDockPanel(): void {
    openDock(this.ledger, 0x6ac8ff, isleOf(this.def.id) ?? 'fire', (dest) => {
      this.ledger.close();
      this.sail(dest);
    }, () => this.refreshHud());
  }

  private sail(dest: string): void {
    if (!Save.S().boat.owned) { this.toast('You need a boat.'); return; }
    Save.setPlace(this.def.id, { x: this.px, y: this.py });
    this.leaving = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SeaVoyageScene', { dest, from: this.def.id, pos: { x: this.px, y: this.py } });
    });
  }

  // ── Fights ───────────────────────────────────────────────────────────

  private approachChampion(c: Champion): void {
    const e = c.enc;
    const portrait = (g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, talking: boolean) =>
      drawNpc(g, e.look, { x, y, t, look: 0.4, moving: false, talking, scale: 2.7 });
    const lines = c.beaten ? e.beaten : e.challenge;
    const gimmick = `“${e.name}” — difficulty ${'★'.repeat(e.difficulty)}${'☆'.repeat(5 - e.difficulty)}`;
    this.dialogue.open({
      name: e.foeName, title: gimmick, portrait, accent: 0xff7a4a, lines,
      choices: [
        { label: c.beaten ? 'Rematch' : 'Fight!', pick: () => this.launchFight({ kind: getCourt(e.court) ? 'encounter' : 'warden', id: e.id, court: e.court }, e.foeElement, e.difficulty) },
        { label: 'Not yet', pick: () => {} },
      ],
    });
  }

  private approachBoss(b: BossStand): void {
    const portrait = (g: Phaser.GameObjects.Graphics, x: number, y: number, t: number) => this.drawBossAt(g, b, x, y - 40, t, 1.4);
    if (b.kind === 'prince') {
      const court = courtOfArea(this.def.id) ?? [...allAreas()].map((a) => courtOfArea(a.id)).find((c) => c?.prince.id === b.id);
      const ready = court ? Save.courtReady(court.id) : true;
      if (!ready && court) {
        const n = court.encounters.filter((e) => Save.S().encounters.includes(e.id)).length;
        this.dialogue.open({
          name: b.def.name, title: b.def.title, portrait, accent: b.def.color,
          lines: [b.def.intro[0] ?? '…', `(The gate stays shut until all five of ${court.name}'s champions fall — ${n}/5.)`],
        });
        return;
      }
      this.dialogue.open({
        name: b.def.name, title: b.def.title, portrait, accent: b.def.color,
        lines: [...b.def.intro.slice(0, 2)],
        choices: [
          { label: `Fight ${b.def.name}`, pick: () => this.launchFight({ kind: 'prince', id: b.id, court: court?.id }, court?.element ?? 'fire', 4) },
          { label: 'Not yet', pick: () => {} },
        ],
      });
    } else {
      const isle = getIsle(isleOf(this.def.id) ?? '');
      this.dialogue.open({
        name: b.def.name, title: b.def.title, portrait, accent: b.def.color,
        lines: [...b.def.intro],
        choices: [
          { label: `Challenge the ${isle ? 'monarch of ' + isle.name : 'monarch'}`, pick: () => this.launchFight({ kind: 'monarch', id: b.id, court: this.def.id }, isle?.element ?? 'fire', 5) },
          { label: 'Not yet', pick: () => {} },
        ],
      });
    }
  }

  private launchFight(p: { kind: IslesFightPayload['kind']; id: string; court?: string }, foeElement: string, difficulty: number): void {
    const s = Save.S();
    Save.setPlace(this.def.id, { x: this.px, y: this.py });
    const payload: IslesFightPayload = {
      slot: Save.activeIndex(), kind: p.kind, id: p.id, court: p.court, area: this.def.id,
      pos: { x: Math.round(this.px), y: Math.round(this.py) }, hard: s.hard,
    };
    const meal = prepareLoadout();
    if (meal) { Save.take(meal, 1); s.meal = Save.count(meal) > 0 ? meal : null; Save.persist(); }
    const boss = p.kind === 'prince' || p.kind === 'monarch';
    this.leaving = true;
    Sfx.play('boss-intro');
    this.cameras.main.flash(200, 255, 140, 60);
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('ArenaScene', {
        elementId: s.element,
        enemyElementId: foeElement,
        difficulty: Math.min(5, difficulty + (s.hard ? 1 : 0)),
        mode: boss ? 'worldboss' : undefined,
        bossId: boss ? bossIdFor(p.id) : undefined,
        isles: payload,
        playerPerk: PlayerData.getEquippedPerk(s.element),
      });
    });
  }

  // ── POI uses ─────────────────────────────────────────────────────────

  private useWaystone(): void {
    const fresh = Save.touchWaystone(this.def.id);
    if (fresh) { Sfx.play('unlock'); this.toast('✦ Waystone attuned'); }
    this.openMap();
  }

  private openChest(p: Extract<Poi, { kind: 'chest' }>): void {
    const s = Save.S();
    if (s.chests.includes(p.id)) { this.toast('Empty.'); return; }
    if (!Save.test(p.open)) { this.toast('Locked tight.'); Sfx.play('ui-denied'); return; }
    s.chests.push(p.id);
    const got: string[] = [];
    if (p.coins) { Save.addCoins(p.coins); got.push(`+${p.coins} 🪙`); }
    if (p.orbs) { Save.addOrbs(p.orbs); got.push(`+${p.orbs} 🔮`); }
    if (p.item) { Save.give(p.item, 1); const it = getIsleItem(p.item); got.push(`${it?.emoji ?? '🎁'} ${it?.name ?? p.item}`); }
    Save.persist();
    Sfx.play('reward-big');
    this.toast(`Chest: ${got.join('  ')}`);
    this.refreshHud();
  }

  private useDoor(p: Extract<Poi, { kind: 'door' }>): void {
    if (!Save.test(p.open)) {
      this.dialogue.open({ name: p.label, lines: [p.lockedText ?? 'Sealed.'], accent: 0x8a5a3a, portrait: signPortrait });
      return;
    }
    this.travel(p.to, { pos: p.arrive });
  }

  private pullLever(p: Extract<Poi, { kind: 'lever' }>): void {
    if (Save.hasFlag(p.flag)) { this.toast('Already pulled.'); return; }
    Save.setFlag(p.flag);
    Sfx.play('gear-turn');
    this.cameras.main.shake(180, 0.004);
    this.toast(`⚙ ${p.label}`);
  }

  private startFishing(p: Extract<Poi, { kind: 'water' }>): void {
    const why = Fishing.blocker(p.fishery);
    if (why) { this.toast(why); Sfx.play('ui-denied'); return; }
    const q = nearestInRect(p.shape, this.px, this.py);
    const dx = q.x - this.px, dy = q.y - this.py;
    const d = Math.hypot(dx, dy) || 1;
    const to = clampInRect(p.shape, { x: q.x + (dx / d) * 50, y: q.y + (dy / d) * 50 });
    this.facing = Math.atan2(dy, dx);
    this.fishing.start(p.fishery, { x: this.px, y: this.py }, to, (msg) => { this.toastAll(msg); this.refreshHud(); });
  }

  private openMap(): void {
    Save.setPlace(this.def.id, { x: this.px, y: this.py });
    this.scene.launch('IslesMapScene', { from: this.def.id });
    this.scene.pause();
  }

  private openOverlay(key: string): void {
    Save.setPlace(this.def.id, { x: this.px, y: this.py });
    this.scene.launch(key, { caller: 'IsleWorldScene' });
    this.scene.pause();
  }

  /** Go to another area. */
  travel(to: string, o: { arriveFrom?: string; pos?: Pt }): void {
    if (this.leaving) return;
    this.leaving = true;
    Sfx.play('whoosh');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const s = Save.S();
      s.area = to;
      s.pos = o.pos ? { ...o.pos } : { x: -1, y: -1 };
      Save.persist();
      this.scene.restart({ area: to, arriveFrom: o.arriveFrom, pos: o.pos });
    });
  }

  // ── Frame ────────────────────────────────────────────────────────────

  update(_time: number, deltaRaw: number): void {
    if (this.leaving || !this.def) return;
    const dt = Math.min(deltaRaw, 50);
    const now = this.time.now;
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    const act = JD(k.E) || JD(k.SPACE) || JD(k.ENTER);
    const back = JD(k.ESC) || JD(k.Q);
    const up = JD(k.W) || JD(k.UP), down = JD(k.S) || JD(k.DOWN), left = JD(k.A) || JD(k.LEFT), right = JD(k.D) || JD(k.RIGHT);

    this.dialogue.update(dt);
    this.ledger.update();

    if (this.ledger.isOpen) {
      if (up) this.ledger.key('up');
      if (down) this.ledger.key('down');
      if (left || JD(k.TAB)) this.ledger.key(left ? 'left' : 'right');
      if (right) this.ledger.key('right');
      if (act) this.ledger.key('act');
      if (back) this.ledger.key('back');
      this.animateWorld(now, dt, false);
      return;
    }
    if (this.dialogue.isOpen) {
      if (up) this.dialogue.move(-1);
      if (down) this.dialogue.move(1);
      if (act) this.dialogue.advance();
      if (back) this.dialogue.close();
      this.animateWorld(now, dt, false);
      return;
    }
    if (this.fishing.busy) {
      this.fishing.update(dt, act, k.E.isDown || k.SPACE.isDown, back);
      this.animateWorld(now, dt, false);
      return;
    }
    if (now < this.graceUntil) { this.animateWorld(now, dt, false); return; }

    if (JD(k.TAB) || JD(k.I)) { this.openOverlay('IslesInventoryScene'); return; }
    if (JD(k.G)) { this.openOverlay('IslesGeneScene'); return; }
    if (JD(k.M)) { this.openMap(); return; }
    if (back) { this.pauseMenu(); return; }

    // Movement
    let vx = 0, vy = 0;
    if (k.A.isDown || k.LEFT.isDown) vx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) vx += 1;
    if (k.W.isDown || k.UP.isDown) vy -= 1;
    if (k.S.isDown || k.DOWN.isDown) vy += 1;
    this.moving = vx !== 0 || vy !== 0;
    if (this.moving) {
      const len = Math.hypot(vx, vy);
      const sp = (k.SHIFT.isDown ? RUN : WALK) * dt / 1000;
      this.px += (vx / len) * sp;
      this.py += (vy / len) * sp;
      this.facing = Math.atan2(vy, vx);
    }
    this.applyConveyors(dt);
    this.resolveCollisions();
    this.checkExits();
    this.checkHazards(now);
    this.checkPickups();

    this.current = this.nearestInteractable();
    if (act && this.current) { Sfx.play('ui-click'); this.current.use(); }

    if (now > this.saveAt) { Save.setPlace(this.def.id, { x: this.px, y: this.py }); this.saveAt = now + 4000; }
    this.animateWorld(now, dt, true);
  }

  private pauseMenu(): void {
    this.dialogue.open({
      name: 'Paused', lines: ['The isle waits for you.'], accent: 0xc8a06a, portrait: signPortrait,
      choices: [
        { label: 'Resume', pick: () => {} },
        { label: 'Isle map (M)', pick: () => this.openMap() },
        { label: 'Inventory (TAB)', pick: () => this.openOverlay('IslesInventoryScene') },
        { label: 'Save & quit to title', pick: () => { Save.setPlace(this.def.id, { x: this.px, y: this.py }); this.scene.start('TitleScene'); } },
      ],
    });
  }

  /**
   * Keep the walker centred, clamped to the area. Done by hand rather than with startFollow /
   * setBounds: the supersampled camera is really 1920×1280, so Phaser's follow and bounds maths
   * would park the player off-centre (see src/render/SuperSample.ts).
   */
  private updateCamera(snap: boolean): void {
    const cam = this.cameras.main;
    const { width, height } = this.scale;
    const clamp = (v: number, span: number, view: number) => (span <= view ? (span - view) / 2 : Math.max(0, Math.min(span - view, v)));
    const tx = clamp(this.px - width / 2, this.def.w, width);
    const ty = clamp(this.py - height / 2 - 14, this.def.h, height);
    const k = snap || Math.abs(cam.scrollX - tx) > 300 || Math.abs(cam.scrollY - ty) > 300 ? 1 : 0.16;
    cam.setScroll(Math.round((cam.scrollX + (tx - cam.scrollX) * k) * 2) / 2, Math.round((cam.scrollY + (ty - cam.scrollY) * k) * 2) / 2);
  }

  private animateWorld(now: number, dt: number, live: boolean): void {
    const t = now / 1000;
    const cam = this.cameras.main;
    const view: Rect = { x: cam.scrollX - 60, y: cam.scrollY - 60, w: this.scale.width + 120, h: this.scale.height + 120 };
    this.walker.update(dt, this.px, this.py, live && this.moving, this.facing);
    this.updateCamera(false);

    for (const p of this.pieces) p.g.setVisible(!(p.x1 < view.x || p.x0 > view.x + view.w || p.y1 < view.y || p.y0 > view.y + view.h));

    this.gAnim.clear(); this.gOver.clear();
    try { this.def.painter.animate?.(this.gAnim, t, view); } catch (e) { console.error(e); this.def.painter.animate = undefined; }
    try { this.def.painter.animateOver?.(this.gOver, t, view); } catch (e) { console.error(e); this.def.painter.animateOver = undefined; }
    this.drawWeather(t, view);
    this.drawPois(t, view);
    this.drawHazards(now, view);
    this.drawMarks(t);
    this.updateActors(dt, now, view);
    this.updateCrowd(dt, now, view);
    for (const c of this.champions) {
      const on = inView(view, c.enc.at.x, c.enc.at.y);
      c.walker.container.setVisible(on);
      c.plate.setVisible(on);
      if (on) c.walker.update(dt, c.enc.at.x, c.enc.at.y, false, Math.atan2(this.py - c.enc.at.y, this.px - c.enc.at.x));
    }
    for (const b of this.bosses) {
      const on = inView(view, b.at.x, b.at.y);
      b.g.clear();
      b.plate.setVisible(on);
      if (on) this.drawBossAt(b.g, b, b.at.x, b.at.y - 40, t, 1, dt);
    }
    this.drawGloom();
    this.updateHud(now);
  }

  private drawBossAt(g: Phaser.GameObjects.Graphics, b: BossStand, x: number, y: number, t: number, scale: number, dt = 16): void {
    const d = b.def;
    const palette = { main: d.color, lit: d.colorLit, dark: d.colorDark, accent: d.accent };
    const facing = Math.atan2(this.py - y, this.px - x);
    b.rig.update(dt, x, y, facing, d.look, 0, 0);
    const frame: BossRigFrame = { x, y, t, facing, look: d.look, palette, hpRatio: 1, enraged: false, hurt: false, castGlow: 0.15 + Math.sin(t * 2) * 0.1, phaseIdx: 0 };
    g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 46 * scale, 80 * scale, 22 * scale);
    for (let k = 4; k >= 1; k--) { g.fillStyle(d.color, 0.04); g.fillCircle(x, y, 40 + k * 14); }
    try {
      b.rig.draw(g, frame);
      d.drawDecor?.(g, {
        x, y, t, hpRatio: 1, enraged: false, hurt: false, phaseIdx: 0, hard: false, facing, castGlow: 0.2,
        radius: d.look.torsoR ?? 34, palette, look: d.look, hands: [b.rig.handAt(0), b.rig.handAt(1)],
      });
    } catch { /* a decor that needs fight state should never break the world */ }
  }

  private updateActors(dt: number, now: number, view: Rect): void {
    for (const a of this.actors) {
      const wander = a.def.wander ?? 0;
      if (wander > 0 && !a.talking) {
        if (!a.moving && now > a.idleUntil) {
          const ang = Math.random() * Math.PI * 2, r = Math.random() * wander;
          const tx = a.def.at.x + Math.cos(ang) * r, ty = a.def.at.y + Math.sin(ang) * r;
          if (!this.blocked(tx, ty, 12)) { a.tx = tx; a.ty = ty; a.moving = true; }
          else a.idleUntil = now + 500;
        }
        if (a.moving) {
          const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
          if (d < 3) { a.moving = false; a.idleUntil = now + 1500 + Math.random() * 3500; }
          else {
            const sp = 42 * dt / 1000;
            const nx = a.x + (dx / d) * sp, ny = a.y + (dy / d) * sp;
            if (this.blocked(nx, ny, 10)) { a.moving = false; a.idleUntil = now + 800; }
            else { a.x = nx; a.y = ny; a.look = Math.atan2(dy, dx); }
          }
        }
      } else a.moving = false;
      const dP = Math.hypot(this.px - a.x, this.py - a.y);
      if (dP < 160 && !a.moving) a.look = Math.atan2(this.py - a.y, this.px - a.x);
      const on = inView(view, a.x, a.y);
      a.g.clear();
      a.g.setDepth(a.y);
      if (on) drawNpc(a.g, a.def.look, { x: a.x, y: a.y, t: now / 1000 + a.def.at.x, look: a.look, moving: a.moving, talking: a.talking });
      a.plate.setPosition(a.x, a.y - 50 * (a.def.look.size ?? 1)).setAlpha(dP < 220 ? 1 : 0);
      // Barks
      if (a.bubble && now > a.bubble.until) { a.bubble.t.destroy(); a.bubble = null; }
      if (a.bubble) a.bubble.t.setPosition(a.x, a.y - 66 * (a.def.look.size ?? 1));
      if (!a.bubble && !a.talking && dP < 170 && now > a.nextBark && a.def.barks?.length) {
        const b = this.pickTalk(`bark:${a.def.id}`, a.def.barks);
        const line = b?.lines[Math.floor(Math.random() * b.lines.length)];
        if (line) a.bubble = { t: this.bubbleText(a.x, a.y - 66, line), until: now + 3600 };
        a.nextBark = now + 9000 + Math.random() * 9000;
      }
    }
  }

  private updateCrowd(dt: number, now: number, view: Rect): void {
    const barks = this.def.crowd?.barks ?? [];
    for (const w of this.crowd) {
      if (now > w.idleUntil) {
        const a = w.path[w.seg], b = w.path[w.seg + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        w.t += (w.dir * w.speed * dt / 1000) / len;
        if (w.t > 1) {
          if (w.seg < w.path.length - 2) { w.seg++; w.t = 0; } else { w.t = 1; w.dir = -1; w.idleUntil = now + 1000 + Math.random() * 3000; }
        } else if (w.t < 0) {
          if (w.seg > 0) { w.seg--; w.t = 1; } else { w.t = 0; w.dir = 1; w.idleUntil = now + 1000 + Math.random() * 3000; }
        } else if (Math.random() < 0.0015) w.idleUntil = now + 1500 + Math.random() * 2500;
        this.placeCrowd(w);
      }
      const on = inView(view, w.x, w.y);
      w.g.clear();
      w.g.setDepth(w.y);
      const a = w.path[w.seg], b = w.path[w.seg + 1];
      const moving = now > w.idleUntil;
      if (on) drawNpc(w.g, w.look, { x: w.x, y: w.y, t: now / 1000 + w.path[0].x * 0.01 + w.seg, look: Math.atan2((b.y - a.y) * w.dir, (b.x - a.x) * w.dir), moving });
      if (w.bubble && now > w.bubble.until) { w.bubble.t.destroy(); w.bubble = null; }
      if (w.bubble) w.bubble.t.setPosition(w.x, w.y - 62);
      const dP = Math.hypot(this.px - w.x, this.py - w.y);
      if (!w.bubble && dP < 150 && now > w.nextBark && barks.length) {
        const blk = this.pickTalk(`crowd:${this.def.id}`, barks);
        const line = blk?.lines[Math.floor(Math.random() * blk.lines.length)];
        if (line) w.bubble = { t: this.bubbleText(w.x, w.y - 62, line), until: now + 3400 };
        w.nextBark = now + 12000 + Math.random() * 12000;
      }
    }
  }

  private bubbleText(x: number, y: number, s: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, s, {
      fontFamily: FONT_UI, fontSize: '12px', color: '#2a1a0e', backgroundColor: '#f6ead2',
      padding: { x: 7, y: 4 }, wordWrap: { width: 220 }, align: 'center',
    }).setOrigin(0.5, 1).setDepth(9300);
  }

  private drawWeather(t: number, view: Rect): void {
    const g = this.gOver;
    switch (this.def.weather) {
      case 'ash': motes(g, view, t, 70, 0x9a9490, 26, 18, 1.6, 1); break;
      case 'embers': motes(g, view, t, 55, 0xff7a2a, -40, 26, 1.5, 2); motes(g, view, t, 25, 0xffd27a, -60, 14, 1, 3); break;
      case 'steam': motes(g, view, t, 26, 0xe8eef2, -18, 40, 5, 4); break;
      case 'smoke': motes(g, view, t, 30, 0x5a5450, -12, 30, 6, 5); break;
      case 'sparks': motes(g, view, t, 40, 0xd8b8ff, -50, 40, 1.2, 6); break;
      case 'wax': motes(g, view, t, 40, 0xffe8b0, 18, 10, 1.4, 7); break;
      case 'rain': for (let i = 0; i < 90; i++) { const x = view.x + ((i * 97 + t * 60) % view.w); const y = view.y + ((i * 53 + t * 700) % view.h); g.lineStyle(1, 0xaaccee, 0.4); g.lineBetween(x, y, x - 3, y + 12); } break;
      case 'snow': motes(g, view, t, 80, 0xffffff, 30, 30, 1.8, 8); break;
      case 'motes': motes(g, view, t, 40, 0xfff0c0, -8, 30, 1.3, 9); break;
      case 'spray': motes(g, view, t, 60, 0xe8f6ff, -70, -20, 1.4, 10); motes(g, view, t, 20, 0xffffff, -110, -30, 0.9, 11); break;
      case 'fog':
        for (let i = 0; i < 9; i++) {
          const x = view.x + ((i * 311 + t * 14) % (view.w + 400)) - 200, y = view.y + ((i * 173) % view.h);
          g.fillStyle(0xdce8f0, 0.07); g.fillEllipse(x, y, 380, 120); g.fillEllipse(x + 90, y - 20, 240, 80);
        }
        break;
      case 'bubbles':
        for (let i = 0; i < 46; i++) {
          const x = view.x + ((i * 89) % view.w) + Math.sin(t * 2 + i) * 6, y = view.y + view.h - ((i * 61 + t * (30 + (i % 5) * 9)) % view.h);
          g.lineStyle(1, 0xbfe8ff, 0.45); g.strokeCircle(x, y, 1.5 + (i % 4));
        }
        break;
      case 'ink': motes(g, view, t, 45, 0x14141c, 6, 22, 1.7, 12); break;
      default: break;
    }
  }

  private drawPois(t: number, view: Rect): void {
    const g = this.gPoi;
    g.clear();
    for (const p of this.def.pois) {
      const at = 'at' in p ? p.at : null;
      if (at && !inView(view, at.x, at.y)) continue;
      switch (p.kind) {
        case 'waystone': {
          const tuned = Save.S().waystones.includes(this.def.id);
          g.fillStyle(0x000000, 0.35); g.fillEllipse(at!.x, at!.y + 2, 46, 14);
          g.fillStyle(0x2a2630, 1); g.fillTriangle(at!.x - 16, at!.y, at!.x + 16, at!.y, at!.x, at!.y - 70);
          g.fillStyle(0x4a4458, 1); g.fillTriangle(at!.x - 11, at!.y - 4, at!.x + 11, at!.y - 4, at!.x, at!.y - 62);
          const pulse = 0.5 + Math.sin(t * 2.4) * 0.5;
          g.fillStyle(tuned ? 0x7ad8ff : 0x8a8aa0, 0.5 + pulse * 0.5); g.fillCircle(at!.x, at!.y - 30, 5);
          if (tuned) for (let k = 3; k >= 1; k--) { g.fillStyle(0x7ad8ff, 0.05); g.fillCircle(at!.x, at!.y - 30, 10 + k * 8 + pulse * 4); }
          break;
        }
        case 'sign':
          g.fillStyle(0x3a2614, 1); g.fillRect(at!.x - 2, at!.y - 36, 4, 36);
          g.fillStyle(0x8a6a44, 1); g.fillRoundedRect(at!.x - 20, at!.y - 46, 40, 20, 3);
          g.lineStyle(1, 0x3a2614, 1); g.lineBetween(at!.x - 13, at!.y - 39, at!.x + 13, at!.y - 39); g.lineBetween(at!.x - 13, at!.y - 33, at!.x + 8, at!.y - 33);
          break;
        case 'chest': {
          const open = Save.S().chests.includes(p.id);
          g.fillStyle(0x000000, 0.3); g.fillEllipse(at!.x, at!.y + 2, 40, 12);
          g.fillStyle(0x5a3618, 1); g.fillRect(at!.x - 16, at!.y - 20, 32, 20);
          g.fillStyle(open ? 0x2a1608 : 0x7a4a22, 1); g.fillRect(at!.x - 17, at!.y - (open ? 30 : 26), 34, open ? 6 : 9);
          g.fillStyle(0xe8b33a, 1); g.fillRect(at!.x - 3, at!.y - 18, 6, 7);
          if (!open) { g.fillStyle(0xffe08a, 0.25 + Math.sin(t * 3) * 0.2); g.fillCircle(at!.x, at!.y - 14, 18); }
          break;
        }
        case 'lever': {
          const on = Save.hasFlag(p.flag);
          g.fillStyle(0x3a3a40, 1); g.fillRect(at!.x - 10, at!.y - 10, 20, 10);
          g.lineStyle(4, 0x6a6a72, 1); g.lineBetween(at!.x, at!.y - 8, at!.x + (on ? 14 : -14), at!.y - 30);
          g.fillStyle(on ? 0x6aff9a : 0xff5a3a, 1); g.fillCircle(at!.x + (on ? 14 : -14), at!.y - 30, 5);
          break;
        }
        case 'door': {
          const open = Save.test(p.open);
          g.fillStyle(open ? 0xffa040 : 0x5a2a1a, open ? 0.2 + Math.sin(t * 2) * 0.1 : 0.15);
          g.fillCircle(at!.x, at!.y - 30, 48);
          break;
        }
        case 'mooring':
          g.fillStyle(0x3a2a1a, 1); g.fillCircle(at!.x, at!.y - 6, 8);
          g.lineStyle(2, 0xc8b088, 1); g.strokeCircle(at!.x, at!.y - 6, 11);
          break;
        case 'water':
          if (Save.S().rod) {
            const c = { x: p.shape.x + p.shape.w / 2, y: p.shape.y + p.shape.h / 2 };
            if (inView(view, c.x, c.y)) {
              const k = (t * 0.7) % 1;
              g.lineStyle(1.5, 0xffffff, (1 - k) * 0.35); g.strokeEllipse(c.x + Math.sin(t) * 30, c.y, 10 + k * 30, 4 + k * 10);
            }
          }
          break;
        default: break;
      }
    }
    // Gates
    for (const gt of this.def.gates ?? []) {
      if (Save.test(gt.open)) continue;
      const r = gt.rect;
      if (!inView(view, r.x + r.w / 2, r.y + r.h / 2) && !inView(view, r.x, r.y)) continue;
      const col = gt.look === 'wax' ? 0xe8d8a8 : gt.look === 'rubble' ? 0x5a4a40 : gt.look === 'barrier' ? 0xff7a2f
        : gt.look === 'ice' ? 0xbfe8f8 : gt.look === 'coral' ? 0xe87a8a : gt.look === 'sluice' ? 0x4a5a5a : 0x3a3a42;
      if (gt.look === 'portcullis' || gt.look === 'grate' || gt.look === 'sluice') {
        g.fillStyle(0x1a1a1e, 0.6); g.fillRect(r.x, r.y, r.w, r.h);
        g.lineStyle(4, col, 1);
        for (let x = r.x + 6; x < r.x + r.w; x += 14) g.lineBetween(x, r.y, x, r.y + r.h);
        for (let y = r.y + 8; y < r.y + r.h; y += 18) g.lineBetween(r.x, y, r.x + r.w, y);
      } else if (gt.look === 'ice') {
        g.fillStyle(col, 0.85); g.fillRoundedRect(r.x, r.y, r.w, r.h, 6);
        g.lineStyle(2, 0xffffff, 0.7);
        for (let x = r.x + 10; x < r.x + r.w - 6; x += 22) g.lineBetween(x, r.y + 4, x + 8, r.y + r.h - 4);
      } else if (gt.look === 'coral') {
        g.fillStyle(dim(col, 0.35), 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 10);
        g.fillStyle(col, 1);
        for (let x = r.x + 8; x < r.x + r.w; x += 16) for (let y = r.y + 8; y < r.y + r.h; y += 16) g.fillCircle(x + ((y / 16) % 2) * 6, y, 5);
      } else if (gt.look === 'barrier') {
        g.fillStyle(col, 0.25 + Math.sin(t * 5) * 0.1); g.fillRect(r.x, r.y, r.w, r.h);
        g.lineStyle(2, 0xffd27a, 0.8); g.strokeRect(r.x, r.y, r.w, r.h);
      } else {
        g.fillStyle(col, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 8);
        g.fillStyle(lit(col, 0.15), 1); g.fillRect(r.x + 4, r.y + 4, r.w - 8, 5);
      }
    }
    // Locked exits: barricades.
    for (const e of this.exitRects) {
      if (e.open) continue;
      const r = e.rect;
      const cx = Phaser.Math.Clamp(r.x + r.w / 2, 30, this.def.w - 30), cy = Phaser.Math.Clamp(r.y + r.h / 2, 30, this.def.h - 30);
      g.fillStyle(0x5a3a1e, 1);
      g.fillRect(cx - 40, cy - 8, 80, 10); g.fillRect(cx - 40, cy + 8, 80, 10);
      g.lineStyle(3, 0xd8a040, 1); g.lineBetween(cx - 34, cy - 8, cx - 22, cy + 18); g.lineBetween(cx + 22, cy - 8, cx + 34, cy + 18);
    }
  }

  private drawMarks(t: number): void {
    const g = this.gMarks;
    g.clear();
    for (const p of Quests.pickupsIn(this.def.id)) {
      const bob = Math.sin(t * 3 + p.spot) * 4;
      for (let k = 3; k >= 1; k--) { g.fillStyle(p.color, 0.08); g.fillCircle(p.x, p.y - 10 + bob, 8 + k * 6); }
      g.fillStyle(p.color, 1); g.fillCircle(p.x, p.y - 10 + bob, 6);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(p.x - 2, p.y - 12 + bob, 2);
    }
    for (const v of Quests.visitsIn(this.def.id)) {
      const k = (t * 0.5) % 1;
      g.lineStyle(2, 0x9dd8ff, (1 - k) * 0.6); g.strokeCircle(v.x, v.y, v.r * (0.4 + k * 0.6));
      g.fillStyle(0x9dd8ff, 0.12); g.fillCircle(v.x, v.y, v.r * 0.4);
    }
    // Quest markers over people: ! (offer), ? (ready / they're the next step).
    for (const a of this.actors) {
      let mark: string | null = null;
      if (allQuests().some((q) => q.giver === a.def.id && Quests.isReady(q))) mark = '?';
      else if (Quests.talkObjectiveFor(a.def.id)) mark = '?';
      else if (allQuests().some((q) => q.giver === a.def.id && Quests.offerable(q))) mark = '!';
      if (!mark) continue;
      const y = a.y - 58 * (a.def.look.size ?? 1) - 14 + Math.sin(t * 4) * 3;
      g.fillStyle(0x000000, 0.5); g.fillCircle(a.x, y, 10);
      g.fillStyle(mark === '!' ? 0xffd23a : 0x7ad8ff, 1); g.fillCircle(a.x, y, 8);
      g.fillStyle(0x2a1a08, 1);
      if (mark === '!') { g.fillRect(a.x - 1.5, y - 5, 3, 6); g.fillCircle(a.x, y + 4, 1.6); }
      else { g.fillCircle(a.x, y + 4, 1.6); g.lineStyle(2.2, 0x2a1a08, 1); g.beginPath(); g.arc(a.x, y - 2, 3, Math.PI, Math.PI * 2.4, false); g.strokePath(); }
    }
  }

  private hazardOn(h: WorldHazard, now: number): boolean {
    if (h.kind !== 'jet') return true;
    const ph = ((now + (h.offsetMs ?? 0)) % h.periodMs + h.periodMs) % h.periodMs;
    return ph < h.onMs;
  }

  private drawHazards(now: number, view: Rect): void {
    const g = this.gHaz;
    g.clear();
    const t = now / 1000;
    for (const h of this.def.hazards ?? []) {
      if (h.kind === 'jet') {
        const r = h.rect;
        if (!inView(view, r.x + r.w / 2, r.y + r.h / 2)) continue;
        const ph = ((now + (h.offsetMs ?? 0)) % h.periodMs + h.periodMs) % h.periodMs;
        const on = ph < h.onMs;
        const warn = !on && ph > h.periodMs - 600;
        const c = h.color ?? 0xff6a1a;
        g.fillStyle(0x1a0c06, 0.6); g.fillRect(r.x, r.y, r.w, r.h);
        if (warn) { g.fillStyle(c, 0.2 + Math.sin(t * 30) * 0.1); g.fillRect(r.x, r.y, r.w, r.h); }
        if (on) {
          g.fillStyle(c, 0.75); g.fillRect(r.x, r.y, r.w, r.h);
          g.fillStyle(lit(c, 0.5), 0.6);
          for (let i = 0; i < 8; i++) g.fillCircle(r.x + ((i * 37 + t * 300) % r.w), r.y + ((i * 53) % r.h), 4 + (i % 3) * 2);
        }
        g.lineStyle(2, dim(c, 0.3), 1); g.strokeRect(r.x, r.y, r.w, r.h);
      } else if (h.kind === 'sweeper') {
        if (!inView(view, h.x, h.y)) continue;
        const a = (h.phase ?? 0) + t * h.radPerSec;
        const c = h.color ?? 0xff7a2a;
        g.fillStyle(0x2a1a14, 1); g.fillCircle(h.x, h.y, 16);
        g.lineStyle(14, c, 0.75); g.lineBetween(h.x, h.y, h.x + Math.cos(a) * h.length, h.y + Math.sin(a) * h.length);
        g.lineStyle(5, 0xffe08a, 0.9); g.lineBetween(h.x, h.y, h.x + Math.cos(a) * h.length, h.y + Math.sin(a) * h.length);
      } else if (h.kind === 'conveyor') {
        const r = h.rect;
        if (!inView(view, r.x + r.w / 2, r.y + r.h / 2)) continue;
        if (h.look === 'current') {
          // A run of moving water: a faint channel with chevrons drifting the way it pulls.
          g.fillStyle(0x2a6a8a, 0.22); g.fillRect(r.x, r.y, r.w, r.h);
          const sp = Math.hypot(h.vx, h.vy) || 1, ux = h.vx / sp, uy = h.vy / sp;
          const step = 46, off = (t * sp * 0.6) % step;
          const len = Math.abs(ux) > Math.abs(uy) ? r.w : r.h;
          for (let d = off - step; d < len; d += step) {
            for (let k = 0.25; k < 1; k += 0.5) {
              const cx = Math.abs(ux) > Math.abs(uy) ? r.x + d : r.x + r.w * k;
              const cy = Math.abs(ux) > Math.abs(uy) ? r.y + r.h * k : r.y + d;
              if (cx < r.x || cx > r.x + r.w || cy < r.y || cy > r.y + r.h) continue;
              g.lineStyle(2, 0xbfe8ff, 0.45);
              g.lineBetween(cx - ux * 8 - uy * 7, cy - uy * 8 + ux * 7, cx, cy);
              g.lineBetween(cx - ux * 8 + uy * 7, cy - uy * 8 - ux * 7, cx, cy);
            }
          }
          continue;
        }
        g.fillStyle(0x2a2a30, 1); g.fillRect(r.x, r.y, r.w, r.h);
        const horiz = Math.abs(h.vx) > Math.abs(h.vy);
        g.lineStyle(2, 0x5a5a64, 1);
        const step = 22, off = ((t * (horiz ? h.vx : h.vy)) % step + step) % step;
        if (horiz) for (let x = r.x + off; x < r.x + r.w; x += step) g.lineBetween(x, r.y, x, r.y + r.h);
        else for (let y = r.y + off; y < r.y + r.h; y += step) g.lineBetween(r.x, y, r.x + r.w, y);
      } else if (h.kind === 'floor') {
        const r = h.rect;
        if (!inView(view, r.x + r.w / 2, r.y + r.h / 2)) continue;
        const safe = Save.test(h.safeWhen);
        const c = h.color ?? 0xff5a1a;
        g.fillStyle(safe ? 0x3a3a40 : c, safe ? 0.5 : 0.55 + Math.sin(t * 3) * 0.1); g.fillRect(r.x, r.y, r.w, r.h);
      }
    }
  }

  private drawGloom(): void {
    const rt = this.gloomRt;
    if (!rt || !this.gloomBrush) return;
    const cam = this.cameras.main;
    rt.clear();
    rt.fill(0x05030a, this.def.gloom ?? 0.5);
    rt.erase(this.gloomBrush, this.px - cam.scrollX - 170, this.py - cam.scrollY - 170 - 14);
    for (const h of this.def.hazards ?? []) {
      if (h.kind === 'jet' && this.hazardOn(h, this.time.now)) rt.erase(this.gloomBrush, h.rect.x + h.rect.w / 2 - cam.scrollX - 170, h.rect.y + h.rect.h / 2 - cam.scrollY - 170);
    }
  }

  // ── Physics-lite ─────────────────────────────────────────────────────

  private solidRects(): Rect[] {
    const out: Rect[] = [];
    for (const gt of this.def.gates ?? []) if (!Save.test(gt.open)) out.push(gt.rect);
    return out;
  }

  private blocked(x: number, y: number, r: number): boolean {
    if (x < r || y < r || x > this.def.w - r || y > this.def.h - r) return true;
    for (const s of this.def.solids) {
      if (s.kind === 'rect') {
        const qx = Phaser.Math.Clamp(x, s.x, s.x + s.w), qy = Phaser.Math.Clamp(y, s.y, s.y + s.h);
        if (Math.hypot(x - qx, y - qy) < r) return true;
      } else if (Math.hypot(x - s.x, y - s.y) < s.r + r) return true;
    }
    for (const s of this.solidRects()) {
      const qx = Phaser.Math.Clamp(x, s.x, s.x + s.w), qy = Phaser.Math.Clamp(y, s.y, s.y + s.h);
      if (Math.hypot(x - qx, y - qy) < r) return true;
    }
    return false;
  }

  private resolveCollisions(): void {
    const r = R_PLAYER;
    const push = (rect: Rect) => {
      const qx = Phaser.Math.Clamp(this.px, rect.x, rect.x + rect.w), qy = Phaser.Math.Clamp(this.py, rect.y, rect.y + rect.h);
      const dx = this.px - qx, dy = this.py - qy, d = Math.hypot(dx, dy);
      if (d >= r) return;
      if (d === 0) {
        // Inside: leave by the nearest face.
        const l = this.px - rect.x, rr = rect.x + rect.w - this.px, t = this.py - rect.y, b = rect.y + rect.h - this.py;
        const m = Math.min(l, rr, t, b);
        if (m === l) this.px = rect.x - r; else if (m === rr) this.px = rect.x + rect.w + r; else if (m === t) this.py = rect.y - r; else this.py = rect.y + rect.h + r;
        return;
      }
      this.px = qx + (dx / d) * r;
      this.py = qy + (dy / d) * r;
    };
    for (let pass = 0; pass < 2; pass++) {
      for (const s of this.def.solids) {
        if (s.kind === 'rect') push(s);
        else {
          const dx = this.px - s.x, dy = this.py - s.y, d = Math.hypot(dx, dy) || 0.001;
          if (d < s.r + r) { this.px = s.x + (dx / d) * (s.r + r); this.py = s.y + (dy / d) * (s.r + r); }
        }
      }
      for (const g of this.solidRects()) push(g);
      for (const e of this.exitRects) if (!e.open) push(e.rect);
    }
    // World edge — exits are the only way off.
    const inExit = this.exitRects.some((e) => e.open && rectHit(e.rect, this.px, this.py, r + 30));
    if (!inExit) {
      this.px = Phaser.Math.Clamp(this.px, r + 4, this.def.w - r - 4);
      this.py = Phaser.Math.Clamp(this.py, r + 4, this.def.h - r - 4);
    }
  }

  private checkExits(): void {
    for (const e of this.exitRects) {
      if (!e.open) {
        if (rectHit(e.rect, this.px, this.py, R_PLAYER + 30) && !this.dialogue.isOpen && this.time.now > this.graceUntil) {
          this.toastOnce(`locked:${e.exit.to}`, e.exit.lockedText ?? `The road to ${e.exit.label} is barred.`);
        }
        continue;
      }
      const outside = this.px < 0 || this.py < 0 || this.px > this.def.w || this.py > this.def.h;
      if (outside && rectHit(e.rect, this.px, this.py, 4)) {
        this.travel(e.exit.to, { arriveFrom: this.def.id });
        return;
      }
    }
  }

  private applyConveyors(dt: number): void {
    for (const h of this.def.hazards ?? []) {
      if (h.kind !== 'conveyor') continue;
      if (rectHit(h.rect, this.px, this.py, 0)) { this.px += h.vx * dt / 1000; this.py += h.vy * dt / 1000; }
    }
  }

  private checkHazards(now: number): void {
    for (const cp of this.def.checkpoints ?? []) {
      if (Math.hypot(cp.x - this.px, cp.y - this.py) < 60) this.lastCheckpoint = { ...cp };
    }
    let hit = false;
    for (const h of this.def.hazards ?? []) {
      if (h.kind === 'jet') hit = this.hazardOn(h, now) && rectHit(h.rect, this.px, this.py, R_PLAYER - 3);
      else if (h.kind === 'sweeper') {
        const a = (h.phase ?? 0) + (now / 1000) * h.radPerSec;
        const ex = h.x + Math.cos(a) * h.length, ey = h.y + Math.sin(a) * h.length;
        hit = distToSeg(this.px, this.py, h.x, h.y, ex, ey) < R_PLAYER + 5;
      } else if (h.kind === 'floor') hit = !Save.test(h.safeWhen) && rectHit(h.rect, this.px, this.py, -4);
      if (hit) break;
    }
    if (!hit) return;
    const cp = this.lastCheckpoint ?? this.def.spawn;
    // Each isle's dungeon catches you its own way.
    const wet = isleOf(this.def.id) === 'water';
    if (wet) this.cameras.main.flash(220, 90, 180, 255); else this.cameras.main.flash(220, 255, 90, 20);
    this.cameras.main.shake(160, 0.006);
    Sfx.play(wet ? 'splash' : 'status-burn');
    this.toast(wet ? '🌊 Swept under! Back to the last checkpoint.' : '🔥 Scorched! Back to the last checkpoint.');
    this.px = cp.x; this.py = cp.y;
    this.graceUntil = now + 500;
  }

  private checkPickups(): void {
    for (const p of Quests.pickupsIn(this.def.id)) {
      if (Math.hypot(p.x - this.px, p.y - this.py) < 28) {
        Sfx.play('sparkle');
        this.toastAll(Quests.notify({ kind: 'collect', quest: p.quest, spot: p.spot }));
      }
    }
    for (const v of Quests.visitsIn(this.def.id)) {
      if (Math.hypot(v.x - this.px, v.y - this.py) < v.r) this.toastAll(Quests.notify({ kind: 'visit', area: this.def.id, x: this.px, y: this.py }));
    }
  }

  // ── HUD ──────────────────────────────────────────────────────────────

  private buildHud(): void {
    const W = this.scale.width, H = this.scale.height;
    this.hudG = this.add.graphics().setScrollFactor(0).setDepth(HUD_Z);
    this.hudCoins = this.add.text(W - 16, 12, '', { fontFamily: FONT_MONO, fontSize: '15px', color: '#ffe2a8', stroke: '#000', strokeThickness: 4 }).setOrigin(1, 0).setScrollFactor(0).setDepth(HUD_Z + 1);
    this.hudArea = this.add.text(16, 12, '', { fontFamily: FONT_DISPLAY, fontSize: '15px', color: '#ffe2b0', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0).setDepth(HUD_Z + 1);
    this.hudTracker = this.add.text(W - 16, 44, '', { fontFamily: FONT_UI, fontSize: '12px', color: '#f2e2c8', stroke: '#000', strokeThickness: 3, align: 'right', wordWrap: { width: 270 } }).setOrigin(1, 0).setScrollFactor(0).setDepth(HUD_Z + 1);
    this.hudPrompt = this.add.text(W / 2, H - 46, '', { fontFamily: FONT_DISPLAY, fontSize: '15px', color: '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(HUD_Z + 1);
    this.add.text(16, H - 22, 'WASD move · SHIFT run · E interact · TAB bag · G genes · M map · ESC menu', { fontFamily: FONT_UI, fontSize: '11px', color: '#c8b898', stroke: '#000', strokeThickness: 3 }).setScrollFactor(0).setDepth(HUD_Z + 1);
    this.miniG = this.add.graphics().setScrollFactor(0).setDepth(HUD_Z);
    this.refreshHud();
  }

  private refreshHud(): void {
    if (!this.hudCoins || !Save.hasActive()) return;
    this.syncDuels();
    const s = Save.S();
    this.hudCoins.setText(`🪙 ${s.coins}   🔮 ${s.orbs}   🗝️ ${s.keys}`);
    const court = courtOfArea(this.def.id);
    let sub = this.def.name;
    if (court) {
      const n = court.encounters.filter((e) => s.encounters.includes(e.id)).length;
      sub += s.princes.includes(court.prince.id) ? '  ·  FREED' : `  ·  champions ${n}/5`;
    }
    this.hudArea.setText(sub);
    const rows = Quests.tracker(this.def.id).slice(0, 4);
    this.hudTracker.setText(rows.map((r) => `${r.ready ? '✔' : '◆'} ${r.name}\n${r.hint}`).join('\n'));
  }

  private updateHud(now: number): void {
    const W = this.scale.width, H = this.scale.height;
    const g = this.hudG;
    g.clear();
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(8, 6, this.hudArea.width + 20, 28, 8);
    g.fillRoundedRect(W - this.hudCoins.width - 28, 6, this.hudCoins.width + 20, 28, 8);
    if (this.hudTracker.text) g.fillRoundedRect(W - 290, 38, 282, this.hudTracker.height + 12, 8);
    const busy = this.dialogue.isOpen || this.ledger.isOpen || this.fishing.busy;
    if (this.current && !busy) {
      this.hudPrompt.setText(`[E]  ${this.current.label()}`).setVisible(true);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(W / 2 - this.hudPrompt.width / 2 - 14, H - 62, this.hudPrompt.width + 28, 32, 10);
    } else this.hudPrompt.setVisible(false);
    // Toasts
    this.toasts = this.toasts.filter((t) => { if (now > t.until) { t.t.destroy(); return false; } return true; });
    this.toasts.forEach((t, i) => { t.t.setY(H - 110 - i * 26); t.t.setAlpha(Math.min(1, (t.until - now) / 400)); });
    this.drawMinimap(busy);
  }

  private drawMinimap(hidden: boolean): void {
    const g = this.miniG;
    g.clear();
    if (hidden) return;
    const W = this.scale.width;
    const mw = 150, mh = Math.round(150 * this.def.h / this.def.w);
    const x0 = W - mw - 14, y0 = this.scale.height - mh - 70;
    const sx = mw / this.def.w, sy = mh / this.def.h;
    g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 4, y0 - 4, mw + 8, mh + 8, 8);
    g.fillStyle(dim(this.def.bg, 0.2), 0.8); g.fillRect(x0, y0, mw, mh);
    g.lineStyle(1, this.def.accent, 0.7); g.strokeRect(x0, y0, mw, mh);
    for (const e of this.exitRects) {
      g.fillStyle(e.open ? 0xffe2b0 : 0xa05040, 1);
      g.fillRect(x0 + Phaser.Math.Clamp(e.rect.x + e.rect.w / 2, 0, this.def.w) * sx - 3, y0 + Phaser.Math.Clamp(e.rect.y + e.rect.h / 2, 0, this.def.h) * sy - 3, 6, 6);
    }
    for (const c of this.champions) { g.fillStyle(c.beaten ? 0x6a6a6a : c.enc.quest ? 0x6ac8ff : 0xff6a3a, 1); g.fillCircle(x0 + c.enc.at.x * sx, y0 + c.enc.at.y * sy, 2.5); }
    for (const b of this.bosses) { g.fillStyle(0xff3a5a, 1); g.fillCircle(x0 + b.at.x * sx, y0 + b.at.y * sy, 4); }
    for (const a of this.actors) {
      const quest = allQuests().some((q) => q.giver === a.def.id && (Quests.offerable(q) || Quests.isReady(q)));
      g.fillStyle(quest ? 0xffd23a : 0xc8c0b0, quest ? 1 : 0.6); g.fillCircle(x0 + a.x * sx, y0 + a.y * sy, quest ? 2.5 : 1.5);
    }
    for (const p of Quests.pickupsIn(this.def.id)) { g.fillStyle(p.color, 1); g.fillCircle(x0 + p.x * sx, y0 + p.y * sy, 2); }
    for (const p of this.def.pois) {
      if (p.kind === 'waystone') { g.fillStyle(0x7ad8ff, 1); g.fillCircle(x0 + p.at.x * sx, y0 + p.at.y * sy, 3); }
      if (p.kind === 'water') { g.fillStyle(0x4a9ad8, 0.6); g.fillRect(x0 + p.shape.x * sx, y0 + p.shape.y * sy, p.shape.w * sx, p.shape.h * sy); }
    }
    g.fillStyle(0xffffff, 1); g.fillCircle(x0 + this.px * sx, y0 + this.py * sy, 3);
    g.lineStyle(1, 0x000000, 1); g.strokeCircle(x0 + this.px * sx, y0 + this.py * sy, 3);
  }

  private toastSeen = new Set<string>();

  private toastOnce(key: string, s: string): void {
    if (this.toastSeen.has(key)) return;
    this.toastSeen.add(key);
    this.time.delayedCall(4000, () => this.toastSeen.delete(key));
    this.toast(s);
  }

  toast(s: string): void {
    const t = this.add.text(this.scale.width / 2, this.scale.height - 110, s, {
      fontFamily: FONT_DISPLAY, fontSize: '14px', color: '#ffe8c0', stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(HUD_Z + 2);
    this.toasts.unshift({ t, until: this.time.now + 3600 });
    if (this.toasts.length > 5) this.toasts.pop()?.t.destroy();
    this.refreshHud();
  }

  private toastAll(lines: string[]): void { for (const l of lines) this.toast(l); this.refreshHud(); }

  private areaBanner(): void {
    const W = this.scale.width;
    const court = courtOfArea(this.def.id);
    const t1 = this.add.text(W / 2, 110, this.def.name.toUpperCase(), {
      fontFamily: FONT_DISPLAY, fontSize: '34px', color: '#ffe2b0', stroke: '#1a0a04', strokeThickness: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(HUD_Z + 3).setAlpha(0);
    const t2 = this.add.text(W / 2, 148, court ? `${this.def.subtitle} — ${court.prince.name}, ${court.prince.title}` : this.def.subtitle, {
      fontFamily: FONT_UI, fontSize: '16px', color: '#e8c8a0', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(HUD_Z + 3).setAlpha(0);
    this.tweens.add({ targets: [t1, t2], alpha: 1, duration: 500, hold: 2200, yoyo: true, onComplete: () => { t1.destroy(); t2.destroy(); } });
    if (this.initData.after?.kind === 'prince' && court) {
      this.time.delayedCall(600, () => this.toast(`${court.name} is free! Its people will want to talk.`));
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function roleVerb(kind: string): string {
  return ({ shop: 'Browse wares', tackle: 'Browse tackle', bakery: 'Order from the oven', dock: 'Boats & sailing', banker: 'Trade' } as Record<string, string>)[kind] ?? 'Trade';
}

const inView = (v: Rect, x: number, y: number): boolean => x > v.x - 80 && x < v.x + v.w + 80 && y > v.y - 80 && y < v.y + v.h + 140;

const rectHit = (r: Rect, x: number, y: number, pad: number): boolean =>
  x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;

function nearestInRect(r: Rect, x: number, y: number): Pt {
  return { x: Phaser.Math.Clamp(x, r.x, r.x + r.w), y: Phaser.Math.Clamp(y, r.y, r.y + r.h) };
}

function clampInRect(r: Rect, p: Pt): Pt {
  return { x: Phaser.Math.Clamp(p.x, r.x + 10, r.x + r.w - 10), y: Phaser.Math.Clamp(p.y, r.y + 10, r.y + r.h - 10) };
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy || 1;
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** A wooden signboard portrait for read-only dialogue. */
function signPortrait(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x3a2614, 1); g.fillRect(x - 5, y - 60, 10, 60);
  g.fillStyle(0x8a6a44, 1); g.fillRoundedRect(x - 50, y - 110, 100, 56, 6);
  g.lineStyle(3, 0x3a2614, 1);
  for (let i = 0; i < 3; i++) g.lineBetween(x - 36, y - 96 + i * 14, x + 30 - i * 10, y - 96 + i * 14);
}
