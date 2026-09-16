import type { Battle, BattleState } from "@world-building/domain";
import type { BattleStateRepository } from "@world-building/combat";
import type { Id } from "@world-building/shared";
import { InMemoryStore } from "./in-memory-store";

export class InMemoryBattleRepository extends InMemoryStore<Battle> {}

export class InMemoryBattleStateRepository implements BattleStateRepository {
  private readonly states = new Map<Id, BattleState>();

  async findByBattleId(battleId: Id): Promise<BattleState | null> {
    return this.states.get(battleId) ?? null;
  }

  async save(state: BattleState): Promise<void> {
    this.states.set(state.battleId, state);
  }
}
