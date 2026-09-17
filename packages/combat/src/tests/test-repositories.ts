import type { Battle, BattleState } from "@world-building/domain";
import type { Id } from "@world-building/shared";
import type { BattleRepository, BattleStateRepository } from "../ports";

/**
 * Fakes en memoria solo para tests de este paquete. No se usa
 * @world-building/persistence aquí porque persistence depende de combat:
 * importarlo desde un test de combat crearía un ciclo de paquetes.
 */
export function createTestBattleRepository(): BattleRepository {
  const battles = new Map<Id, Battle>();
  return {
    async findById(id) {
      return battles.get(id) ?? null;
    },
    async save(battle) {
      battles.set(battle.id, battle);
    },
  };
}

export function createTestBattleStateRepository(): BattleStateRepository {
  const states = new Map<Id, BattleState>();
  return {
    async findByBattleId(battleId) {
      return states.get(battleId) ?? null;
    },
    async save(state) {
      states.set(state.battleId, state);
    },
  };
}
