# Meta WhatsApp webhook configuration

## Current situation

- This project runs on **Lovable Cloud**, so there is no separate Supabase dashboard login. The URL `https://zymakgyfirjecxbdvtzg.supabase.co` is the backend API endpoint only.
- The Secrets page in Project Settings requires a Business-plan upgrade to view existing values.
- `META_WEBHOOK_VERIFY_TOKEN` already exists, but because you cannot view it, we will set a fresh shared token.

## Webhook URL to paste into Meta

```
https://zymakgyfirjecxbdvtzg.supabase.co/functions/v1/whatsapp-webhook
```

## Verify token environment variable

The Edge Function reads:

```
META_WEBHOOK_VERIFY_TOKEN
```

## Steps

1. **Generate a strong random token** (for example, `openssl rand -hex 32` in a terminal, or a password manager).
2. **Update the Lovable secret** — I will open the secure form for `META_WEBHOOK_VERIFY_TOKEN`; paste the same random string there.
3. **Configure Meta WhatsApp webhook**:
   - Webhook URL: `https://zymakgyfirjecxbdvtzg.supabase.co/functions/v1/whatsapp-webhook`
   - Verify Token: the same random string from step 1.
   - Subscribe to `messages` and `message_statuses` fields.
4. **Test** by sending a message to the clinic WhatsApp number and confirming it appears in the admin WhatsApp Inbox.

No code changes are required; only the secret value and Meta configuration need updating.