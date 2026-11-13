import { describe, expect, it } from 'vitest';
import { CONFIG, DEFAULT_LOADOUT, SKILLS, type SkillId } from '../src/config/gameConfig';
import { GameModel } from '../src/core/GameModel';
import { insideBattlefield, screenToWorld, worldToScreen } from '../src/core/layout';
import type { Enemy, Plant } from '../src/core/types';
import { InputSystem } from '../src/systems/InputSystem';
import { LandSystem } from '../src/systems/LandSystem';
import { burstHit } from '../src/systems/CombatSystem';
import { upgradeChoices } from '../src/systems/ProgressionSystem';
import { validSnapshot } from '../src/systems/SaveSystem';

function enemy(model: GameModel, overrides: Partial<Enemy> = {}): Enemy { return { id: 900, kind: 'normal', x: model.player.x + 140, y: model.player.y, hp: 22, maxHp: 22, knockback: { x: 0, y: 0 }, knockTime: 0, contactTimer: 0, flash: 0, ...overrides }; }
function plant(overrides: Partial<Plant> = {}): Plant { return { id: 700, x: 45, y: 400, state: 'mature', hp: 65, growth: 2, empowered: false, guarded: false, attackTimer: 0, flash: 0, age: 0, ...overrides }; }
function advance(model: GameModel, seconds: number): void { for (let i = 0; i < Math.round(seconds * 60); i++) model.step(1 / 60); }

describe('随触移动', () => {
  it('任意落指点成为摇杆中心，抬手后下一次重新定位', () => {
    const input = new InputSystem(); input.begin(1, { x: 210, y: 800 });
    expect(input.joystick?.center).toEqual({ x: 210, y: 800 });
    input.move(1, { x: 288, y: 800 }); expect(input.vector()).toEqual({ x: 1, y: 0 });
    input.end(1); expect(input.vector()).toEqual({ x: 0, y: 0 });
    input.begin(2, { x: 530, y: 1100 }); expect(input.joystick?.center).toEqual({ x: 530, y: 1100 });
  });
  it('第二触点不会劫持或释放第一触点；长拖动底座跟随', () => {
    const input = new InputSystem(); input.begin(1, { x: 200, y: 500 }); input.begin(2, { x: 500, y: 900 });
    input.end(2); expect(input.joystick?.pointerId).toBe(1);
    input.move(1, { x: 550, y: 500 }); expect(input.joystick!.center.x).toBeGreaterThan(200);
    expect(input.vector().x).toBe(1); input.cancel(); expect(input.joystick).toBeNull();
  });
  it('HUD触点不启动移动，竖屏坐标变换可逆', () => {
    const input = new InputSystem(); input.begin(1, { x: 54, y: 50 }); expect(input.joystick).toBeNull();
    const p = { x: 310, y: 900 }, screen = worldToScreen(p);
    expect(insideBattlefield(screen)).toBe(true); expect(screenToWorld(screen).x).toBeCloseTo(p.x); expect(screenToWorld(screen).y).toBeCloseTo(p.y);
  });
  it('引擎指针的坐标访问器也能读取，不能用对象展开丢失坐标', () => {
    const input = new InputSystem();
    const pointer = new class { get x() { return 200; } get y() { return 800; } }();
    input.begin(1, pointer); expect(input.joystick!.center).toEqual({ x: 200, y: 800 });
    input.move(1, new class { get x() { return 278; } get y() { return 800; } }()); expect(input.vector()).toEqual({ x: 1, y: 0 });
  });
});

describe('自动战斗与碰触拾取', () => {
  it('无需攻击按钮，移动及静止时都向敌人发射子弹并击杀', () => {
    const model = new GameModel(1); model.enemies.push(enemy(model));
    model.step(1 / 60, { x: 0, y: -1 }); expect(model.projectiles.some(p => p.vx !== undefined)).toBe(true);
    advance(model, 1.4); expect(model.enemies.some(e => e.id === 900)).toBe(false); expect(model.stats.kills).toBeGreaterThan(0);
    expect(model.drops.some(d => d.kind === 'xp')).toBe(true);
  });
  it('种子碰到即获得技能，灵露提供经验，治疗不超过上限', () => {
    const m = new GameModel(2); m.drops = [];
    m.addDrop(m.player, 'seed', 1, 'frost'); m.addDrop(m.player, 'xp', 2); m.addDrop(m.player, 'heal', 500);
    m.step(1 / 60); expect(m.skills.frost).toBe(1); expect(m.xp).toBe(2); expect(m.player.hp).toBe(m.maxHp); expect(m.drops).toHaveLength(0);
  });
  it('装备改变生命、移动速度和实际发射数量', () => {
    const base = new GameModel(3), equipped = new GameModel(3, { weapon: 'seedScatter', charm: 'dewCharm', boots: 'wind' });
    expect(equipped.maxHp).toBe(120); expect(equipped.moveSpeed).toBeGreaterThan(base.moveSpeed);
    base.enemies.push(enemy(base)); equipped.enemies.push(enemy(equipped)); base.step(1 / 60); equipped.step(1 / 60);
    expect(base.projectiles).toHaveLength(1); expect(equipped.projectiles).toHaveLength(2);
  });
  it('爆裂瓜伤害普通团，精英只受击退', () => {
    const m = new GameModel(4), normal = enemy(m), elite = enemy(m, { kind: 'elite', hp: 180, maxHp: 180 });
    burstHit(normal, m.player); burstHit(elite, m.player);
    expect(normal.hp).toBeLessThan(0); expect(elite.hp).toBe(180); expect(elite.knockTime).toBeGreaterThan(0);
  });
  it('喷瓜藤沿途自动培育，玩家远离仍然成熟并净化土地', () => {
    const m = new GameModel(5); advance(m, 1.6); expect(m.plants).toHaveLength(1);
    m.player.x = 50; m.player.y = 100; advance(m, 2.2);
    expect(m.stats.matured).toBe(1); expect(m.plants[0].state).toBe('mature');
    const land = new LandSystem(); expect(land.isSafe({ x: 45, y: 400 }, 170, [])).toBe(false);
    expect(land.isSafe({ x: 45, y: 400 }, 170, [plant()])).toBe(true);
  });
  it('净化区求并集，边缘压力有上限；重复净化不重复计数', () => {
    const land = new LandSystem(), p = plant();
    expect(land.coverage(170, [p, { ...p, id: 701 }])).toBe(land.coverage(170, [p]));
    expect(land.coverage(170, [p])).toBeLessThan(land.coverage(170, []));
    expect(land.isSafe({ x: 360, y: 590 }, 180, [])).toBe(true);
    expect(land.inset(1000)).toBe(CONFIG.MIASMA_FIELD.maxInset);
    expect(land.coverage(0, [])).toBe(0);
  });
});

describe('经验三选一和宝匣', () => {
  it('升级候选不重复、已满星技能不出现；选择前冻结时间', () => {
    const m = new GameModel(6); m.skills.pea = SKILLS.pea.max; m.gainXp(m.xpNeeded);
    expect(m.level).toBe(2); expect(m.modal?.kind).toBe('upgrade');
    if (m.modal?.kind !== 'upgrade') throw Error('missing upgrade');
    expect(new Set(m.modal.choices).size).toBe(m.modal.choices.length); expect(m.modal.choices).not.toContain('pea');
    const before = m.time; m.step(0.1); expect(m.time).toBe(before);
    expect(m.chooseUpgrade('pea')).toBe(false);
    const chosen = m.modal.choices[0], level = m.skills[chosen]; expect(m.chooseUpgrade(chosen)).toBe(true); expect(m.skills[chosen]).toBe(level + 1); expect(m.modal).toBeNull();
  });
  it('一次大量经验的多次升级排队处理，全部满星也能退出选择', () => {
    const m = new GameModel(7); m.gainXp(6 + 10 + 14); expect(m.level).toBe(4); expect(m.pendingLevels).toBe(3);
    for (let i = 0; i < 3; i++) { if (m.modal?.kind !== 'upgrade') throw Error('missing choice'); m.chooseUpgrade(m.modal.choices[0]); }
    expect(m.pendingLevels).toBe(0); expect(m.modal).toBeNull();
    for (const id of Object.keys(SKILLS) as SkillId[]) m.skills[id] = SKILLS[id].max;
    expect(upgradeChoices(m.skills, () => 0)).toEqual(['vitality']);
    m.player.hp = 50; m.gainXp(m.xpNeeded); m.chooseUpgrade('vitality'); expect(m.player.hp).toBe(85); expect(m.modal).toBeNull();
  });
  it('宝匣拾取冻结战斗，奖励仅发一次，确认后恢复', () => {
    const m = new GameModel(8); m.addDrop(m.player, 'chest'); m.step(1 / 60);
    expect(m.modal?.kind).toBe('chest'); expect(m.confirmChest()).toBe(false);
    const time = m.time; advance(m, 2); expect(m.time).toBe(time);
    expect(m.revealChest()).toBe(true); const state = m.toSnapshot();
    expect(m.revealChest()).toBe(false); expect(m.toSnapshot()).toEqual(state);
    expect(m.confirmChest()).toBe(true); m.step(1 / 60); expect(m.time).toBeGreaterThan(time);
  });
  it('宝匣期间积累的升级会在确认奖励后出现', () => {
    const m = new GameModel(9); m.addDrop(m.player, 'chest'); m.step(1 / 60); m.gainXp(6);
    expect(m.modal?.kind).toBe('chest'); m.revealChest(); m.confirmChest(); expect(m.modal?.kind).toBe('upgrade');
  });
});

describe('续玩与结算', () => {
  it('完整序列化恢复实体、技能、计时器与随机状态，后续模拟一致', () => {
    const m = new GameModel(10, DEFAULT_LOADOUT); advance(m, 3);
    const snapshot = m.toSnapshot(); expect(validSnapshot(snapshot)).toBe(true);
    const restored = GameModel.fromSnapshot(snapshot)!; expect(restored.toSnapshot()).toEqual(snapshot);
    for (let i = 0; i < 180; i++) { m.step(1 / 60, { x: 0.2, y: -0.5 }); restored.step(1 / 60, { x: 0.2, y: -0.5 }); }
    expect(restored.toSnapshot()).toEqual(m.toSnapshot());
    expect(GameModel.fromSnapshot({ ...snapshot, version: 1 })).toBeNull();
  });
  it('已揭晓宝匣续玩不重新抽奖或重复发放；升级选择也能恢复', () => {
    const m = new GameModel(11); m.addDrop(m.player, 'chest'); m.step(1 / 60); m.revealChest();
    const resumed = GameModel.fromSnapshot(m.toSnapshot())!; expect(resumed.modal).toEqual(m.modal);
    expect(resumed.revealChest()).toBe(false); expect(resumed.skills).toEqual(m.skills); expect(resumed.coins).toBe(m.coins);
    resumed.confirmChest(); resumed.gainXp(6); expect(GameModel.fromSnapshot(resumed.toSnapshot())!.modal).toEqual(resumed.modal);
  });
  it('拒绝截断、非法技能、非法实体与异常生命的存档', () => {
    expect(validSnapshot(null)).toBe(false); expect(validSnapshot({ version: 2, state: {} })).toBe(false);
    const s = new GameModel(12).toSnapshot(); s.state.player.hp = -1; expect(validSnapshot(s)).toBe(false);
    const another = new GameModel(12).toSnapshot(); another.state.skills.pea = 100; expect(validSnapshot(another)).toBe(false);
    another.state.skills.pea = 1; another.state.enemies.push({} as Enemy); expect(validSnapshot(another)).toBe(false);
  });
  it('同帧死亡优先，胜利后不继续推进，新局不会继承旧局状态', () => {
    const dead = new GameModel(13); dead.time = 179.99; dead.player.hp = 0; dead.step(1 / 60); expect(dead.result?.reason).toBe('health');
    const win = new GameModel(14); win.time = 179.99; win.step(1 / 60); expect(win.result?.reason).toBe('survived');
    const time = win.time; win.step(0.1); expect(win.time).toBe(time);
    const fresh = new GameModel(15); expect(fresh.level).toBe(1); expect(fresh.enemies).toHaveLength(0); expect(fresh.coins).toBe(0); expect(fresh.modal).toBeNull();
  });
});
