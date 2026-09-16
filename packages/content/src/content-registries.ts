import type { Ability, Equipment, Feat, Item, Spell } from "@world-building/domain";
import { createContentRegistry, type ContentRegistry } from "./registry";

export interface ContentRegistries {
  abilities: ContentRegistry<Ability>;
  spells: ContentRegistry<Spell>;
  feats: ContentRegistry<Feat>;
  items: ContentRegistry<Item>;
  equipment: ContentRegistry<Equipment>;
}

export function createContentRegistries(): ContentRegistries {
  return {
    abilities: createContentRegistry<Ability>(),
    spells: createContentRegistry<Spell>(),
    feats: createContentRegistry<Feat>(),
    items: createContentRegistry<Item>(),
    equipment: createContentRegistry<Equipment>(),
  };
}
