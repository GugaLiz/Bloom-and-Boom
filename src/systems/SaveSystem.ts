import { CONFIG, DEFAULT_LOADOUT, SKILLS, type Loadout, type SkillId } from '../config/gameConfig';
import type { RunResult, RunSnapshot } from '../core/types';
import { validLoadout } from './ProgressionSystem';

export const SAVE_KEY = 'bloom-boom.run.v2';
export const PROFILE_KEY = 'bloom-boom.profile.v2';
type RecordValue = Record<string, unknown>;
const object = (v: unknown): v is RecordValue => !!v && typeof v === 'object' && !Array.isArray(v);
const numbers = (v: unknown, keys: string[]): boolean => object(v) && keys.every(k => typeof v[k] === 'number' && Number.isFinite(v[k]));
const skill = (v: unknown): v is SkillId => typeof v === 'string' && Object.hasOwn(SKILLS, v);
const point = (v: unknown): boolean => numbers(v, ['x', 'y']) && Math.abs((v as RecordValue).x as number) < 10000 && Math.abs((v as RecordValue).y as number) < 10000;
const array = (v: unknown, max: number, check: (item: unknown) => boolean): boolean => Array.isArray(v) && v.length <= max && v.every(check);

// 本地存档也按不可信输入处理；旧版本、截断 JSON 和异常实体都回到正常出战页。
export function validSnapshot(value: unknown): value is RunSnapshot {
  if (!object(value) || value.version !== 2 || !object(value.state)) return false;
  const s = value.state;
  if (typeof s.runId !== 'string' || s.runId.length > 100 || !numbers(s, ['time', 'cooldown', 'xp', 'level', 'coins', 'pendingLevels', 'rngState', 'nextId'])) return false;
  if ((s.time as number) < 0 || (s.time as number) >= CONFIG.WIN_TIME || (s.level as number) < 1 || !Number.isInteger(s.level) || (s.pendingLevels as number) < 0 || (s.pendingLevels as number) > 1000) return false;
  if (!validLoadout(s.loadout) || !object(s.skills) || !Object.entries(SKILLS).every(([id, def]) => Number.isInteger((s.skills as RecordValue)[id]) && ((s.skills as RecordValue)[id] as number) >= 0 && ((s.skills as RecordValue)[id] as number) <= def.max)) return false;
  if (!point(s.player) || !numbers(s.player, ['hp', 'invincible']) || !object(s.player) || !point(s.player.facing) || (s.player.hp as number) <= 0 || (s.player.hp as number) > 200) return false;
  if (!numbers(s.stats, ['kills', 'planted', 'matured']) || !numbers(s.timers, ['normal', 'elite', 'shot', 'vine', 'aura', 'drop', 'chest'])) return false;
  if (!array(s.enemies, CONFIG.COMBAT.maxEnemies, e => point(e) && numbers(e, ['id', 'hp', 'maxHp', 'knockTime', 'contactTimer', 'flash']) && object(e) && ['normal', 'elite'].includes(e.kind as string) && point(e.knockback))) return false;
  if (!array(s.plants, 20, p => point(p) && numbers(p, ['id', 'hp', 'growth', 'attackTimer', 'flash', 'age']) && object(p) && ['growing', 'mature', 'dead'].includes(p.state as string) && typeof p.empowered === 'boolean')) return false;
  if (!array(s.projectiles, CONFIG.COMBAT.maxProjectiles, p => point(p) && numbers(p, ['targetId', 'damage', 'life']) && object(p) && (p.vx === undefined ? p.vy === undefined : numbers(p, ['vx', 'vy'])))) return false;
  if (!array(s.drops, CONFIG.SEEDS.maxDrops, d => point(d) && numbers(d, ['id', 'value', 'age']) && object(d) && ['xp', 'seed', 'heal', 'chest'].includes(d.kind as string) && (d.skill === undefined || skill(d.skill)))) return false;
  if (s.burst !== null && (!point(s.burst) || !numbers(s.burst, ['age']) || !object(s.burst) || typeof s.burst.fired !== 'boolean')) return false;
  if (s.modal !== null) {
    const m = s.modal;
    if (!object(m)) return false;
    if (m.kind === 'upgrade') { if (!Array.isArray(m.choices) || !m.choices.length || m.choices.length > 3 || !m.choices.every(skill) || (s.pendingLevels as number) < 1) return false; }
    else if (m.kind === 'chest') {
      if (typeof m.revealed !== 'boolean' || !object(m.reward)) return false;
      if (m.reward.kind === 'skill' ? !skill(m.reward.skill) : !['heal', 'coins'].includes(m.reward.kind as string) || !numbers(m.reward, ['value'])) return false;
    } else return false;
  }
  return true;
}

export interface Profile { coins: number; bestFloor: number; bestKills: number; loadout: Loadout; settled: string[] }
export function loadProfile(): Profile {
  const fallback: Profile = { coins: 0, bestFloor: 1, bestKills: 0, loadout: { ...DEFAULT_LOADOUT }, settled: [] };
  try {
    const p: unknown = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (numbers(p, ['coins', 'bestFloor', 'bestKills']) && object(p) && validLoadout(p.loadout) && array(p.settled, 20, x => typeof x === 'string')) return p as unknown as Profile;
  } catch { /* 存储不可用时仍可正常游玩。 */ }
  return fallback;
}
export function saveProfile(profile: Profile): void { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* 保持内存中的当前状态。 */ } }
export function loadRun(): RunSnapshot | null {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw || raw.length > 2000000) return null; const data: unknown = JSON.parse(raw); if (validSnapshot(data)) return data; clearRun(); } catch { clearRun(); }
  return null;
}
export function saveRun(snapshot: RunSnapshot): void { try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot)); } catch { /* 浏览器限制存储时不打断战斗。 */ } }
export function clearRun(): void { try { localStorage.removeItem(SAVE_KEY); } catch { /* 无可清理的存储。 */ } }
export function settleRun(result: RunResult): void {
  const profile = loadProfile();
  if (profile.settled.includes(result.runId)) return;
  profile.coins += result.coins; profile.bestFloor = Math.max(profile.bestFloor, result.floor); profile.bestKills = Math.max(profile.bestKills, result.kills);
  profile.settled = [...profile.settled, result.runId].slice(-20); saveProfile(profile);
}
