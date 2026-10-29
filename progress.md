Original prompt: Fix the menu overlap first. Change the menu artwork to a dark fantasy RPG direction that makes people want to play.

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

## Remaining playtesting
- Reward/gate tests stage high-level saves and one-hit enemies; sustained combat balance and the full economy require longer playtesting.
- This update does not add the older proposed boat interiors, cinematic expansion or rescue-companion questlines.
- Production must remain free of mutable QA hooks; test-only instrumentation belongs in the browser suite.
