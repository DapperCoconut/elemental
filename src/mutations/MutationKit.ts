import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { CustomStatus } from '../elements/kits/StatusHudKit';
import {
  MUT, ProphecyShape,
  drawAnchorPost, drawBolt, drawBulwarkPlate, drawChain, drawCrackedHeart, drawCulture,
  drawDoppel, drawDrumstick, drawDuelCrest, drawFragileCracks, drawFrostCreep, drawHook,
  drawHydraHead, drawIceShell, drawInversionGlyph, drawOverloadCoil, drawPadlock, drawProphecy,
  drawQuicksandPit, drawRewindDial, drawRewindEcho, drawRouletteWheel, drawSporePod,
  drawStrikeMark, drawThornShell, drawVortex, drawWasp,
} from './MutationVisuals';

/**
 * The twenty mutations added on top of the original set.
 *
 * The originals live inline in ArenaScene, which is exactly why these do not:
 * a mutation is a whole rule change with its own world objects, its own art and
 * its own bookkeeping, and twenty more of them inline would have doubled the
 * scene. This kit owns all of it and hangs off ArenaScene through the narrow
 * {@link MutationArenaApi} below — the same contract every element kit uses.
 *
 * Three chokepoints keep it from fighting the rest of the game:
 *
 * - **Damage multipliers** are written to `Fighter.mutationIncomingMult` only,
 *   rewritten from scratch every frame. Nothing else touches that field, so a
 *   Duel and a Bulwark and a Feast-fattened opponent all multiply cleanly and
 *   none of them stomps `incomingDamageMultiplier`, which Molten and Order
 *   already overwrite outright.
 * - **Speed** is *pulled* by ArenaScene through {@link getPlayerSpeedMult} /
 *   {@link getNpcSpeedMult} rather than pushed, because this kit updates after
 *   the frame's movement has already resolved.
 * - **Everything damageable** the kit puts on the floor is a real `Fighter`
 *   registered through `addEnemy`, so every damage path the player owns reaches
 *   it without this file knowing any of them exist.
 */

export interface MutationArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get gameEnded(): boolean;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

/** Ids owned by this kit — everything else falls through to ArenaScene's originals. */
export const NEW_MUTATION_IDS = [
  'doppel', 'frostbite', 'feast', 'bramble', 'maelstrom', 'inversion', 'contagion', 'duel',
  'hydra', 'rewind', 'quicksand', 'overload', 'fragile', 'swarm', 'tempest', 'bulwark',
  'vault', 'roulette', 'warden', 'oracle',
] as const;

/** Matches ArenaScene's BOSS_MUTATION_SPEED_MULT — a boss body is slower on purpose. */
const BOSS_SPEED_MULT = 0.66;

// ── per-mutation world objects ────────────────────────────────────────────

interface Ghost { delayMs: number; x: number; y: number; heading: number; lastHitAt: number }
interface Meat { x: number; y: number; bornAt: number }
interface Thorn { x: number; y: number; vx: number; vy: number; bornAt: number }
interface Vortex { x: number; y: number; vx: number; vy: number; spin: number; lastTickAt: number }
interface Pod { x: number; y: number; plantedAt: number; opensAt: number }
interface Culture { x: number; y: number; r: number; until: number; tickAt: number }
interface Head { body: Fighter; nextBiteAt: number; nextSpitAt: number }
interface Snapshot { t: number; x: number; y: number; hp: number }
interface Pit { x: number; y: number; r: number; bornAt: number; goneAt: number }
interface Hunter { x: number; y: number; until: number }
interface Strike { x: number; y: number; landsAt: number; seed: number; flashUntil: number }
interface Pool { x: number; y: number; r: number; until: number; tickAt: number }
interface Prophecy { x: number; y: number; r: number; bornAt: number; firesAt: number; shape: ProphecyShape; echo: boolean }

/** One outcome the wheel can land on. */
interface RouletteFace { id: string; emoji: string; label: string; color: string }

const ROULETTE_FACES: RouletteFace[] = [
  { id: 'swap',  emoji: '🔀', label: 'SWAP',    color: '#a9d8ff' },
  { id: 'mend',  emoji: '💗', label: 'MEND',    color: '#ff9ec4' },
  { id: 'edge',  emoji: '🗡', label: 'EDGE',    color: '#ffb066' },
  { id: 'haste', emoji: '🐇', label: 'HASTE',   color: '#b6ffb0' },
  { id: 'gift',  emoji: '🎁', label: 'GIFT',    color: '#ffe680' },
  { id: 'bomb',  emoji: '💣', label: 'BOMB',    color: '#ff7766' },
  { id: 'blind', emoji: '🌫', label: 'BLIND',   color: '#ccbbff' },
  { id: 'anchor',emoji: '⚓', label: 'ANCHOR',  color: '#88c0d0' },
];

export class MutationKit {
  private api: MutationArenaApi;

  private on = new Set<string>();
  private starred = new Set<string>();
  /** True for any frame between `apply` and the match ending. */
  private armed = false;

  // Painting layers. Ground sits under the fighters, mid above them, hud above everything.
  private gGround: Phaser.GameObjects.Graphics | null = null;
  private gMid: Phaser.GameObjects.Graphics | null = null;
  private gHud: Phaser.GameObjects.Graphics | null = null;

  // Shared per-frame bookkeeping.
  private lastPlayerHp = 0;
  private lastNpcHp = 0;
  private playerSpeed = 1;
  private npcSpeed = 1;
  private hitFlash = 0;

  // 1 · Doppel
  private dopTrail: Array<{ t: number; x: number; y: number; h: number }> = [];
  private dopGhosts: Ghost[] = [];
  // 2 · Frostbite
  private chill = 0;
  private frozenUntil = 0;
  private lastPos = { x: 0, y: 0 };
  // 3 · Feast
  private meats: Meat[] = [];
  private meatAccum = 0;
  private mealBonus = 0;
  private mealSpeed = 1;
  // 4 · Bramble
  private thorns: Thorn[] = [];
  private brambleFlash = 0;
  private brambleSpin = 0;
  private reflectCount = 0;
  // 5 · Maelstrom
  private vortices: Vortex[] = [];
  // 6 · Inversion
  private invertNextAt = 0;
  private invertWarnUntil = 0;
  private invertEndsAt = 0;
  // 7 · Contagion
  private pods: Pod[] = [];
  private cultures: Culture[] = [];
  private podReadyAt = 0;
  // 9 · Hydra
  private heads: Head[] = [];
  private hydraSplitsDone = 0;
  // 10 · Rewind
  private snaps: Snapshot[] = [];
  private rewindNextAt = 0;
  private rewindEchoes: Array<{ x: number; y: number; until: number }> = [];
  // 11 · Quicksand
  private pits: Pit[] = [];
  private pitShiftAt = 0;
  // 12 · Overload
  private overloadHeat = 0;
  private overloadCharge: ((abilityId: string) => void) | null = null;
  // 13 · Fragile
  private fragileApplied = false;
  // 14 · Swarm
  private swarmAngle = 0;
  private swarmRadius = 88;
  private swarmStingAt = 0;
  private hunters: Hunter[] = [];
  private hunterAt = 0;
  // 15 · Tempest
  private strikes: Strike[] = [];
  private strikeNextAt = 0;
  private pools: Pool[] = [];
  private tempestElapsed = 0;
  // 16 · Bulwark
  private plateAngle = 0;
  private plateLit = 0;
  // 17 · Vault
  private vaultLocked: string[] = [];
  private vaultNextAt = 0;
  private vaultOpen = 0;
  // 18 · Roulette
  private wheelSpin = 0;
  private wheelVel = 0;
  private wheelNextAt = 0;
  private wheelLanded = -1;
  private wheelGlow = 0;
  private edgeUntil = 0;
  private hasteUntil = 0;
  private anchorUntil = 0;
  private bombs: Array<{ x: number; y: number; at: number }> = [];
  // 19 · Warden
  private posts: Array<{ x: number; y: number }> = [];
  private wardenSpin = 0;
  private wardenRadius = 0;
  private wardenPhase2 = false;
  private hookNextAt = 0;
  private hook: { x: number; y: number; vx: number; vy: number; state: 'out' | 'reel' } | null = null;
  private heldUntil = 0;
  private chainTickAt = 0;
  // 20 · Oracle
  private prophecies: Prophecy[] = [];
  private oracleNextAt = 0;
  private oraclePhase2 = false;

  constructor(api: MutationArenaApi) {
    this.api = api;
  }

  // ── lifecycle ───────────────────────────────────────────────────────────

  /**
   * Every match start, whether or not any of these are on. The scene restart
   * already destroyed last match's objects, so this only drops references and
   * builds the three fresh paint layers.
   */
  reset(): void {
    const s = this.api.scene;
    this.on = new Set();
    this.starred = new Set();
    this.armed = false;

    this.gGround = s.add.graphics().setDepth(3);
    this.gMid = s.add.graphics().setDepth(9);
    this.gHud = s.add.graphics().setDepth(22);

    this.lastPlayerHp = 0;
    this.lastNpcHp = 0;
    this.playerSpeed = 1;
    this.npcSpeed = 1;
    this.hitFlash = 0;

    this.dopTrail = []; this.dopGhosts = [];
    this.chill = 0; this.frozenUntil = 0; this.lastPos = { x: 0, y: 0 };
    this.meats = []; this.meatAccum = 0; this.mealBonus = 0; this.mealSpeed = 1;
    this.thorns = []; this.brambleFlash = 0; this.brambleSpin = 0; this.reflectCount = 0;
    this.vortices = [];
    this.invertNextAt = 0; this.invertWarnUntil = 0; this.invertEndsAt = 0;
    this.pods = []; this.cultures = []; this.podReadyAt = 0;
    this.heads = []; this.hydraSplitsDone = 0;
    this.snaps = []; this.rewindNextAt = 0; this.rewindEchoes = [];
    this.pits = []; this.pitShiftAt = 0;
    this.overloadHeat = 0;
    // The body that carried the listener was destroyed with last match's scene.
    this.overloadCharge = null;
    this.fragileApplied = false;
    this.swarmAngle = 0; this.swarmRadius = 88; this.swarmStingAt = 0;
    this.hunters = []; this.hunterAt = 0;
    this.strikes = []; this.strikeNextAt = 0; this.pools = []; this.tempestElapsed = 0;
    this.plateAngle = 0; this.plateLit = 0;
    this.vaultLocked = []; this.vaultNextAt = 0; this.vaultOpen = 0;
    this.wheelSpin = 0; this.wheelVel = 0; this.wheelNextAt = 0;
    this.wheelLanded = -1; this.wheelGlow = 0;
    this.edgeUntil = 0; this.hasteUntil = 0; this.anchorUntil = 0; this.bombs = [];
    this.posts = []; this.wardenSpin = 0; this.wardenRadius = 0; this.wardenPhase2 = false;
    this.hookNextAt = 0; this.hook = null; this.heldUntil = 0; this.chainTickAt = 0;
    this.prophecies = []; this.oracleNextAt = 0; this.oraclePhase2 = false;
  }

  /** Does this kit own any of the mutations selected for this match? */
  static owns(id: string): boolean {
    return (NEW_MUTATION_IDS as readonly string[]).includes(id);
  }

  private has(id: string): boolean { return this.on.has(id); }
  private plus(id: string): boolean { return this.starred.has(id); }

  /**
   * Arm whichever of these twenty are on. Called from ArenaScene's mutation
   * application step, alongside the originals — the npc's body has already been
   * built and every stat change here is one-shot.
   */
  apply(active: Set<string>, starred: Set<string>): void {
    const s = this.api.scene;
    const now = s.time.now;
    const npc = this.api.npc;
    const player = this.api.player;
    for (const id of active) if (MutationKit.owns(id)) this.on.add(id);
    for (const id of starred) if (MutationKit.owns(id)) this.starred.add(id);
    if (this.on.size === 0) return;
    this.armed = true;

    this.lastPlayerHp = player.hp;
    this.lastNpcHp = npc.hp;
    this.lastPos = { x: player.x, y: player.y };

    if (this.has('doppel')) {
      const plus = this.plus('doppel');
      this.dopGhosts = plus
        ? [{ delayMs: 1400, x: player.x, y: player.y, heading: 0, lastHitAt: 0 },
           { delayMs: 2800, x: player.x, y: player.y, heading: 0, lastHitAt: 0 }]
        : [{ delayMs: 2000, x: player.x, y: player.y, heading: 0, lastHitAt: 0 }];
    }

    if (this.has('feast')) this.meatAccum = this.plus('feast') ? 4000 : 5000;

    if (this.has('bramble')) npc.setTint(0x7c8f4a);

    if (this.has('maelstrom')) {
      const b = s.physics.world.bounds;
      const n = this.plus('maelstrom') ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 1.4;
        const spd = this.plus('maelstrom') ? 82 : 58;
        this.vortices.push({
          x: b.centerX + Math.cos(a) * b.width * 0.22,
          y: b.centerY + Math.sin(a) * b.height * 0.22,
          vx: Math.cos(a + 1.9) * spd, vy: Math.sin(a + 1.9) * spd,
          spin: Math.random() * 6, lastTickAt: 0,
        });
      }
    }

    if (this.has('inversion')) this.invertNextAt = now + (this.plus('inversion') ? 8000 : 11000);

    if (this.has('rewind')) this.rewindNextAt = now + (this.plus('rewind') ? 10000 : 15000);

    if (this.has('quicksand')) { this.pitShiftAt = now + 12000; this.rollPits(now); }

    if (this.has('overload')) {
      // `Fighter.emit('cast')` in `announceCast` is the one place every ability in
      // the game passes through, so the blood price is charged there rather than
      // per element. Deliberately *not* `castPunishDamage`, which has no way to
      // exempt the click — and a permanent toll on a spammable click is a death
      // sentence rather than a trade. The listener dies with the body each match.
      const cost = this.plus('overload') ? 9 : 5;
      this.overloadCharge = (abilityId: string) => {
        const ab = player.element.abilities.find((a) => a.id === abilityId);
        if (!ab || ab.displayKey === 'Click') return;
        player.applySelfDamage(cost);
        this.overloadHeat = 1;
        this.api.spawnDamageNumber(player.x, player.y - 26, cost);
      };
      player.on('cast', this.overloadCharge);
    }

    if (this.has('fragile') && !this.fragileApplied) {
      this.fragileApplied = true;
      const keep = this.plus('fragile') ? 0.25 : 0.5;
      player.setMaxHp(Math.max(20, Math.round(player.maxHp * keep)));
      player.hp = player.maxHp;
    }

    if (this.has('tempest')) this.strikeNextAt = now + 2600;

    if (this.has('swarm')) npc.setTint(0xe8cf6a);

    if (this.has('vault')) {
      const abilities = player.element.abilities ?? [];
      // The click stays. Starred takes the second key away as well.
      const freeCount = this.plus('vault') ? 1 : 2;
      this.vaultLocked = abilities.slice(freeCount).map((a) => a.id);
      this.vaultNextAt = now + (this.plus('vault') ? 26000 : 20000);
    }

    if (this.has('roulette')) this.wheelNextAt = now + 6000;

    // ── boss mutations ────────────────────────────────────────────────
    if (this.has('warden')) {
      npc.setTint(0x9aa6b4);
      npc.setScale(1.5);
      (npc.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
      npc.maxHp = Math.round(npc.maxHp * 1.5);
      npc.hp = npc.maxHp;
      npc.speed = Math.round(npc.speed * BOSS_SPEED_MULT);
      const b = s.physics.world.bounds;
      this.wardenRadius = Math.min(b.width, b.height) * 0.33;
      this.hookNextAt = now + 6000;
      this.rebuildPosts();
    }

    if (this.has('oracle')) {
      npc.setTint(0xb98cff);
      npc.setScale(1.5);
      (npc.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
      npc.maxHp = Math.round(npc.maxHp * 1.5);
      npc.hp = npc.maxHp;
      npc.speed = Math.round(npc.speed * BOSS_SPEED_MULT);
      this.oracleNextAt = now + 3200;
    }
  }

  // ── speed, pulled by ArenaScene ─────────────────────────────────────────

  getPlayerSpeedMult(): number { return this.playerSpeed; }
  getNpcSpeedMult(): number { return this.npcSpeed; }

  // ── frame ───────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (!this.armed) return;
    const g0 = this.gGround, g1 = this.gMid, g2 = this.gHud;
    if (!g0 || !g1 || !g2) return;
    g0.clear(); g1.clear(); g2.clear();
    if (this.api.gameEnded) { this.clearStatuses(); return; }

    const player = this.api.player;
    const npc = this.api.npc;
    const dt = delta / 1000;

    // Shared deltas, read once so two mutations cannot both consume the same hit.
    // Re-stamped at the *end* of the frame rather than here, so damage this kit
    // deals during the update never comes back round as a "hit taken" — without
    // that, a Contagion culture ticking on you plants a fresh pod every 1.2s and
    // the mutation feeds itself forever.
    const playerLost = Math.max(0, this.lastPlayerHp - player.hp);
    const npcLost = Math.max(0, this.lastNpcHp - npc.hp);
    if (playerLost > 0 || npcLost > 0) this.hitFlash = 1;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);

    // Rewritten from scratch every frame — this kit is the only writer.
    let playerIncoming = 1;
    let npcIncoming = 1;
    this.playerSpeed = 1;
    this.npcSpeed = 1;

    if (this.has('doppel'))    this.updateDoppel(time, dt, g1);
    if (this.has('frostbite')) this.updateFrostbite(time, dt, g1, g2);
    if (this.has('feast'))     { this.updateFeast(time, dt, g1); playerIncoming *= 1 + this.mealBonus; this.npcSpeed *= this.mealSpeed; }
    if (this.has('bramble'))   this.updateBramble(time, dt, npcLost, g1);
    if (this.has('maelstrom')) this.updateMaelstrom(time, dt, g0);
    if (this.has('inversion')) this.updateInversion(time, dt, g1);
    if (this.has('contagion')) this.updateContagion(time, dt, playerLost, g0, g1);
    if (this.has('duel'))      { const m = this.plus('duel') ? 5 : 3; playerIncoming *= m; npcIncoming *= m; const sp = this.plus('duel') ? 1.25 : 1.15; this.playerSpeed *= sp; this.npcSpeed *= sp; this.drawDuel(g2); }
    if (this.has('hydra'))     this.updateHydra(time, dt, g1, npcIncoming);
    if (this.has('rewind'))    this.updateRewind(time, dt, g1);
    if (this.has('quicksand')) this.updateQuicksand(time, dt, g0);
    if (this.has('overload'))  this.updateOverload(time, dt, g1);
    if (this.has('fragile'))   { npcIncoming *= this.plus('fragile') ? 2.5 : 1.75; this.drawFragile(time, g1, g2); }
    if (this.has('swarm'))     this.updateSwarm(time, dt, g1);
    if (this.has('tempest'))   this.updateTempest(time, dt, g0, g1);
    if (this.has('bulwark'))   npcIncoming *= this.updateBulwark(time, dt, g1);
    if (this.has('vault'))     this.updateVault(time, g2);
    if (this.has('roulette'))  { this.updateRoulette(time, dt, g1, g2); if (time < this.edgeUntil) playerIncoming *= 1.25; if (time < this.hasteUntil) this.npcSpeed *= 1.4; if (time < this.anchorUntil) this.playerSpeed *= 0.5; }
    if (this.has('warden'))    { this.updateWarden(time, dt, g0, g1); if (this.wardenPhase2) playerIncoming *= 1.2; }
    if (this.has('oracle'))    this.updateOracle(time, dt, g0);
    if (this.thorns.length > 0) this.updateThorns(time, dt, g1);

    player.mutationIncomingMult = playerIncoming;
    npc.mutationIncomingMult = npcIncoming;
    for (const h of this.heads) if (h.body.active) h.body.mutationIncomingMult = npcIncoming;

    this.lastPlayerHp = player.hp;
    this.lastNpcHp = npc.hp;
  }

  /** Match over: stop advertising anything in the tray. */
  private clearStatuses(): void {
    this.api.setStatusIndicator('mut-chill', null);
    this.api.setStatusIndicator('mut-vault', null);
    this.api.setStatusIndicator('mut-meals', null);
  }

  // ── 1 · Doppel ──────────────────────────────────────────────────────────

  /**
   * The echo walks the path you walked, at a fixed lag. Because it replays a
   * recording rather than chasing, you cannot kite it — the only way out is to
   * stop crossing your own tracks.
   */
  private updateDoppel(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const player = this.api.player;
    const plus = this.plus('doppel');
    const damage = plus ? 15 : 12;

    const last = this.dopTrail[this.dopTrail.length - 1];
    const h = last ? Math.atan2(player.y - last.y, player.x - last.x) : 0;
    this.dopTrail.push({ t: time, x: player.x, y: player.y, h: last && Math.hypot(player.x - last.x, player.y - last.y) > 0.6 ? h : (last?.h ?? 0) });
    while (this.dopTrail.length > 0 && time - this.dopTrail[0].t > 6500) this.dopTrail.shift();

    for (const ghost of this.dopGhosts) {
      const want = time - ghost.delayMs;
      let sample = this.dopTrail[0];
      for (const s of this.dopTrail) { if (s.t <= want) sample = s; else break; }
      if (!sample) continue;
      ghost.x = sample.x; ghost.y = sample.y; ghost.heading = sample.h;
      const alpha = this.dopTrail.length > 4 && time - this.dopTrail[0].t >= ghost.delayMs * 0.6 ? 0.85 : 0.25;
      drawDoppel(g, ghost.x, ghost.y, 17, ghost.heading, time, alpha);

      if (alpha > 0.5 && player.active && time >= ghost.lastHitAt + 1200
          && Phaser.Math.Distance.Between(ghost.x, ghost.y, player.x, player.y) < 24) {
        ghost.lastHitAt = time;
        player.takeDamage(damage);
        this.api.spawnHitFlash(player.x, player.y, MUT.doppel.edge);
        this.api.showFloatingText(player.x, player.y - 28, '🪞 ECHO', '#9fd8ff');
      }
    }
    void dt;
  }

  // ── 2 · Frostbite ───────────────────────────────────────────────────────

  /**
   * The arena is below freezing and only motion keeps it off you. Chill climbs
   * while you hold still, drains while you run, and topping it out locks you in
   * place for a moment — which is when everything else in the match lands.
   */
  private updateFrostbite(
    time: number, dt: number,
    gMid: Phaser.GameObjects.Graphics, gHud: Phaser.GameObjects.Graphics,
  ): void {
    const player = this.api.player;
    const plus = this.plus('frostbite');
    const moved = Math.hypot(player.x - this.lastPos.x, player.y - this.lastPos.y);
    this.lastPos = { x: player.x, y: player.y };

    const frozen = time < this.frozenUntil;
    if (!frozen) {
      const gainPerSec = plus ? 100 / 3.0 : 100 / 4.5;
      const drainPerSec = plus ? 30 : 38;
      // 45 px/s of travel counts as "moving" — a nudge does not buy you warmth.
      this.chill += (moved / Math.max(dt, 0.0001) < 45 ? gainPerSec : -drainPerSec) * dt;
      this.chill = Phaser.Math.Clamp(this.chill, 0, 100);
      if (this.chill >= 100) {
        this.chill = 0;
        this.frozenUntil = time + 1200;
        player.frozenUntil = this.frozenUntil;
        player.applyDisarm(1200);
        this.api.showFloatingText(player.x, player.y - 34, '🧊 FROZEN SOLID', '#bfeaff');
        this.api.spawnHitFlash(player.x, player.y, MUT.frostbite.ice);
        if (plus) {
          player.takeDamage(18);
          this.api.npc.heal(18);
        }
      }
    } else {
      this.playerSpeed *= 0;
    }

    const b = this.api.scene.physics.world.bounds;
    drawFrostCreep(gHud, b.x, b.y, b.width, b.height, frozen ? 1 : this.chill / 100, time);
    if (frozen) drawIceShell(gMid, player.x, player.y, 26, time);

    this.api.setStatusIndicator('mut-chill', {
      name: 'Chill', emoji: '🧊', color: MUT.frostbite.ice,
      description: 'The arena is freezing. Standing still builds chill; at 100 you freeze solid. Keep moving.',
      count: Math.round(frozen ? 100 : this.chill), suffix: '%', priority: 24,
    });
  }

  // ── 3 · Feast ───────────────────────────────────────────────────────────

  /** Meat on the floor, and an opponent that wants it more than you do. */
  private updateFeast(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const plus = this.plus('feast');
    const player = this.api.player;
    const npc = this.api.npc;
    const b = this.api.scene.physics.world.bounds;
    const every = plus ? 6000 : 8000;

    this.meatAccum += dt * 1000;
    if (this.meatAccum >= every && this.meats.length < 3) {
      this.meatAccum -= every;
      this.meats.push({
        x: Phaser.Math.Between(b.x + 60, b.right - 60),
        y: Phaser.Math.Between(b.y + 70, b.bottom - 60),
        bornAt: time,
      });
    }

    // The opponent detours for the nearest meal it can beat you to.
    let target: Meat | null = null;
    let best = Infinity;
    for (const m of this.meats) {
      const dn = Phaser.Math.Distance.Between(npc.x, npc.y, m.x, m.y);
      const dp = Phaser.Math.Distance.Between(player.x, player.y, m.x, m.y);
      if (dn < 300 && dn <= dp * 1.15 && dn < best) { best = dn; target = m; }
    }
    if (target && npc.active) {
      const ang = Math.atan2(target.y - npc.y, target.x - npc.x);
      const spd = npc.speed * 1.05;
      (npc.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd);
    }

    for (let i = this.meats.length - 1; i >= 0; i--) {
      const m = this.meats[i];
      drawDrumstick(g, m.x, m.y, 11, time + i * 400);
      if (player.active && Phaser.Math.Distance.Between(m.x, m.y, player.x, player.y) < 28) {
        this.meats.splice(i, 1);
        player.heal(plus ? 12 : 20);
        this.api.showFloatingText(player.x, player.y - 30, `🍗 +${plus ? 12 : 20}`, '#ffcf7a');
        continue;
      }
      if (npc.active && Phaser.Math.Distance.Between(m.x, m.y, npc.x, npc.y) < 30) {
        this.meats.splice(i, 1);
        npc.heal(20);
        this.mealBonus += plus ? 0.08 : 0.05;
        if (plus) this.mealSpeed *= 1.04;
        this.api.showFloatingText(npc.x, npc.y - 34, '🍗 FED', '#ff9966');
        this.api.setStatusIndicator('mut-meals', {
          name: 'Fed Opponent', emoji: '🍗', color: MUT.feast.meat,
          description: 'Every meal your opponent reaches first makes it hit harder for the rest of the fight.',
          count: Math.round(this.mealBonus * 100), suffix: '%', priority: 45,
        });
      }
    }
  }

  // ── 4 · Bramble ─────────────────────────────────────────────────────────

  /** Everything you take off it, a share of comes straight back. */
  private updateBramble(
    time: number, dt: number, npcLost: number, g: Phaser.GameObjects.Graphics,
  ): void {
    const plus = this.plus('bramble');
    const player = this.api.player;
    const npc = this.api.npc;
    this.brambleSpin += dt * 0.9;
    this.brambleFlash = Math.max(0, this.brambleFlash - dt * 2.5);

    if (npcLost > 0 && player.active && npc.active) {
      const close = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) < 90;
      const share = (plus ? 0.5 : 0.3) * (close ? 2 : 1);
      const back = Math.max(1, Math.round(npcLost * share));
      player.applySelfDamage(back);
      this.brambleFlash = 1;
      this.api.spawnHitFlash(player.x, player.y, MUT.bramble.blood);
      this.api.spawnDamageNumber(player.x, player.y - 22, back);
      this.reflectCount++;
      if (plus && this.reflectCount % 5 === 0) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
          this.thorns.push({ x: npc.x, y: npc.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, bornAt: time });
        }
        this.api.showFloatingText(npc.x, npc.y - 40, '🌵 SPINES', '#d8c48a');
      }
    }

    if (npc.active) drawThornShell(g, npc.x, npc.y, 30 * npc.scaleX, this.brambleSpin, this.brambleFlash);
  }

  /**
   * The one small-projectile pool the kit keeps. Three mutations feed it — a
   * starred Bramble's spine volley, a Hydra head's venom and a starred Bulwark
   * spitting your own shots home — so it is ticked from `update` whenever it has
   * anything in it, not from whichever mutation happened to fill it.
   */
  private updateThorns(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const player = this.api.player;
    const b = this.api.scene.physics.world.bounds;
    for (let i = this.thorns.length - 1; i >= 0; i--) {
      const t = this.thorns[i];
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (time - t.bornAt > 2600 || t.x < b.x || t.x > b.right || t.y < b.y || t.y > b.bottom) {
        this.thorns.splice(i, 1); continue;
      }
      const a = Math.atan2(t.vy, t.vx);
      g.fillStyle(MUT.bramble.blood, 0.9);
      g.fillTriangle(
        t.x + Math.cos(a) * 11, t.y + Math.sin(a) * 11,
        t.x - Math.sin(a) * 4.4, t.y + Math.cos(a) * 4.4,
        t.x + Math.sin(a) * 4.4, t.y - Math.cos(a) * 4.4,
      );
      g.fillStyle(MUT.bramble.thorn, 0.95);
      g.fillTriangle(
        t.x + Math.cos(a) * 9, t.y + Math.sin(a) * 9,
        t.x - Math.sin(a) * 3.2, t.y + Math.cos(a) * 3.2,
        t.x + Math.sin(a) * 3.2, t.y - Math.cos(a) * 3.2,
      );
      if (player.active && Phaser.Math.Distance.Between(t.x, t.y, player.x, player.y) < 20) {
        this.thorns.splice(i, 1);
        player.takeDamage(10);
        this.api.spawnHitFlash(player.x, player.y, MUT.bramble.thorn);
      }
    }
  }

  // ── 5 · Maelstrom ───────────────────────────────────────────────────────

  /** A wandering pull the opponent simply walks through and you do not. */
  private updateMaelstrom(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const plus = this.plus('maelstrom');
    const player = this.api.player;
    const b = this.api.scene.physics.world.bounds;
    const reach = plus ? 165 : 138;
    const core = 26;
    const pull = plus ? 220 : 145;

    for (const v of this.vortices) {
      v.x += v.vx * dt; v.y += v.vy * dt;
      if (v.x < b.x + reach * 0.4 || v.x > b.right - reach * 0.4) { v.vx *= -1; v.x = Phaser.Math.Clamp(v.x, b.x + reach * 0.4, b.right - reach * 0.4); }
      if (v.y < b.y + reach * 0.4 || v.y > b.bottom - reach * 0.4) { v.vy *= -1; v.y = Phaser.Math.Clamp(v.y, b.y + reach * 0.4, b.bottom - reach * 0.4); }
      v.spin += dt * 2.2;
      drawVortex(g, v.x, v.y, reach, core, v.spin);

      if (!player.active) continue;
      const d = Phaser.Math.Distance.Between(v.x, v.y, player.x, player.y);
      if (d < reach) {
        const strength = (1 - d / reach) * pull * dt;
        const a = Math.atan2(v.y - player.y, v.x - player.x);
        const body = player.body as Phaser.Physics.Arcade.Body;
        body.x += Math.cos(a) * strength;
        body.y += Math.sin(a) * strength;
      }
      if (d < core && time - v.lastTickAt >= 400) {
        v.lastTickAt = time;
        player.takeDamage(plus ? 7 : 5);
        this.api.spawnHitFlash(player.x, player.y, MUT.maelstrom.core);
      }
    }
  }

  // ── 6 · Inversion ───────────────────────────────────────────────────────

  /** Telegraphed, then your keys mean the opposite of what they say. */
  private updateInversion(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const plus = this.plus('inversion');
    const player = this.api.player;
    const every = plus ? 8000 : 11000;
    const dur = plus ? 5000 : 3500;

    if (time >= this.invertNextAt && time >= this.invertEndsAt) {
      this.invertNextAt = time + every + dur;
      this.invertWarnUntil = time + 1200;
      this.api.showFloatingText(player.x, player.y - 44, '🔄 BRACE', '#b08cff');
    }
    if (this.invertWarnUntil > 0 && time >= this.invertWarnUntil) {
      this.invertWarnUntil = 0;
      this.invertEndsAt = time + dur;
      player.invertedControlsUntil = Math.max(player.invertedControlsUntil, time + dur);
      if (plus) player.aimScatterUntil = Math.max(player.aimScatterUntil, Date.now() + dur);
      this.api.showFloatingText(player.x, player.y - 40, '🔄 INVERTED', '#b08cff');
    }

    const warning = time < this.invertWarnUntil;
    const active = time < this.invertEndsAt;
    if (warning || active) {
      const alpha = warning ? 0.35 + 0.35 * Math.sin(time * 0.02) : 0.85;
      drawInversionGlyph(g, player.x, player.y - 42, 13, time * 0.004, alpha);
    }
    void dt;
  }

  // ── 7 · Contagion ───────────────────────────────────────────────────────

  /** Getting hit poisons the tile you were standing on. Do not fight in one place. */
  private updateContagion(
    time: number, dt: number, playerLost: number,
    gGround: Phaser.GameObjects.Graphics, gMid: Phaser.GameObjects.Graphics,
  ): void {
    const plus = this.plus('contagion');
    const player = this.api.player;

    if (playerLost > 0 && time >= this.podReadyAt && player.active) {
      this.podReadyAt = time + 1200;
      this.pods.push({ x: player.x, y: player.y, plantedAt: time, opensAt: time + 1500 });
    }

    for (let i = this.pods.length - 1; i >= 0; i--) {
      const p = this.pods[i];
      if (plus && player.active) {
        // A starred pod crawls after you before it opens, so backing off one step is not enough.
        const a = Math.atan2(player.y - p.y, player.x - p.x);
        p.x += Math.cos(a) * 40 * dt;
        p.y += Math.sin(a) * 40 * dt;
      }
      const ripe = Phaser.Math.Clamp((time - p.plantedAt) / (p.opensAt - p.plantedAt), 0, 1);
      drawSporePod(gMid, p.x, p.y, 12, ripe, time);
      if (time >= p.opensAt) {
        this.pods.splice(i, 1);
        this.cultures.push({ x: p.x, y: p.y, r: plus ? 74 : 54, until: time + 5000, tickAt: 0 });
        this.api.spawnHitFlash(p.x, p.y, MUT.contagion.culture);
      }
    }

    for (let i = this.cultures.length - 1; i >= 0; i--) {
      const c = this.cultures[i];
      if (time >= c.until) { this.cultures.splice(i, 1); continue; }
      const life = Phaser.Math.Clamp((c.until - time) / 5000, 0, 1);
      drawCulture(gGround, c.x, c.y, c.r, life, time);
      if (player.active && Phaser.Math.Distance.Between(c.x, c.y, player.x, player.y) < c.r
          && time - c.tickAt >= 500) {
        c.tickAt = time;
        player.applySelfDamage(plus ? 4 : 3);
        this.api.spawnDamageNumber(player.x, player.y - 20, plus ? 4 : 3);
      }
    }
  }

  // ── 8 · Duel ────────────────────────────────────────────────────────────

  /**
   * The crest lives on the left edge at mid height: the top strip is already the
   * mutation banner, the enemy label and the status tray, and a Duel run is very
   * often also carrying whatever else was stacked onto it.
   */
  private drawDuel(g: Phaser.GameObjects.Graphics): void {
    const b = this.api.scene.physics.world.bounds;
    drawDuelCrest(g, b.x + 40, b.centerY, 17, this.hitFlash);
  }

  // ── 9 · Hydra ───────────────────────────────────────────────────────────

  /** Cut it down and it grows another one that fights you while the body heals no less. */
  private updateHydra(
    time: number, dt: number, g: Phaser.GameObjects.Graphics, npcIncoming: number,
  ): void {
    const plus = this.plus('hydra');
    const npc = this.api.npc;
    const player = this.api.player;
    const thresholds = plus ? [0.75, 0.5, 0.25] : [0.66, 0.33];

    if (npc.active && this.hydraSplitsDone < thresholds.length
        && npc.hp <= npc.maxHp * thresholds[this.hydraSplitsDone]) {
      this.hydraSplitsDone++;
      this.spawnHead(time, plus);
    }

    for (let i = this.heads.length - 1; i >= 0; i--) {
      const h = this.heads[i];
      if (!h.body.active || h.body.hp <= 0) {
        this.api.removeEnemy(h.body);
        if (h.body.active) h.body.destroy();
        this.heads.splice(i, 1);
        continue;
      }
      if (!npc.active) { this.api.removeEnemy(h.body); h.body.destroy(); this.heads.splice(i, 1); continue; }
      h.body.mutationIncomingMult = npcIncoming;

      const a = Math.atan2(player.y - h.body.y, player.x - h.body.x);
      const spd = plus ? 150 : 128;
      (h.body.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
      drawHydraHead(g, h.body.x, h.body.y, 15, a, time + i * 300);

      const d = Phaser.Math.Distance.Between(h.body.x, h.body.y, player.x, player.y);
      if (d < 34 && time >= h.nextBiteAt && player.active) {
        h.nextBiteAt = time + 1200;
        player.takeDamage(plus ? 9 : 7);
        this.api.spawnHitFlash(player.x, player.y, MUT.hydra.maw);
        this.api.showFloatingText(player.x, player.y - 26, '🐍 BITE', '#3f8f5c');
      }
      if (plus && time >= h.nextSpitAt && player.active) {
        h.nextSpitAt = time + 2500;
        this.thorns.push({
          x: h.body.x, y: h.body.y,
          vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, bornAt: time,
        });
      }
    }
    void dt;
  }

  private spawnHead(time: number, plus: boolean): void {
    const npc = this.api.npc;
    const s = this.api.scene;
    const hp = Math.max(20, Math.round(npc.maxHp * (plus ? 0.2 : 0.25)));
    const a = Math.random() * Math.PI * 2;
    const head = new Fighter(
      s, npc.x + Math.cos(a) * 46, npc.y + Math.sin(a) * 46, npc.texture.key,
      { id: 'hydra-head', name: 'Head', color: MUT.hydra.scale, emoji: '🐍', abilities: [] },
      hp, plus ? 150 : 128,
    );
    head.setScale(0.62);
    head.setTint(MUT.hydra.scale);
    (head.body as Phaser.Physics.Arcade.Body).setCircle(13, 6, 6);
    this.api.addEnemy(head);
    this.heads.push({ body: head, nextBiteAt: time + 700, nextSpitAt: time + 2000 });
    this.api.showFloatingText(head.x, head.y - 34, '🐍 A HEAD GROWS', '#7fe08a');
    this.api.spawnHitFlash(head.x, head.y, MUT.hydra.scale);
  }

  // ── 10 · Rewind ─────────────────────────────────────────────────────────

  /** Damage is not permanent unless you finish the job between the ticks. */
  private updateRewind(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const plus = this.plus('rewind');
    const npc = this.api.npc;
    const every = plus ? 10000 : 15000;
    const back = 5000;

    this.snaps.push({ t: time, x: npc.x, y: npc.y, hp: npc.hp });
    while (this.snaps.length > 0 && time - this.snaps[0].t > back + 500) this.snaps.shift();

    if (time >= this.rewindNextAt && npc.active) {
      this.rewindNextAt = time + every;
      const want = time - back;
      let target: Snapshot | null = null;
      for (const s of this.snaps) { if (s.t <= want) target = s; else break; }
      if (target && target.hp > npc.hp) {
        for (const s of this.snaps) {
          if (s.t < want) continue;
          this.rewindEchoes.push({ x: s.x, y: s.y, until: time + 700 + (time - s.t) * 0.1 });
        }
        npc.hp = Math.min(npc.maxHp, target.hp);
        (npc.body as Phaser.Physics.Arcade.Body).reset(target.x, target.y);
        if (plus) npc.clearAllCooldowns();
        this.snaps = [];
        this.api.showFloatingText(npc.x, npc.y - 46, '⏪ REWIND', '#7fd4ff');
        this.api.spawnHitFlash(npc.x, npc.y, MUT.rewind.dial);
      }
    }

    for (let i = this.rewindEchoes.length - 1; i >= 0; i--) {
      const e = this.rewindEchoes[i];
      if (time >= e.until) { this.rewindEchoes.splice(i, 1); continue; }
      drawRewindEcho(g, e.x, e.y, 20, (e.until - time) / 900 * 0.5);
    }
    if (npc.active) {
      const prog = Phaser.Math.Clamp((this.rewindNextAt - time) / every, 0, 1);
      drawRewindDial(g, npc.x, npc.y - 46, 11, prog, time);
    }
    void dt;
  }

  // ── 11 · Quicksand ──────────────────────────────────────────────────────

  /** Ground that takes your footing and drags you toward the middle of it. */
  private updateQuicksand(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const plus = this.plus('quicksand');
    const player = this.api.player;

    if (time >= this.pitShiftAt) {
      this.pitShiftAt = time + 12000;
      for (const p of this.pits) p.goneAt = time + 900;
      this.rollPits(time);
    }
    for (let i = this.pits.length - 1; i >= 0; i--) {
      const p = this.pits[i];
      if (p.goneAt > 0 && time >= p.goneAt) { this.pits.splice(i, 1); continue; }
      const fadeIn = Phaser.Math.Clamp((time - p.bornAt) / 700, 0, 1);
      const fadeOut = p.goneAt > 0 ? Phaser.Math.Clamp((p.goneAt - time) / 900, 0, 1) : 1;
      const fade = Math.min(fadeIn, fadeOut);
      drawQuicksandPit(g, p.x, p.y, p.r, time, fade);
      if (p.goneAt > 0 || !player.active) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y);
      if (d < p.r) {
        this.playerSpeed *= plus ? 0.35 : 0.45;
        const a = Math.atan2(p.y - player.y, p.x - player.x);
        const drag = (plus ? 46 : 30) * dt;
        const body = player.body as Phaser.Physics.Arcade.Body;
        body.x += Math.cos(a) * drag;
        body.y += Math.sin(a) * drag;
      }
    }
  }

  private rollPits(time: number): void {
    const plus = this.plus('quicksand');
    const b = this.api.scene.physics.world.bounds;
    const n = plus ? 4 : 3;
    const r = plus ? 96 : 78;
    for (let i = 0; i < n; i++) {
      this.pits.push({
        x: Phaser.Math.Between(b.x + r, b.right - r),
        y: Phaser.Math.Between(b.y + r, b.bottom - r),
        r, bornAt: time, goneAt: 0,
      });
    }
  }

  // ── 12 · Overload ───────────────────────────────────────────────────────

  /** Cooldowns fall away; the difference is paid out of your own health. */
  private updateOverload(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const plus = this.plus('overload');
    const player = this.api.player;
    // A floor rather than an assignment: a kit that zeroes cooldowns for a
    // window (Timeless, Rebirth) keeps its value, and this re-applies after.
    player.cooldownMult = Math.min(player.cooldownMult, plus ? 0.4 : 0.6);

    this.overloadHeat = Math.max(0, this.overloadHeat - dt * 1.6);
    if (player.active) drawOverloadCoil(g, player.x, player.y, 22, time, this.overloadHeat);
  }

  // ── 13 · Fragile ────────────────────────────────────────────────────────

  private drawFragile(
    time: number, gMid: Phaser.GameObjects.Graphics, gHud: Phaser.GameObjects.Graphics,
  ): void {
    const player = this.api.player;
    if (!player.active) return;
    const sev = 1 - Phaser.Math.Clamp(player.hp / Math.max(1, player.maxHp), 0, 1);
    drawFragileCracks(gMid, player.x, player.y, 20, sev);
    const beat = 0.5 + 0.5 * Math.sin(time * 0.008 * (1 + sev * 2));
    drawCrackedHeart(gHud, player.x - 34, player.y - 44, 9, beat);
  }

  // ── 14 · Swarm ──────────────────────────────────────────────────────────

  /** A stinging band you have to time your approach through. */
  private updateSwarm(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const plus = this.plus('swarm');
    const npc = this.api.npc;
    const player = this.api.player;
    if (!npc.active) return;
    this.swarmAngle += dt * 1.5;
    this.swarmRadius = 88 + Math.sin(time * 0.0012) * 22;

    const rings = plus ? 2 : 1;
    for (let ring = 0; ring < rings; ring++) {
      const dir = ring === 0 ? 1 : -1;
      const rr = this.swarmRadius * (ring === 0 ? 1 : 0.72);
      const count = 9;
      for (let i = 0; i < count; i++) {
        const a = this.swarmAngle * dir + (i / count) * Math.PI * 2;
        const wob = Math.sin(time * 0.006 + i) * 5;
        drawWasp(g, npc.x + Math.cos(a) * (rr + wob), npc.y + Math.sin(a) * (rr + wob),
                 5, a + Math.PI / 2 * dir, time + i * 90);
      }
      if (!player.active) continue;
      const d = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
      if (Math.abs(d - rr) <= 15 && time >= this.swarmStingAt) {
        this.swarmStingAt = time + 800;
        player.takeDamage(6);
        this.playerSpeed *= 0.65;
        this.api.spawnHitFlash(player.x, player.y, MUT.swarm.sting);
        this.api.showFloatingText(player.x, player.y - 26, '🐝 STUNG', '#f2c035');
      }
    }

    if (plus) {
      if (time >= this.hunterAt) {
        this.hunterAt = time + 6000;
        this.hunters.push({ x: npc.x, y: npc.y, until: time + 6000 });
      }
      for (let i = this.hunters.length - 1; i >= 0; i--) {
        const h = this.hunters[i];
        if (time >= h.until || !player.active) { this.hunters.splice(i, 1); continue; }
        const a = Math.atan2(player.y - h.y, player.x - h.x);
        h.x += Math.cos(a) * 165 * dt;
        h.y += Math.sin(a) * 165 * dt;
        drawWasp(g, h.x, h.y, 7, a, time);
        if (Phaser.Math.Distance.Between(h.x, h.y, player.x, player.y) < 20) {
          this.hunters.splice(i, 1);
          player.takeDamage(12);
          this.api.spawnHitFlash(player.x, player.y, MUT.swarm.sting);
          this.api.showFloatingText(player.x, player.y - 30, '🐝 HUNTER', '#ff6a4d');
        }
      }
    }
  }

  // ── 15 · Tempest ────────────────────────────────────────────────────────

  /** Bolts that land where you were a second ago, and land faster the longer you take. */
  private updateTempest(
    time: number, dt: number,
    gGround: Phaser.GameObjects.Graphics, gMid: Phaser.GameObjects.Graphics,
  ): void {
    const plus = this.plus('tempest');
    const player = this.api.player;
    const b = this.api.scene.physics.world.bounds;
    this.tempestElapsed += dt;

    const ramp = Phaser.Math.Clamp(this.tempestElapsed / 45, 0, 1);
    const every = (3600 - ramp * 2000) * (plus ? 0.75 : 1);
    if (time >= this.strikeNextAt && player.active) {
      this.strikeNextAt = time + every;
      const body = player.body as Phaser.Physics.Arcade.Body;
      const lead = 0.35;
      const aim = () => ({
        x: Phaser.Math.Clamp(player.x + body.velocity.x * lead, b.x + 30, b.right - 30),
        y: Phaser.Math.Clamp(player.y + body.velocity.y * lead, b.y + 30, b.bottom - 30),
      });
      const n = plus ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const p = aim();
        const off = i === 0 ? 0 : 60;
        const oa = Math.random() * Math.PI * 2;
        this.strikes.push({
          x: Phaser.Math.Clamp(p.x + Math.cos(oa) * off, b.x + 30, b.right - 30),
          y: Phaser.Math.Clamp(p.y + Math.sin(oa) * off, b.y + 30, b.bottom - 30),
          landsAt: time + 1100, seed: Math.floor(Math.random() * 1000), flashUntil: 0,
        });
      }
    }

    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      if (s.flashUntil > 0) {
        if (time >= s.flashUntil) { this.strikes.splice(i, 1); continue; }
        drawBolt(gMid, b.y - 20, s.x, s.y, s.seed, (s.flashUntil - time) / 220);
        continue;
      }
      const prog = Phaser.Math.Clamp(1 - (s.landsAt - time) / 1100, 0, 1);
      drawStrikeMark(gGround, s.x, s.y, 46, prog, time);
      if (time >= s.landsAt) {
        s.flashUntil = time + 220;
        this.api.scene.cameras.main.flash(90, 200, 225, 255);
        if (player.active && Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y) <= 46) {
          player.takeDamage(18);
          this.api.spawnHitFlash(player.x, player.y, MUT.tempest.bolt);
          this.api.showFloatingText(player.x, player.y - 30, '⛈ STRUCK', '#d6ecff');
        }
        if (plus) this.pools.push({ x: s.x, y: s.y, r: 40, until: time + 3500, tickAt: 0 });
      }
    }

    for (let i = this.pools.length - 1; i >= 0; i--) {
      const p = this.pools[i];
      if (time >= p.until) { this.pools.splice(i, 1); continue; }
      const a = 0.16 + 0.1 * Math.sin(time * 0.01 + i);
      gGround.fillStyle(MUT.tempest.mark, a);
      gGround.fillCircle(p.x, p.y, p.r);
      gGround.lineStyle(1.5, MUT.tempest.bolt, 0.5);
      for (let k = 0; k < 5; k++) {
        const ang = time * 0.003 + (k / 5) * Math.PI * 2;
        gGround.lineBetween(p.x, p.y, p.x + Math.cos(ang) * p.r, p.y + Math.sin(ang) * p.r);
      }
      if (player.active && Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) < p.r
          && time - p.tickAt >= 500) {
        p.tickAt = time;
        player.applySelfDamage(4);
        this.api.spawnDamageNumber(player.x, player.y - 20, 4);
      }
    }
  }

  // ── 16 · Bulwark ────────────────────────────────────────────────────────

  /**
   * A plate that follows you, but not quickly. Standing in front of it is worth
   * almost nothing; getting round it before it turns is the whole fight.
   *
   * Returns the incoming multiplier to fold onto the npc for this frame.
   */
  private updateBulwark(time: number, dt: number, g: Phaser.GameObjects.Graphics): number {
    const plus = this.plus('bulwark');
    const npc = this.api.npc;
    const player = this.api.player;
    if (!npc.active) return 1;

    const want = Math.atan2(player.y - npc.y, player.x - npc.x);
    const turn = Phaser.Math.DegToRad(plus ? 200 : 130) * dt;
    const diff = Phaser.Math.Angle.Wrap(want - this.plateAngle);
    this.plateAngle += Math.sign(diff) * Math.min(Math.abs(diff), turn);

    const halfArc = Phaser.Math.DegToRad(70);
    const covered = Math.abs(Phaser.Math.Angle.Wrap(want - this.plateAngle)) <= halfArc;
    this.plateLit = covered ? Math.min(1, this.plateLit + dt * 4) : Math.max(0, this.plateLit - dt * 3);
    drawBulwarkPlate(g, npc.x, npc.y, 26 * npc.scaleX, this.plateAngle, halfArc, this.plateLit);

    // Starred sends your own shots home: while the plate is covering you, roughly
    // one bolt a second comes back down the line you are standing on.
    if (plus && covered && Math.random() < dt) {
      this.thorns.push({
        x: npc.x + Math.cos(this.plateAngle) * 34, y: npc.y + Math.sin(this.plateAngle) * 34,
        vx: Math.cos(this.plateAngle) * 300, vy: Math.sin(this.plateAngle) * 300, bornAt: time,
      });
    }
    return covered ? 0.15 : 1;
  }

  // ── 17 · Vault ──────────────────────────────────────────────────────────

  /** You start the fight with most of your kit sealed, and earn it back on a clock. */
  private updateVault(time: number, g: Phaser.GameObjects.Graphics): void {
    const plus = this.plus('vault');
    const player = this.api.player;
    const every = plus ? 26000 : 20000;

    if (this.vaultLocked.length > 0) {
      if (time >= this.vaultNextAt) {
        this.vaultNextAt = time + every;
        const freed = this.vaultLocked.shift()!;
        player.resetCooldown(freed);
        this.vaultOpen = 1;
        this.api.showFloatingText(player.x, player.y - 46, '🔓 SLOT OPEN', '#d8b25c');
      }
      // Refreshed rather than set once: a cleanse or a kit that clears locks
      // must not hand the whole tray back early.
      for (const id of this.vaultLocked) player.lockAbility(id, 600);
      this.api.setStatusIndicator('mut-vault', {
        name: 'Sealed', emoji: '🔒', color: MUT.vault.brass,
        description: 'Your kit is locked. One more slot opens every time the vault clock runs out.',
        count: this.vaultLocked.length, priority: 26, until: this.vaultNextAt,
      });
    } else {
      this.api.setStatusIndicator('mut-vault', null);
    }

    this.vaultOpen = Math.max(0, this.vaultOpen - 0.02);
    if (player.active && (this.vaultLocked.length > 0 || this.vaultOpen > 0)) {
      drawPadlock(g, player.x + 34, player.y - 42, 8, this.vaultOpen);
    }
  }

  // ── 18 · Roulette ───────────────────────────────────────────────────────

  /** Something happens on a clock. Which something is not up to either of you. */
  private updateRoulette(
    time: number, dt: number,
    gMid: Phaser.GameObjects.Graphics, gHud: Phaser.GameObjects.Graphics,
  ): void {
    const plus = this.plus('roulette');
    const b = this.api.scene.physics.world.bounds;
    const every = plus ? 7500 : 12000;
    const faces = plus ? ROULETTE_FACES.filter((f) => f.id !== 'gift') : ROULETTE_FACES;

    if (time >= this.wheelNextAt) {
      this.wheelNextAt = time + every;
      this.wheelVel = 13 + Math.random() * 5;
      this.wheelLanded = -1;
    }
    if (this.wheelVel > 0.02) {
      this.wheelSpin += this.wheelVel * dt;
      this.wheelVel *= Math.pow(0.22, dt);
      if (this.wheelVel <= 0.35 && this.wheelLanded < 0) {
        this.wheelVel = 0;
        const step = (Math.PI * 2) / faces.length;
        // The pointer sits at the top; work out which segment stopped under it.
        const at = ((-Math.PI / 2 - this.wheelSpin) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        this.wheelLanded = Math.floor(at / step) % faces.length;
        this.wheelGlow = 1;
        this.fireRoulette(time, faces[this.wheelLanded]);
        if (plus) {
          const second = Math.floor(Math.random() * faces.length);
          this.fireRoulette(time, faces[second]);
        }
      }
    }
    // Right edge, mid height — clear of the status tray above it and of the Duel
    // crest opposite, since the two stack together often enough to matter.
    this.wheelGlow = Math.max(0, this.wheelGlow - dt * 0.9);
    drawRouletteWheel(gHud, b.right - 44, b.centerY, 26, faces.length,
                      this.wheelSpin, this.wheelLanded, this.wheelGlow);

    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      const prog = Phaser.Math.Clamp(1 - (bomb.at - time) / 1400, 0, 1);
      drawStrikeMark(gMid, bomb.x, bomb.y, 56, prog, time);
      if (time >= bomb.at) {
        this.bombs.splice(i, 1);
        const player = this.api.player;
        if (player.active && Phaser.Math.Distance.Between(bomb.x, bomb.y, player.x, player.y) <= 56) {
          player.takeDamage(24);
          this.api.spawnHitFlash(player.x, player.y, 0xff7766);
          this.api.showFloatingText(player.x, player.y - 30, '💣 BOOM', '#ff7766');
        }
        this.api.scene.cameras.main.shake(180, 0.012);
      }
    }
  }

  private fireRoulette(time: number, face: RouletteFace): void {
    const player = this.api.player;
    const npc = this.api.npc;
    this.api.showFloatingText(npc.x, npc.y - 52, `${face.emoji} ${face.label}`, face.color);
    switch (face.id) {
      case 'swap': {
        const px = player.x, py = player.y;
        (player.body as Phaser.Physics.Arcade.Body).reset(npc.x, npc.y);
        (npc.body as Phaser.Physics.Arcade.Body).reset(px, py);
        this.api.spawnHitFlash(px, py, 0xa9d8ff);
        break;
      }
      case 'mend':
        npc.heal(Math.round(npc.maxHp * 0.15));
        break;
      case 'edge':
        this.edgeUntil = time + 8000;
        break;
      case 'haste':
        this.hasteUntil = time + 8000;
        break;
      case 'gift':
        player.shieldCharges += 1;
        this.api.showFloatingText(player.x, player.y - 34, '🎁 SHIELD', '#ffe680');
        break;
      case 'bomb':
        this.bombs.push({ x: player.x, y: player.y, at: time + 1400 });
        break;
      case 'blind':
        player.aimScatterUntil = Math.max(player.aimScatterUntil, Date.now() + 4000);
        break;
      case 'anchor':
        this.anchorUntil = time + 6000;
        break;
    }
  }

  // ── 19 · Warden (boss) ──────────────────────────────────────────────────

  private rebuildPosts(): void {
    const b = this.api.scene.physics.world.bounds;
    this.posts = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      this.posts.push({
        x: b.centerX + Math.cos(a) * this.wardenRadius,
        y: b.centerY + Math.sin(a) * this.wardenRadius,
      });
    }
  }

  /**
   * A jailer with an arena on a leash. Four posts turn a rotating cage of live
   * chain around the middle of the floor, and every few seconds the boss throws
   * a hook to drag you back into it.
   */
  private updateWarden(
    time: number, dt: number,
    gGround: Phaser.GameObjects.Graphics, gMid: Phaser.GameObjects.Graphics,
  ): void {
    const npc = this.api.npc;
    const player = this.api.player;
    const b = this.api.scene.physics.world.bounds;

    if (!this.wardenPhase2 && npc.active && npc.hp <= npc.maxHp * 0.5) {
      this.wardenPhase2 = true;
      this.wardenRadius *= 0.65;
      this.hookNextAt = Math.min(this.hookNextAt, time + 2000);
      this.api.showFloatingText(npc.x, npc.y - 50, '⛓️ TIGHTEN', '#ffd08a');
      this.api.scene.cameras.main.shake(320, 0.015);
    }

    this.wardenSpin += dt * (this.wardenPhase2 ? 0.42 : 0.2);
    for (let i = 0; i < 4; i++) {
      const a = this.wardenSpin + (i / 4) * Math.PI * 2;
      this.posts[i] = {
        x: b.centerX + Math.cos(a) * this.wardenRadius,
        y: b.centerY + Math.sin(a) * this.wardenRadius,
      };
      drawAnchorPost(gMid, this.posts[i].x, this.posts[i].y, 13, time);
    }

    // Live chain between adjacent posts.
    let touching = false;
    for (let i = 0; i < 4; i++) {
      const p0 = this.posts[i], p1 = this.posts[(i + 1) % 4];
      const near = player.active && this.distToSegment(player.x, player.y, p0.x, p0.y, p1.x, p1.y) < 13;
      if (near) touching = true;
      drawChain(gGround, p0.x, p0.y, p1.x, p1.y, time * 0.0012 + i, near ? 1 : 0);
    }
    if (touching && time - this.chainTickAt >= 500 && player.active) {
      this.chainTickAt = time;
      player.takeDamage(7);
      this.playerSpeed *= 0.7;
      this.api.spawnHitFlash(player.x, player.y, MUT.warden.hot);
      this.api.showFloatingText(player.x, player.y - 26, '⛓️ SEARED', '#ffd08a');
    }

    // The hook.
    const hookEvery = this.wardenPhase2 ? 5000 : 9000;
    if (!this.hook && time >= this.hookNextAt && npc.active && player.active) {
      this.hookNextAt = time + hookEvery;
      const a = Math.atan2(player.y - npc.y, player.x - npc.x);
      this.hook = { x: npc.x, y: npc.y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, state: 'out' };
      this.api.showFloatingText(npc.x, npc.y - 50, '⛓️ HOOK', '#a4602f');
    }
    if (this.hook) {
      const h = this.hook;
      if (h.state === 'out') {
        h.x += h.vx * dt; h.y += h.vy * dt;
        if (h.x < b.x || h.x > b.right || h.y < b.y || h.y > b.bottom) this.hook = null;
        else if (player.active && Phaser.Math.Distance.Between(h.x, h.y, player.x, player.y) < 22) {
          h.state = 'reel';
          player.takeDamage(14);
          this.heldUntil = time + 800;
          player.applyDisarm(800);
          this.api.showFloatingText(player.x, player.y - 32, '⛓️ CAUGHT', '#ffd08a');
        }
      } else {
        // Reeling: the player rides the chain back to the boss.
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        const body = player.body as Phaser.Physics.Arcade.Body;
        body.x += Math.cos(a) * 520 * dt;
        body.y += Math.sin(a) * 520 * dt;
        h.x = player.x; h.y = player.y;
        if (Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) < 44 || time >= this.heldUntil) {
          this.hook = null;
        }
      }
      if (this.hook) {
        const a = Math.atan2(this.hook.y - npc.y, this.hook.x - npc.x);
        drawChain(gMid, npc.x, npc.y, this.hook.x, this.hook.y, time * 0.004, 0);
        drawHook(gMid, this.hook.x, this.hook.y, 9, a);
      }
    }
    if (time < this.heldUntil) this.playerSpeed *= 0.15;
  }

  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Phaser.Math.Clamp(t, 0, 1);
    return Phaser.Math.Distance.Between(px, py, x1 + dx * t, y1 + dy * t);
  }

  // ── 20 · Oracle (boss) ──────────────────────────────────────────────────

  /**
   * It writes down what is about to happen to you, and then that happens. Every
   * prophecy takes the same time to finish drawing itself, so the fight is read
   * off the floor rather than off the boss.
   */
  private updateOracle(time: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const npc = this.api.npc;
    const player = this.api.player;
    const b = this.api.scene.physics.world.bounds;
    const shapes: ProphecyShape[] = ['ring', 'cross', 'triangle', 'star', 'eye'];

    if (!this.oraclePhase2 && npc.active && npc.hp <= npc.maxHp * 0.5) {
      this.oraclePhase2 = true;
      this.api.showFloatingText(npc.x, npc.y - 50, '🔮 IT IS WRITTEN', '#ff6ad5');
      this.api.scene.cameras.main.shake(320, 0.015);
    }

    const every = this.oraclePhase2 ? 3000 : 4500;
    if (time >= this.oracleNextAt && npc.active && player.active) {
      this.oracleNextAt = time + every;
      const body = player.body as Phaser.Physics.Arcade.Body;
      const lead = 0.6;
      const r = (this.oraclePhase2 ? 84 : 66);
      this.prophecies.push({
        x: Phaser.Math.Clamp(player.x + body.velocity.x * lead, b.x + r, b.right - r),
        y: Phaser.Math.Clamp(player.y + body.velocity.y * lead, b.y + r, b.bottom - r),
        r, bornAt: time, firesAt: time + 2600,
        shape: shapes[Math.floor(Math.random() * shapes.length)], echo: false,
      });
    }

    for (let i = this.prophecies.length - 1; i >= 0; i--) {
      const p = this.prophecies[i];
      const prog = Phaser.Math.Clamp((time - p.bornAt) / (p.firesAt - p.bornAt), 0, 1);
      drawProphecy(g, p.x, p.y, p.r, p.shape, prog, time);
      if (time < p.firesAt) continue;
      this.prophecies.splice(i, 1);
      const ring = this.api.scene.add.circle(p.x, p.y, p.r, MUT.oracle.burn, 0.5).setDepth(10);
      this.api.scene.tweens.add({
        targets: ring, scaleX: 1.35, scaleY: 1.35, alpha: 0, duration: 380,
        onComplete: () => ring.destroy(),
      });
      if (player.active && Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) <= p.r) {
        player.takeDamage(20);
        this.api.spawnHitFlash(player.x, player.y, MUT.oracle.burn);
        this.api.showFloatingText(player.x, player.y - 30, '🔮 FORETOLD', '#bf8cff');
      }
      // Phase two leaves the ink behind, and it happens a second time.
      if (this.oraclePhase2 && !p.echo) {
        this.prophecies.push({ ...p, bornAt: time, firesAt: time + 2500, r: p.r * 0.8, echo: true });
      }
    }
    void dt;
  }
}
