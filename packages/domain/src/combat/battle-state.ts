import type { Id } from "@world-building/shared";
import type { Combatant, Condition, GridCell } from "../entities/combat";
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
  occupied: Record<string, Id>;
}

export interface CombatantState extends Combatant {
  actionsRemaining: number;
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
