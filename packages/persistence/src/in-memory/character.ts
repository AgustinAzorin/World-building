import type { Character, CharacterItem } from "@world-building/domain";
import { InMemoryStore } from "./in-memory-store";

export class InMemoryCharacterRepository extends InMemoryStore<Character> {}
export class InMemoryCharacterItemRepository extends InMemoryStore<CharacterItem> {}
