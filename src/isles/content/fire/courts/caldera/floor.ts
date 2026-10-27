import type { ArenaFloor } from '../../../../IslesTypes';
import { blob, mixC } from '../../../../art/IsleArt';
import { CAL, basaltColumn, hexPts } from './palette';

/**
 * The Caldera Court's fighting floor: a quarry ledge on the crater bottom. Black obsidian
 * ground chipped into glassy flakes, a crusted lava seam wandering along the bottom edge, a
 * sulphur stain in one corner, and the cut face of the quarry — basalt columns and stacked
 * obsidian blocks — along the top wall where the miners left off. The five gimmicks paint
 * their own rules over this, so the middle stays calm.
 */
export const calderaFloor: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(CAL.obsidian, 1); g.fillRect(0, 0, W, H);
  // Broad glassy sheets, slightly violet, catching the lava light.
  for (let i = 0; i < 22; i++) {
    blob(g, rng() * W, top + rng() * (H - top), 60 + rng() * 120, 26 + rng() * 50, mixC(CAL.obsidianMid, CAL.obsidianLit, rng() * 0.4), 0.55, rng);
  }
  // Conchoidal chips: curved white gleams where the glass was struck.
  for (let i = 0; i < 70; i++) {
    const x = rng() * W, y = top + rng() * (H - top);
    const r = 4 + rng() * 9;
    g.lineStyle(1, CAL.glassGleam, 0.12 + rng() * 0.2);
    g.beginPath(); g.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.7, false); g.strokePath();
  }
  // Ash grit.
  for (let i = 0; i < 900; i++) {
    g.fillStyle(rng() < 0.7 ? CAL.ash : CAL.ashLight, 0.08 + rng() * 0.18);
    g.fillRect(rng() * W, top + rng() * (H - top), 1 + rng() * 2, 1);
  }
  // A crusted lava seam along the bottom edge.
  const seam: { x: number; y: number }[] = [];
  for (let x = -20; x <= W + 20; x += 40) seam.push({ x, y: H - 10 - Math.sin(x / 90) * 8 - rng() * 6 });
  g.lineStyle(26, CAL.crust, 1);
  g.beginPath(); g.moveTo(seam[0].x, seam[0].y); for (const p of seam) g.lineTo(p.x, p.y); g.strokePath();
  g.lineStyle(6, CAL.lava, 0.7);
  g.beginPath(); g.moveTo(seam[0].x, seam[0].y); for (const p of seam) g.lineTo(p.x, p.y); g.strokePath();
  for (const p of seam) {
    g.fillStyle(CAL.crustMid, 1); g.fillEllipse(p.x + rng() * 20, p.y + (rng() - 0.5) * 6, 22 + rng() * 14, 9);
  }
  // A sulphur stain in the lower-left corner, crusted yellow round a dead vent.
  blob(g, 70, H - 70, 70, 40, CAL.sulphurDark, 0.45, rng);
  blob(g, 70, H - 72, 44, 24, CAL.sulphur, 0.35, rng);
  g.fillStyle(CAL.basaltDark, 1); g.fillEllipse(70, H - 72, 22, 10);
  // The quarry face along the top wall: column stumps and cut obsidian blocks.
  for (let x = 20; x < W; x += 52 + rng() * 18) {
    const h = 26 + rng() * 34;
    if (rng() < 0.55) basaltColumn(g, x, top + 18 + rng() * 6, 17 + rng() * 6, h, rng() * 0.4, rng() < 0.2 ? 0.4 : 0);
    else {
      const bw = 34 + rng() * 16, bh = 18 + rng() * 10, y = top + 22;
      g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 2, bw * 1.2, 10);
      g.fillStyle(0x0b0910, 1); g.fillRect(x - bw / 2, y - bh, bw, bh);
      g.fillStyle(CAL.obsidianLit, 1); g.fillRect(x - bw / 2, y - bh - 6, bw, 6);
      g.lineStyle(1, CAL.glassGleam, 0.5); g.lineBetween(x - bw / 2 + 4, y - bh + 4, x - bw / 2 + 12, y - 4);
    }
  }
  // Faint chalked hex marks — the miners' cut lines, left on the floor.
  g.lineStyle(1, CAL.ashLight, 0.08);
  for (let i = 0; i < 6; i++) {
    g.strokePoints(hexPts(160 + rng() * (W - 320), top + 120 + rng() * (H - top - 220), 30 + rng() * 20, 0, 1), true, true);
  }
};
