import { ok, type DomainError, type Result } from "@world-building/shared";
import type { Action } from "./combat/action";
import type { BattleState } from "./combat/battle-state";
import type { CombatEvent } from "./combat/events";

/**
 * Contrato del motor determinista (sección 2.3):
 * GameState + Action -> Result + NewGameState
 */
export type GameState = BattleState;

export interface ActionOutcome {
  events: CombatEvent[];
  state: GameState;
}

export type Rule = (
  state: GameState,
  action: Action,
) => Result<ActionOutcome, DomainError>;

/** Aplica una cadena de reglas en orden; corta en la primera que falla. */
export function applyRules(
  rules: Rule[],
  state: GameState,
  action: Action,
): Result<ActionOutcome, DomainError> {
  let currentState = state;
  const events: CombatEvent[] = [];

  for (const rule of rules) {
    const outcome = rule(currentState, action);
    if (!outcome.ok) {
      return outcome;
    }
    currentState = outcome.value.state;
    events.push(...outcome.value.events);
  }

  return ok({ events, state: currentState });
}
