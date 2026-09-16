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
import type { Id } from "@world-building/shared";
import { InMemoryStore } from "./in-memory-store";

export class InMemoryCharacterRepository extends InMemoryStore<Character> {}

/** Base para las colecciones "propiedad" de un personaje: listar filtrando por characterId. */
class InMemoryCharacterCollectionStore<
  T extends { id: Id; characterId: Id },
> extends InMemoryStore<T> {
  async listByCharacterId(characterId: Id): Promise<T[]> {
    const all = await this.list();
    return all.filter((item) => item.characterId === characterId);
  }
}

export class InMemoryCharacterAttributeScoreRepository extends InMemoryCharacterCollectionStore<CharacterAttributeScore> {}
export class InMemoryCharacterSkillRepository extends InMemoryCharacterCollectionStore<CharacterSkill> {}
export class InMemoryCharacterResourceRepository extends InMemoryCharacterCollectionStore<CharacterResource> {}
export class InMemoryCharacterFeatureRepository extends InMemoryCharacterCollectionStore<CharacterFeature> {}
export class InMemoryCharacterSpellRepository extends InMemoryCharacterCollectionStore<CharacterSpell> {}
export class InMemoryCharacterInventoryItemRepository extends InMemoryCharacterCollectionStore<CharacterInventoryItem> {}
export class InMemoryCharacterRelationshipRepository extends InMemoryCharacterCollectionStore<CharacterRelationship> {}
export class InMemoryCharacterFactionRepository extends InMemoryCharacterCollectionStore<CharacterFaction> {}
export class InMemoryCharacterConditionRepository extends InMemoryCharacterCollectionStore<CharacterConditionInstance> {}

export function createInMemoryCharacterRepositories() {
  return {
    characters: new InMemoryCharacterRepository(),
    attributeScores: new InMemoryCharacterAttributeScoreRepository(),
    skills: new InMemoryCharacterSkillRepository(),
    resources: new InMemoryCharacterResourceRepository(),
    features: new InMemoryCharacterFeatureRepository(),
    spells: new InMemoryCharacterSpellRepository(),
    inventoryItems: new InMemoryCharacterInventoryItemRepository(),
    relationships: new InMemoryCharacterRelationshipRepository(),
    factions: new InMemoryCharacterFactionRepository(),
    conditions: new InMemoryCharacterConditionRepository(),
  };
}
