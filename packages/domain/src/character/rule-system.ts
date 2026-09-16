import { abilityModifier, proficiencyBonus } from "../combat/modifiers";

/**
 * Sección 2: "No asumir una fórmula universal si el sistema de reglas puede
 * configurarse". El personaje nunca calcula estas fórmulas por su cuenta:
 * siempre pasa por un RuleSystem, que puede sustituirse por campaña.
 */
export type ProficiencyLevel = "none" | "proficient" | "expertise";

export interface SkillBonusInput {
  attributeScore: number;
  proficiency: ProficiencyLevel;
  level: number;
  flatBonus: number;
}

export interface SavingThrowBonusInput {
  attributeScore: number;
  proficient: boolean;
  level: number;
}

export interface RuleSystem {
  key: string;
  attributeModifier(score: number): number;
  proficiencyBonusForLevel(level: number): number;
  skillBonus(input: SkillBonusInput): number;
  savingThrowBonus(input: SavingThrowBonusInput): number;
  baseArmorClass(input: { dexterityScore: number }): number;
  initiativeBonus(input: { dexterityScore: number }): number;
}

function proficiencyMultiplier(proficiency: ProficiencyLevel): number {
  switch (proficiency) {
    case "expertise":
      return 2;
    case "proficient":
      return 1;
    case "none":
      return 0;
  }
}

/** Implementación por defecto (inspirada en d20), reemplazable por campaña. */
export const defaultRuleSystem: RuleSystem = {
  key: "srd-like-default",
  attributeModifier: abilityModifier,
  proficiencyBonusForLevel: proficiencyBonus,
  skillBonus({ attributeScore, proficiency, level, flatBonus }) {
    return (
      abilityModifier(attributeScore) +
      proficiencyBonus(level) * proficiencyMultiplier(proficiency) +
      flatBonus
    );
  },
  savingThrowBonus({ attributeScore, proficient, level }) {
    return abilityModifier(attributeScore) + (proficient ? proficiencyBonus(level) : 0);
  },
  baseArmorClass({ dexterityScore }) {
    return 10 + abilityModifier(dexterityScore);
  },
  initiativeBonus({ dexterityScore }) {
    return abilityModifier(dexterityScore);
  },
};

export const STANDARD_ATTRIBUTES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export type StandardAttributeKey = (typeof STANDARD_ATTRIBUTES)[number];

const ruleSystemRegistry = new Map<string, RuleSystem>([[defaultRuleSystem.key, defaultRuleSystem]]);

export function registerRuleSystem(ruleSystem: RuleSystem): void {
  ruleSystemRegistry.set(ruleSystem.key, ruleSystem);
}

export function getRuleSystem(key: string): RuleSystem {
  const ruleSystem = ruleSystemRegistry.get(key);
  if (!ruleSystem) {
    throw new Error(`Unknown rule system: ${key}`);
  }
  return ruleSystem;
}
