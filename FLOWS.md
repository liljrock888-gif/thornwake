# Thornwake menu regression checks

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
