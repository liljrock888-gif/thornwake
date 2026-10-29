# Thornwake menu regression checks

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
