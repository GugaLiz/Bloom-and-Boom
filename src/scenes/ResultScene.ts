import Phaser from 'phaser';
import { MENU_LAYOUT } from '../config/gameConfig';
import type { RunResult } from '../core/types';
import { COLORS, label, pill, sprout, tap } from '../ui/draw';
import { formatTime } from '../ui/HUD';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(result: RunResult): void {
    document.getElementById('game')!.dataset.scene = 'result';
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const win = result.reason === 'survived', g = this.add.graphics();
    label(this, 360, 94, '田野守护手记', 27, '#bfd2a5').setOrigin(0.5);
    g.fillStyle(0x355a3b).fillCircle(360, 300, 138); sprout(g, 360, 330, 79, win);
    label(this, 360, 499, win ? '枯园重获生机！' : '来年，再种一片春天。', win ? 45 : 37).setOrigin(0.5);
    label(this, 360, 565, win ? '6 层挑战完成，种下的希望都开了花。' : '生命耗尽，带上新的种子再来一次。', 22, '#adc7a0').setOrigin(0.5);
    pill(g, 48, 635, 624, 384, 0x2b4c35);
    const stats = [['存活时间', formatTime(result.time)], ['驱散枯败', `${result.kills}`], ['最高成长', `Lv.${result.level} / ${result.floor}层`], ['本局灵韵', `+${result.coins}`]];
    stats.forEach(([name, value], i) => { const y = 690 + i * 88; label(this, 82, y, name, 25, '#b1c69f').setOrigin(0, 0.5); label(this, 638, y, value, 32, '#efcf7e').setOrigin(1, 0.5); });
    label(this, 360, 1084, '灵韵已收入田野 · 装备选择会为你保留', 21, '#b5cb9e').setOrigin(0.5);
    const { x, y, width, height } = MENU_LAYOUT.restart;
    pill(g, x - width / 2, y - height / 2, width, height, COLORS.lime);
    label(this, x, y, '返回田野，再次出发', 29, '#284331').setOrigin(0.5);
    const back = () => this.scene.start('Lobby');
    tap(this, x, y, width, height, back);
    this.input.keyboard?.once('keydown-ENTER', back);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeAllListeners('keydown-ENTER'));
    label(this, 360, 1358, '每次拾起种子，都有新的可能。', 20, '#8eac8b').setOrigin(0.5);
  }
}
