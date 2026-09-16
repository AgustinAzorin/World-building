import {
  defaultRuleSystem,
  type Character,
  type CharacterFeature,
  type CharacterInventoryItem,
  type CharacterRelationship,
  type CharacterResource,
  type CharacterSpell,
  type CharacterVisualRepresentation,
  type InventoryState,
  type RelationshipIntensity,
  type RelationshipKind,
  type ResourceRecoveryRule,
} from "@world-building/domain";
import { DomainError, createId, err, ok, type Id, type Result } from "@world-building/shared";
import { loadCharacterAggregate, type CharacterAggregate } from "./aggregate";
import type { CharacterCollectionRepository, CharacterRepositories } from "./ports";

function notFound(entity: string, id: Id): DomainError {
  return new DomainError(`${entity.toUpperCase()}_NOT_FOUND`, `${entity} ${id} not found`);
}

export interface CreateCharacterInput {
  campaignId: Id;
  name: string;
  player?: string | null;
  species?: string | null;
  background?: string | null;
  alignment?: string | null;
  ruleSystemKey?: string;
  baseSpeed: number;
  hitPoints: { max: number; current?: number; temporary?: number };
  attributeScores: Record<string, number>;
  savingThrowProficiencies?: string[];
}

/**
 * Crea un personaje mínimo pero jugable: sin equipamiento ni rasgos, el
 * motor ya puede calcular defensas y devolver las acciones base (sección 15,
 * criterio de terminado).
 */
export async function createCharacter(
  repos: CharacterRepositories,
  input: CreateCharacterInput,
): Promise<Result<Character>> {
  const character: Character = {
    id: createId(),
    campaignId: input.campaignId,
    name: input.name,
    player: input.player ?? null,
    species: input.species ?? null,
    background: input.background ?? null,
    alignment: input.alignment ?? null,
    level: 1,
    ruleSystemKey: input.ruleSystemKey ?? defaultRuleSystem.key,
    baseSpeed: input.baseSpeed,
    hitPoints: {
      current: input.hitPoints.current ?? input.hitPoints.max,
      max: input.hitPoints.max,
      temporary: input.hitPoints.temporary ?? 0,
    },
    inspiration: false,
    savingThrowProficiencies: input.savingThrowProficiencies ?? [],
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    narrative: { personality: "", ideals: "", bonds: "", flaws: "", history: "", dmNotes: "" },
    visualAssets: {
      portraitAssetId: null,
      imageAssetId: null,
      tokenAssetId: null,
      model3dAssetId: null,
      preferredRepresentation: "portrait",
    },
    archived: false,
  };
  await repos.characters.save(character);

  for (const [attributeKey, score] of Object.entries(input.attributeScores)) {
    await repos.attributeScores.save({ id: createId(), characterId: character.id, attributeKey, score });
  }

  return ok(character);
}

async function cloneCollection<T extends { id: Id; characterId: Id }>(
  items: T[],
  repo: CharacterCollectionRepository<T>,
  newCharacterId: Id,
): Promise<void> {
  for (const item of items) {
    await repo.save({ ...item, id: createId(), characterId: newCharacterId });
  }
}

export async function duplicateCharacter(
  repos: CharacterRepositories,
  characterId: Id,
  overrides: Partial<Pick<Character, "name" | "campaignId">> = {},
): Promise<Result<Character>> {
  const aggregateResult = await loadCharacterAggregate(repos, characterId);
  if (!aggregateResult.ok) {
    return aggregateResult;
  }
  const source = aggregateResult.value;

  const duplicated: Character = {
    ...source.character,
    id: createId(),
    name: overrides.name ?? `${source.character.name} (copia)`,
    campaignId: overrides.campaignId ?? source.character.campaignId,
  };
  await repos.characters.save(duplicated);

  await cloneCollection(source.attributeScores, repos.attributeScores, duplicated.id);
  await cloneCollection(source.skills, repos.skills, duplicated.id);
  await cloneCollection(source.resources, repos.resources, duplicated.id);
  await cloneCollection(source.features, repos.features, duplicated.id);
  await cloneCollection(source.spells, repos.spells, duplicated.id);
  await cloneCollection(source.inventoryItems, repos.inventoryItems, duplicated.id);
  await cloneCollection(source.factions, repos.factions, duplicated.id);
  // Las relaciones apuntan a otros personajes concretos: no tiene sentido duplicarlas 1:1.

  return ok(duplicated);
}

export type CharacterPatch = Partial<Omit<Character, "id" | "campaignId" | "archived">>;

export async function updateCharacter(
  repos: CharacterRepositories,
  input: { id: Id; patch: CharacterPatch },
): Promise<Result<Character>> {
  const existing = await repos.characters.findById(input.id);
  if (!existing) {
    return err(notFound("character", input.id));
  }
  const updated: Character = { ...existing, ...input.patch };
  await repos.characters.save(updated);
  return ok(updated);
}

export interface SetCharacterAssetInput {
  characterId: Id;
  representation: CharacterVisualRepresentation;
  assetId: Id | null;
}

/** Cubre "Subir retrato" y "Asignar modelo 3D" (y las otras representaciones visuales). */
export async function setCharacterAsset(
  repos: CharacterRepositories,
  input: SetCharacterAssetInput,
): Promise<Result<Character>> {
  const existing = await repos.characters.findById(input.characterId);
  if (!existing) {
    return err(notFound("character", input.characterId));
  }
  const assetField = `${input.representation}AssetId` as const;
  const updated: Character = {
    ...existing,
    visualAssets: { ...existing.visualAssets, [assetField]: input.assetId },
  };
  await repos.characters.save(updated);
  return ok(updated);
}

export async function setPreferredRepresentation(
  repos: CharacterRepositories,
  input: { characterId: Id; representation: CharacterVisualRepresentation },
): Promise<Result<Character>> {
  const existing = await repos.characters.findById(input.characterId);
  if (!existing) {
    return err(notFound("character", input.characterId));
  }
  const updated: Character = {
    ...existing,
    visualAssets: { ...existing.visualAssets, preferredRepresentation: input.representation },
  };
  await repos.characters.save(updated);
  return ok(updated);
}

export async function addInventoryItem(
  repos: CharacterRepositories,
  input: { characterId: Id; itemId: Id; quantity?: number; state?: InventoryState },
): Promise<Result<CharacterInventoryItem>> {
  const item: CharacterInventoryItem = {
    id: createId(),
    characterId: input.characterId,
    itemId: input.itemId,
    quantity: input.quantity ?? 1,
    state: input.state ?? "possessed",
  };
  await repos.inventoryItems.save(item);
  return ok(item);
}

/** Cubre "Equipar objeto" (y guardarlo, marcarlo perdido, etc. con otros estados). */
export async function setInventoryItemState(
  repos: CharacterRepositories,
  input: { inventoryItemId: Id; state: InventoryState },
): Promise<Result<CharacterInventoryItem>> {
  const existing = await repos.inventoryItems.findById(input.inventoryItemId);
  if (!existing) {
    return err(notFound("inventoryItem", input.inventoryItemId));
  }
  const updated: CharacterInventoryItem = { ...existing, state: input.state };
  await repos.inventoryItems.save(updated);
  return ok(updated);
}

export async function learnSpell(
  repos: CharacterRepositories,
  input: { characterId: Id; spellId: Id; prepared?: boolean },
): Promise<Result<CharacterSpell>> {
  const spell: CharacterSpell = {
    id: createId(),
    characterId: input.characterId,
    spellId: input.spellId,
    prepared: input.prepared ?? false,
  };
  await repos.spells.save(spell);
  return ok(spell);
}

/** Cubre "Añadir dote" y, en general, cualquier FeatureKind (rasgo, clase, especie...). */
export async function addCharacterFeature(
  repos: CharacterRepositories,
  input: { characterId: Id; featureId: Id; acquiredAtLevel?: number | null },
): Promise<Result<CharacterFeature>> {
  const feature: CharacterFeature = {
    id: createId(),
    characterId: input.characterId,
    featureId: input.featureId,
    acquiredAtLevel: input.acquiredAtLevel ?? null,
  };
  await repos.features.save(feature);
  return ok(feature);
}

export interface CreateRelationshipInput {
  characterId: Id;
  relatedCharacterId: Id;
  kind: RelationshipKind;
  intensity: RelationshipIntensity;
  description: string;
}

export async function createRelationship(
  repos: CharacterRepositories,
  input: CreateRelationshipInput,
): Promise<Result<CharacterRelationship>> {
  if (input.characterId === input.relatedCharacterId) {
    return err(
      new DomainError("INVALID_RELATIONSHIP", "A character cannot have a relationship with itself"),
    );
  }
  const relationship: CharacterRelationship = {
    id: createId(),
    characterId: input.characterId,
    relatedCharacterId: input.relatedCharacterId,
    kind: input.kind,
    intensity: input.intensity,
    description: input.description,
  };
  await repos.relationships.save(relationship);
  return ok(relationship);
}

export interface ChangeLevelInput {
  id: Id;
  newLevel: number;
  hitPointsMaxDelta?: number;
}

export async function changeLevel(
  repos: CharacterRepositories,
  input: ChangeLevelInput,
): Promise<Result<Character>> {
  const existing = await repos.characters.findById(input.id);
  if (!existing) {
    return err(notFound("character", input.id));
  }
  if (input.newLevel < 1) {
    return err(new DomainError("INVALID_LEVEL", "Level must be at least 1"));
  }
  const hitPointsDelta = input.hitPointsMaxDelta ?? 0;
  const updated: Character = {
    ...existing,
    level: input.newLevel,
    hitPoints: {
      ...existing.hitPoints,
      max: existing.hitPoints.max + hitPointsDelta,
      current: existing.hitPoints.current + hitPointsDelta,
    },
  };
  await repos.characters.save(updated);
  return ok(updated);
}

/** Restaura los recursos cuya recoveryRule coincide con el disparador (descanso corto/largo/turno...). */
export async function restoreResources(
  repos: CharacterRepositories,
  input: { characterId: Id; trigger: ResourceRecoveryRule },
): Promise<Result<CharacterResource[]>> {
  const resources = await repos.resources.listByCharacterId(input.characterId);
  const restored: CharacterResource[] = [];
  for (const resource of resources) {
    if (resource.recoveryRule !== input.trigger) continue;
    const updated: CharacterResource = { ...resource, current: resource.maximum };
    await repos.resources.save(updated);
    restored.push(updated);
  }

  if (input.trigger === "longRest") {
    const character = await repos.characters.findById(input.characterId);
    if (character) {
      await repos.characters.save({
        ...character,
        hitPoints: { ...character.hitPoints, current: character.hitPoints.max },
      });
    }
  }

  return ok(restored);
}

export async function exportCharacter(
  repos: CharacterRepositories,
  characterId: Id,
): Promise<Result<CharacterAggregate>> {
  return loadCharacterAggregate(repos, characterId);
}

export async function archiveCharacter(
  repos: CharacterRepositories,
  characterId: Id,
): Promise<Result<Character>> {
  const existing = await repos.characters.findById(characterId);
  if (!existing) {
    return err(notFound("character", characterId));
  }
  const updated: Character = { ...existing, archived: true };
  await repos.characters.save(updated);
  return ok(updated);
}
