import {
  findCombatant,
  isWithinMap,
  movementCostTo,
  setTileOccupant,
  type CombatEvent,
  type CombatLogEntry,
  type Rule,
} from "@world-building/domain";
import { DomainError, createId, err, ok } from "@world-building/shared";

/**
 * Sección 9: calcula el coste real hasta el destino (obstáculos, ocupación,
 * terreno) y solo permite moverse si entra en el movimiento restante del
 * combatant este turno.
 */
export const moveRule: Rule = (state, action) => {
  if (action.type !== "move") {
    return ok({ events: [], state });
  }
  if (!action.destination) {
    return err(new DomainError("INVALID_ACTION", "move requiere destination"));
  }

  const actor = findCombatant(state, action.actorId);
  if (!actor) {
    return err(new DomainError("COMBATANT_NOT_FOUND", `Combatant ${action.actorId} no encontrado`));
  }
  if (!isWithinMap(state.map, action.destination)) {
    return err(new DomainError("OUT_OF_BOUNDS", "El destino está fuera del mapa"));
  }

  const cost = movementCostTo(state.map, actor.position, action.destination, actor.movementRemaining, actor.id);
  if (cost === null) {
    return err(new DomainError("UNREACHABLE_DESTINATION", `${actor.name} no puede llegar a ese destino este turno`));
  }

  const destination = action.destination;
  const nextMap = setTileOccupant(setTileOccupant(state.map, actor.position, null), destination, actor.id);
  const participants = state.participants.map((participant) =>
    participant.id === actor.id
      ? { ...participant, position: destination, movementRemaining: participant.movementRemaining - cost }
      : participant,
  );

  const event: CombatEvent = {
    id: createId(),
    battleId: state.battleId,
    round: state.round,
    actorId: action.actorId,
    timestamp: new Date().toISOString(),
    type: "MovementPerformed",
    from: actor.position,
    to: destination,
  };
  const logEntry: CombatLogEntry = {
    event,
    message: `${actor.name} se movió a (${destination.x}, ${destination.y}), coste ${cost}`,
  };

  return ok({
    events: [event],
    state: { ...state, map: nextMap, participants, log: [...state.log, logEntry] },
  });
};

/** "Correr" (sección 7, plantilla base `dash`): duplica el movimiento disponible este turno. */
export const dashRule: Rule = (state, action) => {
  if (action.type !== "dash") {
    return ok({ events: [], state });
  }

  const actor = findCombatant(state, action.actorId);
  if (!actor) {
    return err(new DomainError("COMBATANT_NOT_FOUND", `Combatant ${action.actorId} no encontrado`));
  }

  const participants = state.participants.map((participant) =>
    participant.id === actor.id
      ? { ...participant, movementRemaining: participant.movementRemaining + actor.speed, actionsRemaining: participant.actionsRemaining - 1 }
      : participant,
  );

  const event: CombatEvent = {
    id: createId(),
    battleId: state.battleId,
    round: state.round,
    actorId: action.actorId,
    timestamp: new Date().toISOString(),
    type: "ActionPerformed",
    actionType: "dash",
  };
  const logEntry: CombatLogEntry = { event, message: `${actor.name} corre: movimiento +${actor.speed}` };

  return ok({ events: [event], state: { ...state, participants, log: [...state.log, logEntry] } });
};
