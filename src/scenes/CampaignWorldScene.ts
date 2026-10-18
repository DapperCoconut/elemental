import Phaser from 'phaser';
import { World, WorldNode, WORLDS, getFightNodes } from '../data/Worlds';
import { ABSTRACT_WORLDS, getAbstractWorld, getAnyWorld } from '../data/AbstractWorlds';
import { CORRUPT_WORLDS } from '../data/CorruptWorlds';
import * as CP from '../data/CampaignProgress';
import {
  getCampaignFightDef, getCampaignReward, isCorruptWorld, DIFFICULTY_LABEL, ELEMENT_DISPLAY,
} from '../data/CampaignFights';
import { getMutationDef } from '../data/Mutations';
import { getItemsForElement } from '../data/Items';
import { getWorldBossDef } from '../boss/bosses';
import { maybePlayStory } from './DialogueScene';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, addChip, addIconButton, addWell, fillDiamond, showToast,
} from '../ui';
import { Music } from '../audio';
import { TownLayout, Pt, Rect, buildTownLayout, hashString } from '../campaign/town/TownLayout';
import { TownTheme, getTownTheme, townName } from '../campaign/town/TownTheme';
import { DoorState, TownRenderer, TownRenderState } from '../campaign/town/TownRenderer';
import { TownNpcs } from '../campaign/town/TownNpcs';
import { TownAtmos } from '../campaign/town/TownAtmos';
import { TownWalker, getTownAvatarElement } from '../campaign/town/TownWalker';

/**
 * A campaign world as a free-roam town.
 *
 * Every world in all three realms is a walkable town whose roads lead to its neighbours in
 * the realm's tree — out of Fire Town's south-west gate and you are walking into Water
 * Town. The node map's stops became places:
 *
 *   - the five fights are menacing buildings with red doors, opened in order;
 *   - the challenge (the World Sovereign) lives in the castle;
 *   - Invasion is down the sewer grate in the street;
 *   - the Gauntlet is behind the cellar door;
 *   - the shop is the storefront (and the market stall) on the plaza.
 *
 * Walk up and press E. Every door launches exactly what its node used to: the fight menu
 * (paused over this scene) or the shop. The scene key is unchanged, so everything that
 * starts, pauses or resumes 'CampaignWorldScene' keeps working.
 */

type Realm = 'normal' | 'abstract' | 'corrupt';

interface Spot {
  x: number; y: number; r: number;
  title: () => string;
  body: () => string;
  /** Verb on the key badge, or null for read-only spots. */
  verb: () => string | null;
  use: () => void;
}

interface PortalDef {
  target: string;
  label: string;
  color: number;
  open: () => boolean;
  /** Called instead of travelling while sealed. */
  sealed: () => void;
}

/** Where the player stood last in each world, so returning from a fight lands at the door. */
const LAST_POS = new Map<string, Pt>();
/** Layouts are deterministic and a little costly — build each world's once per session. */
const LAYOUTS = new Map<string, TownLayout>();

const HUD_Z = 20000;
const R_PLAYER = 11;
const WALK = 200;
const RUN = 330;

export class CampaignWorldScene extends Phaser.Scene {
  private worldId = 'fire';
  private slotIdx: 0 | 1 | 2 = 0;
  private fromWorldId: string | null = null;
  private spawnKind: 'portal' | null = null;
  private freshEntry = false;

  private world!: World;
  private realm: Realm = 'normal';
  private L!: TownLayout;
  private theme!: TownTheme;
  private townArt!: TownRenderer;
  private npcs!: TownNpcs;
  private atmos!: TownAtmos;
  private walker!: TownWalker;

  private px = 0;
  private py = 0;
  private facing = Math.PI / 2;
  private moving = false;
  private leaving = false;
  private graceUntil = 0;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private spots: Spot[] = [];
  private current: Spot | null = null;
  private blockers: Rect[] = [];
  private lockedExits = new Set<string>();
  private portals: PortalDef[] = [];

  private promptTitle!: Phaser.GameObjects.Text;
  private promptBody!: Phaser.GameObjects.Text;
  private promptKey!: Phaser.GameObjects.Container;
  private promptVerb!: Phaser.GameObjects.Text;
  private hudProgress!: Phaser.GameObjects.Text;
  private sparkChip!: { setValue: (v: string) => void };
  private keyChip!: { setValue: (v: string) => void };
  private miniDot!: Phaser.GameObjects.Arc;
  private miniScale = 1;
  private miniX = 0;
  private miniY = 0;
  private marker!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'CampaignWorldScene' });
  }

  init(data: {
    worldId: string; slotIdx: 0 | 1 | 2; mode?: Realm;
    fromWorldId?: string; spawn?: 'portal';
  }): void {
    this.worldId = data?.worldId ?? 'fire';
    this.slotIdx = data?.slotIdx ?? 0;
    this.fromWorldId = data?.fromWorldId ?? null;
    this.spawnKind = data?.spawn ?? null;
    // Arriving off the world map is a fresh visit — start in the square.
    this.freshEntry = data?.mode !== undefined;
    this.leaving = false;
    this.spots = [];
    this.current = null;
    this.blockers = [];
    this.lockedExits = new Set();
    this.portals = [];
  }

  create(): void {
    Music.play('campaign');
    const world = getAnyWorld(this.worldId);
    this.realm = isCorruptWorld(this.worldId) ? 'corrupt' : getAbstractWorld(this.worldId) ? 'abstract' : 'normal';
    if (!world) { this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: this.realm }); return; }
    this.world = world;
    this.theme = getTownTheme(world.id);
    const slot = this.slotIdx;

    const realmWorlds = this.realm === 'corrupt' ? CORRUPT_WORLDS : this.realm === 'abstract' ? ABSTRACT_WORLDS : WORLDS;
    this.portals = this.portalDefs();
    let L = LAYOUTS.get(world.id);
    if (!L) {
      L = buildTownLayout(world, realmWorlds, this.theme, {
        portals: this.portals.length,
        amalgam: world.id === 'ruin',
      });
      LAYOUTS.set(world.id, L);
    }
    this.L = L;
    this.cameras.main.setBackgroundColor(this.theme.ground);

    // ── Progress → door states ──────────────────────────────────────
    const fightNodes = getFightNodes(world);
    const fightStates: DoorState[] = fightNodes.map((n) =>
      CP.isFightCompleted(slot, world.id, n.id) ? 'cleared'
        : CP.isFightUnlocked(slot, world.id, n.id) ? 'open' : 'locked');
    const castleState: DoorState = CP.isChallengeCompleted(slot, world.id) ? 'cleared'
      : CP.isChallengeUnlocked(slot, world.id) ? 'open' : 'locked';
    const boss = getWorldBossDef(world.id);
    const challengeNode = world.nodes.find((n) => n.kind === 'challenge');

    for (const e of L.exits) {
      if (!CP.isWorldUnlocked(slot, e.worldId)) {
        this.lockedExits.add(e.worldId);
        this.blockers.push(e.barricade);
      }
    }

    const st: TownRenderState = {
      fights: fightStates,
      castle: castleState,
      castleName: boss?.name ?? (challengeNode ? getCampaignFightDef(challengeNode.id)?.name ?? 'The Keep' : 'The Keep'),
      bossColor: boss?.color ?? world.color,
      gauntletDone: CP.isGauntletCompleted(slot, world.id),
      exits: L.exits.map((e) => ({
        worldId: e.worldId,
        label: townName(getAnyWorld(e.worldId)?.name ?? e.worldId),
        locked: this.lockedExits.has(e.worldId),
      })),
      portals: this.portals.map((p, i) => ({ at: (i === 0 ? L.spots.portal : L.spots.portal2)!, label: p.label, color: p.color })),
      amalgam: L.spots.amalgam ? { at: L.spots.amalgam, open: CP.canFightAmalgam(slot), felled: CP.isAmalgamFelled(slot) } : undefined,
      worldColor: world.color,
    };
    this.townArt = new TownRenderer(this, L, this.theme, st, hashString(`art:${world.id}`));

    // ── Spawn ───────────────────────────────────────────────────────
    const key = `${slot}:${world.id}`;
    if (this.freshEntry) LAST_POS.delete(key);
    let spawn: Pt = L.spawnDefault;
    const fromExit = this.fromWorldId ? L.exits.find((e) => e.worldId === this.fromWorldId) : undefined;
    if (this.spawnKind === 'portal' && this.fromWorldId) {
      const idx = this.portals.findIndex((p) => p.target === this.fromWorldId);
      const at = idx === 0 ? L.spots.portal : idx === 1 ? L.spots.portal2 : undefined;
      if (at) spawn = { x: at.x, y: at.y + 56 };
    } else if (fromExit) {
      spawn = fromExit.spawn;
    } else if (LAST_POS.has(key)) {
      spawn = LAST_POS.get(key)!;
    }
    this.px = spawn.x; this.py = spawn.y;
    this.facing = fromExit ? Math.atan2(-fromExit.dir.y, -fromExit.dir.x) : -Math.PI / 2;

    this.walker = new TownWalker(this, getTownAvatarElement(), this.px, this.py);
    this.npcs = new TownNpcs(this, L, this.theme, hashString(`npc:${world.id}`), {
      guardLines: () => castleState === 'cleared'
        ? ['You did it. The whole town is talking.', 'The throne room is quiet now.']
        : castleState === 'open'
          ? [`${boss?.name ?? 'The Sovereign'} is expecting you.`, 'Step through. If you dare.']
          : [this.theme.guardLine, 'Five red doors. Then we talk.'],
      keeperLines: () => [this.theme.shopLine, `Welcome to ${this.theme.shopName.toLowerCase().replace(/(^|\s)\S/g, (s) => s.toUpperCase())}!`, 'Step up and press E to browse.'],
    });
    this.atmos = new TownAtmos(this, this.theme);
    this.marker = this.add.graphics().setDepth(9200);

    this.buildSpots(fightNodes, fightStates, castleState, challengeNode);
    this.buildHud(fightNodes.length, fightStates, castleState);

    // ── Input ───────────────────────────────────────────────────────
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,ENTER,SHIFT,M') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-ESC', () => this.toMap());
    kb.on('keydown-M', () => this.toMap());

    const onResume = () => {
      this.input.keyboard?.resetKeys();
      this.graceUntil = this.game.loop.time + 280;
      this.sparkChip?.setValue(`${CP.getSparks(this.slotIdx)}`);
      this.keyChip?.setValue(`${CP.getKeys(this.slotIdx)}`);
    };
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      this.npcs?.destroy();
      this.walker?.destroy();
    });

    this.updateCamera();
    this.graceUntil = this.game.loop.time + 200;
    this.cameras.main.fadeIn(280, 0, 0, 0);

    // First visit: the Herald introduces the world.
    maybePlayStory(this, this.slotIdx, `world-enter:${this.worldId}`);
  }

  // ── Realm portals ─────────────────────────────────────────────────

  private portalDefs(): PortalDef[] {
    const slot = this.slotIdx;
    const launchPortal = (realm?: 'corrupt') => {
      this.scene.pause();
      this.scene.launch('CampaignPortalScene', { slotIdx: slot, realm, callerKey: 'CampaignWorldScene' });
    };
    if (this.worldId === 'fire') {
      return [{
        target: 'electricity', label: 'PORTAL · ABSTRACT REALM', color: C.arcane,
        open: () => CP.isPortalUnlocked(slot), sealed: () => launchPortal(),
      }];
    }
    if (this.worldId === 'electricity') {
      return [
        { target: 'fire', label: 'PORTAL · FIRE TOWN', color: C.ember, open: () => true, sealed: () => undefined },
        {
          target: 'ruin', label: 'THE SCAR · CORRUPT REALM', color: C.blood,
          open: () => CP.isCorruptPortalUnlocked(slot), sealed: () => launchPortal('corrupt'),
        },
      ];
    }
    if (this.worldId === 'ruin') {
      return [{ target: 'electricity', label: 'PORTAL · ABSTRACT REALM', color: C.arcane, open: () => true, sealed: () => undefined }];
    }
    return [];
  }

  // ── Interactables ─────────────────────────────────────────────────

  private buildSpots(fightNodes: WorldNode[], fightStates: DoorState[], castleState: DoorState, challengeNode?: WorldNode): void {
    const L = this.L;
    const slot = this.slotIdx;
    const world = this.world;

    // The five red doors.
    for (const b of L.buildings) {
      if (b.kind !== 'fight' || !b.fightIndex) continue;
      const node = fightNodes[b.fightIndex - 1];
      if (!node) continue;
      const state = fightStates[b.fightIndex - 1];
      this.spots.push({
        x: b.door.x, y: b.door.y, r: 56,
        title: () => this.infoForNode(node).title,
        body: () => this.infoForNode(node).body,
        verb: () => state === 'locked' ? null : state === 'cleared' ? 'REMATCH' : 'ENTER',
        use: () => {
          if (state === 'locked') { this.nudge('The red door is chained shut. Win the fight before it first.'); return; }
          this.openFightMenu(node.id, false);
        },
      });
    }

    // The castle.
    const castle = L.buildings.find((b) => b.kind === 'castle');
    if (castle && challengeNode) {
      this.spots.push({
        x: castle.door.x, y: castle.door.y, r: 70,
        title: () => this.infoForNode(challengeNode).title,
        body: () => this.infoForNode(challengeNode).body,
        verb: () => castleState === 'locked' ? null : castleState === 'cleared' ? 'REMATCH' : 'ENTER',
        use: () => {
          if (castleState === 'locked') { this.nudge('The portcullis is down. Beat all five red doors first.'); return; }
          this.openFightMenu(challengeNode.id, true);
        },
      });
    }

    // Shop: the storefront door, its keeper, and the market stall.
    const shopNode = world.nodes.find((n) => n.kind === 'shop');
    const shop = L.buildings.find((b) => b.kind === 'shop');
    if (shopNode) {
      const shopSpot = (x: number, y: number, r: number, who: string): Spot => ({
        x, y, r,
        title: () => `🛒  ${this.theme.shopName}`,
        body: () => `${who}   ·   ${this.infoForNode(shopNode).body}`,
        verb: () => 'SHOP',
        use: () => this.openShopMenu(),
      });
      if (shop) this.spots.push(shopSpot(shop.door.x, shop.door.y, 46, 'The storefront'));
      this.spots.push(shopSpot(L.spots.shopKeeper.x, L.spots.shopKeeper.y + 30, 52, this.theme.shopkeeper));
      this.spots.push(shopSpot(L.spots.stall.x, L.spots.stall.y + 28, 58, 'Market stall'));
    }

    // Invasion: the sewer grate.
    const invNode = world.nodes.find((n) => n.kind === 'invasion');
    if (invNode) {
      this.spots.push({
        x: L.spots.grate.x, y: L.spots.grate.y, r: 48,
        title: () => '👾  SEWER GRATE — INVASION',
        body: () => this.infoForNode(invNode).body,
        verb: () => 'DESCEND',
        use: () => this.openFightMenu(invNode.id, false, invNode.kind),
      });
    }

    // Gauntlet: the cellar door.
    const gNode = world.nodes.find((n) => n.kind === 'gauntlet');
    if (gNode) {
      this.spots.push({
        x: L.spots.gauntlet.x, y: L.spots.gauntlet.y + 8, r: 50,
        title: () => '🏆  CELLAR DOOR — GAUNTLET',
        body: () => this.infoForNode(gNode).body,
        verb: () => 'DESCEND',
        use: () => this.openFightMenu(gNode.id, false, gNode.kind),
      });
    }

    // Fast-travel kiosk.
    this.spots.push({
      x: L.spots.kiosk.x, y: L.spots.kiosk.y + 18, r: 46,
      title: () => '🗺️  TOWN MAP — FAST TRAVEL',
      body: () => 'Open the world map to jump to any town you have reached, or cross realms.',
      verb: () => 'MAP',
      use: () => this.toMap(),
    });

    // Signpost.
    this.spots.push({
      x: L.spots.fingerpost.x, y: L.spots.fingerpost.y + 12, r: 40,
      title: () => '🪧  SIGNPOST',
      body: () => L.exits.map((e) => {
        const arrow = e.dir.x > 0 ? '→' : e.dir.x < 0 ? '←' : e.dir.y < 0 ? '↑' : '↓';
        const w = getAnyWorld(e.worldId);
        return `${arrow} ${townName(w?.name ?? e.worldId)}${this.lockedExits.has(e.worldId) ? ' (sealed)' : ''}`;
      }).join('   ·   ') || 'No roads lead out of here.',
      verb: () => null,
      use: () => undefined,
    });

    // Barricades on sealed roads.
    for (const e of L.exits) {
      if (!this.lockedExits.has(e.worldId)) continue;
      const w = getAnyWorld(e.worldId);
      const b = e.barricade;
      this.spots.push({
        x: b.x + b.w / 2 - e.dir.x * 40, y: b.y + b.h / 2 - e.dir.y * 40 + 10, r: 90,
        title: () => `🚧  ROAD TO ${townName(w?.name ?? e.worldId)} — SEALED`,
        body: () => this.lockReason(e.worldId),
        verb: () => null,
        use: () => undefined,
      });
    }

    // Realm portals.
    this.portals.forEach((p, i) => {
      const at = i === 0 ? L.spots.portal : L.spots.portal2;
      if (!at) return;
      const target = getAnyWorld(p.target);
      this.spots.push({
        x: at.x, y: at.y + 24, r: 56,
        title: () => `🌀  ${p.label}`,
        body: () => p.open()
          ? `Step through to ${townName(target?.name ?? p.target)}.`
          : p.target === 'ruin'
            ? (CP.canOpenCorruptPortal(slot) ? 'Something bleeds through… it can be torn wider.' : `Sealed. Fell ${CP.CORRUPT_PORTAL_CHALLENGES} Sovereigns in the Abstract Realm first.`)
            : 'Sealed. Keys from the castles open it.',
        verb: () => p.open() ? 'TRAVEL' : 'INSPECT',
        use: () => {
          if (p.open()) this.travel(p.target, 'portal');
          else p.sealed();
        },
      });
    });

    // The Amalgam's pit (the corrupt root).
    if (L.spots.amalgam) {
      const at = L.spots.amalgam;
      this.spots.push({
        x: at.x, y: at.y + 36, r: 70,
        title: () => CP.isAmalgamFelled(slot) ? '🕳️  THE AMALGAM  ★' : '🕳️  THE AMALGAM',
        body: () => CP.isAmalgamFelled(slot) ? 'It comes apart again on request.'
          : CP.canFightAmalgam(slot) ? 'It has been waiting for all of them.'
          : `${CP.corruptChallengesCleared(slot)}/${CORRUPT_WORLDS.length} thrones standing. Every Sovereign must be back on its feet.`,
        verb: () => CP.canFightAmalgam(slot) ? 'DESCEND' : null,
        use: () => {
          if (!CP.canFightAmalgam(slot)) { this.nudge('The pit stirs, but does not open.'); return; }
          this.scene.start('CampaignFightMenuScene', {
            worldId: 'amalgam', nodeId: 'amalgam-challenge',
            isChallenge: true, kind: 'challenge', slotIdx: this.slotIdx,
          });
        },
      });
    }
  }

  private lockReason(targetId: string): string {
    const target = getAnyWorld(targetId);
    if (!target) return 'This road is closed.';
    if (target.parentId === this.world.id) {
      const done = getFightNodes(this.world).filter((n) => CP.isFightCompleted(this.slotIdx, this.world.id, n.id)).length;
      return `Beat all five red doors in ${townName(this.world.name)} to lift the barricade — ${done}/5 down.`;
    }
    const parent = target.parentId ? getAnyWorld(target.parentId) : undefined;
    return parent ? `Opens once ${townName(parent.name)}'s five red doors are beaten.` : 'This road is closed.';
  }

  // ── Scouting text (unchanged from the node map) ───────────────────

  /** The one-line scouting report for a node. */
  private infoForNode(node: WorldNode): { title: string; body: string } {
    if (node.kind === 'shop') {
      const stock = getItemsForElement(this.worldId);
      const cheapest = stock.reduce((m, i) => Math.min(m, i.priceSparks), Infinity);
      return {
        title: '🛒  WORLD SHOP',
        body: stock.length === 0
          ? 'Nothing stocked in this world.'
          : `${stock.length} items stocked   ·   from ⚡${cheapest}   ·   you hold ⚡${CP.getSparks(this.slotIdx)}`,
      };
    }
    if (node.kind === 'invasion') {
      return { title: '👾  INVASION', body: 'Endless husk waves. Pays 🩸 Corrupt Shards. Always open.' };
    }
    if (node.kind === 'gauntlet') {
      const done = CP.isGauntletCompleted(this.slotIdx, this.worldId);
      return {
        title: '🏆  GAUNTLET',
        body: done
          ? 'Already conquered — run it again for the practice.'
          : 'Five randomised bouts and a boss, back to back.',
      };
    }

    const def = getCampaignFightDef(node.id);
    if (!def) return { title: node.id.toUpperCase(), body: '' };

    const unlocked = node.kind === 'challenge'
      ? CP.isChallengeUnlocked(this.slotIdx, this.worldId)
      : CP.isFightUnlocked(this.slotIdx, this.worldId, node.id);
    if (!unlocked) {
      return {
        title: node.kind === 'challenge' ? '🔒  THE CASTLE — SEALED' : `🔒  RED DOOR ${roman(node)} — CHAINED`,
        body: node.kind === 'challenge'
          ? 'Clear every red door in this town first. Optional — the next towns open without it.'
          : 'Win the fight before it first.',
      };
    }

    // A world with a Sovereign ends on a boss, not a mutation rematch.
    if (node.kind === 'challenge') {
      const boss = getWorldBossDef(this.worldId);
      if (boss) {
        const reward = getCampaignReward(this.worldId, node.id, true, false);
        return {
          title: `👑  ${boss.name.toUpperCase()}${CP.isChallengeCompleted(this.slotIdx, this.worldId) ? '  ★' : ''}`,
          body: [
            boss.title,
            `${boss.phases.length} phases${boss.hard?.extraPhase ? ' (+1 on Hard)' : ''}`,
            `⚡${reward.sparks}  🗝️${reward.keys}`,
            'optional — keys open the Portal',
          ].join('   ·   '),
        };
      }
    }

    const elem = ELEMENT_DISPLAY[def.enemyElementId];
    const muts = (def.mutations ?? []).map((id) => {
      const m = getMutationDef(id);
      if (!m) return id;
      return `${def.starredMutations?.includes(id) ? '★' : ''}${m.emoji} ${m.name}`;
    });
    const reward = getCampaignReward(this.worldId, node.id, node.kind === 'challenge', false);
    const bits = [
      `vs ${elem ? `${elem.emoji} ${elem.name}` : def.enemyElementId}`,
      (DIFFICULTY_LABEL[def.difficulty] ?? String(def.difficulty)).toUpperCase(),
      muts.length > 0 ? muts.join(' + ') : 'no mutations',
      `⚡${reward.sparks}${reward.keys > 0 ? `  🗝️${reward.keys}` : ''}`,
    ];
    if (node.kind === 'challenge') bits.push('optional — keys open the Portal');
    const cleared = node.kind === 'fight' && CP.isFightCompleted(this.slotIdx, this.worldId, node.id);
    const head = node.kind === 'fight' ? `RED DOOR ${roman(node)} · ` : '';
    return { title: `${head}${(def.name ?? node.id).toUpperCase()}${cleared ? '  ✓' : ''}`, body: bits.join('   ·   ') };
  }

  // ── HUD ───────────────────────────────────────────────────────────

  /** Run `fn` and pin everything it made to the screen, above the world. */
  private hud<X>(fn: () => X): X {
    const before = new Set(this.children.list);
    const out = fn();
    for (const o of [...this.children.list]) if (!before.has(o)) this.pin(o, true);
    return out;
  }

  private pin(o: Phaser.GameObjects.GameObject, top: boolean): void {
    const any = o as Phaser.GameObjects.GameObject & {
      setScrollFactor?: (x: number, y?: number) => unknown; depth?: number; setDepth?: (d: number) => unknown;
    };
    any.setScrollFactor?.(0, 0);
    if (top && any.setDepth) any.setDepth((any.depth ?? 0) + HUD_Z);
    if (o instanceof Phaser.GameObjects.Container) for (const c of o.list) this.pin(c, false);
  }

  private buildHud(nFights: number, fightStates: DoorState[], castleState: DoorState): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const world = this.world;
    const th = this.theme;
    this.hud(() => {
      const banner = this.add.graphics().setDepth(DEPTH.panel);
      banner.fillStyle(0x04040c, 0.55); banner.fillRect(0, 0, width, 62);
      banner.lineStyle(3, world.color, 0.75);
      banner.beginPath(); banner.moveTo(50, 62); banner.lineTo(width - 50, 62); banner.strokePath();
      banner.lineStyle(1, mix(world.color, 0xffffff, 0.5), 0.3);
      banner.beginPath(); banner.moveTo(50, 66); banner.lineTo(width - 50, 66); banner.strokePath();
      fillDiamond(banner, cx, 62, 6, mix(world.color, 0xffffff, 0.5), 1);

      this.add.text(cx, 20, `${world.emoji}   ${townName(world.name)}`, {
        fontSize: '24px', fontFamily: FONT_DISPLAY,
        color: hex(mix(world.color, 0xffffff, 0.55)),
        stroke: hex(mix(world.color, 0x000000, 0.82)), strokeThickness: 5, letterSpacing: 4,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const cleared = fightStates.filter((s) => s === 'cleared').length;
      this.hudProgress = this.add.text(cx, 46,
        castleState === 'cleared'
          ? `${th.epithet.toUpperCase()}   ·   ★ TOWN CLEARED`
          : `${th.epithet.toUpperCase()}   ·   ${cleared}/${nFights} RED DOORS   ·   CASTLE ${castleState === 'open' ? 'OPEN' : 'SEALED'}`, {
          fontSize: '9.5px', fontFamily: FONT_DISPLAY,
          color: castleState === 'cleared' ? T.gold : T.dim, letterSpacing: 2,
        }).setOrigin(0.5).setDepth(DEPTH.content);

      this.sparkChip = addChip(this, {
        x: width - 14, y: 20, icon: '⚡', value: `${CP.getSparks(this.slotIdx)}`,
        accent: 0x2ee6c0, originX: 1, fontSize: 12, depth: DEPTH.content,
      });
      this.keyChip = addChip(this, {
        x: width - 14, y: 46, icon: '🗝️', value: `${CP.getKeys(this.slotIdx)}`,
        accent: C.gold, originX: 1, fontSize: 12, depth: DEPTH.content,
      });

      addBackButton(this, () => this.toMap());

      // Bag and map, bottom right. No tooltips: a tooltip is made on hover, after the
      // HUD has been pinned, and would land in the world.
      addIconButton(this, {
        x: width - 36, y: height - 36, r: 22, icon: '🎒', accent: C.gold, depth: DEPTH.content + 5,
        onClick: () => {
          this.scene.pause();
          this.scene.launch('InventoryScene', { slotIdx: this.slotIdx, callerKey: this.scene.key });
        },
      });
      addIconButton(this, {
        x: width - 88, y: height - 36, r: 20, icon: '🗺️', accent: C.ember, depth: DEPTH.content + 5,
        onClick: () => this.toMap(),
      });

      // Prompt strip.
      const py = height - 38;
      const pw = 540;
      addWell(this, cx, py, pw, 54, world.color, DEPTH.panel, 8);
      this.promptTitle = this.add.text(cx + 14, py - 11, '', {
        fontSize: '12.5px', fontFamily: FONT_DISPLAY, color: hex(mix(world.color, 0xffffff, 0.6)), letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.promptBody = this.add.text(cx + 14, py + 10, '', {
        fontSize: '10px', fontFamily: FONT_UI, color: T.dim, align: 'center', wordWrap: { width: pw - 110 },
      }).setOrigin(0.5).setDepth(DEPTH.content);
      const kx = cx - pw / 2 + 34;
      const keyG = this.add.graphics();
      keyG.fillStyle(0x000000, 0.4); keyG.fillRoundedRect(-15, -13, 30, 30, 6);
      keyG.fillStyle(mix(world.color, 0x000000, 0.35), 1); keyG.fillRoundedRect(-15, -15, 30, 28, 6);
      keyG.lineStyle(2, mix(world.color, 0xffffff, 0.5), 1); keyG.strokeRoundedRect(-15, -15, 30, 28, 6);
      const keyT = this.add.text(0, -2, 'E', { fontSize: '16px', fontFamily: FONT_DISPLAY, color: '#ffffff' }).setOrigin(0.5);
      this.promptVerb = this.add.text(0, 21, '', { fontSize: '7.5px', fontFamily: FONT_DISPLAY, color: T.normal, letterSpacing: 1 }).setOrigin(0.5);
      this.promptKey = this.add.container(kx, py - 4, [keyG, keyT, this.promptVerb]).setDepth(DEPTH.content);
      const hit = this.add.rectangle(cx, py, pw, 54, 0xffffff, 0).setDepth(DEPTH.content + 1).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.useCurrent());

      this.buildMinimap(height);
    });
    this.setPrompt(null);
  }

  private buildMinimap(height: number): void {
    const L = this.L;
    const mw = 168, mh = 112;
    const s = Math.min(mw / L.W, mh / L.H);
    this.miniScale = s;
    const ox = 12 + (mw - L.W * s) / 2, oy = height - 12 - mh + (mh - L.H * s) / 2;
    this.miniX = ox; this.miniY = oy;
    addWell(this, 12 + mw / 2, height - 12 - mh / 2, mw + 12, mh + 12, this.world.color, DEPTH.panel, 6);
    const g = this.add.graphics().setDepth(DEPTH.content);
    g.fillStyle(this.theme.ground, 0.9); g.fillRect(ox, oy, L.W * s, L.H * s);
    if (L.band) {
      g.lineStyle(Math.max(2, L.band.thick * s), this.theme.feature.color, 0.9);
      g.strokePoints(L.band.pts.map((p) => ({ x: ox + p.x * s, y: oy + p.y * s })), false);
    }
    for (const rd of L.roads) {
      g.lineStyle(Math.max(1.5, rd.w * s), mix(this.theme.street, 0xffffff, 0.15), 0.9);
      g.strokePoints(rd.pts.map((p) => ({ x: ox + p.x * s, y: oy + p.y * s })), false);
    }
    g.fillStyle(mix(this.theme.street, 0xffffff, 0.2), 1); g.fillCircle(ox + L.plaza.x * s, oy + L.plaza.y * s, L.plaza.r * s);
    for (const b of L.buildings) {
      const col = b.kind === 'house' ? mix(this.theme.wall, 0x000000, 0.2)
        : b.kind === 'fight' ? (CP.isFightCompleted(this.slotIdx, this.worldId, `${this.worldId}-fight-${b.fightIndex}`) ? C.gold : 0xd01818)
        : b.kind === 'castle' ? C.corrupt : C.gold;
      g.fillStyle(col, 1);
      g.fillRect(ox + b.rect.x * s, oy + b.rect.y * s, Math.max(2, b.rect.w * s), Math.max(2, b.rect.h * s));
    }
    g.fillStyle(0x7cff3d, 1); g.fillCircle(ox + L.spots.grate.x * s, oy + L.spots.grate.y * s, 2);
    g.fillStyle(C.frost, 1); g.fillCircle(ox + L.spots.gauntlet.x * s, oy + L.spots.gauntlet.y * s, 2);
    for (const e of L.exits) {
      g.fillStyle(this.lockedExits.has(e.worldId) ? 0xff4d6d : 0x4ade80, 1);
      const x = ox + Math.min(L.W - 20, Math.max(20, e.edge.x)) * s, y = oy + Math.min(L.H - 20, Math.max(20, e.edge.y)) * s;
      g.fillTriangle(x + e.dir.x * 4, y + e.dir.y * 4, x - e.dir.y * 3 - e.dir.x * 2, y + e.dir.x * 3 - e.dir.y * 2, x + e.dir.y * 3 - e.dir.x * 2, y - e.dir.x * 3 - e.dir.y * 2);
    }
    g.lineStyle(1, mix(this.world.color, 0xffffff, 0.4), 0.6); g.strokeRect(ox, oy, L.W * s, L.H * s);
    this.miniDot = this.add.circle(ox + this.px * s, oy + this.py * s, 2.6, 0xffffff, 1).setStrokeStyle(1, 0x000000, 1).setDepth(DEPTH.content + 1);
  }

  private setPrompt(spot: Spot | null): void {
    if (!this.promptTitle) return;
    if (!spot) {
      this.promptTitle.setText(townName(this.world.name));
      this.promptBody.setText('WASD / arrows to walk  ·  SHIFT to run  ·  red doors hold the fights  ·  the castle holds the Sovereign  ·  M for the map');
      this.promptKey.setVisible(false);
      return;
    }
    this.promptTitle.setText(spot.title());
    this.promptBody.setText(spot.body());
    const verb = spot.verb();
    this.promptKey.setVisible(verb !== null);
    if (verb) this.promptVerb.setText(verb);
  }

  // ── Frame ─────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (!this.L || !this.walker) return;
    const dt = Math.min(delta, 50) / 1000;

    if (!this.leaving) this.movePlayer(dt);
    this.walker.update(Math.min(delta, 50), this.px, this.py, this.moving, this.facing);
    this.updateCamera();

    const cam = this.cameras.main;
    const view: Rect = { x: cam.scrollX, y: cam.scrollY, w: this.scale.width, h: this.scale.height };
    const m = 80;
    for (const c of this.townArt.cull) {
      c.obj.setVisible(!(c.x1 < view.x - m || c.x0 > view.x + view.w + m || c.y1 < view.y - m || c.y0 > view.y + view.h + m));
    }
    this.townArt.update(time, view);
    this.npcs.update(delta, { x: this.px, y: this.py }, view);
    this.atmos.update(delta);
    this.miniDot?.setPosition(this.miniX + this.px * this.miniScale, this.miniY + this.py * this.miniScale);

    // ── Nearest interactable ──
    let best: Spot | null = null, bd = Infinity;
    for (const s of this.spots) {
      const d = Math.hypot(s.x - this.px, s.y - this.py);
      if (d < s.r && d < bd) { bd = d; best = s; }
    }
    if (best !== this.current) { this.current = best; this.setPrompt(best); }
    this.drawMarker(time);

    if (this.leaving || this.game.loop.time < this.graceUntil) return;
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.E) || Phaser.Input.Keyboard.JustDown(k.ENTER)) this.useCurrent();
  }

  private useCurrent(): void {
    if (this.leaving || this.game.loop.time < this.graceUntil) return;
    const s = this.current;
    if (!s) return;
    LAST_POS.set(`${this.slotIdx}:${this.worldId}`, { x: this.px, y: this.py });
    s.use();
  }

  /** A bobbing chevron over whatever E would use. */
  private drawMarker(time: number): void {
    const g = this.marker;
    g.clear();
    const s = this.current;
    if (!s || s.verb() === null) return;
    const bob = Math.sin(time / 180) * 3;
    const x = s.x, y = s.y - 70 + bob;
    g.fillStyle(0x000000, 0.4); g.fillTriangle(x - 9, y + 2, x + 9, y + 2, x, y + 13);
    g.fillStyle(0xffffff, 0.95); g.fillTriangle(x - 8, y, x + 8, y, x, y + 10);
    g.lineStyle(2, this.world.color, 1); g.strokeTriangle(x - 8, y, x + 8, y, x, y + 10);
  }

  private movePlayer(dt: number): void {
    const k = this.keys;
    let vx = 0, vy = 0;
    if (k.A.isDown || k.LEFT.isDown) vx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) vx += 1;
    if (k.W.isDown || k.UP.isDown) vy -= 1;
    if (k.S.isDown || k.DOWN.isDown) vy += 1;
    this.moving = vx !== 0 || vy !== 0;
    if (!this.moving) return;
    const len = Math.hypot(vx, vy);
    const sp = (k.SHIFT.isDown ? RUN : WALK) * dt;
    vx = (vx / len) * sp; vy = (vy / len) * sp;
    this.facing = Math.atan2(vy, vx);

    const L = this.L;
    const clampX = (x: number) => Math.max(14, Math.min(L.W - 14, x));
    const clampY = (y: number) => Math.max(36, Math.min(L.H - 12, y));
    const nx = clampX(this.px + vx);
    if (!this.collides(nx, this.py)) this.px = nx;
    const ny = clampY(this.py + vy);
    if (!this.collides(this.px, ny)) this.py = ny;

    // Walking off the end of an open road takes you to that town.
    for (const e of L.exits) {
      if (this.lockedExits.has(e.worldId)) continue;
      const along = e.dir.x !== 0 ? Math.abs(this.py - e.edge.y) : Math.abs(this.px - e.edge.x);
      const out = e.dir.x > 0 ? this.px > L.W - 34 : e.dir.x < 0 ? this.px < 34 : e.dir.y > 0 ? this.py > L.H - 30 : this.py < 54;
      if (out && along < 80) { this.travel(e.worldId, 'road'); return; }
    }
  }

  private collides(x: number, y: number): boolean {
    const hit = (r: Rect) => {
      const cx = Math.max(r.x, Math.min(x, r.x + r.w));
      const cy = Math.max(r.y, Math.min(y, r.y + r.h));
      return (cx - x) * (cx - x) + (cy - y) * (cy - y) < R_PLAYER * R_PLAYER;
    };
    for (const r of this.L.colliders) if (hit(r)) return true;
    for (const r of this.blockers) if (hit(r)) return true;
    for (const c of this.L.circles) {
      const dx = c.x - x, dy = c.y - y, rr = c.r + R_PLAYER - 4;
      if (dx * dx + dy * dy < rr * rr) return true;
    }
    return false;
  }

  private updateCamera(): void {
    const cam = this.cameras.main;
    const { width, height } = this.scale;
    const tx = Math.max(0, Math.min(this.L.W - width, this.px - width / 2));
    const ty = Math.max(0, Math.min(this.L.H - height, this.py - height / 2 - 20));
    // Light easing; snap when far (spawns, first frame).
    const k = Math.abs(cam.scrollX - tx) > 300 || Math.abs(cam.scrollY - ty) > 300 ? 1 : 0.18;
    cam.setScroll(Math.round((cam.scrollX + (tx - cam.scrollX) * k) * 2) / 2, Math.round((cam.scrollY + (ty - cam.scrollY) * k) * 2) / 2);
  }

  // ── Leaving ───────────────────────────────────────────────────────

  private travel(targetId: string, via: 'road' | 'portal'): void {
    if (this.leaving) return;
    this.leaving = true;
    LAST_POS.delete(`${this.slotIdx}:${this.worldId}`);
    const target = getAnyWorld(targetId);
    this.hud(() => showToast(this, via === 'portal'
      ? `Crossing to ${townName(target?.name ?? targetId)}…`
      : `Walking to ${townName(target?.name ?? targetId)}…`, { accent: target?.color ?? C.gold, holdMs: 900 }));
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CampaignWorldScene', {
        worldId: targetId, slotIdx: this.slotIdx, fromWorldId: this.worldId,
        spawn: via === 'portal' ? 'portal' : undefined,
      });
    });
  }

  private toMap(): void {
    if (this.leaving || this.scene.isPaused() || this.game.loop.time < this.graceUntil) return;
    LAST_POS.delete(`${this.slotIdx}:${this.worldId}`);
    this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: this.realm });
  }

  private nudge(msg: string): void {
    this.cameras.main.shake(140, 0.003);
    this.hud(() => showToast(this, msg, { accent: C.blood, holdMs: 1400 }));
  }

  private openFightMenu(nodeId: string, isChallenge: boolean, kind?: string): void {
    this.scene.pause();
    this.scene.launch('CampaignFightMenuScene', {
      worldId: this.worldId,
      nodeId,
      isChallenge,
      kind,
      slotIdx: this.slotIdx,
    });
  }

  private openShopMenu(): void {
    this.scene.pause();
    this.scene.launch('CampaignShopScene', {
      worldId: this.worldId,
      slotIdx: this.slotIdx,
    });
  }
}

function roman(node: WorldNode): string {
  const i = parseInt(node.id.split('-fight-')[1] ?? '1', 10);
  return ['I', 'II', 'III', 'IV', 'V'][i - 1] ?? `${i}`;
}
