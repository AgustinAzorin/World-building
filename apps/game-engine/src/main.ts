import { createCampaign } from "@world-building/campaign";
import { createCharacter } from "@world-building/character";
import { createBattle, endTurn, executeAction, startBattle } from "@world-building/combat";
import type { Action, BattleState } from "@world-building/domain";
import {
  InMemoryBattleRepository,
  InMemoryBattleStateRepository,
  InMemoryCampaignRepository,
  InMemoryCharacterRepository,
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
 * GameState + Action -> Result + NewGameState, wireado con casos de uso
 * y repositorios en memoria.
 */
async function main() {
  const campaignRepo = new InMemoryCampaignRepository();
  const characterRepo = new InMemoryCharacterRepository();
  const battleRepo = new InMemoryBattleRepository();
  const battleStateRepo = new InMemoryBattleStateRepository();

  const campaign = unwrap(
    await createCampaign(campaignRepo, {
      name: "Campaña de prueba",
      description: "Escenario mínimo para validar el motor determinista",
      ownerId: "dm-1",
    }),
  );

  const character = unwrap(
    await createCharacter(characterRepo, {
      campaignId: campaign.id,
      name: "Aria",
      hitPoints: { current: 20, max: 20 },
      armorClass: 15,
      speed: 30,
    }),
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
        hitPoints: character.hitPoints,
        armorClass: character.armorClass,
        speed: character.speed,
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
