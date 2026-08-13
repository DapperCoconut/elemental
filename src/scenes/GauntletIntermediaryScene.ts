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
  GAUNTLET_MAX_DIFFICULTY,
  gauntletDifficulty,
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
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addButton, addCardPlate, addSectionLabel, addTitle, UiButton,
  fillDiamond, fillHex, strokeHex,
} from '../ui';
import { Music } from '../audio';

// ── Element pools for Infinity enemy selection ───────────────────────────────

interface ElementDef { id: string; name: string }

const INFINITY_BASE_ELEMENTS: ElementDef[] = [
  { id: 'fire',  name: 'Fire' },
  { id: 'water', name: 'Water' },
  { id: 'life',  name: 'Life' },
  { id: 'air',   name: 'Air' },
  { id: 'earth', name: 'Earth' },
];

const INFINITY_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'oil',      name: 'Oil' },
  { id: 'shadow',   name: 'Shadow'  },
  { id: 'ice',      name: 'Ice'  },
  { id: 'growth',   name: 'Growth'  },
  { id: 'crystal',  name: 'Crystal'  },
  { id: 'soul',     name: 'Soul'  },
  { id: 'hunt',     name: 'Hunt'  },
  { id: 'sand',     name: 'Time'  },
  { id: 'gravity',  name: 'Gravity'  },
  { id: 'creation', name: 'Creation' },
];

const INFINITY_ABSTRACT_ELEMENTS: ElementDef[] = [
  { id: 'electricity', name: 'Electricity' },
  { id: 'slime',       name: 'Acid' },
  { id: 'fate',        name: 'Fate' },
  { id: 'sound',       name: 'Sound' },
  { id: 'light',       name: 'Light' },
];

const INFINITY_ABSTRACT_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'magnet',     name: 'Magnet' },
  { id: 'metal',      name: 'Metal'  },
  { id: 'plasma',     name: 'Plasma'  },
  { id: 'gunpowder', name: 'Gunpowder'  },
  { id: 'echo',       name: 'Echo'  },
  { id: 'rubber',     name: 'Rubber'  },
  { id: 'magic',      name: 'Magic'  },
  { id: 'technology', name: 'Technology'  },
  { id: 'silence',    name: 'Silence'  },
  { id: 'subterfuge', name: 'Subterfuge' },
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

const GAUNTLET_EXCLUDED_MUTATIONS = new Set(['boss', 'raid', 'golf']);

export class GauntletIntermediaryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GauntletIntermediaryScene' });
  }

  create(data: { gauntlet: GauntletState }): void {
    Music.play('gauntlet');
    const gs = data.gauntlet;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const isInfinity = gs.gauntletElement === INFINITY_GAUNTLET_ID;
    addBackdrop(this, {
      accent: isInfinity ? C.arcane : gs.hardMode ? C.corrupt : C.gold,
      variant: isInfinity ? 'void' : 'lattice',
      motes: 20,
    });

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

    const accent = gs.hardMode ? C.corrupt : C.gold;

    // Laurel: a slowly turning ring of gold diamonds behind the headline.
    // Drawn around the Graphics origin so the rotation tween spins in place.
    const laurel = this.add.graphics().setDepth(DEPTH.base + 1);
    for (let i = 0; i < 28; i++) {
      const a = (Math.PI * 2 * i) / 28;
      fillDiamond(laurel, Math.cos(a) * 210, Math.sin(a) * 96, 3, accent, 0.25);
    }
    laurel.setPosition(cx, cy - 96);
    this.tweens.add({ targets: laurel, angle: 360, duration: 180000, repeat: -1 });

    this.add.text(cx, cy - 176, `${elEmoji}  ${elName.toUpperCase()} GAUNTLET`, {
      fontSize: '20px', fontFamily: FONT_DISPLAY,
      color: hex(mix(accent, 0xffffff, 0.45)), letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const heading = addTitle(this, {
      x: cx, y: cy - 116, text: titleText, accent, size: gs.hardMode ? 40 : 54,
      subtitle: `YOU SURVIVED ALL ${battleCount} BATTLES AND FELLED THE BOSS`,
    });
    this.tweens.add({
      targets: heading.text, scaleX: 1.03, scaleY: 1.03,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    void titleColor;

    const rewardLabel = isCampaign
      ? `+${reward} ⚡`
      : (curseShardMult > 1 ? `+${reward} 💎   ×${curseShardMult.toFixed(2)} curse bonus` : `+${reward} 💎`);
    this.add.text(cx, cy + 6, rewardLabel, {
      fontSize: '32px', fontFamily: FONT_DISPLAY,
      color: hex(mix(accent, 0xffffff, 0.55)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    if (newlyUnlocked.length > 0) {
      const unlockDef = getMutationDef(newlyUnlocked[0])!;
      this.add.text(cx, cy + 56, '✨  NEW MUTATION UNLOCKED  ✨', {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 3,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(cx, cy + 82, `${unlockDef.emoji}   ${unlockDef.name.toUpperCase()}`, {
        fontSize: '18px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    }

    const goBack = () => {
      if (isCampaign) {
        this.scene.start('CampaignWorldScene', { worldId: gs.campaignContext!.worldId, slotIdx: gs.campaignContext!.slot });
      } else {
        this.scene.start('GauntletSelectScene');
      }
    };

    addButton(this, {
      x: cx, y: cy + (newlyUnlocked.length > 0 ? 146 : 108), w: 300, h: 60,
      label: isCampaign ? 'BACK TO WORLD' : 'BACK TO GAUNTLETS',
      icon: '◄', accent: C.verdant, variant: 'solid', fontSize: 19,
      onClick: goBack,
    }).pulse();

    this.input.keyboard!.on('keydown-ESC', goBack);
  }

  // ── Boost selection ──────────────────────────────────────────────────────────

  private showBoostSelection(gs: GauntletState, cx: number, cy: number, width: number, height: number): void {
    const isInfinity = gs.gauntletElement === INFINITY_GAUNTLET_ID;
    const totalFights = gs.hardMode ? 8 : 6;
    const nextFight = gs.currentFight + 1;

    // ── Header ───────────────────────────────────────────────────────
    const runAccent = isInfinity ? C.arcane : gs.hardMode ? C.corrupt : C.gold;

    if (isInfinity) {
      this.add.text(cx, 32, `∞  INFINITY GAUNTLET${gs.hardMode ? '   🔥 HARD' : ''}`, {
        fontSize: '18px', fontFamily: FONT_DISPLAY,
        color: hex(mix(C.arcane, 0xffffff, 0.5)), letterSpacing: 4,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(cx, 68, `FIGHT ${gs.currentFight} COMPLETE`, {
        fontSize: '34px', fontFamily: FONT_DISPLAY, color: T.bright,
        stroke: hex(mix(C.arcane, 0x000000, 0.8)), strokeThickness: 5, letterSpacing: 3,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const bestFight = PlayerData.getInfinityBestFight(gs.hardMode);
      this.add.text(cx, 100, `THIS RUN 💎 ${gs.infinityShards}     ·     PERSONAL BEST  FIGHT ${bestFight}`, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    } else {
      const elDef = GAUNTLET_ELEMENTS.find((e) => e.id === gs.gauntletElement) ?? getAnyWorld(gs.gauntletElement);
      const elEmoji = elDef?.emoji ?? '🏆';
      const elName = elDef ? ('name' in elDef ? elDef.name : '') : gs.gauntletElement;
      this.add.text(cx, 30, `${elEmoji} ${elName.toUpperCase()} GAUNTLET${gs.hardMode ? '   🔥 HARD' : ''}`, {
        fontSize: '18px', fontFamily: FONT_DISPLAY,
        color: hex(mix(runAccent, 0xffffff, 0.45)), letterSpacing: 4,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(cx, 66, `FIGHT ${gs.currentFight} COMPLETE`, {
        fontSize: '36px', fontFamily: FONT_DISPLAY, color: T.bright,
        stroke: hex(mix(runAccent, 0x000000, 0.8)), strokeThickness: 5, letterSpacing: 3,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.drawProgress(cx, 108, gs.currentFight, totalFights);
    }

    // ── Deck summary ─────────────────────────────────────────────────
    const deckY = isInfinity ? 128 : 132;
    this.renderDeckSummary(gs, cx, deckY, width);

    // ── Pick header (includes shard bonus if active) ─────────────────
    const curseMult = computeCurseShardMult(gs.boosts);
    const pickHeaderY = deckY + 28;
    const shardSuffix = curseMult > 1 ? `  💎×${curseMult.toFixed(2)}` : '';
    addSectionLabel(this, {
      x: cx, y: pickHeaderY, text: `CHOOSE ONE${shardSuffix}`,
      accent: C.frost, width: 620,
    });

    // ── Roll picks and render grid ───────────────────────────────────
    const picks = rollPicks(gs.boosts);
    const cardCellW = 132;
    const cardCellH = 126;
    const cellGap = 10;

    let selectedDef: BoostDef | null = null;
    /** Repaint hooks for every pick tile, so selecting one dims the rest. */
    const cellPainters: Array<{ def: BoostDef; paint: (s: 'idle' | 'hover' | 'active') => void }> = [];

    const isBossFight = !isInfinity && nextFight === totalFights;
    const nextBtnY = height - 46;

    // Locked until a pick is made — the button itself carries that state.
    const nextBtn: UiButton = addButton(this, {
      x: cx, y: nextBtnY, w: 320, h: 52,
      label: isBossFight ? 'FIGHT THE BOSS' : isInfinity ? `NEXT FIGHT ${nextFight}` : 'NEXT FIGHT',
      icon: isBossFight ? '☠' : '▶',
      sublabel: 'Choose a boost first',
      accent: isBossFight ? C.blood : C.verdant,
      variant: 'solid', fontSize: 19,
      disabled: true,
      onClick: () => {
        if (!selectedDef) return;
        const kind = selectedDef.kind === 'card' ? 'cards' : selectedDef.kind === 'charm' ? 'charms' : 'curses';
        const newGs: GauntletState = {
          ...gs,
          currentFight: nextFight,
          boosts: addBoostPick(gs.boosts, kind, selectedDef.id),
        };
        this.launchNextFight(newGs);
      },
    });

    /** Called when a pick is chosen: light the winner, dim the losers, arm the button. */
    const selectPick = (def: BoostDef): void => {
      selectedDef = def;
      for (const cell of cellPainters) cell.paint(cell.def === def ? 'active' : 'idle');
      nextBtn.setDisabled(false);
      nextBtn.setSublabel(`Taking ${def.name}`);
    };

    /** One pick tile — shared by the card, charm and curse rows. */
    const buildPick = (def: BoostDef, bx: number, by: number, w: number, h: number, wide: boolean): void => {
      const borderCol = boostBorderColor(def);
      const labelCol = boostLabelColor(def);
      const currentStacks = getEffectiveStacks(gs.boosts, def.id);

      const plate = addCardPlate(this, { x: bx, y: by, w, h, accent: borderCol, cut: 12 });
      cellPainters.push({ def, paint: plate.paint });

      if (wide) {
        const left = bx - w / 2;
        this.add.text(left + 30, by, def.emoji, { fontSize: '28px' })
          .setOrigin(0.5).setDepth(DEPTH.content);
        this.add.text(left + 58, by - 11, def.name, {
          fontSize: '14px', fontFamily: FONT_DISPLAY, color: labelCol, letterSpacing: 0.5,
        }).setOrigin(0, 0.5).setDepth(DEPTH.content);
        this.add.text(left + 58, by + 11, def.description, {
          fontSize: '10px', fontFamily: FONT_UI, color: T.dim,
          wordWrap: { width: w - 92 },
        }).setOrigin(0, 0.5).setDepth(DEPTH.content);
      } else {
        this.add.text(bx, by - 46, def.emoji, { fontSize: '28px' })
          .setOrigin(0.5).setDepth(DEPTH.content);
        this.add.text(bx, by - 16, def.name, {
          fontSize: '13px', fontFamily: FONT_DISPLAY, color: labelCol,
          wordWrap: { width: w - 12 }, align: 'center', letterSpacing: 0.5,
        }).setOrigin(0.5).setDepth(DEPTH.content);
        this.add.text(bx, by + 12, def.description, {
          fontSize: '10px', fontFamily: FONT_UI, color: T.dim,
          wordWrap: { width: w - 14 }, align: 'center', lineSpacing: 2,
        }).setOrigin(0.5).setDepth(DEPTH.content);
      }

      // Stack counter, if this boost is already in the deck.
      if (currentStacks > 0) {
        const sx = bx + w / 2 - 16;
        const sy = by - h / 2 + 12;
        const g = this.add.graphics().setDepth(DEPTH.content);
        fillDiamond(g, sx, sy, 12, mix(C.gold, 0x000000, 0.7), 1);
        g.lineStyle(1, C.gold, 0.9);
        g.beginPath();
        g.moveTo(sx, sy - 12); g.lineTo(sx + 12, sy); g.lineTo(sx, sy + 12); g.lineTo(sx - 12, sy);
        g.closePath(); g.strokePath();
        this.add.text(sx, sy, `${currentStacks}`, {
          fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.gold,
        }).setOrigin(0.5).setDepth(DEPTH.content + 1);
      }

      const hit = this.add.rectangle(bx, by, w, h, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { if (selectedDef !== def) plate.paint('hover'); });
      hit.on('pointerout', () => { if (selectedDef !== def) plate.paint('idle'); });
      hit.on('pointerdown', () => selectPick(def));
    };

    const renderRow = (items: BoostDef[], rowY: number, rowLabel: string): void => {
      addSectionLabel(this, { x: cx, y: rowY - 10, text: rowLabel, accent: C.steel, width: 480 });

      // Charm of Greed adds two cards per stack, which is more than a 960-wide row
      // holds at full size — the cells narrow to fit rather than sliding off-screen.
      const maxRowW = this.scale.width - 40;
      const rawW = items.length * cardCellW + (items.length - 1) * cellGap;
      const cellW = rawW <= maxRowW
        ? cardCellW
        : Math.floor((maxRowW - (items.length - 1) * cellGap) / items.length);
      const totalW = items.length * cellW + (items.length - 1) * cellGap;
      const startX = cx - totalW / 2 + cellW / 2;

      items.forEach((def, i) => {
        buildPick(def, startX + i * (cellW + cellGap), rowY + cardCellH / 2 + 6, cellW, cardCellH, false);
      });
    };

    // Row stack budget for a 640-tall screen: picks fill the middle, the
    // curse banner sits above the fold, and the next-fight plate holds the foot.
    const cardsY = pickHeaderY + 28;
    const charmsY = cardsY + cardCellH + 26;
    const curseY = charmsY + cardCellH + 12;

    renderRow(picks.cards, cardsY, 'CARDS');
    renderRow(picks.charms, charmsY, 'CHARMS');

    // ── Compact curse banner (single wide row) ───────────────────────
    // Curses are always offered one at a time, so they get a wide plate rather
    // than competing for space in the three-up grid.
    const curseBannerH = 66;
    const curseBannerW = 440;

    addSectionLabel(this, { x: cx, y: curseY - 10, text: 'CURSE', accent: C.blood, width: 480 });
    buildPick(picks.curse, cx, curseY + curseBannerH / 2 + 6, curseBannerW, curseBannerH, true);
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

    this.add.text(cx, y, allParts.join('   '), {
      fontSize: '11px', fontFamily: FONT_UI, color: T.dim,
      wordWrap: { width: width - 80 }, align: 'center', letterSpacing: 0.5,
    }).setOrigin(0.5).setDepth(DEPTH.content);
  }

  // ── Progress dots ────────────────────────────────────────────────────────────

  /**
   * Run tracker: a hex per fight along a rail, the boss marked with a diamond.
   * Cleared fights are lit; the one you are about to enter pulses.
   */
  private drawProgress(cx: number, y: number, completedFights: number, totalFights: number): void {
    const dotR = totalFights > 6 ? 9 : 11;
    const dotGap = totalFights > 6 ? 20 : 26;
    const totalW = totalFights * dotR * 2 + (totalFights - 1) * dotGap;
    const startX = cx - totalW / 2 + dotR;
    const g = this.add.graphics().setDepth(DEPTH.content);

    // Rail behind the markers.
    g.lineStyle(2, C.line, 0.6);
    g.beginPath(); g.moveTo(startX, y); g.lineTo(startX + totalW - dotR * 2, y); g.strokePath();

    for (let i = 0; i < totalFights; i++) {
      const dx = startX + i * (dotR * 2 + dotGap);
      const isBoss = i === totalFights - 1;
      const done = i < completedFights;
      const next = i === completedFights;
      const color = done ? C.verdant : isBoss ? C.blood : C.line;

      if (done) {
        for (let k = 3; k >= 1; k--) {
          g.fillStyle(color, 0.06);
          g.fillCircle(dx, y, dotR + k * 3);
        }
      }

      if (isBoss) {
        fillDiamond(g, dx, y, dotR + 2, mix(color, 0x000000, done ? 0.25 : 0.5), done ? 1 : 0.75);
        g.lineStyle(2, mix(color, 0xffffff, 0.4), done ? 1 : 0.6);
        g.beginPath();
        g.moveTo(dx, y - dotR - 2); g.lineTo(dx + dotR + 2, y);
        g.lineTo(dx, y + dotR + 2); g.lineTo(dx - dotR - 2, y);
        g.closePath(); g.strokePath();
      } else {
        fillHex(g, dx, y, dotR, mix(color, 0x000000, done ? 0.3 : 0.6), 1);
        strokeHex(g, dx, y, dotR, mix(color, 0xffffff, 0.35), done ? 1 : 0.5, 2);
      }

      // The upcoming fight gets a bright outer ring so the eye lands on it.
      if (next) strokeHex(g, dx, y, dotR + 5, C.gold, 0.7, 1);
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
        difficulty: GAUNTLET_MAX_DIFFICULTY,
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
        difficulty: gauntletDifficulty(diffArray[idx]),
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
    const difficulty = gauntletDifficulty(infinityDifficulty(fightNum));
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
