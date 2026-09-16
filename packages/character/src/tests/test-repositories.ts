import type { Character } from "@world-building/domain";
import type { Id } from "@world-building/shared";
import type { CharacterCollectionRepository, CharacterRepositories, CharacterRepository } from "../ports";

/**
 * Fakes en memoria solo para tests de este paquete. No se usa
 * @world-building/persistence aquí porque persistence depende de character:
 * importarlo desde un test de character crearía un ciclo de paquetes.
 */
function createCollectionRepository<
  T extends { id: Id; characterId: Id },
>(): CharacterCollectionRepository<T> {
  const items = new Map<Id, T>();
  return {
    async listByCharacterId(characterId) {
      return Array.from(items.values()).filter((item) => item.characterId === characterId);
    },
    async findById(id) {
      return items.get(id) ?? null;
    },
    async save(item) {
      items.set(item.id, item);
    },
  };
}

export function createTestCharacterRepositories(): CharacterRepositories {
  const characters = new Map<Id, Character>();
  const characterRepository: CharacterRepository = {
    async findById(id) {
      return characters.get(id) ?? null;
    },
    async save(character) {
      characters.set(character.id, character);
    },
  };

  return {
    characters: characterRepository,
    attributeScores: createCollectionRepository(),
    skills: createCollectionRepository(),
    resources: createCollectionRepository(),
    features: createCollectionRepository(),
    spells: createCollectionRepository(),
    inventoryItems: createCollectionRepository(),
    relationships: createCollectionRepository(),
    factions: createCollectionRepository(),
    conditions: createCollectionRepository(),
  };
}
