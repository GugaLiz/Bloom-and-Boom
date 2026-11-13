import Phaser from 'phaser';
import { CONFIG, SKILLS } from '../config/gameConfig';
import type { GameModel } from '../core/GameModel';
import type { Vec } from '../core/types';
import { COLORS, melon, sprout } from './draw';

export function chestIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, size = 24): void {
  g.fillStyle(0x473e29).fillRoundedRect(x - size, y - size * 0.65 + 5, size * 2, size * 1.4, 5);
  g.fillStyle(0xd8a253).fillRoundedRect(x - size, y - size * 0.65, size * 2, size * 1.35, 5);
  g.lineStyle(size * 0.16, 0xf2d580).strokeRoundedRect(x - size, y - size * 0.65, size * 2, size * 1.35, 5);
  g.fillStyle(0xf2d580).fillRect(x - size * 0.18, y - size * 0.65, size * 0.36, size * 1.35);
  g.fillStyle(0x765130).fillCircle(x, y + size * 0.03, size * 0.17);
}
export class WorldRenderer {
  private g: Phaser.GameObjects.Graphics;
  private maskShape: Phaser.GameObjects.Graphics;
  private geometryMask: Phaser.Display.Masks.GeometryMask;
  private hero: Phaser.GameObjects.Image;
  private damageLabels: Phaser.GameObjects.Text[] = [];
  constructor(private scene: Phaser.Scene) {
    const { fieldX, fieldY, fieldScale } = CONFIG.VIEW;
    this.g = scene.add.graphics({ x: fieldX, y: fieldY }).setScale(fieldScale);
    this.maskShape = scene.make.graphics({ x: fieldX, y: fieldY });
    this.maskShape.fillStyle(0xffffff).fillRect(0, 0, CONFIG.WORLD.width * fieldScale, CONFIG.WORLD.height * fieldScale);
    this.geometryMask = this.maskShape.createGeometryMask(); this.g.setMask(this.geometryMask);
    this.hero = scene.add.image(0, 0, 'granny').setDisplaySize(70, 80).setMask(this.geometryMask);
    // 复用飘字对象，避免每颗子弹创建或销毁文本纹理。
    for (let i = 0; i < 40; i++) this.damageLabels.push(scene.add.text(0, 0, '', { fontFamily: 'Arial, "Microsoft YaHei", sans-serif', fontSize: '23px', fontStyle: 'bold', color: '#faf2c8', stroke: '#314e35', strokeThickness: 3 }).setOrigin(0.5).setVisible(false).setMask(this.geometryMask));
  }
  draw(model: GameModel): void {
    const g = this.g, time = model.time, W = CONFIG.WORLD.width, H = CONFIG.WORLD.height;
    g.clear().fillStyle(0x769565).fillRect(0, 0, W, H);
    const inset = model.land.inset(time);
    g.fillStyle(0x364c41);
    g.fillRect(0, 0, W, inset).fillRect(0, H - inset, W, inset).fillRect(0, inset, inset, H - inset * 2).fillRect(W - inset, inset, inset, H - inset * 2);
    g.lineStyle(3, 0xc8d598, 0.4).strokeRect(inset, inset, W - inset * 2, H - inset * 2);
    for (const plant of model.plants) {
      if (plant.state === 'mature' && plant.hp > 0) {
        g.fillStyle(0x9eb66d, 0.75).fillCircle(plant.x, plant.y, CONFIG.GROW_SPRAY_VINE.cleanseRadius);
        g.lineStyle(2, 0xe1e9a4, 0.6).strokeCircle(plant.x, plant.y, CONFIG.GROW_SPRAY_VINE.cleanseRadius);
      }
    }
    for (let i = 0; i < 180; i++) {
      const x = (i * 137 + 29) % W, y = (i * 251 + 11) % H;
      g.fillStyle(i % 4 ? 0xc0ce92 : 0x4e6c4d, 0.28).fillEllipse(x, y, 4, 9);
    }
    g.lineStyle(1, 0xe2e7bb, 0.1);
    for (let x = 0; x <= W; x += 72) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 72) g.lineBetween(0, y, W, y);
    for (const drop of model.drops) {
      const bob = Math.sin(drop.age * 3) * 3, y = drop.y + bob;
      if (drop.kind === 'xp') {
        g.fillStyle(0x335d41, 0.35).fillCircle(drop.x, drop.y + 5, 10);
        g.fillStyle(0x8be2a9).fillTriangle(drop.x, y - 10, drop.x - 8, y, drop.x + 8, y).fillTriangle(drop.x - 8, y, drop.x + 8, y, drop.x, y + 8);
        g.fillStyle(0xdbf5b7).fillTriangle(drop.x, y - 8, drop.x - 5, y, drop.x, y + 5);
      } else if (drop.kind === 'chest') {
        g.fillStyle(0xf3d783, 0.15).fillCircle(drop.x, drop.y, 40 + bob); chestIcon(g, drop.x, y, 24);
      } else if (drop.kind === 'heal') {
        g.fillStyle(0xf1a6a0).fillCircle(drop.x - 5, y - 3, 7).fillCircle(drop.x + 5, y - 3, 7).fillTriangle(drop.x - 11, y - 1, drop.x + 11, y - 1, drop.x, y + 12);
      } else {
        const color = drop.skill ? SKILLS[drop.skill].color : COLORS.lime;
        g.fillStyle(color, 0.2).fillCircle(drop.x, drop.y, 29);
        g.lineStyle(2.5, color).strokeCircle(drop.x, y, 23);
        if (drop.skill === 'burstMelon') melon(g, drop.x, y, 13); else sprout(g, drop.x, y + 3, 15, false);
      }
    }
    for (const plant of model.plants) {
      if (plant.state === 'dead') continue;
      sprout(g, plant.x, plant.y, plant.state === 'mature' ? 28 : 16 + plant.growth * 3, plant.state === 'mature', plant.empowered);
      const ratio = plant.state === 'growing' ? plant.growth / CONFIG.GROW_SPRAY_VINE.growTime : plant.hp / CONFIG.GROW_SPRAY_VINE.hp;
      bar(g, plant.x - 23, plant.y + 33, 46, ratio, COLORS.lime);
      if (plant.flash > 0) g.lineStyle(3, COLORS.coral).strokeCircle(plant.x, plant.y, 28);
    }
    for (const enemy of model.enemies) {
      const r = CONFIG.MIASMA_UNITS[enemy.kind].radius, elite = enemy.kind === 'elite';
      g.fillStyle(0x223b2d, 0.3).fillEllipse(enemy.x, enemy.y + r * 0.9, r * 2.4, r * 0.85);
      g.fillStyle(enemy.flash > 0 ? 0xf5e3b0 : elite ? 0x7f5d72 : 0x374d3d);
      g.fillTriangle(enemy.x - r, enemy.y + r, enemy.x + r, enemy.y + r, enemy.x, enemy.y - r * 1.4);
      g.fillCircle(enemy.x, enemy.y - 3, r);
      g.fillStyle(elite ? 0xe8caad : 0xd6d9af).fillEllipse(enemy.x, enemy.y - 3, r * 1.45, r * 1.55);
      g.fillStyle(0x314433).fillEllipse(enemy.x - r * 0.27, enemy.y - 4, r * 0.3, r * 0.46).fillEllipse(enemy.x + r * 0.27, enemy.y - 4, r * 0.3, r * 0.46);
      if (elite) {
        g.fillStyle(0xc599a9).fillTriangle(enemy.x - r, enemy.y - r * 0.5, enemy.x - r * 0.65, enemy.y - r * 1.6, enemy.x, enemy.y - r * 0.7).fillTriangle(enemy.x, enemy.y - r * 0.7, enemy.x + r * 0.65, enemy.y - r * 1.6, enemy.x + r, enemy.y - r * 0.5);
        bar(g, enemy.x - 25, enemy.y - r - 20, 50, enemy.hp / enemy.maxHp, 0xf0ad84);
      }
    }
    const p = model.player;
    if (model.skills.frost) {
      const r = 105 + model.skills.frost * 20;
      g.fillStyle(0xb6e6d9, 0.09).fillCircle(p.x, p.y, r);
      g.lineStyle(3, 0xb6e6d9, 0.5).strokeCircle(p.x, p.y, r);
    }
    if (model.skills.thorns) {
      const r = 90 + model.skills.thorns * 12;
      g.lineStyle(2, 0xead0de, 0.45).strokeCircle(p.x, p.y, r);
      for (let i = 0; i < 3 + model.skills.thorns; i++) {
        const a = time * 2.4 + i / (3 + model.skills.thorns) * Math.PI * 2;
        g.fillStyle(0xe1a9d1).fillTriangle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r - 11, p.x + Math.cos(a) * r - 8, p.y + Math.sin(a) * r + 7, p.x + Math.cos(a) * r + 8, p.y + Math.sin(a) * r + 7);
      }
    }
    for (const shot of model.projectiles) { g.fillStyle(0xd8ee89).fillEllipse(shot.x, shot.y, 10, 14); g.fillStyle(0xf8f3b4).fillCircle(shot.x - 2, shot.y - 2, 3); }
    this.hero.setPosition(CONFIG.VIEW.fieldX + p.x * CONFIG.VIEW.fieldScale, CONFIG.VIEW.fieldY + (p.y - 12) * CONFIG.VIEW.fieldScale).setAlpha(p.invincible > 0 && Math.floor(p.invincible * 12) % 2 ? 0.4 : 1);
    this.hero.setFlipX(p.facing.x < -0.1);
    bar(g, p.x - 30, p.y - 63, 60, p.hp / model.maxHp, 0xc9ec70);
    if (model.burst?.fired) {
      const b = model.burst, t = Math.max(0, b.age - CONFIG.INSTANT_BURST.triggerDelay), alpha = Math.max(0, 1 - t / 1.4), r = Math.min(CONFIG.INSTANT_BURST.radius, t * 900 + 24);
      g.fillStyle(COLORS.coral, alpha * 0.15).fillCircle(b.x, b.y, r); g.lineStyle(7 * alpha, 0xffd79f, alpha).strokeCircle(b.x, b.y, r);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.fillStyle(i % 2 ? COLORS.coral : COLORS.lime, alpha).fillCircle(b.x + Math.cos(a) * r * 0.85, b.y + Math.sin(a) * r * 0.85, 5); }
    }
    for (const pulse of model.pulses) { const alpha = 1 - pulse.age / 0.8; g.lineStyle(3 * alpha, pulse.kind === 'hit' ? COLORS.coral : COLORS.lime, alpha).strokeCircle(pulse.x, pulse.y, 12 + pulse.age * (pulse.kind === 'mature' ? 140 : 48)); }
    this.damageLabels.forEach((text, i) => {
      const damage = model.damageTexts[model.damageTexts.length - 1 - i]; text.setVisible(!!damage);
      if (damage) text.setText(String(damage.value)).setPosition(CONFIG.VIEW.fieldX + damage.x * CONFIG.VIEW.fieldScale, CONFIG.VIEW.fieldY + (damage.y - damage.age * 75) * CONFIG.VIEW.fieldScale).setAlpha(1 - damage.age / 0.6).setColor(damage.critical ? '#ffd783' : '#faf2c8');
    });
  }
  destroy(): void { this.hero.destroy(); this.damageLabels.forEach(t => t.destroy()); this.g.destroy(); this.geometryMask.destroy(); this.maskShape.destroy(); }
}
function bar(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, value: number, color: number): void { g.fillStyle(0x21372c).fillRoundedRect(x - 2, y - 2, width + 4, 9, 3); if (value > 0) g.fillStyle(color).fillRoundedRect(x, y, width * Math.min(1, value), 5, 2); }
