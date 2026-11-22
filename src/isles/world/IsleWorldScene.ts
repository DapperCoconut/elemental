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
  AreaDef, AreaExit, EncounterDef, NpcDef, NpcLook, Poi, Pt, Rect, Talk, IslesFightPayload, WorldHazard, Cond, PainterWorld,
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

/** How each isle's dungeon hazards throw you back to the last checkpoint. */
/** Painters read the story through this — see `PainterWorld`. */
const PAINTER_WORLD: PainterWorld = { test: (c) => Save.test(c) };

const DUNGEON_CATCH: Record<string, { flash: [number, number, number]; sfx: string; text: string }> = {
  fire: { flash: [255, 90, 20], sfx: 'status-burn', text: '🔥 Scorched!' },
  water: { flash: [90, 180, 255], sfx: 'splash', text: '🌊 Swept under!' },
  life: { flash: [120, 220, 90], sfx: 'thorn', text: '🌿 Snared!' },
  air: { flash: [230, 245, 255], sfx: 'gust', text: '💨 Blown off your feet!' },
  earth: { flash: [150, 120, 80], sfx: 'quake', text: '🪨 Buried!' },
  electricity: { flash: [170, 215, 255], sfx: 'zap', text: '⚡ Shocked!' },
  slime: { flash: [120, 230, 60], sfx: 'status-poison', text: '🐍 Bitten!' },
};

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
  private pieces: { g: Phaser.GameObjects.Graphics; x0: number; y0: number; x1: number; y1: number; when?: Cond; ok: boolean }[] = [];
  private piecesCheckAt = 0;
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
      this.pieces.push({ g, x0: p.x - p.w / 2 - 20, y0: p.y - p.h - 20, x1: p.x + p.w / 2 + 20, y1: p.y + 40, when: p.when, ok: !p.when || Save.test(p.when) });
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

    if (now >= this.piecesCheckAt) {
      this.piecesCheckAt = now + 500;
      for (const p of this.pieces) if (p.when) p.ok = Save.test(p.when);
    }
    for (const p of this.pieces) p.g.setVisible(p.ok && !(p.x1 < view.x || p.x0 > view.x + view.w || p.y1 < view.y || p.y0 > view.y + view.h));

    this.gAnim.clear(); this.gOver.clear();
    try { this.def.painter.animate?.(this.gAnim, t, view, PAINTER_WORLD); } catch (e) { console.error(e); this.def.painter.animate = undefined; }
    try { this.def.painter.animateOver?.(this.gOver, t, view, PAINTER_WORLD); } catch (e) { console.error(e); this.def.painter.animateOver = undefined; }
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
      case 'pollen': motes(g, view, t, 70, 0xffe27a, 6, 34, 1.2, 13); motes(g, view, t, 20, 0xfff6c0, -4, 20, 0.8, 14); break;
      case 'spores': motes(g, view, t, 34, 0xc8d8a8, -10, 18, 3.2, 15); motes(g, view, t, 18, 0xe8f0d0, -16, 10, 1.6, 16); break;
      case 'petals':
        for (let i = 0; i < 44; i++) {
          const x = view.x + ((i * 131 + t * 26) % view.w) + Math.sin(t * 1.6 + i) * 18, y = view.y + ((i * 71 + t * (34 + (i % 4) * 8)) % view.h);
          const sp = Math.cos(t * 3 + i * 1.7);
          g.fillStyle(i % 3 ? 0xf8a8c8 : 0xffd8e8, 0.85); g.fillEllipse(x, y, 5 * Math.abs(sp) + 1.5, 3.2);
        }
        break;
      case 'leaves':
        for (let i = 0; i < 34; i++) {
          const x = view.x + ((i * 149 + t * 40) % view.w) + Math.sin(t * 1.2 + i) * 24, y = view.y + ((i * 83 + t * (40 + (i % 5) * 7)) % view.h);
          const sp = Math.cos(t * 2.4 + i * 1.3);
          g.fillStyle([0x8aa83a, 0xc8a03a, 0xb85a2a][i % 3], 0.85); g.fillEllipse(x, y, 7 * Math.abs(sp) + 2, 4);
        }
        break;
      case 'sugar':
        for (let i = 0; i < 60; i++) {
          const x = view.x + ((i * 97 + t * 8) % view.w), y = view.y + ((i * 59 + t * 22) % view.h);
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 4 + i));
          g.fillStyle([0xffffff, 0xffc8e8, 0xc8f0ff, 0xfff0a8][i % 4], tw); g.fillRect(x - 1, y - 1, 2.2, 2.2);
        }
        break;
      case 'fireflies':
        for (let i = 0; i < 36; i++) {
          const x = view.x + ((i * 173) % view.w) + Math.sin(t * 0.7 + i * 2.1) * 40, y = view.y + ((i * 97) % view.h) + Math.cos(t * 0.9 + i * 1.3) * 30;
          const on = Math.max(0, Math.sin(t * 2.2 + i * 2.7));
          if (on < 0.05) continue;
          g.fillStyle(0xd8ff7a, 0.18 * on); g.fillCircle(x, y, 7); g.fillStyle(0xf0ffb0, on); g.fillCircle(x, y, 1.6);
        }
        break;
      case 'wind':
        // Long thin streaks racing sideways, gusting in waves; a few torn leaves of paper ride them.
        for (let i = 0; i < 40; i++) {
          const gust = 0.6 + 0.4 * Math.sin(t * 0.8 + i * 0.3);
          const x = view.x + ((i * 157 + t * (420 + (i % 5) * 60)) % (view.w + 200)) - 100, y = view.y + ((i * 67) % view.h) + Math.sin(t * 2 + i) * 6;
          const len = 30 + (i % 4) * 16;
          g.lineStyle(1, 0xffffff, 0.22 * gust); g.lineBetween(x, y, x - len, y + 2);
        }
        motes(g, view, t, 10, 0xf0ece0, 260, 8, 1.8, 17);
        break;
      case 'clouds':
        // Low cloud puffs drifting across — soft clusters, the odd one passing right over you.
        for (let i = 0; i < 7; i++) {
          const x = view.x + ((i * 389 + t * (16 + (i % 3) * 6)) % (view.w + 500)) - 250, y = view.y + ((i * 211) % view.h);
          g.fillStyle(0xffffff, 0.09);
          g.fillEllipse(x, y, 260, 70); g.fillEllipse(x - 70, y + 6, 150, 56); g.fillEllipse(x + 80, y + 4, 170, 60); g.fillEllipse(x + 10, y - 22, 140, 60);
        }
        break;
      case 'feathers':
        // Down-feathers rocking side to side as they settle.
        for (let i = 0; i < 26; i++) {
          const fall = view.y + ((i * 79 + t * (16 + (i % 4) * 5)) % view.h);
          const rock = Math.sin(t * 1.8 + i * 1.9);
          const x = view.x + ((i * 167 + t * 10) % view.w) + rock * 22;
          const ang = rock * 0.7, ca = Math.cos(ang) * 7, sa = Math.sin(ang) * 7;
          g.lineStyle(1, 0xd8d0c0, 0.8); g.lineBetween(x - ca, fall - sa, x + ca, fall + sa);
          g.fillStyle(0xfffaf0, 0.75); g.fillEllipse(x, fall - 1, 12, 4.5);
        }
        break;
      case 'stars': {
        // A night sky laid over the place: fixed twinkling points, and every few seconds a shooting star.
        for (let i = 0; i < 70; i++) {
          const x = view.x + ((i * 233 + Math.floor(view.x / 997) * 31) % view.w), y = view.y + ((i * 149) % view.h);
          const tw = 0.25 + 0.75 * Math.max(0, Math.sin(t * (1 + (i % 5) * 0.4) + i * 2.3));
          g.fillStyle(i % 9 ? 0xf0f4ff : 0xffe8a8, 0.6 * tw); g.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
          if (i % 13 === 0) { g.lineStyle(1, 0xf0f4ff, 0.3 * tw); g.lineBetween(x - 4, y, x + 4, y); g.lineBetween(x, y - 4, x, y + 4); }
        }
        const k = (t % 4.5) / 0.7;
        if (k < 1) {
          const n = Math.floor(t / 4.5), sx = view.x + ((n * 431) % view.w), sy = view.y + ((n * 197) % (view.h * 0.6));
          const hx = sx + k * 260, hy = sy + k * 120;
          g.lineStyle(2, 0xffffff, 0.8 * (1 - k)); g.lineBetween(hx, hy, hx - 70, hy - 32);
          g.fillStyle(0xffffff, 1 - k); g.fillCircle(hx, hy, 2);
        }
        break;
      }
      case 'storm': {
        // Hard slanting rain and, every few seconds, a lightning flash over everything.
        for (let i = 0; i < 120; i++) {
          const x = view.x + ((i * 97 + t * 260) % view.w), y = view.y + ((i * 53 + t * 900) % view.h);
          g.lineStyle(1, 0xb8d0e8, 0.45); g.lineBetween(x, y, x - 9, y + 16);
        }
        const ph = t % 5.3;
        if (ph < 0.09 || (ph > 0.16 && ph < 0.22)) { g.fillStyle(0xeef4ff, 0.22); g.fillRect(view.x, view.y, view.w, view.h); }
        break;
      }
      case 'dreams':
        // Soap-bubble dreams rising slowly, a faint rainbow skin on each, and the odd drifting zzz.
        for (let i = 0; i < 22; i++) {
          const x = view.x + ((i * 139) % view.w) + Math.sin(t * 0.9 + i * 1.7) * 26, y = view.y + view.h - ((i * 97 + t * (14 + (i % 4) * 5)) % view.h);
          const r = 4 + (i % 5) * 2.2;
          g.lineStyle(1, [0xd8c8ff, 0xc8f0ff, 0xffd8f0][i % 3], 0.55); g.strokeCircle(x, y, r);
          g.fillStyle(0xffffff, 0.5); g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.22);
        }
        for (let i = 0; i < 5; i++) {
          const k = ((t * 0.25 + i / 5) % 1), x = view.x + ((i * 353) % view.w) + k * 40, y = view.y + view.h * (0.85 - k * 0.7);
          g.lineStyle(1.4, 0xe8e0ff, 0.5 * Math.sin(k * Math.PI));
          const z = 5 + k * 4;
          g.lineBetween(x, y, x + z, y); g.lineBetween(x + z, y, x, y + z); g.lineBetween(x, y + z, x + z, y + z);
        }
        break;
      case 'dust':
        // A warm haze with motes hanging in it, turning over slowly as they drift.
        g.fillStyle(0xd8b888, 0.05); g.fillRect(view.x, view.y, view.w, view.h);
        for (let i = 0; i < 40; i++) {
          const x = view.x + ((i * 173 + t * (6 + (i % 4) * 3)) % view.w) + Math.sin(t * 0.7 + i * 2.1) * 14;
          const y = view.y + ((i * 113 + Math.sin(t * 0.4 + i) * 30 + view.h) % view.h);
          const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.3 + i * 1.7));
          g.fillStyle(i % 5 ? 0xf0dcb0 : 0xfff4d8, 0.5 * tw); g.fillCircle(x, y, 1 + (i % 3) * 0.6);
        }
        break;
      case 'sandstorm':
        // Driving sand: a tinted pall, long low streaks racing sideways and gusting sheets.
        g.fillStyle(0xc8a060, 0.1 + Math.sin(t * 0.8) * 0.04); g.fillRect(view.x, view.y, view.w, view.h);
        for (let i = 0; i < 90; i++) {
          const x = view.x + ((i * 131 + t * (420 + (i % 5) * 60)) % (view.w + 80)) - 40, y = view.y + ((i * 59 + Math.sin(t + i) * 6) % view.h);
          g.lineStyle(1, i % 3 ? 0xe0c080 : 0xf4dca8, 0.45); g.lineBetween(x, y, x - 18 - (i % 4) * 6, y + 1.5);
        }
        for (let i = 0; i < 3; i++) {
          const x = view.x + ((i * 521 + t * 260) % (view.w + 600)) - 300, y = view.y + view.h * (0.25 + i * 0.25);
          g.fillStyle(0xd8b070, 0.08); g.fillEllipse(x, y, 520, 90); g.fillEllipse(x - 140, y + 10, 300, 60);
        }
        break;
      case 'grit':
        // Pebbles and grit trickling down in thin falls, a puff where each lands.
        for (let i = 0; i < 9; i++) {
          const cx = view.x + ((i * 307) % view.w), y0 = view.y + ((i * 181) % (view.h * 0.6));
          const on = Math.sin(t * 0.5 + i * 2.7) > 0.2;
          if (!on) continue;
          for (let k = 0; k < 6; k++) {
            const y = y0 + ((t * 160 + k * 22 + i * 13) % 130);
            g.fillStyle(k % 2 ? 0x8a7a68 : 0x6a5a4a, 0.75); g.fillRect(cx + Math.sin(k + i) * 3, y, 2, 2);
          }
          g.fillStyle(0xb8a890, 0.25); g.fillEllipse(cx, y0 + 134, 18 + Math.sin(t * 6 + i) * 3, 5);
        }
        for (let i = 0; i < 24; i++) {
          const x = view.x + ((i * 149 + t * 4) % view.w), y = view.y + ((i * 97 + t * (40 + (i % 4) * 12)) % view.h);
          g.fillStyle(0x7a6a5a, 0.5); g.fillRect(x, y, 1.5, 1.5);
        }
        break;
      case 'glints':
        // Crystal flecks winking in and out, each with a four-point star at its brightest.
        for (let i = 0; i < 46; i++) {
          const x = view.x + ((i * 211 + Math.sin(t * 0.3 + i) * 20 + view.w) % view.w), y = view.y + ((i * 127 + t * 5) % view.h);
          const tw = Math.max(0, Math.sin(t * (1.1 + (i % 6) * 0.35) + i * 2.9));
          const col = [0xd8a8ff, 0x9ae8ff, 0xffb8d8, 0xb8ffd0][i % 4];
          g.fillStyle(col, 0.7 * tw); g.fillRect(x - 1, y - 1, 2, 2);
          if (tw > 0.8) { g.lineStyle(1, 0xffffff, (tw - 0.8) * 4); g.lineBetween(x - 5, y, x + 5, y); g.lineBetween(x, y - 5, x, y + 5); }
        }
        break;
      case 'static': {
        // Crackling arcs jumping between points in the air, each a jagged two-tone fork that lasts a
        // blink, over a faint blue flicker; the odd loose spark drifting.
        if (Math.sin(t * 23) > 0.6) { g.fillStyle(0xa8d8ff, 0.035); g.fillRect(view.x, view.y, view.w, view.h); }
        for (let i = 0; i < 5; i++) {
          const ph = (t * (0.9 + i * 0.23) + i * 0.37) % 1;
          if (ph > 0.12) continue;
          const seed = Math.floor(t * (0.9 + i * 0.23) + i * 0.37) * 7.13 + i * 3.1;
          const x0 = view.x + ((Math.abs(Math.sin(seed)) * 9973) % view.w), y0 = view.y + ((Math.abs(Math.cos(seed)) * 7919) % view.h);
          const ang = seed % (Math.PI * 2), len = 60 + (i % 3) * 30;
          for (const [w, c, a] of [[3, 0x6ab8ff, 0.5], [1.2, 0xffffff, 0.95]] as const) {
            g.lineStyle(w, c, a * (1 - ph / 0.12));
            g.beginPath(); g.moveTo(x0, y0);
            for (let k = 1; k <= 6; k++) {
              const u = k / 6, jx = Math.sin(seed * 3 + k * 5.7) * 9, jy = Math.cos(seed * 2 + k * 4.3) * 9;
              g.lineTo(x0 + Math.cos(ang) * len * u + jx, y0 + Math.sin(ang) * len * u + jy);
            }
            g.strokePath();
          }
        }
        for (let i = 0; i < 18; i++) {
          const x = view.x + ((i * 191 + Math.sin(t * 2 + i) * 20 + view.w) % view.w), y = view.y + ((i * 113 - t * 30 + view.h * 9) % view.h);
          g.fillStyle(i % 3 ? 0xbfe4ff : 0xffffff, 0.4 + 0.5 * Math.max(0, Math.sin(t * 9 + i * 1.3))); g.fillRect(x, y, 1.5, 1.5);
        }
        break;
      }
      case 'aurora':
        // Curtains of green and violet light rippling across the top of the sky, folding as they move.
        for (let band = 0; band < 3; band++) {
          const col = [0x6aff9a, 0x8ae8d8, 0xc08aff][band], baseY = view.y + 40 + band * 46;
          for (let x = view.x - 20; x < view.x + view.w + 20; x += 14) {
            const wave = Math.sin(x * 0.006 + t * (0.4 + band * 0.13) + band) * 30 + Math.sin(x * 0.017 - t * 0.7) * 10;
            const hgt = 70 + Math.sin(x * 0.011 + t * 0.9 + band * 2) * 34;
            const a = 0.06 + 0.05 * Math.max(0, Math.sin(x * 0.009 + t * 1.3 + band));
            g.fillStyle(col, a); g.fillRect(x, baseY + wave, 12, hgt);
            g.fillStyle(0xffffff, a * 0.6); g.fillRect(x, baseY + wave + hgt - 4, 12, 3);
          }
        }
        break;
      case 'glow':
        // A faint green haze with motes rising out of the ground, each pulsing as it climbs.
        g.fillStyle(0x7aff6a, 0.035 + Math.sin(t * 0.6) * 0.015); g.fillRect(view.x, view.y, view.w, view.h);
        for (let i = 0; i < 36; i++) {
          const x = view.x + ((i * 167) % view.w) + Math.sin(t * 0.8 + i * 1.9) * 12;
          const y = view.y + view.h - ((i * 89 + t * (12 + (i % 5) * 5)) % view.h);
          const p = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.3);
          g.fillStyle(0x9aff7a, 0.15 * p); g.fillCircle(x, y, 5);
          g.fillStyle(0xd8ffc0, 0.6 * p); g.fillCircle(x, y, 1.6);
        }
        break;
      case 'flicker': {
        // Not quite one state: faint scan-bands sliding down, and now and then a ghost double of the
        // whole view slipped a few pixels aside in violet and teal.
        for (let i = 0; i < 4; i++) {
          const y = view.y + ((t * (60 + i * 25) + i * 157) % view.h);
          g.fillStyle(i % 2 ? 0xc8a8ff : 0x8ae8e8, 0.05); g.fillRect(view.x, y, view.w, 6 + i * 3);
        }
        const ph = t % 3.7;
        if (ph < 0.18) {
          const off = 6 * Math.sin(t * 40);
          g.lineStyle(2, 0xb88aff, 0.18); g.strokeRect(view.x + off, view.y, view.w, view.h);
          g.fillStyle(0x8ae8e8, 0.05); g.fillRect(view.x - off, view.y, view.w, view.h);
        }
        for (let i = 0; i < 20; i++) {
          const on = Math.sin(t * 5 + i * 2.1) > 0.85;
          if (!on) continue;
          const x = view.x + ((i * 233) % view.w), y = view.y + ((i * 151) % view.h);
          g.lineStyle(1, 0xd8c8ff, 0.6); g.strokeRect(x - 4, y - 4, 8, 8);
          g.lineStyle(1, 0x8ae8e8, 0.5); g.strokeRect(x - 1, y - 1, 8, 8);
        }
        break;
      }
      case 'balloons':
        // Loose balloons rising on wavering strings, a shine on each.
        for (let i = 0; i < 12; i++) {
          const col = [0xff5a6a, 0xffd04a, 0x5ac8ff, 0x8aff7a, 0xd88aff, 0xff9a4a][i % 6];
          const x = view.x + ((i * 241) % view.w) + Math.sin(t * 0.7 + i * 1.3) * 18;
          const y = view.y + view.h + 40 - ((i * 131 + t * (22 + (i % 4) * 6)) % (view.h + 120));
          const r = 7 + (i % 3) * 1.5;
          g.lineStyle(1, 0xe8e0d0, 0.7);
          g.beginPath(); g.moveTo(x, y + r);
          for (let k = 1; k <= 4; k++) g.lineTo(x + Math.sin(t * 2 + i + k) * 3, y + r + k * 7);
          g.strokePath();
          g.fillStyle(col, 0.85); g.fillEllipse(x, y, r * 1.7, r * 2);
          g.fillTriangle(x - 2, y + r + 1, x + 2, y + r + 1, x, y + r - 2);
          g.fillStyle(0xffffff, 0.55); g.fillEllipse(x - r * 0.3, y - r * 0.4, r * 0.4, r * 0.6);
        }
        break;
      case 'miasma':
        // A low sickly haze banked along the ground, marsh-gas bubbles wobbling up out of it, each
        // swelling then popping in a ring and a little green puff.
        g.fillStyle(0x7ab84a, 0.04 + Math.sin(t * 0.5) * 0.015); g.fillRect(view.x, view.y, view.w, view.h);
        for (let i = 0; i < 4; i++) {
          const x = view.x + ((i * 397 + t * 12) % (view.w + 500)) - 250, y = view.y + view.h * (0.3 + i * 0.2);
          g.fillStyle(0x8ac85a, 0.06); g.fillEllipse(x, y, 460, 70); g.fillEllipse(x + 160, y + 14, 260, 44);
        }
        for (let i = 0; i < 26; i++) {
          const life = 3 + (i % 4) * 0.8, k = ((t + i * 0.73) % life) / life;
          const n = Math.floor((t + i * 0.73) / life);
          const x = view.x + ((i * 173 + n * 311) % view.w) + Math.sin(t * 1.6 + i) * 4;
          const y = view.y + ((i * 107 + n * 89) % view.h) - k * 70;
          if (k < 0.88) {
            const r = 2 + k * (4 + (i % 3) * 1.5);
            g.fillStyle(0x6aa83a, 0.28); g.fillCircle(x, y, r);
            g.lineStyle(1, 0xb8f07a, 0.6); g.strokeCircle(x, y, r);
            g.fillStyle(0xe8ffc8, 0.7); g.fillCircle(x - r * 0.35, y - r * 0.4, Math.max(0.6, r * 0.22));
          } else {
            const p = (k - 0.88) / 0.12, r = 6 + p * 10;
            g.lineStyle(1, 0xc8ff8a, 0.6 * (1 - p)); g.strokeCircle(x, y, r);
            g.fillStyle(0x9ad86a, 0.18 * (1 - p)); g.fillCircle(x, y - p * 6, r * 0.8);
            for (let s = 0; s < 4; s++) {
              const a = s * 1.57 + i; g.fillStyle(0xc8ff8a, 0.7 * (1 - p)); g.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.5, 1.5);
            }
          }
        }
        break;
      case 'drip':
        // Venom drops gathering, falling and splashing: each drop hangs and swells a moment, drops with
        // a short streak, then lands in a crown of droplets and a spreading green ring.
        for (let i = 0; i < 18; i++) {
          const cyc = 2.2 + (i % 5) * 0.35, ph = (t + i * 0.61) % cyc, n = Math.floor((t + i * 0.61) / cyc);
          const x = view.x + ((i * 211 + n * 157) % view.w), y0 = view.y + ((i * 83 + n * 41) % (view.h * 0.5));
          const fall = 90 + (i % 4) * 40;
          if (ph < 0.7) {
            const sw = ph / 0.7;
            g.fillStyle(0x7ad83a, 0.75); g.fillEllipse(x, y0 + sw * 2, 2 + sw * 2, 3 + sw * 3);
            g.fillStyle(0xe8ffc0, 0.8); g.fillRect(x - 0.6, y0 + sw * 2 - 1, 1, 1);
          } else if (ph < 1.1) {
            const k = (ph - 0.7) / 0.4, y = y0 + 4 + k * k * fall;
            g.lineStyle(1, 0x9af05a, 0.35); g.lineBetween(x, y - 8 - k * 6, x, y - 2);
            g.fillStyle(0x6ac82a, 0.85); g.fillEllipse(x, y, 3.6, 5.4);
            g.fillStyle(0xe8ffc0, 0.85); g.fillRect(x - 1, y - 1.5, 1, 1);
          } else if (ph < 1.7) {
            const k = (ph - 1.1) / 0.6, y = y0 + 4 + fall;
            g.lineStyle(1, 0x8ae04a, 0.6 * (1 - k)); g.strokeEllipse(x, y, 6 + k * 22, 2 + k * 7);
            g.fillStyle(0x5aa82a, 0.3 * (1 - k)); g.fillEllipse(x, y, 4 + k * 12, 1.5 + k * 4);
            for (let s = 0; s < 5; s++) {
              const a = Math.PI + (s + 0.5) * (Math.PI / 5), d = k * 10;
              g.fillStyle(0xb8ff7a, 0.8 * (1 - k)); g.fillCircle(x + Math.cos(a) * d * 1.3, y + Math.sin(a) * d * 1.4 + k * k * 12, 1.1);
            }
          }
        }
        break;
      case 'gossamer':
        // Loose strands of web drifting on the air, each a sagging bowed thread with a bead of dew,
        // catching the light in a glint that runs along it.
        for (let i = 0; i < 14; i++) {
          const x = view.x + ((i * 263 + t * (10 + (i % 4) * 4)) % (view.w + 120)) - 60 + Math.sin(t * 0.6 + i) * 20;
          const y = view.y + ((i * 149 + Math.sin(t * 0.35 + i * 1.7) * 40 + view.h) % view.h);
          const len = 30 + (i % 4) * 14, ang = Math.sin(t * 0.5 + i * 2.3) * 0.6 + 0.3;
          const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
          const sag = 6 + Math.sin(t * 1.4 + i) * 4;
          const pts: [number, number][] = [];
          for (let k = 0; k <= 8; k++) {
            const u = k / 8, bow = Math.sin(u * Math.PI) * sag;
            pts.push([x + (ex - x) * u - Math.sin(ang) * bow, y + (ey - y) * u + Math.cos(ang) * bow]);
          }
          g.lineStyle(1, 0xe8ecf0, 0.35);
          g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const [px, py] of pts) g.lineTo(px, py); g.strokePath();
          const gl = ((t * 0.7 + i * 0.29) % 1.6);
          if (gl < 1) {
            const p = pts[Math.floor(gl * 8)];
            g.fillStyle(0xffffff, 0.8 * Math.sin(gl * Math.PI)); g.fillCircle(p[0], p[1], 1.3);
            g.lineStyle(1, 0xffffff, 0.4 * Math.sin(gl * Math.PI)); g.lineBetween(p[0] - 4, p[1], p[0] + 4, p[1]); g.lineBetween(p[0], p[1] - 4, p[0], p[1] + 4);
          }
          if (i % 3 === 0) { const p = pts[5]; g.fillStyle(0xd8f0ff, 0.6); g.fillCircle(p[0], p[1], 1.4); }
        }
        break;
      case 'murk': {
        // Light dimmed under a pall, darkest at the edges, and wisps of living shadow crawling across
        // the ground: fingered smears that reach, curl and pull back, the odd pair of pale eyes in one.
        g.fillStyle(0x0a0614, 0.22); g.fillRect(view.x, view.y, view.w, view.h);
        for (let e = 0; e < 4; e++) {
          const d = 26 + e * 22; g.fillStyle(0x06040c, 0.08);
          g.fillRect(view.x, view.y, view.w, d); g.fillRect(view.x, view.y + view.h - d, view.w, d);
          g.fillRect(view.x, view.y, d, view.h); g.fillRect(view.x + view.w - d, view.y, d, view.h);
        }
        for (let i = 0; i < 9; i++) {
          const x = view.x + ((i * 311 + t * (14 + (i % 3) * 6) * (i % 2 ? 1 : -1) + view.w * 9) % view.w);
          const y = view.y + ((i * 173) % view.h) + Math.sin(t * 0.4 + i) * 20;
          const dir = i % 2 ? 1 : -1;
          g.fillStyle(0x08040e, 0.32); g.fillEllipse(x, y, 70, 22);
          g.fillStyle(0x08040e, 0.22); g.fillEllipse(x - dir * 34, y + 2, 44, 14);
          for (let f = 0; f < 4; f++) {
            const reach = 18 + 14 * Math.max(0, Math.sin(t * 1.3 + i * 1.7 + f * 0.9));
            const a0 = (f - 1.5) * 0.45;
            let fx = x + dir * 30, fy = y + (f - 1.5) * 5;
            g.lineStyle(4 - f * 0.5, 0x06030c, 0.35);
            g.beginPath(); g.moveTo(fx, fy);
            for (let k = 1; k <= 4; k++) {
              const u = k / 4; fx += dir * Math.cos(a0 + Math.sin(t * 2 + f + k) * 0.5) * reach / 4; fy += Math.sin(a0 + Math.sin(t * 2.2 + f * 2 + k) * 0.6) * reach / 4;
              g.lineTo(fx, fy); if (u === 1) { g.fillStyle(0x06030c, 0.3); g.fillCircle(fx, fy, 1.5); }
            }
            g.strokePath();
          }
          if (i % 3 === 0 && Math.sin(t * 0.7 + i * 2) > 0.3) {
            const blink = Math.sin(t * 3 + i) > 0.95 ? 0.3 : 1;
            g.fillStyle(0xd8d0ff, 0.6); g.fillEllipse(x - 5, y - 2, 3.5, 2.4 * blink); g.fillEllipse(x + 5, y - 2, 3.5, 2.4 * blink);
          }
        }
        break;
      }
      case 'wisps':
        // Pale will-o'-wisps bobbing low over the ground: a soft halo, a bright core and a fading tail,
        // each drifting a while then guttering out and kindling somewhere else.
        for (let i = 0; i < 11; i++) {
          const life = 6 + (i % 4) * 1.5, k = ((t + i * 1.37) % life) / life, n = Math.floor((t + i * 1.37) / life);
          const bx = view.x + ((i * 239 + n * 401) % view.w), by = view.y + ((i * 151 + n * 223) % view.h);
          const x = bx + Math.sin(t * 0.5 + i) * 40 + k * 30, y = by + Math.sin(t * 2.1 + i * 1.3) * 7 - k * 10;
          const a = Math.min(1, k * 5) * Math.min(1, (1 - k) * 4) * (0.75 + 0.25 * Math.sin(t * 7 + i * 3));
          const col = i % 3 ? 0xc8f0e8 : 0xd8e8ff;
          for (let s = 1; s <= 4; s++) {
            const tx = x - s * 5 - Math.sin(t * 2 + s) * 2, ty = y + Math.sin(t * 2.1 + i * 1.3 - s * 0.4) * 3;
            g.fillStyle(col, 0.12 * a * (1 - s / 5)); g.fillCircle(tx, ty, 3.5 - s * 0.5);
          }
          g.fillStyle(col, 0.08 * a); g.fillCircle(x, y, 14);
          g.fillStyle(col, 0.18 * a); g.fillCircle(x, y, 7);
          g.fillStyle(0xffffff, 0.85 * a); g.fillCircle(x, y, 2.4);
          g.fillStyle(col, 0.06 * a); g.fillEllipse(x, y + 26, 18, 5);
        }
        break;
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
        : gt.look === 'ice' ? 0xbfe8f8 : gt.look === 'coral' ? 0xe87a8a : gt.look === 'sluice' ? 0x4a5a5a
        : gt.look === 'thorn' ? 0x3a5a2a : gt.look === 'roots' ? 0x6a4a2a : gt.look === 'bone' ? 0xe8e0c8 : gt.look === 'candy' ? 0xff8ac8
        : gt.look === 'cloud' ? 0xf4f8ff : gt.look === 'lightning' ? 0x9ad8ff : gt.look === 'orrery' ? 0xc8a050
        : gt.look === 'veil' ? 0xc8b0ff : gt.look === 'book' ? 0x7a2a3a
        : gt.look === 'boulder' ? 0x7a7068 : gt.look === 'crystal' ? 0xb88ae8 : gt.look === 'kiln' ? 0xb8603a
        : gt.look === 'dune' ? 0xe0c080 : gt.look === 'iron' ? 0x5a5e66 : gt.look === 'tomb' ? 0x8a8478
        : gt.look === 'cable' ? 0xc87a3a : gt.look === 'magnet' ? 0xc83a3a : gt.look === 'lead' ? 0x6a6e78
        : gt.look === 'rubber' ? 0x2a2a2e : gt.look === 'phase' ? 0xb88aff
        : gt.look === 'fang' ? 0xf4eedc : gt.look === 'web' ? 0xe8ecf0 : gt.look === 'chain' ? 0x6a6e78
        : gt.look === 'shadow' ? 0x0e0a16 : gt.look === 'lychgate' ? 0x5a4a38 : 0x3a3a42;
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
      } else if (gt.look === 'thorn') {
        // A briar hedge: dark tangle, curling stems, hooked thorns.
        g.fillStyle(dim(col, 0.4), 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 12);
        g.lineStyle(3, col, 1);
        for (let x = r.x + 6; x < r.x + r.w; x += 18) for (let y = r.y + 10; y < r.y + r.h; y += 22) {
          g.beginPath(); g.arc(x, y, 8, 0.4, 3.6, ((x + y) / 18) % 2 > 1); g.strokePath();
          g.fillStyle(0xd8c8a0, 1); g.fillTriangle(x + 6, y - 2, x + 12, y - 4, x + 7, y + 2);
        }
      } else if (gt.look === 'roots') {
        // Thick knotted roots grown across the way.
        g.fillStyle(dim(col, 0.45), 1); g.fillRect(r.x, r.y, r.w, r.h);
        for (let i = 0; i < 6; i++) {
          g.lineStyle(7 - (i % 3), lit(col, (i % 3) * 0.12), 1);
          const y0 = r.y + ((i + 0.5) / 6) * r.h;
          g.beginPath(); g.moveTo(r.x, y0);
          for (let k = 1; k <= 6; k++) g.lineTo(r.x + (k / 6) * r.w, y0 + Math.sin(k * 1.9 + i) * Math.min(14, r.h / 6));
          g.strokePath();
        }
      } else if (gt.look === 'bone') {
        // A palisade of long bones lashed together, knuckle-ends up.
        g.fillStyle(0x2a2420, 0.55); g.fillRect(r.x, r.y, r.w, r.h);
        for (let x = r.x + 7; x < r.x + r.w; x += 14) {
          g.fillStyle(col, 1); g.fillRect(x - 3, r.y + 4, 6, r.h - 8);
          g.fillCircle(x - 3, r.y + 5, 4); g.fillCircle(x + 3, r.y + 5, 4); g.fillCircle(x - 3, r.y + r.h - 5, 4); g.fillCircle(x + 3, r.y + r.h - 5, 4);
        }
        g.lineStyle(3, 0x6a4a2a, 1); g.lineBetween(r.x, r.y + r.h * 0.35, r.x + r.w, r.y + r.h * 0.35); g.lineBetween(r.x, r.y + r.h * 0.7, r.x + r.w, r.y + r.h * 0.7);
      } else if (gt.look === 'cloud') {
        // A cloud bank sat across the way: heaped puffs, breathing slowly.
        g.fillStyle(0xc8d8e8, 0.5); g.fillRoundedRect(r.x, r.y + r.h * 0.3, r.w, r.h * 0.7, 14);
        for (let x = r.x + 14; x < r.x + r.w; x += 26) for (let y = r.y + 14; y < r.y + r.h; y += 26) {
          const p = Math.sin(t * 1.3 + x * 0.05 + y * 0.07) * 2.5;
          g.fillStyle(col, 0.92); g.fillCircle(x + ((y / 26) % 2) * 11, y, 15 + p);
          g.fillStyle(0xffffff, 0.8); g.fillCircle(x + ((y / 26) % 2) * 11 - 4, y - 5, 7 + p * 0.5);
        }
      } else if (gt.look === 'lightning') {
        // A fence of rods with live arcs jumping between them.
        g.fillStyle(0x10182a, 0.45); g.fillRect(r.x, r.y, r.w, r.h);
        const posts: number[] = [];
        for (let x = r.x + 6; x <= r.x + r.w - 6; x += Math.max(24, (r.w - 12) / Math.max(1, Math.round((r.w - 12) / 60)))) posts.push(x);
        for (const x of posts) { g.fillStyle(0x5a5a6a, 1); g.fillRect(x - 3, r.y, 6, r.h); g.fillStyle(0xd8e8ff, 1); g.fillCircle(x, r.y + 2, 4); }
        const flick = Math.floor(t * 14);
        for (let i = 0; i + 1 < posts.length; i++) for (let k = 0; k < 3; k++) {
          const y0 = r.y + ((k + 0.5) / 3) * r.h;
          g.lineStyle(2, k === flick % 3 ? 0xffffff : col, 0.9);
          g.beginPath(); g.moveTo(posts[i], y0);
          for (let j = 1; j < 5; j++) g.lineTo(posts[i] + (j / 5) * (posts[i + 1] - posts[i]), y0 + Math.sin(flick * 1.7 + j * 2.3 + i + k) * 7);
          g.lineTo(posts[i + 1], y0); g.strokePath();
        }
      } else if (gt.look === 'orrery') {
        // Interlocking brass rings, slowly turning, a small planet riding each.
        g.fillStyle(0x2a2418, 0.5); g.fillRect(r.x, r.y, r.w, r.h);
        const step = Math.max(40, Math.min(r.w, r.h));
        for (let cx2 = r.x + step / 2; cx2 < r.x + r.w; cx2 += step * 0.8) for (let cy2 = r.y + step / 2; cy2 < r.y + r.h; cy2 += step * 0.8) {
          const rr = step * 0.42;
          g.lineStyle(4, col, 1); g.strokeCircle(cx2, cy2, rr);
          g.lineStyle(2, lit(col, 0.3), 1); g.strokeEllipse(cx2, cy2, rr * 2, rr * 0.8);
          const an = t * 0.8 + cx2 * 0.01 + cy2 * 0.013;
          g.fillStyle(0x7ab8e8, 1); g.fillCircle(cx2 + Math.cos(an) * rr, cy2 + Math.sin(an) * rr, 5);
          g.fillStyle(0x1a1a1a, 1); g.fillCircle(cx2, cy2, 5);
        }
      } else if (gt.look === 'veil') {
        // A shimmering dream-curtain: soft vertical folds, colours sliding through it.
        for (let x = r.x; x < r.x + r.w; x += 8) {
          const k = Math.sin(t * 1.4 + x * 0.06);
          g.fillStyle([0xc8b0ff, 0xb0d8ff, 0xffc8f0][Math.floor(x / 8) % 3], 0.35 + 0.15 * k);
          g.fillRect(x + k * 2, r.y, 7, r.h);
        }
        g.lineStyle(2, 0xffffff, 0.35 + 0.2 * Math.sin(t * 3)); g.strokeRect(r.x, r.y, r.w, r.h);
      } else if (gt.look === 'book') {
        // A giant closed book lying across the way: leather boards, gilt corners, the page block between.
        g.fillStyle(dim(col, 0.4), 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 6);
        g.fillStyle(col, 1); g.fillRoundedRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 5);
        g.fillStyle(0xf4ead2, 1); g.fillRect(r.x + 8, r.y + r.h * 0.42, r.w - 16, r.h * 0.16);
        g.lineStyle(1, 0xc8b898, 1);
        for (let x = r.x + 10; x < r.x + r.w - 10; x += 4) g.lineBetween(x, r.y + r.h * 0.43, x, r.y + r.h * 0.57);
        g.fillStyle(0xe8c050, 1);
        for (const [cx2, cy2] of [[r.x + 8, r.y + 8], [r.x + r.w - 8, r.y + 8], [r.x + 8, r.y + r.h - 8], [r.x + r.w - 8, r.y + r.h - 8]]) g.fillCircle(cx2, cy2, 5);
        g.lineStyle(3, 0xe8c050, 1); g.lineBetween(r.x + r.w / 2, r.y + 4, r.x + r.w / 2, r.y + r.h - 4);
      } else if (gt.look === 'boulder') {
        // Great rounded boulders wedged across the way, chocked with smaller stones.
        const n = Math.max(1, Math.round(Math.max(r.w, r.h) / 70)), horiz = r.w >= r.h;
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n, bx = horiz ? r.x + u * r.w : r.x + r.w / 2, by = horiz ? r.y + r.h / 2 : r.y + u * r.h;
          const br = Math.min(horiz ? r.w / n : r.w, horiz ? r.h : r.h / n) * 0.62;
          g.fillStyle(0x000000, 0.25); g.fillEllipse(bx + 4, by + br * 0.7, br * 2.1, br * 0.7);
          g.fillStyle(dim(col, 0.25), 1); g.fillCircle(bx, by, br);
          g.fillStyle(col, 1); g.fillCircle(bx - br * 0.1, by - br * 0.12, br * 0.86);
          g.fillStyle(lit(col, 0.25), 1); g.fillEllipse(bx - br * 0.35, by - br * 0.4, br * 0.7, br * 0.4);
          g.lineStyle(1.5, dim(col, 0.4), 1); g.lineBetween(bx - br * 0.2, by - br * 0.1, bx + br * 0.3, by + br * 0.35);
        }
        for (let x = r.x + 10; x < r.x + r.w; x += 23) { g.fillStyle(dim(col, 0.15), 1); g.fillCircle(x, r.y + r.h - 6, 6); }
      } else if (gt.look === 'crystal') {
        // A thicket of crystal spars grown across the way, a light pulsing up through them.
        g.fillStyle(dim(col, 0.5), 0.5); g.fillRect(r.x, r.y, r.w, r.h);
        for (let x = r.x + 8; x < r.x + r.w; x += 18) {
          const hgt = r.h * (0.55 + ((x * 7) % 5) * 0.09), lean = Math.sin(x * 0.3) * 6, pulse = 0.65 + 0.35 * Math.sin(t * 2 + x * 0.05);
          g.fillStyle(col, pulse); g.fillTriangle(x - 8, r.y + r.h, x + 8, r.y + r.h, x + lean, r.y + r.h - hgt);
          g.fillStyle(lit(col, 0.45), pulse); g.fillTriangle(x - 2, r.y + r.h, x + 4, r.y + r.h, x + lean, r.y + r.h - hgt);
        }
      } else if (gt.look === 'kiln') {
        // A bricked-up kiln mouth, a fire glowing through the gaps in the courses.
        g.fillStyle(0x2a1208, 1); g.fillRect(r.x, r.y, r.w, r.h);
        for (let y = r.y, row = 0; y < r.y + r.h; y += 12, row++) for (let x = r.x - (row % 2) * 13; x < r.x + r.w; x += 26) {
          const x0 = Math.max(r.x, x + 1), x1 = Math.min(r.x + r.w, x + 25);
          if (x1 > x0) { g.fillStyle((x + y) % 3 ? col : dim(col, 0.15), 1); g.fillRect(x0, y + 1, x1 - x0, Math.min(10, r.y + r.h - y - 1)); }
        }
        g.fillStyle(0xff8a2a, 0.25 + 0.15 * Math.sin(t * 4)); g.fillRect(r.x, r.y, r.w, r.h);
      } else if (gt.look === 'dune') {
        // A sand drift banked across the way, ripples on its face and sand blowing off the crest.
        g.fillStyle(dim(col, 0.15), 1); g.fillRoundedRect(r.x, r.y + r.h * 0.2, r.w, r.h * 0.8, 18);
        g.fillStyle(col, 1); g.fillRoundedRect(r.x + 4, r.y, r.w - 8, r.h * 0.8, 22);
        g.lineStyle(1.2, dim(col, 0.2), 0.8);
        for (let y = r.y + 10; y < r.y + r.h * 0.75; y += 9) g.lineBetween(r.x + 14, y + Math.sin(y) * 2, r.x + r.w - 14, y + Math.cos(y) * 2);
        for (let i = 0; i < 8; i++) { const k = (t * 0.9 + i / 8) % 1; g.fillStyle(lit(col, 0.3), 1 - k); g.fillRect(r.x + ((i * 53) % r.w) + k * 40, r.y + 4 - k * 14, 2, 2); }
      } else if (gt.look === 'iron') {
        // A riveted iron door: plates, a cross-strap, rivet heads catching the light.
        g.fillStyle(dim(col, 0.3), 1); g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle(col, 1); g.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
        g.lineStyle(2, dim(col, 0.4), 1);
        for (let x = r.x + 40; x < r.x + r.w - 10; x += 40) g.lineBetween(x, r.y + 3, x, r.y + r.h - 3);
        g.fillStyle(dim(col, 0.2), 1); g.fillRect(r.x + 3, r.y + r.h / 2 - 5, r.w - 6, 10);
        g.fillStyle(lit(col, 0.4), 1);
        for (let x = r.x + 10; x < r.x + r.w - 4; x += 16) { g.fillCircle(x, r.y + 9, 2.2); g.fillCircle(x, r.y + r.h - 9, 2.2); g.fillCircle(x, r.y + r.h / 2, 2.2); }
      } else if (gt.look === 'tomb') {
        // A sealing slab: dressed stone, a carved border and a sunk relief of a closed eye.
        g.fillStyle(dim(col, 0.35), 1); g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle(col, 1); g.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
        g.lineStyle(2, dim(col, 0.3), 1); g.strokeRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20);
        const ex = r.x + r.w / 2, ey = r.y + r.h / 2, ew = Math.min(r.w, r.h) * 0.35;
        g.lineStyle(2.5, dim(col, 0.45), 1);
        g.beginPath(); g.arc(ex, ey - ew * 0.5, ew, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
        for (let k = -2; k <= 2; k++) g.lineBetween(ex + k * ew * 0.3, ey + ew * 0.42, ex + k * ew * 0.36, ey + ew * 0.62);
      } else if (gt.look === 'cable') {
        // Live cable strung post to post across the way, sagging, insulators on the posts, sparks crawling.
        const horiz = r.w >= r.h, len = horiz ? r.w : r.h;
        for (let p = 0; p <= len; p += 60) {
          const px = horiz ? r.x + Math.min(p, r.w) : r.x + r.w / 2, py = horiz ? r.y + r.h / 2 : r.y + Math.min(p, r.h);
          g.fillStyle(0x3a2a1a, 1); g.fillRect(px - 4, py - 22, 8, 30);
          g.fillStyle(0xd8e0e8, 1); g.fillCircle(px, py - 18, 4); g.fillCircle(px, py - 8, 4);
        }
        for (const off of [-18, -8]) {
          g.lineStyle(2.5, col, 1); g.beginPath();
          for (let p = 0; p <= len; p += 10) {
            const sag = Math.sin(((p % 60) / 60) * Math.PI) * 6;
            const px = horiz ? r.x + p : r.x + r.w / 2 + sag, py = horiz ? r.y + r.h / 2 + off + sag : r.y + p;
            if (p === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.strokePath();
        }
        for (let i = 0; i < 4; i++) {
          const u = ((t * 0.7 + i / 4) % 1) * len, px = horiz ? r.x + u : r.x + r.w / 2, py = horiz ? r.y + r.h / 2 - 18 : r.y + u;
          g.fillStyle(0xbfe8ff, 0.9); g.fillCircle(px, py, 3); g.lineStyle(1, 0xffffff, 0.8); g.lineBetween(px - 6, py - 4, px + 6, py + 4);
        }
      } else if (gt.look === 'magnet') {
        // A great horseshoe lodestone set across the way, red and silver poles, iron filings standing in its field.
        g.fillStyle(0x2a2a30, 0.4); g.fillRect(r.x, r.y, r.w, r.h);
        const mx = r.x + r.w / 2, my = r.y + r.h / 2, mr = Math.min(r.w, r.h) * 0.42;
        g.lineStyle(mr * 0.45, col, 1); g.beginPath(); g.arc(mx, my, mr * 0.7, Math.PI, 0, false); g.strokePath();
        g.fillStyle(0xd8dce4, 1); g.fillRect(mx - mr * 0.92, my - 2, mr * 0.45, mr * 0.5); g.fillRect(mx + mr * 0.47, my - 2, mr * 0.45, mr * 0.5);
        g.lineStyle(1, 0x3a3a42, 0.8);
        for (let k = 0; k < 7; k++) {
          const a = Math.PI * (k / 6), rr = mr * (1.15 + 0.08 * Math.sin(t * 2 + k));
          g.beginPath(); g.arc(mx, my, rr, Math.PI + a * 0.15, -a * 0.15, false); g.strokePath();
        }
        for (let x = r.x + 6; x < r.x + r.w; x += 9) { const hgt = 4 + 3 * Math.abs(Math.sin(x * 0.2 + t)); g.lineStyle(1, 0x5a5a62, 1); g.lineBetween(x, r.y + r.h - 2, x + 1, r.y + r.h - 2 - hgt); }
      } else if (gt.look === 'lead') {
        // A lead-lined blast door: dull grey plate, hazard chevrons along the foot, a trefoil warning sign.
        g.fillStyle(dim(col, 0.35), 1); g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle(col, 1); g.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
        for (let x = r.x + 4, k = 0; x < r.x + r.w - 4; x += 12, k++) { g.fillStyle(k % 2 ? 0x1a1a1a : 0xe8c83a, 1); g.fillRect(x, r.y + r.h - 14, Math.min(12, r.x + r.w - 4 - x), 10); }
        const sx = r.x + r.w / 2, sy = r.y + (r.h - 14) / 2, sr = Math.min(r.w, r.h - 14) * 0.3;
        g.fillStyle(0xe8c83a, 1); g.fillCircle(sx, sy, sr);
        g.fillStyle(0x1a1a1a, 1);
        for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * (Math.PI * 2 / 3); g.slice(sx, sy, sr * 0.85, a - 0.5, a + 0.5, false); g.fillPath(); }
        g.fillStyle(0xe8c83a, 1); g.fillCircle(sx, sy, sr * 0.28); g.fillStyle(0x1a1a1a, 1); g.fillCircle(sx, sy, sr * 0.18);
        g.fillStyle(0x9aff7a, 0.12 + 0.08 * Math.sin(t * 3)); g.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      } else if (gt.look === 'rubber') {
        // A stretched black rubber membrane across the way, bulging and rippling as if leaned on.
        g.fillStyle(0x4a4a50, 1); g.fillRect(r.x, r.y, 6, r.h); g.fillRect(r.x + r.w - 6, r.y, 6, r.h);
        g.fillStyle(col, 1); g.fillRect(r.x + 6, r.y + 2, r.w - 12, r.h - 4);
        const bx = r.x + r.w / 2 + Math.sin(t * 1.4) * r.w * 0.2, by = r.y + r.h / 2;
        g.fillStyle(lit(col, 0.25), 1); g.fillEllipse(bx, by, r.w * 0.35, r.h * 0.55);
        g.fillStyle(lit(col, 0.45), 1); g.fillEllipse(bx - r.w * 0.06, by - r.h * 0.12, r.w * 0.12, r.h * 0.16);
        g.lineStyle(1, 0x5a5a62, 0.7);
        for (let k = 1; k < 4; k++) g.strokeEllipse(bx, by, r.w * 0.35 + k * 18 + Math.sin(t * 3 + k) * 4, r.h * 0.55 + k * 10);
      } else if (gt.look === 'phase') {
        // A barrier that is half there: a violet sheet flickering between two offsets, interference bands sliding.
        const off = Math.sin(t * 7) > 0.3 ? 4 : -4;
        g.fillStyle(col, 0.22); g.fillRect(r.x + off, r.y, r.w, r.h);
        g.fillStyle(0x8ae8e8, 0.16); g.fillRect(r.x - off, r.y, r.w, r.h);
        for (let k = 0; k < 6; k++) { const y = r.y + ((t * 40 + k * r.h / 6) % r.h); g.fillStyle(0xffffff, 0.18); g.fillRect(r.x, y, r.w, 2); }
        g.lineStyle(2, col, 0.7 + 0.3 * Math.sin(t * 11)); g.strokeRect(r.x + off * 0.5, r.y, r.w, r.h);
      } else if (gt.look === 'fang') {
        // Two great curved white fangs crossed over the way, rooted in dark gum, venom beading at the tips and dripping.
        const horiz = r.w >= r.h, cx = r.x + r.w / 2, cy = r.y + r.h / 2, L = Math.max(r.w, r.h) * 0.62, Wd = Math.min(r.w, r.h) * 0.5 + 10;
        g.fillStyle(0x1a2414, 0.35); g.fillEllipse(cx, cy + 6, r.w + 8, r.h + 8);
        for (const s of [-1, 1]) {
          const bx = horiz ? cx - s * L * 0.55 : cx - Wd * 0.5, by = horiz ? cy - Wd * 0.5 : cy - s * L * 0.55;
          const tx = horiz ? cx + s * L * 0.5 : cx + Wd * 0.45, ty = horiz ? cy + Wd * 0.45 : cy + s * L * 0.5;
          const nx = -(ty - by), ny = tx - bx, nl = Math.hypot(nx, ny) || 1, ux = nx / nl, uy = ny / nl;
          const pts: Phaser.Math.Vector2[] = [];
          for (let k = 0; k <= 10; k++) {
            const u = k / 10, bow = Math.sin(u * Math.PI) * L * 0.12 * s, w = (1 - u) * 13 + 1;
            pts.push(new Phaser.Math.Vector2(bx + (tx - bx) * u + ux * (bow + w), by + (ty - by) * u + uy * (bow + w)));
          }
          for (let k = 10; k >= 0; k--) {
            const u = k / 10, bow = Math.sin(u * Math.PI) * L * 0.12 * s, w = (1 - u) * 13 + 1;
            pts.push(new Phaser.Math.Vector2(bx + (tx - bx) * u + ux * (bow - w), by + (ty - by) * u + uy * (bow - w)));
          }
          g.fillStyle(0xb8ae98, 1); g.fillPoints(pts.map((p) => new Phaser.Math.Vector2(p.x + 2, p.y + 3)), true);
          g.fillStyle(0xf4eedc, 1); g.fillPoints(pts, true);
          g.lineStyle(1.5, 0x8a8270, 1); g.strokePoints(pts, true);
          g.lineStyle(2, 0xffffff, 0.7);
          g.lineBetween(pts[2].x, pts[2].y, pts[6].x, pts[6].y);
          g.fillStyle(0x4a1a24, 1); g.fillEllipse(bx, by, 30, 18); g.fillStyle(0x7a2a3a, 1); g.fillEllipse(bx, by - 2, 22, 10);
          // Venom beading at the tip, a drop falling.
          g.fillStyle(0x7ad83a, 0.9); g.fillCircle(tx, ty, 3 + Math.sin(t * 3 + s) * 0.8);
          const k = (t * 0.8 + (s > 0 ? 0.5 : 0)) % 1;
          g.fillStyle(0x7ad83a, 0.85 * (1 - k)); g.fillEllipse(tx, ty + 4 + k * 26, 3, 4.5);
          g.lineStyle(1, 0x9af05a, 0.5 * k); g.strokeEllipse(tx, ty + 32, 6 + k * 12, 2 + k * 4);
        }
        g.fillStyle(0x6ac82a, 0.25); g.fillEllipse(cx, r.y + r.h - 4, r.w * 0.5, 8);
      } else if (gt.look === 'web') {
        // A spider-web strung across: anchor threads to the frame, spokes and a spiral, dew glinting, the
        // spider sitting in the hub, legs flexing.
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2, R = Math.hypot(r.w, r.h) / 2;
        g.fillStyle(0x1a1a22, 0.15); g.fillRect(r.x, r.y, r.w, r.h);
        const sway = Math.sin(t * 0.9) * 2;
        const spokes = 12, ends: [number, number][] = [];
        for (let k = 0; k < spokes; k++) {
          const a = (k / spokes) * Math.PI * 2 + 0.13, ca = Math.cos(a), sa = Math.sin(a);
          const sx = Math.abs(ca) > 1e-4 ? (r.w / 2) / Math.abs(ca) : Infinity, sy = Math.abs(sa) > 1e-4 ? (r.h / 2) / Math.abs(sa) : Infinity;
          const d = Math.min(sx, sy, R);
          ends.push([cx + ca * d, cy + sa * d]);
          g.lineStyle(1.2, 0xe8ecf0, 0.75); g.lineBetween(cx + sway, cy, cx + ca * d, cy + sa * d);
        }
        g.lineStyle(1, 0xdce4ea, 0.6);
        for (let ring = 1; ring <= 7; ring++) {
          const f = ring / 8;
          g.beginPath();
          for (let k = 0; k <= spokes; k++) {
            const [ex, ey] = ends[k % spokes], sag = 0.96 + 0.04 * Math.sin(k * 2.1 + ring);
            const px = cx + sway * (1 - f) + (ex - cx) * f * sag, py = cy + (ey - cy) * f * sag;
            if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.strokePath();
        }
        for (let k = 0; k < 10; k++) {
          const [ex, ey] = ends[(k * 5) % spokes], f = 0.2 + ((k * 0.37) % 0.75);
          const tw = Math.max(0, Math.sin(t * 2 + k * 1.9));
          g.fillStyle(0xffffff, 0.3 + 0.6 * tw); g.fillCircle(cx + (ex - cx) * f, cy + (ey - cy) * f, 1.3);
        }
        // The spider: body and head, eight legs that flex.
        const sx = cx + sway, sy = cy + Math.sin(t * 0.6) * 3;
        g.lineStyle(2, 0x1a1418, 1);
        for (let k = 0; k < 4; k++) for (const sd of [-1, 1]) {
          const a = (k - 1.5) * 0.45 + (sd < 0 ? Math.PI : 0), flex = Math.sin(t * 4 + k) * 0.1;
          const kx = sx + Math.cos(a + flex) * 12 * sd * sd, ky = sy + Math.sin(a + flex) * 10 - 6;
          g.lineBetween(sx, sy, kx, ky); g.lineBetween(kx, ky, kx + Math.cos(a) * 8, ky + 10);
        }
        g.fillStyle(0x2a1e24, 1); g.fillEllipse(sx, sy + 6, 14, 16); g.fillStyle(0x1a1418, 1); g.fillCircle(sx, sy - 4, 5);
        g.fillStyle(0xc83a2a, 1); g.fillTriangle(sx - 3, sy + 4, sx + 3, sy + 4, sx, sy + 9); g.fillTriangle(sx - 3, sy + 12, sx + 3, sy + 12, sx, sy + 7);
        g.fillStyle(0xff5a3a, 0.9); g.fillCircle(sx - 2, sy - 5, 1); g.fillCircle(sx + 2, sy - 5, 1); g.fillCircle(sx - 1, sy - 3, 0.8); g.fillCircle(sx + 1, sy - 3, 0.8);
      } else if (gt.look === 'chain') {
        // Curtains of heavy chain hanging from a beam, each strand of interlocking links swaying a little.
        const horiz = r.w >= r.h;
        g.fillStyle(0x3a2a1a, 1);
        if (horiz) g.fillRect(r.x - 4, r.y - 6, r.w + 8, 8); else g.fillRect(r.x - 6, r.y - 4, 8, r.h + 8);
        g.fillStyle(0x6a6e78, 1);
        const n = Math.max(3, Math.floor((horiz ? r.w : r.h) / 14));
        for (let s = 0; s < n; s++) {
          const base = (s + 0.5) * ((horiz ? r.w : r.h) / n), sw = Math.sin(t * 1.3 + s * 0.8) * 2.5;
          const len = horiz ? r.h : r.w;
          for (let k = 0, d = 0; d < len - 4; k++, d += 9) {
            const off = sw * (d / len);
            const lx = horiz ? r.x + base + off : r.x + d, ly = horiz ? r.y + d : r.y + base + off;
            const side = k % 2 === 0;
            const w = horiz ? (side ? 7 : 3) : 11, h = horiz ? 11 : (side ? 7 : 3);
            g.lineStyle(2.5, 0x2a2c32, 1); g.strokeEllipse(lx + 1, ly + 1, w, h);
            g.lineStyle(2, col, 1); g.strokeEllipse(lx, ly, w, h);
            if (side) { g.lineStyle(1, 0xc8ccd4, 0.7); g.lineBetween(lx - w * 0.25, ly - h * 0.3, lx - w * 0.25, ly - h * 0.05); }
          }
        }
        g.fillStyle(0x8a5a2a, 0.5);
        for (let k = 0; k < 4; k++) g.fillCircle(r.x + ((k * 53) % r.w), r.y + ((k * 37) % r.h), 1.5);
      } else if (gt.look === 'shadow') {
        // A wall of moving darkness: layered black billows heaving inside the gap, tendrils licking out at
        // the edges, a few pale eyes opening and closing in it.
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        g.fillStyle(col, 0.85); g.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
        for (let k = 0; k < 14; k++) {
          const px = r.x + ((k * 47) % r.w) + Math.sin(t * 1.1 + k) * 8, py = r.y + ((k * 31) % r.h) + Math.cos(t * 0.9 + k * 1.7) * 8;
          const s = 18 + (k % 4) * 8 + Math.sin(t * 2 + k) * 4;
          g.fillStyle(k % 2 ? 0x0a0612 : 0x1e1430, 0.7); g.fillCircle(px, py, s);
        }
        for (let k = 0; k < 10; k++) {
          const edge = k % 4, u = ((k * 0.37 + t * 0.05) % 1);
          let ex = edge < 2 ? r.x + u * r.w : (edge === 2 ? r.x : r.x + r.w), ey = edge < 2 ? (edge === 0 ? r.y : r.y + r.h) : r.y + u * r.h;
          const ox = ex - cx, oy = ey - cy, ol = Math.hypot(ox, oy) || 1, reach = 8 + 10 * Math.max(0, Math.sin(t * 2.4 + k * 1.3));
          g.lineStyle(3, 0x0a0612, 0.75); g.beginPath(); g.moveTo(ex, ey);
          for (let j = 1; j <= 3; j++) { ex += (ox / ol) * reach / 3 + Math.sin(t * 3 + k + j) * 2; ey += (oy / ol) * reach / 3 + Math.cos(t * 3 + k + j) * 2; g.lineTo(ex, ey); }
          g.strokePath();
        }
        for (let k = 0; k < 3; k++) {
          const op = Math.max(0, Math.sin(t * 0.8 + k * 2.1));
          if (op < 0.2) continue;
          const ex = r.x + r.w * (0.25 + k * 0.25), ey = r.y + r.h * (0.35 + ((k * 0.3) % 0.4));
          g.fillStyle(0xd8d0ff, 0.75); g.fillEllipse(ex - 4, ey, 4, 3 * op); g.fillEllipse(ex + 4, ey, 4, 3 * op);
          g.fillStyle(0x1a0a2a, 1); g.fillRect(ex - 4.4, ey - 1, 0.8, 2 * op); g.fillRect(ex + 3.6, ey - 1, 0.8, 2 * op);
        }
      } else if (gt.look === 'lychgate') {
        // A roofed churchyard gate: two weathered timber posts, a little shingled gable over them, a pair of
        // barred gates shut between, a hanging lantern guttering and a bell under the ridge.
        const horiz = r.w >= r.h, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const span = horiz ? r.w : r.h;
        const p1 = horiz ? [r.x + 4, cy] : [cx, r.y + 4], p2 = horiz ? [r.x + r.w - 4, cy] : [cx, r.y + r.h - 4];
        for (const [px, py] of [p1, p2]) {
          g.fillStyle(0x2a1e14, 1); g.fillRect(px - 6, py - 42, 12, 50);
          g.fillStyle(col, 1); g.fillRect(px - 5, py - 42, 9, 48);
          g.lineStyle(1, 0x2a1e14, 0.7); g.lineBetween(px - 2, py - 38, px - 2, py + 2); g.lineBetween(px + 1, py - 30, px + 1, py - 10);
          g.fillStyle(0x6a6458, 1); g.fillRect(px - 8, py + 4, 16, 6);
        }
        // Gates: palings between the posts.
        const gx0 = p1[0], gy0 = p1[1], gx1 = p2[0], gy1 = p2[1];
        g.fillStyle(0x3a2c20, 1);
        if (horiz) { g.fillRect(gx0 + 6, gy0 - 26, gx1 - gx0 - 12, 4); g.fillRect(gx0 + 6, gy0 - 4, gx1 - gx0 - 12, 4); }
        g.lineStyle(3, lit(col, 0.1), 1);
        for (let u = 12; u < span - 12; u += 9) {
          const px = horiz ? r.x + u : cx, py = horiz ? cy : r.y + u;
          if (horiz) { g.lineBetween(px, py - 30, px, py + 2); g.fillStyle(0x2a1e14, 1); g.fillTriangle(px - 2, py - 30, px + 2, py - 30, px, py - 35); }
          else g.lineBetween(px - 14, py, px + 14, py);
        }
        g.fillStyle(0x1a1a1a, 1); g.fillCircle(horiz ? cx : cx + 10, horiz ? cy - 14 : cy, 2.5);
        // Roof: a gable of dark shingles over the whole span.
        const ry = (horiz ? cy : r.y) - 48, rx0 = (horiz ? r.x : cx - 22) - 10, rx1 = (horiz ? r.x + r.w : cx + 22) + 10;
        g.fillStyle(0x1e1a1e, 1); g.fillTriangle(rx0, ry + 10, rx1, ry + 10, (rx0 + rx1) / 2, ry - 14);
        g.fillStyle(0x3a343a, 1); g.fillRect(rx0, ry + 4, rx1 - rx0, 10);
        g.lineStyle(1, 0x14101a, 1);
        for (let x = rx0 + 6; x < rx1; x += 8) g.lineBetween(x, ry + 4, x, ry + 14);
        for (let x = rx0 + 2; x < rx1; x += 10) g.lineBetween(x, ry + 9, x + 4, ry + 9);
        g.fillStyle(0x5a5050, 1); g.fillRect(rx0 - 2, ry + 12, rx1 - rx0 + 4, 3);
        // Bell under the ridge, swaying, and a lantern hanging from the eave.
        const bs = Math.sin(t * 1.6) * 0.25, bx = (rx0 + rx1) / 2, by = ry + 18;
        g.lineStyle(1, 0x2a2a2a, 1); g.lineBetween(bx, ry + 4, bx + Math.sin(bs) * 6, by);
        g.fillStyle(0x8a7a4a, 1); g.fillTriangle(bx + Math.sin(bs) * 6 - 5, by + 8, bx + Math.sin(bs) * 6 + 5, by + 8, bx + Math.sin(bs) * 6, by - 2);
        g.fillStyle(0xb8a86a, 1); g.fillCircle(bx + Math.sin(bs) * 8, by + 9, 1.5);
        const lx = rx0 + 10, ly = ry + 30, fl = 0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 3.7);
        g.lineStyle(1, 0x2a2a2a, 1); g.lineBetween(lx, ry + 14, lx, ly - 6);
        g.fillStyle(0xc8f0b0, 0.12 * fl); g.fillCircle(lx, ly, 16);
        g.fillStyle(0x2a2420, 1); g.fillRect(lx - 4, ly - 6, 8, 11);
        g.fillStyle(0xb8f08a, 0.85 * fl); g.fillRect(lx - 2.5, ly - 4, 5, 7);
      } else if (gt.look === 'candy') {
        // Candy-cane bars, red-and-white striped.
        g.fillStyle(0xfff0f6, 0.5); g.fillRect(r.x, r.y, r.w, r.h);
        for (let x = r.x + 8; x < r.x + r.w; x += 16) {
          g.fillStyle(0xffffff, 1); g.fillRoundedRect(x - 4, r.y, 8, r.h, 4);
          g.lineStyle(3, 0xe83a5a, 1);
          for (let y = r.y + 4; y < r.y + r.h - 4; y += 10) g.lineBetween(x - 4, y + 4, x + 4, y);
        }
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
    const caught = DUNGEON_CATCH[isleOf(this.def.id) ?? 'fire'] ?? DUNGEON_CATCH.fire;
    this.cameras.main.flash(220, caught.flash[0], caught.flash[1], caught.flash[2]);
    this.cameras.main.shake(160, 0.006);
    Sfx.play(caught.sfx);
    this.toast(`${caught.text} Back to the last checkpoint.`);
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
