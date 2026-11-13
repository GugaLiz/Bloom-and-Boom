import Phaser from 'phaser';
import { CONFIG, SKILLS } from '../config/gameConfig';
import type { GameModel } from '../core/GameModel';
import { COLORS, label, pill, skillIcon, tap } from './draw';
import { chestIcon } from './WorldRenderer';

export class RunModalView {
  private container: Phaser.GameObjects.Container | null = null;
  private key = '';
  private timer: Phaser.Time.TimerEvent | null = null;
  constructor(private scene: Phaser.Scene, private model: GameModel, private changed: () => void) {}
  sync(hidden: boolean): void {
    const key = JSON.stringify(this.model.modal);
    if (key !== this.key) { this.clear(); this.key = key; if (this.model.modal) this.build(); }
    this.container?.setVisible(!hidden);
  }
  private build(): void {
    const scene = this.scene, modal = this.model.modal!;
    this.container = scene.add.container(0, 0).setDepth(50);
    const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => { this.container!.add(object); return object; };
    add(scene.add.rectangle(360, CONFIG.VIEW.height / 2, 720, CONFIG.VIEW.height, 0x0a1b16, 0.92).setInteractive());
    const g = add(scene.add.graphics());
    pill(g, 50, 330, 620, 80, 0x8f9b47);
    add(label(scene, 360, 370, modal.kind === 'upgrade' ? `灵种觉醒  Lv.${this.model.level}` : modal.revealed ? '生机满载' : '发现灵种宝匣', 36, '#f7efc9').setOrigin(0.5));
    if (modal.kind === 'upgrade') {
      add(label(scene, 360, 455, '选择一项成长，继续守护田野', 24, '#c5d9ad').setOrigin(0.5));
      modal.choices.forEach((id, i) => {
        const x = 24 + i * 232, def = SKILLS[id], level = this.model.skills[id];
        pill(g, x, 535, 208, 492, 0x31563b); pill(g, x, 535, 208, 72, def.color);
        add(label(scene, x + 104, 572, def.name, 25, '#284331').setOrigin(0.5));
        g.fillStyle(def.color, 0.2).fillCircle(x + 104, 705, 64); skillIcon(g, x + 104, 705, id, 39);
        add(label(scene, x + 104, 802, level ? `${'★'.repeat(level)} → ${Math.min(def.max, level + 1)}星` : '新技能', 19, '#f0d27c').setOrigin(0.5));
        add(label(scene, x + 20, 858, def.description, 21, '#e0e9cc').setWordWrapWidth(170, true));
        add(label(scene, x + 104, 986, '选择', 22, '#c4dd86').setOrigin(0.5));
        add(tap(scene, x + 104, 781, 208, 492, () => { if (this.model.chooseUpgrade(id)) this.changed(); }));
      });
      add(label(scene, 360, 1120, '战斗已暂停 · 已获得技能会在顶部显示', 20, '#9ab58f').setOrigin(0.5));
    } else if (!modal.revealed) {
      add(label(scene, 360, 462, '一份来自田野的馈赠', 25, '#efcd79').setOrigin(0.5));
      for (let i = 0; i < 4; i++) { g.fillStyle(0xe0ca75, 0.05 + i * 0.02).fillCircle(360, 784, 250 - i * 40); }
      chestIcon(g, 360, 802, 105);
      const glow = add(label(scene, 360, 607, '✦    ✦    ✦', 38, '#f2d580').setOrigin(0.5));
      scene.tweens.add({ targets: glow, y: 565, alpha: 0.35, duration: 480, yoyo: true, repeat: 2 });
      add(label(scene, 360, 1056, '点击宝匣可跳过动画', 23, '#d1dcb9').setOrigin(0.5));
      const reveal = () => { if (this.model.revealChest()) this.changed(); };
      add(tap(scene, 360, 800, 620, 600, reveal));
      this.timer = scene.time.delayedCall(1400, reveal);
    } else {
      const reward = modal.reward;
      const title = reward.kind === 'skill' ? SKILLS[reward.skill].name : reward.kind === 'heal' ? '春露甘霖' : '灵韵丰收';
      const note = reward.kind === 'skill' ? `${this.model.skills[reward.skill] === 1 ? '获得新技能' : '技能强化'} · ${'★'.repeat(this.model.skills[reward.skill])}` : reward.kind === 'heal' ? `恢复 ${reward.value} 点生命` : `获得 ${reward.value} 灵韵`;
      add(label(scene, 360, 492, '获得一项田野奖励', 31, '#f1d47e').setOrigin(0.5));
      pill(g, 52, 644, 616, 244, 0x587440); skillIcon(g, 360, 714, reward.kind === 'skill' ? reward.skill : reward.kind === 'heal' ? 'vitality' : 'magnet', 45);
      add(label(scene, 360, 794, title, 33).setOrigin(0.5)); add(label(scene, 360, 851, note, 24, '#efdb96').setOrigin(0.5));
      pill(g, 90, 1040, 540, 88, COLORS.lime); add(label(scene, 360, 1084, '收下，继续守护', 28, '#284331').setOrigin(0.5));
      add(tap(scene, 360, 1084, 540, 88, () => { if (this.model.confirmChest()) this.changed(); }));
    }
  }
  private clear(): void { this.timer?.remove(); this.timer = null; if (this.container) { for (const child of this.container.list) this.scene.tweens.killTweensOf(child); this.container.destroy(true); this.container = null; } }
  destroy(): void { this.clear(); }
}
