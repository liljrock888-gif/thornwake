# Story world and GANI refresh

Story has a larger 64×44 overworld, 48×40 frontier maps, open lawns, clearer roads and less crowded decorative housing. Existing quest, NPC, doorway, treasure and character-save identifiers remain unchanged.

## Visuals and navigation
- Original Graal-inspired pixel rendering for characters, foliage, buildings, creatures, interiors, effects and castles. No Graal artwork is bundled.
- Regional palettes and architectural details distinguish coastal, brass, woodland, swamp, snow and sky settlements.
- Side navigation opens Menu, Map, Journal, Wardrobe and Stats. Search/category buttons organize the original systems; Minimize restores play and preserves the current panel, while Collapse hides the navigation rail.
- World atlas shows regions, route guidance and recommended levels without bypassing actual travel or level gates.
- Wardrobe essentials come first; advanced choices remain under More appearance options. No headwear, hair, skin, eye, clothing, pants and shoe colors are reflected by character rendering.

## Combat and audio
- Basic attacks switch from an out-of-range target to a reachable nearby enemy. Class abilities use differentiated ranges and cooldowns; area abilities only damage foes inside their radius.
- Attack, three paged abilities, Dodge and Guard are primary controls. Items & more exposes consumables, racial power, eye power and flee.
- Shift dodges along collision-checked segments; its short protection window blocks enemy strikes. Menus pause and correctly resume real-time encounters.
- Original square-wave, triangle and noise-channel exploration, voyage and battle music evoke handheld RPGs without copying Pokémon melodies. Existing mute/volume and non-Story tracks are preserved.

## GANI support
The GANI parser and player use the documented sprite/frame model: [Graal animation format documentation](https://graalonline.net/Creation/Dev/Releases/Client/2). Twelve original animations are included, with generated sprite cells cached on demand in a bounded 48-sheet cache.

- Open Story menu → Animations · GANI to load `.gani` files with their referenced PNG, GIF or WebP sheets. A pack is local to the current browser tab and is not uploaded.
- Supported: layered SPRITE rectangles, four directions, SINGLEDIRECTION, WAIT at a 20 Hz playback tick, LOOP, CONTINUOUS, default image bindings, zoom and alpha.
- Limitations: embedded Graal/GS2 scripts never execute. Imported sound cues are parsed as metadata; RGB tint and SETBACKTO are not executed. Animated GIF sheets are treated as decoded image sources, not separate animation timelines.
- Use action filenames idle, walk, slash/attack, shoot, cast, dodge, guard, hit/hurt, dance, wave, sit or cheer. Unknown actions and missing or out-of-bounds sheets are rejected without replacing the current working pack.
- Download `walk.gani` and the matching original character PNG from the manager to edit a working example. Use only artwork and animations you own or have permission to use.

## Compatibility and checks
Arena, accounts, cloud saves, character slots, housing, mounts, quests, online integration and existing payment backend configuration are retained. No maintenance flag, production secret or player database is changed by this release.

Local verification uses `npm test`, `npm run test:gani`, `npm run test:refresh` and the existing menu, frontier, castle, balance and advanced Story browser suites. Browser-only mutable QA hooks are injected into intercepted local documents and are not part of the deployed build.
