import type { Action, ActionOutcome, Battle, BattleState, Rule } from "@world-building/domain";
import { applyRules } from "@world-building/domain";
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

  const updated: BattleState = {
    ...state,
    round: wrapped ? state.round + 1 : state.round,
    activeParticipantId: state.participants[nextIndex]!.id,
  };
  await stateRepo.save(updated);
  return ok(updated);
}
