import Phaser from 'phaser';
import { CHARMS, CONFIG, MENU_LAYOUT, WEAPONS, type Loadout } from '../config/gameConfig';
import { clearRun, loadProfile, loadRun, saveProfile } from '../systems/SaveSystem';
import { COLORS, label, melon, pill, skillIcon, sprout, tap } from '../ui/draw';

export class LobbyScene extends Phaser.Scene {
  constructor() { super('Lobby'); }
  create(data: { tab?: 'battle' | 'equipment' } = {}): void {
    document.getElementById('game')!.dataset.scene = 'lobby';
    const tab = data.tab ?? 'battle', profile = loadProfile(), saved = loadRun();
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const g = this.add.graphics();
    pill(g, 24, 26, 672, 116, 0x294b35);
    this.add.image(82, 85, 'granny').setDisplaySize(82, 94);
    label(this, 144, 43, '春耕奶奶', 25);
    label(this, 144, 86, '万物生 · 第一章', 19, '#a8ba9e');
    label(this, 650, 52, `灵韵 ${profile.coins}`, 24, '#efcd79').setOrigin(1, 0);
    label(this, 650, 93, `最高 ${profile.bestFloor} 层`, 17, '#a8ba9e').setOrigin(1, 0);
    label(this, 360, 192, tab === 'battle' ? '枯园复苏' : '我的园艺装备', 48).setOrigin(0.5).setFontFamily('Georgia, "SimSun", serif');
    label(this, 360, 250, tab === 'battle' ? '走位拾种 · 自动攻击 · 局内成长' : '切换装备，带着喜欢的种子出发', 21, '#c4dd86').setOrigin(0.5);
    if (tab === 'battle') {
      pill(g, 48, 304, 624, 712, 0x294a36);
      g.lineStyle(16, 0x456743).beginPath().moveTo(230, 917).lineTo(480, 807).lineTo(230, 700).lineTo(480, 590).lineTo(230, 480).lineTo(440, 373).strokePath();
      [[230, 917], [480, 807], [230, 700], [480, 590], [230, 480], [440, 373]].forEach(([x, y], i) => {
        g.fillStyle(i === 0 ? COLORS.lime : 0x5c7f50).fillCircle(x, y, 37);
        label(this, x, y, `${i + 1}`, 28, i === 0 ? '#2b442e' : '#c4d6aa').setOrigin(0.5);
      });
      sprout(g, 140, 420, 34); sprout(g, 568, 684, 35, false); melon(g, 122, 836, 26);
      this.add.image(360, 646, 'granny').setDisplaySize(230, 263);
      label(this, 360, 1056, '6 层生存挑战 · 每层 30 秒', 24, '#dce5b9').setOrigin(0.5);
      label(this, 360, 1096, '击败枯败，拾取经验与宝匣，选择你的成长路线', 18, '#a8ba9e').setOrigin(0.5);
    } else {
      this.add.image(360, 480, 'granny').setDisplaySize(230, 263);
      const equipped = [WEAPONS[profile.loadout.weapon].name, CHARMS[profile.loadout.charm].name, profile.loadout.boots === 'wind' ? '轻风布履' : '春耕布鞋'];
      equipped.forEach((name, i) => {
        const x = i === 1 ? 534 : 58, y = i === 2 ? 498 : 335;
        pill(g, x, y, 128, 132, 0x3c6042); skillIcon(g, x + 64, y + 46, i === 0 ? 'pea' : i === 1 ? CHARMS[profile.loadout.charm].skill : 'magnet', 25);
        label(this, x + 64, y + 98, name, 16, '#dce5b9').setOrigin(0.5);
      });
      label(this, 360, 665, `生命 ${profile.loadout.charm === 'dewCharm' ? 120 : 100}    移速 ${profile.loadout.boots === 'wind' ? 266 : 235}`, 23, '#efcd79').setOrigin(0.5);
      label(this, 360, 712, '选择后，下一局出战自动携带', 18, '#a8ba9e').setOrigin(0.5);
      const categories = ['武器', '护符', '步履'] as const;
      const category = (this.registry.get('gearCategory') as number | undefined) ?? 0;
      categories.forEach((name, i) => this.button(130 + i * 230, 782, 204, 62, name, () => { this.registry.set('gearCategory', i); this.scene.restart({ tab }); }, category === i ? COLORS.lime : 0x3c6042));
      const options: { name: string; note: string; key: string }[] = category === 0 ? Object.entries(WEAPONS).map(([key, value]) => ({ ...value, key })) : category === 1 ? Object.entries(CHARMS).map(([key, value]) => ({ ...value, key })) : [{ key: 'cloth', name: '春耕布鞋', note: '稳稳当当 · 基础移速' }, { key: 'wind', name: '轻风布履', note: '步履轻盈 · 移速 +13%' }];
      const field = (['weapon', 'charm', 'boots'] as const)[category];
      options.forEach((option, i) => {
        const y = 874 + i * 82, chosen = profile.loadout[field] === option.key;
        pill(g, 48, y - 36, 624, 72, chosen ? 0x4d7147 : 0x294b35);
        label(this, 72, y - 18, option.name, 23);
        label(this, 72, y + 13, option.note, 16, '#b8c9a1');
        label(this, 638, y, chosen ? '已装备' : '装备 →', 22, '#efcd79').setOrigin(1, 0.5);
        tap(this, 360, y, 624, 72, () => { const next = { ...profile.loadout, [field]: option.key } as Loadout; saveProfile({ ...profile, loadout: next }); this.scene.restart({ tab }); });
      });
    }
    const start = () => { if (saved && tab === 'battle') return; clearRun(); this.scene.start('Game', { loadout: loadProfile().loadout }); };
    const { x, y, width, height } = MENU_LAYOUT.start;
    this.button(x, y, width, height, '开始守护  →', start, COLORS.lime);
    this.button(180, 1328, 300, 88, '园艺装备', () => this.scene.restart({ tab: 'equipment' }), tab === 'equipment' ? 0x658b4c : 0x294b35);
    this.button(540, 1328, 300, 88, '出战田野', () => this.scene.restart({ tab: 'battle' }), tab === 'battle' ? 0x658b4c : 0x294b35);
    label(this, 360, 1401, 'BLOOM & BOOM · 让荒地再次生长', 16, '#8ba789').setOrigin(0.5);
    if (saved && tab === 'battle') {
      this.add.rectangle(360, CONFIG.VIEW.height / 2, 720, CONFIG.VIEW.height, 0x0a1b16, 0.88).setInteractive();
      const panel = this.add.graphics(); pill(panel, 48, 480, 624, 450, 0x34553d);
      label(this, 360, 548, '继续上次的守护？', 35).setOrigin(0.5);
      label(this, 360, 641, `第 ${Math.min(6, 1 + Math.floor(saved.state.time / 30))} 层  ·  Lv.${saved.state.level}  ·  ${Math.floor(saved.state.time)} 秒`, 26, '#efcd79').setOrigin(0.5);
      label(this, 360, 716, '田野还在等你，已获得的技能也会保留。', 22, '#bdcfad').setOrigin(0.5);
      const no = MENU_LAYOUT.abandonRun, yes = MENU_LAYOUT.continueRun;
      this.button(no.x, no.y, no.width, no.height, '放弃本局', () => { clearRun(); this.scene.restart(); }, 0xc48159);
      this.button(yes.x, yes.y, yes.width, yes.height, '继续守护', () => this.scene.start('Game', { snapshot: saved }), COLORS.lime);
    }
    this.input.keyboard?.on('keydown-ENTER', start);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeAllListeners('keydown-ENTER'));
  }
  private button(x: number, y: number, width: number, height: number, text: string, action: () => void, color: number): void {
    const g = this.add.graphics(); pill(g, x - width / 2, y - height / 2 + 5, width, height, 0x102c20); pill(g, x - width / 2, y - height / 2, width, height, color);
    label(this, x, y, text, 26, color === COLORS.lime ? '#28452e' : '#f2edd9').setOrigin(0.5);
    tap(this, x, y, width, height, action);
  }
}
