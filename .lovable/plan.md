# End-to-end WhatsApp send check to 9585996484

## The 2-hour pause, explained

Every message staff sends from the WhatsApp Inbox is recorded as "handled by staff". When that patient replies, the webhook looks for any staff message to their number in the last 2 hours. If it finds one, Haven AI stays quiet so the bot never talks over a real person mid-conversation. Two hours after the last staff message, the bot starts auto-replying again. A patient reply on its own does not extend the pause — only staff messages do.

## What the test will do

1. **Config check** — confirm the WhatsApp access token, sender phone ID and business account ID are live by asking Meta for the sender's own details. A failure here is the `#133010` "number not registered" class of problem.
2. **Template check** — list every approved template on the account with its language and category. This tells us exactly what can be sent right now and rules out `#132001`.
3. **Real send to 9585996484** — send one approved template (an authentication or utility one, whichever is approved) through the existing `whatsapp-send` edge function, authenticated as staff, exactly as the admin inbox does it. No shortcut path, so the test proves the real flow.
4. **Delivery trace** — read back the row written to the message log, then re-read it a few seconds later to see the delivery status the webhook records (sent → delivered → read).
5. **Inbound + bot check** — you reply to that message from the phone. That opens the 24-hour window, and Haven AI should answer. We confirm the reply landed in the inbox and that the bot responded.

## What you will see

- A real WhatsApp message on 9585996484.
- A report back here with: whether the sender number is healthy, the exact list of approved templates, the message ID Meta returned, and the delivery status.
- If it fails, the verbatim Meta error code and message plus the specific fix (register the number, approve a template, or add a payment method).

## Notes

- Step 3 sends a real message and step 5 needs you to reply from the handset — the rest is read-only.
- If no template is approved yet, the send cannot succeed and the report will name the exact template to create in WhatsApp Manager instead.
