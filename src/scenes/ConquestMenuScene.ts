import Phaser from 'phaser';
import { C, T, DEPTH, FONT_DISPLAY, FONT_MONO, FONT_UI, addButton, addModal, hex, mix } from '../ui';
import type { ConquestMenuHost, ConquestMenuModel } from '../elements/kits/ConquestKit';
import { KIND_EMOJI, PATH_LABEL, UPGRADES } from '../elements/kits/ConquestUpgrades';

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
      w: 660, h: 520, accent: model.color,
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

    for (const path of [0, 1] as const) {
      this.renderPath(model, path, cx + (path === 0 ? -160 : 160), cy - 150);
    }

    // The rule, stated where it can still be acted on rather than discovered.
    this.push(this.add.text(cx, cy + 186,
      'One path only past tier 2 — committing to a third tier caps the other side.', {
        fontSize: '10px', fontFamily: FONT_UI, color: T.faint, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
  }

  /** One column: four tier plates, then the buy button for whichever is next. */
  private renderPath(model: ConquestMenuModel, path: 0 | 1, x: number, top: number): void {
    const defs = UPGRADES[model.kind][path];
    const tier = model.tiers[path];
    const accent = path === 0 ? model.color : mix(model.color, 0xffffff, 0.4);

    this.push(this.add.text(x, top, PATH_LABEL[model.kind][path], {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.5)), letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    for (let i = 0; i < 4; i++) {
      const y = top + 30 + i * 58;
      const owned = i < tier;
      const isNext = i === tier;
      const g = this.add.graphics().setDepth(DEPTH.modalContent - 1);
      const w = 286;
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
    const next = model.next[path];
    const blocked = model.blocked[path];
    if (!next) {
      this.push(this.add.text(x, y, blocked ?? 'MAXED', {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
      return;
    }

    const btn = addButton(this, {
      x, y, w: 286, h: 38,
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
