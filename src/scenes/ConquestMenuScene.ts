import Phaser from 'phaser';
import { C, T, DEPTH, FONT_DISPLAY, FONT_MONO, FONT_UI, addButton, addModal, hex, mix } from '../ui';
import type { ConquestMenuHost, ConquestMenuModel } from '../elements/kits/ConquestKit';
import { KIND_EMOJI, PATH_LABEL, PathIdx, UPGRADES } from '../elements/kits/ConquestUpgrades';

/** Column geometry, by how many paths the building is showing. Three is the shop-upgraded tree. */
const LAYOUT = {
  2: { modalW: 660, colW: 286, gap: 320 },
  3: { modalW: 924, colW: 282, gap: 292 },
} as const;

/**
 * The building upgrade menu — Conquest's one piece of UI, and the only place in the game where
 * a match stops for a shop.
 *
 * It runs as a scene over a paused ArenaScene rather than as an overlay inside it, for the same
 * reason PauseMenuScene does: pausing the arena stops its clock, and ArenaScene already shifts
 * every `Date.now()` cooldown forward by the pause on RESUME. A two-path four-tier menu is not
 * readable while somebody is shooting at you, and buying the wrong tier is unrecoverable —
 * BTD6's path rule means a misclick can permanently cap the other half of the building.
 *
 * Everything it knows comes from one flat `ConquestMenuModel` snapshot, re-pulled after every
 * purchase. The scene never touches a building.
 */
export class ConquestMenuScene extends Phaser.Scene {
  private parentSceneKey = 'ArenaScene';
  private host!: ConquestMenuHost;
  /** Rebuilt wholesale after each purchase — a tier change moves every row. */
  private content: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'ConquestMenuScene' });
  }

  init(data: { parentSceneKey: string; host: ConquestMenuHost }): void {
    this.parentSceneKey = data.parentSceneKey ?? 'ArenaScene';
    this.host = data.host;
  }

  create(): void {
    const model = this.host?.getMenuModel();
    if (!model) { this.close(); return; }

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const modal = addModal(this, {
      w: LAYOUT[model.paths.length === 3 ? 3 : 2].modalW, h: 520, accent: model.color,
      title: `${KIND_EMOJI[model.kind]}  ${model.title}`,
      glow: 0.5, scrimAlpha: 0.72,
      onScrimClick: () => this.close(),
    });
    modal.g.setScrollFactor(0);
    for (const o of modal.objects) (o as Phaser.GameObjects.Text).setScrollFactor?.(0);
    modal.scrim.setScrollFactor(0);

    addButton(this, {
      x: cx, y: cy + 218, w: 200, h: 38,
      label: 'CLOSE', icon: '✕', accent: C.steel, variant: 'quiet', fontSize: 13,
      depth: DEPTH.modalContent,
      onClick: () => this.close(),
    });

    this.input.keyboard!.on('keydown-ESC', () => this.close());

    this.render(cx, cy);
  }

  /** Tears down and rebuilds the two columns. Cheap enough — it only runs on a purchase. */
  private render(cx: number, cy: number): void {
    for (const o of this.content) o.destroy();
    this.content = [];

    const model = this.host.getMenuModel();
    if (!model) { this.close(); return; }

    // ── Header line: what this building is worth right now ──
    const stat = model.destructible
      ? `${model.hp} / ${model.maxHp} HP`
      : 'INDESTRUCTIBLE';
    this.push(this.add.text(cx, cy - 208, stat, {
      fontSize: '12px', fontFamily: FONT_MONO, color: T.dim, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    this.push(this.add.text(cx, cy - 186, `👑 ${model.authority} AUTHORITY`, {
      fontSize: '17px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    const lay = LAYOUT[model.paths.length === 3 ? 3 : 2];
    // Columns are centred as a group, so a two-path tree keeps the layout it always had and a
    // three-path one simply grows outward from the same middle.
    const span = lay.gap * (model.paths.length - 1);
    model.paths.forEach((path, i) => {
      this.renderPath(model, path, i, cx - span / 2 + i * lay.gap, cy - 150, lay.colW);
    });

    // Personal Wall's one action. Sits under the columns because it spends nothing — it is a
    // choice about this wall rather than a purchase on it.
    if (model.link) {
      const label = model.link === 'linked' ? 'UNLINK FROM THIS WALL'
        : model.link === 'elsewhere' ? 'LINK HERE INSTEAD'
        : 'LINK YOURSELF TO THIS WALL';
      const btn = addButton(this, {
        x: cx, y: cy + 158, w: 300, h: 34,
        label, icon: '⛓️',
        accent: model.link === 'linked' ? C.gold : model.color,
        variant: model.link === 'linked' ? 'solid' : 'quiet',
        fontSize: 11, depth: DEPTH.modalContent,
        onClick: () => {
          if (!this.host.toggleLink()) return;
          this.render(this.scale.width / 2, this.scale.height / 2);
        },
      });
      this.push(btn.container);
    }

    // The market's buttons. Same place as the link and for the same reason — none of them is a
    // tier, so none of them belongs in a column — but there can be several, so they share a row.
    if (model.actions.length) {
      const lay2 = LAYOUT[model.paths.length === 3 ? 3 : 2];
      const gap = 10;
      const w = Math.min(230, (lay2.modalW - 60) / model.actions.length - gap);
      const span = (w + gap) * (model.actions.length - 1);
      model.actions.forEach((action, i) => {
        const btn = addButton(this, {
          x: cx - span / 2 + i * (w + gap), y: cy + 150, w, h: 34,
          label: action.label, icon: action.icon,
          trailing: action.blocked ?? undefined,
          trailingColor: T.bad,
          accent: action.active ? C.gold : model.color,
          variant: action.active ? 'solid' : 'quiet',
          fontSize: 11, depth: DEPTH.modalContent,
          disabled: !!action.blocked,
          onClick: () => {
            if (!this.host.runAction(action.id)) return;
            this.render(this.scale.width / 2, this.scale.height / 2);
          },
        });
        this.push(btn.container);
      });
    }

    // What the stall is currently holding, and what is currently running on it.
    if (model.status) {
      this.push(this.add.text(cx, cy + 174, model.status, {
        fontSize: '11px', fontFamily: FONT_MONO, color: T.gold, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    }

    // The rule, stated where it can still be acted on rather than discovered.
    this.push(this.add.text(cx, cy + 186,
      'One path only past tier 2 — committing to a third tier caps the others.', {
        fontSize: '10px', fontFamily: FONT_UI, color: T.faint, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
  }

  /** One column: four tier plates, then the buy button for whichever is next. */
  private renderPath(
    model: ConquestMenuModel, path: PathIdx, slot: number, x: number, top: number, w: number,
  ): void {
    const defs = UPGRADES[model.kind][path];
    const tier = model.tiers[path];
    // Each column takes a distinct shade of the town's own colour, so which track a plate belongs
    // to survives being read at the far edge of a 900px modal.
    const accent = path === 0 ? model.color
      : path === 1 ? mix(model.color, 0xffffff, 0.4)
      : mix(model.color, C.arcane, 0.65);

    this.push(this.add.text(x, top, PATH_LABEL[model.kind][path], {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.5)), letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    for (let i = 0; i < 4; i++) {
      const y = top + 30 + i * 58;
      const owned = i < tier;
      const isNext = i === tier;
      const g = this.add.graphics().setDepth(DEPTH.modalContent - 1);
      const h = 52;
      // Owned tiers are lit; the next one is outlined; anything past it is a ghost, so the
      // column reads as a track you are partway along.
      g.fillStyle(owned ? mix(accent, 0x000000, 0.55) : C.well, owned ? 0.95 : 0.6);
      g.fillRect(x - w / 2, y - h / 2, w, h);
      g.lineStyle(isNext ? 2 : 1, owned ? accent : isNext ? mix(accent, 0xffffff, 0.3) : C.line,
        owned ? 0.9 : isNext ? 0.8 : 0.3);
      g.strokeRect(x - w / 2, y - h / 2, w, h);
      // Tier pips down the left edge.
      g.fillStyle(owned ? accent : C.line, owned ? 1 : 0.4);
      g.fillRect(x - w / 2, y - h / 2 + 2, 3, h - 4);
      this.push(g);

      const titleColor = owned ? hex(mix(accent, 0xffffff, 0.6)) : isNext ? T.bright : T.ghost;
      this.push(this.add.text(x - w / 2 + 12, y - 17, `${i + 1}. ${defs[i].name}`, {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: titleColor, letterSpacing: 1,
      }).setDepth(DEPTH.modalContent));

      this.push(this.add.text(x - w / 2 + 12, y - 2, defs[i].desc, {
        fontSize: '9.5px', fontFamily: FONT_UI,
        color: owned ? T.dim : isNext ? T.normal : T.ghost,
        wordWrap: { width: w - 60 },
        lineSpacing: -1,
      }).setDepth(DEPTH.modalContent));

      this.push(this.add.text(x + w / 2 - 10, y - 17, owned ? '✓' : `${defs[i].cost}`, {
        fontSize: owned ? '13px' : '12px', fontFamily: FONT_MONO,
        color: owned ? T.good : isNext ? T.gold : T.ghost,
      }).setOrigin(1, 0).setDepth(DEPTH.modalContent));
    }

    // ── The buy button ──
    const y = top + 30 + 4 * 58 + 6;
    const next = model.next[slot];
    const blocked = model.blocked[slot];
    if (!next) {
      this.push(this.add.text(x, y, blocked ?? 'MAXED', {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
        wordWrap: { width: w },
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
      return;
    }

    const btn = addButton(this, {
      x, y, w, h: 38,
      label: next.name.toUpperCase(),
      trailing: `👑 ${next.cost}`,
      trailingColor: blocked ? T.bad : T.gold,
      accent, variant: blocked ? 'quiet' : 'solid', fontSize: 12,
      depth: DEPTH.modalContent,
      disabled: !!blocked,
      onClick: () => {
        if (!this.host.buyUpgrade(path)) return;
        this.render(this.scale.width / 2, this.scale.height / 2);
      },
    });
    this.push(btn.container);
  }

  private push(o: Phaser.GameObjects.GameObject): void {
    (o as Phaser.GameObjects.Text).setScrollFactor?.(0);
    this.content.push(o);
  }

  private close(): void {
    this.host?.closeUpgradeMenu();
    this.scene.resume(this.parentSceneKey);
    this.scene.stop();
  }
}
