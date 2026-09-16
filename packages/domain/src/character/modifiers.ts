/**
 * Motor de modificadores (sección 10): permite explicar de dónde sale un
 * valor derivado en lugar de duplicarlo manualmente en cada capa.
 */
export type ModifierOperation = "add" | "set";

/** Declarado como dato por rasgos, dotes, hechizos, objetos y condiciones. */
export interface ModifierTemplate {
  target: string;
  amount: number;
  operation: ModifierOperation;
}

/** Un ModifierTemplate ya resuelto contra su origen concreto (objeto, rasgo, condición...). */
export interface ActiveModifier extends ModifierTemplate {
  source: string;
}

export interface DerivedValueBreakdownEntry {
  source: string;
  amount: number;
}

export interface DerivedValue {
  total: number;
  breakdown: DerivedValueBreakdownEntry[];
}

export function modifiersFor(target: string, modifiers: ActiveModifier[]): ActiveModifier[] {
  return modifiers.filter((modifier) => modifier.target === target);
}

/**
 * Ejemplo (sección 10): CA = 10 base + 3 armadura + 2 escudo + 1 rasgo = 16.
 * Un modificador "set" (p.ej. un efecto que fija el valor) gana sobre la suma.
 */
export function computeDerivedValue(
  baseValue: number,
  baseSource: string,
  target: string,
  modifiers: ActiveModifier[],
): DerivedValue {
  const relevant = modifiersFor(target, modifiers);
  const setModifier = relevant.find((modifier) => modifier.operation === "set");
  if (setModifier) {
    return {
      total: setModifier.amount,
      breakdown: [{ source: setModifier.source, amount: setModifier.amount }],
    };
  }

  const breakdown: DerivedValueBreakdownEntry[] = [{ source: baseSource, amount: baseValue }];
  let total = baseValue;
  for (const modifier of relevant) {
    total += modifier.amount;
    breakdown.push({ source: modifier.source, amount: modifier.amount });
  }
  return { total, breakdown };
}

export const ARMOR_CLASS_TARGET = "armorClass";
export const HIT_POINTS_MAX_TARGET = "hitPointsMax";
export const SPEED_TARGET = "speed";
export const INITIATIVE_TARGET = "initiative";

export function attributeTarget(attributeKey: string): string {
  return `attribute:${attributeKey}`;
}

export function skillTarget(skillKey: string): string {
  return `skill:${skillKey}`;
}

export function savingThrowTarget(attributeKey: string): string {
  return `savingThrow:${attributeKey}`;
}

export function resistanceTarget(damageType: string): string {
  return `resistance:${damageType}`;
}
