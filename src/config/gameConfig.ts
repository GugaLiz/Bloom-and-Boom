// 逻辑世界与竖屏画布分开，所有输入和画面共用 core/layout 的坐标变换。
export const CONFIG = {
  VIEW: { width: 720, height: 1440, fieldX: 16, fieldY: 190, fieldScale: 688 / 720 },
  WORLD: { width: 720, height: 1180 },
  PLAYER: { speed: 235, radius: 20, maxHp: 100, invincibleAfterHit: 0.8, pickupRadius: 32 },
  INPUT: { joystickRadius: 78 },
  GUN: { damage: 12, interval: 0.48, speed: 650, range: 600, lifetime: 1.5, spread: 0.18 },
  SEEDS: { initialDropDelay: 7, intervalMin: 11, intervalMax: 16, maxDrops: 180, lifetime: 40, magnetSpeed: 450 },
  INSTANT_BURST: { triggerDelay: 0.1, effectDuration: 1.5, radius: 155, damage: 35, knockback: 260, knockbackTime: 0.5, cooldown: 5 },
  GROW_SPRAY_VINE: { growTime: 2, guardRadius: 140, cleanseRadius: 110, hp: 65, attackRange: 350, attackInterval: 0.8, damagePerShot: 13, projectileSpeed: 560, radius: 20, spawnInterval: 9, lifetime: 38 },
  MIASMA_FIELD: { shrinkStartDelay: 12, shrinkSpeed: 0.8, maxInset: 140, damagePerSecond: 5 },
  MIASMA_UNITS: {
    normal: { hp: 22, speed: 62, damage: 8, spawnInterval: 1.5, radius: 16 },
    elite: { hp: 180, speed: 40, damage: 18, spawnInterval: 24, radius: 28 },
  },
  COMBAT: { maxEnemies: 85, plantContactInterval: 1, normalStartDelay: 0.8, projectileLifetime: 1.5, maxProjectiles: 180 },
  PROGRESSION: { firstXp: 6, xpGrowth: 4, floorDuration: 30, chestInterval: 38 },
  WIN_TIME: 180,
} as const;

export const MENU_LAYOUT = {
  start: { x: 360, y: 1160, width: 600, height: 94 },
  restart: { x: 360, y: 1190, width: 600, height: 88 },
  resume: { x: 360, y: 830, width: 540, height: 78 },
  pause: { x: 54, y: 50, width: 74, height: 74 },
  continueRun: { x: 500, y: 864, width: 236, height: 82 },
  abandonRun: { x: 220, y: 864, width: 236, height: 82 },
} as const;

export const SKILLS = {
  pea: { name: '豌豆连发', short: '豆', description: '多发一颗豌豆，提升种子弹伤害', color: 0x83c86a, max: 5 },
  burstMelon: { name: '爆裂瓜', short: '瓜', description: '自动爆破近身敌人，扩大解围范围', color: 0xf09a55, max: 3 },
  sprayVine: { name: '喷瓜藤', short: '藤', description: '沿途自动培育炮台，净化周围土地', color: 0xa8cb64, max: 3 },
  frost: { name: '冰露花', short: '露', description: '寒露光环持续伤害并减速近身敌人', color: 0x8bd8df, max: 3 },
  thorns: { name: '环身荆棘', short: '棘', description: '旋转荆棘击退并伤害周围敌人', color: 0xd4a9df, max: 3 },
  magnet: { name: '聚灵花', short: '灵', description: '扩大经验与道具的自动吸取范围', color: 0xf2cf73, max: 3 },
  vitality: { name: '春回大地', short: '春', description: '增加生命上限并立即恢复生命', color: 0xefb0a0, max: 3 },
} as const;
export type SkillId = keyof typeof SKILLS;
export type SkillLevels = Record<SkillId, number>;
export const EMPTY_SKILLS = (): SkillLevels => ({ pea: 1, burstMelon: 0, sprayVine: 0, frost: 0, thorns: 0, magnet: 0, vitality: 0 });

export const WEAPONS = {
  peaShooter: { name: '豌豆连发器', note: '均衡连发 · 伤害 12', damage: 1, interval: 1, shots: 0 },
  seedScatter: { name: '双生散种器', note: '双发散射 · 单发伤害 9', damage: 0.75, interval: 1.18, shots: 1 },
  sunStaff: { name: '向日葵杖', note: '强力种子 · 伤害 18', damage: 1.5, interval: 1.28, shots: 0 },
} as const;
export const CHARMS = {
  rootCharm: { name: '护土根符', note: '出战自带喷瓜藤', skill: 'sprayVine' },
  melonCharm: { name: '爆裂瓜符', note: '出战自带爆裂瓜', skill: 'burstMelon' },
  dewCharm: { name: '春露护符', note: '出战生命 +20', skill: 'vitality' },
} as const;
export interface Loadout { weapon: keyof typeof WEAPONS; charm: keyof typeof CHARMS; boots: 'cloth' | 'wind' }
export const DEFAULT_LOADOUT: Loadout = { weapon: 'peaShooter', charm: 'rootCharm', boots: 'cloth' };
