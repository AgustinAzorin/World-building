import {
  availableActions,
  availableMovement,
  createCharacter,
  defenses,
  loadCharacterAggregate,
  type CharacterEngineContext,
} from "@world-building/character";
import { createCampaign } from "@world-building/campaign";
import {
  DEFAULT_COMBAT_RULES,
  createBattle,
  endTurn,
  executeAction,
  rollInitiative,
  startBattle,
} from "@world-building/combat";
import { createContentRegistries } from "@world-building/content";
import type { Action, BattleState } from "@world-building/domain";
import {
  InMemoryBattleRepository,
  InMemoryBattleStateRepository,
  InMemoryCampaignRepository,
  createInMemoryCharacterRepositories,
} from "@world-building/persistence";
import { createId, type Result } from "@world-building/shared";

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
 * personajes) y puede introducirse directamente en una batalla. Recorre el
 * criterio de terminado (sección 20): mapa, participantes, iniciativa,
 * acciones legales, movimiento, ataque, resolución, efectos y fin de turno.
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

  const aria = unwrap(
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

  const goblin = unwrap(
    await createCharacter(characterRepos, {
      campaignId: campaign.id,
      name: "Goblin",
      baseSpeed: 30,
      hitPoints: { max: 12 },
      attributeScores: {
        strength: 8,
        dexterity: 14,
        constitution: 10,
        intelligence: 8,
        wisdom: 8,
        charisma: 8,
      },
    }),
  );

  async function combatantFor(characterId: string, position: { x: number; y: number }) {
    const aggregate = unwrap(await loadCharacterAggregate(characterRepos, characterId));
    const ctx: CharacterEngineContext = { aggregate, content };
    const characterDefenses = defenses(ctx);
    const movement = availableMovement(ctx);
    return {
      combatant: {
        id: aggregate.character.id,
        characterId: aggregate.character.id,
        name: aggregate.character.name,
        hitPoints: { current: characterDefenses.hitPoints.current, max: characterDefenses.hitPoints.max.total },
        armorClass: characterDefenses.armorClass.total,
        speed: movement.total,
        position,
        actionsRemaining: 1,
        movementRemaining: movement.total,
        resources: {},
        resistances: characterDefenses.resistances,
        immunities: characterDefenses.immunities,
        vulnerabilities: characterDefenses.vulnerabilities,
      },
      initiativeBonus: characterDefenses.initiative.total,
      actions: availableActions(ctx),
    };
  }

  const ariaCombatant = await combatantFor(aria.id, { x: 0, y: 0 });
  const goblinCombatant = await combatantFor(goblin.id, { x: 2, y: 3 });

  console.log(
    `${aria.name} — CA ${ariaCombatant.combatant.armorClass}, acciones disponibles: ${ariaCombatant.actions.map((a) => a.name).join(", ")}`,
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
    activeParticipantId: ariaCombatant.combatant.id,
    participants: [ariaCombatant.combatant, goblinCombatant.combatant],
    map: { mapId: "map-1", width: 10, height: 10, tiles: {} },
    conditions: [],
    effects: [],
    log: [],
  };

  await startBattle(battleRepo, battleStateRepo, battle.id, initialState);

  await rollInitiative(battleStateRepo, battle.id, [
    { participantId: ariaCombatant.combatant.id, bonus: ariaCombatant.initiativeBonus },
    { participantId: goblinCombatant.combatant.id, bonus: goblinCombatant.initiativeBonus },
  ]);

  const stateAfterInitiative = await battleStateRepo.findByBattleId(battle.id);
  if (!stateAfterInitiative) {
    throw new Error("Battle state not found after rolling initiative");
  }
  const firstActorId = stateAfterInitiative.activeParticipantId;

  const moveAction: Action = {
    id: createId(),
    actorId: firstActorId,
    type: "move",
    targetIds: [],
    origin: null,
    destination: { x: 1, y: 1 },
    parameters: {},
  };
  await executeAction(battleStateRepo, DEFAULT_COMBAT_RULES, battle.id, moveAction);

  const attackAction: Action = {
    id: createId(),
    actorId: firstActorId,
    type: "attack",
    targetIds: [firstActorId === ariaCombatant.combatant.id ? goblinCombatant.combatant.id : ariaCombatant.combatant.id],
    origin: null,
    destination: null,
    parameters: { attackBonus: 5, range: 10, damageDice: { count: 1, sides: 8 }, damageBonus: 3, weaponName: "Espada" },
  };
  const outcome = unwrap(await executeAction(battleStateRepo, DEFAULT_COMBAT_RULES, battle.id, attackAction));

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
