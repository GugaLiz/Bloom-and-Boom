import Phaser from 'phaser';
import type { SkillId } from '../config/gameConfig';

export const COLORS = { bg: 0x152d26, cream: 0xf2edd9, muted: 0x9aaf98, lime: 0xc4dd86, coral: 0xf69a72, soil: 0x59735b, danger: 0x253235 };
export function label(scene: Phaser.Scene, x: number, y: number, value: string, size = 22, color = '#f2edd9'): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif', fontSize: `${size}px`, color, lineSpacing: 8 });
}
// 必须在同一按钮上重新落指再抬起才触发，防止移动手指在升级弹窗出现时误选。
export function tap(scene: Phaser.Scene, x: number, y: number, width: number, height: number, action: () => void): Phaser.GameObjects.Zone {
  const zone = scene.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
  let owner: number | null = null;
  zone.on('pointerdown', (p: Phaser.Input.Pointer) => { if (owner === null) owner = p.id; });
  zone.on('pointerout', () => { owner = null; });
  zone.on('pointerup', (p: Phaser.Input.Pointer) => { const pressed = owner === p.id; owner = null; if (pressed) action(); });
  return zone;
}
export function pill(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha).fillRoundedRect(x, y, w, h, Math.min(12, w / 2, h / 2));
}
export function melon(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color = COLORS.coral): void {
  g.fillStyle(0x142d26, 0.2).fillEllipse(x + 2, y + r * 0.8, r * 2, r * 0.6);
  g.fillStyle(color).fillCircle(x, y, r);
  g.lineStyle(Math.max(2, r * 0.12), 0x635f3b, 0.5).strokeEllipse(x, y, r, r * 1.8);
  g.fillStyle(COLORS.lime).fillEllipse(x + r * 0.35, y - r, r, r * 0.4);
  g.lineStyle(3, COLORS.lime).lineBetween(x, y - r * 0.7, x + r * 0.1, y - r * 1.35);
}
export function sprout(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, mature = true, empowered = false): void {
  g.fillStyle(0x122920, 0.25).fillEllipse(x, y + r, r * 2.3, r * 0.7);
  g.lineStyle(r * 0.25, 0x294b30).lineBetween(x, y + r, x, y - r * 0.7);
  g.fillStyle(empowered ? 0xe8c26d : 0xc4dd86);
  g.fillEllipse(x - r * 0.5, y, r * 1.45, r * 0.7);
  g.fillEllipse(x + r * 0.5, y - r * 0.4, r * 1.45, r * 0.7);
  if (mature) {
    g.fillStyle(0x9ebd69).fillCircle(x, y - r * 0.85, r * 0.65);
    g.fillStyle(0x34543a).fillCircle(x + r * 0.36, y - r * 0.85, r * 0.3);
    g.fillStyle(COLORS.cream).fillCircle(x - r * 0.18, y - r, r * 0.12);
  }
}

export function skillIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, id: SkillId, r = 35): void {
  if (id === 'sprayVine') { sprout(g, x, y, r); return; }
  if (id === 'burstMelon') { melon(g, x, y, r); return; }
  if (id === 'pea') {
    g.fillStyle(0x325c3b).fillRoundedRect(x - r, y - r * 0.5, r * 1.7, r, 8);
    g.fillStyle(0x9bd278).fillEllipse(x + r * 0.6, y, r * 0.7, r * 1.1);
    g.fillStyle(0x2c5436).fillEllipse(x + r * 0.73, y, r * 0.3, r * 0.6);
    g.fillStyle(0xc9dfa1).fillRoundedRect(x - r * 0.7, y + r * 0.3, r * 0.5, r * 0.6, 5);
    g.fillStyle(0xdcee9f).fillCircle(x + r * 1.3, y - 3, r * 0.17); return;
  }
  if (id === 'frost') {
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      g.lineStyle(5, 0xc4f1ed).lineBetween(x, y, x + dx * r, y + dy * r);
      g.fillStyle(0x7eced7).fillCircle(x + dx * r * 0.7, y + dy * r * 0.7, r * 0.19);
    }
    g.fillStyle(0xe4f5cc).fillCircle(x, y, r * 0.24); return;
  }
  if (id === 'thorns') {
    g.lineStyle(8, 0x9a6b9d).strokeCircle(x, y, r * 0.8);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
      g.fillStyle(0xdfb0d2).fillTriangle(x + ux * r * 1.15, y + uy * r * 1.15, x + ux * r * 0.6 - uy * 7, y + uy * r * 0.6 + ux * 7, x + ux * r * 0.6 + uy * 7, y + uy * r * 0.6 - ux * 7);
    }
    return;
  }
  if (id === 'magnet') {
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.fillStyle(0xf0d778).fillCircle(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.37); }
    g.fillStyle(0x8aab59).fillCircle(x, y, r * 0.48); g.fillStyle(0xe5f0bd).fillCircle(x, y, r * 0.18); return;
  }
  g.fillStyle(0xeeb4a6).fillCircle(x - r * 0.38, y - r * 0.2, r * 0.52).fillCircle(x + r * 0.38, y - r * 0.2, r * 0.52).fillTriangle(x - r * 0.84, y, x + r * 0.84, y, x, y + r);
}
