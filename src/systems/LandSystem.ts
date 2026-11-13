import { CONFIG } from '../config/gameConfig';
import type { Plant, Vec } from '../core/types';
const { width: W, height: H } = CONFIG.WORLD;

export class LandSystem {
  inset(time: number): number { return Math.min(CONFIG.MIASMA_FIELD.maxInset, Math.max(0, time - CONFIG.MIASMA_FIELD.shrinkStartDelay) * CONFIG.MIASMA_FIELD.shrinkSpeed); }
  inside(p: Vec): boolean { return p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H; }
  isSafe(p: Vec, time: number, plants: readonly Plant[]): boolean {
    if (!this.inside(p)) return false;
    const inset = this.inset(time);
    return (p.x >= inset && p.x <= W - inset && p.y >= inset && p.y <= H - inset) || plants.some(plant => plant.state === 'mature' && plant.hp > 0 && Math.hypot(p.x - plant.x, p.y - plant.y) <= CONFIG.GROW_SPRAY_VINE.cleanseRadius);
  }
  coverage(time: number, plants: readonly Plant[]): number {
    const inset = this.inset(time), mature = plants.filter(p => p.state === 'mature' && p.hp > 0);
    if (!mature.length) return 100 * (1 - (W - inset * 2) * (H - inset * 2) / (W * H));
    let area = 0;
    const edges = Array.from({ length: W / 2 + 1 }, (_, i) => i * 2).concat([inset, W - inset]).sort((a, b) => a - b);
    for (let i = 1; i < edges.length; i++) {
      const width = edges[i] - edges[i - 1]; if (width <= 0) continue;
      const x = (edges[i] + edges[i - 1]) / 2, spans: [number, number][] = [];
      if (x >= inset && x <= W - inset) spans.push([inset, H - inset]);
      for (const p of mature) {
        const dx = x - p.x, r = CONFIG.GROW_SPRAY_VINE.cleanseRadius;
        if (Math.abs(dx) >= r) continue;
        const dy = Math.sqrt(r * r - dx * dx);
        spans.push([Math.max(0, p.y - dy), Math.min(H, p.y + dy)]);
      }
      spans.sort((a, b) => a[0] - b[0]);
      let lo = -1, hi = -1;
      for (const [a, b] of spans) {
        if (a > hi) { if (hi >= 0) area += (hi - lo) * width; lo = a; hi = b; }
        else hi = Math.max(hi, b);
      }
      if (hi >= 0) area += (hi - lo) * width;
    }
    return Math.max(0, 100 * (1 - area / (W * H)));
  }
}
