import Phaser from 'phaser';
import type { Fighter } from '../../entities/Fighter';
import { TownWalker } from '../../campaign/town/TownWalker';
import { findElementDef } from '../../data/ElementRoster';
import { Sfx } from '../../audio';
import { Coop } from '../net/IslesCoop';
import type { IslesFightPayload } from '../IslesTypes';

/**
 * An Isles fight, fought by the whole party.
 *
 * Every player's game runs the fight in full against its own player — the same bot, the same court rule,
 * the same boss and all its signatures — so nothing about the 600 rules or the 71 bosses had to learn about
 * a second target. What is shared is the foe:
 *
 * - **One health pool.** The host's foe is the truth. A guest's blows are counted on the guest's screen and
 *   sent to the host (`f-dmg`); the host's foe takes them, and its health comes back twelve times a second
 *   for the guest's foe to match. A guest's foe cannot fall on its own — it falls (or, for a boss, turns over
 *   a phase) when the host's does, so every screen sees the same ending at the same moment.
 * - **More of it.** The foe takes 1/(1 + 0.7 per extra player) of every blow, on every screen.
 * - **One body.** In a duel the guest's foe is drawn where the host's is standing (a boss holds its own
 *   ground on each screen); the others' fighters are shown as you fight — where they are, how hurt.
 * - **Nobody dies alone.** A blow that would kill you while a friend is still up puts you *down* instead:
 *   eight seconds out of it, untouchable and helpless, then back on your feet at 40%. If the last one
 *   standing goes down, that is the fight.
 */

export interface CoopArenaApi {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  readonly npc: Fighter;
  gameEnded(): boolean;
  victory(): void;
  defeat(): void;
  spawnHitFlash(x: number, y: number, color: number): void;
}

const PER_EXTRA = 0.7;
const DOWN_MS = 8000;
const REVIVE_FRAC = 0.4;
const SEND_MS = 80;

interface Ghost { walker: TownWalker; plate: Phaser.GameObjects.Text; x: number; y: number; face: number; moving: boolean }

export class CoopFight {
  private on = false;
  private boss = false;
  private scale = 1;
  /** How many times the foe's health has run out on this screen (a boss: once per phase). */
  private depleted = 0;
  private armed = true;
  private pending = 0;
  private sendAt = 0;
  private lastHitAt = 0;
  private downUntil = 0;
  private downAt = 0;
  private endSent = false;
  private ghosts = new Map<number, Ghost>();
  private g: Phaser.GameObjects.Graphics | null = null;

  constructor(private api: CoopArenaApi) {}

  get active(): boolean { return this.on; }
  /** Down and waiting to get back up: nothing can hurt you, and you can do nothing. */
  get down(): boolean { return this.on && this.downUntil > 0; }
  /** What the foe takes of every blow on this screen. */
  get foeTaken(): number { return this.on ? 1 / this.scale : 1; }

  reset(payload: IslesFightPayload | null): void {
    for (const gh of this.ghosts.values()) { gh.walker.destroy(); gh.plate.destroy(); }
    this.ghosts.clear();
    this.g = null;
    if (Coop.fight === this.listener) Coop.fight = null;
    this.on = false;
    this.depleted = 0;
    this.armed = true;
    this.pending = 0;
    this.downUntil = 0;
    this.endSent = false;
    if (!payload?.coop || payload.kind === 'voyage' || !Coop.together) return;

    const { scene, player, npc } = this.api;
    this.on = true;
    this.boss = payload.kind === 'prince' || payload.kind === 'monarch';
    this.scale = 1 + PER_EXTRA * Math.max(0, payload.coop.n - 1);
    this.g = scene.add.graphics().setDepth(31);
    Coop.clearFight();
    Coop.fight = this.listener;

    // The foe's health running out — counted once per time it had any.
    npc.on('defeated', () => { if (this.armed) { this.armed = false; this.depleted++; } });

    if (Coop.isGuest) {
      // My foe waits on the host's: it cannot fall by itself, and every blow I land is reported.
      npc.minHpFloor = Math.max(npc.minHpFloor, 1);
      const prev = npc.onDamaged;
      npc.onDamaged = (amount) => {
        prev?.(amount);
        if (!this.on || amount <= 0) return;
        this.pending += amount;
        this.lastHitAt = scene.time.now;
      };
    }

    // Nobody dies alone.
    const prevAbsorb = player.damageAbsorber;
    player.damageAbsorber = (amount: number) => {
      if (prevAbsorb && prevAbsorb(amount)) return true;
      if (!this.on) return false;
      if (this.downUntil > 0) return true;
      if (player.hp <= 0 || player.shieldCharges > 0) return false;
      if (amount < player.hp + player.shieldHp) return false;
      if (!Coop.allies().some((a) => !a.down && a.hp > 0)) {
        // The last one standing: this is the fight. Tell the ones who were waiting to get up.
        Coop.send({ k: 'f-wipe' });
        return false;
      }
      this.downAt = scene.time.now;
      this.downUntil = this.downAt + DOWN_MS;
      player.hp = 1;
      player.shieldHp = 0;
      Sfx.playAt('status-stun', player.x);
      scene.cameras.main.flash(260, 120, 20, 20);
      return true;
    };
  }

  private listener = {
    onDamage: (amount: number): void => {
      // Host: a guest's blows, already cut down to size on their screen.
      const npc = this.api.npc;
      if (!this.on || this.api.gameEnded() || !npc.active || npc.hp <= 0 || npc.isInvincible || !(amount > 0)) return;
      npc.hp = Math.max(0, npc.hp - amount);
      this.api.spawnHitFlash(npc.x, npc.y, 0x9dd8ff);
      if (npc.hp <= 0) npc.emit('defeated');
    },
    onEnd: (won: boolean): void => {
      if (!this.on || this.api.gameEnded()) return;
      if (won) this.api.victory(); else this.api.defeat();
    },
    onWipe: (): void => {
      // Somebody was the last one standing and fell. If I was down, there is nobody to get up for.
      if (this.on && this.downUntil > 0 && !this.api.gameEnded()) { this.downUntil = 0; this.api.defeat(); }
    },
  };

  update(time: number, hold: (f: Fighter, ms: number) => void): void {
    if (!this.on) return;
    const { player, npc, scene } = this.api;
    if (!Coop.together) {
      // Everyone else has gone: it is an ordinary fight from here.
      this.on = false;
      this.scale = 1;
      npc.minHpFloor = 0;
      this.downUntil = 0;
      for (const gh of this.ghosts.values()) { gh.walker.destroy(); gh.plate.destroy(); }
      this.ghosts.clear();
      this.g?.clear();
      return;
    }
    if (npc.active && npc.hp > 0) this.armed = true;

    // Down: held, disarmed, and counting.
    if (this.downUntil > 0) {
      if (time >= this.downUntil) {
        this.downUntil = 0;
        player.hp = Math.max(player.hp, Math.round(player.maxHp * REVIVE_FRAC));
        Sfx.playAt('heal', player.x);
        scene.cameras.main.flash(220, 120, 255, 160);
      } else {
        hold(player, 120);
        player.applyDisarm(120);
        player.silencedUntil = Math.max(player.silencedUntil, Date.now() + 120);
      }
    }

    const ended = this.api.gameEnded();
    if (time >= this.sendAt && !ended) {
      this.sendAt = time + SEND_MS;
      const me = { x: Math.round(player.x), y: Math.round(player.y), hp: Math.max(0, Math.round(player.hp)), mx: Math.round(player.maxHp), down: this.downUntil > 0 };
      if (Coop.isHost) Coop.fighter(me, { hp: Math.max(0, npc.hp), mx: npc.maxHp, n: this.depleted, x: Math.round(npc.x), y: Math.round(npc.y) });
      else {
        Coop.fighter(me);
        if (this.pending > 0) { Coop.send({ k: 'f-dmg', a: Math.round(this.pending * 10) / 10 }); this.pending = 0; }
      }
    }
    if (Coop.isHost && ended && !this.endSent) {
      this.endSent = true;
      Coop.send({ k: 'f-end', won: player.active && player.hp > 0 });
    }

    if (Coop.isGuest && !ended) this.followHost(time);
    this.drawAllies(time);
  }

  /** Guest: bring my foe into line with the host's. */
  private followHost(time: number): void {
    const foe = Coop.foe;
    const npc = this.api.npc;
    if (!foe || !npc.active) return;
    if (foe.n > this.depleted) {
      // The host's foe has fallen (or a boss has turned a phase) and mine has not: it does now.
      if (npc.hp > 0 && !npc.isInvincible) {
        npc.minHpFloor = 0;
        npc.hp = 0;
        npc.emit('defeated');
      }
      return;
    }
    npc.minHpFloor = Math.max(npc.minHpFloor, 1);
    if (foe.n === this.depleted && npc.hp > 0 && !npc.isInvincible && foe.mx > 0) {
      const want = Math.max(1, Math.min(npc.maxHp, (foe.hp / foe.mx) * npc.maxHp));
      // Just after one of my own blows the host has not heard of it yet: never heal the foe back up for it.
      npc.hp = time - this.lastHitAt < 300 ? Math.min(npc.hp, want) : want;
    }
    if (!this.boss && Date.now() - foe.at < 600) {
      const dx = foe.x - npc.x, dy = foe.y - npc.y;
      if (dx * dx + dy * dy > 36) npc.setPosition(npc.x + dx * 0.16, npc.y + dy * 0.16);
    }
  }

  private drawAllies(time: number): void {
    const { scene, player } = this.api;
    const g = this.g;
    if (!g) return;
    g.clear();
    const live = new Set<number>();
    for (const a of Coop.allies()) {
      live.add(a.slot);
      let gh = this.ghosts.get(a.slot);
      if (!gh) {
        const el = Coop.roster.get(a.slot)?.element ?? 'fire';
        const walker = new TownWalker(scene, el, a.x, a.y, { bare: true });
        walker.container.setAlpha(0.62);
        const plate = scene.add.text(a.x, a.y - 58, Coop.nameOf(a.slot), {
          fontFamily: '"Trebuchet MS", sans-serif', fontSize: '11px', color: '#bfe6ff', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(32);
        gh = { walker, plate, x: a.x, y: a.y, face: 0, moving: false };
        this.ghosts.set(a.slot, gh);
      }
      const dx = a.x - gh.x, dy = a.y - gh.y;
      gh.moving = dx * dx + dy * dy > 9;
      if (gh.moving) gh.face = Math.atan2(dy, dx);
      gh.x += dx * 0.25; gh.y += dy * 0.25;
      gh.walker.update(16, gh.x, gh.y, gh.moving && !a.down, gh.moving ? gh.face : Math.atan2(this.api.npc.y - gh.y, this.api.npc.x - gh.x));
      // The walker sorts itself by y for the open world; in the ring it belongs just under the fighters.
      gh.walker.container.setDepth(9).setAlpha(a.down ? 0.3 : 0.62);
      gh.plate.setPosition(gh.x, gh.y - 60);
      const col = findElementDef(Coop.roster.get(a.slot)?.element ?? '')?.color ?? 0x9dd8ff;
      g.lineStyle(2, col, 0.5); g.strokeEllipse(gh.x, gh.y + 20, 44, 14);
      const k = a.mx > 0 ? Phaser.Math.Clamp(a.hp / a.mx, 0, 1) : 0;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(gh.x - 22, gh.y - 50, 44, 6, 3);
      g.fillStyle(a.down ? 0x8a8a8a : k > 0.35 ? 0x6ae08a : 0xe07040, 1); g.fillRoundedRect(gh.x - 21, gh.y - 49, 42 * k, 4, 2);
      if (a.down) downMark(g, gh.x, gh.y - 70, time, 0.5);
    }
    for (const [slot, gh] of this.ghosts) {
      if (live.has(slot)) continue;
      gh.walker.destroy(); gh.plate.destroy();
      this.ghosts.delete(slot);
    }
    if (this.downUntil > 0) {
      // Mine: a ring that fills as I get my breath back.
      const p = Phaser.Math.Clamp((time - this.downAt) / DOWN_MS, 0, 1);
      g.fillStyle(0x000000, 0.35); g.fillCircle(player.x, player.y, 46);
      g.lineStyle(5, 0x3a1414, 0.9); g.strokeCircle(player.x, player.y, 46);
      g.lineStyle(5, 0x9dffb0, 0.95);
      g.beginPath(); g.arc(player.x, player.y, 46, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); g.strokePath();
      downMark(g, player.x, player.y - 70, time, 1);
    }
  }
}

/** Down: a broken heart turning over the fighter. */
function downMark(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number, a: number): void {
  const b = Math.sin(time / 260) * 3;
  g.fillStyle(0xd83a3a, a);
  g.fillCircle(x - 6, y + b, 7); g.fillCircle(x + 6, y + b, 7);
  g.fillTriangle(x - 12.5, y + 3 + b, x + 12.5, y + 3 + b, x, y + 17 + b);
  g.lineStyle(2.5, 0x1a0606, a);
  g.beginPath(); g.moveTo(x + 1, y - 5 + b); g.lineTo(x - 3, y + 2 + b); g.lineTo(x + 3, y + 6 + b); g.lineTo(x - 1, y + 14 + b); g.strokePath();
}
