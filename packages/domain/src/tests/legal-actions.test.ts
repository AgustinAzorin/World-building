import { describe, expect, it } from "vitest";
import { computeLegalActions } from "../combat/legal-actions";
import type { ActionTemplate } from "../character/action-template";
import { baseBattleState, baseCombatant } from "./combat-test-helpers";

const attackTemplate: ActionTemplate = {
  key: "sword-attack",
  name: "Atacar con espada",
  type: "attack",
  source: "weapon",
  sourceId: null,
  range: { kind: "melee", distance: 1 },
  targeting: { minTargets: 1, maxTargets: 1, kinds: ["enemy"] },
  resourceCost: null,
  description: "",
};

const fireballTemplate: ActionTemplate = {
  key: "fireball",
  name: "Lanzar Bola de Fuego",
  type: "castSpell",
  source: "spell",
  sourceId: null,
  range: { kind: "ranged", distance: 10 },
  targeting: { minTargets: 1, maxTargets: 5, kinds: ["enemy"] },
  resourceCost: { resourceName: "spellSlot1", amount: 1 },
  description: "",
};

describe("computeLegalActions (sección 7/8): no mostrar acciones claramente imposibles", () => {
  it("con recursos y acción disponibles, ambas quedan disponibles", () => {
    const state = baseBattleState({ participants: [baseCombatant({ resources: { spellSlot1: 1 } })] });
    const legal = computeLegalActions(state, "combatant-1", [attackTemplate, fireballTemplate]);
    expect(legal.find((entry) => entry.template.key === "sword-attack")?.available).toBe(true);
    expect(legal.find((entry) => entry.template.key === "fireball")?.available).toBe(true);
  });

  it("ejemplo del doc: sin espacio de hechizo, Bola de Fuego queda no disponible", () => {
    const state = baseBattleState({ participants: [baseCombatant({ resources: { spellSlot1: 0 } })] });
    const legal = computeLegalActions(state, "combatant-1", [fireballTemplate]);
    const fireball = legal.find((entry) => entry.template.key === "fireball")!;
    expect(fireball.available).toBe(false);
    expect(fireball.checks.find((check) => check.key === "resource")?.passed).toBe(false);
  });

  it("si no es tu turno, nada queda disponible salvo lo que no dependa del turno", () => {
    const state = baseBattleState({ activeParticipantId: "other-combatant" });
    const legal = computeLegalActions(state, "combatant-1", [attackTemplate]);
    expect(legal[0]!.available).toBe(false);
    expect(legal[0]!.checks.find((check) => check.key === "turn")?.passed).toBe(false);
  });

  it("sin acciones restantes, las acciones que consumen acción quedan bloqueadas", () => {
    const state = baseBattleState({ participants: [baseCombatant({ actionsRemaining: 0 })] });
    const legal = computeLegalActions(state, "combatant-1", [attackTemplate]);
    expect(legal[0]!.available).toBe(false);
  });

  it("moverse no requiere acciones restantes (usa el movimiento del turno, no la acción)", () => {
    const moveTemplate: ActionTemplate = {
      key: "move",
      name: "Mover",
      type: "move",
      source: "base",
      sourceId: null,
      range: { kind: "self", distance: null },
      targeting: { minTargets: 0, maxTargets: 0, kinds: [] },
      resourceCost: null,
      description: "",
    };
    const state = baseBattleState({ participants: [baseCombatant({ actionsRemaining: 0 })] });
    const legal = computeLegalActions(state, "combatant-1", [moveTemplate]);
    expect(legal[0]!.checks.some((check) => check.key === "actionsRemaining")).toBe(false);
  });

  it("un actor incapacitado (aturdido) no tiene ninguna acción disponible", () => {
    const state = baseBattleState({
      conditions: [
        { combatantId: "combatant-1", condition: { id: "c1", key: "stunned", name: "Aturdido", description: "" }, remainingRounds: null },
      ],
    });
    const legal = computeLegalActions(state, "combatant-1", [attackTemplate]);
    expect(legal[0]!.available).toBe(false);
    expect(legal[0]!.checks.find((check) => check.key === "condition")?.passed).toBe(false);
  });

  it("un actor derrotado (0 PV) no tiene acciones disponibles", () => {
    const state = baseBattleState({ participants: [baseCombatant({ hitPoints: { current: 0, max: 20 } })] });
    const legal = computeLegalActions(state, "combatant-1", [attackTemplate]);
    expect(legal[0]!.available).toBe(false);
    expect(legal[0]!.checks.find((check) => check.key === "alive")?.passed).toBe(false);
  });
});
