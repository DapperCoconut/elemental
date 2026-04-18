import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import {
  GAUNTLET_GROUPS,
  GAUNTLET_ELEMENTS,
  GauntletState,
  GAUNTLET_DIFFICULTY,
} from '../data/GauntletData';
import { MUTATIONS } from '../data/Mutations';

// Mutations excluded from gauntlet regular fights
const GAUNTLET_EXCLUDED_MUTATIONS = new Set(['boss', 'raid']);

interface ElementDef { id: string; name: string; emoji: string; color: number }

const ALL_ELEMENTS: ElementDef[] = [
  { id: 'fire',     name: 'Fire',     emoji: '🔥',  color: 0xff4400 },
  { id: 'water',    name: 'Water',    emoji: '💧',  color: 0x0088ff },
  { id: 'life',     name: 'Life',     emoji: '🌿',  color: 0x44cc44 },
  { id: 'air',      name: 'Air',      emoji: '💨',  color: 0xaaddff },
  { id: 'earth',    name: 'Earth',    emoji: '🪨',  color: 0x887755 },
  { id: 'oil',      name: 'Oil',      emoji: '🛢️', color: 0x664400 },
  { id: 'shadow',   name: 'Shadow',   emoji: '🌑',  color: 0x550077 },
  { id: 'ice',      name: 'Ice',      emoji: '🧊',  color: 0x88ccff },
  { id: 'growth',   name: 'Growth',   emoji: '🦠',  color: 0x88bb22 },
  { id: 'crystal',  name: 'Crystal',  emoji: '💎',  color: 0x44eeff },
  { id: 'soul',     name: 'Soul',     emoji: '👻',  color: 0xccaaff },
  { id: 'hunt',     name: 'Hunt',     emoji: '🐺',  color: 0xcc4400 },
  { id: 'sand',     name: 'Time',     emoji: '⏳',  color: 0xffdd44 },
  { id: 'gravity',  name: 'Gravity',  emoji: '🌌',  color: 0x8844cc },
  { id: 'creation', name: 'Creation', emoji: '⚒️', color: 0xcc6622 },
];

const BASE_IDS = new Set(['fire', 'water', 'life', 'air', 'earth']);

export class GauntletSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GauntletSelectScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Background
    this.add.rectangle(cx, cy, width, height, 0x0d0d1a);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    // Title
    this.add.text(cx, 52, 'GAUNTLETS', {
      fontSize: '52px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffaa00',
      stroke: '#884400',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 100, 'Survive 5 battles + a boss without dying', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    const completedGauntlets = PlayerData.getCompletedGauntlets();

    // Gauntlet cards (5 base elements)
    const cardW = 148;
    const cardH = 200;
    const cardGap = 18;
    const totalW = GAUNTLET_ELEMENTS.length * cardW + (GAUNTLET_ELEMENTS.length - 1) * cardGap;
    const startX = cx - totalW / 2 + cardW / 2;

    GAUNTLET_ELEMENTS.forEach((el, i) => {
      const bx = startX + i * (cardW + cardGap);
      const by = cy + 20;
      const isCompleted = completedGauntlets.includes(el.id);

      const card = this.add
        .rectangle(bx, by, cardW, cardH, 0x111122, 0.9)
        .setStrokeStyle(2, el.color)
        .setInteractive({ useHandCursor: true });

      this.add.text(bx, by - 55, el.emoji, { fontSize: '48px' }).setOrigin(0.5);
      this.add.text(bx, by + 8, el.name.toUpperCase(), {
        fontSize: '18px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      const pool = GAUNTLET_GROUPS[el.id];
      this.add.text(bx, by + 34, pool.map((e) => {
        const found = GAUNTLET_ELEMENTS.find((ge) => ge.id === e);
        return found?.emoji ?? e;
      }).join(' '), { fontSize: '16px' }).setOrigin(0.5);

      if (isCompleted) {
        const badge = this.add.text(bx, by - 80, '★ CLEARED', {
          fontSize: '13px',
          fontFamily: '"Arial Black", sans-serif',
          color: '#ffcc00',
          stroke: '#664400',
          strokeThickness: 3,
        }).setOrigin(0.5);
        this.tweens.add({ targets: badge, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
      }

      card
        .on('pointerover', () => { card.setStrokeStyle(3, 0xffffff); card.setAlpha(1); })
        .on('pointerout',  () => { card.setStrokeStyle(2, el.color);  card.setAlpha(0.9); })
        .on('pointerdown', () => this.showElementPicker(el.id));
    });

    // Back button
    const backBtn = this.add
      .rectangle(60, 32, 100, 36, 0x221100, 0.85)
      .setStrokeStyle(1, 0x664422)
      .setInteractive({ useHandCursor: true });
    this.add.text(60, 32, '← BACK', {
      fontSize: '14px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    backBtn
      .on('pointerover', () => { backBtn.setStrokeStyle(2, 0xffffff); })
      .on('pointerout',  () => { backBtn.setStrokeStyle(1, 0x664422); })
      .on('pointerdown', () => this.scene.start('TitleScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('TitleScene'));

    this.add.text(width - 16, 16, `💎 ${PlayerData.getShards()}`, {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffcc44',
    }).setOrigin(1, 0);
  }

  private showElementPicker(gauntletId: string): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Darken overlay
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.75).setDepth(50).setInteractive();

    const panelW = 700;
    const panelH = 380;
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x0d0d1a, 0.98)
      .setStrokeStyle(2, 0x4444aa)
      .setDepth(51);

    const gauntletEl = GAUNTLET_ELEMENTS.find((e) => e.id === gauntletId)!;
    this.add.text(cx, cy - panelH / 2 + 28, `${gauntletEl.emoji} ${gauntletEl.name.toUpperCase()} GAUNTLET`, {
      fontSize: '20px', fontFamily: '"Arial Black", sans-serif', color: '#ffaa00',
    }).setOrigin(0.5).setDepth(52);

    this.add.text(cx, cy - panelH / 2 + 56, 'Choose your element:', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(52);

    // Available elements: all 5 base + any unlocked combined
    const available = ALL_ELEMENTS.filter(
      (e) => BASE_IDS.has(e.id) || PlayerData.isElementUnlocked(e.id),
    );

    const btnW = 90;
    const btnH = 72;
    const btnGap = 10;
    const cols = Math.min(available.length, 8);
    const rows = Math.ceil(available.length / cols);
    const totalBtnW = cols * btnW + (cols - 1) * btnGap;
    const startX = cx - totalBtnW / 2 + btnW / 2;
    const startY = cy - (rows * (btnH + btnGap)) / 2 + btnH / 2 + 20;

    let selectedElementId: string | null = null;
    const btnRects: Phaser.GameObjects.Rectangle[] = [];

    available.forEach((el, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (btnW + btnGap);
      const by = startY + row * (btnH + btnGap);

      const btn = this.add.rectangle(bx, by, btnW, btnH, 0x111133, 0.9)
        .setStrokeStyle(2, el.color)
        .setDepth(52)
        .setInteractive({ useHandCursor: true });
      btnRects.push(btn);

      this.add.text(bx, by - 12, el.emoji, { fontSize: '26px' }).setOrigin(0.5).setDepth(53);
      this.add.text(bx, by + 18, el.name, {
        fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#cccccc',
      }).setOrigin(0.5).setDepth(53);

      btn
        .on('pointerover', () => { if (selectedElementId !== el.id) btn.setStrokeStyle(3, 0xffffff); })
        .on('pointerout',  () => { if (selectedElementId !== el.id) btn.setStrokeStyle(2, el.color); })
        .on('pointerdown', () => {
          selectedElementId = el.id;
          btnRects.forEach((b, bi) => {
            b.setStrokeStyle(2, available[bi].color);
            b.setFillStyle(0x111133, 0.9);
          });
          btn.setStrokeStyle(3, 0xffcc00);
          btn.setFillStyle(0x1a1a00, 1);
          startBtn.setFillStyle(0x1a3a1a, 0.9);
          startBtn.setStrokeStyle(2, 0x44cc44);
          startBtn.setInteractive({ useHandCursor: true });
          startLabel.setColor('#ffffff');
        });
    });

    // Start button (inactive until element chosen)
    const startBtn = this.add.rectangle(cx, cy + panelH / 2 - 36, 220, 48, 0x111111, 0.5)
      .setStrokeStyle(0)
      .setDepth(52);
    const startLabel = this.add.text(cx, cy + panelH / 2 - 36, 'SELECT AN ELEMENT', {
      fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#555555',
    }).setOrigin(0.5).setDepth(53);

    startBtn
      .on('pointerover', () => { if (selectedElementId) startBtn.setStrokeStyle(3, 0xffffff); })
      .on('pointerout',  () => { if (selectedElementId) startBtn.setStrokeStyle(2, 0x44cc44); })
      .on('pointerdown', () => {
        if (!selectedElementId) return;
        this.startGauntlet(gauntletId, selectedElementId);
      });

    // Cancel (click overlay or X)
    const closeBtn = this.add.text(cx + panelW / 2 - 16, cy - panelH / 2 + 16, '✕', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#888888',
    }).setOrigin(0.5).setDepth(53).setInteractive({ useHandCursor: true });

    const closeOverlay = () => {
      [overlay, panel, closeBtn].forEach((o) => o.destroy());
      // destroy all depth-52/53 objects we added by just restarting the scene would be cleanest,
      // but simpler to just restart so we don't have to track every object
      this.scene.restart();
    };
    overlay.on('pointerdown', closeOverlay);
    closeBtn.on('pointerdown', closeOverlay);
  }

  private startGauntlet(gauntletElement: string, playerElement: string): void {
    const pool = GAUNTLET_GROUPS[gauntletElement] ?? [];
    const allowedMutations = MUTATIONS
      .filter((m) => !GAUNTLET_EXCLUDED_MUTATIONS.has(m.id))
      .map((m) => m.id);

    const fightOrder = [...pool].sort(() => Math.random() - 0.5);
    const fightMutations = Array.from({ length: 5 }, () =>
      allowedMutations[Math.floor(Math.random() * allowedMutations.length)],
    );

    const gauntlet: GauntletState = {
      gauntletElement,
      playerElement,
      currentFight: 1,
      boosts: [],
      fightOrder,
      fightMutations,
    };

    this.scene.start('ArenaScene', {
      elementId: playerElement,
      enemyElementId: fightOrder[0],
      difficulty: GAUNTLET_DIFFICULTY[0],
      mutations: [fightMutations[0]],
      gauntlet,
    });
  }
}
