import type { Character, CharacterItem } from "@world-building/domain";
import type { Id } from "@world-building/shared";

export interface CharacterRepository {
  findById(id: Id): Promise<Character | null>;
  save(character: Character): Promise<void>;
}

export interface CharacterItemRepository {
  findById(id: Id): Promise<CharacterItem | null>;
  save(item: CharacterItem): Promise<void>;
}
