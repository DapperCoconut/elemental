import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';

// ── Metal type definitions ─────────────────────────────────────────────────

export interface MetalBloodPuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
  drainAccum: number;
  draining: boolean;
}

export interface MetalGunProjectile {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  type: 'grenade' | 'rpg' | 'taser' | 'flame';
  damage: number;
  explodeRadius?: number;
  active: boolean;
  expiresAt?: number;
}

export interface MetalChainProjectile {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  active: boolean;
}

// ── MetalArenaApi ──────────────────────────────────────────────────────────

export interface MetalArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly elementId: string;
  hasUpgrade(slot: string): boolean;
  hasPerk(perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  getNearestEnemy(x: number, y: number): Fighter;
  dealAoeDamage(cx: number, cy: number, radius: number, damage: number, owner: 'player' | 'npc'): void;
}

// ── MetalKit ───────────────────────────────────────────────────────────────

export const BASE_GUNS = ['flintlock', 'rifle', 'grenade-launcher', 'flamethrower', 'shotgun', 'rpg', 'taser', 'minigun'];
export const GUN_NAMES: Record<string, string> = {
  'flintlock': 'Flintlock', 'rifle': 'Rifle', 'grenade-launcher': 'Grenade Launcher',
  'flamethrower': 'Flamethrower', 'shotgun': 'Shotgun', 'rpg': 'RPG',
  'taser': 'Taser', 'minigun': 'Minigun', 'sniper': 'Sniper',
};
export const GUN_EMOJIS: Record<string, string> = {
  'flintlock': '🔫', 'rifle': '🎯', 'grenade-launcher': '💣',
  'flamethrower': '🔥', 'shotgun': '🔱', 'rpg': '🚀',
  'taser': '⚡', 'minigun': '🌀', 'sniper': '🎖️',
};
export const GUN_DESCS: Record<string, string> = {
  'flintlock':        'Hitscan — spawns blood puddle on hit (20 dmg)',
  'rifle':            '3 quick hitscan shots (8 dmg each)',
  'grenade-launcher': 'Arcing grenade — 35 dmg + AoE',
  'flamethrower':     '7 flame bursts in cone — 8 dmg each',
  'shotgun':          '5 shots in spread — 10 dmg each',
  'rpg':              'Fast rocket — 50 dmg + large AoE',
  'taser':            'Stuns enemy 2s — 15 dmg',
  'minigun':          '30 bullets wide cone — 1 dmg each',
  'sniper':           'Charges 0.7s then fires a powerful hitscan (55 dmg)',
};

export class MetalKit {
  // ── Player state ─────────────────────────────────────────────────────
  private metalArsenal: string[] = [];
  private metalBloodPuddles: MetalBloodPuddle[] = [];
  private metalChainTethered = false;
  private metalChainTetherEnd = 0;
  private metalChainGraphic: Phaser.GameObjects.Graphics | null = null;
  private metalArmorActive = false;
  private metalArmorHp = 0;
  private metalArmorEnd = 0;
  private metalArmorAura: Phaser.GameObjects.Arc | null = null;
  private metalArsenalHUD: Phaser.GameObjects.Text | null = null;
  private metalReinforcementMenuOpen = false;
  private metalReinforcementButtons: Phaser.GameObjects.GameObject[] = [];
  private metalChainProjectiles: MetalChainProjectile[] = [];
  private metalGunProjectiles: MetalGunProjectile[] = [];
  private playerMetalTaseredUntil = 0;
  private metalArmorReflecting = false;
  private metalBloodChainPuddle: MetalBloodPuddle | null = null;
  private metalBloodChainAccum = 0;
  private metalBloodChainGraphic: Phaser.GameObjects.Graphics | null = null;
  private playerAggressiveBleeding = false;
  private playerAggressiveBleedUntil = 0;
  private playerAggressiveBleedAura: Phaser.GameObjects.Arc | null = null;
  private playerAggressiveBleedTickAccum = 0;
  private playerAggressiveBleedPuddleAccum = 0;

  // ── Gunpowder perk state ──────────────────────────────────────────────
  private gunpowderClipActive = false;
  private gunpowderClipX = 0;
  private gunpowderClipY = 0;
  private gunpowderClipVx = 0;
  private gunpowderClipVy = 0;
  private gunpowderClipTargetX = 0;
  private gunpowderClipTargetY = 0;
  private gunpowderClipSpawnedAt = 0;
  private gunpowderClipSprite: Phaser.GameObjects.Rectangle | null = null;
  private gunpowderDischargeCooldownUntil = 0;
  private gunpowderFireAtWillCooldownUntil = 0;

  // ── NPC state ─────────────────────────────────────────────────────────
  private npcMetalArsenal: string[] = [];
  private npcMetalChainTethered = false;
  private npcMetalChainTetherEnd = 0;
  private npcMetalChainGraphic: Phaser.GameObjects.Graphics | null = null;
  private npcMetalArmorActive = false;
  private npcMetalArmorHp = 0;
  private npcMetalArmorEnd = 0;
  private npcMetalArmorAura: Phaser.GameObjects.Arc | null = null;
  private npcMetalTaseredUntil = 0;
  private npcMetalArmorReflecting = false;
  private npcAggressiveBleeding = false;
  private npcAggressiveBleedUntil = 0;
  private npcAggressiveBleedAura: Phaser.GameObjects.Arc | null = null;
  private npcAggressiveBleedTickAccum = 0;
  private npcAggressiveBleedPuddleAccum = 0;

  constructor(private arena: MetalArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  getNpcMetalArsenal(): string[] { return this.npcMetalArsenal; }
  getPlayerMetalTaseredUntil(): number { return this.playerMetalTaseredUntil; }
  getNpcMetalTaseredUntil(): number { return this.npcMetalTaseredUntil; }
  getNpcMetalChainTetherEnd(): number { return this.npcMetalChainTetherEnd; }
  setNpcMetalChainTetherEnd(v: number): void { this.npcMetalChainTetherEnd = v; }
  getNpcMetalArmorEnd(): number { return this.npcMetalArmorEnd; }
  setNpcMetalArmorEnd(v: number): void { this.npcMetalArmorEnd = v; }
  getNpcAggressiveBleedUntil(): number { return this.npcAggressiveBleedUntil; }
  setNpcAggressiveBleedUntil(v: number): void { this.npcAggressiveBleedUntil = v; }

  isReinforcementMenuOpen(): boolean { return this.metalReinforcementMenuOpen; }
  isArmorActive(): boolean { return this.metalArmorActive; }

  initHud(): void {
    const { scene } = this.arena;
    const W = scene.scale.width;
    const H = scene.scale.height;
    if (this.metalArsenalHUD) { this.metalArsenalHUD.destroy(); this.metalArsenalHUD = null; }
    this.metalArsenalHUD = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add.text(W / 2, H - 68, '[ No Weapons ]', {
      fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#aabbcc',
      stroke: '#223344', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
  }

  reset(): void {
    this.metalArsenal = [];
    this.npcMetalArsenal = [];

    this.npcAggressiveBleeding = false; this.npcAggressiveBleedUntil = 0;
    if (this.npcAggressiveBleedAura) { this.npcAggressiveBleedAura.destroy(); this.npcAggressiveBleedAura = null; }
    this.npcAggressiveBleedTickAccum = 0; this.npcAggressiveBleedPuddleAccum = 0;
    this.playerAggressiveBleeding = false; this.playerAggressiveBleedUntil = 0;
    if (this.playerAggressiveBleedAura) { this.playerAggressiveBleedAura.destroy(); this.playerAggressiveBleedAura = null; }
    this.playerAggressiveBleedTickAccum = 0; this.playerAggressiveBleedPuddleAccum = 0;

    for (const p of this.metalBloodPuddles) p.sprite.destroy();
    this.metalBloodPuddles = [];

    this.metalChainTethered = false; this.metalChainTetherEnd = 0;
    if (this.metalChainGraphic) { this.metalChainGraphic.destroy(); this.metalChainGraphic = null; }
    this.npcMetalChainTethered = false; this.npcMetalChainTetherEnd = 0;
    if (this.npcMetalChainGraphic) { this.npcMetalChainGraphic.destroy(); this.npcMetalChainGraphic = null; }

    this.metalArmorActive = false; this.metalArmorHp = 0; this.metalArmorEnd = 0;
    if (this.metalArmorAura) { this.metalArmorAura.destroy(); this.metalArmorAura = null; }
    this.npcMetalArmorActive = false; this.npcMetalArmorHp = 0; this.npcMetalArmorEnd = 0;
    if (this.npcMetalArmorAura) { this.npcMetalArmorAura.destroy(); this.npcMetalArmorAura = null; }

    for (const btn of this.metalReinforcementButtons) (btn as unknown as { destroy(): void }).destroy();
    this.metalReinforcementButtons = []; this.metalReinforcementMenuOpen = false;

    for (const p of this.metalChainProjectiles) p.sprite.destroy();
    this.metalChainProjectiles = [];
    for (const p of this.metalGunProjectiles) p.sprite.destroy();
    this.metalGunProjectiles = [];

    this.npcMetalTaseredUntil = 0; this.playerMetalTaseredUntil = 0;
    this.metalArmorReflecting = false; this.npcMetalArmorReflecting = false;
    this.metalBloodChainPuddle = null; this.metalBloodChainAccum = 0;
    if (this.metalBloodChainGraphic) { this.metalBloodChainGraphic.destroy(); this.metalBloodChainGraphic = null; }
    if (this.metalArsenalHUD) { this.metalArsenalHUD.destroy(); this.metalArsenalHUD = null; }

    // Gunpowder perk
    if (this.gunpowderClipSprite) { this.gunpowderClipSprite.destroy(); this.gunpowderClipSprite = null; }
    this.gunpowderClipActive = false;
    this.gunpowderDischargeCooldownUntil = 0;
    this.gunpowderFireAtWillCooldownUntil = 0;
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.playerMetalTaseredUntil > time) return; // stunned

    const { player, eKey, fKey, rKey, qKey, pointerWasDown } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    const scene = this.arena.scene as Phaser.Scene & { time: Phaser.Time.Clock };

    // Click: Slash — or with Gunpowder perk: Fire at Will (reduced cooldown)
    if (pointer.isDown && !pointerWasDown) {
      if (this.arena.hasPerk('gunpowder')) {
        if (scene.time.now >= this.gunpowderFireAtWillCooldownUntil) {
          this.gunpowderFireAtWillCooldownUntil = scene.time.now + 1667;
          this.doMetalFireAtWill('player');
        }
      } else {
        player.castAbility('metal-slash', playerCtx);
      }
    }

    // E: Fire at Will — or with Gunpowder perk: Discharge (launch clip)
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.arena.hasPerk('gunpowder')) {
        if (scene.time.now >= this.gunpowderDischargeCooldownUntil && !this.gunpowderClipActive) {
          this.doGunpowderDischarge(mouseX, mouseY);
        }
      } else {
        player.castAbility('metal-fire-at-will', playerCtx);
      }
    }

    // R: Reinforce (weapon picker)
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      if (!this.metalReinforcementMenuOpen) {
        player.castAbility('metal-reinforce', playerCtx);
      }
    }

    // F: Chain Tether
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      player.castAbility('metal-chain-tether', playerCtx);
    }

    // Q: Blood Clot (or Recast Clot while armor is active)
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.arena.hasUpgrade('q') && this.metalArmorActive) {
        // Recast: consume puddles to heal armor (no cooldown)
        const myPuddles = this.metalBloodPuddles.filter(p => p.owner === 'player');
        if (myPuddles.length > 0) {
          for (const p of myPuddles) p.sprite.destroy();
          this.metalBloodPuddles = this.metalBloodPuddles.filter(p => p.owner !== 'player');
          this.metalArmorHp += myPuddles.length * 20;
          this.arena.showFloatingText(player.x, player.y - 44, `🛡️ ARMOR RECHARGED (+${myPuddles.length * 20})`, '#ff4466');
        }
      } else {
        player.castAbility('metal-blood-clot', playerCtx);
      }
    }
  }

  update(time: number, delta: number): void {
    this.updateAggressiveBleeds(time, delta);
    this.updateBloodPuddles(time, delta);
    this.updateBloodSiphon(time, delta);
    this.updateChainTethers(time, delta);
    this.updateChainProjectiles(time, delta);
    this.updateGunProjectiles(time, delta);
    this.updateArmorTracking(time);
    this.updateArsenalHud();
    this.updateGunpowderClip(time, delta);
  }

  // ── Public do* methods — called from ArenaScene context builders ──────

  doMetalSlash(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { player, npc, enemies, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const targets = owner === 'player' ? enemies : [player];

    const dx = tx - caster.x, dy = ty - caster.y;
    const ang = Math.atan2(dy, dx);
    const arcRadius = 80;

    const gfx = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add.graphics().setDepth(9);
    gfx.setPosition(caster.x, caster.y);
    gfx.lineStyle(5, 0xccddee, 0.9);
    gfx.beginPath();
    gfx.arc(0, 0, arcRadius, ang - Math.PI / 2.5, ang + Math.PI / 2.5, false);
    gfx.strokePath();
    const tipX = caster.x + Math.cos(ang) * arcRadius;
    const tipY = caster.y + Math.sin(ang) * arcRadius;
    const tip = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add.circle(tipX, tipY, 5, 0xffffff, 0.9).setDepth(9);
    (scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens.add({ targets: [gfx, tip], alpha: 0, duration: 260, onComplete: () => { gfx.destroy(); tip.destroy(); } });

    for (const target of targets) {
      if (!target.active || target.hp <= 0) continue;
      const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
      if (dist <= 90) {
        const dmg = 25;
        target.takeDamage(dmg);
        this.arena.spawnHitFlash(target.x, target.y, 0xaabbcc);
        this.applyMetalAggressiveBleeding(owner, 5000);
        this.arena.showFloatingText(caster.x, caster.y - 36, '🗡️ SLASH', '#aabbcc');
        if (!target.knockbackImmune) {
          const kbDx = target.x - caster.x, kbDy = target.y - caster.y;
          const kbLen = Math.sqrt(kbDx * kbDx + kbDy * kbDy) || 1;
          (target.body as Phaser.Physics.Arcade.Body).setVelocity((kbDx / kbLen) * 350, (kbDy / kbLen) * 350);
          (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time.delayedCall(200, () => {
            if (target.active) (target.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          });
        }
      }
    }
  }

  doMetalFireAtWill(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const arsenal = owner === 'player' ? this.metalArsenal : this.npcMetalArsenal;

    if (arsenal.length === 0) return;

    this.arena.showFloatingText(caster.x, caster.y - 44, '🔫 FIRE AT WILL!', '#ffddaa');

    arsenal.forEach((gunId, i) => {
      (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time.delayedCall(i * 130, () => {
        if (!caster.active) return;
        const target = owner === 'player' ? this.arena.getNearestEnemy(caster.x, caster.y) : player;
        if (!target.active) return;
        this.fireMetalGun(gunId, owner, target.x, target.y);
      });
    });
  }

  doMetalOpenReinforcementMenu(): void {
    if (this.metalReinforcementMenuOpen) return;

    const ALL_GUNS = this.arena.hasUpgrade('r') ? [...BASE_GUNS, 'sniper'] : BASE_GUNS;
    const { player, scene } = this.arena;
    const arsenalCap = this.arena.hasUpgrade('e') ? 5 : 3;
    const notOwned = ALL_GUNS.filter(g => !this.metalArsenal.includes(g));
    const pool = notOwned.length >= 3 ? notOwned : ALL_GUNS;
    const choices = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);

    this.metalReinforcementMenuOpen = true;
    const { width: W, height: H } = scene.scale;
    const cx = W / 2, cy = H / 2;
    const cardW = 180, cardH = 220, spacing = 200;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;

    const overlay = sceneAdd.rectangle(cx, cy, W, H, 0x000000, 0.6).setDepth(30).setInteractive();
    this.metalReinforcementButtons.push(overlay);

    const title = sceneAdd.text(cx, cy - 160, '⚙️ Reinforce Arsenal', {
      fontSize: '22px', color: '#aabbcc', fontFamily: '"Arial Black", sans-serif',
    }).setOrigin(0.5).setDepth(31);
    this.metalReinforcementButtons.push(title);

    const slotsText = this.metalArsenal.length >= arsenalCap ? '(Oldest weapon replaced)' : `(${this.metalArsenal.length}/${arsenalCap} slots used)`;
    const sub = sceneAdd.text(cx, cy - 128, slotsText, {
      fontSize: '13px', color: '#889aaa',
    }).setOrigin(0.5).setDepth(31);
    this.metalReinforcementButtons.push(sub);

    choices.forEach((gunId, i) => {
      const x = cx + (i - 1) * spacing;
      const y = cy;

      const bg = sceneAdd.rectangle(x, y, cardW, cardH, 0x223344)
        .setStrokeStyle(2, 0x446688).setDepth(31).setInteractive();
      bg.on('pointerover', () => bg.setFillStyle(0x334455));
      bg.on('pointerout',  () => bg.setFillStyle(0x223344));

      const emojiLbl = sceneAdd.text(x, y - 75, GUN_EMOJIS[gunId] ?? '?', { fontSize: '36px' }).setOrigin(0.5).setDepth(32);
      const nameLbl  = sceneAdd.text(x, y - 28, GUN_NAMES[gunId] ?? gunId, {
        fontSize: '14px', color: '#ccddee', fontFamily: '"Arial Black", sans-serif',
      }).setOrigin(0.5).setDepth(32);
      const descLbl  = sceneAdd.text(x, y + 16, GUN_DESCS[gunId] ?? '', {
        fontSize: '11px', color: '#8899aa', wordWrap: { width: cardW - 20 }, align: 'center',
      }).setOrigin(0.5).setDepth(32);

      bg.on('pointerdown', () => {
        if (this.metalArsenal.length >= arsenalCap) this.metalArsenal.shift();
        this.metalArsenal.push(gunId);
        this.arena.showFloatingText(player.x, player.y - 44, `${GUN_EMOJIS[gunId]} ${GUN_NAMES[gunId]} ACQUIRED`, '#aabbcc');
        for (const obj of this.metalReinforcementButtons) {
          if ((obj as Phaser.GameObjects.GameObject).active) (obj as unknown as { destroy(): void }).destroy();
        }
        this.metalReinforcementButtons = [];
        this.metalReinforcementMenuOpen = false;
      });

      this.metalReinforcementButtons.push(bg, emojiLbl, nameLbl, descLbl);
    });
  }

  doMetalNpcPickGun(): void {
    const notOwned = BASE_GUNS.filter(g => !this.npcMetalArsenal.includes(g));
    const pool = notOwned.length > 0 ? notOwned : BASE_GUNS;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (this.npcMetalArsenal.length >= 3) this.npcMetalArsenal.shift();
    this.npcMetalArsenal.push(chosen);
  }

  doMetalChainTether(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;

    // F+: Blood Siphon — if aiming near an own-owned puddle, tether to it instead
    if (owner === 'player' && this.arena.hasUpgrade('f')) {
      let closestPuddle: MetalBloodPuddle | null = null;
      let closestDist = 240;
      for (const puddle of this.metalBloodPuddles) {
        if (puddle.owner !== 'player') continue;
        const d = Phaser.Math.Distance.Between(tx, ty, puddle.x, puddle.y);
        if (d < closestDist) { closestDist = d; closestPuddle = puddle; }
      }
      if (closestPuddle) {
        this.metalBloodChainPuddle = closestPuddle;
        this.metalBloodChainAccum = 0;
        if (!this.metalBloodChainGraphic) this.metalBloodChainGraphic = sceneAdd.graphics().setDepth(5);
        this.arena.showFloatingText(caster.x, caster.y - 30, '🩸 BLOOD SIPHON', '#cc0000');
        return;
      }
    }

    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const spr = sceneAdd.circle(caster.x, caster.y, 8, 0x889aaa, 0.9)
      .setStrokeStyle(2, 0xccddee).setDepth(8);
    this.metalChainProjectiles.push({
      sprite: spr, x: caster.x, y: caster.y,
      vx: (dx / len) * 520, vy: (dy / len) * 520,
      owner, active: true,
    });
    this.arena.showFloatingText(caster.x, caster.y - 30, '⛓️ CHAIN!', '#aabbcc');
  }

  doMetalBloodClot(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTweens = (scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens;
    const sceneTime = (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time;

    const myPuddles = this.metalBloodPuddles.filter(p => p.owner === owner);
    const count = myPuddles.length;
    for (const p of myPuddles) p.sprite.destroy();
    this.metalBloodPuddles = this.metalBloodPuddles.filter(p => p.owner !== owner);

    const armorHp = 50 + count * 20;
    const duration = 8000 + count * 2000;

    this.arena.showFloatingText(caster.x, caster.y - 44, `🛡️ BLOOD ARMOR (${armorHp} HP)`, '#ff4466');

    // Blood burst VFX
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const dot = sceneAdd.circle(
        caster.x + Math.cos(ang) * 18, caster.y + Math.sin(ang) * 18,
        5, 0xcc0000, 0.9,
      ).setDepth(7);
      sceneTweens.add({ targets: dot, x: dot.x + Math.cos(ang) * 40, y: dot.y + Math.sin(ang) * 40, alpha: 0, duration: 600, onComplete: () => dot.destroy() });
    }

    if (owner === 'player') {
      this.metalArmorActive = true;
      this.metalArmorHp = armorHp;
      this.metalArmorEnd = sceneTime.now + duration;
      if (this.metalArmorAura) this.metalArmorAura.destroy();
      this.metalArmorAura = sceneAdd.circle(caster.x, caster.y, 40, 0xcc2244, 0.3)
        .setStrokeStyle(3, 0xff4466, 0.7).setDepth(3);
      sceneTweens.add({ targets: this.metalArmorAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 500 });
      // Q+: Recast Clot — suspend the cooldown (it starts only when armor ends)
      if (this.arena.hasUpgrade('q')) player.resetCooldown('metal-blood-clot');

      player.damageAbsorber = (amount: number) => {
        if (this.metalArmorReflecting) return false;
        if (!this.metalArmorActive || sceneTime.now > this.metalArmorEnd) {
          this.metalArmorActive = false; player.damageAbsorber = null; return false;
        }
        this.metalArmorHp -= amount;
        this.arena.spawnDamageNumber(player.x, player.y - 20, amount);
        const reflected = Math.ceil(amount * 0.5);
        this.metalArmorReflecting = true;
        npc.takeDamage(reflected);
        this.metalArmorReflecting = false;
        this.arena.spawnHitFlash(npc.x, npc.y, 0x882244);
        this.arena.showFloatingText(npc.x, npc.y - 30, `↩ ${reflected} REFLECT`, '#ff8866');
        if (this.metalArmorHp <= 0) {
          this.metalArmorActive = false; player.damageAbsorber = null;
          this.arena.showFloatingText(player.x, player.y - 36, '💔 ARMOR BROKEN', '#ff4466');
          if (this.metalArmorAura) { this.metalArmorAura.destroy(); this.metalArmorAura = null; }
        }
        return true;
      };
    } else {
      this.npcMetalArmorActive = true;
      this.npcMetalArmorHp = armorHp;
      this.npcMetalArmorEnd = sceneTime.now + duration;
      if (this.npcMetalArmorAura) this.npcMetalArmorAura.destroy();
      this.npcMetalArmorAura = sceneAdd.circle(caster.x, caster.y, 40, 0xcc2244, 0.3)
        .setStrokeStyle(3, 0xff4466, 0.7).setDepth(3);
      sceneTweens.add({ targets: this.npcMetalArmorAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 500 });

      npc.damageAbsorber = (amount: number) => {
        if (this.npcMetalArmorReflecting) return false;
        if (!this.npcMetalArmorActive || sceneTime.now > this.npcMetalArmorEnd) {
          this.npcMetalArmorActive = false; npc.damageAbsorber = null; return false;
        }
        this.npcMetalArmorHp -= amount;
        const reflected = Math.ceil(amount * 0.5);
        this.npcMetalArmorReflecting = true;
        player.takeDamage(reflected);
        this.npcMetalArmorReflecting = false;
        this.arena.spawnHitFlash(player.x, player.y, 0x882244);
        this.arena.showFloatingText(player.x, player.y - 30, `↩ ${reflected} REFLECT`, '#ff8866');
        if (this.npcMetalArmorHp <= 0) {
          this.npcMetalArmorActive = false; npc.damageAbsorber = null;
          if (this.npcMetalArmorAura) { this.npcMetalArmorAura.destroy(); this.npcMetalArmorAura = null; }
        }
        return true;
      };
    }
  }

  applyMetalAggressiveBleeding(appliedBy: 'player' | 'npc', duration: number): void {
    const { player, npc, scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTweens = (scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens;
    const sceneTime = (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time;

    if (appliedBy === 'player') {
      // Player bleeds NPC
      this.npcAggressiveBleeding = true;
      this.npcAggressiveBleedUntil = Math.max(this.npcAggressiveBleedUntil, sceneTime.now + duration);
      if (!this.npcAggressiveBleedAura) {
        this.npcAggressiveBleedAura = sceneAdd.circle(npc.x, npc.y, 30, 0x660000, 0.4)
          .setStrokeStyle(2, 0xaa0000, 0.6).setDepth(3);
        sceneTweens.add({ targets: this.npcAggressiveBleedAura, alpha: 0.12, yoyo: true, repeat: -1, duration: 380 });
      }
      this.arena.showFloatingText(npc.x, npc.y - 36, '🩸 BLEEDING', '#cc0000');
      // Drip particles
      for (let i = 0; i < 4; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dot = sceneAdd.circle(
          npc.x + Math.cos(ang) * 18, npc.y + Math.sin(ang) * 18,
          3, 0x880000, 0.9,
        ).setDepth(6);
        sceneTweens.add({ targets: dot, y: dot.y + 22, alpha: 0, duration: 680, onComplete: () => dot.destroy() });
      }
    } else {
      // NPC bleeds player
      this.playerAggressiveBleeding = true;
      this.playerAggressiveBleedUntil = Math.max(this.playerAggressiveBleedUntil, sceneTime.now + duration);
      if (!this.playerAggressiveBleedAura) {
        this.playerAggressiveBleedAura = sceneAdd.circle(player.x, player.y, 30, 0x660000, 0.4)
          .setStrokeStyle(2, 0xaa0000, 0.6).setDepth(3);
        sceneTweens.add({ targets: this.playerAggressiveBleedAura, alpha: 0.12, yoyo: true, repeat: -1, duration: 380 });
      }
      this.arena.showFloatingText(player.x, player.y - 36, '🩸 BLEEDING', '#cc0000');
    }
  }

  spawnMetalBloodPuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTweens = (scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens;

    const base = 30;
    // Click+: Hemorrhage — puddles spawned by/for the upgraded player are 50% bigger
    const r = (owner === 'player' && this.arena.hasUpgrade('click')) ? Math.round(base * 1.5) : base;
    const spr = sceneAdd.circle(x, y, r, 0x660000, 0.55)
      .setStrokeStyle(2, 0x990000, 0.5).setDepth(2);
    this.metalBloodPuddles.push({ sprite: spr, x, y, radius: r, owner, drainAccum: 0, draining: false });
    // Small spawn VFX
    const burst = sceneAdd.circle(x, y, 6, 0xcc0000, 0.8).setDepth(5);
    sceneTweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
  }

  // ── Gunpowder perk methods ───────────────────────────────────────────────

  private doGunpowderDischarge(tx: number, ty: number): void {
    const player = this.arena.player;
    const scene = this.arena.scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory; time: Phaser.Time.Clock };
    const dx = tx - player.x;
    const dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    this.gunpowderClipSprite = scene.add.rectangle(player.x, player.y, 12, 8, 0x778899).setDepth(8);
    this.gunpowderClipX = player.x;
    this.gunpowderClipY = player.y;
    this.gunpowderClipVx = (dx / len) * 600;
    this.gunpowderClipVy = (dy / len) * 600;
    this.gunpowderClipTargetX = tx;
    this.gunpowderClipTargetY = ty;
    this.gunpowderClipSpawnedAt = scene.time.now;
    this.gunpowderClipActive = true;
    this.gunpowderDischargeCooldownUntil = scene.time.now + 8000;

    this.arena.showFloatingText(player.x, player.y - 44, '💥 DISCHARGE!', '#ccaa44');
  }

  private triggerGunpowderExplosion(): void {
    const scene = this.arena.scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory; tweens: Phaser.Tweens.TweenManager };
    const player = this.arena.player;
    const npc = this.arena.npc;
    const cx = this.gunpowderClipX;
    const cy = this.gunpowderClipY;

    // Destroy clip sprite
    this.gunpowderClipSprite?.destroy();
    this.gunpowderClipSprite = null;
    this.gunpowderClipActive = false;

    // Orange explosion flash
    const flash = scene.add.circle(cx, cy, 80, 0xff8800, 0.5).setDepth(9);
    scene.tweens.add({ targets: flash, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 350, onComplete: () => flash.destroy() });

    // AoE damage (radius 80, 20 dmg)
    this.arena.dealAoeDamage(cx, cy, 80, 20, 'player');

    // 20 hitscan beams at equidistant angles
    const COUNT = 20;
    const RANGE = 900;
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);

      // Draw beam
      const gfx = scene.add.graphics().setDepth(8);
      gfx.lineStyle(2, 0xffcc44, 1);
      gfx.beginPath();
      gfx.moveTo(cx, cy);
      gfx.lineTo(cx + ux * RANGE, cy + uy * RANGE);
      gfx.strokePath();
      scene.tweens.add({ targets: gfx, alpha: 0, duration: 200, onComplete: () => gfx.destroy() });

      // Hit check using perpendicular distance
      const perp = Math.abs((npc.x - cx) * uy - (npc.y - cy) * ux);
      const dot = (npc.x - cx) * ux + (npc.y - cy) * uy;
      if (perp <= 30 && dot > 0 && dot <= RANGE && npc.active) {
        npc.takeDamage(8);
        this.arena.spawnHitFlash(npc.x, npc.y, 0xffcc44);
      }
    }

    // Delete oldest weapon from arsenal
    if (this.metalArsenal.length > 0) {
      const removed = this.metalArsenal.shift()!;
      const emoji = GUN_EMOJIS[removed] ?? '?';
      const name = GUN_NAMES[removed] ?? removed;
      this.arena.showFloatingText(player.x, player.y - 28, `❌ ${emoji} ${name} LOST`, '#ff8888');
      this.updateArsenalHud();
    }
  }

  private updateGunpowderClip(time: number, delta: number): void {
    if (!this.gunpowderClipActive) return;

    const dt = delta / 1000;
    this.gunpowderClipX += this.gunpowderClipVx * dt;
    this.gunpowderClipY += this.gunpowderClipVy * dt;

    if (this.gunpowderClipSprite) {
      this.gunpowderClipSprite.x = this.gunpowderClipX;
      this.gunpowderClipSprite.y = this.gunpowderClipY;
      this.gunpowderClipSprite.rotation = Math.atan2(this.gunpowderClipVy, this.gunpowderClipVx);
    }

    const distToTarget = Phaser.Math.Distance.Between(
      this.gunpowderClipX, this.gunpowderClipY,
      this.gunpowderClipTargetX, this.gunpowderClipTargetY,
    );
    const elapsed = time - this.gunpowderClipSpawnedAt;

    if (distToTarget < 20 || elapsed >= 1200) {
      this.triggerGunpowderExplosion();
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private drawMetalChainLine(gfx: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
    const d = Phaser.Math.Distance.Between(x1, y1, x2, y2) || 1;
    const dx = x2 - x1, dy = y2 - y1;
    const segments = Math.max(4, Math.floor(d / 22));
    const perpX = -dy / d, perpY = dx / d;
    gfx.lineStyle(3, 0x889aaa, 0.75);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const px = x1 + dx * t, py = y1 + dy * t;
      const side = i % 2 === 0 ? 1 : -1;
      gfx.lineTo(px + perpX * side * 7, py + perpY * side * 7);
    }
    gfx.strokePath();
  }

  private fireMetalGun(gunId: string, owner: 'player' | 'npc', targetX: number, targetY: number): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const target = owner === 'player' ? this.arena.getNearestEnemy(caster.x, caster.y) : player;
    const dx = targetX - caster.x, dy = targetY - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;

    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTweens = (scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens;
    const sceneTime = (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time;

    // Helper: perpendicular-distance hitscan check (30px tolerance)
    const hitscanHit = (sUx: number, sUy: number, tolerance = 30): boolean => {
      const perp = Math.abs((target.x - caster.x) * sUy - (target.y - caster.y) * sUx);
      const dot  = (target.x - caster.x) * sUx + (target.y - caster.y) * sUy;
      return perp <= tolerance && dot > 0;
    };

    const drawLine = (sUx: number, sUy: number, color: number, range = 900, lw = 2): void => {
      const gfx = sceneAdd.graphics().setDepth(8);
      gfx.lineStyle(lw, color, 1);
      gfx.beginPath();
      gfx.moveTo(caster.x, caster.y);
      gfx.lineTo(caster.x + sUx * range, caster.y + sUy * range);
      gfx.strokePath();
      sceneTweens.add({ targets: gfx, alpha: 0, duration: 180, onComplete: () => gfx.destroy() });
    };

    switch (gunId) {
      case 'flintlock': {
        drawLine(ux, uy, 0x888877, 900, 3);
        if (hitscanHit(ux, uy)) {
          target.takeDamage(20);
          this.arena.spawnHitFlash(target.x, target.y, 0x887766);
          this.spawnMetalBloodPuddle(target.x, target.y, owner);
        }
        break;
      }
      case 'rifle': {
        for (let i = 0; i < 3; i++) {
          sceneTime.delayedCall(i * 150, () => {
            if (!caster.active || !target.active) return;
            drawLine(ux, uy, 0xaabb99, 900, 2);
            const perp = Math.abs((target.x - caster.x) * uy - (target.y - caster.y) * ux);
            const dot  = (target.x - caster.x) * ux + (target.y - caster.y) * uy;
            if (perp <= 30 && dot > 0) {
              target.takeDamage(8);
              this.arena.spawnHitFlash(target.x, target.y, 0xaabb99);
            }
          });
        }
        break;
      }
      case 'grenade-launcher': {
        const spr = sceneAdd.circle(caster.x, caster.y, 10, 0x445544, 0.9)
          .setStrokeStyle(2, 0x88aa88).setDepth(8);
        this.metalGunProjectiles.push({
          sprite: spr, x: caster.x, y: caster.y,
          vx: ux * 400, vy: uy * 400 - 80,
          owner, type: 'grenade', damage: 35, explodeRadius: 80, active: true,
        });
        break;
      }
      case 'flamethrower': {
        const baseX = caster.x + ux * 40, baseY = caster.y + uy * 40;
        const baseAng = Math.atan2(uy, ux);
        for (let i = 0; i < 7; i++) {
          const spread = (Math.random() - 0.5) * 1.4;
          const fAng = baseAng + spread;
          const spd = 200 + Math.random() * 120;
          const spr = sceneAdd.circle(baseX, baseY, 7, 0xff5500, 0.85 - Math.random() * 0.3).setDepth(8);
          const expAt = sceneTime.now + 550 + Math.random() * 150;
          this.metalGunProjectiles.push({
            sprite: spr, x: baseX, y: baseY,
            vx: Math.cos(fAng) * spd, vy: Math.sin(fAng) * spd,
            owner, type: 'flame', damage: 8, active: true, expiresAt: expAt,
          });
        }
        break;
      }
      case 'shotgun': {
        const baseAng = Math.atan2(uy, ux);
        for (let i = 0; i < 5; i++) {
          const spread = (i - 2) * (Math.PI / 8);
          const sAng = baseAng + spread;
          const sUx = Math.cos(sAng), sUy = Math.sin(sAng);
          drawLine(sUx, sUy, 0x998855, 600, 2);
          if (hitscanHit(sUx, sUy, 38)) {
            target.takeDamage(10);
            this.arena.spawnHitFlash(target.x, target.y, 0x998855);
          }
        }
        break;
      }
      case 'rpg': {
        const spr = sceneAdd.circle(caster.x, caster.y, 8, 0xcc5511, 0.9)
          .setStrokeStyle(2, 0xff8844).setDepth(8);
        const trail = sceneAdd.circle(caster.x, caster.y, 5, 0x888888, 0.5).setDepth(7);
        sceneTweens.add({ targets: trail, alpha: 0, scaleX: 2, scaleY: 2, duration: 300, onComplete: () => trail.destroy() });
        this.metalGunProjectiles.push({
          sprite: spr, x: caster.x, y: caster.y,
          vx: ux * 700, vy: uy * 700,
          owner, type: 'rpg', damage: 50, explodeRadius: 120, active: true,
        });
        break;
      }
      case 'taser': {
        const spr = sceneAdd.circle(caster.x, caster.y, 8, 0xffee22, 0.9)
          .setStrokeStyle(2, 0xffffff, 0.8).setDepth(8);
        this.metalGunProjectiles.push({
          sprite: spr, x: caster.x, y: caster.y,
          vx: ux * 500, vy: uy * 500,
          owner, type: 'taser', damage: 15, active: true,
        });
        break;
      }
      case 'minigun': {
        const baseAng = Math.atan2(uy, ux);
        for (let i = 0; i < 30; i++) {
          sceneTime.delayedCall(i * 35, () => {
            if (!caster.active || !target.active) return;
            const spread = (Math.random() - 0.5) * (Math.PI * 2 / 3);
            const mAng = baseAng + spread;
            const mUx = Math.cos(mAng), mUy = Math.sin(mAng);
            const gfx = sceneAdd.graphics().setDepth(8);
            gfx.lineStyle(1, 0xaabbcc, 0.7);
            gfx.beginPath();
            gfx.moveTo(caster.x, caster.y);
            gfx.lineTo(caster.x + mUx * 700, caster.y + mUy * 700);
            gfx.strokePath();
            sceneTweens.add({ targets: gfx, alpha: 0, duration: 100, onComplete: () => gfx.destroy() });
            const mPerp = Math.abs((target.x - caster.x) * mUy - (target.y - caster.y) * mUx);
            const mDot  = (target.x - caster.x) * mUx + (target.y - caster.y) * mUy;
            if (mPerp <= 35 && mDot > 0) {
              target.takeDamage(1);
            }
          });
        }
        break;
      }
      case 'sniper': {
        const chargeGfx = sceneAdd.graphics().setDepth(7);
        chargeGfx.lineStyle(1, 0xffee44, 0.35);
        chargeGfx.beginPath();
        chargeGfx.moveTo(caster.x, caster.y);
        chargeGfx.lineTo(caster.x + ux * 1200, caster.y + uy * 1200);
        chargeGfx.strokePath();
        sceneTweens.add({ targets: chargeGfx, alpha: 0.7, yoyo: true, repeat: 1, duration: 350, onComplete: () => chargeGfx.destroy() });
        this.arena.showFloatingText(caster.x, caster.y - 30, '🎖️ Charging…', '#ffee44');
        sceneTime.delayedCall(700, () => {
          if (!caster.active || !target.active) return;
          const dx2 = target.x - caster.x, dy2 = target.y - caster.y;
          const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
          const sUx = dx2 / len2, sUy = dy2 / len2;
          drawLine(sUx, sUy, 0xffee22, 1200, 3);
          if (hitscanHit(sUx, sUy, 18)) {
            target.takeDamage(55);
            this.arena.spawnHitFlash(target.x, target.y, 0xffee22);
            this.arena.showFloatingText(target.x, target.y - 36, '🎖️ SNIPER HIT', '#ffee22');
          }
        });
        break;
      }
    }
  }

  private doMetalExplosion(x: number, y: number, radius: number, damage: number, owner: 'player' | 'npc'): void {
    const { player, enemies, scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTweens = (scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens;

    const ring = sceneAdd.circle(x, y, 10, 0xff5500, 0.85).setDepth(9);
    sceneTweens.add({ targets: ring, scaleX: radius / 10, scaleY: radius / 10, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    const inner = sceneAdd.circle(x, y, 6, 0xffcc44, 1).setDepth(10);
    sceneTweens.add({ targets: inner, scaleX: 3, scaleY: 3, alpha: 0, duration: 200, onComplete: () => inner.destroy() });

    const targets = owner === 'player' ? enemies : [player];
    for (const target of targets) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, target.x, target.y) <= radius) {
        target.takeDamage(damage);
        this.arena.spawnHitFlash(target.x, target.y, 0xff5500);
        this.arena.showFloatingText(x, y - 30, '💥 BOOM', '#ff8844');
      }
    }
  }

  // ── Per-frame update helpers ──────────────────────────────────────────────

  private updateAggressiveBleeds(time: number, delta: number): void {
    const { player, npc } = this.arena;

    if (this.npcAggressiveBleeding) {
      if (time > this.npcAggressiveBleedUntil) {
        this.npcAggressiveBleeding = false;
        if (this.npcAggressiveBleedAura) { this.npcAggressiveBleedAura.destroy(); this.npcAggressiveBleedAura = null; }
      } else {
        if (this.npcAggressiveBleedAura) this.npcAggressiveBleedAura.setPosition(npc.x, npc.y);
        this.npcAggressiveBleedTickAccum += delta;
        if (this.npcAggressiveBleedTickAccum >= 1000) {
          this.npcAggressiveBleedTickAccum -= 1000;
          npc.takeDamage(2);
          this.arena.spawnDamageNumber(npc.x, npc.y - 18, 2);
        }
        this.npcAggressiveBleedPuddleAccum += delta;
        if (this.npcAggressiveBleedPuddleAccum >= 3000) {
          this.npcAggressiveBleedPuddleAccum -= 3000;
          this.spawnMetalBloodPuddle(npc.x, npc.y, 'player');
        }
      }
    }

    if (this.playerAggressiveBleeding) {
      if (time > this.playerAggressiveBleedUntil) {
        this.playerAggressiveBleeding = false;
        if (this.playerAggressiveBleedAura) { this.playerAggressiveBleedAura.destroy(); this.playerAggressiveBleedAura = null; }
      } else {
        if (this.playerAggressiveBleedAura) this.playerAggressiveBleedAura.setPosition(player.x, player.y);
        this.playerAggressiveBleedTickAccum += delta;
        if (this.playerAggressiveBleedTickAccum >= 1000) {
          this.playerAggressiveBleedTickAccum -= 1000;
          player.takeDamage(2);
          this.arena.spawnDamageNumber(player.x, player.y - 18, 2);
        }
        this.playerAggressiveBleedPuddleAccum += delta;
        if (this.playerAggressiveBleedPuddleAccum >= 3000) {
          this.playerAggressiveBleedPuddleAccum -= 3000;
          this.spawnMetalBloodPuddle(player.x, player.y, 'npc');
        }
      }
    }
  }

  private updateBloodPuddles(_time: number, delta: number): void {
    const { player, npc } = this.arena;

    for (let i = this.metalBloodPuddles.length - 1; i >= 0; i--) {
      const puddle = this.metalBloodPuddles[i];
      const owner = puddle.owner === 'player' ? player : npc;
      const d = Phaser.Math.Distance.Between(owner.x, owner.y, puddle.x, puddle.y);

      puddle.draining = d <= puddle.radius + 18;

      if (puddle.draining) {
        puddle.drainAccum += delta;
        if (puddle.drainAccum >= 900) {
          puddle.drainAccum -= 900;
          owner.heal(2);
          this.arena.showFloatingText(owner.x, owner.y - 22, '+2 ❤️', '#ff6688');
          puddle.sprite.setScale(puddle.sprite.scaleX * 0.55);
        }
        if (puddle.sprite.scaleX < 0.12) {
          puddle.sprite.destroy();
          this.metalBloodPuddles.splice(i, 1);
        }
      }
    }
  }

  private updateBloodSiphon(_time: number, delta: number): void {
    const { player } = this.arena;

    if (this.metalBloodChainPuddle) {
      const puddle = this.metalBloodChainPuddle;
      if (!puddle.sprite.active || puddle.sprite.scaleX < 0.12) {
        this.metalBloodChainPuddle = null;
        if (this.metalBloodChainGraphic) { this.metalBloodChainGraphic.clear(); }
      } else {
        this.metalBloodChainAccum += delta;
        if (this.metalBloodChainAccum >= 900) {
          this.metalBloodChainAccum -= 900;
          player.heal(3);
          this.arena.showFloatingText(player.x, player.y - 22, '+3 🩸', '#ff6688');
          puddle.sprite.setScale(puddle.sprite.scaleX * (0.55 / 1.5 < 0.37 ? 0.37 : 0.55 / 1.5));
          if (puddle.sprite.scaleX < 0.12) {
            puddle.sprite.destroy();
            const idx = this.metalBloodPuddles.indexOf(puddle);
            if (idx !== -1) this.metalBloodPuddles.splice(idx, 1);
            this.metalBloodChainPuddle = null;
            if (this.metalBloodChainGraphic) this.metalBloodChainGraphic.clear();
          }
        }
        if (this.metalBloodChainGraphic && puddle.sprite.active) {
          this.metalBloodChainGraphic.clear();
          this.drawMetalChainLine(this.metalBloodChainGraphic, player.x, player.y, puddle.x, puddle.y);
        }
      }
    }
  }

  private updateChainTethers(time: number, _delta: number): void {
    const { player, npc, scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;

    if (this.metalChainTethered) {
      if (time > this.metalChainTetherEnd) {
        this.metalChainTethered = false;
        if (this.metalChainGraphic) { this.metalChainGraphic.clear(); this.metalChainGraphic.destroy(); this.metalChainGraphic = null; }
      } else {
        const td = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
        if (td > 160) {
          const ang = Math.atan2(npc.y - player.y, npc.x - player.x);
          npc.setPosition(player.x + Math.cos(ang) * 160, player.y + Math.sin(ang) * 160);
        }
        if (!this.metalChainGraphic) this.metalChainGraphic = sceneAdd.graphics().setDepth(5);
        this.metalChainGraphic.clear();
        this.drawMetalChainLine(this.metalChainGraphic, player.x, player.y, npc.x, npc.y);
      }
    }

    if (this.npcMetalChainTethered) {
      if (time > this.npcMetalChainTetherEnd) {
        this.npcMetalChainTethered = false;
        if (this.npcMetalChainGraphic) { this.npcMetalChainGraphic.clear(); this.npcMetalChainGraphic.destroy(); this.npcMetalChainGraphic = null; }
      } else {
        const td = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
        if (td > 160) {
          const ang = Math.atan2(player.y - npc.y, player.x - npc.x);
          player.setPosition(npc.x + Math.cos(ang) * 160, npc.y + Math.sin(ang) * 160);
        }
        if (!this.npcMetalChainGraphic) this.npcMetalChainGraphic = sceneAdd.graphics().setDepth(5);
        this.npcMetalChainGraphic.clear();
        this.drawMetalChainLine(this.npcMetalChainGraphic, npc.x, npc.y, player.x, player.y);
      }
    }
  }

  private updateChainProjectiles(time: number, delta: number): void {
    const { player, enemies } = this.arena;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;

    for (let i = this.metalChainProjectiles.length - 1; i >= 0; i--) {
      const cp = this.metalChainProjectiles[i];
      if (!cp.active) { cp.sprite.destroy(); this.metalChainProjectiles.splice(i, 1); continue; }
      cp.x += cp.vx * (delta / 1000);
      cp.y += cp.vy * (delta / 1000);
      cp.sprite.setPosition(cp.x, cp.y);
      if (cp.x < 0 || cp.x > W || cp.y < 0 || cp.y > H) { cp.active = false; continue; }

      const hitTargets = cp.owner === 'player' ? enemies : [player];
      for (const hitTarget of hitTargets) {
        if (!hitTarget.active || hitTarget.hp <= 0) continue;
        const hitDist = Phaser.Math.Distance.Between(cp.x, cp.y, hitTarget.x, hitTarget.y);
        if (hitDist <= 28) {
          cp.active = false;
          this.arena.spawnHitFlash(hitTarget.x, hitTarget.y, 0x889aaa);
          this.arena.showFloatingText(hitTarget.x, hitTarget.y - 34, '⛓️ TETHERED!', '#aabbcc');
          if (cp.owner === 'player') {
            this.metalChainTethered = true;
            this.metalChainTetherEnd = time + 5000;
            this.applyMetalAggressiveBleeding('player', 3000);
          } else {
            this.npcMetalChainTethered = true;
            this.npcMetalChainTetherEnd = time + 5000;
            this.applyMetalAggressiveBleeding('npc', 3000);
          }
          break;
        }
      }
    }
  }

  private updateGunProjectiles(time: number, delta: number): void {
    const { player, enemies } = this.arena;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;

    for (let i = this.metalGunProjectiles.length - 1; i >= 0; i--) {
      const p = this.metalGunProjectiles[i];
      if (!p.active) { p.sprite.destroy(); this.metalGunProjectiles.splice(i, 1); continue; }

      if (p.expiresAt && time > p.expiresAt) { p.active = false; continue; }

      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      if (p.type === 'grenade') p.vy += 220 * (delta / 1000);
      p.sprite.setPosition(p.x, p.y);

      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        if (p.type === 'grenade' || p.type === 'rpg') this.doMetalExplosion(p.x, p.y, p.explodeRadius ?? 80, p.damage, p.owner);
        p.active = false;
        continue;
      }

      const _gunRadius = p.type === 'flame' ? 36 : 24;
      let hitT: Fighter | null = null;
      const gunTargets = p.owner === 'player' ? enemies : [player];
      for (const t of gunTargets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= _gunRadius) { hitT = t; break; }
      }
      if (hitT) {
        p.active = false;
        if (p.type === 'grenade') {
          this.doMetalExplosion(p.x, p.y, p.explodeRadius ?? 80, p.damage, p.owner);
        } else if (p.type === 'rpg') {
          this.doMetalExplosion(p.x, p.y, p.explodeRadius ?? 120, p.damage, p.owner);
        } else if (p.type === 'taser') {
          hitT.takeDamage(p.damage);
          this.arena.spawnHitFlash(hitT.x, hitT.y, 0xffee22);
          this.arena.showFloatingText(hitT.x, hitT.y - 36, '⚡ STUNNED', '#ffee22');
          if (p.owner === 'player') {
            this.npcMetalTaseredUntil = time + 2000;
          } else {
            this.playerMetalTaseredUntil = time + 2000;
            (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          }
        } else if (p.type === 'flame') {
          hitT.takeDamage(p.damage);
          this.arena.spawnHitFlash(hitT.x, hitT.y, 0xff5500);
        }
      }
    }
  }

  private updateArmorTracking(time: number): void {
    const { player, npc } = this.arena;
    const sceneTime = (this.arena.scene as Phaser.Scene & { time: Phaser.Time.Clock }).time;

    if (this.metalArmorActive) {
      if (time > this.metalArmorEnd || this.metalArmorHp <= 0) {
        this.metalArmorActive = false; player.damageAbsorber = null;
        if (this.metalArmorAura) { this.metalArmorAura.destroy(); this.metalArmorAura = null; }
        if (this.metalArmorHp > 0) this.arena.showFloatingText(player.x, player.y - 36, '🛡️ ARMOR EXPIRED', '#aabbcc');
        if (this.arena.hasUpgrade('q')) player.triggerCooldown('metal-blood-clot');
      } else {
        if (this.metalArmorAura) this.metalArmorAura.setPosition(player.x, player.y);
      }
    }
    if (this.npcMetalArmorActive) {
      if (time > this.npcMetalArmorEnd || this.npcMetalArmorHp <= 0) {
        this.npcMetalArmorActive = false; npc.damageAbsorber = null;
        if (this.npcMetalArmorAura) { this.npcMetalArmorAura.destroy(); this.npcMetalArmorAura = null; }
      } else {
        if (this.npcMetalArmorAura) this.npcMetalArmorAura.setPosition(npc.x, npc.y);
      }
    }

    void sceneTime;
  }

  private updateArsenalHud(): void {
    if (this.metalArsenalHUD && this.arena.elementId === 'metal') {
      if (this.metalArsenal.length === 0) {
        this.metalArsenalHUD.setText('[ No Weapons ]');
      } else {
        this.metalArsenalHUD.setText(this.metalArsenal.map(g => GUN_EMOJIS[g] ?? '?').join('  '));
      }
    }
  }
}
