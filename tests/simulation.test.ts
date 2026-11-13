import { expect, it } from 'vitest';
import { GameModel } from '../src/core/GameModel';
import { distance, type Vec } from '../src/core/types';
import type { SkillId } from '../src/config/gameConfig';

function play(seed: number): GameModel {
  const m = new GameModel(seed);
  for (let frame = 0; frame < 12000 && !m.result; frame++) {
    if (m.modal?.kind === 'upgrade') {
      const priority: SkillId[] = m.player.hp < 60 ? ['vitality', 'frost', 'pea', 'thorns', 'sprayVine', 'magnet', 'burstMelon'] : ['pea', 'frost', 'thorns', 'sprayVine', 'magnet', 'burstMelon', 'vitality'];
      m.chooseUpgrade(priority.find(id => m.modal?.kind === 'upgrade' && m.modal.choices.includes(id))!); continue;
    }
    if (m.modal?.kind === 'chest') { m.revealChest(); m.confirmChest(); continue; }
    const target: Vec = [...m.drops].sort((a, b) => distance(a, m.player) - distance(b, m.player))[0] ?? { x: 360 + Math.cos(m.time * 0.4) * 140, y: 600 + Math.sin(m.time * 0.4) * 240 };
    let score = -Infinity, move = { x: 0, y: 0 };
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * Math.PI * 2, v = i === 16 ? { x: 0, y: 0 } : { x: Math.cos(a), y: Math.sin(a) };
      const p = { x: m.player.x + v.x * 16, y: m.player.y + v.y * 16 };
      if (p.x < 25 || p.x > 695 || p.y < 25 || p.y > 1155) continue;
      let s = -distance(p, target) * 0.035;
      if (!m.land.isSafe(p, m.time + 1, m.plants)) s -= 8;
      for (const enemy of m.enemies) { const d = distance(p, enemy); if (d < 110) s -= Math.pow((110 - d) / 40, 2) * 4; }
      if (s > score) { score = s; move = v; }
    }
    m.step(1 / 60, move);
  }
  return m;
}
it('三个固定种子的完整对局：仅靠移动、碰触拾取和选择奖励可完成六层', () => {
  const runs = [7, 42, 2026].map(play);
  console.info('完整对局', runs.map(m => ({ reason: m.result?.reason, time: Math.round(m.time), kills: m.stats.kills, level: m.level, hp: Math.round(m.player.hp), skills: m.skills })));
  expect(runs.every(m => m.result?.reason === 'survived')).toBe(true);
  expect(runs.every(m => m.level >= 3 && m.stats.kills > 50 && m.stats.matured > 0)).toBe(true);
});
