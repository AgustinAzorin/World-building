import type {
  Character,
  CharacterAttributeScore,
  CharacterConditionInstance,
  CharacterFaction,
  CharacterFeature,
  CharacterInventoryItem,
  CharacterRelationship,
  CharacterResource,
  CharacterSkill,
  CharacterSpell,
} from "@world-building/domain";
import { DomainError, err, ok, type Id, type Result } from "@world-building/shared";
import type { CharacterRepositories } from "./ports";

/** Todo lo que compone a un personaje, listo para que el motor calcule sobre él. */
export interface CharacterAggregate {
  character: Character;
  attributeScores: CharacterAttributeScore[];
  skills: CharacterSkill[];
  resources: CharacterResource[];
  features: CharacterFeature[];
  spells: CharacterSpell[];
  inventoryItems: CharacterInventoryItem[];
  relationships: CharacterRelationship[];
  factions: CharacterFaction[];
  conditions: CharacterConditionInstance[];
}

export async function loadCharacterAggregate(
  repos: CharacterRepositories,
  characterId: Id,
): Promise<Result<CharacterAggregate>> {
  const character = await repos.characters.findById(characterId);
  if (!character) {
    return err(new DomainError("CHARACTER_NOT_FOUND", `Character ${characterId} not found`));
  }

  const [
    attributeScores,
    skills,
    resources,
    features,
    spells,
    inventoryItems,
    relationships,
    factions,
    conditions,
  ] = await Promise.all([
    repos.attributeScores.listByCharacterId(characterId),
    repos.skills.listByCharacterId(characterId),
    repos.resources.listByCharacterId(characterId),
    repos.features.listByCharacterId(characterId),
    repos.spells.listByCharacterId(characterId),
    repos.inventoryItems.listByCharacterId(characterId),
    repos.relationships.listByCharacterId(characterId),
    repos.factions.listByCharacterId(characterId),
    repos.conditions.listByCharacterId(characterId),
  ]);

  return ok({
    character,
    attributeScores,
    skills,
    resources,
    features,
    spells,
    inventoryItems,
    relationships,
    factions,
    conditions,
  });
}
