# Verify the Meta WhatsApp webhook end to end

## Where the verify token goes (answer to your question)

The verify token is entered **in the Meta dashboard**, not in Lovable:

1. Open [developers.facebook.com](https://developers.facebook.com) → your app → **WhatsApp** → **Configuration**.
2. Under **Webhook**, click **Edit** (or "Configure webhook"):
   - **Callback URL:** `https://zymakgyfirjecxbdvtzg.supabase.co/functions/v1/whatsapp-webhook`
   - **Verify token:** the fresh token we set in the previous step — it's stored as the secret `META_WEBHOOK_VERIFY_TOKEN` in Lovable Project Settings → Secrets. Since the plan blocks viewing saved secrets, use the same random value you generated when we rotated it. If you no longer have it, I'll open the secure form to set a new one you can copy.
3. Click **Verify and save**. Meta sends a GET request to the URL; the function compares the token against `META_WEBHOOK_VERIFY_TOKEN` and echoes back the challenge — this is the "verification".
4. Under **Webhook fields**, subscribe to **`messages`** (this is what makes incoming patient messages reach the inbox).

## What I will do

1. **Simulate Meta's verification GET** against the live function URL with a wrong token and the correct flow, confirming the function responds `403` for bad tokens and returns the challenge for the right one (proves the endpoint is reachable and the secret is loaded).
2. **Simulate an inbound WhatsApp message POST** (the same JSON shape Meta sends) to the webhook and confirm:
   - a row appears in `whatsapp_messages` as `direction: inbound`,
   - it shows up in **Admin → WhatsApp Inbox**,
   - Haven AI generates a reply (or the message is flagged for staff).
3. **Report results** and any fix needed (e.g. missing subscription, token mismatch) with exact instructions.

## What you do in Meta (after I confirm the endpoint works)

- Enter the Callback URL + Verify token above and click **Verify and save**.
- Subscribe to the `messages` webhook field.
- Then send a real WhatsApp message **from your phone to the clinic's WhatsApp business number** — it should appear in the admin inbox within seconds, and Haven AI should reply.

## Notes

- No code changes expected; this is verification plus config guidance.
- If verification fails in Meta, the most common causes are: token typed differently than the saved secret, or the wrong app/phone number selected in the Meta dashboard.
