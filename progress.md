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
