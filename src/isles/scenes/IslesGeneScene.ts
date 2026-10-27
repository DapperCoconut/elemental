import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI, FONT_MONO } from '../../ui';
import { Sfx } from '../../audio';
import { findElementDef } from '../../data/ElementRoster';
import { describeEffect } from '../../data/Items';
import * as Save from '../IslesSave';
import { getGeneTree } from '../IslesRegistry';
import type { GeneGrant, GeneNode, GeneTree } from '../IslesTypes';
import { isMastered, masteryKey, nextCost, nodeUnlocked } from '../systems/Genome';

/**
 * The Gene tab: the current element's tree, grown from the bottom. Each node levels with Orbs;
 * a maxed node can be Mastered for a bonus; the top row is Enlightened and never maxes. The
 * strand animating down the left is the element's colour — purely for the joy of it.
 */

const COLS = [250, 410, 570];
const ROW_Y = (tier: number) => 548 - tier * 104;
const NODE_R = 25;

export class IslesGeneScene extends Phaser.Scene {
  private tree: GeneTree | undefined;
  private element = '';
  private color = 0xff7a2f;
  private sel = 0;
  private g!: Phaser.GameObjects.Graphics;
  private dyn: Phaser.GameObjects.GameObject[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private note = '';
  private noteUntil = 0;

  constructor() { super({ key: 'IslesGeneScene' }); }

  create(): void {
    this.element = Save.S().element;
    this.tree = getGeneTree(this.element);
    this.color = findElementDef(this.element)?.color ?? 0xff7a2f;
    this.sel = 0;
    this.g = this.add.graphics();
    this.keys = this.input.keyboard!.addKeys('W,S,A,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER,M,ESC,Q,G') as Record<string, Phaser.Input.Keyboard.Key>;
    this.render();
  }

  private close(): void {
    this.scene.resume('IsleWorldScene');
    this.scene.stop();
  }

  update(time: number): void {
    const k = this.keys, JD = Phaser.Input.Keyboard.JustDown;
    if (JD(k.ESC) || JD(k.Q) || JD(k.G)) { this.close(); return; }
    this.drawBg(time / 1000);
    if (!this.tree) return;
    const nodes = this.tree.nodes;
    const cur = nodes[this.sel];
    const move = (dTier: number, dCol: number) => {
      let best = -1, bd = Infinity;
      nodes.forEach((n, i) => {
        if (i === this.sel) return;
        const dt = n.tier - cur.tier, dc = n.col - cur.col;
        if (dTier && Math.sign(dt) !== dTier) return;
        if (dCol && (Math.sign(dc) !== dCol || dt !== 0)) return;
        const d = Math.abs(dt) * 10 + Math.abs(dc);
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0) { this.sel = best; Sfx.play('ui-hover'); this.render(); }
    };
    if (JD(k.W) || JD(k.UP)) move(1, 0);
    if (JD(k.S) || JD(k.DOWN)) move(-1, 0);
    if (JD(k.A) || JD(k.LEFT)) move(0, -1);
    if (JD(k.D) || JD(k.RIGHT)) move(0, 1);
    if (JD(k.E) || JD(k.SPACE) || JD(k.ENTER)) this.levelUp();
    if (JD(k.M)) this.master();
    if (this.note && time > this.noteUntil) { this.note = ''; this.render(); }
    this.drawTree(time / 1000);
  }

  private say(s: string): void { this.note = s; this.noteUntil = this.time.now + 2400; this.render(); }

  private levelUp(): void {
    const n = this.tree?.nodes[this.sel];
    if (!n) return;
    if (!nodeUnlocked(this.element, n)) { Sfx.play('ui-denied'); this.say('Sequence the genes beneath it first.'); return; }
    const lvl = Save.geneLevel(this.element, n.id);
    const cost = nextCost(n, lvl);
    if (cost === null) { this.say(n.mastery && !isMastered(this.element, n.id) ? 'Maxed — press M to Master it.' : 'Fully sequenced.'); return; }
    if (!Save.spendOrbs(cost)) { Sfx.play('ui-denied'); this.say(`Needs ${cost} 🔮.`); return; }
    Save.setGeneLevel(this.element, n.id, lvl + 1);
    Sfx.play('level-up');
    this.cameras.main.flash(120, 160, 120, 255);
    this.say(`${n.name} → level ${lvl + 1}`);
  }

  private master(): void {
    const n = this.tree?.nodes[this.sel];
    if (!n?.mastery) { this.say('This gene cannot be Mastered.'); return; }
    if (isMastered(this.element, n.id)) { this.say('Already Mastered.'); return; }
    if (Save.geneLevel(this.element, n.id) < n.maxLevel) { Sfx.play('ui-denied'); this.say('Max the gene before Mastering it.'); return; }
    if (!Save.spendOrbs(n.mastery.cost)) { Sfx.play('ui-denied'); this.say(`Mastery needs ${n.mastery.cost} 🔮.`); return; }
    Save.setGeneLevel(this.element, masteryKey(n.id), 1);
    Sfx.play('achievement');
    this.cameras.main.flash(260, 255, 210, 90);
    this.say(`★ ${n.mastery.name} — Mastered!`);
  }

  private drawBg(t: number): void {
    const W = this.scale.width, H = this.scale.height;
    const g = this.g;
    g.clear();
    g.fillStyle(0x06040c, 0.94); g.fillRect(0, 0, W, H);
    for (let k = 10; k >= 1; k--) { g.fillStyle(this.color, 0.012); g.fillCircle(410, 340, 30 + k * 34); }
    // The strand.
    for (let i = 0; i < 40; i++) {
      const y = (i * 18 + t * 40) % (H + 40) - 20;
      const a = y * 0.04 + t;
      const x1 = 70 + Math.sin(a) * 26, x2 = 70 - Math.sin(a) * 26;
      const front = Math.cos(a) > 0;
      g.lineStyle(2, 0xffffff, 0.12); g.lineBetween(x1, y, x2, y);
      g.fillStyle(front ? this.color : 0x9d5cff, 0.8); g.fillCircle(x1, y, 3.5);
      g.fillStyle(front ? 0x9d5cff : this.color, 0.8); g.fillCircle(x2, y, 3.5);
    }
  }

  private nodePos(n: GeneNode): { x: number; y: number } {
    return { x: COLS[Math.max(0, Math.min(2, n.col))], y: ROW_Y(n.tier) };
  }

  private drawTree(t: number): void {
    const tree = this.tree;
    if (!tree) return;
    const g = this.g;
    // Links
    for (const n of tree.nodes) {
      const p = this.nodePos(n);
      for (const id of n.needs) {
        const m = tree.nodes.find((x) => x.id === id);
        if (!m) continue;
        const q = this.nodePos(m);
        const lit = Save.geneLevel(this.element, m.id) > 0;
        g.lineStyle(lit ? 4 : 2, lit ? this.color : 0x3a3450, lit ? 0.9 : 0.8);
        g.lineBetween(q.x, q.y - NODE_R, p.x, p.y + NODE_R);
        if (lit) {
          const k = (t * 0.8 + n.col * 0.3) % 1;
          g.fillStyle(0xffffff, 0.8); g.fillCircle(q.x + (p.x - q.x) * k, q.y - NODE_R + (p.y + NODE_R - (q.y - NODE_R)) * k, 2.4);
        }
      }
    }
    tree.nodes.forEach((n, i) => {
      const p = this.nodePos(n);
      const lvl = Save.geneLevel(this.element, n.id);
      const open = nodeUnlocked(this.element, n);
      const mastered = isMastered(this.element, n.id);
      const sel = i === this.sel;
      if (sel) { g.fillStyle(this.color, 0.18 + Math.sin(t * 5) * 0.06); g.fillCircle(p.x, p.y, NODE_R + 14); }
      g.fillStyle(0x000000, 0.6); g.fillCircle(p.x + 2, p.y + 3, NODE_R + 3);
      g.fillStyle(n.infinite ? 0x2a1a3a : 0x1a1424, 1); g.fillCircle(p.x, p.y, NODE_R + 3);
      g.fillStyle(!open ? 0x2a2630 : lvl > 0 ? this.color : 0x4a3e5a, lvl > 0 ? 0.85 : 1); g.fillCircle(p.x, p.y, NODE_R);
      // Level arc
      if (!n.infinite && lvl > 0) {
        g.lineStyle(4, 0xffffff, 0.9);
        g.beginPath(); g.arc(p.x, p.y, NODE_R + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * lvl) / n.maxLevel, false); g.strokePath();
      }
      if (n.infinite) {
        g.lineStyle(2, 0xd0a8ff, 0.6 + Math.sin(t * 3) * 0.3);
        g.strokeCircle(p.x, p.y, NODE_R + 6 + Math.sin(t * 2) * 2);
      }
      if (mastered) {
        g.lineStyle(3, 0xffd23a, 1); g.strokeCircle(p.x, p.y, NODE_R + 10);
        for (let s = 0; s < 5; s++) { const a = t + (s / 5) * Math.PI * 2; g.fillStyle(0xffe08a, 1); g.fillCircle(p.x + Math.cos(a) * (NODE_R + 10), p.y + Math.sin(a) * (NODE_R + 10), 2.5); }
      }
      if (sel) { g.lineStyle(2, 0xffffff, 1); g.strokeCircle(p.x, p.y, NODE_R + 1); }
    });
  }

  private render(): void {
    for (const d of this.dyn) d.destroy();
    this.dyn = [];
    const W = this.scale.width;
    const txt = (x: number, y: number, s: string, st: Phaser.Types.GameObjects.Text.TextStyle) => { const t = this.add.text(x, y, s, st); this.dyn.push(t); return t; };
    const el = findElementDef(this.element);
    if (!this.tree) {
      txt(W / 2, 260, 'GENOME UNSEQUENCED', { fontFamily: FONT_DISPLAY, fontSize: '30px', color: '#d0a8ff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
      txt(W / 2, 310, `${el?.name ?? this.element}'s genes will be sequenced when its isle is charted.\nChange element from your bag (TAB) to grow another tree.`, { fontFamily: FONT_UI, fontSize: '16px', color: '#c8b8e8', align: 'center' }).setOrigin(0.5);
      txt(W / 2, 600, 'ESC / G to close', { fontFamily: FONT_UI, fontSize: '13px', color: '#8a7aa8' }).setOrigin(0.5);
      return;
    }
    const tree = this.tree;
    txt(140, 18, `🧬 ${tree.name.toUpperCase()}`, { fontFamily: FONT_DISPLAY, fontSize: '26px', color: '#ffffff', stroke: '#000', strokeThickness: 5 });
    txt(142, 52, `${el?.name ?? this.element} genome`, { fontFamily: FONT_UI, fontSize: '14px', color: '#c8b8e8' });
    txt(W - 18, 20, `🔮 ${Save.S().orbs}`, { fontFamily: FONT_MONO, fontSize: '20px', color: '#e0c0ff', stroke: '#000', strokeThickness: 4 }).setOrigin(1, 0);
    txt(140, 86, 'ENLIGHTENED', { fontFamily: FONT_DISPLAY, fontSize: '11px', color: '#9a7ac8' });

    tree.nodes.forEach((n, i) => {
      const p = this.nodePos(n);
      const lvl = Save.geneLevel(this.element, n.id);
      txt(p.x, p.y, n.infinite ? `∞${lvl ? lvl : ''}` : `${lvl}/${n.maxLevel}`, { fontFamily: FONT_MONO, fontSize: '13px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      txt(p.x, p.y + NODE_R + 9, n.name, { fontFamily: FONT_UI, fontSize: '10px', color: '#d8c8f0', stroke: '#000', strokeThickness: 3, align: 'center', wordWrap: { width: 140 } }).setOrigin(0.5, 0);
      const z = this.add.zone(p.x, p.y, NODE_R * 2 + 10, NODE_R * 2 + 10).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { if (this.sel === i) this.levelUp(); else { this.sel = i; this.render(); } });
      this.dyn.push(z);
    });

    // Detail
    const n = tree.nodes[this.sel];
    const lvl = Save.geneLevel(this.element, n.id);
    const open = nodeUnlocked(this.element, n);
    const cost = nextCost(n, lvl);
    const dx = 680;
    const pg = this.add.graphics();
    this.dyn.push(pg);
    pg.fillStyle(0x140e1e, 0.95); pg.fillRoundedRect(dx - 16, 96, 284, 500, 14);
    pg.lineStyle(2, this.color, 0.8); pg.strokeRoundedRect(dx - 16, 96, 284, 500, 14);
    const lines: string[] = [];
    lines.push(n.infinite ? `Enlightened · level ${lvl}` : `Tier ${n.tier + 1} · level ${lvl}/${n.maxLevel}`);
    lines.push('', n.text);
    if (lvl > 0) lines.push('', 'Now:', ...grantLines(n.grant(lvl)));
    if (cost !== null) lines.push('', `Next level: ${cost} 🔮${open ? '' : '  (locked)'}`);
    if (!open) lines.push(`Needs: ${n.needs.map((id) => tree.nodes.find((x) => x.id === id)?.name ?? id).join(', ')}`);
    if (n.mastery) {
      const m = isMastered(this.element, n.id);
      lines.push('', `${m ? '★' : '☆'} Mastery — ${n.mastery.name}`, n.mastery.text, m ? 'Mastered.' : `${n.mastery.cost} 🔮 once maxed  [M]`);
    }
    txt(dx, 110, n.name, { fontFamily: FONT_DISPLAY, fontSize: '18px', color: '#ffffff', wordWrap: { width: 250 } });
    txt(dx, 146, lines.join('\n'), { fontFamily: FONT_UI, fontSize: '13px', color: '#d8c8f0', wordWrap: { width: 250 }, lineSpacing: 3 });
    txt(W / 2 - 60, 616, 'Arrows move · E sequence · M master · ESC close', { fontFamily: FONT_UI, fontSize: '12px', color: '#8a7aa8' }).setOrigin(0.5);
    if (this.note) txt(410, 600, this.note, { fontFamily: FONT_DISPLAY, fontSize: '15px', color: '#9dffb0', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1);
  }
}

function grantLines(g: GeneGrant): string[] {
  const out: string[] = [];
  if (g.effect) out.push(...describeEffect(g.effect).map((l) => `• ${l}`));
  const c = g.onCast;
  if (c) {
    const key = c.slot === 'click' ? 'Click' : c.slot.toUpperCase();
    const bits: string[] = [];
    if (c.damageMult) bits.push(`+${Math.round((c.damageMult - 1) * 100)}% damage for ${((c.ms ?? 2000) / 1000).toFixed(1)}s`);
    if (c.speedMult) bits.push(`+${Math.round((c.speedMult - 1) * 100)}% speed for ${((c.ms ?? 2000) / 1000).toFixed(1)}s`);
    if (c.heal) bits.push(`heal ${c.heal}`);
    if (c.shield) bits.push(`+${c.shield} shield`);
    if (c.refundOthers) bits.push(`other cooldowns −${(c.refundOthers / 1000).toFixed(2)}s`);
    if (c.refundSelfChance) bits.push(`${Math.round(c.refundSelfChance * 100)}% to refund itself`);
    if (c.burst) bits.push(`${c.burst.damage} damage burst (r${c.burst.radius})`);
    out.push(`• On ${key}: ${bits.join(', ')}`);
  }
  return out;
}
