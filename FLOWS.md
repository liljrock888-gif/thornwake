# Thornwake menu regression checks

## Hollow King's castle
- Requested change: the Hollow King remains the boss; the Hollow Knight enemy is unchanged.
- Castle Road shows a continuous stone fortress with four towers, battlements, banners and an arched sealed gate. The entry tile remains [24,6].
- Without both shards, interact at the gate: the seal explains the requirement and does not admit the player.
- With both shards, interact and choose Enter the castle: load Hollow Castle with masonry, carpet, banners and a throne.
- Walk from the existing entrance to both treasure rooms and the throne without crossing walls. Every floor tile and encounter is connected.
- Interact with the throne to start the Hollow King fight; victory preserves the existing story flag, crown and chapter rewards.
- Return through the entrance and choose Leave the castle: arrive on Castle Road, not inside its blocked gate.
- Save/quit/continue inside the castle preserves map, position and opened treasure. Existing keep saves retain their map key and chest IDs.
- Check desktop and 375px phone, locked gate, repeated treasure interaction, menu/guide/journal, arena and the existing browser/purchase suites.

## Economy and class balance
- Cottage costs 250 gold; farm remains 600; harbor house 900; townhouse 1800; manor 4800; Suncrest 10000. Existing deeds, stored gold and mastery remain intact.
- Housing cards explain progression targets; Farmer Odo still sells the same 600-gold farm with existing alignment discounts.
- Eleven classes have distinct primary-stat/mana growth and readable roles. The original eleven exclusive paths and level gates remain.
- Later attacks offer more power or utility at a higher cost. Monk healing and Ki Wave use attack-based scaling; druid Rootquake uses magic.
- Area poison/burn/stun/drain effects work on actual hits; bosses resist crowd control and percentage damage; drain cannot heal from overkill.
- A buff/heal or repeated click consumes exactly one action and one mana charge; targeting cancellation does not spend mana.
- Compare deterministic offense, mana endurance and durability at levels 1/10/25/45/60. These are regression envelopes, not a guarantee of perfect long-run balance.

## Homes, class paths and the Veiled Hand
- Housing & estates lists the farm plus five properties. Insufficient funds and repeated purchases never deduct gold.
- Visit each exterior, buy and enter. Use beds, hearths, storage, furnishing colors and seating; leave through its world exit. Estate gardens return to the correct home.
- Enter the Veiled Hand hideout, join once, accept one contract, recover its marked cache with E, return and claim once. Rank advances.
- Eleven classes each show four exclusive starter choices, eight trainable moves and five class-specific milestones.
- Creator, level-up rewards, old saves, Academy and casting enforce ownership. Earned supernatural powers remain separate.
- Bleeding, its damage, its cures and blood effects remain. Limb loss visuals and penalties are gone, including on old saves.
- Check desktop, phone and short-height layouts, runtime errors, blocked-door and insufficient-gold cases.

## Title and launcher
- Press Start reaches the main menu once, including when activated repeatedly.
- The title and launcher show original ash-grey kingdom artwork with readable text.
- Enter the Vale opens the story menu; Arena opens Campaign / Quick Match.
- Back from each global screen returns to the launcher without story HUD bleed-through.

## Story creation and play
- New story, a name and three abilities enable Begin.
- Intro dialogue advances to the world; movement and interaction still work.
- Escape / M opens only the story menu. Resume returns to the world.
- Journal opens, switches tabs and closes without opening a global menu.
- Save and quit clears story menus and HUD; Continue story restores progress.
- Pressing Enter on a focused menu button does not also interact with the world.

## Other main flows
- Arena Quick Match starts; Escape pauses, Resume continues, Quit returns home.
- Store and How to Play open and return; settings retain their controls.
- Purchase server tests continue to pass. Live payments and account login are excluded.

## Responsive and edge cases
- Desktop 1440x900, phone 375x812, short desktop 1280x600.
- Resize desktop to phone and back with a menu open; controls remain reachable.
- Rapid Escape / M and title-screen activation never stack global and story menus.
- Stale story dialog, battle, journal and loading panels are hidden on leaving story.
- Check page errors and screenshots in title, launcher, story menu and journal states.

## New fantasy progression
- New character creation ends with a welcome loading card, cycling tips and a skip/enter action. Search the Game guide, handle an empty search, request contextual Quick hints, and verify learned/mastery notices are compact side cards (maximum two).
- Minimize/expand stats, objective, minimap, chat and learning notices. Hide/restore the side HUD in one click, preserve preferences on normal-origin reload, and confirm minimized panels fit on desktop and phone without blocking movement, map access, menus or combat.
- Start in sunny morning independent of device time. Verify clear-weather bias and a daylight-heavy saved adventure cycle, shrine waits to morning/night, new original exploration/voyage music, darker dungeon/boss themes, volume controls, and non-silent unclipped audio rendering.
- Click/keyboard activate minimap to open the atlas; resize, zoom/pan, toggle region/enemy boundaries, close/resume and fit 375px phone viewport.
- Hard outer bounds apply even to flying mounts. Hunters acquire within 144px, lose pursuit beyond 208px, stay within a 192px home leash, respect walls and do not acquire across region/safe-zone boundaries.
- Armory: claim starter padding, buy/equip level-gated sets, verify defense/max health, no stacking, cosmetic hiding and save persistence.
- Defeat: retain 90% of gold and all armor; only the rounded-down 10% becomes recoverable Lost Embers.
- Difficulty: Veteran gives 1.35x combat XP/gold and Soulslike 1.75x; boss bounties and contracts scale, Crowns do not.
- Free paths: no membership required for contracts, hunting progress, turn-in, travel or story objectives. Optional Nightveil/Blackbriar affiliation changes preserve progress. C/B/A/S independent clearance unlocks at 26/32/41/55.
- Update shutdown: changed build manifest freezes input, reports save status honestly, reloads once the replacement build is ready; manual warning/closed/open still works.
- Expanded creator and wardrobe: faceless option, new expressions, textured/anime hair, accessory choices, independent shirt/pants colors, suits/ties and saved outfit presets.
- New story begins outside Thornwake Infirmary; its door is reachable, healer restores health/mana and wounds, exit returns outdoors; old saves keep their positions.
- Original light/shadow spellcraft is learnable in the Academy and works in combat with level/mana requirements.
- Origin → Appearance → Abilities preserves name, outfit and three starting skills.
- Bloodlines & spellcraft: low-level awakening disabled; three stages claimed in order at a shrine or Sanctum; all eight races have three stages.
- Ember Academy: a lesson deducts gold and adds mastery practice; lessons are capped at three per level.
- World bosses: rumors, tracking and compass target; combat victories and reward claims grant unique gear; cleared bosses remain marked and stop tracking.
- Ashen Dominion: low-level floors locked; three playable guardian floors, prior-victory gates, companion grants and Warden/Regent/Sovereign titles.
- Phone combat: duplicate exploration HUD hidden during battle; two-column skills and scrollable controls do not overlap the scene.

## Verification notes
- Purchase regression covers 34 payment/configuration/replay/refund cases; no live payment was made.
- Browser regression covers creation, menus, lessons, spell casting, rewards, arena pause/resume and save/quit/continue.
- High-level saves and foe health are staged only in the test response. Production has no mutable QA hook.
- Full level-by-level combat balancing remains a playtesting task.
