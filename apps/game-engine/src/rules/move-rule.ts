import type { CombatEvent, CombatLogEntry, Rule } from "@world-building/domain";
import { findCombatant } from "@world-building/domain";
import { DomainError, createId, err, ok } from "@world-building/shared";

/** Regla de ejemplo del motor determinista: mueve a quien actúa a `destination`. */
export const moveRule: Rule = (state, action) => {
  if (action.type !== "move") {
    return ok({ events: [], state });
  }
  if (!action.destination) {
    return err(new DomainError("INVALID_ACTION", "move requiere destination"));
  }

  const combatant = findCombatant(state, action.actorId);
  if (!combatant) {
    return err(
      new DomainError("COMBATANT_NOT_FOUND", `Combatant ${action.actorId} no encontrado`),
    );
  }

  const destination = action.destination;
  const participants = state.participants.map((participant) =>
    participant.id === combatant.id ? { ...participant, position: destination } : participant,
  );

  const event: CombatEvent = {
    id: createId(),
    battleId: state.battleId,
    round: state.round,
    actorId: action.actorId,
    timestamp: new Date().toISOString(),
    type: "MovementPerformed",
    from: combatant.position,
    to: destination,
  };
  const logEntry: CombatLogEntry = {
    event,
    message: `${combatant.name} se movió a (${destination.x}, ${destination.y})`,
  };

  return ok({
    events: [event],
    state: { ...state, participants, log: [...state.log, logEntry] },
  });
};
