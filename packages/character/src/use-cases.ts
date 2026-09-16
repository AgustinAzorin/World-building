import type { Character, CharacterItem } from "@world-building/domain";
import { DomainError, createId, err, ok, type Result } from "@world-building/shared";
import type { CharacterItemRepository, CharacterRepository } from "./ports";

export interface CreateCharacterInput {
  campaignId: string;
  name: string;
  hitPoints: { current: number; max: number };
  armorClass: number;
  speed: number;
}

export async function createCharacter(
  repo: CharacterRepository,
  input: CreateCharacterInput,
): Promise<Result<Character>> {
  const character: Character = {
    id: createId(),
    campaignId: input.campaignId,
    name: input.name,
    portraitAssetId: null,
    hitPoints: input.hitPoints,
    armorClass: input.armorClass,
    speed: input.speed,
  };
  await repo.save(character);
  return ok(character);
}

export interface UpdateCharacterInput {
  id: string;
  patch: Partial<
    Pick<Character, "name" | "hitPoints" | "armorClass" | "speed" | "portraitAssetId">
  >;
}

export async function updateCharacter(
  repo: CharacterRepository,
  input: UpdateCharacterInput,
): Promise<Result<Character>> {
  const existing = await repo.findById(input.id);
  if (!existing) {
    return err(new DomainError("CHARACTER_NOT_FOUND", `Character ${input.id} not found`));
  }
  const updated: Character = { ...existing, ...input.patch };
  await repo.save(updated);
  return ok(updated);
}

export interface EquipItemInput {
  characterItemId: string;
  equipped: boolean;
}

export async function equipItem(
  repo: CharacterItemRepository,
  input: EquipItemInput,
): Promise<Result<CharacterItem>> {
  const existing = await repo.findById(input.characterItemId);
  if (!existing) {
    return err(
      new DomainError(
        "CHARACTER_ITEM_NOT_FOUND",
        `CharacterItem ${input.characterItemId} not found`,
      ),
    );
  }
  const updated: CharacterItem = { ...existing, equipped: input.equipped };
  await repo.save(updated);
  return ok(updated);
}
