import { describe, expect, it } from "vitest";
import { DEFAULT_COMBAT_RULES } from "../rules";
import { createBattle, endTurn, executeAction, rollInitiative, startBattle } from "../use-cases";
import { createTestBattleRepository, createTestBattleStateRepository } from "./test-repositories";
import { baseAction, baseBattleState, baseCombatant, queueRandom, randomFor } from "./test-helpers";

function unwrap<T>(result: { ok: boolean; value?: T; error?: unknown }): T {
  if (!result.ok) throw result.error;
  return result.value as T;
}

describe("use-cases de combate: criterio de terminado (sección 20)", () => {
  it("crea una batalla en estado pendiente", async () => {
    const battleRepo = createTestBattleRepository();
    const battle = unwrap(await createBattle(battleRepo, { campaignId: "campaign-1", name: "Emboscada", mapId: "map-1" }));
    expect(battle.status).toBe("pending");
  });

  it("iniciar la batalla la pasa a activa y guarda el estado inicial", async () => {
    const battleRepo = createTestBattleRepository();
    const stateRepo = createTestBattleStateRepository();
    const battle = unwrap(await createBattle(battleRepo, { campaignId: "campaign-1", name: "Emboscada", mapId: "map-1" }));

    const initialState = baseBattleState({ battleId: battle.id });
    const started = unwrap(await startBattle(battleRepo, stateRepo, battle.id, initialState));
    expect(started.status).toBe("active");
    expect(await stateRepo.findByBattleId(battle.id)).toEqual(initialState);
  });

  it("tirar iniciativa ordena a los participantes de mayor a menor y activa al primero", async () => {
    const stateRepo = createTestBattleStateRepository();
    const aria = baseCombatant({ id: "aria", name: "Aria" });
    const goblin = baseCombatant({ id: "goblin", name: "Goblin" });
    await stateRepo.save(baseBattleState({ participants: [aria, goblin], activeParticipantId: aria.id }));

    // Aria: 1d20=5 + bono 2 = 7. Goblin: 1d20=18 + bono 0 = 18. Goblin debería ir primero.
    const random = queueRandom([randomFor(5, 20), randomFor(18, 20)]);
    const updated = unwrap(
      await rollInitiative(stateRepo, "battle-1", [
        { participantId: aria.id, bonus: 2 },
        { participantId: goblin.id, bonus: 0 },
      ], random),
    );

    expect(updated.activeParticipantId).toBe(goblin.id);
    expect(updated.participants.map((p) => p.id)).toEqual([goblin.id, aria.id]);
    expect(updated.log.some((entry) => entry.message.includes("Goblin"))).toBe(true);
  });

  it("mover y atacar a través de la cadena de reglas por defecto resuelve el turno completo", async () => {
    const stateRepo = createTestBattleStateRepository();
    const attacker = baseCombatant({ id: "attacker", name: "Aria", position: { x: 0, y: 0 } });
    const target = baseCombatant({ id: "target", name: "Goblin", position: { x: 3, y: 0 }, armorClass: 10 });
    await stateRepo.save(baseBattleState({ participants: [attacker, target], activeParticipantId: attacker.id }));

    const moveAction = baseAction("move", { actorId: attacker.id, destination: { x: 2, y: 0 } });
    const afterMove = unwrap(await executeAction(stateRepo, DEFAULT_COMBAT_RULES, "battle-1", moveAction));
    expect(afterMove.state.participants.find((p) => p.id === attacker.id)!.position).toEqual({ x: 2, y: 0 });

    const attackAction = baseAction("attack", {
      actorId: attacker.id,
      targetIds: [target.id],
      parameters: { attackBonus: 10, range: 5, damageDice: { count: 1, sides: 6 } },
    });
    const afterAttack = unwrap(await executeAction(stateRepo, DEFAULT_COMBAT_RULES, "battle-1", attackAction));
    const updatedTarget = afterAttack.state.participants.find((p) => p.id === target.id)!;
    expect(updatedTarget.hitPoints.current).toBeLessThan(target.hitPoints.max);
  });

  it("no permite ejecutar una acción cuando no queda acción disponible (validación en el motor, sección 8)", async () => {
    const stateRepo = createTestBattleStateRepository();
    const attacker = baseCombatant({ id: "attacker", actionsRemaining: 0 });
    const target = baseCombatant({ id: "target", position: { x: 1, y: 0 } });
    await stateRepo.save(baseBattleState({ participants: [attacker, target], activeParticipantId: attacker.id }));

    const result = await executeAction(
      stateRepo,
      DEFAULT_COMBAT_RULES,
      "battle-1",
      baseAction("attack", { actorId: attacker.id, targetIds: [target.id] }),
    );
    expect(result.ok).toBe(false);
  });

  it("terminar el turno pasa al siguiente participante y reinicia sus recursos de turno", async () => {
    const stateRepo = createTestBattleStateRepository();
    const first = baseCombatant({ id: "first", actionsRemaining: 0, movementRemaining: 0 });
    const second = baseCombatant({ id: "second", actionsRemaining: 0, movementRemaining: 0, speed: 25 });
    await stateRepo.save(baseBattleState({ participants: [first, second], activeParticipantId: first.id, round: 1 }));

    const updated = unwrap(await endTurn(stateRepo, "battle-1"));
    expect(updated.activeParticipantId).toBe(second.id);
    expect(updated.round).toBe(1);
    const nextActor = updated.participants.find((p) => p.id === second.id)!;
    expect(nextActor.actionsRemaining).toBe(1);
    expect(nextActor.movementRemaining).toBe(25);
  });

  it("al completar la ronda (vuelve al primer participante), avanza el número de ronda", async () => {
    const stateRepo = createTestBattleStateRepository();
    const first = baseCombatant({ id: "first" });
    const second = baseCombatant({ id: "second" });
    await stateRepo.save(baseBattleState({ participants: [first, second], activeParticipantId: second.id, round: 1 }));

    const updated = unwrap(await endTurn(stateRepo, "battle-1"));
    expect(updated.activeParticipantId).toBe(first.id);
    expect(updated.round).toBe(2);
  });

  it("al empezar su turno, los efectos con duración del participante avanzan (sección 12)", async () => {
    const stateRepo = createTestBattleStateRepository();
    const poisoned = baseCombatant({ id: "second", hitPoints: { current: 20, max: 20 } });
    const first = baseCombatant({ id: "first" });
    await stateRepo.save(
      baseBattleState({
        participants: [first, poisoned],
        activeParticipantId: first.id,
        effects: [
          {
            id: "dot-1",
            combatantId: poisoned.id,
            effect: { id: "poison-effect", kind: "damage", sourceId: "someone", durationRounds: 3, parameters: { amount: 2 } },
            remainingRounds: 3,
          },
        ],
      }),
    );

    const updated = unwrap(await endTurn(stateRepo, "battle-1"));
    const damaged = updated.participants.find((p) => p.id === poisoned.id)!;
    expect(damaged.hitPoints.current).toBe(18);
    expect(updated.effects[0]!.remainingRounds).toBe(2);
  });
});
