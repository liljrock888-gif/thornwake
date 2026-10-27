# Thornwake with real payments

This is Thornwake set up to sell Crowns for real money through Stripe Checkout.
Stripe's hosted checkout page accepts cards, Apple Pay and Google Pay, so you
never handle card numbers yourself.

## What's for sale

Prices are set in `lib/products.js`. The game can't change them.

| Product | Price | Gets |
|---|---|---|
| Pouch of Crowns | $0.99 | 500 Crowns |
| Sack of Crowns | $2.49 | 1,400 Crowns |
| Chest of Crowns | $4.99 | 3,000 Crowns |
| Dragon Hoard | $9.99 | 6,500 Crowns |
| Starter Pack (once) | $1.99 | 1,000 Crowns + Gilded skin |
| Game Pass Premium (once) | $2.99 | Season 1 premium track |

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
   `https://YOUR-SITE/api/webhook` that sends `checkout.session.completed` and
   `checkout.session.async_payment_succeeded`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`, then redeploy.
6. Open your site, go to Store → Buy Crowns, and pay with test card
   `4242 4242 4242 4242` (any future date, any CVC). The Crowns should arrive
   within a few seconds of returning to the game.
7. When test purchases work, swap in your live key and a live-mode webhook secret.

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
