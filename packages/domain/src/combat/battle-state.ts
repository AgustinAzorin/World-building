import type { Id } from "@world-building/shared";
import type { Combatant, Condition, EffectInstance, GridCell, Tile } from "../entities/combat";
import type { CombatLogEntry } from "./events";

export interface ConditionState {
  combatantId: Id;
  condition: Condition;
  remainingRounds: number | null;
}

export interface MapState {
  mapId: Id;
  width: number;
  height: number;
  /** Casillas indexadas por `cellKey` para lectura O(1) durante la resolución de acciones. */
  tiles: Record<string, Tile>;
}

export interface CombatantState extends Combatant {
  actionsRemaining: number;
  /** Movimiento restante en el turno actual, se reinicia a `speed` al empezar el turno (sección 9). */
  movementRemaining: number;
  resources: Record<string, number>;
}

/** Estado serializable de combate (sección 6): permite reconstruir qué ocurrió. */
export interface BattleState {
  battleId: Id;
  round: number;
  activeParticipantId: Id;
  participants: CombatantState[];
  map: MapState;
  conditions: ConditionState[];
  effects: EffectInstance[];
  log: CombatLogEntry[];
}

export function findCombatant(
  state: BattleState,
  combatantId: Id,
): CombatantState | undefined {
  return state.participants.find((participant) => participant.id === combatantId);
}

export function cellKey(cell: GridCell): string {
  return `${cell.x},${cell.y}`;
}

/** Distancia en casillas (Chebyshev): la métrica de cuadrícula común a mesa. */
export function gridDistance(a: GridCell, b: GridCell): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

const DEFAULT_TILE: Omit<Tile, "x" | "y"> = {
  terrain: "normal",
  walkable: true,
  movementCost: 1,
  occupied: null,
};

/** Una casilla no registrada explícitamente es transitable, coste 1, sin ocupar (sección 3). */
export function getTile(map: MapState, cell: GridCell): Tile {
  return map.tiles[cellKey(cell)] ?? { x: cell.x, y: cell.y, ...DEFAULT_TILE };
}

export function isWithinMap(map: MapState, cell: GridCell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height;
}

export function setTileOccupant(map: MapState, cell: GridCell, occupantId: Id | null): MapState {
  const key = cellKey(cell);
  const tile = getTile(map, cell);
  return { ...map, tiles: { ...map.tiles, [key]: { ...tile, occupied: occupantId } } };
}
