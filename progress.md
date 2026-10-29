Original prompt: Fix the menu overlap first. Change the menu artwork to a dark fantasy RPG direction that makes people want to play.

## Homes, class paths and the Veiled Hand, October 28, 2026
- Added `game/homes-classes.js`, inserted into the game closure during build. Five new gold-priced properties join the original farm, including two estates with separate walkable gardens. Deeds, home strongboxes and furnishing colors persist on ordinary hosting.
- Residential exteriors now have pitched roofs, warm divided windows, shutters, flower boxes, doors and property signs. Interiors have plank floors, rugs, usable beds, kitchen counters/hearths, wardrobes, bookshelves and connected dining tables.
- Interactions use proximity plus explicit exit/door/NPC priority. New buildings avoid the existing livestock pen, travel crystal, houses and farm plots.
- Eleven exclusive class paths contain eight learnable abilities and five milestones each. Creator, training, level-up rewards, load migration and battle execution enforce owner/level gates. Matching old abilities retain mastery; unmatched abilities are archived. Earned supernatural powers remain separate.
- The Veiled Hand hideout offers one-time membership, five world-cache recovery contracts, single-claim gold rewards, reputation and ranks through Guildmaster. No cross-class ability rewards.
- Removed severing, detached-limb effects, NPC attack reduction, player attack penalties and obsolete text. Old flags are removed without clearing active bleeding. Blood spray, pools and bleeding damage/cures remain.
- Final validation: 79 dedicated browser checks, 43 existing browser checks and 34 purchase checks passed, with no browser runtime errors. Desktop and phone checked. Covers six purchases/entrances/exits, furniture, garden return, five contracts, reward reconciliation, normal-host save reload, 143 ownership gates, legacy migration and live Warrior/Mage effects. Staged fixtures do not establish long-run combat balance.
- `npm run build:preview` creates `preview/` with labeled session-only memory saves, leaving production storage and payments unchanged. No new multiplayer/payment service is provisioned.
- Public repository/main and the public live deployment were not changed. Prepared locally for approval before publication.

## Scope
- Preserve the existing game, saves, arena and purchase systems.
- Fix global/story menu exclusivity, input ownership and story panel fit.
- Add original ruined-kingdom artwork to the launcher and title.
- Verify browser flows, purchase tests, deployment and GitHub push.

## Added scope
- Expressive storybook heroes, customizable hair/eyes/expressions, distinct masked bandits and redesigned monsters.
- Five magic tiers at levels 1/10/25/45/60; three racial evolutions at 15/35/60 for each of eight races.
- Three tracked world bosses, region/discovery callouts, unique gear and persistent victories.
- Ashen Dominion hall and three guardian floors with level/prior-victory gates, companions, ruler titles and guild contracts.
- Ember Academy gold-paid mastery lessons, capped at three per level.
- Original Thornwake systems inspired by the requested dark fantasy and anime themes, without copied characters or locations.

## QA discoveries and fixes
- Fixed startup temporal-dead-zone access during portrait rendering.
- Fixed inherited narrow card clipping the creator; added desktop/phone/short-height layouts.
- Removed expensive menu backdrop blur and duplicate rendering behind the title.
- Phone battle review found exploration HUD overlap; hide duplicate HUD and use two-column skills plus a higher compact battle stage.
- Corrected test assumptions about default headwear and waiting for arena loading.
- Final purchase regression: 34 passed, 0 failed. Final browser regression: 43 checks passed after compact-stage adjustment, with no page runtime errors.
- Required game-client smoke test completed and its screenshot/state were reviewed. Static hosting returns the expected `/api/config` 404 because serverless payment endpoints are not present; live payments were not exercised.
- Pushed feature commit f7d8756 to main and verified the remote hash. Updated the existing preview asset ce27ff70-28f9-46f5-bb6b-7ecb818705f4.
- Fresh hosted-context checks passed for title/art, responsive creator, playable new story, three boss rumors, Help and Quick Match setup, with no page runtime errors. QA contexts were closed.
- Hosted refresh persistence is blocked by the preview sandbox: accessing localStorage throws because the document lacks allow-same-origin. This is a hosting limitation, not a successful persistence check. The existing game has no file-export backup; use normal-origin hosting for persistent saves.

## Remaining playtesting
- Reward/gate tests stage high-level saves and one-hit enemies; sustained combat balance and the full economy require longer playtesting.
- This update does not add the older proposed boat interiors, cinematic expansion or rescue-companion questlines.
- Production must remain free of mutable QA hooks; test-only instrumentation belongs in the browser suite.

## Wardrobe, armor, independent paths and atlas update

Implemented the follow-up requests:
- Client update gate: content-hashed release manifest, no-cache Vercel headers, save-before-lock attempt, automatic reload only after successful local storage, manual warning/closed/open modes and honest blocked-storage messaging. Existing pre-gate clients must first load the new version.
- Expanded creator/wardrobe: 21 hair choices, 12 expressions including Faceless, 13 skin tones, eight outfits, five pants styles, neckwear, ten accessory choices, independent garment colors and six saved outfit slots.
- Nine original dawn/dusk spells. Extended area magic to honor double hits, guaranteed-hit tags and status effects, so Concord Burst and Ice Bloom match their descriptions.
- Three infirmaries with free treatment and recovery shrine updates. Only new characters start outside Thornwake Infirmary.
- Six armor sets with visible cuirass/pauldrons/greaves, one equipped stats source, free starter padding, cosmetic hiding and persistence. Outfit presets cannot override the actual equipped armor.
- Defeat retains 90% of gold and all equipment; the rounded-down 10% is dropped as recoverable Lost Embers.
- Veteran grants 1.35x combat XP/gold; Soulslike 1.75x. Boss gold bounties scale, while Crowns do not. Contract reward difficulty is recorded on acceptance.
- Independent contracts and optional Nightveil Compact/Blackbriar Company fellowships. No quest levy or abandonment penalty. Independent travel clearance at C26/B32/A41/S55 replaces mandatory guild gates for story travel and titles; optional guild politics remains.
- Clickable/keyboard-accessible minimap opens an atlas with panel sizing, zoom, scroll-pan, region boundaries, objective/player/infirmary markers and hunter home rings. Native touch scrolling is enabled in menus.
- Hard map bounds, including flying mounts. Visible hunters detect at 144px rather than 300px, lose pursuit beyond 208px or 192px from home, require wall-clear sight and do not acquire across region/safe-zone boundaries. Tile-based world random encounters are unchanged.

Verification:
- 77 browser checks passed, with no page runtime errors. This includes armor purchase/equip/hiding, independent contract turn-in without guild membership, safe defeat loss, reward multipliers, multi-target double-hit/freeze, map resize/zoom/phone fit, hunter boundaries, real save/reload, update detection/reload, arena and earlier progression.
- 34 purchase/configuration/replay/refund tests passed.
- Native-touch Chromium check: creator scrollTop changed 0→425; zoomed atlas scrollLeft changed 0→161 after touch drags. No runtime errors.
- All three clinic interiors were entered in a separate touch-enabled browser; treatment restored health, cleared wounds and set the correct clinic recovery shrine.
- Required game-client smoke script rerun; canvas-only artwork screenshot and launcher text state reviewed. Its expected static `/api/config` 404 stops further iterations. Full DOM/gameplay evidence is in the browser regression screenshots.
- Reviewed desktop/phone map, wardrobe, armory, clinic, customization sheet and update-shutdown screenshots.
- Build and inline script parsing succeeded. Final CSS touch-scroll adjustment separately verified in the native-touch browser after the regression run.

Hosting limitation remains: Vercel authorization failed earlier; no Vercel resources were created or linked. The Computer preview still blocks localStorage, so refresh persistence is not available there. Normal-origin browser persistence was verified locally; this change is not a new cloud-save backend. Live payments remain untested.

## Property and class tuning, release 58
- Cottage 250, farm 600, harbor 900, townhouse 1800, manor 4800, Suncrest 10000 gold.
- Added class-specific base stats/growth and role copy for eleven classes. Tuned
  eight learnable moves and five milestones per class without changing ownership,
  mastery or unlock gates. Class menus show actual level-scaled mana costs.
- Corrected Monk attack scaling, Druid magical Rootquake, area statuses and drain,
  boss interruption/DoT resistance, actual-damage healing and guarded follow-ups.
- Heal/buff casts lock immediately; rapid repeated calls cannot spend twice.
- Existing deeds/storage remain intact. Save normalization only clamps over-cap
  HP/MP and does not heal. Production accounts, payment and other modes untouched.
- Added `test/balance.test.mjs`, with response-only instrumentation; production
  has no mutable test hook. Full-campaign and player-feedback balancing remains open.
- Final release checks: 248 balance, 79 housing/class/guild, 43 browser/progression,
  and 34 payment regression checks passed (404 total). Desktop/phone housing and
  class paths were visually inspected. The required game-client smoke test
  completed; its static-server `/api/config` 404 is expected, not a runtime exception.
- Production and preview builds contain no mutable QA exports. The preview
  remains session-only; normal-origin save/reload is covered by the housing suite.

## Sunny adventures, quieter HUD and merged release, October 29, 2026

- Integrated remote `3c82876` without overwriting its estates, Veiled Hand contracts, exclusive class paths, class/economy tuning or limb-loss removal. The nine dawn/dusk spells are Mage-owned with level gates; ownership checks cover 152 techniques. Combined area effects preserve both multi-hit spell behavior and the actual-damage/status-resistance balance helpers.
- Added the post-creation welcome/loading card, cycling tips, an Enter the Vale action, searchable Game guide, empty search state and contextual Quick hints.
- Learned spells, mastery gains and class unlocks use compact side notifications, at most two at once, with manual dismissal, automatic expiry and a collapsible count. Major story and boss announcements stay separate.
- Stats, objective, minimap, chat and learning notices minimize independently. Hide HUD/Show HUD clears or restores the side panels while retaining menu access. Chat starts minimized. Preferences survive normal-origin save/reload; touch controls remain usable above the joystick capture zone.
- Corrected exploration Menu/Journal/Ride/Chat button spacing, including narrow desktop-style windows. Existing touch-specific control positioning is preserved.
- Clear weather has an 82% selection chance, lasts 95–180 seconds, and starts with 150 seconds of clear skies. Unsettled weather is shorter. A saved 30-minute adventure clock gives 24 minutes to daylight and six to night, independently of device time; fresh adventures start around 10 AM. Shrine options skip to morning or night without changing real-time daily/economy timers.
- Added two original synthesized scores: Wayfarer's Dawn for overland exploration and Beyond the Horizon for island/ship travel. Dungeon, bayou, ordinary battle and boss themes remain separate. Music now switches on normal map entry as well as story/combat/travel transitions; existing volume settings apply.

Verification and publication:
- 106 browser/progression, 79 housing/class/guild, 248 combat/property balance and 34 payment checks passed: 467 total. No browser page runtime errors. Staged progression victories use guaranteed-hit Concord Burst so random basic-strike evasion cannot produce false test failures; these fixtures do not establish long-term difficulty balance.
- Both new scores were rendered through OfflineAudioContext and checked for non-silent output and unclipped peaks. Daylight/weather selection, shrine waits and saved clock phase are covered by the browser suite.
- Separate native-touch checks covered creation/loading skip, all minimization controls, quiet mode, chat expansion, learning notice folding and phone fit. Desktop, phone, sunny-world and learning-panel screenshots were visually reviewed.
- Updated the existing public preview asset `ce27ff70-28f9-46f5-bb6b-7ecb818705f4` in place, build `b469dbd1925c4028`. Fresh hosted native-touch context verified the new build, creation/loading tips, sunny 10 AM spawn outside the infirmary, panel collapse/restore, learning notices, searchable sunshine guide, free armor claim and the atlas. No page runtime errors; QA contexts closed.
- Required game-client smoke rerun and canvas screenshot/text state reviewed. Its static `/api/config` 404 remains expected; live payments were not tested.
- Vercel team discovery failed with a CLI TypeError before any write. No Vercel project was created, relinked or deployed, and no authorization retry was attempted. Normal-origin browser saving is verified; this Computer preview still loses progress on refresh, and no new cloud-save backend was provisioned.
