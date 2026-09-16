import type { Battle } from "@world-building/domain";
import type { BattleState } from "@world-building/domain";
import type { Id } from "@world-building/shared";

export interface BattleRepository {
  findById(id: Id): Promise<Battle | null>;
  save(battle: Battle): Promise<void>;
}

export interface BattleStateRepository {
  findByBattleId(battleId: Id): Promise<BattleState | null>;
  save(state: BattleState): Promise<void>;
}
