import type { BattleState, CombatantState } from "@world-building/domain";
import type { Id } from "@world-building/shared";
import type { ResourceCostParameters } from "./validate-rule";

/** Descuenta la acción y, si corresponde, el recurso gastado (secciones 4 y 8). */
export function consumeActionCost(
  state: BattleState,
  actorId: Id,
  actionCost: number,
  resourceCost?: ResourceCostParameters,
): BattleState {
  return {
    ...state,
    participants: state.participants.map((participant): CombatantState => {
      if (participant.id !== actorId) return participant;
      const resources = resourceCost
        ? { ...participant.resources, [resourceCost.resourceName]: (participant.resources[resourceCost.resourceName] ?? 0) - resourceCost.amount }
        : participant.resources;
      return {
        ...participant,
        actionsRemaining: Math.max(0, participant.actionsRemaining - actionCost),
        resources,
      };
    }),
  };
}
