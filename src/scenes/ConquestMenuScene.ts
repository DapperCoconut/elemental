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
 * The building upgrade menu — Conquest's one piece of UI.
 *
 * It runs as a scene over a *live* ArenaScene: the match does not stop for a shop any more.
 * While it is up the player is held still, ConquestKit ignores board input, and the Fighter
 * menu guard cuts incoming damage to 5% — reading a four-tier tree costs real time and a
 * little health instead of being a free timeout. Buying the wrong tier is still unrecoverable
 * (BTD6's path rule means a misclick can permanently cap the other half of the building), so
 * the modal itself is unchanged; only the world around it keeps moving.
 *
 * Everything it knows comes from one flat `ConquestMenuModel` snapshot, re-pulled after every
 * purchase. The scene never touches a building.
 */
export class ConquestMenuScene extends Phaser.Scene {
  private parentSceneKey = 'ArenaScene';
  private host!: ConquestMenuHost;
  /** Rebuilt wholesale after each purchase — a tier change moves every row. */
  private content: Phaser.GameObjects.GameObject[] = [];
  /** Last Authority figure rendered, so the live-arena poll only rebuilds on a change. */
  private lastAuthority = -1;

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
    this.drawWarMap(cx, cy, LAYOUT[model.paths.length === 3 ? 3 : 2].modalW, 520, model.color);

    addButton(this, {
      x: cx, y: cy + 218, w: 200, h: 38,
      label: 'CLOSE', icon: '✕', accent: C.steel, variant: 'quiet', fontSize: 13,
      depth: DEPTH.modalContent,
      onClick: () => this.close(),
    });

    this.input.keyboard!.on('keydown-ESC', () => this.close());

    this.render(cx, cy);
  }

  /**
   * The arena keeps running underneath, so the menu can go stale while it is read: Authority
   * keeps accruing, and the building itself can be knocked down. Poll the host — a vanished
   * model closes the menu, a changed Authority figure re-renders it (throttled to the change,
   * so the rebuild stays as rare as it was when it only followed purchases).
   */
  update(): void {
    if (!this.host) return;
    const model = this.host.getMenuModel();
    if (!model) { this.close(); return; }
    if (model.authority !== this.lastAuthority) {
      this.lastAuthority = model.authority;
      this.render(this.scale.width / 2, this.scale.height / 2);
    }
  }

  /**
   * The war table under the columns: the modal's body inked as a campaign map — a faint survey
   * grid in the town's colour, a couple of dotted march routes, a compass rose in the corner and
   * gold map-corner brackets. Drawn once; it never changes with the model.
   */
  private drawWarMap(cx: number, cy: number, w: number, h: number, color: number): void {
    const g = this.add.graphics().setDepth(DEPTH.modal + 2).setScrollFactor(0);
    const l = cx - w / 2 + 16;
    const r = cx + w / 2 - 16;
    const t = cy - h / 2 + 52;
    const b = cy + h / 2 - 16;
    g.fillStyle(mix(0x1e1610, color, 0.08), 0.55);
    g.fillRect(l, t, r - l, b - t);
    g.lineStyle(1, mix(color, 0xf2e8d0, 0.5), 0.06);
    for (let x = l + 24; x < r; x += 24) g.lineBetween(x, t, x, b);
    for (let y = t + 24; y < b; y += 24) g.lineBetween(l, y, r, y);
    // Dotted routes.
    g.fillStyle(0xc23a2e, 0.18);
    for (let i = 0; i < 40; i++) {
      const u = i / 39;
      g.fillCircle(l + 30 + u * (r - l - 60), b - 46 - Math.sin(u * Math.PI * 3) * 14, 1.4);
      g.fillCircle(l + 30 + u * (r - l - 60), t + 40 + Math.cos(u * Math.PI * 2) * 10, 1.1);
    }
    // Compass rose.
    const rx = l + 34, ry = b - 34;
    g.fillStyle(0xf2e8d0, 0.12);
    g.fillTriangle(rx, ry - 20, rx - 4, ry, rx + 4, ry);
    g.fillTriangle(rx, ry + 20, rx - 4, ry, rx + 4, ry);
    g.fillTriangle(rx - 20, ry, rx, ry - 4, rx, ry + 4);
    g.fillTriangle(rx + 20, ry, rx, ry - 4, rx, ry + 4);
    g.lineStyle(1, 0xf2e8d0, 0.12);
    g.strokeCircle(rx, ry, 12);
    // Gold corner brackets on the map.
    g.lineStyle(1.6, 0xe8c23a, 0.55);
    for (const [x0, y0, dx, dy] of [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]]) {
      g.lineBetween(x0, y0, x0 + dx * 14, y0);
      g.lineBetween(x0, y0, x0, y0 + dy * 14);
    }
  }

  /** Tears down and rebuilds the two columns. Cheap enough — it only runs on a purchase. */
  private render(cx: number, cy: number): void {
    for (const o of this.content) o.destroy();
    this.content = [];

    const model = this.host.getMenuModel();
    if (!model) { this.close(); return; }
    this.lastAuthority = model.authority;

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

    // A banner ribbon behind the column's name, swallowtailed at both ends.
    const rib = this.add.graphics().setDepth(DEPTH.modalContent - 1);
    const rw = w * 0.78;
    const rl = x - rw / 2, rr = x + rw / 2;
    const dark = mix(accent, 0x000000, 0.55);
    rib.fillStyle(mix(accent, 0x000000, 0.7), 0.95);
    rib.fillPoints([
      new Phaser.Geom.Point(rl - 14, top - 7), new Phaser.Geom.Point(rl + 2, top - 7), new Phaser.Geom.Point(rl + 2, top + 9),
      new Phaser.Geom.Point(rl - 14, top + 9), new Phaser.Geom.Point(rl - 8, top + 1),
    ], true);
    rib.fillPoints([
      new Phaser.Geom.Point(rr + 14, top - 7), new Phaser.Geom.Point(rr - 2, top - 7), new Phaser.Geom.Point(rr - 2, top + 9),
      new Phaser.Geom.Point(rr + 14, top + 9), new Phaser.Geom.Point(rr + 8, top + 1),
    ], true);
    rib.fillStyle(dark, 1);
    rib.fillRect(rl, top - 10, rw, 20);
    rib.lineStyle(1, mix(accent, 0xffffff, 0.3), 0.8);
    rib.lineBetween(rl, top - 8, rr, top - 8);
    rib.lineBetween(rl, top + 8, rr, top + 8);
    this.push(rib);

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
      // Each tier is a field order: a cut-cornered plate, inked in the column's colour once it is
      // owned, with a parchment sheen along its top edge.
      const l = x - w / 2, r = x + w / 2, t = y - h / 2, b = y + h / 2, c = 6;
      const plate = [
        new Phaser.Geom.Point(l + c, t), new Phaser.Geom.Point(r, t), new Phaser.Geom.Point(r, b - c),
        new Phaser.Geom.Point(r - c, b), new Phaser.Geom.Point(l, b), new Phaser.Geom.Point(l, t + c),
      ];
      g.fillStyle(0x000000, 0.35);
      g.fillPoints(plate.map((q) => new Phaser.Geom.Point(q.x + 2, q.y + 3)), true);
      g.fillStyle(owned ? mix(accent, 0x000000, 0.55) : C.well, owned ? 0.95 : 0.7);
      g.fillPoints(plate, true);
      g.fillStyle(0xf2e8d0, owned ? 0.08 : isNext ? 0.05 : 0.02);
      g.fillRect(l + c, t + 1, w - c, h * 0.35);
      g.lineStyle(isNext ? 2 : 1, owned ? accent : isNext ? mix(accent, 0xffffff, 0.3) : C.line,
        owned ? 0.9 : isNext ? 0.8 : 0.3);
      g.strokePoints(plate, true, true);
      // Tier ribbon down the left edge, notched at the foot like a hanging pennant.
      g.fillStyle(owned ? accent : C.line, owned ? 1 : 0.4);
      g.fillPoints([
        new Phaser.Geom.Point(l + 1, t + c + 1), new Phaser.Geom.Point(l + 5, t + c - 3),
        new Phaser.Geom.Point(l + 5, b - 2), new Phaser.Geom.Point(l + 3, b - 6), new Phaser.Geom.Point(l + 1, b - 2),
      ], true);
      if (owned) {
        // A wax seal pressed under the tick.
        const sx = r - 16, sy = y - 10;
        g.fillStyle(0x000000, 0.35);
        g.fillCircle(sx + 1, sy + 1.5, 9.5);
        g.fillStyle(mix(accent, 0x7a1010, 0.5), 1);
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2;
          g.fillCircle(sx + Math.cos(a) * 7, sy + Math.sin(a) * 7, 3);
        }
        g.fillCircle(sx, sy, 7.6);
        g.lineStyle(1, 0x000000, 0.3);
        g.strokeCircle(sx, sy, 5.4);
      } else if (isNext) {
        // The next order's corner, gilded.
        g.lineStyle(1.6, C.gold, 0.8);
        g.lineBetween(r - 12, t + 1, r - 1, t + 1);
        g.lineBetween(r - 1, t + 1, r - 1, t + 12);
      }
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

      if (owned) {
        this.push(this.add.text(x + w / 2 - 16, y - 10, '✓', {
          fontSize: '13px', fontFamily: FONT_DISPLAY, color: '#f2e8d0',
          stroke: '#2a0a08', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(DEPTH.modalContent));
      } else {
        this.push(this.add.text(x + w / 2 - 10, y - 17, `${defs[i].cost}`, {
          fontSize: '12px', fontFamily: FONT_MONO,
          color: isNext ? T.gold : T.ghost,
        }).setOrigin(1, 0).setDepth(DEPTH.modalContent));
      }
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
    // The arena was never paused — it kept running under the modal — so there is
    // nothing to resume; the guard against a stale key is in ArenaScene's opener.
    this.scene.stop();
  }
}
