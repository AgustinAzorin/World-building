import {
  availableActions,
  availableMovement,
  createCharacter,
  defenses,
  loadCharacterAggregate,
  type CharacterEngineContext,
} from "@world-building/character";
import { createCampaign } from "@world-building/campaign";
import { createBattle, endTurn, executeAction, startBattle } from "@world-building/combat";
import { createContentRegistries } from "@world-building/content";
import type { Action, BattleState } from "@world-building/domain";
import {
  InMemoryBattleRepository,
  InMemoryBattleStateRepository,
  InMemoryCampaignRepository,
  createInMemoryCharacterRepositories,
} from "@world-building/persistence";
import { createId, type Result } from "@world-building/shared";
import { moveRule } from "./rules/move-rule";

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
}

/**
 * Demuestra que el motor de dominio corre sin navegador (sección 15):
 * un personaje recién creado, sin configuración adicional, expone al motor
 * de combate sus defensas y acciones disponibles (sección 13 del sistema de
 * personajes) y puede introducirse directamente en una batalla.
 */
async function main() {
  const campaignRepo = new InMemoryCampaignRepository();
  const characterRepos = createInMemoryCharacterRepositories();
  const battleRepo = new InMemoryBattleRepository();
  const battleStateRepo = new InMemoryBattleStateRepository();
  const content = createContentRegistries();

  const campaign = unwrap(
    await createCampaign(campaignRepo, {
      name: "Campaña de prueba",
      description: "Escenario mínimo para validar el motor determinista",
      ownerId: "dm-1",
    }),
  );

  const character = unwrap(
    await createCharacter(characterRepos, {
      campaignId: campaign.id,
      name: "Aria",
      baseSpeed: 30,
      hitPoints: { max: 20 },
      attributeScores: {
        strength: 12,
        dexterity: 16,
        constitution: 14,
        intelligence: 10,
        wisdom: 12,
        charisma: 8,
      },
    }),
  );

  const aggregate = unwrap(await loadCharacterAggregate(characterRepos, character.id));
  const engineContext: CharacterEngineContext = { aggregate, content };
  const characterDefenses = defenses(engineContext);
  const movement = availableMovement(engineContext);

  console.log(
    `${character.name} — CA ${characterDefenses.armorClass.total} (${characterDefenses.armorClass.breakdown
      .map((entry) => `${entry.source}: ${entry.amount}`)
      .join(", ")}), acciones disponibles: ${availableActions(engineContext)
      .map((action) => action.name)
      .join(", ")}`,
  );

  const battle = unwrap(
    await createBattle(battleRepo, {
      campaignId: campaign.id,
      name: "Emboscada en el puente",
      mapId: "map-1",
    }),
  );

  const initialState: BattleState = {
    battleId: battle.id,
    round: 1,
    activeParticipantId: character.id,
    participants: [
      {
        id: character.id,
        characterId: character.id,
        name: character.name,
        hitPoints: {
          current: characterDefenses.hitPoints.current,
          max: characterDefenses.hitPoints.max.total,
        },
        armorClass: characterDefenses.armorClass.total,
        speed: movement.total,
        position: { x: 0, y: 0 },
        actionsRemaining: 1,
        resources: {},
      },
    ],
    map: { mapId: "map-1", width: 10, height: 10, occupied: {} },
    conditions: [],
    log: [],
  };

  await startBattle(battleRepo, battleStateRepo, battle.id, initialState);

  const moveAction: Action = {
    id: createId(),
    actorId: character.id,
    type: "move",
    targetIds: [],
    origin: { x: 0, y: 0 },
    destination: { x: 2, y: 3 },
    parameters: {},
  };

  const outcome = unwrap(
    await executeAction(battleStateRepo, [moveRule], battle.id, moveAction),
  );

  const afterEndTurn = unwrap(await endTurn(battleStateRepo, battle.id));

  console.log(`Ronda ${afterEndTurn.round}, log:`);
  for (const entry of outcome.state.log) {
    console.log(`- ${entry.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
