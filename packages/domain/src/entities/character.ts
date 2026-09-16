import type { Id } from "@world-building/shared";
import type { ProficiencyLevel } from "../character/rule-system";
import type { ConditionKey } from "./combat";

export interface CharacterClass {
  id: Id;
  characterId: Id;
  classKey: string;
  level: number;
}

/**
 * Los seis atributos son configurables (sección 2): se guardan como
 * puntuaciones sueltas por clave en lugar de campos fijos Fuerza/Destreza/...
 */
export interface CharacterAttributeScore {
  id: Id;
  characterId: Id;
  attributeKey: string;
  score: number;
}

export interface CharacterSkill {
  id: Id;
  characterId: Id;
  skillKey: string;
  attributeKey: string;
  proficiency: ProficiencyLevel;
  flatBonus: number;
}

export interface CharacterFeature {
  id: Id;
  characterId: Id;
  featureId: Id;
  acquiredAtLevel: number | null;
}

export interface CharacterSpell {
  id: Id;
  characterId: Id;
  spellId: Id;
  prepared: boolean;
}

/** Sección 9: poseído, equipado, almacenado, consumible o perdido. */
export type InventoryState = "possessed" | "equipped" | "stored" | "consumable" | "lost";

export interface CharacterInventoryItem {
  id: Id;
  characterId: Id;
  itemId: Id;
  quantity: number;
  state: InventoryState;
}

export type RelationshipKind = "ally" | "rival" | "family" | "mentor" | "romantic" | "other";

export type RelationshipIntensity = "low" | "medium" | "high";

export interface CharacterRelationship {
  id: Id;
  characterId: Id;
  relatedCharacterId: Id;
  kind: RelationshipKind;
  intensity: RelationshipIntensity;
  description: string;
}

export interface CharacterFaction {
  id: Id;
  characterId: Id;
  factionName: string;
  standing: number;
}

export type ResourceRecoveryRule =
  | "shortRest"
  | "longRest"
  | "turn"
  | "round"
  | "dawn"
  | "manual";

/** Forma común pedida en sección 6: name, current, maximum, recoveryRule. */
export interface CharacterResource {
  id: Id;
  characterId: Id;
  name: string;
  current: number;
  maximum: number;
  recoveryRule: ResourceRecoveryRule;
}

export interface CharacterConditionInstance {
  id: Id;
  characterId: Id;
  conditionKey: ConditionKey;
  remainingRounds: number | null;
}

export interface CharacterNarrative {
  personality: string;
  ideals: string;
  bonds: string;
  flaws: string;
  history: string;
  dmNotes: string;
}

export type CharacterVisualRepresentation = "portrait" | "image" | "token" | "model3d";

export interface CharacterVisualAssets {
  portraitAssetId: Id | null;
  imageAssetId: Id | null;
  tokenAssetId: Id | null;
  model3dAssetId: Id | null;
  preferredRepresentation: CharacterVisualRepresentation;
}

/**
 * Raíz del agregado. Los valores derivados (CA, bonos de habilidad,
 * salvaciones...) no se guardan aquí: los calcula el motor de personajes a
 * partir de esto + equipamiento + rasgos + condiciones (sección 10).
 */
export interface Character {
  id: Id;
  campaignId: Id;
  name: string;
  player: string | null;
  species: string | null;
  background: string | null;
  alignment: string | null;
  level: number;
  ruleSystemKey: string;
  baseSpeed: number;
  hitPoints: { current: number; max: number; temporary: number };
  inspiration: boolean;
  savingThrowProficiencies: string[];
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  narrative: CharacterNarrative;
  visualAssets: CharacterVisualAssets;
  archived: boolean;
}
