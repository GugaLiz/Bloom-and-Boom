import Phaser from 'phaser';
import { CONFIG, SKILLS, type SkillId } from '../config/gameConfig';
import type { GameModel } from '../core/GameModel';
import type { InputSystem } from '../systems/InputSystem';
import { COLORS, label, pill } from './draw';

export class HUD {
  private g: Phaser.GameObjects.Graphics;
  private level: Phaser.GameObjects.Text;
  private floor: Phaser.GameObjects.Text;
  private coins: Phaser.GameObjects.Text;
  private time: Phaser.GameObjects.Text;
  private message: Phaser.GameObjects.Text;
  private skillTexts: Phaser.GameObjects.Text[] = [];
  private stars: Phaser.GameObjects.Text[] = [];
  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics();
    this.level = label(scene, 402, 48, 'Lv.1', 26).setOrigin(0.5).setStroke('#28452e', 4);
    this.floor = label(scene, 26, 104, '1层', 37).setStroke('#183c2b', 4);
    this.coins = label(scene, 682, 164, '灵韵 0', 20, '#efcd79').setOrigin(1, 0.5);
    this.time = label(scene, 28, 162, '03:00', 19, '#bdd1a8');
    (Object.keys(SKILLS) as SkillId[]).forEach((id, i) => {
      this.skillTexts.push(label(scene, 158 + i * 80, 116, SKILLS[id].short, 25).setOrigin(0.5));
      this.stars.push(label(scene, 158 + i * 80, 151, '', 12, '#efcd79').setOrigin(0.5));
    });
    this.message = label(scene, 360, 1355, '', 22, '#dce6ba').setOrigin(0.5).setWordWrapWidth(650, true).setAlign('center');
    label(scene, 360, 1412, scene.sys.game.device.input.touch ? '按住任意位置移动 · 碰触拾取 · 自动攻击' : '拖动战场 / WASD 移动 · 自动攻击 · Esc 暂停', 18, '#8eac8b').setOrigin(0.5);
  }
  draw(model: GameModel, input: InputSystem): void {
    const g = this.g; g.clear();
    pill(g, 120, 25, 564, 45, 0x294b35);
    if (model.xp > 0) pill(g, 120, 25, 564 * model.xp / model.xpNeeded, 45, 0x9cbf5d);
    this.level.setText(`Lv.${model.level}`); this.floor.setText(`${model.floor}层`);
    this.coins.setText(`灵韵 ${model.coins}`); this.time.setText(formatTime(CONFIG.WIN_TIME - model.time));
    (Object.keys(SKILLS) as SkillId[]).forEach((id, i) => {
      const active = model.skills[id] > 0, x = 158 + i * 80;
      g.fillStyle(active ? SKILLS[id].color : 0x2c4735).fillCircle(x, 116, 32);
      g.lineStyle(3, active ? 0xe0dda1 : 0x557254).strokeCircle(x, 116, 32);
      this.skillTexts[i].setColor(active ? '#294533' : '#728d70');
      this.stars[i].setText(active ? '★'.repeat(model.skills[id]) : '');
    });
    this.message.setText(model.messageTime > 0 ? model.message : '收集灵露升级，碰到种子与宝匣即刻拾取');
    if (input.joystick) {
      const { center } = input.joystick, v = input.vector();
      g.fillStyle(0xe4ebcb, 0.09).fillCircle(center.x, center.y, CONFIG.INPUT.joystickRadius);
      g.lineStyle(3, 0xe4ebcb, 0.3).strokeCircle(center.x, center.y, CONFIG.INPUT.joystickRadius);
      g.fillStyle(0xe4ebcb, 0.45).fillCircle(center.x + v.x * 50, center.y + v.y * 50, 28);
    }
  }
}
export function formatTime(seconds: number): string { const n = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
