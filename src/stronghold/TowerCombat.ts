import Phaser from 'phaser';
import { Projectile } from '../combat/Projectile';
import { Sfx } from '../audio';
import { Rider, TowerAbilityDef, TowerSlot } from './StrongholdTypes';
import { Tower } from './Tower';
import { RoadHusk } from './RoadHusk';
import { headingAlong, nearestPathDist, pointAlong, PATH_LENGTH } from './StrongholdMap';

/** What the combat engine needs from the scene. */
export interface TowerCombatApi {
  readonly scene: Phaser.Scene;
  husks(): RoadHusk[];
  towers(): Tower[];
  readonly projectiles: Phaser.Physics.Arcade.Group;
  floatText(x: number, y: number, text: string, color: string, size?: number): void;
  addGold(amount: number, x: number, y: number): void;
}

/** A tower's shot. Carries everything the hit needs so the overlap handler stays dumb. */
export class TowerShot extends Projectile {
  tower!: Tower;
  rider?: Rider;
  pierce = 0;
  readonly hit = new Set<RoadHusk>();
  startX = 0;
  startY = 0;
  maxDist = 600;
  homing: RoadHusk | null = null;
  speed = 500;
  splash = 0;
  splashMult = 0.5;
  color = 0xffffff;
  /** Artillery: detonate when the shot reaches this point. */
  lob: { x: number; y: number } | null = null;
}

interface Zone { x: number; y: number; radius: number; until: number; dps: number; color: number; rider?: Rider; shape: string; accum: number; tower: Tower; born: number }
interface Beam { tower: Tower; target: RoadHusk; until: number; dps: number; color: number; width: number; rider?: Rider; accum: number }
interface Flash { kind: 'line' | 'ring' | 'poly'; pts: number[]; color: number; width: number; until: number; born: number; radius?: number }
interface Summon { x: number; y: number; until: number; attackMs: number; nextAt: number; range: number; damage: number; rider?: Rider; color: number; label: Phaser.GameObjects.Text; tower: Tower; born: number }
interface Barrier { pathDist: number; x: number; y: number; hp: number; maxHp: number; until: number; color: number; damage: number; label: Phaser.GameObjects.Text; tower: Tower }
interface Telegraph { x: number; y: number; radius: number; at: number; born: number; color: number; shape: string }

const STATUS_TEXT_GAP_MS = 1800;

/**
 * Turns a resolved tower ability into things on the field: projectiles into the shared group,
 * instant hits, zones, beams, summons, barriers and rallies. Also ticks every lingering object
 * and paints them, so the scene only has to call `update` and `draw`.
 */
export class TowerCombat {
  private zones: Zone[] = [];
  private beams: Beam[] = [];
  private flashes: Flash[] = [];
  private summons: Summon[] = [];
  private barriers: Barrier[] = [];
  private telegraphs: Telegraph[] = [];
  private pending: Array<{ at: number; fn: () => void }> = [];
  private gfx: Phaser.GameObjects.Graphics;
  private auraGfx: Phaser.GameObjects.Graphics;

  constructor(private api: TowerCombatApi) {
    this.gfx = api.scene.add.graphics().setDepth(7);
    this.auraGfx = api.scene.add.graphics().setDepth(1.8);
  }

  reset(): void {
    for (const s of this.summons) s.label.destroy();
    for (const b of this.barriers) b.label.destroy();
    this.zones = []; this.beams = []; this.flashes = []; this.summons = []; this.barriers = [];
    this.telegraphs = []; this.pending = [];
    this.gfx.clear(); this.auraGfx.clear();
  }

  destroy(): void {
    this.reset();
    this.gfx.destroy();
    this.auraGfx.destroy();
  }

  /** The barrier (if any) standing within `ahead` px in front of a husk. */
  barrierAhead(h: RoadHusk, ahead = 26): Barrier | null {
    for (const b of this.barriers) {
      const d = b.pathDist - h.pathDist;
      if (d > -6 && d <= ahead) return b;
    }
    return null;
  }

  /** A husk chewing on a barrier this frame. */
  chew(h: RoadHusk, b: Barrier, time: number, delta: number): void {
    b.hp -= (h.biteDamage * h.effectDamageMult) * (delta / 950);
    if (b.damage > 0) this.hitHusk(h, b.damage * (delta / 1000), undefined, b.tower, false);
    if (b.hp <= 0) { this.removeBarrier(b); this.ring(b.x, b.y, 40, b.color, 300); }
    void time;
  }

  // ── Casting ───────────────────────────────────────────────────────

  cast(tower: Tower, slot: TowerSlot | 'mastery', a: TowerAbilityDef, target: RoadHusk, time: number): void {
    const fx = a.fx;
    tower.lookAt(target.x, target.y);
    tower.gesture(slot);
    const range = tower.range * (a.range ?? 1);
    switch (fx.kind) {
      case 'bolt': {
        const count = fx.count ?? 1;
        const spread = fx.spread ?? 0;
        const lead = this.leadPoint(target, fx.speed, tower.x, tower.y);
        const base = Math.atan2(lead.y - tower.y, lead.x - tower.x);
        for (let i = 0; i < count; i++) {
          const off = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
          const ang = base + off;
          const shot = new TowerShot(this.api.scene, tower.x, tower.y, fx.texture ?? 'sh-orb', a.damage, true);
          shot.tower = tower; shot.rider = a.rider; shot.pierce = fx.pierce ?? 0; shot.speed = fx.speed;
          shot.splash = fx.splash ?? 0; shot.splashMult = fx.splashMult ?? 0.5; shot.color = fx.color;
          shot.maxDist = range * 1.35 + 60;
          if (!fx.texture) shot.setTint(fx.color);
          shot.setScale(fx.size ?? 1);
          shot.setRotation(ang);
          this.api.projectiles.add(shot);
          if (fx.lob) {
            // Artillery: appears high over the landing point and drops in.
            const land = this.spread(lead, off * 60);
            shot.setPosition(land.x, land.y - 230);
            shot.lob = land;
            shot.startX = land.x; shot.startY = land.y - 230; shot.maxDist = 260;
            shot.launch(0, fx.speed);
          } else {
            shot.startX = tower.x; shot.startY = tower.y;
            if (fx.homing) shot.homing = target;
            shot.launch(Math.cos(ang) * fx.speed, Math.sin(ang) * fx.speed);
          }
        }
        Sfx.playAt('projectile-impact', tower.x, { volume: 0.25, rate: 1.4 });
        break;
      }
      case 'splash': {
        const at = { x: target.x, y: target.y };
        const go = (): void => {
          this.aoe(at.x, at.y, fx.radius, a.damage, a.rider, tower);
          this.burst(at.x, at.y, fx.radius, fx.color, fx.shape ?? 'burst');
        };
        if (fx.delayMs && fx.delayMs > 0) {
          this.telegraphs.push({ x: at.x, y: at.y, radius: fx.radius, at: time + fx.delayMs, born: time, color: fx.color, shape: fx.shape ?? 'burst' });
          this.pending.push({ at: time + fx.delayMs, fn: go });
        } else go();
        break;
      }
      case 'line': {
        const ang = Math.atan2(target.y - tower.y, target.x - tower.x);
        const x2 = tower.x + Math.cos(ang) * fx.length, y2 = tower.y + Math.sin(ang) * fx.length;
        for (const h of this.api.husks()) {
          if (this.segDist(h.x, h.y, tower.x, tower.y, x2, y2) <= fx.width / 2 + 20 * h.sizeMult) {
            this.hitHusk(h, a.damage, a.rider, tower);
          }
        }
        this.flashes.push({ kind: 'line', pts: [tower.x, tower.y, x2, y2], color: fx.color, width: fx.width, until: time + 260, born: time });
        Sfx.playAt('whoosh', tower.x, { volume: 0.5 });
        break;
      }
      case 'zone': {
        this.zones.push({ x: target.x, y: target.y, radius: fx.radius, until: time + fx.ms, dps: a.damage, color: fx.color, rider: a.rider, shape: fx.shape ?? 'puddle', accum: 0, tower, born: time });
        break;
      }
      case 'aura': {
        const r = fx.radius * (a.range ?? 1);
        let any = false;
        for (const h of this.api.husks()) {
          if (Math.hypot(h.x - tower.x, h.y - tower.y) <= r + 20 * h.sizeMult) {
            this.hitHusk(h, a.damage * (a.cooldown / 1000), a.rider, tower, false);
            any = true;
          }
        }
        if (any) this.flashes.push({ kind: 'ring', pts: [tower.x, tower.y], radius: r, color: fx.color, width: 2, until: time + a.cooldown, born: time });
        break;
      }
      case 'beam': {
        this.beams.push({ tower, target, until: time + fx.ms, dps: a.damage, color: fx.color, width: fx.width, rider: a.rider, accum: 0 });
        Sfx.playAt('beam-fire', tower.x, { volume: 0.35 });
        break;
      }
      case 'chain': {
        const visited = new Set<RoadHusk>();
        let cur: RoadHusk | null = target;
        const pts: number[] = [tower.x, tower.y];
        let dmg = a.damage;
        for (let i = 0; i <= fx.jumps && cur; i++) {
          visited.add(cur);
          pts.push(cur.x, cur.y);
          this.hitHusk(cur, dmg, a.rider, tower);
          dmg *= fx.falloff ?? 0.85;
          let next: RoadHusk | null = null, best = fx.jumpRange;
          for (const h of this.api.husks()) {
            if (visited.has(h)) continue;
            const d = Math.hypot(h.x - cur.x, h.y - cur.y);
            if (d < best) { best = d; next = h; }
          }
          cur = next;
        }
        this.flashes.push({ kind: 'poly', pts, color: fx.color, width: 3, until: time + 220, born: time });
        Sfx.playAt('zap', tower.x, { volume: 0.4 });
        break;
      }
      case 'nova': {
        this.aoe(tower.x, tower.y, fx.radius, a.damage, a.rider, tower);
        this.burst(tower.x, tower.y, fx.radius, fx.color, 'ring');
        break;
      }
      case 'rally': {
        const self = fx.radius <= 1;
        for (const t of this.api.towers()) {
          if (!self && Math.hypot(t.x - tower.x, t.y - tower.y) > fx.radius) continue;
          if (self && t !== tower) continue;
          t.addBuff({ until: time + fx.ms, fireRateMult: fx.fireRateMult ?? 1, damageMult: fx.damageMult ?? 1 });
          this.flashes.push({ kind: 'ring', pts: [t.x, t.y], radius: 34, color: fx.color, width: 3, until: time + 600, born: time });
        }
        if (!self) this.flashes.push({ kind: 'ring', pts: [tower.x, tower.y], radius: fx.radius, color: fx.color, width: 2, until: time + 500, born: time });
        this.api.floatText(tower.x, tower.y - 44, '⬆ RALLY', '#' + fx.color.toString(16).padStart(6, '0'), 12);
        Sfx.playAt('status-buff', tower.x, { volume: 0.5 });
        break;
      }
      case 'summon': {
        const pd = Math.min(PATH_LENGTH - 30, nearestPathDist(target.x, target.y) + 30);
        const p = pointAlong(pd);
        const label = this.api.scene.add.text(p.x, p.y - 2, fx.label, { fontSize: '22px' }).setOrigin(0.5).setDepth(6);
        this.summons.push({ x: p.x, y: p.y, until: time + fx.ms, attackMs: fx.attackMs, nextAt: time + 300, range: fx.attackRange, damage: a.damage, rider: a.rider, color: fx.color, label, tower, born: time });
        this.ring(p.x, p.y, 30, fx.color, 400);
        break;
      }
      case 'barrier': {
        // Stand it a little ahead of the lead husk so the pack walks into it.
        const pd = Math.min(PATH_LENGTH - 40, Math.max(40, target.pathDist + 48));
        const p = pointAlong(pd);
        const label = this.api.scene.add.text(p.x, p.y - 30, fx.label, { fontSize: '18px' }).setOrigin(0.5).setDepth(6.5);
        this.barriers.push({ pathDist: pd, x: p.x, y: p.y, hp: fx.hp, maxHp: fx.hp, until: time + fx.ms, color: fx.color, damage: a.damage, label, tower });
        this.barriers.sort((x, y) => x.pathDist - y.pathDist);
        Sfx.playAt('shield-up', p.x, { volume: 0.5 });
        break;
      }
      case 'execute': {
        if (target.hp <= target.maxHp * fx.thresholdFrac) {
          this.api.floatText(target.x, target.y - 34, '☠ EXECUTED', '#ffffff', 13);
          this.hitHusk(target, target.hp + target.shieldHp + 999, undefined, tower, true, true);
        } else {
          this.hitHusk(target, a.damage, a.rider, tower);
        }
        this.flashes.push({ kind: 'line', pts: [tower.x, tower.y, target.x, target.y], color: fx.color, width: 3, until: time + 200, born: time });
        Sfx.playAt('judgement', tower.x, { volume: 0.5 });
        break;
      }
      case 'gold': {
        this.api.addGold(fx.amount, tower.x, tower.y - 40);
        this.flashes.push({ kind: 'ring', pts: [tower.x, tower.y], radius: 28, color: fx.color, width: 2, until: time + 400, born: time });
        break;
      }
    }
  }

  // ── Hits ──────────────────────────────────────────────────────────

  /**
   * The one place tower damage reaches a husk. `pop` controls the damage number (DOT ticks
   * and auras pass false so the field is not wallpapered in sixes).
   */
  hitHusk(h: RoadHusk, amount: number, rider: Rider | undefined, tower: Tower | null, pop = true, pierce = false): void {
    if (!h.active || h.hp <= 0) return;
    const time = this.api.scene.time.now;
    let dmg = amount;
    if (h.weakenUntil > time) dmg *= h.weakenMult;
    const before = h.hp + h.shieldHp;
    if (dmg > 0) {
      const rounded = pop ? Math.max(1, Math.round(dmg)) : dmg;
      h.lastDamageOwner = 'player';
      h.takeDamage(rounded, pierce ? { pierce: true } : undefined);
      const dealt = Math.max(0, before - (h.hp + h.shieldHp));
      if (tower) tower.damageDealt += dealt;
      if (pop && dealt > 0) this.api.floatText(h.x + (Math.random() - 0.5) * 14, h.y - 30, `${Math.round(dealt)}`, '#ffffff', 13);
    }
    if (rider && h.active && h.hp > 0) this.applyRider(h, rider, time);
    if (tower && h.hp <= 0) tower.kills++;
  }

  private aoe(x: number, y: number, radius: number, damage: number, rider: Rider | undefined, tower: Tower): void {
    for (const h of this.api.husks()) {
      if (Math.hypot(h.x - x, h.y - y) <= radius + 20 * h.sizeMult) this.hitHusk(h, damage, rider, tower);
    }
    Sfx.playAt(radius >= 140 ? 'explosion-large' : radius >= 80 ? 'explosion-medium' : 'explosion-small', x, { volume: 0.5 });
  }

  applyRider(h: RoadHusk, r: Rider, time: number): void {
    if (r.chance !== undefined && Math.random() >= r.chance) return;
    const pop = (key: string, text: string, color: string): void => {
      const last = h.lastStatusText.get(key) ?? -Infinity;
      if (time - last < STATUS_TEXT_GAP_MS) return;
      h.lastStatusText.set(key, time);
      this.api.floatText(h.x, h.y - 44, text, color, 12);
    };
    if (r.burn) { h.burningUntil = Math.max(h.burningUntil, time + r.burn); pop('burn', '🔥 BURNING', '#ff8844'); }
    if (r.toxic) {
      h.toxicUntil = Math.max(h.toxicUntil, time + r.toxic.ms);
      h.toxicDps = Math.max(h.toxicUntil > time ? h.toxicDps : 0, r.toxic.dps);
      pop('toxic', '☠️ POISONED', '#88ff44');
    }
    if (r.frost) {
      h.frostStacks = Math.min(8, h.frostStacks + r.frost);
      pop('frost', `❄️ FROST ×${h.frostStacks}`, '#aaddff');
    }
    if (r.freeze) { h.frozenUntil = Math.max(h.frozenUntil, time + r.freeze); pop('freeze', '🧊 FROZEN', '#ccf0ff'); }
    if (r.stun) { h.stunnedUntil = Math.max(h.stunnedUntil, time + r.stun); pop('stun', '💫 STUNNED', '#ffee88'); }
    if (r.slow) {
      if (r.slow.mult <= h.slowMult || h.slowUntil <= time) h.slowMult = r.slow.mult;
      h.slowUntil = Math.max(h.slowUntil, time + r.slow.ms);
      pop('slow', '🐌 SLOWED', '#88ccff');
    }
    if (r.expose) { h.exposedUntil = Math.max(h.exposedUntil, time + r.expose); pop('expose', '☀️ EXPOSED', '#ffee66'); }
    if (r.weaken) {
      if (r.weaken.mult >= h.weakenMult || h.weakenUntil <= time) h.weakenMult = r.weaken.mult;
      h.weakenUntil = Math.max(h.weakenUntil, time + r.weaken.ms);
      pop('weaken', '💔 WEAKENED', '#ff88aa');
    }
    if (r.bleed) { h.bleedUntil = Math.max(h.bleedUntil, time + r.bleed); pop('bleed', '🩸 BLEEDING', '#ff4455'); }
    if (r.knockback) {
      h.pathDist = Math.max(0, h.pathDist - r.knockback);
      h.place();
      pop('kb', '↩ SHOVED', '#ffffff');
    }
  }

  /** The projectile-vs-husk overlap handler. */
  onShotHit(shot: TowerShot, h: RoadHusk): void {
    if (!shot.active || shot.hit.has(h) || !h.active || h.hp <= 0) return;
    if (shot.lob) return; // artillery only lands where it is going
    shot.hit.add(h);
    this.hitHusk(h, shot.damage, shot.rider, shot.tower);
    this.spark(h.x, h.y, shot.color);
    if (shot.splash > 0) {
      for (const o of this.api.husks()) {
        if (o === h || shot.hit.has(o)) continue;
        if (Math.hypot(o.x - h.x, o.y - h.y) <= shot.splash + 20 * o.sizeMult) {
          shot.hit.add(o);
          this.hitHusk(o, shot.damage * shot.splashMult, shot.rider, shot.tower);
        }
      }
      this.burst(h.x, h.y, shot.splash, shot.color, 'burst');
    }
    if (shot.pierce > 0) { shot.pierce--; return; }
    this.killShot(shot);
  }

  private killShot(shot: TowerShot): void {
    shot.setActive(false).setVisible(false);
    (shot.body as Phaser.Physics.Arcade.Body | null)?.stop();
    shot.destroy();
  }

  // ── Per frame ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const husks = this.api.husks();

    // Shots: range limit, homing, artillery landing.
    const children = this.api.projectiles.getChildren().slice() as TowerShot[];
    for (const s of children) {
      if (!s.active) continue;
      const body = s.body as Phaser.Physics.Arcade.Body;
      if (s.lob) {
        if (s.y >= s.lob.y) {
          this.aoe(s.lob.x, s.lob.y, Math.max(26, s.splash), s.damage, s.rider, s.tower);
          this.burst(s.lob.x, s.lob.y, Math.max(26, s.splash), s.color, 'crater');
          this.killShot(s);
        }
        continue;
      }
      if (s.homing) {
        const t = s.homing;
        if (t.active && t.hp > 0) {
          const want = Math.atan2(t.y - s.y, t.x - s.x);
          const cur = Math.atan2(body.velocity.y, body.velocity.x);
          const ang = Phaser.Math.Angle.RotateTo(cur, want, 4.2 * (delta / 1000));
          body.setVelocity(Math.cos(ang) * s.speed, Math.sin(ang) * s.speed);
          s.setRotation(ang);
        } else {
          s.homing = null;
        }
      }
      if (Math.hypot(s.x - s.startX, s.y - s.startY) > s.maxDist || s.x < -60 || s.x > 1020 || s.y < -60 || s.y > 700) {
        this.killShot(s);
      }
    }

    // Deferred blasts.
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= time);
      this.pending = this.pending.filter((p) => p.at > time);
      for (const p of due) p.fn();
      this.telegraphs = this.telegraphs.filter((t) => t.at > time);
    }

    // Zones tick four times a second.
    for (const z of this.zones) {
      z.accum += delta;
      while (z.accum >= 250) {
        z.accum -= 250;
        for (const h of husks) {
          if (Math.hypot(h.x - z.x, h.y - z.y) <= z.radius + 16 * h.sizeMult) {
            this.hitHusk(h, z.dps * 0.25, z.rider, z.tower, false);
          }
        }
      }
    }
    this.zones = this.zones.filter((z) => z.until > time);

    // Beams: ten ticks a second while the target lives and stays in reach.
    for (const b of this.beams) {
      const t = b.target;
      if (!t.active || t.hp <= 0 || Math.hypot(t.x - b.tower.x, t.y - b.tower.y) > b.tower.range * 1.4) { b.until = 0; continue; }
      b.tower.lookAt(t.x, t.y);
      b.accum += delta;
      while (b.accum >= 100) {
        b.accum -= 100;
        this.hitHusk(t, b.dps * 0.1, b.rider, b.tower, false);
      }
    }
    this.beams = this.beams.filter((b) => b.until > time);

    // Summons strike whatever walks past.
    for (const s of this.summons) {
      if (time < s.nextAt) continue;
      let best: RoadHusk | null = null, bestD = s.range;
      for (const h of husks) {
        const d = Math.hypot(h.x - s.x, h.y - s.y);
        if (d <= bestD) { bestD = d; best = h; }
      }
      if (best) {
        s.nextAt = time + s.attackMs;
        this.hitHusk(best, s.damage, s.rider, s.tower);
        this.flashes.push({ kind: 'line', pts: [s.x, s.y - 6, best.x, best.y], color: s.color, width: 2, until: time + 140, born: time });
        this.api.scene.tweens.add({ targets: s.label, scale: { from: 1.3, to: 1 }, duration: 160 });
      }
    }
    for (const s of this.summons) if (s.until <= time) { s.label.destroy(); this.ring(s.x, s.y, 24, s.color, 300); }
    this.summons = this.summons.filter((s) => s.until > time);

    for (const b of this.barriers) if (b.until <= time) this.removeBarrier(b);
    this.barriers = this.barriers.filter((b) => b.until > time && b.hp > 0);

    this.flashes = this.flashes.filter((f) => f.until > time);

    // Bleed is a Stronghold status, so it ticks here rather than in the husk.
    for (const h of husks) {
      if (h.bleedUntil > time) {
        h.bleedAccum += delta;
        while (h.bleedAccum >= 500 && h.hp > 0) {
          h.bleedAccum -= 500;
          this.hitHusk(h, Math.max(1, h.maxHp * 0.01), undefined, null, false, true);
        }
      } else h.bleedAccum = 0;
    }
  }

  private removeBarrier(b: Barrier): void {
    b.label.destroy();
    b.until = 0; b.hp = 0;
  }

  /** Paint every lingering object. Called once per frame after `update`. */
  draw(time: number): void {
    const g = this.gfx;
    g.clear();
    const ag = this.auraGfx;
    ag.clear();

    for (const z of this.zones) {
      const life = (z.until - time) / Math.max(1, z.until - z.born);
      const pulse = 0.85 + Math.sin((time - z.born) / 180) * 0.08;
      const r = z.radius * pulse;
      const a = 0.18 + 0.1 * Math.min(1, life * 3);
      ag.fillStyle(z.color, a);
      if (z.shape === 'puddle') ag.fillEllipse(z.x, z.y, r * 2, r * 1.5);
      else ag.fillCircle(z.x, z.y, r);
      ag.lineStyle(z.shape === 'rune' ? 2 : 1.5, z.color, 0.45 + 0.2 * life);
      if (z.shape === 'puddle') ag.strokeEllipse(z.x, z.y, r * 2, r * 1.5);
      else ag.strokeCircle(z.x, z.y, r);
      if (z.shape === 'rune') {
        ag.lineStyle(1, z.color, 0.5);
        const rot = (time - z.born) / 900;
        for (let i = 0; i < 6; i++) {
          const a1 = rot + i * Math.PI / 3, a2 = a1 + Math.PI / 3 * 2;
          ag.lineBetween(z.x + Math.cos(a1) * r * 0.8, z.y + Math.sin(a1) * r * 0.8, z.x + Math.cos(a2) * r * 0.8, z.y + Math.sin(a2) * r * 0.8);
        }
      } else if (z.shape === 'fire') {
        for (let i = 0; i < 5; i++) {
          const a1 = (time / 300 + i * 1.3) % (Math.PI * 2);
          const fx = z.x + Math.cos(a1) * r * 0.5, fy = z.y + Math.sin(a1) * r * 0.4;
          ag.fillStyle(0xffee88, 0.5); ag.fillTriangle(fx - 5, fy + 4, fx + 5, fy + 4, fx, fy - 9 - Math.sin(time / 90 + i) * 3);
        }
      } else if (z.shape === 'ice') {
        ag.lineStyle(1.5, 0xffffff, 0.35);
        for (let i = 0; i < 3; i++) { const a1 = i * 1.05; ag.lineBetween(z.x - Math.cos(a1) * r * 0.7, z.y - Math.sin(a1) * r * 0.5, z.x + Math.cos(a1) * r * 0.7, z.y + Math.sin(a1) * r * 0.5); }
      }
    }

    for (const t of this.telegraphs) {
      const p = Phaser.Math.Clamp((time - t.born) / Math.max(1, t.at - t.born), 0, 1);
      ag.lineStyle(2, t.color, 0.35 + p * 0.5);
      ag.strokeCircle(t.x, t.y, t.radius);
      ag.fillStyle(t.color, 0.08 + p * 0.18);
      ag.fillCircle(t.x, t.y, t.radius * p);
      if (t.shape === 'strike') { ag.lineStyle(1, t.color, 0.6); ag.lineBetween(t.x, t.y - t.radius - 30 * (1 - p), t.x, t.y); }
    }

    for (const b of this.beams) {
      const t = b.target;
      const jitter = Math.sin(time / 40) * 1.5;
      g.lineStyle(b.width + 4, b.color, 0.18);
      g.lineBetween(b.tower.x, b.tower.y - 8, t.x, t.y + jitter);
      g.lineStyle(b.width, b.color, 0.85);
      g.lineBetween(b.tower.x, b.tower.y - 8, t.x, t.y + jitter);
      g.lineStyle(Math.max(1, b.width * 0.35), 0xffffff, 0.8);
      g.lineBetween(b.tower.x, b.tower.y - 8, t.x, t.y + jitter);
      g.fillStyle(b.color, 0.6); g.fillCircle(t.x, t.y + jitter, b.width * 0.9 + 2);
    }

    for (const s of this.summons) {
      const life = (s.until - time) / Math.max(1, s.until - s.born);
      g.fillStyle(s.color, 0.22); g.fillEllipse(s.x, s.y + 10, 40, 16);
      g.lineStyle(2, s.color, 0.7); g.strokeEllipse(s.x, s.y + 10, 40, 16);
      // Remaining-time arc.
      g.lineStyle(2, 0xffffff, 0.5);
      g.beginPath(); g.arc(s.x, s.y + 10, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life, false); g.strokePath();
    }

    for (const b of this.barriers) {
      const h = headingAlong(b.pathDist);
      const hw = 34;
      const x1 = b.x - h.y * hw, y1 = b.y + h.x * hw, x2 = b.x + h.y * hw, y2 = b.y - h.x * hw;
      g.lineStyle(14, 0x000000, 0.35); g.lineBetween(x1, y1 + 4, x2, y2 + 4);
      g.lineStyle(12, b.color, 0.9); g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(4, 0xffffff, 0.35); g.lineBetween(x1, y1 - 3, x2, y2 - 3);
      // HP bar above.
      const ratio = Phaser.Math.Clamp(b.hp / b.maxHp, 0, 1);
      g.fillStyle(0x000000, 0.7); g.fillRect(b.x - 24, b.y - 44, 48, 5);
      g.fillStyle(b.color, 1); g.fillRect(b.x - 24, b.y - 44, 48 * ratio, 5);
    }

    for (const f of this.flashes) {
      const life = (f.until - time) / Math.max(1, f.until - f.born);
      if (f.kind === 'line') {
        g.lineStyle(f.width + 6, f.color, 0.18 * life);
        g.lineBetween(f.pts[0], f.pts[1], f.pts[2], f.pts[3]);
        g.lineStyle(f.width, f.color, 0.85 * life);
        g.lineBetween(f.pts[0], f.pts[1], f.pts[2], f.pts[3]);
        g.lineStyle(Math.max(1, f.width * 0.3), 0xffffff, 0.8 * life);
        g.lineBetween(f.pts[0], f.pts[1], f.pts[2], f.pts[3]);
      } else if (f.kind === 'ring') {
        const r = (f.radius ?? 30) * (1.1 - 0.1 * life);
        g.lineStyle(f.width, f.color, 0.6 * life);
        g.strokeCircle(f.pts[0], f.pts[1], r);
        g.fillStyle(f.color, 0.06 * life);
        g.fillCircle(f.pts[0], f.pts[1], r);
      } else {
        g.lineStyle(f.width + 4, f.color, 0.25 * life);
        g.beginPath(); g.moveTo(f.pts[0], f.pts[1]);
        for (let i = 2; i < f.pts.length; i += 2) {
          const mx = (f.pts[i - 2] + f.pts[i]) / 2 + (Math.random() - 0.5) * 12;
          const my = (f.pts[i - 1] + f.pts[i + 1]) / 2 + (Math.random() - 0.5) * 12;
          g.lineTo(mx, my); g.lineTo(f.pts[i], f.pts[i + 1]);
        }
        g.strokePath();
        g.lineStyle(f.width, 0xffffff, 0.8 * life);
        g.beginPath(); g.moveTo(f.pts[0], f.pts[1]);
        for (let i = 2; i < f.pts.length; i += 2) g.lineTo(f.pts[i], f.pts[i + 1]);
        g.strokePath();
      }
    }
  }

  // ── Small effects ─────────────────────────────────────────────────

  /** An expanding, fading blast. Its own Graphics so a tween can own the lifetime. */
  burst(x: number, y: number, radius: number, color: number, shape: string): void {
    const scene = this.api.scene;
    const g = scene.add.graphics().setDepth(7.5);
    const draw = (p: number): void => {
      g.clear();
      const r = radius * (0.4 + 0.6 * p);
      if (shape === 'ring') {
        g.lineStyle(6 * (1 - p) + 1, color, 1 - p); g.strokeCircle(x, y, r);
      } else if (shape === 'crater') {
        g.fillStyle(0x221108, 0.5 * (1 - p)); g.fillEllipse(x, y + 4, radius * 2, radius * 1.3);
        g.fillStyle(color, 0.7 * (1 - p)); g.fillCircle(x, y, r * 0.8);
        g.fillStyle(0xffffff, 0.6 * (1 - p)); g.fillCircle(x, y, r * 0.3);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.fillStyle(color, 0.8 * (1 - p)); g.fillCircle(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, 4 * (1 - p) + 1); }
      } else if (shape === 'strike') {
        g.fillStyle(0xffffff, 0.8 * (1 - p)); g.fillRect(x - 6 * (1 - p), 0, 12 * (1 - p), y);
        g.fillStyle(color, 0.6 * (1 - p)); g.fillCircle(x, y, r);
        g.lineStyle(3, 0xffffff, 1 - p); g.strokeCircle(x, y, r * 1.1);
      } else {
        g.fillStyle(color, 0.55 * (1 - p)); g.fillCircle(x, y, r);
        g.fillStyle(0xffffff, 0.5 * (1 - p)); g.fillCircle(x, y, r * 0.45);
        g.lineStyle(2, color, 1 - p); g.strokeCircle(x, y, r * 1.15);
      }
    };
    draw(0);
    scene.tweens.addCounter({ from: 0, to: 1, duration: shape === 'crater' ? 520 : 380, ease: 'Cubic.easeOut', onUpdate: (tw) => draw(tw.getValue() ?? 0), onComplete: () => g.destroy() });
  }

  ring(x: number, y: number, r: number, color: number, ms: number): void {
    const time = this.api.scene.time.now;
    this.flashes.push({ kind: 'ring', pts: [x, y], radius: r, color, width: 2, until: time + ms, born: time });
  }

  private spark(x: number, y: number, color: number): void {
    const scene = this.api.scene;
    const g = scene.add.graphics().setDepth(7.5);
    g.fillStyle(color, 0.9); g.fillCircle(x, y, 7);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y, 3);
    scene.tweens.add({ targets: g, alpha: 0, scale: 1.6, duration: 160, onComplete: () => g.destroy() });
  }

  // ── Geometry ──────────────────────────────────────────────────────

  /** Where to aim so a shot at `speed` meets the husk where it will be. */
  private leadPoint(h: RoadHusk, speed: number, fromX: number, fromY: number): { x: number; y: number } {
    const dist = Math.hypot(h.x - fromX, h.y - fromY);
    const t = dist / Math.max(60, speed);
    const time = this.api.scene.time.now;
    const v = h.roadSpeed * h.modeSpeedMult(time) * (h.frozenUntil > time ? 0 : 1) * (h.frostStacks > 0 ? Math.max(0.2, 1 - h.frostStacks * 0.1) : 1);
    const ahead = pointAlong(h.pathDist + v * t * 0.9);
    const hd = headingAlong(h.pathDist);
    return { x: ahead.x - hd.y * h.lateral, y: ahead.y + hd.x * h.lateral };
  }

  private spread(p: { x: number; y: number }, off: number): { x: number; y: number } {
    return { x: p.x + off + (Math.random() - 0.5) * 20, y: p.y + (Math.random() - 0.5) * 20 };
  }

  private segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }
}
