import Phaser from 'phaser';
import { ACHIEVEMENTS, AchievementDef } from '../data/Achievements';
import { getSkinDef } from '../data/Skins';
import { findElementDef } from '../data/ElementRoster';
import * as PlayerData from '../data/PlayerData';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, ElementPortrait,
} from '../ui';
import { addHangingSign, drawPlank, WOOD } from '../ui/Woodwork';
import { addHoverLabel } from '../ui/SpeechBubble';
import { Music, Sfx } from '../audio';

const FLOOR_Y = 586;
/** Vitrine geometry: the glass case, the plinth under it, the plaque under that. */
const CASE_W = 150;
const CASE_H = 134;
const COLS = 3;
const COL_XS = [230, 480, 730];
/** Top of the glass for each shelf row. */
const ROW_TOPS = [94, 324];

/**
 * The trophy hall. Every achievement is a glass vitrine on a plinth; the skin it awards
 * stands inside — the actual character, lit from above once earned, a dark shape under a
 * padlock until then. A brass plaque names the feat and the skin, and the terms are
 * engraved beneath it.
 */
export class AchievementsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AchievementsScene' });
  }

  create(): void {
    Music.play('menu');
    const { width, height } = this.scale;

    const unlockedCount = ACHIEVEMENTS.filter((a) => PlayerData.isAchievementUnlocked(a.id)).length;
    this.paintHall(width, height);

    addHangingSign(this, {
      x: width / 2, y: 8, w: 340, h: 44, drop: 24, fontSize: 14,
      label: `TROPHY HALL   ·   ${unlockedCount} / ${ACHIEVEMENTS.length}`,
      accent: mix(C.gold, WOOD.paint, 0.4),
    });

    const back = () => this.scene.start('TitleScene');
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    ACHIEVEMENTS.forEach((ach, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      if (row >= ROW_TOPS.length) return;
      this.buildVitrine(ach, COL_XS[col], ROW_TOPS[row]);
    });

    this.add.text(width / 2, height - 14, 'EARN A FEAT  ·  WEAR ITS SKIN FROM THE CUSTOMIZE PAGE', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);
  }

  /** Wood panelling, a picture rail, a parquet floor, and the shelves the cases stand on. */
  private paintHall(width: number, height: number): void {
    const g = this.add.graphics().setDepth(DEPTH.backdrop);
    g.fillStyle(0x1a1410, 1); g.fillRect(0, 0, width, height);
    // Panelled wall: tall raised panels between stiles.
    let x = 0;
    let i = 0;
    while (x < width) {
      const w = 110;
      drawPlank(g, x, -4, w - 2, FLOOR_Y + 4, { seed: i * 2.7, vertical: true, lit: -0.42 });
      g.fillStyle(0x000000, 0.28); g.fillRoundedRect(x + 14, 30, w - 30, FLOOR_Y - 80, 4);
      g.lineStyle(1, WOOD.lit, 0.25); g.strokeRoundedRect(x + 18, 34, w - 38, FLOOR_Y - 88, 3);
      x += w;
      i++;
    }
    for (let k = 0; k < 10; k++) { g.fillStyle(0x000000, 0.06); g.fillRect(0, k * 12, width, 12); }
    drawPlank(g, 0, FLOOR_Y - 30, width, 9, { seed: 7, lit: 0.1 });
    // Parquet floor: herringbone-ish short boards.
    for (let y = FLOOR_Y, r = 0; y < height; y += 14, r++) {
      for (let bx = (r % 2) * 40 - 40; bx < width; bx += 80) {
        drawPlank(g, bx, y, 78, 13, { seed: r * 3.3 + bx * 0.01, lit: -0.5 - r * 0.04 });
      }
    }
    for (let k = 0; k < 18; k++) {
      g.fillStyle(0x000000, 0.045 * (1 - k / 18));
      g.fillRect(0, k * 5, width, 5); g.fillRect(k * 5, 0, 5, height);
      g.fillRect(width - k * 5 - 5, 0, 5, height); g.fillRect(0, height - k * 5 - 5, width, 5);
    }
    // Two long shelves the cases stand on.
    const shelves = this.add.graphics().setDepth(DEPTH.panel);
    for (const top of ROW_TOPS) {
      const y = top + CASE_H + 2;
      for (let k = 0; k < 6; k++) { shelves.fillStyle(0x000000, 0.1 * (1 - k / 6)); shelves.fillRect(120, y + 12 + k * 2, width - 240, 2); }
      drawPlank(shelves, 120, y, width - 240, 12, { seed: top, lit: 0.08 });
      shelves.fillStyle(WOOD.dark, 1); shelves.fillRect(120, y + 12, width - 240, 4);
      for (const bx of [150, width - 150]) {
        shelves.lineStyle(3, WOOD.iron, 1); shelves.beginPath(); shelves.moveTo(bx, y + 16); shelves.lineTo(bx, y + 40); shelves.lineTo(bx + 18, y + 16); shelves.strokePath();
      }
    }
  }

  /** One case: glass, plinth, the skin inside, the plaque, the engraving. */
  private buildVitrine(ach: AchievementDef, cx: number, top: number): void {
    const unlocked = PlayerData.isAchievementUnlocked(ach.id);
    const skin = ach.skinReward ? getSkinDef(ach.skinReward) : undefined;
    const el = skin ? findElementDef(skin.elementId) : undefined;
    const accent = unlocked ? (el?.color ?? C.gold) : C.steel;
    const left = cx - CASE_W / 2;
    const bottom = top + CASE_H;

    // Spotlight from above on an earned case.
    if (unlocked) {
      const light = this.add.graphics().setDepth(DEPTH.panel + 1);
      for (let k = 0; k < 10; k++) {
        light.fillStyle(mix(accent, 0xffffff, 0.5), 0.028 - k * 0.002);
        light.fillTriangle(cx - 10, top - 30, cx + 10, top - 30, cx, top + 20 + k * 14);
        light.fillTriangle(cx - 10 - k * 8, top + 20 + k * 14, cx + 10 + k * 8, top + 20 + k * 14, cx, top - 30);
      }
      this.tweens.add({ targets: light, alpha: { from: 0.75, to: 1 }, duration: 2000 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const lamp = this.add.graphics().setDepth(DEPTH.panel + 2);
      lamp.fillStyle(0x3b3a44, 1); lamp.fillRect(cx - 12, top - 36, 24, 6);
      lamp.fillStyle(0xffe9b0, 1); lamp.fillEllipse(cx, top - 29, 12, 4);
    }

    // The case.
    const g = this.add.graphics().setDepth(DEPTH.panel + 3);
    const paint = (hot: boolean): void => {
      g.clear();
      // Plinth.
      drawPlank(g, left - 6, bottom, CASE_W + 12, 10, { seed: cx, lit: hot ? 0.2 : 0.05 });
      g.fillStyle(WOOD.dark, 1); g.fillRect(left - 6, bottom + 10, CASE_W + 12, 4);
      // Velvet floor inside the case.
      g.fillStyle(unlocked ? mix(0x3a1020, accent, 0.25) : 0x1c1a20, 1); g.fillRect(left + 4, bottom - 14, CASE_W - 8, 14);
      g.fillStyle(0xffffff, 0.06); g.fillRect(left + 4, bottom - 14, CASE_W - 8, 2);
      // Glass: a dark backing, the pane with a tint, bright edges, a corner reflection.
      g.fillStyle(0x000000, unlocked ? 0.18 : 0.42); g.fillRect(left, top, CASE_W, CASE_H - 14);
      g.fillStyle(0xd6ecff, hot ? 0.14 : 0.09); g.fillRect(left, top, CASE_W, CASE_H - 14);
      g.lineStyle(2, mix(0xd6ecff, accent, 0.3), unlocked ? 0.9 : 0.5); g.strokeRect(left, top, CASE_W, CASE_H);
      g.lineStyle(1, 0xffffff, 0.35); g.lineBetween(left + 8, top + 8, left + 8, bottom - 20); g.lineBetween(left + 8, top + 8, left + 40, top + 8);
      g.fillStyle(0xffffff, 0.12); g.fillTriangle(left + CASE_W - 4, top + 4, left + CASE_W - 4, top + 50, left + CASE_W - 30, top + 4);
      // Brass frame corners.
      for (const [kx, ky] of [[left, top], [left + CASE_W, top], [left, bottom], [left + CASE_W, bottom]]) {
        g.fillStyle(0xc89a3c, unlocked ? 1 : 0.5); g.fillCircle(kx, ky, 3);
      }
      // Plaque.
      const py = bottom + 22;
      g.fillStyle(0x000000, 0.35); g.fillRoundedRect(left + 12, py - 10, CASE_W - 24, 30, 3);
      g.fillStyle(unlocked ? 0xc89a3c : 0x5a5a66, 1); g.fillRoundedRect(left + 10, py - 12, CASE_W - 20, 30, 3);
      g.lineStyle(1, unlocked ? 0x7a5a16 : 0x3a3a44, 1); g.strokeRoundedRect(left + 14, py - 8, CASE_W - 28, 22, 2);
      for (const [nx, ny] of [[left + 16, py - 10], [left + CASE_W - 16, py - 10], [left + 16, py + 16], [left + CASE_W - 16, py + 16]]) {
        g.fillStyle(0x3b3a44, 1); g.fillCircle(nx, ny, 1.6);
      }
      if (!unlocked) {
        // Padlock on the glass.
        g.fillStyle(0x15121a, 1); g.fillRoundedRect(cx - 11, top + CASE_H / 2 + 2, 22, 18, 3);
        g.fillStyle(0x8a8ab0, 1); g.fillRoundedRect(cx - 10, top + CASE_H / 2 + 3, 20, 16, 3);
        g.lineStyle(3.5, 0x8a8ab0, 1); g.beginPath(); g.arc(cx, top + CASE_H / 2 + 2, 7, Math.PI, 0); g.strokePath();
        g.fillStyle(0x15121a, 1); g.fillCircle(cx, top + CASE_H / 2 + 11, 2.4);
      }
    };
    paint(false);

    // The skin's character inside the glass — or, locked, a dark shape of it.
    if (skin && el) {
      const portrait = new ElementPortrait(this, {
        x: cx, y: top + (CASE_H - 14) / 2 + 2, w: CASE_W - 16, h: CASE_H - 30,
        elementId: skin.elementId, skinId: skin.id, mastered: false, muted: !unlocked,
        depth: DEPTH.panel + 4, scale: 0.72,
      });
      this.add.zone(cx, top, 1, 1).once('destroy', () => portrait.destroy());
      if (!unlocked) {
        this.add.text(cx + CASE_W / 2 - 18, top + 18, '?', { fontSize: '22px', fontFamily: FONT_DISPLAY, color: T.ghost }).setOrigin(0.5).setDepth(DEPTH.content);
      }
    }

    // Plaque text: the feat, then the skin it awards.
    this.add.text(cx, bottom + 16, `${ach.emoji}  ${ach.name.toUpperCase()}`, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: unlocked ? '#2a1a08' : '#1a1a22', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(cx, bottom + 29, skin ? `${skin.name}  ·  ${(el?.name ?? skin.elementId)} skin` : '', {
      fontSize: '8px', fontFamily: FONT_UI, color: unlocked ? '#4a3a1a' : '#2a2a34',
    }).setOrigin(0.5).setDepth(DEPTH.content);
    // The terms, engraved under the plaque.
    this.add.text(cx, bottom + 46, ach.description, {
      fontSize: '9.5px', fontFamily: FONT_UI, color: unlocked ? T.normal : T.faint, align: 'center', wordWrap: { width: CASE_W + 20 }, lineSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(DEPTH.content);
    this.add.text(cx, bottom + 82, unlocked ? '✦  EARNED' : 'LOCKED', {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: unlocked ? hex(mix(C.verdant, 0xffffff, 0.3)) : T.ghost, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    let label: Phaser.GameObjects.Container | null = null;
    const hit = this.add.rectangle(cx, top + CASE_H / 2, CASE_W, CASE_H, 0xffffff, 0).setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      paint(true);
      Sfx.play('ui-hover');
      label?.destroy();
      label = addHoverLabel(this, cx, top - 14, unlocked ? `${skin?.name ?? ach.name} — earned` : `Locked · ${ach.name}`, accent);
    });
    hit.on('pointerout', () => { paint(false); label?.destroy(); label = null; });
  }
}
