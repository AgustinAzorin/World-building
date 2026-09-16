import type { ContentRegistries } from "@world-building/content";
import {
  ARMOR_CLASS_TARGET,
  BASE_ACTION_TEMPLATES,
  HIT_POINTS_MAX_TARGET,
  INITIATIVE_TARGET,
  SPEED_TARGET,
  computeDerivedValue,
  getRuleSystem,
  gridDistance,
  savingThrowTarget,
  skillTarget,
  type ActionTargetKind,
  type ActionTemplate,
  type ActiveModifier,
  type DerivedValue,
  type GridCell,
} from "@world-building/domain";
import type { Id } from "@world-building/shared";
import type { CharacterAggregate } from "./aggregate";

/**
 * Contrato de integración con el motor de combate (sección 13 del doc de
 * personajes): el Battle Board consume estas funciones y no reimplementa
 * reglas de personaje.
 */
export interface CharacterEngineContext {
  aggregate: CharacterAggregate;
  content: ContentRegistries;
}

function attributeScore(ctx: CharacterEngineContext, attributeKey: string): number {
  return ctx.aggregate.attributeScores.find((score) => score.attributeKey === attributeKey)?.score ?? 10;
}

function resolveItem(ctx: CharacterEngineContext, itemId: Id) {
  return ctx.content.equipment.get(itemId) ?? ctx.content.items.get(itemId);
}

/** Modificadores activos: equipo equipado + rasgos adquiridos (sección 10). */
export function activeModifiers(ctx: CharacterEngineContext): ActiveModifier[] {
  const modifiers: ActiveModifier[] = [];

  for (const inventoryItem of ctx.aggregate.inventoryItems) {
    if (inventoryItem.state !== "equipped") continue;
    const item = resolveItem(ctx, inventoryItem.itemId);
    if (!item) continue;
    for (const modifier of item.modifiers) {
      modifiers.push({ ...modifier, source: item.name });
    }
  }

  for (const characterFeature of ctx.aggregate.features) {
    const feature = ctx.content.features.get(characterFeature.featureId);
    if (!feature) continue;
    for (const modifier of feature.modifiers) {
      modifiers.push({ ...modifier, source: feature.name });
    }
  }

  return modifiers;
}

export function availableResources(ctx: CharacterEngineContext) {
  return ctx.aggregate.resources;
}

export function availableMovement(ctx: CharacterEngineContext): DerivedValue {
  const modifiers = activeModifiers(ctx);
  return computeDerivedValue(ctx.aggregate.character.baseSpeed, "velocidad base", SPEED_TARGET, modifiers);
}

export interface DefensesSummary {
  armorClass: DerivedValue;
  hitPoints: { current: number; max: DerivedValue; temporary: number };
  initiative: DerivedValue;
  savingThrows: Record<string, DerivedValue>;
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  conditions: CharacterAggregate["conditions"];
}

export function defenses(ctx: CharacterEngineContext): DefensesSummary {
  const ruleSystem = getRuleSystem(ctx.aggregate.character.ruleSystemKey);
  const modifiers = activeModifiers(ctx);
  const dexScore = attributeScore(ctx, "dexterity");

  const armorClass = computeDerivedValue(
    ruleSystem.baseArmorClass({ dexterityScore: dexScore }),
    "base",
    ARMOR_CLASS_TARGET,
    modifiers,
  );

  const hitPointsMax = computeDerivedValue(
    ctx.aggregate.character.hitPoints.max,
    "base",
    HIT_POINTS_MAX_TARGET,
    modifiers,
  );

  const initiative = computeDerivedValue(
    ruleSystem.initiativeBonus({ dexterityScore: dexScore }),
    "base",
    INITIATIVE_TARGET,
    modifiers,
  );

  const savingThrows: Record<string, DerivedValue> = {};
  for (const attributeScoreEntry of ctx.aggregate.attributeScores) {
    const proficient = ctx.aggregate.character.savingThrowProficiencies.includes(
      attributeScoreEntry.attributeKey,
    );
    const base = ruleSystem.savingThrowBonus({
      attributeScore: attributeScoreEntry.score,
      proficient,
      level: ctx.aggregate.character.level,
    });
    savingThrows[attributeScoreEntry.attributeKey] = computeDerivedValue(
      base,
      "base",
      savingThrowTarget(attributeScoreEntry.attributeKey),
      modifiers,
    );
  }

  return {
    armorClass,
    hitPoints: {
      current: ctx.aggregate.character.hitPoints.current,
      max: hitPointsMax,
      temporary: ctx.aggregate.character.hitPoints.temporary,
    },
    initiative,
    savingThrows,
    resistances: ctx.aggregate.character.resistances,
    immunities: ctx.aggregate.character.immunities,
    vulnerabilities: ctx.aggregate.character.vulnerabilities,
    conditions: ctx.aggregate.conditions,
  };
}

/** Bono de cada competencia (sección 4), con desglose de dónde sale (sección 10). */
export function skillBonuses(ctx: CharacterEngineContext): Record<string, DerivedValue> {
  const ruleSystem = getRuleSystem(ctx.aggregate.character.ruleSystemKey);
  const modifiers = activeModifiers(ctx);
  const result: Record<string, DerivedValue> = {};

  for (const skill of ctx.aggregate.skills) {
    const base = ruleSystem.skillBonus({
      attributeScore: attributeScore(ctx, skill.attributeKey),
      proficiency: skill.proficiency,
      level: ctx.aggregate.character.level,
      flatBonus: skill.flatBonus,
    });
    result[skill.skillKey] = computeDerivedValue(base, "base", skillTarget(skill.skillKey), modifiers);
  }

  return result;
}

/**
 * Acciones disponibles: siempre incluye las base (correr, esquivar, terminar
 * turno) más las que generan objetos equipados, rasgos y hechizos preparados
 * (sección 13, criterio de terminado: un personaje recién creado debe poder
 * entrar en batalla sin configuración adicional).
 */
export function availableActions(ctx: CharacterEngineContext): ActionTemplate[] {
  const templates: ActionTemplate[] = [...BASE_ACTION_TEMPLATES];

  for (const inventoryItem of ctx.aggregate.inventoryItems) {
    if (inventoryItem.state !== "equipped") continue;
    const item = resolveItem(ctx, inventoryItem.itemId);
    if (!item) continue;
    templates.push(...item.grantedActions);
  }

  for (const characterFeature of ctx.aggregate.features) {
    const feature = ctx.content.features.get(characterFeature.featureId);
    if (!feature) continue;
    templates.push(...feature.grantedActions);
  }

  for (const characterSpell of ctx.aggregate.spells) {
    if (!characterSpell.prepared) continue;
    const spell = ctx.content.spells.get(characterSpell.spellId);
    if (!spell) continue;
    templates.push(spell.grantedAction);
  }

  return templates;
}

export interface TargetCandidate {
  id: Id;
  kind: Exclude<ActionTargetKind, "any">;
  position: GridCell | null;
}

/**
 * Filtra candidatos por lo que la acción puede alcanzar (tipo de objetivo y
 * rango). No decide línea de visión ni ocupación de casillas: eso vive en el
 * motor de combate, que combina esto con el estado del tablero.
 */
export function availableTargets(
  ctx: CharacterEngineContext,
  actionKey: string,
  candidates: TargetCandidate[],
  actorPosition: GridCell | null = null,
): Id[] {
  const action = availableActions(ctx).find((template) => template.key === actionKey);
  if (!action) {
    return [];
  }

  return candidates
    .filter(
      (candidate) =>
        action.targeting.kinds.includes("any") || action.targeting.kinds.includes(candidate.kind),
    )
    .filter((candidate) => {
      if (action.range.distance === null || !actorPosition || !candidate.position) {
        return true;
      }
      return gridDistance(actorPosition, candidate.position) <= action.range.distance;
    })
    .map((candidate) => candidate.id);
}
