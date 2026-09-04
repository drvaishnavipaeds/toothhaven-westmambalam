# Meta WhatsApp webhook configuration details

## About the Supabase login you tried

You do **not** need a Supabase login for this project, and the URL `https://zymakgyfirjecxbdvtzg.supabase.co` is not a login page. It is the backend API endpoint that your Lovable app and Edge Functions use behind the scenes.

This project runs on **Lovable Cloud**, which manages the backend for you. There is no separate Supabase dashboard to sign into. You manage the backend inside Lovable (Cloud → Backend), and secrets in Project Settings → Secrets.

Nothing is broken — the webhook URL below is the correct one to give Meta.

## Webhook URL

Use this exact URL in Meta WhatsApp webhook configuration:

```
https://zymakgyfirjecxbdvtzg.supabase.co/functions/v1/whatsapp-webhook
```

## Verify token environment variable

The Edge Function expects the verify token in this environment variable:

```
META_WEBHOOK_VERIFY_TOKEN
```

## Where to retrieve the verify token value

The value is stored as a secret in your Lovable project:

1. Open your project in Lovable.
2. Go to **Project Settings → Secrets** (or Edge Function secrets).
3. Find the secret named `META_WEBHOOK_VERIFY_TOKEN`.
4. Copy its value and paste it into the Meta webhook "Verify Token" field.

If the secret is missing, create it there with a secure random string.

## Recommended webhook subscription fields

In Meta WhatsApp webhook settings, subscribe to:

- `messages` — inbound patient messages
- `message_statuses` — sent / delivered / read / failed receipts
