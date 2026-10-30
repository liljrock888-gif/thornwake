# Story refresh verification
Original prompt: 2D Graal-inspired pixel art across Story, larger maps and lawns, spaced buildings, roads, regional styles, levels/world map, improved combat/customization, ability/button/layout rework, original Pokémon-inspired music.

- Existing flow inventory: see FLOWS.md. Preserve title, Arena, help, store, both character slots, save/continue, quests, housing, mounts, classes, online adapters and commerce.
- Create: choose origin/look; expand appearance options; choose no headwear and contrasting hair/skin/clothes; recommended abilities selects three owned starters; enter world.
- World: 64×44 overworld and 48×40 frontier. Old doors, exits, NPCs, resources, castle and quest anchors preserved. New lawns and roads are walkable.
- Art: inspect pixel characters/foliage/buildings, dungeon/interior/enemy/world/UI consistency and each regional palette.
- Atlas: area → world regions with level/route guidance → area → close. No free travel or gate bypass.
- Combat: selected reachable target retained; stale distant target replaced with nearest; range/mana/cooldown and area coverage; guard, collision-safe dodge; pause/resume; abilities/page keyboard mappings.
- Controls: primary Attack/three skills/Dodge/Guard; Items & more reveals supplies/eye/racial/flee; all reachable on mobile.
- Progression: XP and level visible, existing earned XP rewards and level gates unchanged.
- Music: original pulse/triangle/noise exploration, voyage, battle; preserved mute/volume and Arena songs. Render real audio buffer and check non-silent finite samples.
- Viewports: 1440×900, 375×812, 1280×600. Check console, overflow, menus, battle expanded bar.
- Off-path: insufficient mana, repeated skill input, no headwear versus default helmet, blocked dodge, save reload and active encounter map travel refusal.
- Side drawer: category/search; Menu/Map/Journal/Wardrobe/Stats; back to menu without duplicate controls; minimize/restore and rail collapse/expand; paused encounters resume; drawer always opens at the top.
- Authorization: user subsequently asked to finish everything and publish, without screenshot updates. Complete local regression checks before optimizing and updating the existing live game. Preserve production accounts and commerce configuration.
