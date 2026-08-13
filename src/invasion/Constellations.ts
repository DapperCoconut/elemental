import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { Sfx } from '../audio';

/**
 * The Observatory's telescope, and the nine things written on the sky.
 *
 * Looking through the glass shows the night over the mansion. Every constellation
 * up there can be *aligned* — paid for in the corrupt shards this run has earned
 * so far, not the ones in your pocket at home. An aligned constellation buffs the
 * defender for the rest of the run and cannot be un-aligned, so the sky is where a
 * run's build actually gets made: bank early kills into the Hunter's Bow and hit
 * harder all night, or hoard and buy the Bulwark before wave ten.
 *
 * Costs climb as you align more (each alignment raises the price of every
 * remaining one), so nobody lights the whole sky in a single run.
 */

export interface ConstellationDef {
  id: string;
  name: string;
  emoji: string;
  /** Base price in run-earned corrupt shards. */
  cost: number;
  /** 0–1 coordinates inside the sky disc. */
  stars: Array<[number, number]>;
  /** Index pairs into `stars`. */
  lines: Array<[number, number]>;
  color: number;
  colorHex: string;
  /** One line for the buff, shown on the card. */
  effect: string;
  /** The flavour under it. */
  lore: string;
}

export const CONSTELLATIONS: ConstellationDef[] = [
  {
    id: 'warden', name: 'THE WARDEN', emoji: '🛡️', cost: 40,
    color: 0x88cc44, colorHex: '#88cc44',
    stars: [[0.5, 0.16], [0.34, 0.3], [0.66, 0.3], [0.36, 0.6], [0.64, 0.6], [0.5, 0.8]],
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]],
    effect: '+90 maximum health, healed in full on alignment.',
    lore: 'He stood the door for eleven nights. On the twelfth he was the door.',
  },
  {
    id: 'bow', name: "THE HUNTER'S BOW", emoji: '🏹', cost: 55,
    color: 0xff8844, colorHex: '#ff8844',
    stars: [[0.24, 0.2], [0.18, 0.45], [0.24, 0.72], [0.62, 0.46], [0.82, 0.46]],
    lines: [[0, 1], [1, 2], [0, 3], [2, 3], [3, 4]],
    effect: '+20% damage dealt.',
    lore: 'It was never drawn at anything that could be missed.',
  },
  {
    id: 'hare', name: 'THE SWIFT HARE', emoji: '🐇', cost: 35,
    color: 0x66ccff, colorHex: '#66ccff',
    stars: [[0.2, 0.66], [0.36, 0.5], [0.52, 0.56], [0.62, 0.34], [0.7, 0.2], [0.78, 0.36]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5]],
    effect: '+18% movement speed.',
    lore: 'Nothing in the house has ever caught it. Nothing has stopped trying.',
  },
  {
    id: 'hourglass', name: 'THE HOURGLASS', emoji: '⌛', cost: 60,
    color: 0xffdd44, colorHex: '#ffdd44',
    stars: [[0.32, 0.2], [0.68, 0.2], [0.5, 0.5], [0.32, 0.8], [0.68, 0.8]],
    lines: [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4]],
    effect: '−20% ability cooldowns.',
    lore: 'The sand in it has been falling since before the house was built.',
  },
  {
    id: 'leech', name: 'THE LEECH', emoji: '🩸', cost: 50,
    color: 0xcc2244, colorHex: '#cc2244',
    stars: [[0.22, 0.4], [0.36, 0.3], [0.5, 0.36], [0.64, 0.5], [0.72, 0.68], [0.56, 0.74]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    effect: 'Every husk you kill returns 6 health.',
    lore: 'A fair trade, if you are the one keeping the books.',
  },
  {
    id: 'coin', name: "THE MISER'S COIN", emoji: '🪙', cost: 45,
    color: 0xd8a531, colorHex: '#d8a531',
    stars: [[0.5, 0.2], [0.72, 0.34], [0.76, 0.6], [0.5, 0.78], [0.26, 0.6], [0.24, 0.34]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
    effect: '+45% corrupt shards from every kill.',
    lore: 'He counted through the whole invasion. He counted through his own.',
  },
  {
    id: 'bulwark', name: 'THE BULWARK', emoji: '🧱', cost: 75,
    color: 0x8899aa, colorHex: '#8899aa',
    stars: [[0.24, 0.32], [0.5, 0.24], [0.76, 0.32], [0.24, 0.66], [0.5, 0.74], [0.76, 0.66]],
    lines: [[0, 1], [1, 2], [0, 3], [2, 5], [3, 4], [4, 5], [1, 4]],
    effect: '−18% damage taken.',
    lore: 'The wall does not care what is on the other side of it.',
  },
  {
    id: 'torch', name: 'THE KINDLED TORCH', emoji: '🔦', cost: 40,
    color: 0xffeebb, colorHex: '#ffeebb',
    stars: [[0.5, 0.16], [0.42, 0.34], [0.58, 0.34], [0.5, 0.5], [0.5, 0.78]],
    lines: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]],
    effect: 'Half again as much torchlight, and a shield charge at every wave.',
    lore: 'Carried down into the dark by somebody who did not come back up with it.',
  },
  {
    id: 'maw', name: "THE DEVOURER'S MAW", emoji: '🦷', cost: 70,
    color: 0xb45cff, colorHex: '#b45cff',
    stars: [[0.2, 0.34], [0.34, 0.56], [0.5, 0.34], [0.66, 0.56], [0.8, 0.34], [0.5, 0.76]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [3, 5]],
    effect: '+25% critical chance, and criticals hit for half again as much.',
    lore: 'Something in the sky is chewing, and it has been for a very long time.',
  },
];

/** Each alignment raises the price of everything still dark by this much. */
const COST_ESCALATION = 0.45;

export interface ConstellationHooks {
  /** Shards this run has earned and not yet spent. */
  availableShards(): number;
  /** Spend them. Returns false when the sky asks for more than the run has. */
  spendShards(amount: number): boolean;
  readonly player: Fighter;
  showFloatingText(x: number, y: number, text: string, color: string): void;
}

const DEPTH = 62;

/**
 * The telescope's sky, and the ledger of what has been aligned this run.
 *
 * Buffs are applied the moment a constellation lights and are never taken back,
 * so this class only has to remember which ones are lit (for the HUD, for the
 * price ladder, and for the two effects the rest of the kit has to ask about:
 * the leech's on-kill heal and the torch's wider light).
 */
export class Observatory {
  private aligned = new Set<string>();
  private open = false;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private cardObjs: Phaser.GameObjects.GameObject[] = [];
  private hudLabel: Phaser.GameObjects.Text | null = null;

  constructor(private scene: Phaser.Scene, private hooks: ConstellationHooks) {}

  get isOpen(): boolean { return this.open; }
  get alignedIds(): string[] { return [...this.aligned]; }
  has(id: string): boolean { return this.aligned.has(id); }

  reset(): void {
    this.aligned.clear();
    this.close();
    this.hudLabel?.destroy();
    this.hudLabel = null;
  }

  destroy(): void {
    this.close();
    this.hudLabel?.destroy();
    this.hudLabel = null;
  }

  /** Health each kill gives back (The Leech). */
  get killHeal(): number { return this.aligned.has('leech') ? 6 : 0; }

  /** Torchlight multiplier for the apocalypse flashlight (The Kindled Torch). */
  get torchMult(): number { return this.aligned.has('torch') ? 1.5 : 1; }

  /** Called at the start of every wave — the Torch tops up a shield charge. */
  onWaveBegan(): void {
    if (!this.aligned.has('torch')) return;
    this.hooks.player.shieldCharges = Math.min(3, this.hooks.player.shieldCharges + 1);
  }

  /** What a constellation costs right now, given how much sky is already lit. */
  priceOf(def: ConstellationDef): number {
    return Math.round(def.cost * (1 + this.aligned.size * COST_ESCALATION));
  }

  // ── The sky ───────────────────────────────────────────────────────

  toggle(): void {
    if (this.open) this.close(); else this.show();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    Sfx.play('ui-open');
    const { width, height } = this.scene.scale;

    const dim = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x02030c, 0.92)
      .setDepth(DEPTH).setInteractive();
    dim.on('pointerdown', () => { /* swallowed */ });
    this.objs.push(dim);

    // The eyepiece: everything outside a circle is brass and darkness.
    const cx = width * 0.34, cy = height * 0.52;
    const R = Math.min(width * 0.3, height * 0.42);
    const sky = this.scene.add.graphics().setDepth(DEPTH + 1);
    sky.fillStyle(0x060a1e, 1);
    sky.fillCircle(cx, cy, R);
    // Milky band across the glass.
    sky.fillStyle(0x1a2450, 0.5);
    sky.fillEllipse(cx - R * 0.1, cy + R * 0.12, R * 1.7, R * 0.42);
    sky.fillStyle(0x243060, 0.35);
    sky.fillEllipse(cx - R * 0.1, cy + R * 0.12, R * 1.4, R * 0.24);
    // Field stars — deterministic, so the sky is the same sky every time.
    let seed = 90210;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * R * 0.985;
      const mag = rnd();
      sky.fillStyle(mag > 0.94 ? 0xffe0b0 : mag > 0.8 ? 0xcfe0ff : 0xe8eeff, 0.25 + mag * 0.65);
      sky.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, mag > 0.94 ? 1.9 : mag > 0.6 ? 1.2 : 0.7);
    }
    // Brass eyepiece ring with its crosshair reticle.
    sky.lineStyle(10, 0x2a1e10, 1);
    sky.strokeCircle(cx, cy, R + 5);
    sky.lineStyle(4, 0xc79b52, 1);
    sky.strokeCircle(cx, cy, R + 1);
    sky.lineStyle(1, 0x88a0c8, 0.28);
    sky.lineBetween(cx - R, cy, cx + R, cy);
    sky.lineBetween(cx, cy - R, cx, cy + R);
    sky.strokeCircle(cx, cy, R * 0.5);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      sky.lineBetween(
        cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R - 8),
        cx + Math.cos(a) * R, cy + Math.sin(a) * R,
      );
    }
    this.objs.push(sky);

    this.objs.push(this.scene.add.text(width / 2, 30, '🔭  THE SKY OVER THE MANSION', {
      fontSize: '18px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#cfe0ff', stroke: '#050a1c', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH + 4));
    this.objs.push(this.scene.add.text(width / 2, 52,
      'Click a constellation to align it. Alignment is paid from this run\'s shards and lasts the whole run.', {
        fontSize: '11px', fontFamily: 'Georgia, serif', color: '#8898c0',
      }).setOrigin(0.5).setDepth(DEPTH + 4));

    const close = this.scene.add.text(width - 26, 28, '✕', {
      fontSize: '22px', fontFamily: '"Arial Black", sans-serif', color: '#6a7a9a',
    }).setOrigin(0.5).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
    close.on('pointerover', () => close.setColor('#cfe0ff'));
    close.on('pointerout', () => close.setColor('#6a7a9a'));
    close.on('pointerdown', () => this.close());
    this.objs.push(close);

    this.repaint();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    Sfx.play('ui-close');
    this.clearCards();
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  private clearCards(): void {
    for (const o of this.cardObjs) o.destroy();
    this.cardObjs = [];
  }

  /**
   * The nine figures on the glass plus the reading panel down the right side.
   * Redrawn wholesale after every alignment, since one purchase moves every
   * other price.
   */
  private repaint(): void {
    this.clearCards();
    const { width, height } = this.scene.scale;
    const cx = width * 0.34, cy = height * 0.52;
    const R = Math.min(width * 0.3, height * 0.42);

    // Where each figure sits inside the disc — spread around a ring so none overlap.
    const g = this.scene.add.graphics().setDepth(DEPTH + 2);
    this.cardObjs.push(g);

    const hitZones: Array<{ def: ConstellationDef; x: number; y: number }> = [];
    for (let i = 0; i < CONSTELLATIONS.length; i++) {
      const def = CONSTELLATIONS[i];
      const lit = this.aligned.has(def.id);
      // Eight around a ring, the ninth dead centre.
      const centre = i === CONSTELLATIONS.length - 1;
      const a = (i / (CONSTELLATIONS.length - 1)) * Math.PI * 2 - Math.PI / 2;
      const ring = centre ? 0 : R * 0.62;
      const gx = cx + Math.cos(a) * ring;
      const gy = cy + Math.sin(a) * ring;
      const span = centre ? R * 0.34 : R * 0.3;

      const pt = (s: [number, number]): { x: number; y: number } => ({
        x: gx + (s[0] - 0.5) * span,
        y: gy + (s[1] - 0.5) * span,
      });

      g.lineStyle(lit ? 2 : 1, lit ? def.color : 0x44508a, lit ? 0.95 : 0.4);
      for (const [a0, b0] of def.lines) {
        const p = pt(def.stars[a0]);
        const q = pt(def.stars[b0]);
        g.lineBetween(p.x, p.y, q.x, q.y);
      }
      for (const s of def.stars) {
        const p = pt(s);
        if (lit) {
          g.fillStyle(def.color, 0.28);
          g.fillCircle(p.x, p.y, 7);
        }
        g.fillStyle(lit ? 0xffffff : 0xbfcae8, lit ? 1 : 0.8);
        g.fillCircle(p.x, p.y, lit ? 3 : 2.2);
      }
      hitZones.push({ def, x: gx, y: gy });

      const tag = this.scene.add.text(gx, gy + span * 0.62, `${def.emoji} ${def.name}`, {
        fontSize: '9px', fontFamily: '"Arial Black", sans-serif',
        color: lit ? def.colorHex : '#7a86b0',
      }).setOrigin(0.5).setDepth(DEPTH + 3);
      this.cardObjs.push(tag);
    }

    // Reading panel: the currently hovered (or first unaligned) constellation.
    const panelX = width * 0.76;
    let showing = CONSTELLATIONS.find((d) => !this.aligned.has(d.id)) ?? CONSTELLATIONS[0];
    const drawPanel = (): void => {
      const price = this.priceOf(showing);
      const lit = this.aligned.has(showing.id);
      const affordable = this.hooks.availableShards() >= price;
      panelG.clear();
      panelG.fillStyle(0x0a1020, 0.94);
      panelG.fillRoundedRect(panelX - 168, height * 0.2, 336, height * 0.58, 8);
      panelG.lineStyle(2, lit ? showing.color : 0x3a4a78, 1);
      panelG.strokeRoundedRect(panelX - 168, height * 0.2, 336, height * 0.58, 8);
      title.setText(`${showing.emoji}  ${showing.name}`).setColor(showing.colorHex);
      effect.setText(showing.effect);
      lore.setText(`“${showing.lore}”`);
      status.setText(lit ? '✦ ALIGNED' : affordable ? `ALIGN  —  🩸 ${price}` : `🩸 ${price}  (not enough this run)`)
        .setColor(lit ? showing.colorHex : affordable ? '#88ff99' : '#cc6666');
      buyBtn.setVisible(!lit).setFillStyle(affordable ? 0x1a3020 : 0x2a1418, 0.9)
        .setStrokeStyle(2, affordable ? 0x66cc77 : 0x884444);
      have.setText(`Run shards available:  🩸 ${this.hooks.availableShards()}`);
    };
    const panelG = this.scene.add.graphics().setDepth(DEPTH + 2);
    this.cardObjs.push(panelG);
    const title = this.scene.add.text(panelX, height * 0.2 + 24, '', {
      fontSize: '17px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
    }).setOrigin(0.5).setDepth(DEPTH + 3);
    const effect = this.scene.add.text(panelX, height * 0.2 + 62, '', {
      fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#dfe8ff',
      align: 'center', wordWrap: { width: 300 }, lineSpacing: 5,
    }).setOrigin(0.5, 0).setDepth(DEPTH + 3);
    const lore = this.scene.add.text(panelX, height * 0.2 + 140, '', {
      fontSize: '12px', fontFamily: 'Georgia, serif', color: '#7a88b8',
      align: 'center', wordWrap: { width: 292 }, lineSpacing: 5,
    }).setOrigin(0.5, 0).setDepth(DEPTH + 3);
    const have = this.scene.add.text(panelX, height * 0.2 + 218, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#8898c0',
    }).setOrigin(0.5).setDepth(DEPTH + 3);
    const buyBtn = this.scene.add.rectangle(panelX, height * 0.2 + 258, 240, 40, 0x1a3020, 0.9)
      .setStrokeStyle(2, 0x66cc77).setDepth(DEPTH + 3).setInteractive({ useHandCursor: true });
    const status = this.scene.add.text(panelX, height * 0.2 + 258, '', {
      fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: '#88ff99',
    }).setOrigin(0.5).setDepth(DEPTH + 4);
    this.cardObjs.push(title, effect, lore, have, buyBtn, status);

    buyBtn.on('pointerdown', () => this.tryAlign(showing));

    // Hit zones on the sky, so hovering a figure reads it into the panel.
    for (const hz of hitZones) {
      const zone = this.scene.add.circle(hz.x, hz.y, R * 0.19, 0xffffff, 0.001)
        .setDepth(DEPTH + 3).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => { showing = hz.def; Sfx.play('ui-hover'); drawPanel(); });
      zone.on('pointerdown', () => { showing = hz.def; this.tryAlign(hz.def); });
      this.cardObjs.push(zone);
    }

    drawPanel();
  }

  private tryAlign(def: ConstellationDef): void {
    if (this.aligned.has(def.id)) { Sfx.play('ui-denied'); return; }
    const price = this.priceOf(def);
    if (!this.hooks.spendShards(price)) {
      Sfx.play('ui-denied');
      this.hooks.showFloatingText(this.hooks.player.x, this.hooks.player.y - 40,
        `The sky asks 🩸 ${price}`, '#cc6666');
      return;
    }
    this.aligned.add(def.id);
    this.applyBuff(def);
    Sfx.play('holy-chord');
    this.scene.cameras.main.flash(220, 180, 200, 255);
    this.hooks.showFloatingText(this.hooks.player.x, this.hooks.player.y - 52,
      `${def.emoji} ${def.name} ALIGNED`, def.colorHex);
    this.refreshHud();
    if (this.open) this.repaint();
  }

  /**
   * One-shot stat writes. Every one of these is a permanent-for-the-run change
   * to the player, which is why the class never has to re-apply anything: there
   * is no expiry and no stacking beyond the single purchase each figure allows.
   */
  private applyBuff(def: ConstellationDef): void {
    const p = this.hooks.player;
    switch (def.id) {
      case 'warden':
        p.setMaxHp(p.maxHp + 90);
        p.hp = p.maxHp;
        break;
      case 'bow':
        p.cardOutgoingDamageMult *= 1.2;
        break;
      case 'hare':
        // Read back out through InvasionKit.playerHazardSpeedMult — see speedMult().
        break;
      case 'hourglass':
        p.cooldownMult *= 0.8;
        break;
      case 'bulwark':
        p.starIncomingMult *= 0.82;
        break;
      case 'maw':
        p.critChance = Math.min(1, p.critChance + 0.25);
        p.critMult *= 1.5;
        break;
      // leech / coin / torch are read back by the kit rather than written here.
      default:
        break;
    }
  }

  /** Movement multiplier the invasion kit folds into the player's speed. */
  speedMult(): number {
    return this.aligned.has('hare') ? 1.18 : 1;
  }

  /** Shard payout multiplier (The Miser's Coin). */
  shardMult(): number {
    return this.aligned.has('coin') ? 1.45 : 1;
  }

  // ── HUD ───────────────────────────────────────────────────────────

  /** A one-line strip of aligned figures, under the shard counter. */
  refreshHud(): void {
    if (this.aligned.size === 0) { this.hudLabel?.setText(''); return; }
    if (!this.hudLabel) {
      const { width } = this.scene.scale;
      this.hudLabel = this.scene.add.text(width - 16, 58, '', {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#cfe0ff',
        stroke: '#0a1020', strokeThickness: 3,
      }).setOrigin(1, 0).setDepth(25);
    }
    this.hudLabel.setText(
      CONSTELLATIONS.filter((d) => this.aligned.has(d.id)).map((d) => d.emoji).join(' '),
    );
  }
}
