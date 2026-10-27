import Phaser from 'phaser';
import type { Fighter } from '../../entities/Fighter';
import { BossToolkit, BossToolkitHost } from '../../boss/framework/BossToolkit';
import { Sfx } from '../../audio';
import { ELEMENT_DATA_MAP } from '../../data/ElementRoster';
import { mulberry, hashStr } from '../art/IsleArt';
import * as Save from '../IslesSave';
import {
  getEncounter, getGimmick, getIsleItem, getItemScript, getFloor, getCourt,
} from '../IslesRegistry';
import type {
  EncounterGimmick, GimmickCtx, IslesFightPayload, ItemScript, ItemScriptCtx, GeneGrant,
} from '../IslesTypes';
import { genomeCastRules } from '../systems/Genome';

/**
 * The Ten Isles' half of a fight: the encounter's gimmick, the charm / artifact / meal scripts,
 * and the genome's on-cast rules. Stats from all of those already went in through ItemsKit (the
 * launcher filled `consumedItemIds`); this kit runs everything that needs a heartbeat.
 *
 * Constructed once by ArenaScene and `reset()` every match, like every other kit. Multipliers
 * are *pulled* — ArenaScene folds `getPlayerSpeedMult()` / `getNpcSpeedMult()` into its own
 * per-frame chains, and this kit rewrites `islesIncomingMult` on both fighters every frame.
 */

export interface IslesArenaApi {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly width: number;
  readonly height: number;
  readonly elementId: string;
  gameEnded(): boolean;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  victory(): void;
}

const FIELD_PAD = 40;
const FIELD_TOP = 96;

interface Window { mult: number; until: number }

export class IslesFightKit {
  private payload: IslesFightPayload | null = null;
  private tk: BossToolkit | null = null;
  private gimmick: EncounterGimmick | null = null;
  private scripts: ItemScript[] = [];
  private rules: ReturnType<typeof genomeCastRules> = [];
  private gGround: Phaser.GameObjects.Graphics | null = null;
  private gAir: Phaser.GameObjects.Graphics | null = null;
  private gHud: Phaser.GameObjects.Graphics | null = null;
  private dmgWindows: Window[] = [];
  private spdWindows: Window[] = [];
  /** Stun / root holds, scene-clock end times. The kit zeroes these bodies last thing each frame. */
  private holds = new Map<Fighter, number>();
  private bannerText: Phaser.GameObjects.Text | null = null;
  private slotMap = new Map<string, string>();
  private rng: () => number = Math.random;

  constructor(private api: IslesArenaApi) {}

  get active(): boolean { return this.payload !== null; }

  reset(payload: IslesFightPayload | null): void {
    this.gimmick?.destroy?.();
    this.tk?.destroy();
    this.payload = payload;
    this.tk = null;
    this.gimmick = null;
    this.scripts = [];
    this.rules = [];
    this.dmgWindows = [];
    this.spdWindows = [];
    this.holds.clear();
    this.gGround = this.gAir = this.gHud = null;
    this.bannerText = null;
    if (!payload) return;

    const { scene, player, npc } = this.api;
    this.rng = mulberry(hashStr(`${payload.id}:${Date.now()}`));
    this.gGround = scene.add.graphics().setDepth(2);
    this.gAir = scene.add.graphics().setDepth(30);
    this.gHud = scene.add.graphics().setDepth(40).setScrollFactor(0);

    this.slotMap.clear();
    const el = ELEMENT_DATA_MAP[this.api.elementId];
    for (const a of el?.abilities ?? []) {
      const k = a.displayKey.toLowerCase();
      this.slotMap.set(a.id, k === 'click' ? 'click' : k);
    }

    if (payload.kind === 'encounter' || payload.kind === 'warden') {
      const enc = getEncounter(payload.id);
      if (enc) {
        if (enc.hpMult && enc.hpMult !== 1) {
          npc.setMaxHp(Math.max(10, Math.round(npc.maxHp * enc.hpMult)));
          npc.hp = npc.maxHp;
        }
        if (payload.hard) {
          npc.setMaxHp(Math.round(npc.maxHp * 1.3));
          npc.hp = npc.maxHp;
        }
        const def = getGimmick(enc.gimmick);
        if (def) {
          this.tk = new BossToolkit(this.host(), {
            main: 0xff7a2f, lit: 0xffc27a, dark: 0x5a1e08, accent: 0xffe08a,
          }, payload.hard);
          const court = getCourt(enc.court);
          if (court) {
            const c = court.color;
            this.tk.palette = { main: c, lit: mixLit(c), dark: mixDark(c), accent: 0xffe08a };
          }
          if (payload.hard) this.tk.damageScale = 1.25;
          try {
            this.gimmick = def.make(this.gimmickCtx());
          } catch (e) {
            console.error('[isles] gimmick failed to start', enc.gimmick, e);
            this.gimmick = null;
          }
        }
      }
    }

    // Charm / artifact / meal scripts.
    if (Save.hasActive()) {
      const s = Save.S();
      const ids = [...s.charms, ...(s.artifact ? [s.artifact] : []), ...(s.meal ? [s.meal] : [])];
      const ctx = this.scriptCtx();
      for (const id of ids) {
        const def = getIsleItem(id);
        const make = def?.script ? getItemScript(def.script) : undefined;
        if (!make) continue;
        try { this.scripts.push(make(ctx)); } catch (e) { console.error('[isles] item script failed', id, e); }
      }
      this.rules = genomeCastRules(this.api.elementId);
    }

    // Hooks — chained, never replaced.
    const prevCast = player.onCastStamp;
    player.onCastStamp = (abilityId, aim) => {
      prevCast?.(abilityId, aim);
      if (!this.payload) return;
      const slot = this.slotMap.get(abilityId) ?? null;
      for (const sc of this.scripts) sc.onCast?.(abilityId, slot);
      this.applyCastRules(abilityId, slot);
    };
    const prevP = player.onDamaged;
    player.onDamaged = (amount) => {
      prevP?.(amount);
      if (!this.payload || amount <= 0) return;
      this.gimmick?.onPlayerHurt?.(amount);
      if (this.internalHit) return;
      for (const sc of this.scripts) sc.onHitTaken?.(amount);
    };
    const prevN = npc.onDamaged;
    npc.onDamaged = (amount) => {
      prevN?.(amount);
      if (!this.payload || amount <= 0) return;
      this.gimmick?.onNpcHurt?.(amount);
      if (this.internalHit) return;
      for (const sc of this.scripts) sc.onHitDealt?.(amount);
    };

    if (this.gimmick || payload.kind === 'encounter') {
      const enc = getEncounter(payload.id);
      const g = enc ? getGimmick(enc.gimmick) : undefined;
      if (enc) this.banner(enc.name.toUpperCase(), '#ffd27a', g?.rules);
    }
  }

  private host(): BossToolkitHost {
    const api = this.api;
    return {
      scene: api.scene,
      get W() { return api.width; },
      get H() { return api.height; },
      player: () => api.player,
      bossX: () => api.npc.x,
      bossY: () => api.npc.y,
      setBossPos: (x, y) => api.npc.setPosition(x, y),
      stopped: () => api.gameEnded(),
      addEnemy: (f) => api.addEnemy(f),
      removeEnemy: (f) => api.removeEnemy(f),
      healBoss: (n) => api.npc.heal(n),
      spawnHitFlash: (x, y, c) => api.spawnHitFlash(x, y, c),
      showFloatingText: (x, y, t, c) => api.showFloatingText(x, y, t, c),
    };
  }

  private clampPos(f: Fighter): void {
    f.x = Phaser.Math.Clamp(f.x, FIELD_PAD, this.api.width - FIELD_PAD);
    f.y = Phaser.Math.Clamp(f.y, FIELD_TOP, this.api.height - FIELD_PAD);
  }

  /** True while the kit itself is dealing damage — scripts' on-hit hooks only see real hits. */
  private internalHit = false;

  private hit = (f: Fighter, amount: number, x?: number, y?: number): void => {
    if (this.api.gameEnded() || !f.active || f.hp <= 0 || amount <= 0) return;
    this.internalHit = true;
    try { f.takeDamage(Math.max(1, Math.round(amount))); } finally { this.internalHit = false; }
    this.api.spawnHitFlash(x ?? f.x, y ?? f.y, 0xffb347);
  };

  private hold(f: Fighter, ms: number): void {
    const until = this.api.scene.time.now + ms;
    this.holds.set(f, Math.max(this.holds.get(f) ?? 0, until));
  }

  /** Same writes as Pressure's PainLock: the tray reads `stunnedUntil`, the bot's legs read `earthStunnedUntil`. */
  private stun = (f: Fighter, ms: number): void => {
    if (this.api.gameEnded() || !f.active || f.hp <= 0 || ms <= 0 || f.unstoppable) return;
    f.applyDisarm(ms);
    f.stunnedUntil = Math.max(f.stunnedUntil, Date.now() + ms);
    if (!f.isPlayerFighter) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.api.scene.time.now + ms);
    this.hold(f, ms);
  };

  private root = (f: Fighter, ms: number): void => {
    if (this.api.gameEnded() || !f.active || f.hp <= 0 || ms <= 0 || f.unstoppable) return;
    this.hold(f, ms);
  };

  private silence = (f: Fighter, ms: number): void => {
    if (this.api.gameEnded() || !f.active || f.hp <= 0 || ms <= 0) return;
    f.silencedUntil = Math.max(f.silencedUntil, Date.now() + ms);
  };

  private heal = (f: Fighter, amount: number): void => {
    if (this.api.gameEnded() || !f.active || f.hp <= 0 || amount <= 0) return;
    f.heal(Math.round(amount));
  };

  private gimmickCtx(): GimmickCtx {
    const api = this.api;
    const kit = this;
    return {
      scene: api.scene,
      W: api.width,
      H: api.height,
      tk: this.tk!,
      get player() { return api.player; },
      get npc() { return api.npc; },
      top: FIELD_TOP,
      hard: this.payload?.hard ?? false,
      rng: this.rng,
      hit: this.hit,
      heal: this.heal,
      nudge: (f, dx, dy) => {
        if (!f.active || f.hp <= 0) return;
        f.x += dx; f.y += dy;
        kit.clampPos(f);
      },
      stun: this.stun,
      root: this.root,
      silence: this.silence,
      float: (x, y, t, c) => api.showFloatingText(x, y, t, c),
      flash: (x, y, c) => api.spawnHitFlash(x, y, c),
      banner: (t, c) => kit.banner(t, c ?? '#ffe2a8'),
      sfx: (n) => Sfx.playAt(n, api.width / 2),
      victory: () => api.victory(),
    };
  }

  private scriptCtx(): ItemScriptCtx {
    const api = this.api;
    const kit = this;
    return {
      scene: api.scene,
      W: api.width,
      H: api.height,
      get player() { return api.player; },
      get npc() { return api.npc; },
      rng: this.rng,
      hit: this.hit,
      heal: this.heal,
      float: (x, y, t, c) => api.showFloatingText(x, y, t, c),
      flash: (x, y, c) => api.spawnHitFlash(x, y, c),
      sfx: (n) => Sfx.playAt(n, api.player.x),
      slotOf: (id) => kit.slotMap.get(id) ?? null,
      refund: (id, ms) => api.player.reduceCooldown(id, ms),
      boostDamage: (mult, ms) => { kit.dmgWindows.push({ mult, until: api.scene.time.now + ms }); },
      boostSpeed: (mult, ms) => { kit.spdWindows.push({ mult, until: api.scene.time.now + ms }); },
    };
  }

  private applyCastRules(abilityId: string, slot: string | null): void {
    if (!slot) return;
    const { player, scene } = this.api;
    const now = scene.time.now;
    for (const r of this.rules) {
      if (r.slot !== slot) continue;
      const g: NonNullable<GeneGrant['onCast']> = r;
      const ms = g.ms ?? 2000;
      if (g.damageMult) this.dmgWindows.push({ mult: g.damageMult, until: now + ms });
      if (g.speedMult) this.spdWindows.push({ mult: g.speedMult, until: now + ms });
      if (g.heal) this.heal(player, g.heal);
      if (g.shield) player.shieldHp += g.shield;
      if (g.refundOthers) {
        for (const [id] of this.slotMap) if (id !== abilityId) player.reduceCooldown(id, g.refundOthers);
      }
      if (g.refundSelfChance && this.rng() < g.refundSelfChance) {
        scene.time.delayedCall(60, () => player.resetCooldown(abilityId));
        this.api.showFloatingText(player.x, player.y - 44, '🧬 ECHO', '#9dffcf');
      }
      if (g.burst) {
        const npc = this.api.npc;
        const ring = scene.add.circle(player.x, player.y, g.burst.radius, 0x9dffcf, 0.22).setDepth(18).setScale(0.3);
        scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
        if (Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) <= g.burst.radius) this.hit(npc, g.burst.damage);
      }
    }
  }

  /** A big centred banner, with an optional rules line under it. */
  banner(text: string, color = '#ffe2a8', sub?: string): void {
    const { scene, width } = this.api;
    this.bannerText?.destroy();
    const t = scene.add.text(width / 2, 200, sub ? `${text}\n${sub}` : text, {
      fontFamily: '"Arial Black", Impact, sans-serif', fontSize: sub ? '20px' : '30px', color,
      stroke: '#000000', strokeThickness: 5, align: 'center', wordWrap: { width: 720 },
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0).setAlpha(0);
    if (sub) {
      // Rules line smaller than the title — restyle the second line by splitting into two texts.
      t.setText(text);
      const s = scene.add.text(width / 2, 234, sub, {
        fontFamily: '"Trebuchet MS", sans-serif', fontSize: '15px', color: '#f3e3c8',
        stroke: '#000000', strokeThickness: 4, align: 'center', wordWrap: { width: 640 },
      }).setOrigin(0.5, 0).setDepth(60).setScrollFactor(0).setAlpha(0);
      scene.tweens.add({ targets: s, alpha: 1, duration: 250, hold: 3200, yoyo: true, onComplete: () => s.destroy() });
    }
    scene.tweens.add({ targets: t, alpha: 1, duration: 200, hold: sub ? 3200 : 900, yoyo: true, onComplete: () => t.destroy() });
    this.bannerText = t;
  }

  update(time: number, delta: number): void {
    if (!this.payload) return;
    const dt = delta / 1000;
    const { player, npc } = this.api;
    this.tk?.update(time, delta);
    try {
      this.gimmick?.update(time, dt);
    } catch (e) {
      console.error('[isles] gimmick update failed', e);
      this.gimmick = null;
    }
    for (const sc of this.scripts) sc.update?.(time, dt);

    // Holds: this update runs last in ArenaScene's frame, so a zeroed body stays put through the
    // next physics step whatever input or AI wrote earlier.
    for (const [f, until] of this.holds) {
      if (until <= time || !f.active || f.hp <= 0) { this.holds.delete(f); continue; }
      (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    }

    // Damage windows — your damage up = the foe takes more.
    this.dmgWindows = this.dmgWindows.filter((w) => w.until > time);
    this.spdWindows = this.spdWindows.filter((w) => w.until > time);
    let foeTaken = this.gimmick?.npcTakenMult?.() ?? 1;
    for (const w of this.dmgWindows) foeTaken *= w.mult;
    npc.islesIncomingMult = Phaser.Math.Clamp(foeTaken, 0.2, 4);
    player.islesIncomingMult = Phaser.Math.Clamp(this.gimmick?.playerTakenMult?.() ?? 1, 0.2, 4);

    const gG = this.gGround, gA = this.gAir, gH = this.gHud;
    if (gG && gA && gH) {
      gG.clear(); gA.clear(); gH.clear();
      this.tk?.drawGround(gG, time);
      this.gimmick?.drawGround?.(gG, time);
      for (const sc of this.scripts) sc.drawGround?.(gG, time);
      this.tk?.drawAir(gA, time);
      this.gimmick?.drawAir?.(gA, time);
      for (const sc of this.scripts) sc.drawAir?.(gA, time);
      this.gimmick?.drawHud?.(gH, time);
    }
  }

  getPlayerSpeedMult(): number {
    if (!this.payload) return 1;
    let m = (this.gimmick?.playerSpeedMult?.() ?? 1) * (this.tk?.getPlayerSpeedMult() ?? 1);
    for (const w of this.spdWindows) m *= w.mult;
    return Phaser.Math.Clamp(m, 0.25, 2.2);
  }

  getNpcSpeedMult(): number {
    if (!this.payload) return 1;
    return Phaser.Math.Clamp(this.gimmick?.npcSpeedMult?.() ?? 1, 0.2, 2.2);
  }

  npcSeekPoint(): { x: number; y: number } | null {
    if (!this.payload || !this.gimmick?.npcSeek) return null;
    try { return this.gimmick.npcSeek(); } catch { return null; }
  }
}

const mixLit = (c: number): number => {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  const f = (v: number) => Math.round(v + (255 - v) * 0.45);
  return (f(r) << 16) | (f(g) << 8) | f(b);
};
const mixDark = (c: number): number => {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  return (Math.round(r * 0.35) << 16) | (Math.round(g * 0.35) << 8) | Math.round(b * 0.35);
};

/**
 * Paint the court's arena floor under an Isles fight. Called from ArenaScene's background block
 * (before the fighters exist). A prince's own `drawArena` paints over this where it has one.
 */
export function paintIslesFloor(scene: Phaser.Scene, payload: IslesFightPayload, W: number, H: number): void {
  const key = payload.court ?? (payload.kind === 'warden' ? getEncounter(payload.id)?.court : undefined) ?? 'kiln';
  const floor = getFloor(key) ?? getFloor('kiln');
  const g = scene.add.graphics().setDepth(-100);
  if (floor) {
    try { floor(g, W, H, mulberry(hashStr(key))); return; } catch (e) { console.error('[isles] floor failed', key, e); }
  }
  g.fillStyle(0x1a0f0a, 1); g.fillRect(0, 0, W, H);
  g.fillStyle(0x2a1810, 1); g.fillRect(32, 32, W - 64, H - 64);
}
