import type {
  AttributeDefinition,
  Equipment,
  FeatureDefinition,
  Item,
  SkillDefinition,
  Spell,
} from "@world-building/domain";
import { createContentRegistry, type ContentRegistry } from "./registry";

export interface ContentRegistries {
  attributes: ContentRegistry<AttributeDefinition>;
  skills: ContentRegistry<SkillDefinition>;
  features: ContentRegistry<FeatureDefinition>;
  spells: ContentRegistry<Spell>;
  items: ContentRegistry<Item>;
  equipment: ContentRegistry<Equipment>;
}

export function createContentRegistries(): ContentRegistries {
  return {
    attributes: createContentRegistry<AttributeDefinition>(),
    skills: createContentRegistry<SkillDefinition>(),
    features: createContentRegistry<FeatureDefinition>(),
    spells: createContentRegistry<Spell>(),
    items: createContentRegistry<Item>(),
    equipment: createContentRegistry<Equipment>(),
  };
}
