import type { BattleState, CombatantState, MapState } from "../combat/battle-state";

export function baseCombatant(overrides: Partial<CombatantState> = {}): CombatantState {
  return {
    id: "combatant-1",
    characterId: "combatant-1",
    name: "Aria",
    hitPoints: { current: 20, max: 20 },
    armorClass: 15,
    speed: 30,
    position: { x: 0, y: 0 },
    actionsRemaining: 1,
    movementRemaining: 30,
    resources: {},
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    ...overrides,
  };
}

export function baseMap(overrides: Partial<MapState> = {}): MapState {
  return { mapId: "map-1", width: 10, height: 10, tiles: {}, ...overrides };
}

export function baseBattleState(overrides: Partial<BattleState> = {}): BattleState {
  return {
    battleId: "battle-1",
    round: 1,
    activeParticipantId: "combatant-1",
    participants: [baseCombatant()],
    map: baseMap(),
    conditions: [],
    effects: [],
    log: [],
    ...overrides,
  };
}
