import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { fireHitscan } from '../air';

// ── SoundArenaApi ─────────────────────────────────────────────────────────

export interface SoundArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly npcCastId: string | null;
  readonly width: number;
  readonly height: number;
  hasUpgrade(slot: string): boolean;
  setIsDodging(v: boolean): void;
  applyNpcSpeedMult(factor: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
}

type NoteType = 'normal' | 'red' | 'blue' | 'purple';

interface SoundNote {
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
  x: number;
  isRed: boolean;
  noteType: NoteType;
  damage: number;
  isHold: boolean;
  holdActive: boolean;
}

interface ComposedNote {
  xFrac: number;
  type: NoteType;
}

const NOTE_DMGS: Record<NoteType, number> = { normal: 20, red: 30, blue: 20, purple: 20 };
const COMPOSE_COSTS: Record<NoteType, number> = { normal: 1, red: 3, blue: 2, purple: 3 };
const NOTE_COLORS: Record<NoteType, number> = {
  normal: 0xddaaff,
  red: 0xff3333,
  blue: 0x3388ff,
  purple: 0x9955cc,
};
const HOLD_COLOR = 0x44ee88;

// ── SoundKit ──────────────────────────────────────────────────────────────

export class SoundKit {
  // ── HUD ─────────────────────────────────────────────────────────────
  private soundHitRing: Phaser.GameObjects.Arc | null = null;
  private soundStreakText: Phaser.GameObjects.Text | null = null;
  private soundAccidentalSprites: Phaser.GameObjects.Rectangle[] = [];

  // ── Rhythm state ─────────────────────────────────────────────────────
  private soundNotes: SoundNote[] = [];
  private soundLastSpawnAt = 0;
  private soundNoteStreak = 0;
  private soundFlowActive = false;
  private soundFlowCancelRequestedAt = 0;
  private soundAccelerandoUntil = 0;
  private soundPointerWasDown = false;
  private soundLastClickTime = 0;
  private soundAccidentals = 0;
  private soundNoteSpawnCount = 0;

  // ── Screech state ─────────────────────────────────────────────────────
  private soundScreechX = 0;
  private soundScreechY = 0;
  private soundScreechExpiry = 0;
  private soundScreechSprite: Phaser.GameObjects.Arc | null = null;
  private soundScreechRed = false;
  private soundScreechTickAccum = 0;
  private soundScreechIsStar = false;
  private soundScreechStarGraphic: Phaser.GameObjects.Graphics | null = null;

  // ── NPC screech ───────────────────────────────────────────────────────
  private npcSoundScreechX = 0;
  private npcSoundScreechY = 0;
  private npcSoundScreechExpiry = 0;
  private npcSoundScreechSprite: Phaser.GameObjects.Arc | null = null;
  private npcSoundScreechRed = false;
  private npcSoundScreechTickAccum = 0;

  // ── Grapple ───────────────────────────────────────────────────────────
  private soundFGrappleExplodes = false;
  private soundGrappleActive = false;
  private soundGrappleRefreshes = 0;

  // ── E+ hold note ──────────────────────────────────────────────────────
  private soundHoldBeamGraphic: Phaser.GameObjects.Graphics | null = null;
  private soundHoldBeamAccum = 0;
  private soundSelfSlowUntil = 0;
  private soundHoldMissHandled = false;

  // ── Click+ composing ──────────────────────────────────────────────────
  private soundComposingActive = false;
  private soundComposeHoldStart = 0;
  private soundComposeHoldVisual: Phaser.GameObjects.Arc | null = null;
  private soundComposurePoints = 20;
  private soundComposedPattern: ComposedNote[] = [];
  private soundComposingLooperIdx = 0;
  private soundComposingLastSpawn = 0;
  private soundComposePalette: Phaser.GameObjects.GameObject[] = [];
  private soundComposedNoteSprites: Array<{
    sprite: Phaser.GameObjects.Arc;
    type: NoteType;
    xFrac: number;
    patternIdx: number;
  }> = [];

  // ── Q+ crescendo speed ────────────────────────────────────────────────
  private soundCrescendoSpeedUntil = 0;
  private soundCrescendoSpeedBonus = 0;

  // ── Purple/blue note effects ──────────────────────────────────────────
  private soundComposeSpeedUntil = 0;
  private soundComposeSpeedBonus = 0;
  private soundNpcSlowUntil = 0;

  constructor(private arena: SoundArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  getNoteStreak(): number { return this.soundNoteStreak; }
  isFlowActive(): boolean { return this.soundFlowActive; }
  getAccelerandoUntil(): number { return this.soundAccelerandoUntil; }
  isSelfSlowActive(time: number): boolean { return time < this.soundSelfSlowUntil; }
  isNpcSlowActive(time: number): boolean { return time < this.soundNpcSlowUntil; }
  getCrescendoSpeedBonus(): number { return this.soundCrescendoSpeedBonus; }
  getCrescendoSpeedUntil(): number { return this.soundCrescendoSpeedUntil; }
  getComposeSpeedBonus(): number { return this.soundComposeSpeedBonus; }
  getComposeSpeedUntil(): number { return this.soundComposeSpeedUntil; }
  isComposingActive(): boolean { return this.soundComposingActive; }

  // ── Reset ────────────────────────────────────────────────────────────

  reset(isSoundMatch = false): void {
    const { scene } = this.arena;

    for (const n of this.soundNotes) n.sprite.destroy();
    this.soundNotes = [];
    this.soundLastSpawnAt = 0;
    this.soundNoteStreak = 0;
    this.soundFlowActive = false;
    this.soundFlowCancelRequestedAt = 0;
    this.soundAccelerandoUntil = 0;
    this.soundPointerWasDown = false;
    this.soundLastClickTime = 0;
    this.soundAccidentals = 0;
    this.soundNoteSpawnCount = 0;

    if (this.soundScreechSprite) { this.soundScreechSprite.destroy(); this.soundScreechSprite = null; }
    this.soundScreechX = 0; this.soundScreechY = 0; this.soundScreechExpiry = 0;
    this.soundScreechRed = false; this.soundScreechTickAccum = 0;
    this.soundScreechIsStar = false;
    if (this.soundScreechStarGraphic) { this.soundScreechStarGraphic.destroy(); this.soundScreechStarGraphic = null; }

    if (this.npcSoundScreechSprite) { this.npcSoundScreechSprite.destroy(); this.npcSoundScreechSprite = null; }
    this.npcSoundScreechX = 0; this.npcSoundScreechY = 0; this.npcSoundScreechExpiry = 0;
    this.npcSoundScreechRed = false; this.npcSoundScreechTickAccum = 0;

    this.soundFGrappleExplodes = false;
    this.soundGrappleActive = false;
    this.soundGrappleRefreshes = 0;

    if (this.soundHoldBeamGraphic) { this.soundHoldBeamGraphic.destroy(); this.soundHoldBeamGraphic = null; }
    this.soundHoldBeamAccum = 0;
    this.soundSelfSlowUntil = 0;
    this.soundHoldMissHandled = false;

    this.soundComposingActive = false;
    this.soundComposeHoldStart = 0;
    if (this.soundComposeHoldVisual) { this.soundComposeHoldVisual.destroy(); this.soundComposeHoldVisual = null; }
    this.soundComposurePoints = 20;
    this.soundComposedPattern = [];
    this.soundComposingLooperIdx = 0;
    this.soundComposingLastSpawn = 0;
    for (const o of this.soundComposePalette) { if ((o as Phaser.GameObjects.Arc).active) (o as Phaser.GameObjects.Arc).destroy(); }
    this.soundComposePalette = [];
    for (const o of this.soundComposedNoteSprites) { if (o.sprite.active) o.sprite.destroy(); }
    this.soundComposedNoteSprites = [];

    this.soundCrescendoSpeedUntil = 0;
    this.soundCrescendoSpeedBonus = 0;
    this.soundComposeSpeedUntil = 0;
    this.soundComposeSpeedBonus = 0;
    this.soundNpcSlowUntil = 0;

    if (this.soundHitRing) { this.soundHitRing.destroy(); this.soundHitRing = null; }
    if (this.soundStreakText) { this.soundStreakText.destroy(); this.soundStreakText = null; }
    for (const s of this.soundAccidentalSprites) { if (s.active) s.destroy(); }
    this.soundAccidentalSprites = [];

    if (isSoundMatch) this.buildHUD(scene);
  }

  private buildHUD(scene: Phaser.Scene): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const trackY = this.getTrackY();

    scene.add.rectangle(W / 2, trackY, W, 28, 0x0a0a18, 0.92)
      .setStrokeStyle(1, 0x441133, 1).setDepth(20);

    this.soundHitRing = scene.add.circle(W / 2, trackY, 13, 0x000000, 0).setDepth(22);
    this.soundHitRing.setStrokeStyle(3, 0xff66cc, 0.9);

    this.soundStreakText = scene.add.text(W - 8, trackY, '🎵 0', {
      fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#ffaadd',
    }).setOrigin(1, 0.5).setDepth(23);

    scene.add.text(6, trackY, 'RHYTHM', {
      fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#884466',
    }).setOrigin(0, 0.5).setDepth(23);

    // Accidental markers (3 boxes to the left of streak text)
    const markerBaseX = W - 80;
    for (let i = 0; i < 3; i++) {
      const rect = scene.add.rectangle(markerBaseX - i * 14, trackY, 9, 12, 0x000000, 0)
        .setStrokeStyle(1.5, 0xff66cc, 0.7).setDepth(23);
      this.soundAccidentalSprites.push(rect);
    }

    void H;
  }

  private getTrackY(): number {
    return (this.arena.height - 30) - 48 - 14;
  }

  private updateAccidentalHUD(): void {
    for (let i = 0; i < 3; i++) {
      const s = this.soundAccidentalSprites[i];
      if (!s?.active) continue;
      if (i < this.soundAccidentals) {
        s.setFillStyle(0xff66cc, 0.85);
      } else {
        s.setFillStyle(0x000000, 0);
      }
    }
  }

  // ── Input (called only when player element is sound) ─────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, rKey, fKey, qKey, scene } = this.arena;
    const W = this.arena.width;
    const soundHitLineX = W / 2;
    const soundTolerance = 30;
    const soundAccelActive = time < this.soundAccelerandoUntil;
    const tY = this.getTrackY();

    // ── Click+: Composing mode hold ───────────────────────────────────
    if (this.arena.hasUpgrade('click')) {
      const clickDown = pointer.isDown;
      const clickJustDown = clickDown && !this.soundPointerWasDown;

      if (clickJustDown && !this.soundComposingActive) {
        this.soundComposeHoldStart = time;
      }
      // Check if hold completed (release after 2s)
      if (!clickDown && this.soundComposeHoldStart > 0) {
        const held = time - this.soundComposeHoldStart;
        if (held >= 2000) {
          if (!this.soundComposingActive) {
            this.enterComposingMode(scene, time);
          } else {
            this.exitComposingMode(scene, time);
          }
        }
        this.soundComposeHoldStart = 0;
        if (this.soundComposeHoldVisual) {
          this.soundComposeHoldVisual.destroy();
          this.soundComposeHoldVisual = null;
        }
      }

      // Hold arc visual
      if (clickDown && this.soundComposeHoldStart > 0) {
        const ratio = Math.min(1, (time - this.soundComposeHoldStart) / 2000);
        if (!this.soundComposeHoldVisual || !this.soundComposeHoldVisual.active) {
          this.soundComposeHoldVisual = scene.add.arc(player.x, player.y, 22, 270, 270, false, 0xffaadd, 0.6).setDepth(15);
        }
        this.soundComposeHoldVisual.setPosition(player.x, player.y);
        this.soundComposeHoldVisual.setEndAngle(270 + ratio * 360);
      }

      // While composing, skip other input
      if (this.soundComposingActive) {
        this.soundPointerWasDown = pointer.isDown;
        return;
      }
    }

    // ── Click: rhythm hit or miss ─────────────────────────────────────
    const soundClickJustDown = pointer.isDown && !this.soundPointerWasDown;
    if (soundClickJustDown && !soundAccelActive && time - this.soundLastClickTime >= 200) {
      this.soundLastClickTime = time;
      const hitNote = this.soundNotes.find(n => !n.isHold && Math.abs(n.x - soundHitLineX) <= soundTolerance);
      if (hitNote) {
        const hitCtx = { ...this.arena.buildPlayerContext(mouseX, mouseY), lockCaster: (_d: number) => {}, quickShotActive: true };
        fireHitscan(hitCtx, hitNote.damage, hitNote.isRed ? 0xff4444 : NOTE_COLORS[hitNote.noteType], false);
        this.arena.spawnHitFlash(player.x, player.y, 0xff66cc);
        this.soundNoteStreak++;

        if (hitNote.noteType === 'blue') {
          this.soundNpcSlowUntil = time + 2000;
          this.arena.showFloatingText(mouseX, mouseY - 20, '🎵 SLOW', '#3388ff');
        }
        if (hitNote.noteType === 'purple') {
          this.soundComposeSpeedUntil = time + 3000;
          this.soundComposeSpeedBonus = 0.25;
          this.arena.showFloatingText(player.x, player.y - 30, '🎵 SPEED!', '#cc88ff');
        }

        const label = hitNote.isRed ? '🔴 CRIT HIT!' : '🎵 HIT';
        const col = hitNote.isRed ? '#ff4444' : '#ff88cc';
        const ht = scene.add.text(hitNote.sprite.x, tY - 16, label, {
          fontSize: '10px', color: col, fontFamily: 'Arial Black',
        }).setOrigin(0.5).setDepth(25);
        scene.tweens.add({ targets: ht, y: ht.y - 16, alpha: 0, duration: 800, onComplete: () => ht.destroy() });
        hitNote.sprite.destroy();
        const idx = this.soundNotes.indexOf(hitNote);
        if (idx !== -1) this.soundNotes.splice(idx, 1);
        this.flashHitRing(scene, hitNote.isRed ? 0xff4444 : 0xffaaff);
      } else {
        // Miss — consume accidental or take damage
        if (this.soundAccidentals > 0) {
          this.soundAccidentals--;
          this.arena.showFloatingText(player.x, player.y - 30, '♪ SAVED!', '#ffaadd');
        } else {
          player.applySelfDamage(10);
          this.arena.spawnHitFlash(player.x, player.y, 0xff6666);
          const mt = scene.add.text(player.x, player.y - 30, 'MISS -10', {
            fontSize: '11px', color: '#ff4466', fontFamily: 'Arial Black',
          }).setOrigin(0.5).setDepth(12);
          scene.tweens.add({ targets: mt, y: mt.y - 20, alpha: 0, duration: 1000, onComplete: () => mt.destroy() });
          this.soundNoteStreak = 0;
          this.flashMissRing(scene);
        }
      }
    }
    this.soundPointerWasDown = pointer.isDown;

    // ── E: Toggle Flow Mode (3s cancel delay) ─────────────────────────
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (!this.soundFlowActive) {
        this.soundFlowActive = true;
        this.soundFlowCancelRequestedAt = 0;
        this.arena.showFloatingText(player.x, player.y - 30, '🌊 FLOW ON', '#4488ff');
        if (this.soundHitRing) this.soundHitRing.setStrokeStyle(3, 0x4488ff, 0.9);
      } else if (this.soundFlowCancelRequestedAt === 0) {
        this.soundFlowCancelRequestedAt = time;
        this.arena.showFloatingText(player.x, player.y - 30, '♪ FLOW ENDING…', '#aaddff');
      } else {
        // Cancel the cancel
        this.soundFlowCancelRequestedAt = 0;
        this.arena.showFloatingText(player.x, player.y - 30, '🌊 FLOW KEPT', '#4488ff');
      }
    }

    // ── R: Screech Barrier ────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      if (player.castAbility('screech-barrier', this.arena.buildPlayerContext(mouseX, mouseY))) {
        // R+: perfect note timing → star screech
        const matchedNote = this.arena.hasUpgrade('r')
          ? this.soundNotes.find(n => Math.abs(n.x - soundHitLineX) <= soundTolerance * 1.5)
          : null;
        const isStar = matchedNote != null;
        if (isStar && matchedNote) {
          this.soundNoteStreak++;
          matchedNote.sprite.destroy();
          const mi = this.soundNotes.indexOf(matchedNote);
          if (mi !== -1) this.soundNotes.splice(mi, 1);
        }

        this.soundScreechIsStar = isStar;
        this.soundScreechX = mouseX;
        this.soundScreechY = mouseY;
        this.soundScreechExpiry = time + 5000;
        this.soundScreechRed = this.soundFlowActive;
        this.soundScreechTickAccum = 0;

        if (this.soundScreechSprite) this.soundScreechSprite.destroy();
        if (this.soundScreechStarGraphic) { this.soundScreechStarGraphic.destroy(); this.soundScreechStarGraphic = null; }

        if (!isStar) {
          const bc = this.soundScreechRed ? 0xff3333 : 0xff66cc;
          this.soundScreechSprite = scene.add.circle(mouseX, mouseY, 80, bc, 0).setDepth(3);
          this.soundScreechSprite.setStrokeStyle(3, bc, 0.9);
          scene.tweens.add({ targets: this.soundScreechSprite, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
        } else {
          this.soundScreechStarGraphic = scene.add.graphics().setDepth(3);
          this.drawStar(this.soundScreechStarGraphic, mouseX, mouseY);
        }

        const bl = isStar ? '⭐ STARSONG!' : (this.soundScreechRed ? '🔴 SCREECH' : '🎵 SCREECH');
        const blColor = isStar ? '#ffee44' : (this.soundScreechRed ? '#ff4444' : '#ff88cc');
        this.arena.showFloatingText(mouseX, mouseY - 92, bl, blColor);
      }
    }

    // ── F: Sonic Grapple ─────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (player.castAbility('sound-grapple', this.arena.buildPlayerContext(mouseX, mouseY))) {
        // Grant accidental
        if (this.soundAccidentals < 3) {
          this.soundAccidentals++;
          this.arena.showFloatingText(player.x, player.y - 40, '♪ +1 ACCIDENTAL', '#ffaadd');
        }

        const gx = mouseX, gy = mouseY;
        const gdx = gx - player.x;
        const gdy = gy - player.y;
        const glen = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
        const gspeed = 1200;
        const gTravelTime = Math.min(350, (glen / gspeed) * 1000);
        const gbody = player.body as Phaser.Physics.Arcade.Body;
        gbody.setVelocity((gdx / glen) * gspeed, (gdy / glen) * gspeed);
        this.arena.setIsDodging(true);
        this.soundGrappleActive = true;

        // Check for perfect note timing
        const matchedNote = this.soundNotes.find(n => Math.abs(n.x - soundHitLineX) <= soundTolerance * 1.5);
        const explodes = matchedNote != null;
        if (explodes && matchedNote) {
          this.soundFGrappleExplodes = true;
          this.soundNoteStreak++;
          matchedNote.sprite.destroy();
          const mi = this.soundNotes.indexOf(matchedNote);
          if (mi !== -1) this.soundNotes.splice(mi, 1);
          this.arena.showFloatingText(player.x, player.y - 30, '🎵 SONIC GRAPPLE!', '#ff88cc');
        } else {
          this.soundFGrappleExplodes = false;
        }

        const captureExplodes = explodes;

        const gtrail = scene.add.circle(player.x, player.y, 8, 0xff66cc, 0.5).setDepth(4);
        scene.tweens.add({ targets: gtrail, alpha: 0, duration: 300, onComplete: () => gtrail.destroy() });

        scene.time.delayedCall(gTravelTime, () => {
          if (!player.active) return;
          this.arena.setIsDodging(false);
          this.soundGrappleActive = false;
          gbody.setVelocity(0, 0);
          this.soundFGrappleExplodes = false;

          if (captureExplodes) {
            const ex = player.x, ey = player.y;
            const ring = scene.add.circle(ex, ey, 10, 0xff66cc, 0.9).setDepth(4);
            scene.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
            const core = scene.add.circle(ex, ey, 6, 0xffffff, 0.95).setDepth(5);
            scene.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 180, onComplete: () => core.destroy() });
            for (const t of this.arena.enemies) {
              if (!t.active || t.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(ex, ey, t.x, t.y) <= 100) {
                t.takeDamage(20);
                this.arena.spawnHitFlash(t.x, t.y, 0xff66cc);
              }
            }
            // F+: grace note — refresh cooldown (max 3 times)
            if (this.arena.hasUpgrade('f') && this.soundGrappleRefreshes < 3) {
              this.soundGrappleRefreshes++;
              player.resetCooldown('sound-grapple');
              this.arena.showFloatingText(ex, ey - 40, `✨ GRACE NOTE ${this.soundGrappleRefreshes}/3`, '#ffeecc');
            }
          } else {
            // Non-perfect cast resets grace note counter
            if (this.arena.hasUpgrade('f')) this.soundGrappleRefreshes = 0;
          }
        });
      }
    }

    // ── Q: Accelerando — requires 10 streak ───────────────────────────
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.soundNoteStreak >= 10 && player.getCooldownRatio('accelerando') >= 1) {
        // Q+: convert overflow streak to speed bonus
        if (this.arena.hasUpgrade('q')) {
          const overflow = this.soundNoteStreak - 10;
          if (overflow > 0) {
            this.soundCrescendoSpeedUntil = time + 6000;
            this.soundCrescendoSpeedBonus = overflow * 0.02;
            this.arena.showFloatingText(player.x, player.y - 50, `🎵 CRESCENDO +${Math.round(overflow * 2)}%`, '#cc88ff');
          }
        }

        player.triggerCooldown('accelerando');
        this.soundAccelerandoUntil = time + 5000;
        this.soundNoteStreak = 0;
        const at = scene.add.text(player.x, player.y - 40, '🎶 ACCELERANDO!', {
          fontSize: '13px', color: '#ffaaff', fontFamily: '"Arial Black", sans-serif',
          stroke: '#440044', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(13);
        scene.tweens.add({ targets: at, y: at.y - 30, alpha: 0, duration: 1500, onComplete: () => at.destroy() });
      }
    }
  }

  // ── Per-frame update ─────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerSound: boolean, isNpcSound: boolean): void {
    if (isPlayerSound) this.updatePlayerSound(time, delta);
    if (isNpcSound) this.updateNpcScreech(time, delta);
  }

  private updatePlayerSound(time: number, delta: number): void {
    const { player, scene } = this.arena;
    const W = this.arena.width;
    const soundHitLineX = W / 2;
    const soundTolerance = 30;
    const soundAccelActive = time < this.soundAccelerandoUntil;
    const soundBaseSpeed = soundAccelActive ? 480 : (this.soundFlowActive ? 360 : 240);
    const soundSpawnInterval = soundAccelActive ? 275 : (this.soundFlowActive ? 550 : 1100);
    const tY = this.getTrackY();

    // ── Flow cancel 3s delay ──────────────────────────────────────────
    if (this.soundFlowCancelRequestedAt > 0 && time >= this.soundFlowCancelRequestedAt + 3000) {
      this.soundFlowActive = false;
      this.soundFlowCancelRequestedAt = 0;
      this.arena.showFloatingText(player.x, player.y - 30, '💨 FLOW OFF', '#aaddff');
      if (this.soundHitRing) this.soundHitRing.setStrokeStyle(3, 0xff66cc, 0.9);
    }

    // Strobe hit ring during cancel window
    if (this.soundFlowCancelRequestedAt > 0 && this.soundHitRing) {
      this.soundHitRing.setAlpha(0.5 + 0.5 * Math.sin(time * 0.01));
    } else if (this.soundHitRing) {
      this.soundHitRing.setAlpha(1);
    }

    // ── Note spawning ─────────────────────────────────────────────────
    if (!this.soundComposingActive) {
      if (this.soundComposedPattern.length > 0) {
        this.updateComposedLooper(time, soundBaseSpeed, soundSpawnInterval, tY);
      } else if (time - this.soundLastSpawnAt >= soundSpawnInterval) {
        this.soundLastSpawnAt = time;
        this.soundNoteSpawnCount++;

        // E+: every 6th note in flow mode is a green hold note
        const isHold = this.arena.hasUpgrade('e') && this.soundFlowActive && (this.soundNoteSpawnCount % 6 === 0);
        const isRed = !isHold && Math.random() < 0.04;
        const noteType: NoteType = isRed ? 'red' : 'normal';

        let noteSprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
        if (isHold) {
          noteSprite = scene.add.rectangle(W + 20, tY, 30, 12, HOLD_COLOR, 0.85)
            .setStrokeStyle(1.5, 0x66ffcc, 0.9).setDepth(21);
        } else {
          noteSprite = scene.add.circle(W + 20, tY, 10, NOTE_COLORS[noteType], 0.85).setDepth(21);
        }

        this.soundNotes.push({
          sprite: noteSprite,
          x: W + 20,
          isRed,
          noteType,
          damage: NOTE_DMGS[noteType],
          isHold,
          holdActive: false,
        });
      }
    }

    // ── Move notes + process ──────────────────────────────────────────
    const pointerIsDown = scene.input.activePointer.isDown;
    for (let i = this.soundNotes.length - 1; i >= 0; i--) {
      const note = this.soundNotes[i];
      if (!this.soundComposingActive) {
        note.x -= soundBaseSpeed * delta / 1000;
        note.sprite.setX(note.x);
      }

      // Auto-hit during accelerando (non-hold notes only)
      if (!note.isHold && soundAccelActive && Math.abs(note.x - soundHitLineX) <= soundTolerance) {
        const autoDmg = Math.round(note.damage * 0.25);
        const autoCtx = { ...this.arena.buildPlayerContext(0, 0), lockCaster: (_d: number) => {}, quickShotActive: true };
        fireHitscan(autoCtx, autoDmg, note.isRed ? 0xff4444 : NOTE_COLORS[note.noteType], false);
        if (this.soundHitRing) {
          scene.tweens.killTweensOf(this.soundHitRing);
          this.soundHitRing.setScale(1);
          scene.tweens.add({ targets: this.soundHitRing, scaleX: 1.5, scaleY: 1.5, alpha: 0.8, duration: 80, yoyo: true, onComplete: () => { if (this.soundHitRing) this.soundHitRing.setScale(1); } });
        }
        const at = scene.add.text(note.sprite.x, tY - 16, note.isRed ? '🔴 AUTO!' : '🎵 AUTO', {
          fontSize: '9px', color: note.isRed ? '#ff4444' : '#cc88ff', fontFamily: 'Arial Black',
        }).setOrigin(0.5).setDepth(25);
        scene.tweens.add({ targets: at, y: at.y - 14, alpha: 0, duration: 600, onComplete: () => at.destroy() });
        note.sprite.destroy();
        this.soundNotes.splice(i, 1);
        continue;
      }

      // E+: green hold note processing
      if (note.isHold && Math.abs(note.x - soundHitLineX) <= soundTolerance * 1.5) {
        if (pointerIsDown) {
          note.holdActive = true;
          this.soundHoldMissHandled = false;
          this.soundHoldBeamAccum += delta;
          if (this.soundHoldBeamAccum >= 100) {
            this.soundHoldBeamAccum -= 100;
            const nearest = this.findNearestEnemy();
            if (nearest) {
              nearest.takeDamage(3);
              this.arena.spawnHitFlash(nearest.x, nearest.y, 0x66ffcc);
            }
          }
          // Draw beam
          const beamTarget = this.findNearestEnemy();
          if (beamTarget) {
            if (!this.soundHoldBeamGraphic || !this.soundHoldBeamGraphic.active) {
              this.soundHoldBeamGraphic = scene.add.graphics().setDepth(4);
            }
            this.soundHoldBeamGraphic.clear();
            this.soundHoldBeamGraphic.lineStyle(3, 0x66ffcc, 0.85);
            this.soundHoldBeamGraphic.lineBetween(player.x, player.y, beamTarget.x, beamTarget.y);
          }
        } else if (note.holdActive && !this.soundHoldMissHandled) {
          this.soundHoldMissHandled = true;
          this.soundSelfSlowUntil = time + 3000;
          player.applySelfDamage(10);
          this.arena.showFloatingText(player.x, player.y - 30, '♪ HOLD MISSED -10', '#ff4444');
          if (this.soundHoldBeamGraphic) { this.soundHoldBeamGraphic.destroy(); this.soundHoldBeamGraphic = null; }
        }
      }

      // Note fell off left edge
      if (!this.soundComposingActive && note.x < -20) {
        if (note.isHold) {
          if (!note.holdActive && !this.soundHoldMissHandled) {
            this.soundSelfSlowUntil = time + 3000;
            player.applySelfDamage(10);
            this.arena.showFloatingText(player.x, player.y - 30, '♪ HOLD MISSED -10', '#ff4444');
          }
          if (this.soundHoldBeamGraphic) { this.soundHoldBeamGraphic.destroy(); this.soundHoldBeamGraphic = null; }
        } else if (this.soundFlowActive) {
          // Flow penalty — consume accidental or take damage
          if (this.soundAccidentals > 0) {
            this.soundAccidentals--;
            this.arena.showFloatingText(player.x, player.y - 30, '♪ SAVED!', '#ffaadd');
          } else {
            player.applySelfDamage(5);
            this.arena.spawnHitFlash(player.x, player.y, 0xff3333);
            const lt = scene.add.text(player.x, player.y - 30, '♪ FLOW -5', {
              fontSize: '10px', color: '#ff4444', fontFamily: 'Arial Black',
            }).setOrigin(0.5).setDepth(12);
            scene.tweens.add({ targets: lt, y: lt.y - 18, alpha: 0, duration: 900, onComplete: () => lt.destroy() });
          }
        }
        if (this.soundNoteStreak > 0) this.soundNoteStreak = 0;
        note.sprite.destroy();
        this.soundNotes.splice(i, 1);
        continue;
      }
    }

    // Clear beam if no active hold note
    const hasActiveHold = this.soundNotes.some(n =>
      n.isHold && n.holdActive && Math.abs(n.x - soundHitLineX) <= soundTolerance * 1.5 && pointerIsDown
    );
    if (!hasActiveHold && this.soundHoldBeamGraphic?.active) {
      this.soundHoldBeamGraphic.clear();
    }

    // ── Star screech tracking ─────────────────────────────────────────
    if (this.soundScreechIsStar && time < this.soundScreechExpiry) {
      const nearest = this.findNearestEnemy();
      if (nearest) {
        const dx = nearest.x - this.soundScreechX;
        const dy = nearest.y - this.soundScreechY;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const moveSpeed = 40 * delta / 1000;
        this.soundScreechX += (dx / d) * moveSpeed;
        this.soundScreechY += (dy / d) * moveSpeed;
      }
      if (this.soundScreechStarGraphic?.active) {
        this.soundScreechStarGraphic.clear();
        this.drawStar(this.soundScreechStarGraphic, this.soundScreechX, this.soundScreechY);
      }
    }

    // ── Player screech barrier damages enemies ────────────────────────
    if (time < this.soundScreechExpiry) {
      const barrierDmg = this.soundScreechRed ? 25 : 15;
      const screechHits: Fighter[] = [];
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        const sd = Phaser.Math.Distance.Between(this.soundScreechX, this.soundScreechY, t.x, t.y);
        if (sd <= 88) screechHits.push(t);
      }
      if (screechHits.length > 0) {
        this.soundScreechTickAccum += delta;
        if (this.soundScreechTickAccum >= 500) {
          this.soundScreechTickAccum -= 500;
          for (const t of screechHits) {
            t.takeDamage(barrierDmg);
            this.arena.spawnHitFlash(t.x, t.y, this.soundScreechRed ? 0xff3333 : 0xff66cc);
          }
        }
      } else {
        this.soundScreechTickAccum = 0;
      }
    } else if (this.soundScreechExpiry > 0 && time >= this.soundScreechExpiry) {
      if (this.soundScreechSprite) { this.soundScreechSprite.destroy(); this.soundScreechSprite = null; }
      if (this.soundScreechStarGraphic) { this.soundScreechStarGraphic.destroy(); this.soundScreechStarGraphic = null; }
      this.soundScreechExpiry = 0;
    }

    // ── NPC slow from blue notes ──────────────────────────────────────
    if (time < this.soundNpcSlowUntil) {
      this.arena.applyNpcSpeedMult(0.7);
    }

    // ── HUD update ────────────────────────────────────────────────────
    if (this.soundStreakText) {
      if (soundAccelActive) {
        const remSec = ((this.soundAccelerandoUntil - time) / 1000).toFixed(1);
        this.soundStreakText.setText(`🎶 ${remSec}s`).setColor('#ffaaff');
      } else {
        this.soundStreakText.setText(`🎵 ${this.soundNoteStreak}`).setColor('#ffaadd');
      }
    }
    this.updateAccidentalHUD();
  }

  private updateNpcScreech(time: number, delta: number): void {
    const { player } = this.arena;
    if (time < this.npcSoundScreechExpiry) {
      const npcBDmg = this.npcSoundScreechRed ? 25 : 15;
      const nd = Phaser.Math.Distance.Between(this.npcSoundScreechX, this.npcSoundScreechY, player.x, player.y);
      if (nd <= 88) {
        this.npcSoundScreechTickAccum += delta;
        if (this.npcSoundScreechTickAccum >= 500) {
          this.npcSoundScreechTickAccum -= 500;
          player.takeDamage(npcBDmg);
          this.arena.spawnHitFlash(player.x, player.y, this.npcSoundScreechRed ? 0xff3333 : 0xff66cc);
        }
      } else {
        this.npcSoundScreechTickAccum = 0;
      }
    } else if (this.npcSoundScreechSprite && time >= this.npcSoundScreechExpiry) {
      this.npcSoundScreechSprite.destroy();
      this.npcSoundScreechSprite = null;
    }
  }

  // Called from ArenaScene's npcCastId reaction block
  handleNpcCast(castId: string | null, time: number): void {
    const { scene } = this.arena;
    if (castId === 'screech-barrier') {
      const px = this.arena.player.x, py = this.arena.player.y;
      this.npcSoundScreechX = px;
      this.npcSoundScreechY = py;
      this.npcSoundScreechExpiry = time + 5000;
      this.npcSoundScreechRed = false;
      this.npcSoundScreechTickAccum = 0;
      if (this.npcSoundScreechSprite) this.npcSoundScreechSprite.destroy();
      this.npcSoundScreechSprite = scene.add.circle(px, py, 80, 0xff66cc, 0).setDepth(3);
      this.npcSoundScreechSprite.setStrokeStyle(3, 0xff66cc, 0.9);
      scene.tweens.add({ targets: this.npcSoundScreechSprite, alpha: 0.12, yoyo: true, repeat: -1, duration: 600 });
    }
    if (castId === 'sound-grapple') {
      const { npc } = this.arena;
      const sgdx = this.arena.player.x - npc.x;
      const sgdy = this.arena.player.y - npc.y;
      const sglen = Math.sqrt(sgdx * sgdx + sgdy * sgdy) || 1;
      const sgspeed = 1200;
      const sgTravel = Math.min(350, (sglen / sgspeed) * 1000);
      const sgbody = npc.body as Phaser.Physics.Arcade.Body;
      sgbody.setVelocity((sgdx / sglen) * sgspeed, (sgdy / sglen) * sgspeed);
      scene.time.delayedCall(sgTravel, () => {
        if (npc.active) sgbody.setVelocity(0, 0);
      });
    }
    if (castId === 'rhythm-shot') {
      fireHitscan(this.arena.buildNpcContext(this.arena.player.x, this.arena.player.y), 25, 0xff66cc, false);
    }
  }

  // ── Composing mode ────────────────────────────────────────────────────

  private enterComposingMode(scene: Phaser.Scene, _time: number): void {
    this.soundComposingActive = true;
    this.soundComposurePoints = 20;
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '🎼 COMPOSING', '#ffaadd');
    this.buildComposePalette(scene);
  }

  private exitComposingMode(scene: Phaser.Scene, time: number): void {
    this.soundComposingActive = false;
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '🎼 EXIT COMPOSE', '#aaddff');
    this.teardownComposePalette();
    // Reset looper so composed pattern starts fresh
    this.soundComposingLooperIdx = 0;
    this.soundComposingLastSpawn = time;
  }

  private buildComposePalette(scene: Phaser.Scene): void {
    this.teardownComposePalette();
    const W = this.arena.width;
    const cy = 40;

    const panel = scene.add.rectangle(W / 2, cy, 300, 54, 0x110022, 0.95)
      .setStrokeStyle(2, 0xff66cc, 0.8).setDepth(50);
    this.soundComposePalette.push(panel);

    const types: NoteType[] = ['normal', 'red', 'blue', 'purple'];
    const costs = [1, 3, 2, 3] as const;
    const labels = ['N', 'R', 'B', 'P'] as const;
    const startX = W / 2 - 100;

    for (let i = 0; i < 4; i++) {
      const nx = startX + i * 60;
      const noteType = types[i];
      const cost = costs[i];
      const color = NOTE_COLORS[noteType];

      const circle = scene.add.circle(nx, cy - 6, 10, color, 0.9).setDepth(52);
      circle.setInteractive({ useHandCursor: true });
      scene.input.setDraggable(circle);

      const originX = nx, originY = cy - 6;
      const tY = this.getTrackY();

      circle.on('drag', (_ptr: unknown, dragX: number, dragY: number) => {
        circle.setPosition(dragX, dragY);
      });

      circle.on('dragend', () => {
        const px = circle.x, py = circle.y;
        if (Math.abs(py - tY) <= 20 && px > 20 && px < W - 20) {
          if (this.soundComposurePoints >= cost) {
            this.soundComposurePoints -= cost;
            const xFrac = px / W;
            const patIdx = this.soundComposedPattern.length;
            this.soundComposedPattern.push({ xFrac, type: noteType });

            const placed = scene.add.circle(px, tY, 10, color, 0.9)
              .setStrokeStyle(2, 0xffffff, 0.6).setDepth(22);
            placed.setInteractive({ useHandCursor: true });
            const entry = { sprite: placed, type: noteType, xFrac, patternIdx: patIdx };
            this.soundComposedNoteSprites.push(entry);

            // Right-click to remove placed note
            placed.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              if (ptr.rightButtonDown()) {
                this.soundComposedPattern.splice(entry.patternIdx, 1);
                this.soundComposedNoteSprites = this.soundComposedNoteSprites.filter(e => e !== entry);
                this.soundComposurePoints += COMPOSE_COSTS[entry.type];
                for (let j = 0; j < this.soundComposedNoteSprites.length; j++) {
                  this.soundComposedNoteSprites[j].patternIdx = j;
                }
                placed.destroy();
                this.refreshComposeLabel();
              }
            });

            this.refreshComposeLabel();
          } else {
            this.arena.showFloatingText(px, py - 20, '✖ NOT ENOUGH COMPOSURE', '#ff4444');
          }
        }
        circle.setPosition(originX, originY);
      });

      this.soundComposePalette.push(circle);

      const lbl = scene.add.text(nx, cy + 7, `${labels[i]}(${cost})`, {
        fontSize: '8px', color: '#ccaadd', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(52);
      this.soundComposePalette.push(lbl);
    }

    // Composure counter label
    const compLabel = scene.add.text(W / 2 + 120, cy, `${this.soundComposurePoints}/20`, {
      fontSize: '10px', color: '#ffaadd', fontFamily: 'Arial Black',
    }).setOrigin(1, 0.5).setDepth(52).setName('composeLabel');
    this.soundComposePalette.push(compLabel);
  }

  private refreshComposeLabel(): void {
    const lbl = this.soundComposePalette.find(
      o => (o as Phaser.GameObjects.Text).name === 'composeLabel'
    ) as Phaser.GameObjects.Text | undefined;
    if (lbl) lbl.setText(`${this.soundComposurePoints}/20`);
  }

  private teardownComposePalette(): void {
    for (const o of this.soundComposePalette) {
      if ((o as Phaser.GameObjects.Arc).active) (o as Phaser.GameObjects.Arc).destroy();
    }
    this.soundComposePalette = [];
  }

  private updateComposedLooper(time: number, _baseSpeed: number, spawnInterval: number, tY: number): void {
    if (this.soundComposedPattern.length === 0) return;
    const { scene } = this.arena;
    const W = this.arena.width;
    if (time - this.soundComposingLastSpawn >= spawnInterval) {
      this.soundComposingLastSpawn = time;
      const pattern = this.soundComposedPattern[this.soundComposingLooperIdx % this.soundComposedPattern.length];
      this.soundComposingLooperIdx++;
      const noteType = pattern.type;
      const isRed = noteType === 'red';
      const noteSprite = scene.add.circle(W + 20, tY, 10, NOTE_COLORS[noteType], 0.85).setDepth(21);
      this.soundNotes.push({
        sprite: noteSprite,
        x: W + 20,
        isRed,
        noteType,
        damage: NOTE_DMGS[noteType],
        isHold: false,
        holdActive: false,
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private flashHitRing(scene: Phaser.Scene, color: number): void {
    if (!this.soundHitRing) return;
    scene.tweens.killTweensOf(this.soundHitRing);
    this.soundHitRing.setScale(1);
    this.soundHitRing.setStrokeStyle(5, color, 1);
    scene.tweens.add({ targets: this.soundHitRing, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true, onComplete: () => {
      if (this.soundHitRing) {
        this.soundHitRing.setScale(1);
        this.soundHitRing.setStrokeStyle(3, this.soundFlowActive ? 0x4488ff : 0xff66cc, 0.9);
      }
    }});
  }

  private flashMissRing(scene: Phaser.Scene): void {
    if (!this.soundHitRing) return;
    scene.tweens.killTweensOf(this.soundHitRing);
    this.soundHitRing.setScale(1);
    this.soundHitRing.setStrokeStyle(5, 0xff3333, 1);
    scene.tweens.add({ targets: this.soundHitRing, duration: 300, onComplete: () => {
      if (this.soundHitRing) this.soundHitRing.setStrokeStyle(3, this.soundFlowActive ? 0x4488ff : 0xff66cc, 0.9);
    }});
  }

  private drawStar(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    const outerR = 80;
    const innerR = outerR * 0.4;
    const color = this.soundScreechRed ? 0xff3333 : 0xff66cc;
    gfx.lineStyle(3, color, 0.9);
    gfx.fillStyle(color, 0.08);
    gfx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI / 5) - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.strokePath();
    gfx.fillPath();
  }

  private findNearestEnemy(): Fighter | null {
    const player = this.arena.player;
    let nearest: Fighter | null = null;
    let nearestDist = Infinity;
    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
      if (d < nearestDist) { nearestDist = d; nearest = t; }
    }
    return nearest;
  }
}
