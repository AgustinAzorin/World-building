import type { GridCell } from "../entities/combat";
import { cellKey, getTile, isWithinMap, type MapState } from "./battle-state";

const NEIGHBOR_OFFSETS: GridCell[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

export interface ReachableTile {
  cell: GridCell;
  cost: number;
}

/**
 * Sección 9: casillas alcanzables con su coste, respetando obstáculos,
 * ocupación y terreno. Dijkstra sobre una cuadrícula 8-direccional porque el
 * coste de moverse puede variar por casilla (terreno difícil).
 */
export function reachableTiles(
  map: MapState,
  origin: GridCell,
  budget: number,
  ignoreOccupantId?: string,
): ReachableTile[] {
  const bestCost = new Map<string, number>();
  bestCost.set(cellKey(origin), 0);
  const frontier: GridCell[] = [origin];

  while (frontier.length > 0) {
    const current = frontier.shift()!;
    const currentCost = bestCost.get(cellKey(current))!;

    for (const offset of NEIGHBOR_OFFSETS) {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      if (!isWithinMap(map, next)) continue;

      const tile = getTile(map, next);
      if (!tile.walkable) continue;
      if (tile.occupied !== null && tile.occupied !== ignoreOccupantId) continue;

      const nextCost = currentCost + tile.movementCost;
      if (nextCost > budget) continue;

      const known = bestCost.get(cellKey(next));
      if (known === undefined || nextCost < known) {
        bestCost.set(cellKey(next), nextCost);
        frontier.push(next);
      }
    }
  }

  bestCost.delete(cellKey(origin));
  return Array.from(bestCost.entries()).map(([key, cost]) => {
    const [x, y] = key.split(",").map(Number);
    return { cell: { x: x!, y: y! }, cost };
  });
}

export function movementCostTo(
  map: MapState,
  origin: GridCell,
  destination: GridCell,
  budget: number,
  ignoreOccupantId?: string,
): number | null {
  const tiles = reachableTiles(map, origin, budget, ignoreOccupantId);
  return tiles.find((tile) => tile.cell.x === destination.x && tile.cell.y === destination.y)?.cost ?? null;
}

/**
 * Sección 8 ("¿existe línea de visión?"): traza la línea entre origen y
 * destino (Bresenham) y comprueba que ninguna casilla intermedia bloquee.
 * Una casilla no transitable (muro, obstáculo) bloquea la visión.
 */
export function hasLineOfSight(map: MapState, from: GridCell, to: GridCell): boolean {
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;

  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    if (!(x0 === from.x && y0 === from.y) && !(x0 === x1 && y0 === y1)) {
      if (!getTile(map, { x: x0, y: y0 }).walkable) {
        return false;
      }
    }
    if (x0 === x1 && y0 === y1) break;
    const doubledError = 2 * error;
    if (doubledError >= dy) {
      error += dy;
      x0 += sx;
    }
    if (doubledError <= dx) {
      error += dx;
      y0 += sy;
    }
  }

  return true;
}
