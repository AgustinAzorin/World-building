/**
 * Modificador de una puntuación de habilidad: floor((score - 10) / 2).
 * Regla pura, cubierta por tests unitarios (sección 13).
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}
