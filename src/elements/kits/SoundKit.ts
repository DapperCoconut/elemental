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
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
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
const NOTE_TOOLTIPS: Record<NoteType, string> = {
  normal: 'Normal — 20 dmg on hit.',
  red: 'Red — 30 dmg on hit (crit).',
  blue: 'Blue — 20 dmg + slows the enemy 30% for 2s.',
  purple: 'Purple — 20 dmg + grants you +25% speed for 3s.',
};
const HOLD_COLOR = 0x44ee88;
// Green hold notes are long sustained bars — you hold Click the whole time the
// bar overlaps the hit line. Width sets how long that hold window lasts.
const HOLD_NOTE_WIDTH = 170;
// Screech Barrier damages anyone inside this radius (a solid disc, matching the
// ~80px visual with a little body-size forgiveness) rather than a thin ring.
const SCREECH_RADIUS = 88;

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
  private soundGrappleCdWasReady = true;

  // ── E+ hold note ──────────────────────────────────────────────────────
  private soundHoldBeamGraphic: Phaser.GameObjects.Graphics | null = null;
  private soundHoldBeamAccum = 0;
  private soundSelfSlowUntil = 0;
  private soundHoldMissHandled = false;

  // ── Click+ composing ──────────────────────────────────────────────────
  private soundComposingActive = false;
  private soundRightPointerWasDown = false;
  private soundComposurePoints = 20;
  private soundComposedPattern: ComposedNote[] = [];
  private soundComposingLooperIdx = 0;
  private soundComposingLastSpawn = 0;
  private soundComposePalette: Phaser.GameObjects.GameObject[] = [];
  private soundComposedNoteSprites: Array<{
    sprite: Phaser.GameObjects.Rectangle;
    type: NoteType;
    xFrac: number;
    patternIdx: number;
  }> = [];

  // ── Q: Solo (guitar performance mode) ─────────────────────────────────
  private soundSoloActive = false;
  private soundSoloReturnX = 0;
  private soundSoloReturnY = 0;
  private soundSoloGraceUntil = 0;
  private soundSoloSprites: Phaser.GameObjects.GameObject[] = [];

  // ── Q+ crescendo speed (reserved for a future Solo+) ──────────────────
  private soundCrescendoSpeedUntil = 0;
  private soundCrescendoSpeedBonus = 0;

  // ── Purple/blue note effects ──────────────────────────────────────────
  private soundComposeSpeedUntil = 0;
  private soundComposeSpeedBonus = 0;
  private soundNpcSlowUntil = 0;

  // ── Harmony perk: sonic grenade + star buffs ──────────────────────────
  private harmonyGrenadeSprite: Phaser.GameObjects.Arc | null = null;
  private harmonyGrenadeX = 0;
  private harmonyGrenadeY = 0;
  private harmonyGrenadeExplodeAt = 0;
  private harmonyGrenadeAutoExplode = false;
  private harmonySongSpeedBonus = 0;
  private harmonySongSpeedUntil = 0;
  private harmonyMoveSpeedBonus = 0;
  private harmonyMoveSpeedUntil = 0;
  private harmonyStarAuraUntil = 0;
  private harmonyStarSprites: Array<{ sprite: Phaser.GameObjects.Arc; angle: number }> = [];

  constructor(private arena: SoundArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  getNoteStreak(): number { return this.soundNoteStreak; }
  isFlowActive(): boolean { return this.soundFlowActive; }
  isSoloActive(): boolean { return this.soundSoloActive; }
  isSelfSlowActive(time: number): boolean { return time < this.soundSelfSlowUntil; }
  isNpcSlowActive(time: number): boolean { return time < this.soundNpcSlowUntil; }
  getCrescendoSpeedBonus(): number { return this.soundCrescendoSpeedBonus; }
  getCrescendoSpeedUntil(): number { return this.soundCrescendoSpeedUntil; }
  getComposeSpeedBonus(): number { return this.soundComposeSpeedBonus; }
  getComposeSpeedUntil(): number { return this.soundComposeSpeedUntil; }
  isComposingActive(): boolean { return this.soundComposingActive; }
  getHarmonyMoveSpeedBonus(): number { return this.harmonyMoveSpeedBonus; }
  getHarmonyMoveSpeedUntil(): number { return this.harmonyMoveSpeedUntil; }

  // ── Reset ────────────────────────────────────────────────────────────

  reset(isSoundMatch = false): void {
    const { scene } = this.arena;

    for (const n of this.soundNotes) n.sprite.destroy();
    this.soundNotes = [];
    this.soundLastSpawnAt = 0;
    this.soundNoteStreak = 0;
    this.soundFlowActive = false;
    this.soundFlowCancelRequestedAt = 0;
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
    this.soundGrappleCdWasReady = true;

    if (this.soundHoldBeamGraphic) { this.soundHoldBeamGraphic.destroy(); this.soundHoldBeamGraphic = null; }
    this.soundHoldBeamAccum = 0;
    this.soundSelfSlowUntil = 0;
    this.soundHoldMissHandled = false;

    this.soundComposingActive = false;
    this.soundRightPointerWasDown = false;
    this.soundComposurePoints = 20;
    this.soundComposedPattern = [];
    this.soundComposingLooperIdx = 0;
    this.soundComposingLastSpawn = 0;
    for (const o of this.soundComposePalette) { if ((o as Phaser.GameObjects.Arc).active) (o as Phaser.GameObjects.Arc).destroy(); }
    this.soundComposePalette = [];
    for (const o of this.soundComposedNoteSprites) { if (o.sprite.active) o.sprite.destroy(); }
    this.soundComposedNoteSprites = [];

    this.soundSoloActive = false;
    this.soundSoloReturnX = 0;
    this.soundSoloReturnY = 0;
    this.soundSoloGraceUntil = 0;
    for (const s of this.soundSoloSprites) s.destroy();
    this.soundSoloSprites = [];

    this.soundCrescendoSpeedUntil = 0;
    this.soundCrescendoSpeedBonus = 0;
    this.soundComposeSpeedUntil = 0;
    this.soundComposeSpeedBonus = 0;
    this.soundNpcSlowUntil = 0;

    if (this.harmonyGrenadeSprite) { this.harmonyGrenadeSprite.destroy(); this.harmonyGrenadeSprite = null; }
    this.harmonyGrenadeExplodeAt = 0;
    this.harmonySongSpeedBonus = 0;
    this.harmonySongSpeedUntil = 0;
    this.harmonyMoveSpeedBonus = 0;
    this.harmonyMoveSpeedUntil = 0;
    this.harmonyStarAuraUntil = 0;
    for (const s of this.harmonyStarSprites) s.sprite.destroy();
    this.harmonyStarSprites = [];

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
    const tY = this.getTrackY();

    // ── Click+: Composing mode (right-click to toggle) ─────────────────
    if (this.arena.hasUpgrade('click')) {
      const rightJustDown = pointer.rightButtonDown() && !this.soundRightPointerWasDown;
      if (rightJustDown) {
        if (!this.soundComposingActive) {
          this.enterComposingMode(scene, time);
        } else {
          this.exitComposingMode(scene, time);
          if (this.soundComposedPattern.length > 0) {
            this.arena.showFloatingText(player.x, player.y - 40, '🎵 Pattern saved', '#ffaadd');
          }
        }
      }

      // While composing, skip other input
      if (this.soundComposingActive) {
        this.soundPointerWasDown = pointer.isDown;
        this.soundRightPointerWasDown = pointer.rightButtonDown();
        return;
      }
    }

    // ── Click: rhythm hit or miss ─────────────────────────────────────
    const soundClickJustDown = pointer.isDown && !this.soundPointerWasDown;
    if (soundClickJustDown && time - this.soundLastClickTime >= 200) {
      this.soundLastClickTime = time;
      const hitNote = this.soundNotes.find(n => !n.isHold && Math.abs(n.x - soundHitLineX) <= soundTolerance);
      if (hitNote) {
        // During Solo, hits auto-aim the nearest enemy instead of the cursor.
        let aimX = mouseX, aimY = mouseY;
        if (this.soundSoloActive) {
          const tgt = this.findNearestEnemy();
          if (tgt) { aimX = tgt.x; aimY = tgt.y; }
        }
        const hitCtx = { ...this.arena.buildPlayerContext(aimX, aimY), lockCaster: (_d: number) => {}, quickShotActive: true };
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
      } else if (this.isHoldBarOverLine(soundHitLineX, soundTolerance)) {
        // Pressing while a green hold bar covers the line begins a hold — not a miss.
      } else {
        // Miss — consume accidental, end a solo, or take damage
        if (this.soundAccidentals > 0) {
          this.soundAccidentals--;
          this.arena.showFloatingText(player.x, player.y - 30, '♪ SAVED!', '#ffaadd');
        } else if (this.soundSoloActive) {
          this.endSolo(time);
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
    this.soundRightPointerWasDown = pointer.rightButtonDown();

    // While performing a Solo, only Q responds (to end it early) — the
    // performer is locked into the rhythm and can't Flow/Screech/Grapple.
    if (this.soundSoloActive) {
      if (Phaser.Input.Keyboard.JustDown(qKey)) this.endSolo(time);
      return;
    }

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
          this.soundScreechSprite = scene.add.circle(mouseX, mouseY, SCREECH_RADIUS, bc, 0.1).setDepth(3);
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

    // ── F: Sonic Grapple or Sonic Grenade (Harmony perk) ──────────────
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (player.castAbility('sound-grapple', this.arena.buildPlayerContext(mouseX, mouseY))) {
        // Grant accidental
        if (this.soundAccidentals < 3) {
          this.soundAccidentals++;
          this.arena.showFloatingText(player.x, player.y - 40, '♪ +1 ACCIDENTAL', '#ffaadd');
        }

        // Check for perfect note timing (shared by both modes)
        const matchedNote = this.soundNotes.find(n => Math.abs(n.x - soundHitLineX) <= soundTolerance * 1.5);
        const captureExplodes = matchedNote != null;
        if (captureExplodes && matchedNote) {
          this.soundNoteStreak++;
          matchedNote.sprite.destroy();
          const mi = this.soundNotes.indexOf(matchedNote);
          if (mi !== -1) this.soundNotes.splice(mi, 1);
        }

        if (this.arena.hasPerk('player', 'harmony')) {
          // ── Harmony: sonic grenade ──────────────────────────────
          const gx = mouseX, gy = mouseY;
          const gdx = gx - player.x;
          const gdy = gy - player.y;
          const glen = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
          const travelMs = Math.max(100, Math.min(400, (glen / 1200) * 1000));

          // Destroy any existing grenade
          if (this.harmonyGrenadeSprite) { this.harmonyGrenadeSprite.destroy(); this.harmonyGrenadeSprite = null; }
          const grenSprite = scene.add.circle(player.x, player.y, 8, 0xff99ff, 0.9).setDepth(6);
          grenSprite.setStrokeStyle(2, 0xffffff, 0.7);
          this.harmonyGrenadeSprite = grenSprite;

          this.arena.showFloatingText(player.x, player.y - 30, captureExplodes ? '🎶 SONIC GRENADE!!' : '🎶 SONIC GRENADE', '#ff99ff');

          scene.tweens.add({
            targets: grenSprite,
            x: gx, y: gy,
            duration: travelMs,
            ease: 'Linear',
            onComplete: () => {
              if (!player.active) return;
              this.harmonyGrenadeX = gx;
              this.harmonyGrenadeY = gy;
              // Note-timed: auto-explode immediately; otherwise wait 2s
              const delay = captureExplodes ? 0 : 2000;
              this.harmonyGrenadeExplodeAt = scene.time.now + delay;
              if (delay > 0) {
                // Pulse while waiting
                if (grenSprite.active) {
                  scene.tweens.add({ targets: grenSprite, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
                }
              }
            },
          });
        } else {
          // ── Standard grapple ────────────────────────────────────
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

          if (captureExplodes) {
            this.soundFGrappleExplodes = true;
            this.arena.showFloatingText(player.x, player.y - 30, '🎵 SONIC GRAPPLE!', '#ff88cc');
          } else {
            this.soundFGrappleExplodes = false;
          }

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
            }
          });
        }
      }
    }

    // ── Q: Solo — enter the guitar performance (end is handled above) ──
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (player.getCooldownRatio('solo') >= 1) {
        player.triggerCooldown('solo');
        this.startSolo(scene, time);
      }
    }
  }

  // ── Q: Solo ────────────────────────────────────────────────────────────

  private startSolo(scene: Phaser.Scene, time: number): void {
    const { player } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;

    // Cancel Flow Mode instantly so the speed bonuses don't stack.
    if (this.soundFlowActive || this.soundFlowCancelRequestedAt > 0) {
      this.soundFlowActive = false;
      this.soundFlowCancelRequestedAt = 0;
      if (this.soundHitRing) this.soundHitRing.setStrokeStyle(3, 0xff66cc, 0.9);
    }

    // Clear the track and grant a 2s grace before notes start scrolling in.
    for (const n of this.soundNotes) n.sprite.destroy();
    this.soundNotes = [];
    this.soundSoloGraceUntil = time + 2000;

    this.soundSoloActive = true;
    this.soundSoloReturnX = player.x;
    this.soundSoloReturnY = player.y;

    // Disco ball hangs above; the stage sits below it, centered.
    const ballX = W / 2;
    const ballY = H * 0.30;
    const stageY = H * 0.55;
    const px = ballX;
    const py = stageY - 18;

    // Teleport the performer onto the stage.
    player.setPosition(px, py);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(px, py);
    body.setVelocity(0, 0);

    // Spotlight cone from the ball down to the stage.
    const spot = scene.add.graphics().setDepth(1);
    spot.fillStyle(0xffffff, 0.07);
    spot.fillTriangle(ballX, ballY, ballX - 95, stageY + 12, ballX + 95, stageY + 12);
    this.soundSoloSprites.push(spot);

    // Stage platform.
    const stage = scene.add.rectangle(ballX, stageY, 150, 26, 0x221133, 0.9)
      .setStrokeStyle(2, 0xff66cc, 0.8).setDepth(2);
    this.soundSoloSprites.push(stage);

    // Hanging cord + disco ball with facet lines.
    const cord = scene.add.rectangle(ballX, ballY - 42, 2, 40, 0x666666, 0.8).setDepth(5);
    this.soundSoloSprites.push(cord);
    const ball = scene.add.circle(ballX, ballY, 22, 0xccccff, 0.95).setDepth(6);
    ball.setStrokeStyle(2, 0xffffff, 0.8);
    this.soundSoloSprites.push(ball);
    const facets = scene.add.graphics().setDepth(7);
    facets.lineStyle(1, 0x8888aa, 0.7);
    for (let i = -2; i <= 2; i++) facets.lineBetween(ballX - 21, ballY + i * 8, ballX + 21, ballY + i * 8);
    this.soundSoloSprites.push(facets);
    scene.tweens.add({ targets: [ball, facets], alpha: 0.55, yoyo: true, repeat: -1, duration: 300 });

    // Sparkle dots twinkling around the ball.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sp = scene.add.circle(ballX + Math.cos(a) * 40, ballY + Math.sin(a) * 40, 3, 0xff66cc, 0.9).setDepth(4);
      this.soundSoloSprites.push(sp);
      scene.tweens.add({ targets: sp, alpha: 0.2, yoyo: true, repeat: -1, duration: 200 + i * 60 });
    }

    // Guitar in the performer's hands.
    const guitar = scene.add.text(px + 15, py, '🎸', { fontSize: '20px' }).setOrigin(0.5).setDepth(11);
    this.soundSoloSprites.push(guitar);

    this.arena.showFloatingText(px, py - 44, '🎸 SOLO!', '#ffdd44');
  }

  private endSolo(time: number): void {
    if (!this.soundSoloActive) return;
    this.soundSoloActive = false;

    for (const s of this.soundSoloSprites) s.destroy();
    this.soundSoloSprites = [];

    // Return to where the solo began.
    const { player } = this.arena;
    player.setPosition(this.soundSoloReturnX, this.soundSoloReturnY);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.soundSoloReturnX, this.soundSoloReturnY);
    body.setVelocity(0, 0);

    this.arena.showFloatingText(player.x, player.y - 40, '🎸 ENCORE!', '#ffdd44');
    void time;
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

    // Reset grace-note refresh counter each time the grapple cooldown becomes ready
    const grappleCdReady = player.getCooldownRatio('sound-grapple') >= 1;
    if (grappleCdReady && !this.soundGrappleCdWasReady) {
      this.soundGrappleRefreshes = 0;
    }
    this.soundGrappleCdWasReady = grappleCdReady;
    const harmonyBoost = time < this.harmonySongSpeedUntil ? (1 + this.harmonySongSpeedBonus) : 1;
    // Solo runs the track 3× faster than the normal tempo (240 / 1100ms).
    const soundBaseSpeed = (this.soundSoloActive ? 720 : (this.soundFlowActive ? 360 : 240)) * harmonyBoost;
    const soundSpawnInterval = this.soundSoloActive ? 367 : (this.soundFlowActive ? 550 : 1100);
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

    // ── Note spawning (suppressed during the Solo grace window) ───────
    if (!this.soundComposingActive && time >= this.soundSoloGraceUntil) {
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
          noteSprite = scene.add.rectangle(W + 20, tY, HOLD_NOTE_WIDTH, 20, HOLD_COLOR, 0.7)
            .setStrokeStyle(2, 0x66ffcc, 0.95).setDepth(21);
        } else {
          noteSprite = this.createRhythmNoteSprite(W + 20, tY, noteType);
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

      // E+: green hold note processing — holdable while the long bar overlaps the hit line
      const holdHalfW = HOLD_NOTE_WIDTH / 2;
      const holdOverLine = note.x - holdHalfW - soundTolerance <= soundHitLineX
        && soundHitLineX <= note.x + holdHalfW + soundTolerance;
      if (note.isHold && holdOverLine) {
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
        } else if (this.soundSoloActive) {
          // Solo: a dropped note ends the performance unless an accidental saves it.
          if (this.soundAccidentals > 0) {
            this.soundAccidentals--;
            this.arena.showFloatingText(player.x, player.y - 30, '♪ SAVED!', '#ffaadd');
          } else {
            this.endSolo(time);
          }
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
      n.isHold && n.holdActive && pointerIsDown
      && n.x - HOLD_NOTE_WIDTH / 2 - soundTolerance <= soundHitLineX
      && soundHitLineX <= n.x + HOLD_NOTE_WIDTH / 2 + soundTolerance
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
        if (sd <= SCREECH_RADIUS) screechHits.push(t);
      }
      if (screechHits.length > 0) {
        this.soundScreechTickAccum += delta;
        if (this.soundScreechTickAccum >= 500) {
          this.soundScreechTickAccum -= 500;
          for (const t of screechHits) {
            t.takeDamage(barrierDmg, { source: this.soundScreechSprite ?? undefined, sourceX: this.soundScreechX, sourceY: this.soundScreechY });
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

    // ── Harmony: grenade detonation ───────────────────────────────────
    if (this.harmonyGrenadeExplodeAt > 0 && time >= this.harmonyGrenadeExplodeAt) {
      this.harmonyGrenadeExplodeAt = 0;
      const ex = this.harmonyGrenadeX, ey = this.harmonyGrenadeY;
      if (this.harmonyGrenadeSprite) { this.harmonyGrenadeSprite.destroy(); this.harmonyGrenadeSprite = null; }
      const ring = scene.add.circle(ex, ey, 10, 0xff99ff, 0.9).setDepth(4);
      scene.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
      const core = scene.add.circle(ex, ey, 6, 0xffffff, 0.95).setDepth(5);
      scene.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 180, onComplete: () => core.destroy() });

      let hitAny = false;
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(ex, ey, t.x, t.y) <= 100) {
          t.takeDamage(20);
          this.arena.spawnHitFlash(t.x, t.y, 0xff99ff);
          hitAny = true;
        }
      }

      if (hitAny) {
        // Stack speed bonuses
        this.harmonySongSpeedBonus += 0.15;
        this.harmonySongSpeedUntil = time + 20000;
        this.harmonyMoveSpeedBonus += 0.15;
        this.harmonyMoveSpeedUntil = time + 20000;
        this.harmonyStarAuraUntil = time + 20000;

        // Spawn 5 orbiting star sprites
        for (const s of this.harmonyStarSprites) s.sprite.destroy();
        this.harmonyStarSprites = [];
        for (let i = 0; i < 5; i++) {
          const sprite = scene.add.circle(player.x, player.y, 5, 0xffee88, 0.9).setDepth(5);
          sprite.setStrokeStyle(1, 0xffffff, 0.5);
          this.harmonyStarSprites.push({ sprite, angle: (i / 5) * Math.PI * 2 });
        }
        this.arena.showFloatingText(ex, ey - 30, `🌟 HARMONY x${(this.harmonySongSpeedBonus / 0.15).toFixed(0)}`, '#ffeecc');
        // F+ grace note refresh
        if (this.arena.hasUpgrade('f') && this.soundGrappleRefreshes < 3) {
          this.soundGrappleRefreshes++;
          player.resetCooldown('sound-grapple');
          this.arena.showFloatingText(ex, ey - 50, `✨ GRACE NOTE ${this.soundGrappleRefreshes}/3`, '#ffeecc');
        }
      }
    }

    // ── Harmony: star aura orbit + buff expiry ─────────────────────────
    if (this.harmonyStarAuraUntil > 0) {
      if (time >= this.harmonyStarAuraUntil) {
        this.harmonyStarAuraUntil = 0;
        this.harmonySongSpeedBonus = 0;
        this.harmonySongSpeedUntil = 0;
        this.harmonyMoveSpeedBonus = 0;
        this.harmonyMoveSpeedUntil = 0;
        for (const s of this.harmonyStarSprites) s.sprite.destroy();
        this.harmonyStarSprites = [];
      } else {
        for (const s of this.harmonyStarSprites) {
          s.angle += delta * 0.003;
          s.sprite.setPosition(
            player.x + Math.cos(s.angle) * 30,
            player.y + Math.sin(s.angle) * 30,
          );
        }
      }
    }

    // ── HUD update ────────────────────────────────────────────────────
    if (this.soundStreakText) {
      if (this.soundSoloActive) {
        this.soundStreakText.setText('🎸 SOLO').setColor('#ffdd44');
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
      if (nd <= SCREECH_RADIUS) {
        this.npcSoundScreechTickAccum += delta;
        if (this.npcSoundScreechTickAccum >= 500) {
          this.npcSoundScreechTickAccum -= 500;
          player.takeDamage(npcBDmg, { source: this.npcSoundScreechSprite ?? undefined, sourceX: this.npcSoundScreechX, sourceY: this.npcSoundScreechY });
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
      this.npcSoundScreechSprite = scene.add.circle(px, py, SCREECH_RADIUS, 0xff66cc, 0.1).setDepth(3);
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
    // Destroy preview dots placed on the track during composing
    for (const o of this.soundComposedNoteSprites) {
      if (o.sprite.active) o.sprite.destroy();
    }
    this.soundComposedNoteSprites = [];
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

    const tooltip = scene.add.text(W / 2, cy + 34, '', {
      fontSize: '9px', color: '#ffddee', fontFamily: 'Arial', align: 'center',
      wordWrap: { width: 280 },
    }).setOrigin(0.5, 0).setDepth(53).setVisible(false).setName('composeTooltip');
    this.soundComposePalette.push(tooltip);

    const types: NoteType[] = ['normal', 'red', 'blue', 'purple'];
    const costs = [1, 3, 2, 3] as const;
    const labels = ['N', 'R', 'B', 'P'] as const;
    const startX = W / 2 - 100;

    for (let i = 0; i < 4; i++) {
      const nx = startX + i * 60;
      const noteType = types[i];
      const cost = costs[i];
      const color = NOTE_COLORS[noteType];

      const token = scene.add.rectangle(nx, cy - 6, 20, 18, color, 0.9).setDepth(52);
      token.setInteractive({ useHandCursor: true });
      scene.input.setDraggable(token);

      token.on('pointerover', () => tooltip.setText(NOTE_TOOLTIPS[noteType]).setVisible(true));
      token.on('pointerout', () => tooltip.setVisible(false));

      const originX = nx, originY = cy - 6;
      const tY = this.getTrackY();

      token.on('drag', (_ptr: unknown, dragX: number, dragY: number) => {
        token.setPosition(dragX, dragY);
      });

      token.on('dragend', () => {
        const px = token.x, py = token.y;
        if (Math.abs(py - tY) <= 20 && px > 20 && px < W - 20) {
          if (this.soundComposurePoints >= cost) {
            this.soundComposurePoints -= cost;
            const xFrac = px / W;
            const patIdx = this.soundComposedPattern.length;
            this.soundComposedPattern.push({ xFrac, type: noteType });

            const placed = scene.add.rectangle(px, tY, 24, 20, color, 0.9)
              .setStrokeStyle(2, 0xffffff, 0.6).setDepth(22);
            placed.setInteractive({ useHandCursor: true });
            const entry = { sprite: placed, type: noteType, xFrac, patternIdx: patIdx };
            this.soundComposedNoteSprites.push(entry);

            placed.on('pointerover', () => tooltip.setText(NOTE_TOOLTIPS[entry.type]).setVisible(true));
            placed.on('pointerout', () => tooltip.setVisible(false));

            // Left-click to remove placed note (right-click exits Composing Mode)
            placed.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              if (ptr.leftButtonDown()) {
                this.soundComposedPattern.splice(entry.patternIdx, 1);
                this.soundComposedNoteSprites = this.soundComposedNoteSprites.filter(e => e !== entry);
                this.soundComposurePoints += COMPOSE_COSTS[entry.type];
                for (let j = 0; j < this.soundComposedNoteSprites.length; j++) {
                  this.soundComposedNoteSprites[j].patternIdx = j;
                }
                placed.destroy();
                tooltip.setVisible(false);
                this.refreshComposeLabel();
              }
            });

            this.refreshComposeLabel();
          } else {
            this.arena.showFloatingText(px, py - 20, '✖ NOT ENOUGH COMPOSURE', '#ff4444');
          }
        }
        token.setPosition(originX, originY);
      });

      this.soundComposePalette.push(token);

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
    const W = this.arena.width;
    if (time - this.soundComposingLastSpawn >= spawnInterval) {
      this.soundComposingLastSpawn = time;
      const pattern = this.soundComposedPattern[this.soundComposingLooperIdx % this.soundComposedPattern.length];
      this.soundComposingLooperIdx++;
      const noteType = pattern.type;
      const isRed = noteType === 'red';
      const noteSprite = this.createRhythmNoteSprite(W + 20, tY, noteType);
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

  /** True while any green hold bar overlaps the hit line (so a press starts a hold). */
  private isHoldBarOverLine(hitLineX: number, tolerance: number): boolean {
    const halfW = HOLD_NOTE_WIDTH / 2;
    return this.soundNotes.some(n =>
      n.isHold
      && n.x - halfW - tolerance <= hitLineX
      && hitLineX <= n.x + halfW + tolerance
    );
  }

  /** The clickable rhythm notes — large rectangles that scroll toward the hit line. */
  private createRhythmNoteSprite(x: number, tY: number, noteType: NoteType): Phaser.GameObjects.Rectangle {
    return this.arena.scene.add.rectangle(x, tY, 26, 22, NOTE_COLORS[noteType], 0.85)
      .setStrokeStyle(1.5, 0xffffff, 0.55).setDepth(21);
  }

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
