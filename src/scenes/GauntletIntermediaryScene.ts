import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import * as CP from '../data/CampaignProgress';
import { getAnyWorld } from '../data/AbstractWorlds';
import {
  GauntletState,
  addBoostPick,
  GAUNTLET_ELEMENTS,
  GAUNTLET_DIFFICULTY,
  GAUNTLET_HARD_DIFFICULTY,
  GAUNTLET_REWARD,
  GAUNTLET_HARD_REWARD,
  DIFFICULTY_LABELS,
  INFINITY_GAUNTLET_ID,
  infinityDifficulty,
  infinityHpMult,
  infinityDmgMult,
  getEffectiveStacks,
} from '../data/GauntletData';
import { MUTATIONS, getMutationDef, getBossMutationIds } from '../data/Mutations';
import {
  BoostDef,
  rollPicks,
  computeCurseShardMult,
  boostBorderColor,
  boostLabelColor,
} from '../data/GauntletBoosts';

// ── Element pools for Infinity enemy selection ───────────────────────────────

interface ElementDef { id: string; name: string; emoji: string; }

const INFINITY_BASE_ELEMENTS: ElementDef[] = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥' },
  { id: 'water', name: 'Water', emoji: '💧' },
  { id: 'life',  name: 'Life',  emoji: '🌿' },
  { id: 'air',   name: 'Air',   emoji: '💨' },
  { id: 'earth', name: 'Earth', emoji: '🪨' },
];

const INFINITY_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'oil',      name: 'Oil',      emoji: '🛢️' },
  { id: 'shadow',   name: 'Shadow',   emoji: '🌑'  },
  { id: 'ice',      name: 'Ice',      emoji: '🧊'  },
  { id: 'growth',   name: 'Growth',   emoji: '🦠'  },
  { id: 'crystal',  name: 'Crystal',  emoji: '💎'  },
  { id: 'soul',     name: 'Soul',     emoji: '👻'  },
  { id: 'hunt',     name: 'Hunt',     emoji: '🐺'  },
  { id: 'sand',     name: 'Time',     emoji: '⏳'  },
  { id: 'gravity',  name: 'Gravity',  emoji: '🌌'  },
  { id: 'creation', name: 'Creation', emoji: '⚒️' },
];

const INFINITY_ABSTRACT_ELEMENTS: ElementDef[] = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡' },
  { id: 'slime',       name: 'Slime',       emoji: '🟢' },
  { id: 'fate',        name: 'Fate',        emoji: '🃏' },
  { id: 'sound',       name: 'Sound',       emoji: '🔊' },
  { id: 'light',       name: 'Light',       emoji: '✨' },
];

const INFINITY_ABSTRACT_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'magnet',     name: 'Magnet',     emoji: '🧲' },
  { id: 'metal',      name: 'Metal',      emoji: '⚙️'  },
  { id: 'plasma',     name: 'Plasma',     emoji: '🔮'  },
  { id: 'death',      name: 'Death',      emoji: '💀'  },
  { id: 'echo',       name: 'Echo',       emoji: '🦇'  },
  { id: 'rubber',     name: 'Rubber',     emoji: '🪀'  },
  { id: 'magic',      name: 'Magic',      emoji: '📖'  },
  { id: 'technology', name: 'Technology', emoji: '💻'  },
  { id: 'silence',    name: 'Silence',    emoji: '🫥'  },
  { id: 'quantum',    name: 'Quantum',    emoji: '⚛️'  },
];

const ABSTRACT_UNLOCK_MAP: Record<string, string> = {
  electricity: 'fire', slime: 'water', fate: 'life', sound: 'air', light: 'earth',
};

function buildInfinityEnemyPool(): ElementDef[] {
  const completed = PlayerData.getCompletedGauntlets();
  const result: ElementDef[] = [...INFINITY_BASE_ELEMENTS];
  for (const el of INFINITY_COMBINED_ELEMENTS) {
    if (PlayerData.isElementUnlocked(el.id)) result.push(el);
  }
  for (const el of INFINITY_ABSTRACT_ELEMENTS) {
    const needed = ABSTRACT_UNLOCK_MAP[el.id];
    if (needed && completed.includes(needed)) result.push(el);
  }
  for (const el of INFINITY_ABSTRACT_COMBINED_ELEMENTS) {
    if (PlayerData.isElementUnlocked(el.id)) result.push(el);
  }
  return result;
}

const GAUNTLET_EXCLUDED_MUTATIONS = new Set(['boss', 'raid']);

export class GauntletIntermediaryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GauntletIntermediaryScene' });
  }

  create(data: { gauntlet: GauntletState }): void {
    const gs = data.gauntlet;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.rectangle(cx, cy, width, height, 0x0d0d1a);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    const isInfinity = gs.gauntletElement === INFINITY_GAUNTLET_ID;
    const totalFights = gs.hardMode ? 8 : 6;
    const isBossComplete = !isInfinity && gs.currentFight === totalFights;

    if (isBossComplete) {
      this.showCompletion(gs, cx, cy, width, height);
    } else if (isInfinity && gs.currentFight === 0) {
      // First Infinity fight — skip boost selection and launch directly
      this.launchNextFight({ ...gs, currentFight: 1 });
    } else {
      this.showBoostSelection(gs, cx, cy, width, height);
    }
  }

  // ── Completion (standard gauntlet only) ─────────────────────────────────────

  private showCompletion(gs: GauntletState, cx: number, cy: number, width: number, height: number): void {
    const isCampaign = !!gs.campaignContext;
    const curseShardMult = computeCurseShardMult(gs.boosts);

    // Award rewards
    let reward: number;
    if (isCampaign) {
      reward = gs.hardMode ? 30 : 10;
      CP.addSparks(gs.campaignContext!.slot, reward);
      CP.markGauntletCompleted(gs.campaignContext!.slot, gs.campaignContext!.worldId);
    } else {
      const baseReward = gs.hardMode ? GAUNTLET_HARD_REWARD : GAUNTLET_REWARD;
      reward = Math.round(baseReward * curseShardMult);
      PlayerData.addShards(reward);
      if (gs.hardMode) {
        PlayerData.completeGauntletHard(gs.gauntletElement);
      } else {
        PlayerData.completeGauntlet(gs.gauntletElement);
      }
    }

    const totalFights = gs.hardMode ? 8 : 6;
    const bossMutIds = gs.fightMutations[totalFights - 1] ?? [];
    const newlyUnlocked: string[] = [];
    for (const id of bossMutIds) {
      const def = getMutationDef(id);
      if (def?.bossOnly && !PlayerData.isMutationUnlocked(id)) newlyUnlocked.push(id);
      if (def?.bossOnly) PlayerData.unlockMutation(id);
    }

    const elDef = GAUNTLET_ELEMENTS.find((e) => e.id === gs.gauntletElement)
      ?? getAnyWorld(gs.gauntletElement);
    const elEmoji = elDef?.emoji ?? '🏆';
    const elName = elDef ? ('name' in elDef ? elDef.name : '') : gs.gauntletElement;
    const titleText = gs.hardMode ? '🔥 HARD GAUNTLET COMPLETE!' : 'GAUNTLET COMPLETE!';
    const titleColor = gs.hardMode ? '#ff88ff' : '#ffcc00';
    const battleCount = gs.hardMode ? '7' : '5';

    this.add.text(cx, cy - 160, `${elEmoji} ${elName.toUpperCase()} GAUNTLET`, {
      fontSize: '28px', fontFamily: '"Arial Black", sans-serif',
      color: '#ffaa00', stroke: '#884400', strokeThickness: 3,
    }).setOrigin(0.5);

    const title = this.add.text(cx, cy - 110, titleText, {
      fontSize: gs.hardMode ? '48px' : '64px', fontFamily: '"Arial Black", sans-serif',
      color: titleColor, stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, scaleX: 1.04, scaleY: 1.04, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(cx, cy - 20, `★ You survived all ${battleCount} battles and defeated the boss! ★`, {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5);

    const rewardLabel = isCampaign
      ? `+${reward} ⚡`
      : (curseShardMult > 1 ? `+${reward} 💎  (×${curseShardMult.toFixed(2)} curse bonus)` : `+${reward} 💎`);
    this.add.text(cx, cy + 20, rewardLabel, {
      fontSize: '32px', fontFamily: '"Arial Black", sans-serif', color: titleColor,
    }).setOrigin(0.5);

    if (newlyUnlocked.length > 0) {
      const unlockDef = getMutationDef(newlyUnlocked[0])!;
      this.add.text(cx, cy + 65, '✨ NEW MUTATION UNLOCKED ✨', {
        fontSize: '14px', fontFamily: '"Arial Black", sans-serif',
        color: '#ffee88', stroke: '#553300', strokeThickness: 2,
      }).setOrigin(0.5);
      this.add.text(cx, cy + 88, `${unlockDef.emoji}  ${unlockDef.name.toUpperCase()}`, {
        fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#ffffff',
      }).setOrigin(0.5);
    }

    const btnOffsetY = newlyUnlocked.length > 0 ? 145 : 100;
    const btn = this.add.rectangle(cx, cy + btnOffsetY, 280, 64, 0x1a2a1a, 0.9)
      .setStrokeStyle(2, 0x44cc44).setInteractive({ useHandCursor: true });
    const backLabel = isCampaign ? 'BACK TO WORLD' : 'BACK TO GAUNTLETS';
    const btnLabel = this.add.text(cx, cy + btnOffsetY, backLabel, {
      fontSize: '22px', fontFamily: '"Arial Black", sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    const goBack = () => {
      if (isCampaign) {
        this.scene.start('CampaignWorldScene', { worldId: gs.campaignContext!.worldId, slotIdx: gs.campaignContext!.slot });
      } else {
        this.scene.start('GauntletSelectScene');
      }
    };
    btn
      .on('pointerover', () => { btn.setAlpha(1); btn.setStrokeStyle(3, 0xffffff); btnLabel.setColor('#ffcc00'); })
      .on('pointerout',  () => { btn.setAlpha(0.9); btn.setStrokeStyle(2, 0x44cc44); btnLabel.setColor('#ffffff'); })
      .on('pointerdown', goBack);
    this.input.keyboard!.on('keydown-ESC', goBack);
  }

  // ── Boost selection ──────────────────────────────────────────────────────────

  private showBoostSelection(gs: GauntletState, cx: number, cy: number, width: number, height: number): void {
    const isInfinity = gs.gauntletElement === INFINITY_GAUNTLET_ID;
    const totalFights = gs.hardMode ? 8 : 6;
    const nextFight = gs.currentFight + 1;

    // ── Header ───────────────────────────────────────────────────────
    if (isInfinity) {
      this.add.text(cx, 40, `♾️  INFINITY GAUNTLET  ${gs.hardMode ? '🔥 HARD' : ''}`, {
        fontSize: '22px', fontFamily: '"Arial Black", sans-serif',
        color: '#cc88ff', stroke: '#330066', strokeThickness: 2,
      }).setOrigin(0.5);
      this.add.text(cx, 70, `FIGHT ${gs.currentFight} COMPLETE`, {
        fontSize: '36px', fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5);
      // Infinity stats
      const bestFight = PlayerData.getInfinityBestFight(gs.hardMode);
      this.add.text(cx, 105, `Shards this run: 💎 ${gs.infinityShards}   •   Personal best: Fight ${bestFight}`, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#888888',
      }).setOrigin(0.5);
    } else {
      const elDef = GAUNTLET_ELEMENTS.find((e) => e.id === gs.gauntletElement) ?? getAnyWorld(gs.gauntletElement);
      const elEmoji = elDef?.emoji ?? '🏆';
      const elName = elDef ? ('name' in elDef ? elDef.name : '') : gs.gauntletElement;
      this.add.text(cx, 40, `${elEmoji} ${elName.toUpperCase()} GAUNTLET${gs.hardMode ? '  🔥 HARD' : ''}`, {
        fontSize: '22px', fontFamily: '"Arial Black", sans-serif',
        color: '#ffaa00', stroke: '#884400', strokeThickness: 2,
      }).setOrigin(0.5);
      this.add.text(cx, 72, `FIGHT ${gs.currentFight} COMPLETE`, {
        fontSize: '38px', fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5);
      this.drawProgress(cx, 110, gs.currentFight, totalFights);
    }

    // ── Deck summary ─────────────────────────────────────────────────
    const deckY = isInfinity ? 128 : 132;
    this.renderDeckSummary(gs, cx, deckY, width);

    // ── Pick header (includes shard bonus if active) ─────────────────
    const curseMult = computeCurseShardMult(gs.boosts);
    const pickHeaderY = deckY + 28;
    const shardSuffix = curseMult > 1 ? `  💎×${curseMult.toFixed(2)}` : '';
    this.add.text(cx, pickHeaderY, `─── CHOOSE ONE ───${shardSuffix}`, {
      fontSize: '16px', fontFamily: '"Arial Black", sans-serif',
      color: '#44ccff', stroke: '#003366', strokeThickness: 2,
    }).setOrigin(0.5);

    // ── Roll picks and render grid ───────────────────────────────────
    const picks = rollPicks(gs.boosts);
    const cardCellW = 132;
    const cardCellH = 138;
    const cellGap = 10;

    let selectedDef: BoostDef | null = null;
    const allCells: Phaser.GameObjects.Rectangle[] = [];

    // Next Fight button (inactive until selection)
    const nextBtnY = height - 52;
    const nextBtn = this.add.rectangle(cx, nextBtnY, 300, 52, 0x1a2a1a, 0)
      .setStrokeStyle(0).setInteractive({ useHandCursor: false });
    const isBossFight = !isInfinity && nextFight === totalFights;
    const nextLabel = this.add.text(cx, nextBtnY,
      isBossFight ? '⚔️ FIGHT THE BOSS' : isInfinity ? `NEXT FIGHT (Fight ${nextFight}) →` : `NEXT FIGHT →`,
      { fontSize: '20px', fontFamily: '"Arial Black", sans-serif', color: '#444444' }).setOrigin(0.5);

    const activateNextBtn = (def: BoostDef): void => {
      selectedDef = def;
      nextBtn.setFillStyle(0x1a2a1a, 0.9).setStrokeStyle(2, 0x44cc44).setInteractive({ useHandCursor: true });
      nextLabel.setColor('#ffffff');
      nextBtn
        .on('pointerover', () => { nextBtn.setAlpha(1); nextBtn.setStrokeStyle(3, 0xffffff); nextLabel.setColor('#ffcc00'); })
        .on('pointerout',  () => { nextBtn.setAlpha(0.9); nextBtn.setStrokeStyle(2, 0x44cc44); nextLabel.setColor('#ffffff'); })
        .on('pointerdown', () => {
          if (!selectedDef) return;
          const kind = selectedDef.kind === 'card' ? 'cards' : selectedDef.kind === 'charm' ? 'charms' : 'curses';
          const newGs: GauntletState = {
            ...gs,
            currentFight: nextFight,
            boosts: addBoostPick(gs.boosts, kind, selectedDef.id),
          };
          this.launchNextFight(newGs);
        });
    };

    const renderRow = (items: BoostDef[], rowY: number, rowLabel: string): void => {
      this.add.text(cx, rowY - 12, rowLabel, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#555577',
      }).setOrigin(0.5);

      const totalW = items.length * cardCellW + (items.length - 1) * cellGap;
      const startX = cx - totalW / 2 + cardCellW / 2;

      items.forEach((def, i) => {
        const bx = startX + i * (cardCellW + cellGap);
        const by = rowY + cardCellH / 2 + 2;
        const borderCol = boostBorderColor(def);
        const labelCol = boostLabelColor(def);
        const currentStacks = getEffectiveStacks(gs.boosts, def.id);

        const cell = this.add.rectangle(bx, by, cardCellW, cardCellH, 0x111122, 0.85)
          .setStrokeStyle(2, borderCol).setInteractive({ useHandCursor: true });
        allCells.push(cell);

        this.add.text(bx, by - 48, def.emoji, { fontSize: '28px' }).setOrigin(0.5);
        this.add.text(bx, by - 18, def.name, {
          fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: labelCol,
        }).setOrigin(0.5);
        this.add.text(bx, by + 8, def.description, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#999999',
          wordWrap: { width: cardCellW - 12 }, align: 'center',
        }).setOrigin(0.5);

        if (currentStacks > 0) {
          const chip = this.add.rectangle(bx + cardCellW / 2 - 14, by - cardCellH / 2 + 10, 24, 16, 0x333300, 1)
            .setStrokeStyle(1, 0xffcc00);
          this.add.text(bx + cardCellW / 2 - 14, by - cardCellH / 2 + 10, `×${currentStacks}`, {
            fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc00',
          }).setOrigin(0.5).setDepth(chip.depth + 1);
        }

        cell
          .on('pointerover', () => {
            if (selectedDef !== def) {
              cell.setStrokeStyle(3, 0xffffff);
              cell.setAlpha(1);
            }
          })
          .on('pointerout', () => {
            if (selectedDef !== def) {
              cell.setStrokeStyle(2, borderCol);
              cell.setAlpha(0.85);
            }
          })
          .on('pointerdown', () => {
            // Allow switching selection
            selectedDef = def;
            allCells.forEach((c, ci) => {
              const isThis = allCells.indexOf(cell) === ci;
              if (isThis) {
                c.setStrokeStyle(3, 0xffcc00);
                c.setAlpha(1);
              } else {
                c.setStrokeStyle(1, 0x333344);
                c.setAlpha(0.4);
              }
            });
            activateNextBtn(def);
          });
      });
    };

    const cardsY = pickHeaderY + 22;
    const charmsY = cardsY + cardCellH + 28;
    const curseY = charmsY + cardCellH + 14;

    renderRow(picks.cards, cardsY, 'CARDS');
    renderRow(picks.charms, charmsY, 'CHARMS');

    // ── Compact curse banner (single wide row) ───────────────────────
    const curseBannerH = 62;
    const curseBannerW = 420;
    const curseDef = picks.curse;
    const curseBannerCY = curseY + curseBannerH / 2 + 2;
    const curseBorderCol = boostBorderColor(curseDef);
    const curseLabelCol = boostLabelColor(curseDef);

    this.add.text(cx, curseY - 12, 'CURSE', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#555577',
    }).setOrigin(0.5);

    const curseCell = this.add.rectangle(cx, curseBannerCY, curseBannerW, curseBannerH, 0x111122, 0.85)
      .setStrokeStyle(2, curseBorderCol).setInteractive({ useHandCursor: true });
    allCells.push(curseCell);

    this.add.text(cx - curseBannerW / 2 + 28, curseBannerCY, curseDef.emoji, { fontSize: '28px' }).setOrigin(0.5);
    this.add.text(cx - curseBannerW / 2 + 68, curseBannerCY - 11, curseDef.name, {
      fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: curseLabelCol,
    }).setOrigin(0, 0.5);
    this.add.text(cx - curseBannerW / 2 + 68, curseBannerCY + 10, curseDef.description, {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#999999',
      wordWrap: { width: curseBannerW - 82 },
    }).setOrigin(0, 0.5);

    const curseCurrentStacks = getEffectiveStacks(gs.boosts, curseDef.id);
    if (curseCurrentStacks > 0) {
      const chip = this.add.rectangle(cx + curseBannerW / 2 - 14, curseBannerCY - curseBannerH / 2 + 10, 24, 16, 0x333300, 1)
        .setStrokeStyle(1, 0xffcc00);
      this.add.text(cx + curseBannerW / 2 - 14, curseBannerCY - curseBannerH / 2 + 10, `×${curseCurrentStacks}`, {
        fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc00',
      }).setOrigin(0.5).setDepth(chip.depth + 1);
    }

    curseCell
      .on('pointerover', () => {
        if (selectedDef !== curseDef) { curseCell.setStrokeStyle(3, 0xffffff); curseCell.setAlpha(1); }
      })
      .on('pointerout', () => {
        if (selectedDef !== curseDef) { curseCell.setStrokeStyle(2, curseBorderCol); curseCell.setAlpha(0.85); }
      })
      .on('pointerdown', () => {
        selectedDef = curseDef;
        allCells.forEach((c) => {
          const isThis = c === curseCell;
          if (isThis) { c.setStrokeStyle(3, 0xffcc00); c.setAlpha(1); }
          else { c.setStrokeStyle(1, 0x333344); c.setAlpha(0.4); }
        });
        activateNextBtn(curseDef);
      });
  }

  // ── Deck summary strip ───────────────────────────────────────────────────────

  private renderDeckSummary(gs: GauntletState, cx: number, y: number, width: number): void {
    const b = gs.boosts;
    const parts: string[] = [];
    for (const [id, stacks] of Object.entries(b.cards)) {
      if (stacks > 0) parts.push(`${id}×${stacks}`);
    }
    const charmParts: string[] = [];
    for (const [id, stacks] of Object.entries(b.charms)) {
      if (stacks > 0) charmParts.push(`${id}×${stacks}`);
    }
    const curseParts: string[] = [];
    for (const [id, stacks] of Object.entries(b.curses)) {
      if (stacks > 0) curseParts.push(`${id}×${stacks}`);
    }

    if (parts.length === 0 && charmParts.length === 0 && curseParts.length === 0) return;

    const allParts = [
      ...parts.map((p) => `💠 ${p}`),
      ...charmParts.map((p) => `🔮 ${p}`),
      ...curseParts.map((p) => `🩸 ${p}`),
    ];

    this.add.text(cx, y, allParts.join('  '), {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888888',
      wordWrap: { width: width - 80 }, align: 'center',
    }).setOrigin(0.5);
  }

  // ── Progress dots ────────────────────────────────────────────────────────────

  private drawProgress(cx: number, y: number, completedFights: number, totalFights: number): void {
    const dotR = totalFights > 6 ? 8 : 10;
    const dotGap = totalFights > 6 ? 20 : 28;
    const totalW = totalFights * dotR * 2 + (totalFights - 1) * dotGap;
    const startX = cx - totalW / 2 + dotR;
    const g = this.add.graphics();
    for (let i = 0; i < totalFights; i++) {
      const dx = startX + i * (dotR * 2 + dotGap);
      const isBoss = i === totalFights - 1;
      const done = i < completedFights;
      const color = done ? 0x44cc44 : isBoss ? 0xff4422 : 0x333366;
      g.fillStyle(color, done ? 1 : 0.5);
      if (isBoss) {
        g.fillTriangle(dx, y - dotR, dx - dotR, y + dotR, dx + dotR, y + dotR);
      } else {
        g.fillCircle(dx, y, dotR);
      }
      if (i < totalFights - 1) {
        g.fillStyle(0x333355, 1);
        g.fillRect(dx + dotR, y - 1, dotGap, 2);
      }
    }
  }

  // ── Launch next fight ────────────────────────────────────────────────────────

  private launchNextFight(gs: GauntletState): void {
    const isInfinity = gs.gauntletElement === INFINITY_GAUNTLET_ID;
    if (isInfinity) {
      this.launchInfinityFight(gs);
    } else {
      this.launchStandardFight(gs);
    }
  }

  private launchStandardFight(gs: GauntletState): void {
    const totalFights = gs.hardMode ? 8 : 6;
    const isBoss = gs.currentFight === totalFights;

    // Apply Petri curse: inject extra mutations (unless Sacrifice is active)
    const petriStacks = getEffectiveStacks(gs.boosts, 'petri');
    const sacrificeActive = gs.boosts.sacrificeActive;

    if (isBoss) {
      const bossIdx = gs.hardMode ? 7 : 5;
      let bossMutations = [...(gs.fightMutations[bossIdx] ?? [])];
      if (petriStacks > 0 && !sacrificeActive) {
        bossMutations = [...bossMutations, ...this.pickRandomMutations(Math.round(petriStacks))];
      }
      this.scene.start('ArenaScene', {
        elementId: gs.playerElement,
        enemyElementId: gs.gauntletElement,
        difficulty: 5,
        mutations: bossMutations,
        starredMutations: gs.hardMode ? bossMutations : [],
        gauntlet: gs,
        playerPerk: PlayerData.getEquippedPerk(gs.playerElement),
        campaign: gs.campaignContext ? { slot: gs.campaignContext.slot, worldId: gs.campaignContext.worldId, fightId: gs.gauntletElement, isChallenge: false } : undefined,
      });
    } else {
      const idx = gs.currentFight - 1;
      const diffArray = gs.hardMode ? GAUNTLET_HARD_DIFFICULTY : GAUNTLET_DIFFICULTY;
      let mutations = [...(gs.fightMutations[idx] ?? [])];
      if (petriStacks > 0 && !sacrificeActive) {
        mutations = [...mutations, ...this.pickRandomMutations(Math.round(petriStacks))];
      }
      this.scene.start('ArenaScene', {
        elementId: gs.playerElement,
        enemyElementId: gs.fightOrder[idx],
        difficulty: diffArray[idx],
        mutations,
        starredMutations: gs.hardMode ? mutations : [],
        gauntlet: gs,
        playerPerk: PlayerData.getEquippedPerk(gs.playerElement),
        campaign: gs.campaignContext ? { slot: gs.campaignContext.slot, worldId: gs.campaignContext.worldId, fightId: gs.gauntletElement, isChallenge: false } : undefined,
      });
    }
  }

  private launchInfinityFight(gs: GauntletState): void {
    const fightNum = gs.currentFight;
    const isBoss = fightNum % 10 === 0;
    const difficulty = infinityDifficulty(fightNum);
    const hpMult = infinityHpMult(fightNum, gs.hardMode, isBoss);
    const dmgMult = infinityDmgMult(fightNum, gs.hardMode);

    // Pick enemy element
    const pool = buildInfinityEnemyPool();
    const enemyEl = pool[Math.floor(Math.random() * pool.length)];

    // Pick mutations
    let mutations: string[] = [];
    const bossIds = getBossMutationIds();
    const allowedMuts = MUTATIONS
      .filter((m) => !GAUNTLET_EXCLUDED_MUTATIONS.has(m.id) && !m.bossOnly)
      .map((m) => m.id);

    if (isBoss) {
      const bossId = bossIds[Math.floor(Math.random() * bossIds.length)];
      mutations.push(bossId);
      if (gs.hardMode) mutations.push(...this.pickRandomMutations(1, allowedMuts));
    } else {
      mutations.push(...this.pickRandomMutations(1, allowedMuts));
    }

    // Petri curse
    const petriStacks = getEffectiveStacks(gs.boosts, 'petri');
    if (petriStacks > 0 && !gs.boosts.sacrificeActive) {
      mutations.push(...this.pickRandomMutations(Math.round(petriStacks), allowedMuts));
    }

    this.scene.start('ArenaScene', {
      elementId: gs.playerElement,
      enemyElementId: enemyEl.id,
      difficulty,
      mutations,
      starredMutations: gs.hardMode ? mutations : [],
      gauntlet: gs,
      playerPerk: PlayerData.getEquippedPerk(gs.playerElement),
      hpMult,
      npcOutgoingDamageMult: dmgMult,
    });
  }

  private pickRandomMutations(count: number, pool?: string[]): string[] {
    const src = pool ?? MUTATIONS
      .filter((m) => !GAUNTLET_EXCLUDED_MUTATIONS.has(m.id) && !m.bossOnly && PlayerData.isMutationUnlocked(m.id))
      .map((m) => m.id);
    const shuffled = [...src].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}
