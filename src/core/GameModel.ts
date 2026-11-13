import { CONFIG, DEFAULT_LOADOUT, SKILLS, WEAPONS, type Loadout, type SkillId } from '../config/gameConfig';
import { clamp, distance, type Burst, type DamageText, type Drop, type Enemy, type Plant, type Player, type Projectile, type Pulse, type RunModal, type RunResult, type RunSnapshot, type Vec } from './types';
import { LandSystem } from '../systems/LandSystem';
import { burstHit } from '../systems/CombatSystem';
import { chestReward, initialSkills, upgradeChoices } from '../systems/ProgressionSystem';
import { validSnapshot } from '../systems/SaveSystem';

export class GameModel {
  runId: string;
  time = 0;
  loadout: Loadout;
  player: Player = { x: CONFIG.WORLD.width / 2, y: CONFIG.WORLD.height * 0.58, hp: CONFIG.PLAYER.maxHp, invincible: 0, facing: { x: 0, y: -1 } };
  land = new LandSystem();
  skills;
  plants: Plant[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  drops: Drop[] = [];
  pulses: Pulse[] = [];
  damageTexts: DamageText[] = [];
  burst: Burst | null = null;
  cooldown = 1;
  xp = 0;
  level = 1;
  coins = 0;
  pendingLevels = 0;
  modal: RunModal | null = null;
  result: RunResult | null = null;
  stats = { kills: 0, planted: 0, matured: 0 };
  message = '按住任意战场位置移动 · 武器自动攻击';
  messageTime = 6;
  private timers: RunSnapshot['state']['timers'] = { normal: CONFIG.COMBAT.normalStartDelay, elite: 24, shot: 0, vine: 1.5, aura: 0, drop: CONFIG.SEEDS.initialDropDelay, chest: CONFIG.PROGRESSION.chestInterval };
  private nextId = 1;
  private rngState: number;

  constructor(seed = Date.now(), loadout: Loadout = DEFAULT_LOADOUT) {
    this.rngState = seed >>> 0; this.runId = `${Date.now()}-${this.rngState}`;
    this.loadout = { ...loadout }; this.skills = initialSkills(loadout); this.player.hp = this.maxHp;
    this.addDrop({ x: this.player.x + 90, y: this.player.y - 20 }, 'seed', 1, 'burstMelon');
  }
  get maxHp(): number { return CONFIG.PLAYER.maxHp + this.skills.vitality * 20; }
  get floor(): number { return Math.min(6, 1 + Math.floor(this.time / CONFIG.PROGRESSION.floorDuration)); }
  get xpNeeded(): number { return CONFIG.PROGRESSION.firstXp + (this.level - 1) * CONFIG.PROGRESSION.xpGrowth; }
  get moveSpeed(): number { return CONFIG.PLAYER.speed * (this.loadout.boots === 'wind' ? 1.13 : 1); }
  private random = (): number => {
    this.rngState = (this.rngState + 0x6d2b79f5) >>> 0;
    let t = this.rngState; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  notify(message: string, duration = 3): void { this.message = message; this.messageTime = duration; }
  addDrop(point: Vec, kind: Drop['kind'], value = 1, skill?: SkillId): void {
    if (this.drops.length < CONFIG.SEEDS.maxDrops) this.drops.push({ ...point, id: this.nextId++, kind, value, skill, age: 0 });
  }
  gainXp(amount: number): void {
    if (this.result) return;
    this.xp += amount;
    while (this.xp >= this.xpNeeded) { this.xp -= this.xpNeeded; this.level++; this.pendingLevels++; }
    this.nextUpgrade();
  }
  applySkill(skill: SkillId): void {
    const before = this.skills[skill];
    this.skills[skill] = Math.min(SKILLS[skill].max, before + 1);
    if (skill === 'vitality') this.player.hp = Math.min(this.maxHp, this.player.hp + 35);
    this.notify(`${SKILLS[skill].name} ${before ? '强化' : '获得'}！${'★'.repeat(this.skills[skill])}`);
  }
  chooseUpgrade(skill: SkillId): boolean {
    if (this.modal?.kind !== 'upgrade' || !this.modal.choices.includes(skill)) return false;
    this.applySkill(skill); this.pendingLevels = Math.max(0, this.pendingLevels - 1); this.modal = null; this.nextUpgrade(); return true;
  }
  revealChest(): boolean {
    if (this.modal?.kind !== 'chest' || this.modal.revealed) return false;
    const reward = this.modal.reward;
    if (reward.kind === 'skill') this.applySkill(reward.skill);
    else if (reward.kind === 'heal') this.player.hp = Math.min(this.maxHp, this.player.hp + reward.value);
    else this.coins += reward.value;
    this.modal.revealed = true; return true;
  }
  confirmChest(): boolean {
    if (this.modal?.kind !== 'chest' || !this.modal.revealed) return false;
    this.modal = null; this.nextUpgrade(); return true;
  }
  private nextUpgrade(): void {
    if (!this.modal && this.pendingLevels > 0) this.modal = { kind: 'upgrade', choices: upgradeChoices(this.skills, this.random) };
  }

  step(dt: number, move: Vec = { x: 0, y: 0 }): void {
    if (this.result || this.modal || dt <= 0) return;
    dt = Math.min(dt, 0.1, CONFIG.WIN_TIME - this.time);
    this.time = Math.min(CONFIG.WIN_TIME, this.time + dt);
    this.messageTime = Math.max(0, this.messageTime - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.player.invincible = Math.max(0, this.player.invincible - dt);
    const length = Math.hypot(move.x, move.y);
    if (length > 0) {
      const scale = this.moveSpeed * dt / Math.max(1, length);
      this.player.x = clamp(this.player.x + move.x * scale, CONFIG.PLAYER.radius, CONFIG.WORLD.width - CONFIG.PLAYER.radius);
      this.player.y = clamp(this.player.y + move.y * scale, CONFIG.PLAYER.radius, CONFIG.WORLD.height - CONFIG.PLAYER.radius);
      this.player.facing = { x: move.x / length, y: move.y / length };
    }
    this.spawnEnemies(dt);
    this.updatePlayerWeapons(dt);
    this.updateBurst(dt);
    this.updatePlants(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.removeDead();
    if (!this.land.isSafe(this.player, this.time, this.plants)) this.player.hp -= CONFIG.MIASMA_FIELD.damagePerSecond * dt;
    this.player.hp = Math.max(0, this.player.hp);
    // 先结算致命状态，防止拾取经验弹窗挡住死亡或同帧误判胜利。
    if (this.player.hp <= 0 || this.time >= CONFIG.WIN_TIME - 1e-8) {
      this.result = { runId: this.runId, reason: this.player.hp <= 0 ? 'health' : 'survived', time: this.time, ...this.stats, coins: this.coins, level: this.level, floor: this.floor };
      this.modal = null; return;
    }
    this.updateDrops(dt);
    this.pulses = this.pulses.filter(p => (p.age += dt) < 0.8);
    this.damageTexts = this.damageTexts.filter(p => (p.age += dt) < 0.6);
    this.plants = this.plants.filter(p => p.state !== 'dead' && p.age < CONFIG.GROW_SPRAY_VINE.lifetime);
  }
  private spawnEnemies(dt: number): void {
    for (const kind of ['normal', 'elite'] as const) {
      this.timers[kind] -= dt;
      if (this.timers[kind] > 0) continue;
      this.timers[kind] += CONFIG.MIASMA_UNITS[kind].spawnInterval / (1 + (this.floor - 1) * 0.18);
      const count = kind === 'normal' ? 2 + Math.floor(this.floor / 2) : 1;
      for (let i = 0; i < count && this.enemies.length < CONFIG.COMBAT.maxEnemies; i++) {
        const side = Math.floor(this.random() * 4), def = CONFIG.MIASMA_UNITS[kind], r = def.radius;
        const point = side === 0 ? { x: r, y: r + this.random() * (CONFIG.WORLD.height - r * 2) } : side === 1 ? { x: CONFIG.WORLD.width - r, y: r + this.random() * (CONFIG.WORLD.height - r * 2) } : side === 2 ? { x: r + this.random() * (CONFIG.WORLD.width - r * 2), y: r } : { x: r + this.random() * (CONFIG.WORLD.width - r * 2), y: CONFIG.WORLD.height - r };
        const hp = def.hp * (1 + (this.floor - 1) * 0.14);
        this.enemies.push({ ...point, id: this.nextId++, kind, hp, maxHp: hp, knockback: { x: 0, y: 0 }, knockTime: 0, contactTimer: 0, flash: 0 });
      }
    }
  }
  private updatePlayerWeapons(dt: number): void {
    this.timers.shot -= dt;
    const target = [...this.enemies].filter(e => e.hp > 0 && distance(e, this.player) <= CONFIG.GUN.range).sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
    if (target && this.timers.shot <= 0) {
      const weapon = WEAPONS[this.loadout.weapon], shots = 1 + Math.floor(this.skills.pea / 2) + weapon.shots;
      const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      for (let i = 0; i < shots; i++) {
        const a = angle + (i - (shots - 1) / 2) * CONFIG.GUN.spread;
        if (this.projectiles.length < CONFIG.COMBAT.maxProjectiles) this.projectiles.push({ x: this.player.x, y: this.player.y, targetId: target.id, vx: Math.cos(a) * CONFIG.GUN.speed, vy: Math.sin(a) * CONFIG.GUN.speed, damage: CONFIG.GUN.damage * weapon.damage * (1 + (this.skills.pea - 1) * 0.22), life: CONFIG.GUN.lifetime });
      }
      this.timers.shot = CONFIG.GUN.interval * weapon.interval / (1 + (this.skills.pea - 1) * 0.08);
    }
    if (this.skills.burstMelon && target && this.cooldown <= 0 && !this.burst && distance(target, this.player) < 230) {
      this.burst = { ...this.player, age: 0, fired: false }; this.cooldown = CONFIG.INSTANT_BURST.cooldown / (1 + this.skills.burstMelon * 0.15);
    }
    this.timers.vine -= dt;
    if (this.skills.sprayVine && this.timers.vine <= 0) {
      if (this.plants.length >= 2 + this.skills.sprayVine * 2) this.plants.shift();
      const pos = { x: clamp(this.player.x + 36, 25, CONFIG.WORLD.width - 25), y: clamp(this.player.y + 32, 25, CONFIG.WORLD.height - 25) };
      this.plants.push({ ...pos, id: this.nextId++, state: 'growing', hp: CONFIG.GROW_SPRAY_VINE.hp, growth: 0, empowered: !this.land.isSafe(pos, this.time, this.plants), guarded: false, attackTimer: 0, flash: 0, age: 0 });
      this.stats.planted++; this.timers.vine = CONFIG.GROW_SPRAY_VINE.spawnInterval / (1 + (this.skills.sprayVine - 1) * 0.2);
    }
    this.timers.aura -= dt;
    if (this.timers.aura <= 0) {
      this.timers.aura = 0.45;
      for (const enemy of this.enemies) {
        if (this.skills.frost && distance(enemy, this.player) < 105 + this.skills.frost * 20) this.hurt(enemy, 4 + this.skills.frost * 3);
        if (this.skills.thorns && distance(enemy, this.player) < 90 + this.skills.thorns * 12) {
          this.hurt(enemy, 6 + this.skills.thorns * 4);
          const d = distance(enemy, this.player) || 1;
          enemy.knockback = { x: (enemy.x - this.player.x) / d * 130, y: (enemy.y - this.player.y) / d * 130 }; enemy.knockTime = 0.15;
        }
      }
    }
  }
  private updateBurst(dt: number): void {
    if (!this.burst) return;
    this.burst.age += dt;
    if (!this.burst.fired && this.burst.age >= CONFIG.INSTANT_BURST.triggerDelay) {
      this.burst.fired = true;
      for (const enemy of this.enemies) {
        const before = enemy.hp;
        if (burstHit(enemy, this.burst) && enemy.kind === 'normal') { enemy.hp -= (this.skills.burstMelon - 1) * 14; this.damageTexts.push({ x: enemy.x, y: enemy.y, value: Math.round(before - enemy.hp), age: 0, critical: true }); }
      }
    }
    if (this.burst.age >= CONFIG.INSTANT_BURST.effectDuration) this.burst = null;
  }
  private updatePlants(dt: number): void {
    for (const plant of this.plants) {
      plant.age += dt; plant.flash = Math.max(0, plant.flash - dt);
      if (plant.state === 'growing') {
        plant.growth += dt;
        if (plant.growth >= CONFIG.GROW_SPRAY_VINE.growTime) { plant.state = 'mature'; this.stats.matured++; this.pulses.push({ x: plant.x, y: plant.y, age: 0, kind: 'mature' }); }
      }
      if (plant.state !== 'mature' || plant.hp <= 0) continue;
      plant.attackTimer -= dt;
      if (plant.attackTimer > 0) continue;
      const target = this.enemies.filter(e => e.hp > 0 && distance(e, plant) <= CONFIG.GROW_SPRAY_VINE.attackRange).sort((a, b) => distance(a, plant) - distance(b, plant))[0];
      if (target && this.projectiles.length < CONFIG.COMBAT.maxProjectiles) {
        this.projectiles.push({ x: plant.x, y: plant.y, targetId: target.id, damage: CONFIG.GROW_SPRAY_VINE.damagePerShot * (plant.empowered ? 2 : 1) * (1 + this.skills.sprayVine * 0.2), life: CONFIG.COMBAT.projectileLifetime });
        plant.attackTimer = CONFIG.GROW_SPRAY_VINE.attackInterval;
      }
    }
  }
  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const def = CONFIG.MIASMA_UNITS[enemy.kind];
      enemy.flash = Math.max(0, enemy.flash - dt); enemy.contactTimer = Math.max(0, enemy.contactTimer - dt);
      if (enemy.knockTime > 0) { enemy.x += enemy.knockback.x * dt; enemy.y += enemy.knockback.y * dt; enemy.knockTime -= dt; }
      else {
        const d = distance(enemy, this.player) || 1;
        const slow = this.skills.frost && d < 105 + this.skills.frost * 20 ? 0.45 : 1;
        const speed = def.speed * (1 + (this.floor - 1) * 0.08) * slow;
        enemy.x += (this.player.x - enemy.x) / d * speed * dt; enemy.y += (this.player.y - enemy.y) / d * speed * dt;
      }
      enemy.x = clamp(enemy.x, def.radius, CONFIG.WORLD.width - def.radius); enemy.y = clamp(enemy.y, def.radius, CONFIG.WORLD.height - def.radius);
      if (enemy.knockTime > 0) continue;
      if (distance(enemy, this.player) < def.radius + CONFIG.PLAYER.radius && this.player.invincible <= 0) {
        this.player.hp -= def.damage; this.player.invincible = CONFIG.PLAYER.invincibleAfterHit;
        this.pulses.push({ ...this.player, age: 0, kind: 'hit' });
      }
      if (enemy.contactTimer <= 0) {
        const touched = this.plants.find(p => p.state !== 'dead' && distance(p, enemy) < def.radius + CONFIG.GROW_SPRAY_VINE.radius);
        if (touched) { touched.hp -= def.damage; touched.flash = 0.2; if (touched.hp <= 0) touched.state = 'dead'; enemy.contactTimer = CONFIG.COMBAT.plantContactInterval; }
      }
    }
  }
  private hurt(enemy: Enemy, damage: number): void {
    enemy.hp -= damage; enemy.flash = 0.12;
    this.damageTexts.push({ x: enemy.x, y: enemy.y - 18, value: Math.round(damage), age: 0, critical: false });
  }
  private updateProjectiles(dt: number): void {
    this.projectiles = this.projectiles.filter(shot => {
      shot.life -= dt; if (shot.life <= 0) return false;
      if (shot.vx !== undefined && shot.vy !== undefined) {
        shot.x += shot.vx * dt; shot.y += shot.vy * dt;
        const hit = this.enemies.find(e => e.hp > 0 && distance(shot, e) <= CONFIG.MIASMA_UNITS[e.kind].radius + 7);
        if (hit) { this.hurt(hit, shot.damage); return false; }
        return this.land.inside(shot);
      }
      const target = this.enemies.find(e => e.id === shot.targetId && e.hp > 0);
      if (!target) return false;
      const d = distance(shot, target), travel = CONFIG.GROW_SPRAY_VINE.projectileSpeed * dt;
      if (d <= travel + CONFIG.MIASMA_UNITS[target.kind].radius) { this.hurt(target, shot.damage); return false; }
      shot.x += (target.x - shot.x) / d * travel; shot.y += (target.y - shot.y) / d * travel; return true;
    });
  }
  private removeDead(): void {
    this.enemies = this.enemies.filter(e => {
      if (e.hp > 0) return true;
      this.stats.kills++; this.coins += e.kind === 'elite' ? 10 : 1;
      this.addDrop(e, 'xp', e.kind === 'elite' ? 8 : 1);
      if (e.kind === 'elite') this.addDrop({ x: e.x + 24, y: e.y }, 'chest');
      else if (this.random() < 0.065) this.addDrop({ x: e.x - 16, y: e.y + 16 }, 'heal', 12);
      this.pulses.push({ x: e.x, y: e.y, age: 0, kind: 'death' }); return false;
    });
  }
  private updateDrops(dt: number): void {
    this.timers.drop -= dt; this.timers.chest -= dt;
    if (this.timers.drop <= 0) {
      const angle = this.random() * Math.PI * 2;
      const skills = ['burstMelon', 'sprayVine', 'frost', 'thorns', 'magnet'] as SkillId[];
      this.addDrop({ x: clamp(this.player.x + Math.cos(angle) * 140, 40, CONFIG.WORLD.width - 40), y: clamp(this.player.y + Math.sin(angle) * 140, 40, CONFIG.WORLD.height - 40) }, 'seed', 1, skills[Math.floor(this.random() * skills.length)]);
      this.timers.drop = CONFIG.SEEDS.intervalMin + this.random() * (CONFIG.SEEDS.intervalMax - CONFIG.SEEDS.intervalMin);
    }
    if (this.timers.chest <= 0) {
      this.addDrop({ x: clamp(this.player.x + 110, 40, CONFIG.WORLD.width - 40), y: this.player.y }, 'chest'); this.timers.chest = CONFIG.PROGRESSION.chestInterval;
    }
    const kept: Drop[] = [];
    for (const drop of this.drops) {
      drop.age += dt;
      if (drop.age > CONFIG.SEEDS.lifetime && drop.kind !== 'chest') continue;
      if (this.modal) { kept.push(drop); continue; }
      const d = distance(drop, this.player), pickup = CONFIG.PLAYER.pickupRadius;
      const attraction = pickup + this.skills.magnet * 65;
      if (d > pickup && d < attraction) { const travel = Math.min(d - pickup, CONFIG.SEEDS.magnetSpeed * dt); drop.x += (this.player.x - drop.x) / d * travel; drop.y += (this.player.y - drop.y) / d * travel; }
      if (distance(drop, this.player) > pickup + 0.01) { kept.push(drop); continue; }
      if (drop.kind === 'xp') this.gainXp(drop.value);
      else if (drop.kind === 'seed' && drop.skill) this.applySkill(drop.skill);
      else if (drop.kind === 'heal') this.player.hp = Math.min(this.maxHp, this.player.hp + drop.value);
      else if (drop.kind === 'chest') this.modal = { kind: 'chest', reward: chestReward(this.skills, this.random), revealed: false };
      this.pulses.push({ ...this.player, age: 0, kind: 'pickup' });
    }
    this.drops = kept;
  }
  toSnapshot(): RunSnapshot {
    return JSON.parse(JSON.stringify({ version: 2, state: { runId: this.runId, time: this.time, player: this.player, loadout: this.loadout, skills: this.skills, plants: this.plants, enemies: this.enemies, projectiles: this.projectiles, drops: this.drops, burst: this.burst, cooldown: this.cooldown, xp: this.xp, level: this.level, coins: this.coins, pendingLevels: this.pendingLevels, modal: this.modal, stats: this.stats, rngState: this.rngState, nextId: this.nextId, timers: this.timers } }));
  }
  static fromSnapshot(value: unknown): GameModel | null {
    if (!validSnapshot(value)) return null;
    const s = structuredClone(value.state), model = new GameModel(1, s.loadout);
    Object.assign(model, { runId: s.runId, time: s.time, player: s.player, loadout: s.loadout, skills: s.skills, plants: s.plants, enemies: s.enemies, projectiles: s.projectiles, drops: s.drops, burst: s.burst, cooldown: s.cooldown, xp: s.xp, level: s.level, coins: s.coins, pendingLevels: s.pendingLevels, modal: s.modal, stats: s.stats });
    model.rngState = s.rngState; model.nextId = s.nextId; model.timers = s.timers;
    model.notify('继续上次的生机 · 移动、拾取、自动攻击'); return model;
  }
}
