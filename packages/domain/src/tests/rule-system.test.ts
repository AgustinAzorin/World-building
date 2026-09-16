import { describe, expect, it } from "vitest";
import { defaultRuleSystem, getRuleSystem, registerRuleSystem } from "../character/rule-system";

describe("defaultRuleSystem", () => {
  it("calcula el bono de habilidad sumando modificador y competencia", () => {
    const bonus = defaultRuleSystem.skillBonus({
      attributeScore: 16, // modificador +3
      proficiency: "proficient",
      level: 5, // bono de competencia +3
      flatBonus: 1,
    });
    expect(bonus).toBe(3 + 3 + 1);
  });

  it("expertise duplica el bono de competencia", () => {
    const bonus = defaultRuleSystem.skillBonus({
      attributeScore: 16,
      proficiency: "expertise",
      level: 5,
      flatBonus: 0,
    });
    expect(bonus).toBe(3 + 3 * 2);
  });

  it("sin competencia, solo cuenta el modificador de atributo", () => {
    const bonus = defaultRuleSystem.skillBonus({
      attributeScore: 16,
      proficiency: "none",
      level: 5,
      flatBonus: 0,
    });
    expect(bonus).toBe(3);
  });

  it("la CA base es 10 + modificador de destreza", () => {
    expect(defaultRuleSystem.baseArmorClass({ dexterityScore: 14 })).toBe(12);
  });

  it("permite registrar y resolver sistemas de reglas alternativos por clave", () => {
    registerRuleSystem({ ...defaultRuleSystem, key: "custom-test-system" });
    expect(getRuleSystem("custom-test-system").key).toBe("custom-test-system");
    expect(() => getRuleSystem("does-not-exist")).toThrow();
  });
});
