import { describe, expect, it } from "vitest";
import { createAttackRule } from "../rules/attack-rule";
import { baseAction, baseBattleState, baseCombatant, queueRandom, randomFor } from "./test-helpers";

const attacker = baseCombatant({ id: "combatant-1", position: { x: 0, y: 0 } });
const target = baseCombatant({ id: "combatant-2", name: "Goblin", position: { x: 1, y: 0 }, armorClass: 13 });

function stateWithBoth() {
  return baseBattleState({ participants: [attacker, target] });
}

describe("attack-rule (sección 10): resolución compuesta", () => {
  it("un impacto (tirada + bono >= CA) aplica daño y lo registra en el log", () => {
    const random = queueRandom([randomFor(15, 20), randomFor(4, 8)]); // 1d20=15, 1d8=4
    const rule = createAttackRule(random);
    const action = baseAction("attack", {
      targetIds: [target.id],
      parameters: { attackBonus: 3, range: 1, damageDice: { count: 1, sides: 8 }, damageBonus: 2, weaponName: "Espada" },
    });

    const result = rule(stateWithBoth(), action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const updatedTarget = result.value.state.participants.find((p) => p.id === target.id)!;
    // 15 + 3 = 18 >= CA 13 -> impacta; daño 4 + 2 = 6
    expect(updatedTarget.hitPoints.current).toBe(14);
    expect(result.value.events.some((event) => event.type === "AttackResolved")).toBe(true);
    expect(result.value.events.some((event) => event.type === "DamageApplied")).toBe(true);
    expect(result.value.state.log.some((entry) => entry.message.includes("1d20 + 3 = 18"))).toBe(true);
  });

  it("un fallo (tirada + bono < CA) no aplica daño", () => {
    const random = queueRandom([randomFor(2, 20)]); // 1d20=2
    const rule = createAttackRule(random);
    const action = baseAction("attack", { targetIds: [target.id], parameters: { attackBonus: 0, range: 1 } });

    const result = rule(stateWithBoth(), action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updatedTarget = result.value.state.participants.find((p) => p.id === target.id)!;
    expect(updatedTarget.hitPoints.current).toBe(target.hitPoints.current);
    expect(result.value.events.some((event) => event.type === "DamageApplied")).toBe(false);
  });

  it("un objetivo fuera de alcance rechaza el ataque", () => {
    const farTarget = baseCombatant({ id: "combatant-2", position: { x: 9, y: 9 } });
    const state = baseBattleState({ participants: [attacker, farTarget] });
    const rule = createAttackRule(queueRandom([randomFor(15, 20)]));
    const action = baseAction("attack", { targetIds: [farTarget.id], parameters: { range: 1 } });

    const result = rule(state, action);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("OUT_OF_RANGE");
  });

  it("derribar a un objetivo a 0 PV lo deja inconsciente", () => {
    const weakTarget = baseCombatant({ id: "combatant-2", position: { x: 1, y: 0 }, armorClass: 10, hitPoints: { current: 3, max: 20 } });
    const state = baseBattleState({ participants: [attacker, weakTarget] });
    const random = queueRandom([randomFor(15, 20), randomFor(6, 8)]);
    const rule = createAttackRule(random);
    const action = baseAction("attack", { targetIds: [weakTarget.id], parameters: { attackBonus: 0, range: 1, damageDice: { count: 1, sides: 8 } } });

    const result = rule(state, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.conditions.some((entry) => entry.combatantId === weakTarget.id && entry.condition.key === "unconscious")).toBe(
      true,
    );
  });

  it("descuenta la acción del atacante al resolver", () => {
    const random = queueRandom([randomFor(2, 20)]);
    const rule = createAttackRule(random);
    const action = baseAction("attack", { targetIds: [target.id], parameters: { range: 1 } });

    const result = rule(stateWithBoth(), action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.participants.find((p) => p.id === attacker.id)!.actionsRemaining).toBe(0);
  });

  it("ignora acciones que no son de ataque", () => {
    const rule = createAttackRule();
    const result = rule(stateWithBoth(), baseAction("move"));
    expect(result.ok).toBe(true);
  });
});
