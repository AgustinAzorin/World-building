import type { Id } from "@world-building/shared";

export interface CharacterClass {
  id: Id;
  characterId: Id;
  classKey: string;
  level: number;
}

export interface CharacterAbility {
  id: Id;
  characterId: Id;
  abilityId: Id;
  score: number;
}

export interface CharacterSpell {
  id: Id;
  characterId: Id;
  spellId: Id;
  prepared: boolean;
}

export interface CharacterFeat {
  id: Id;
  characterId: Id;
  featId: Id;
}

export interface CharacterTrait {
  id: Id;
  characterId: Id;
  name: string;
  description: string;
}

export interface CharacterItem {
  id: Id;
  characterId: Id;
  itemId: Id;
  quantity: number;
  equipped: boolean;
}

export type RelationshipKind =
  | "ally"
  | "rival"
  | "family"
  | "mentor"
  | "romantic"
  | "other";

export interface CharacterRelationship {
  id: Id;
  characterId: Id;
  relatedCharacterId: Id;
  kind: RelationshipKind;
  description: string;
}

export interface CharacterFaction {
  id: Id;
  characterId: Id;
  factionName: string;
  standing: number;
}

export interface Character {
  id: Id;
  campaignId: Id;
  name: string;
  portraitAssetId: Id | null;
  hitPoints: { current: number; max: number };
  armorClass: number;
  speed: number;
}
