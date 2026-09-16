import { createContentRegistries, type ContentRegistries } from "@world-building/content";
import type { Character, CharacterAttributeScore, Equipment, FeatureDefinition } from "@world-building/domain";
import { createId } from "@world-building/shared";
import { beforeEach, describe, expect, it } from "vitest";
import type { CharacterAggregate } from "../aggregate";
import {
  activeModifiers,
  availableActions,
  availableMovement,
  availableResources,
  availableTargets,
  defenses,
  type CharacterEngineContext,
} from "../engine";

function baseCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: createId(),
    campaignId: createId(),
    name: "Aria",
    player: null,
    species: null,
    background: null,
    alignment: null,
    level: 1,
    ruleSystemKey: "srd-like-default",
    baseSpeed: 30,
    hitPoints: { current: 20, max: 20, temporary: 0 },
    inspiration: false,
    savingThrowProficiencies: [],
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
    ...overrides,
  };
}

function attributeScore(characterId: string, attributeKey: string, score: number): CharacterAttributeScore {
  return { id: createId(), characterId, attributeKey, score };
}

function emptyAggregate(character: Character): CharacterAggregate {
  return {
    character,
    attributeScores: [],
    skills: [],
    resources: [],
    features: [],
    spells: [],
    inventoryItems: [],
    relationships: [],
    factions: [],
    conditions: [],
  };
}

describe("character engine", () => {
  let content: ContentRegistries;

  beforeEach(() => {
    content = createContentRegistries();
  });

  it("un personaje recién creado sin equipamiento ya tiene acciones base disponibles (criterio de terminado)", () => {
    const character = baseCharacter();
    const ctx: CharacterEngineContext = { aggregate: emptyAggregate(character), content };

    const actions = availableActions(ctx);

    expect(actions.map((action) => action.key)).toEqual(
      expect.arrayContaining(["dash", "dodge", "endTurn"]),
    );
  });

  it("calcula la CA base (10 + modificador de destreza) sin equipamiento", () => {
    const character = baseCharacter();
    const aggregate = emptyAggregate(character);
    aggregate.attributeScores = [attributeScore(character.id, "dexterity", 14)];
    const ctx: CharacterEngineContext = { aggregate, content };

    expect(defenses(ctx).armorClass.total).toBe(12);
  });

  it("suma el modificador de un objeto equipado a la CA, con desglose (sección 10)", () => {
    const character = baseCharacter();
    const aggregate = emptyAggregate(character);
    aggregate.attributeScores = [attributeScore(character.id, "dexterity", 14)];

    const shield: Equipment = {
      id: createId(),
      kind: "shield",
      name: "Escudo",
      description: "Un escudo de madera reforzada",
      weight: 6,
      value: 10,
      slot: "offHand",
      modifiers: [{ target: "armorClass", amount: 2, operation: "add" }],
      grantedActions: [],
    };
    content.equipment.register(shield);
    aggregate.inventoryItems = [
      { id: createId(), characterId: character.id, itemId: shield.id, quantity: 1, state: "equipped" },
    ];

    const ctx: CharacterEngineContext = { aggregate, content };
    const armorClass = defenses(ctx).armorClass;

    expect(armorClass.total).toBe(14);
    expect(armorClass.breakdown).toEqual([
      { source: "base", amount: 12 },
      { source: "Escudo", amount: 2 },
    ]);
  });

  it("un objeto guardado (no equipado) no aporta su modificador", () => {
    const character = baseCharacter();
    const aggregate = emptyAggregate(character);
    aggregate.attributeScores = [attributeScore(character.id, "dexterity", 14)];

    const shield: Equipment = {
      id: createId(),
      kind: "shield",
      name: "Escudo",
      description: "",
      weight: 6,
      value: 10,
      slot: "offHand",
      modifiers: [{ target: "armorClass", amount: 2, operation: "add" }],
      grantedActions: [],
    };
    content.equipment.register(shield);
    aggregate.inventoryItems = [
      { id: createId(), characterId: character.id, itemId: shield.id, quantity: 1, state: "stored" },
    ];

    const ctx: CharacterEngineContext = { aggregate, content };
    expect(defenses(ctx).armorClass.total).toBe(12);
    expect(activeModifiers(ctx)).toHaveLength(0);
  });

  it("un rasgo adquirido genera una acción de combate utilizable", () => {
    const character = baseCharacter();
    const aggregate = emptyAggregate(character);

    const feature: FeatureDefinition = {
      id: createId(),
      kind: "classFeature",
      name: "Ataque furtivo",
      description: "",
      requirements: [],
      requiredLevel: 1,
      modifiers: [],
      grantedActions: [
        {
          key: "sneak-attack",
          name: "Ataque furtivo",
          type: "attack",
          source: "feature",
          sourceId: null,
          range: { kind: "melee", distance: 1 },
          targeting: { minTargets: 1, maxTargets: 1, kinds: ["enemy"] },
          resourceCost: null,
          description: "",
        },
      ],
      resourceCost: null,
    };
    content.features.register(feature);
    aggregate.features = [{ id: createId(), characterId: character.id, featureId: feature.id, acquiredAtLevel: 1 }];

    const ctx: CharacterEngineContext = { aggregate, content };
    const actions = availableActions(ctx);

    expect(actions.some((action) => action.key === "sneak-attack")).toBe(true);
  });

  it("availableTargets filtra por tipo de objetivo y rango", () => {
    const character = baseCharacter();
    const aggregate = emptyAggregate(character);
    const ctx: CharacterEngineContext = { aggregate, content };

    const enemyId = createId();
    const allyId = createId();
    const farEnemyId = createId();

    const targets = availableTargets(
      ctx,
      "dodge",
      [
        { id: enemyId, kind: "enemy", position: { x: 1, y: 0 } },
        { id: allyId, kind: "ally", position: { x: 0, y: 1 } },
        { id: farEnemyId, kind: "enemy", position: { x: 50, y: 50 } },
      ],
      { x: 0, y: 0 },
    );

    // "dodge" no apunta a nadie (targeting vacío en BASE_ACTION_TEMPLATES)
    expect(targets).toEqual([]);
  });

  it("availableResources y availableMovement exponen lo que espera el motor de combate", () => {
    const character = baseCharacter({ baseSpeed: 30 });
    const aggregate = emptyAggregate(character);
    aggregate.resources = [
      { id: createId(), characterId: character.id, name: "Ki", current: 3, maximum: 3, recoveryRule: "shortRest" },
    ];
    const ctx: CharacterEngineContext = { aggregate, content };

    expect(availableResources(ctx)).toHaveLength(1);
    expect(availableMovement(ctx).total).toBe(30);
  });
});
