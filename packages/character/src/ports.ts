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

export interface CharacterRepository {
  findById(id: Id): Promise<Character | null>;
  save(character: Character): Promise<void>;
}

/** Forma compartida por las colecciones "propiedad" de un personaje (1 tabla por concepto, sección 5 del doc de arquitectura). */
export interface CharacterCollectionRepository<T extends { id: Id; characterId: Id }> {
  listByCharacterId(characterId: Id): Promise<T[]>;
  findById(id: Id): Promise<T | null>;
  save(item: T): Promise<void>;
}

/** Agrupa todos los puertos que necesita el motor y los casos de uso de personaje. */
export interface CharacterRepositories {
  characters: CharacterRepository;
  attributeScores: CharacterCollectionRepository<CharacterAttributeScore>;
  skills: CharacterCollectionRepository<CharacterSkill>;
  resources: CharacterCollectionRepository<CharacterResource>;
  features: CharacterCollectionRepository<CharacterFeature>;
  spells: CharacterCollectionRepository<CharacterSpell>;
  inventoryItems: CharacterCollectionRepository<CharacterInventoryItem>;
  relationships: CharacterCollectionRepository<CharacterRelationship>;
  factions: CharacterCollectionRepository<CharacterFaction>;
  conditions: CharacterCollectionRepository<CharacterConditionInstance>;
}
