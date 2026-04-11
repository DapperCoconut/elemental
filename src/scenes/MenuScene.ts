import Phaser from 'phaser';
import { DIFFICULTY_PRESETS } from '../entities/NpcOpponent';
import { SHARD_REWARDS } from '../data/Upgrades';
import { MUTATIONS, activeMutationIds } from '../data/Mutations';
import * as PlayerData from '../data/PlayerData';

interface ElementDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
  available: boolean;
}

const ELEMENTS: ElementDef[] = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400, available: true  },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff, available: true  },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44, available: true  },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff, available: true  },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755, available: true  },
];

const COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'oil',    name: 'Oil',    emoji: '🛢️', color: 0x664400, available: true },
  { id: 'shadow', name: 'Shadow', emoji: '🌑', color: 0x330044, available: true },
  { id: 'ice',    name: 'Ice',    emoji: '🧊', color: 0x88ccff, available: true },
  { id: 'growth',  name: 'Growth',  emoji: '🦠', color: 0x88bb22, available: true },
  { id: 'crystal', name: 'Crystal', emoji: '💎', color: 0x88ccff, available: true },
  { id: 'soul',    name: 'Soul',    emoji: '👻', color: 0xccaaff, available: true },
  { id: 'hunt',    name: 'Hunt',    emoji: '🐺', color: 0xcc4400, available: true },
  { id: 'sand',    name: 'Time',    emoji: '⏳', color: 0xffdd44, available: true },
];

const DIFF_COLORS = [0x22cc44, 0x88cc22, 0xddaa00, 0xee5500, 0xcc0022];

export class MenuScene extends Phaser.Scene {
  private selectionPhase: 'player' | 'enemy' | 'difficulty' = 'player';
  private playerChoice: string | null = null;
  private enemyChoice: string | null = null;
  private elemPage = 0;

  private phaseObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    activeMutationIds.clear();
    this.selectionPhase = 'player';
    this.playerChoice = null;
    this.enemyChoice = null;
    this.elemPage = 0;
    this.phaseObjects = [];

    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Persistent chrome ──────────────────────────────────────────
    this.add.rectangle(cx, height / 2, width, height, 0x0d0d1a);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    this.add.text(cx, 90, 'ELEMENTAL', {
      fontSize: '68px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ff8800',
      stroke: '#ff2200',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(cx, height - 24, 'Defeat the enemy to win!', {
      fontSize: '13px',
      color: '#666666',
    }).setOrigin(0.5);

    this.add.text(cx, height - 48, 'WASD — move   •   Click / E / R / F / Q — abilities   •   SPACE — Dodge', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#555555',
    }).setOrigin(0.5);

    this.renderPhase(width, height, cx);
  }

  private findElement(id: string): ElementDef | undefined {
    return ELEMENTS.find((e) => e.id === id) ?? COMBINED_ELEMENTS.find((e) => e.id === id);
  }

  private renderPhase(width: number, height: number, cx: number): void {
    for (const obj of this.phaseObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.phaseObjects = [];

    if (this.selectionPhase === 'difficulty') {
      this.renderDifficultyPhase(width, height, cx);
    } else {
      this.renderElementPhase(width, height, cx);
    }
  }

  private renderElementPhase(width: number, height: number, cx: number): void {
    const isPlayerPhase = this.selectionPhase === 'player';

    const subtitle = isPlayerPhase ? 'Choose your element' : 'Choose enemy element';
    const subtitleObj = this.add.text(cx, 158, subtitle, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);
    this.phaseObjects.push(subtitleObj);

    if (!isPlayerPhase && this.playerChoice) {
      const chosen = this.findElement(this.playerChoice);
      if (chosen) {
        const indicator = this.add.text(cx, 196, `YOU:  ${chosen.emoji} ${chosen.name}`, {
          fontSize: '15px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffcc44',
        }).setOrigin(0.5);
        this.phaseObjects.push(indicator);
      }
    }

    // Determine which elements to show on this page
    const unlockedCombined = COMBINED_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
    const PAGE_SIZE = 5;
    const combinedPages = Math.max(1, Math.ceil(unlockedCombined.length / PAGE_SIZE));
    const maxPage = unlockedCombined.length > 0 ? combinedPages : 0; // 0 = no combined pages
    const totalPages = 1 + maxPage; // page 0 = base, pages 1..maxPage = combined

    let currentElements: ElementDef[];
    if (this.elemPage === 0) {
      currentElements = ELEMENTS;
    } else {
      const start = (this.elemPage - 1) * PAGE_SIZE;
      currentElements = unlockedCombined.slice(start, start + PAGE_SIZE);
    }

    // Page indicator
    const pageLabel = this.add.text(cx, height / 2 + 110, `${this.elemPage + 1} / ${totalPages}`, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#555566',
    }).setOrigin(0.5);
    this.phaseObjects.push(pageLabel);

    // Page arrows
    if (this.elemPage > 0) {
      const leftBtn = this.add.rectangle(28, height / 2 + 20, 32, 64, 0x330066)
        .setStrokeStyle(1, 0x9944ff).setInteractive({ useHandCursor: true });
      const leftLbl = this.add.text(28, height / 2 + 20, '◀', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(1);
      leftBtn
        .on('pointerover', () => leftBtn.setFillStyle(0x550099))
        .on('pointerout',  () => leftBtn.setFillStyle(0x330066))
        .on('pointerdown', () => {
          this.elemPage--;
          this.renderPhase(width, height, cx);
        });
      this.phaseObjects.push(leftBtn, leftLbl);
    }

    if (this.elemPage < totalPages - 1 && (this.elemPage > 0 || unlockedCombined.length > 0)) {
      const rightBtn = this.add.rectangle(width - 28, height / 2 + 20, 32, 64, 0x330066)
        .setStrokeStyle(1, 0x9944ff).setInteractive({ useHandCursor: true });
      const rightLbl = this.add.text(width - 28, height / 2 + 20, '▶', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(1);
      rightBtn
        .on('pointerover', () => rightBtn.setFillStyle(0x550099))
        .on('pointerout',  () => rightBtn.setFillStyle(0x330066))
        .on('pointerdown', () => {
          this.elemPage++;
          this.renderPhase(width, height, cx);
        });
      this.phaseObjects.push(rightBtn, rightLbl);
    }

    // Element cards
    const cardW = 140;
    const cardH = 150;
    const gap = 16;
    const totalW = currentElements.length * cardW + (currentElements.length - 1) * gap;
    const startX = cx - totalW / 2;

    if (this.elemPage > 0 && currentElements.length === 0) {
      const noElems = this.add.text(cx, height / 2 + 20, 'No combined elements discovered yet.\nVisit the LAB to unlock Oil (Fire + Water).', {
        fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#555577', align: 'center',
      }).setOrigin(0.5);
      this.phaseObjects.push(noElems);
      return;
    }

    currentElements.forEach((el, i) => {
      const bx = startX + i * (cardW + gap) + cardW / 2;
      const by = height / 2 + 20;

      const clickable = el.available;
      const fillAlpha = clickable ? 0.8 : 0.3;
      const borderColor = clickable ? el.color : 0x444444;

      const card = this.add
        .rectangle(bx, by, cardW, cardH, clickable ? el.color : 0x222233, fillAlpha)
        .setStrokeStyle(2, borderColor);

      const emojiText = this.add.text(bx, by - 32, el.emoji, { fontSize: '44px' }).setOrigin(0.5);

      const nameText = this.add.text(bx, by + 26, el.name.toUpperCase(), {
        fontSize: '15px',
        fontFamily: '"Arial Black", sans-serif',
        color: clickable ? '#ffffff' : '#555555',
      }).setOrigin(0.5);

      let statusText: Phaser.GameObjects.Text;
      if (clickable) {
        statusText = this.add.text(bx, by + 52, '▶  SELECT', {
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffcc00',
        }).setOrigin(0.5);

        card
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => { card.setAlpha(1); card.setStrokeStyle(3, 0xffffff); })
          .on('pointerout', () => { card.setAlpha(fillAlpha); card.setStrokeStyle(2, borderColor); })
          .on('pointerdown', () => this.handleElementClick(el.id, width, height, cx));
      } else {
        statusText = this.add.text(bx, by + 52, 'coming soon', {
          fontSize: '11px', color: '#444444',
        }).setOrigin(0.5);
      }

      this.phaseObjects.push(card, emojiText, nameText, statusText);
    });
  }

  private renderDifficultyPhase(width: number, height: number, cx: number): void {
    const playerEl = this.findElement(this.playerChoice ?? '');
    const enemyEl  = this.findElement(this.enemyChoice ?? '');

    const diffBtnY  = 228;
    const descY     = 292;
    const mutTitleY = 335;
    const mutRow0Y  = 374;
    const mutRow1Y  = 450;

    const subtitle = this.add.text(cx, 155, 'Choose difficulty', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);
    this.phaseObjects.push(subtitle);

    if (playerEl && enemyEl) {
      const indicator = this.add.text(
        cx, 186,
        `${playerEl.emoji} ${playerEl.name}   vs   ${enemyEl.emoji} ${enemyEl.name}`,
        { fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffcc44' },
      ).setOrigin(0.5);
      this.phaseObjects.push(indicator);
    }

    const btnW = 148;
    const btnH = 60;
    const btnGap = 10;
    const totalW = DIFFICULTY_PRESETS.length * btnW + (DIFFICULTY_PRESETS.length - 1) * btnGap;
    const startX = cx - totalW / 2;

    const descText = this.add.text(cx, descY, '', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5);
    this.phaseObjects.push(descText);

    const DIFF_DESCRIPTIONS = [
      'Misses a lot • Low HP • Rarely uses specials',
      'Occasional misses • Reduced HP • Some specials',
      'Accurate • Full HP • All abilities • Dodges nearby shots',
      'Very accurate • High HP • Active dodging',
      'Perfect aim • Maximum HP • Aggressive dodge • Top speed',
    ];

    DIFFICULTY_PRESETS.forEach((diff, i) => {
      const bx = startX + i * (btnW + btnGap) + btnW / 2;
      const color = DIFF_COLORS[i];
      const btn = this.add
        .rectangle(bx, diffBtnY, btnW, btnH, color, 0.75)
        .setStrokeStyle(2, color)
        .setInteractive({ useHandCursor: true });

      const labelText = this.add.text(bx, diffBtnY - 8, diff.label.toUpperCase(), {
        fontSize: '13px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      const hpText = this.add.text(bx, diffBtnY + 8, `HP: ${diff.hp}  💎+${SHARD_REWARDS[i]}`, {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#eeeeee',
      }).setOrigin(0.5);

      btn
        .on('pointerover', () => { btn.setAlpha(1); btn.setStrokeStyle(3, 0xffffff); descText.setText(DIFF_DESCRIPTIONS[i]); })
        .on('pointerout',  () => { btn.setAlpha(0.75); btn.setStrokeStyle(2, color); descText.setText(''); })
        .on('pointerdown', () => {
          this.scene.start('ArenaScene', {
            elementId: this.playerChoice,
            enemyElementId: this.enemyChoice,
            difficulty: diff.level,
            mutations: [...activeMutationIds],
          });
        });

      this.phaseObjects.push(btn, labelText, hpText);
    });

    // ── Mutation toggles (2 rows × 4 cols) ──────────────────────────
    const mutTitle = this.add.text(cx, mutTitleY, '— MUTATIONS —', {
      fontSize: '11px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.phaseObjects.push(mutTitle);

    const togW = 172;
    const togH = 44;
    const togGapX = 10;
    const cols = 4;
    const totalTogW = cols * togW + (cols - 1) * togGapX;
    const togStartX = cx - totalTogW / 2;
    const rowY = [mutRow0Y, mutRow1Y];

    MUTATIONS.forEach((mut, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const tx = togStartX + col * (togW + togGapX) + togW / 2;
      const ty = rowY[row];

      const isOn = () => activeMutationIds.has(mut.id);
      const getColor  = () => isOn() ? 0x1a3a1a : 0x252535;
      const getBorder = () => isOn() ? 0x55ee55 : 0x9999bb;

      const tog = this.add
        .rectangle(tx, ty, togW, togH, getColor(), 1)
        .setStrokeStyle(2, getBorder())
        .setInteractive({ useHandCursor: true });

      const togLabel = this.add.text(tx, ty - 7, `${mut.emoji} ${mut.name}`, {
        fontSize: '12px',
        fontFamily: '"Arial Black", sans-serif',
        color: isOn() ? '#88ff88' : '#cccccc',
      }).setOrigin(0.5);

      const togDesc = this.add.text(tx, ty + 9, mut.description, {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: isOn() ? '#66dd66' : '#999999',
      }).setOrigin(0.5);

      const refresh = () => {
        tog.setFillStyle(getColor(), 1);
        tog.setStrokeStyle(2, getBorder());
        togLabel.setColor(isOn() ? '#88ff88' : '#cccccc');
        togDesc.setColor(isOn() ? '#66dd66' : '#999999');
      };

      tog
        .on('pointerover', () => tog.setStrokeStyle(3, 0xffffff))
        .on('pointerout',  () => tog.setStrokeStyle(2, getBorder()))
        .on('pointerdown', () => {
          if (isOn()) activeMutationIds.delete(mut.id);
          else activeMutationIds.add(mut.id);
          refresh();
        });

      this.phaseObjects.push(tog, togLabel, togDesc);
    });
  }

  private handleElementClick(elementId: string, width: number, height: number, cx: number): void {
    if (this.selectionPhase === 'player') {
      this.playerChoice = elementId;
      this.selectionPhase = 'enemy';
      this.elemPage = 0; // reset page for enemy selection
    } else if (this.selectionPhase === 'enemy') {
      this.enemyChoice = elementId;
      this.selectionPhase = 'difficulty';
    }
    this.renderPhase(width, height, cx);
  }
}
