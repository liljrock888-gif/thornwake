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
