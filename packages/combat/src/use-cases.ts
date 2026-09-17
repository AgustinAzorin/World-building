import type {
  Action,
  ActionOutcome,
  Battle,
  BattleState,
  CombatEvent,
  CombatLogEntry,
  CombatantState,
  RandomSource,
  Rule,
} from "@world-building/domain";
import { applyRules, findCombatant, resolveRoll, rollDice, tickEffects } from "@world-building/domain";
import { DomainError, createId, err, ok, type Id, type Result } from "@world-building/shared";
import type { BattleRepository, BattleStateRepository } from "./ports";

export interface CreateBattleInput {
  campaignId: string;
  name: string;
  mapId: string;
}

export async function createBattle(
  repo: BattleRepository,
  input: CreateBattleInput,
): Promise<Result<Battle>> {
  const battle: Battle = {
    id: createId(),
    campaignId: input.campaignId,
    name: input.name,
    status: "pending",
    mapId: input.mapId,
  };
  await repo.save(battle);
  return ok(battle);
}

export async function startBattle(
  battleRepo: BattleRepository,
  stateRepo: BattleStateRepository,
  battleId: Id,
  initialState: BattleState,
): Promise<Result<Battle>> {
  const battle = await battleRepo.findById(battleId);
  if (!battle) {
    return err(new DomainError("BATTLE_NOT_FOUND", `Battle ${battleId} not found`));
  }
  const updated: Battle = { ...battle, status: "active" };
  await battleRepo.save(updated);
  await stateRepo.save(initialState);
  return ok(updated);
}

export async function executeAction(
  stateRepo: BattleStateRepository,
  rules: Rule[],
  battleId: Id,
  action: Action,
): Promise<Result<ActionOutcome>> {
  const state = await stateRepo.findByBattleId(battleId);
  if (!state) {
    return err(
      new DomainError("BATTLE_STATE_NOT_FOUND", `Battle state for ${battleId} not found`),
    );
  }
  const outcome = applyRules(rules, state, action);
  if (!outcome.ok) {
    return outcome;
  }
  await stateRepo.save(outcome.value.state);
  return outcome;
}

/**
 * Sección 6: "Turn End -> Next participant -> Turn Start -> Determine
 * Available Actions". Al pasar de turno, se aplican los efectos/condiciones
 * con duración del siguiente participante (sección 12) y se reinician sus
 * recursos de turno (acción y movimiento).
 */
export async function endTurn(
  stateRepo: BattleStateRepository,
  battleId: Id,
): Promise<Result<BattleState>> {
  const state = await stateRepo.findByBattleId(battleId);
  if (!state) {
    return err(
      new DomainError("BATTLE_STATE_NOT_FOUND", `Battle state for ${battleId} not found`),
    );
  }
  if (state.participants.length === 0) {
    return err(new DomainError("NO_PARTICIPANTS", "Battle has no participants"));
  }

  const currentIndex = state.participants.findIndex(
    (participant) => participant.id === state.activeParticipantId,
  );
  const nextIndex = (currentIndex + 1) % state.participants.length;
  const wrapped = nextIndex <= currentIndex;
  const round = wrapped ? state.round + 1 : state.round;
  const currentActor = findCombatant(state, state.activeParticipantId);
  const nextActor = state.participants[nextIndex]!;

  const turnEndedEvent: CombatEvent = {
    id: createId(),
    battleId,
    round: state.round,
    actorId: state.activeParticipantId,
    timestamp: new Date().toISOString(),
    type: "TurnEnded",
  };
  const turnEndedLog: CombatLogEntry = {
    event: turnEndedEvent,
    message: `${currentActor?.name ?? state.activeParticipantId} termina su turno`,
  };

  let nextState: BattleState = {
    ...state,
    round,
    activeParticipantId: nextActor.id,
    log: [...state.log, turnEndedLog],
  };

  const ticked = tickEffects(nextState, nextActor.id, { battleId, round, actorId: nextActor.id });
  nextState = ticked.state;

  const turnStartedEvent: CombatEvent = {
    id: createId(),
    battleId,
    round,
    actorId: nextActor.id,
    timestamp: new Date().toISOString(),
    type: "TurnStarted",
  };
  nextState = {
    ...nextState,
    participants: nextState.participants.map((participant) =>
      participant.id === nextActor.id
        ? { ...participant, actionsRemaining: 1, movementRemaining: participant.speed }
        : participant,
    ),
    log: [...nextState.log, { event: turnStartedEvent, message: `Ronda ${round} — turno de ${nextActor.name}` }],
  };

  await stateRepo.save(nextState);
  return ok(nextState);
}

export interface InitiativeInput {
  participantId: Id;
  bonus: number;
}

/**
 * Sección 2/6: tira iniciativa (1d20 + bono) por participante y ordena el
 * turno de mayor a menor. Deja a la batalla lista para el primer `Turn Start`.
 */
export async function rollInitiative(
  stateRepo: BattleStateRepository,
  battleId: Id,
  inputs: InitiativeInput[],
  random: RandomSource = Math.random,
): Promise<Result<BattleState>> {
  const state = await stateRepo.findByBattleId(battleId);
  if (!state) {
    return err(
      new DomainError("BATTLE_STATE_NOT_FOUND", `Battle state for ${battleId} not found`),
    );
  }

  const rolls = inputs.map((input) => {
    const combatant = findCombatant(state, input.participantId);
    const resolution = resolveRoll(rollDice(1, 20, random), [{ source: "bono de iniciativa", amount: input.bonus }]);
    return { combatant, participantId: input.participantId, resolution };
  });

  const ordered = [...rolls].sort((a, b) => b.resolution.total - a.resolution.total);
  const orderedIds = ordered.map((entry) => entry.participantId);
  const orderedParticipants = orderedIds
    .map((id) => state.participants.find((participant) => participant.id === id))
    .filter((participant): participant is CombatantState => participant !== undefined);
  const remainingParticipants = state.participants.filter(
    (participant) => !orderedIds.includes(participant.id),
  );

  const logEntries: CombatLogEntry[] = ordered.map(({ combatant, participantId, resolution }) => {
    const event: CombatEvent = {
      id: createId(),
      battleId,
      round: 1,
      actorId: participantId,
      timestamp: new Date().toISOString(),
      type: "InitiativeRolled",
      roll: resolution.total,
    };
    return { event, message: `${combatant?.name ?? participantId} tira iniciativa: ${resolution.total}` };
  });

  const firstParticipant = orderedParticipants[0] ?? remainingParticipants[0];
  const updated: BattleState = {
    ...state,
    round: 1,
    activeParticipantId: firstParticipant?.id ?? state.activeParticipantId,
    participants: [...orderedParticipants, ...remainingParticipants].map((participant) =>
      participant.id === firstParticipant?.id
        ? { ...participant, actionsRemaining: 1, movementRemaining: participant.speed }
        : participant,
    ),
    log: [...state.log, ...logEntries],
  };

  await stateRepo.save(updated);
  return ok(updated);
}
