import { beforeEach, describe, expect, it } from "vitest";
import { loadCharacterAggregate } from "../aggregate";
import type { CharacterRepositories } from "../ports";
import { createTestCharacterRepositories } from "./test-repositories";
import {
  addCharacterFeature,
  addInventoryItem,
  archiveCharacter,
  changeLevel,
  createCharacter,
  createRelationship,
  duplicateCharacter,
  learnSpell,
  restoreResources,
  setCharacterAsset,
  setInventoryItemState,
  updateCharacter,
} from "../use-cases";

describe("character use cases", () => {
  let repos: CharacterRepositories;

  beforeEach(() => {
    repos = createTestCharacterRepositories();
  });

  async function createAria() {
    const result = await createCharacter(repos, {
      campaignId: "campaign-1",
      name: "Aria",
      baseSpeed: 30,
      hitPoints: { max: 20 },
      attributeScores: { strength: 12, dexterity: 16 },
    });
    if (!result.ok) throw result.error;
    return result.value;
  }

  it("crea un personaje con sus puntuaciones de atributo", async () => {
    const character = await createAria();
    expect(character.level).toBe(1);
    expect(character.hitPoints).toEqual({ current: 20, max: 20, temporary: 0 });

    const scores = await repos.attributeScores.listByCharacterId(character.id);
    expect(scores).toHaveLength(2);
  });

  it("edita campos del personaje con updateCharacter", async () => {
    const character = await createAria();
    const result = await updateCharacter(repos, {
      id: character.id,
      patch: { name: "Aria Nightshade", inspiration: true },
    });
    if (!result.ok) throw result.error;
    expect(result.value.name).toBe("Aria Nightshade");
    expect(result.value.inspiration).toBe(true);
  });

  it("falla al editar un personaje inexistente", async () => {
    const result = await updateCharacter(repos, { id: "does-not-exist", patch: {} });
    expect(result.ok).toBe(false);
  });

  it("duplica un personaje junto con sus colecciones", async () => {
    const character = await createAria();
    const duplicateResult = await duplicateCharacter(repos, character.id);
    if (!duplicateResult.ok) throw duplicateResult.error;

    expect(duplicateResult.value.id).not.toBe(character.id);
    expect(duplicateResult.value.name).toBe("Aria (copia)");

    const scores = await repos.attributeScores.listByCharacterId(duplicateResult.value.id);
    expect(scores).toHaveLength(2);
    expect(scores.every((score) => score.characterId === duplicateResult.value.id)).toBe(true);
  });

  it("sube retrato y asigna modelo 3D (setCharacterAsset)", async () => {
    const character = await createAria();
    const withPortrait = await setCharacterAsset(repos, {
      characterId: character.id,
      representation: "portrait",
      assetId: "asset-portrait-1",
    });
    if (!withPortrait.ok) throw withPortrait.error;
    expect(withPortrait.value.visualAssets.portraitAssetId).toBe("asset-portrait-1");

    const withModel = await setCharacterAsset(repos, {
      characterId: character.id,
      representation: "model3d",
      assetId: "asset-model-1",
    });
    if (!withModel.ok) throw withModel.error;
    expect(withModel.value.visualAssets.model3dAssetId).toBe("asset-model-1");
    expect(withModel.value.visualAssets.portraitAssetId).toBe("asset-portrait-1");
  });

  it("añade y equipa un objeto del inventario", async () => {
    const character = await createAria();
    const itemResult = await addInventoryItem(repos, { characterId: character.id, itemId: "sword-1" });
    if (!itemResult.ok) throw itemResult.error;
    expect(itemResult.value.state).toBe("possessed");

    const equippedResult = await setInventoryItemState(repos, {
      inventoryItemId: itemResult.value.id,
      state: "equipped",
    });
    if (!equippedResult.ok) throw equippedResult.error;
    expect(equippedResult.value.state).toBe("equipped");
  });

  it("aprende un hechizo", async () => {
    const character = await createAria();
    const result = await learnSpell(repos, { characterId: character.id, spellId: "fireball", prepared: true });
    if (!result.ok) throw result.error;
    expect(result.value.prepared).toBe(true);
  });

  it("añade un rasgo/dote al personaje", async () => {
    const character = await createAria();
    const result = await addCharacterFeature(repos, { characterId: character.id, featureId: "alert-feat" });
    if (!result.ok) throw result.error;
    expect(result.value.featureId).toBe("alert-feat");
  });

  it("crea una relación entre dos personajes pero rechaza auto-relaciones", async () => {
    const a = await createAria();
    const relationshipResult = await createRelationship(repos, {
      characterId: a.id,
      relatedCharacterId: "character-b",
      kind: "rival",
      intensity: "high",
      description: "Compiten por el mismo contrato.",
    });
    expect(relationshipResult.ok).toBe(true);

    const selfRelationship = await createRelationship(repos, {
      characterId: a.id,
      relatedCharacterId: a.id,
      kind: "rival",
      intensity: "high",
      description: "",
    });
    expect(selfRelationship.ok).toBe(false);
  });

  it("cambia de nivel y ajusta los puntos de golpe máximos", async () => {
    const character = await createAria();
    const result = await changeLevel(repos, { id: character.id, newLevel: 2, hitPointsMaxDelta: 8 });
    if (!result.ok) throw result.error;
    expect(result.value.level).toBe(2);
    expect(result.value.hitPoints.max).toBe(28);
    expect(result.value.hitPoints.current).toBe(28);
  });

  it("restaura solo los recursos cuya recoveryRule coincide con el disparador", async () => {
    const character = await createAria();
    await repos.resources.save({
      id: "ki",
      characterId: character.id,
      name: "Ki",
      current: 0,
      maximum: 3,
      recoveryRule: "shortRest",
    });
    await repos.resources.save({
      id: "rage",
      characterId: character.id,
      name: "Furia",
      current: 0,
      maximum: 2,
      recoveryRule: "longRest",
    });

    const restored = await restoreResources(repos, { characterId: character.id, trigger: "shortRest" });
    if (!restored.ok) throw restored.error;

    expect(restored.value.map((resource) => resource.id)).toEqual(["ki"]);
    const rage = await repos.resources.findById("rage");
    expect(rage?.current).toBe(0);
  });

  it("archiva un personaje", async () => {
    const character = await createAria();
    const result = await archiveCharacter(repos, character.id);
    if (!result.ok) throw result.error;
    expect(result.value.archived).toBe(true);
  });

  it("loadCharacterAggregate devuelve todas las colecciones del personaje", async () => {
    const character = await createAria();
    await learnSpell(repos, { characterId: character.id, spellId: "fireball" });

    const aggregateResult = await loadCharacterAggregate(repos, character.id);
    if (!aggregateResult.ok) throw aggregateResult.error;

    expect(aggregateResult.value.character.id).toBe(character.id);
    expect(aggregateResult.value.spells).toHaveLength(1);
  });
});
