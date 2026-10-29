# Thornwake with real payments

## Homes, class paths and the Thieves Guild

- **Housing & estates:** The story pause menu sells the original Harrowfield farm plus Willowbank Cottage, Saltmere Harbor House, Thornwake Townhouse, Briarwood Manor and Suncrest Estate. Deeds cost earned gold, never premium Crowns. Visit a property and interact with its front door to enter. Homes have usable beds, cooking hearths, personal gold storage, reading shelves, dining tables and furnishing colors; both estates have a private garden with a fountain.
- **Class paths:** All eleven classes have four exclusive starter choices, eight learnable abilities and five class milestones at levels 1, 10, 25, 45 and 60. Paid training and free level-up rewards use the same ownership checks as combat. Old mixed-class abilities are archived, matching abilities retain their mastery, and racial/earned supernatural powers remain separate.
- **The Veiled Hand:** Visit its hideout west of Thornwake through the Thieves Guild pause-menu entry. Join for 50 gold. Five single-claim, level-gated cache-recovery contracts award gold and reputation. Recover a marked cache with E, then return to the hideout to claim.
- **Combat wounds:** Bleeding, blood spray and blood pools remain. Limb severing, detached-limb rendering and limb-loss attack penalties are removed. Existing limb flags are cleared when a save loads.

`game/homes-classes.js` is inserted into the game's closure by `scripts/build.mjs`. Run `npm run build` before serving the game; do not open the source HTML directly. `npm run test:homes` runs the dedicated housing, class and guild browser checks against the same local server used by `test:browser`.

`npm run build:preview` creates a separate `preview/` folder with session-only in-memory storage for Computer. The normal `public/` build retains persistent browser saves and the existing purchase integration.

## Fantasy overhaul

The title and menu use original ashen-kingdom artwork. Story mode now uses outlined, expressive characters with customizable hair, eyes and expressions, distinct bandit outfits, and redesigned monsters. Character creation has three steps: Origin, Appearance and Abilities.

- **Bloodlines & spellcraft:** Magic tiers unlock at levels 1, 10, 25, 45 and 60. Racial awakenings become available at levels 15, 35 and 60, claimed in order at an Ashen Shrine or in the Ashen Sanctum.
- **World bosses:** Track the Briar Matriarch, Ossuary Colossus and Vael Storm-Eater from the pause menu. Victories grant unique gear and appear on the boss board.
- **Ashen Dominion:** Clear three level-gated guardian floors to unlock companions and ruler ranks. The guild also offers guardian contracts.
- **Ember Academy:** Buy up to three spell-practice lessons per character level with in-game gold. Lessons advance mastery practice, not spell-tier level requirements.

These are original Thornwake systems inspired by dark fantasy, dungeon-adventure and magic-school progression, not licensed anime characters or locations. Existing saves retain their base race, equipment and relationships.

### Regression checks

Run `npm test` for purchase-flow checks. For browser checks, run `npm run build`, install Chromium once with `npx playwright install chromium`, serve `public` on port 3000, then run `npm run test:browser`. Set `TEST_BASE_URL` for a different local URL.

The browser suite uses disposable saves and response-only instrumentation to stage high-level encounters. It checks UI, rewards and persistence without shipping mutable test hooks. Staged one-hit victories do not establish full combat balance.

The hosted Computer preview runs in a sandbox that blocks localStorage. Story progress works in memory there, but does not survive a page refresh. Use a normal-origin deployment such as Vercel for browser save persistence; this build does not include a file-export backup. Static previews also do not run the serverless payment endpoints below.

## Payment setup

This is Thornwake set up to sell Crowns for real money through Stripe Checkout.
Stripe's hosted checkout page accepts cards, Apple Pay and Google Pay, so you
never handle card numbers yourself.

## What's for sale

Prices are set in the `PRODUCTS` list at the top of each file in `api/`. Keep that list identical in all four files. The game can't change prices.

| Product | Price | Gets |
|---|---|---|
| Pouch of Crowns | $0.99 | 500 Crowns |
| Sack of Crowns | $2.49 | 1,400 Crowns |
| Chest of Crowns | $4.99 | 3,000 Crowns |
| Dragon Hoard | $9.99 | 6,500 Crowns |
| Starter Pack (once) | $1.99 | 1,000 Crowns + Gilded skin |
| Game Pass Premium (once) | $4.99 | Season 1 premium track |
| Volt Mythic Bundle (once) | $9.99 | Volt hero, Sparky pet, 500 Crowns |
| Aegis Mythic Bundle (once) | $9.99 | Aegis hero, Bulwark pet, 500 Crowns |
| Nightshade Mythic Bundle (once) | $9.99 | Nightshade hero, Echo pet, 500 Crowns |

Eggs are only bought with Crowns or earned, never sold directly for money.

## How it works

1. A player picks a product on the **Buy Crowns** tab of the in-game store.
2. `api/checkout.js` creates a Stripe Checkout page and sends the player there.
3. After payment, Stripe calls `api/webhook.js`. It checks Stripe's signature and
   queues the purchase in Redis under the player's purchase ID.
4. Back in the game, `public/payments.js` calls `api/claim.js` to collect the
   purchase and adds it. Each purchase is applied only once.

The **Buy Crowns** tab only appears when the server reports that payments are set up.

## Setup (about 30 minutes)

You need three free accounts. Create them yourself; they ask for your own
business and bank details.

1. **Stripe**: sign up at stripe.com. Stay in **test mode** until everything works.
   - Settings → Payment methods: turn on Cards, Apple Pay and Google Pay.
2. **Upstash**: create a free Redis database at upstash.com and copy its
   REST URL and REST token.
3. **Vercel**: put this folder in a GitHub repository, then import it at
   vercel.com. The build settings come from `vercel.json`.
4. In Vercel → Project → Settings → Environment Variables, add every name from
   `.env.example` with your values. Use your test key (`sk_test_...`) first.
5. In Stripe → Developers → Webhooks, add an endpoint at
   `https://YOUR-SITE/api/webhook` that sends `checkout.session.completed`,
   `checkout.session.async_payment_succeeded` and `charge.refunded`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`, then redeploy.
6. Optional: to get a Discord message for every purchase and refund, create a
   webhook in your Discord server (channel settings → Integrations → Webhooks),
   copy its URL into `DISCORD_WEBHOOK_URL`, and redeploy.
7. Open your site, go to Store → Buy Crowns, and pay with test card
   `4242 4242 4242 4242` (any future date, any CVC). The Crowns should arrive
   within a few seconds of returning to the game, and your Discord channel
   should show the test purchase.
8. When test purchases work, swap in your live key and a live-mode webhook secret.

## Refunds

Add `charge.refunded` to the webhook's events. When you fully refund a purchase in
Stripe, the webhook queues a "revoke" for that player, and the game takes back the
unspent Crowns, the Starter Pack skin or the Game Pass the next time it loads.
Partial refunds are left alone.

## Accounts, cloud saves and online play (Supabase)

`public/online.js` adds an **Account** button to the main menu, saves each signed-in
player's progress online, and runs Multiplayer and online Ranked over Supabase Realtime.
It switches on only when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set.

1. Create a free project at supabase.com.
2. SQL Editor → New query: paste `supabase/setup.sql` and run it.
3. Authentication → Sign In / Providers → Email: turn **off** "Confirm email", so players can
   sign in right after creating an account. (Supabase's built-in email only sends a few
   messages an hour.)
4. Project Settings → API: copy the Project URL and the `anon` public key into Vercel as
   `SUPABASE_URL` and `SUPABASE_ANON_KEY`, then redeploy.

The free plan allows a limited number of realtime messages each month. A full six-player
match sends about ten updates a second, so watch Supabase → Reports → Realtime once
people start playing, and move to a paid plan if you get close to the limit.

## Updating the game

`game/thornwake.html` is the same file as the Claude artifact. Replace it with a
newer copy and redeploy; `npm run build` wraps it into `public/index.html`.

## Before you go live

- **Player accounts.** Purchases are tied to a purchase ID saved in the player's
  browser. If they clear their browser data, they lose their progress and that ID.
  Before selling widely, add sign-in so purchases follow the player. Stripe
  receipts include the purchase ID shown on the Buy Crowns tab, so you can
  restore purchases by hand in the meantime.
- **Cheating.** Crowns are spent in the player's browser, so a player could edit
  their own balance. That only affects their own single-player game.
- **Online play.** Multiplayer uses a feature of Claude artifacts and won't work
  on your own site until it gets its own real-time server.
- **Legal.** Publish terms of sale and a refund policy, and check the tax rules
  for where you sell. Stripe Tax can help with that.
