# Fixes in this update

All changes verified by `node test/purchase-flow.test.mjs` (34 checks) and a
browser smoke test of the rebuilt game (boot, menus, full match start, live
gameplay, no console errors).

## New: Discord notifications

Set `DISCORD_WEBHOOK_URL` in your environment (Discord → channel settings →
Integrations → Webhooks → copy the webhook URL) and redeploy. Every purchase
and refund then posts a message to that channel, with the price, the product,
the player's purchase ID (the one shown on the Buy Crowns tab, for support)
and a "test mode" label while your Stripe test key is in use. Notifications
never block or break purchase delivery: a Discord outage or a slow response
is swallowed and times out after four seconds.

## Purchase delivery (api/)

- **webhook.js — lost purchases.** The dedup marker used to be written before
  the grant was queued; if the function died in between, Stripe's retry saw the
  marker and skipped the purchase forever. The grant is now queued first, so a
  crash can only cause a harmless duplicate (the game applies each checkout id
  once). Replays are skipped via a marker check, and the refund path got the
  same treatment — a replayed refund can no longer steal back a repurchase,
  and a replayed purchase can no longer resurrect a refunded product.
- **claim.js — two-tab race.** Count-based acknowledgements (`ack: n`) could
  drop a purchase that arrived while another tab was reading the queue. The
  game now acknowledges the exact grant ids (`ackIds`), which removes them by
  value and is safe with concurrent readers. Old count-based acks are refused
  with a "please reload" message so nothing is silently lost.
- **checkout.js — half-configured stores.** Checkout now refuses (503) before
  contacting Stripe when the webhook secret, Redis token or site URL is
  missing, matching what /api/config reports.
- **config.js — readiness.** `enabled` now requires every prerequisite (Stripe
  key, webhook secret, Redis URL + token, site URL), so the Buy Crowns tab no
  longer appears when delivery would be broken.

## Game client (public/)

- **payments.js — durable saves.** A grant is only acknowledged after it is
  confirmed to be written to localStorage, so a full or blocked storage can't
  lose a paid purchase. After returning from checkout the game now also keeps
  a slow 15-second watch for about five minutes, covering payments that
  confirm late.
- **online.js — cloud saves.**
  - Uploads are paused from sign-in until the cloud/local choice settles
    (previously the cloud save could be overwritten before the player chose).
  - A newer save that arrives while an upload is in flight is uploaded
    afterwards instead of being dropped.
  - If this device has purchases the account's cloud save has never seen, the
    device's progress is kept (and pushed) instead of silently dropping them.

## Tests

`test/purchase-flow.test.mjs` simulates Upstash Redis and stubs the Stripe
SDK. Covers the ack race, replayed/duplicate events, refunds (including
repurchase after refund), readiness checks, and signature rejection.
