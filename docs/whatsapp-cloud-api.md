# WhatsApp Business Cloud API — Reviver

The portal is designed to use the official Meta WhatsApp Business Cloud API for one-to-one notifications.

## Supported flows

- Published worship schedule → individual participant notification.
- Participant confirms or declines through template quick-reply buttons.
- Substitution request → eligible backups are notified automatically.
- First backup who accepts replaces the unavailable member automatically.
- Meta webhook updates message state: sent, delivered, read or failed.
- Failed messages can be retried from the Communication page.
- The existing worship WhatsApp group remains a manual share action. Meta now offers a separate Groups API for eligible accounts and API-created groups, but it does not turn the current normal ministry group into a general automation target.

## Required server secrets

Configure these only as Cloudflare secrets/variables. Never commit real values.

- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_GRAPH_VERSION`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_TEMPLATE_LANGUAGE` (default intended value: `pt_PT`)
- `WHATSAPP_TEMPLATE_SCHEDULE_PUBLISHED`
- `WHATSAPP_TEMPLATE_SUBSTITUTION_REQUEST`

The public webhook URL is:

`https://reviver-platform.iltieresilvas.workers.dev/api/integrations/whatsapp/webhook`

## Template 1 — published schedule

The template configured in `WHATSAPP_TEMPLATE_SCHEDULE_PUBLISHED` must contain five body variables in this order:

1. member display name
2. worship schedule title
3. schedule date/time
4. member role
5. portal URL

It must also expose two quick-reply buttons:

- index 0: Confirmar
- index 1: Não posso

The portal sends dynamic payloads for those buttons and maps the replies back to the assignment.

## Template 2 — substitution request

The template configured in `WHATSAPP_TEMPLATE_SUBSTITUTION_REQUEST` must contain five body variables in this order:

1. backup member display name
2. worship schedule title
3. schedule date/time
4. role/instrument to cover
5. substitutions portal URL

It must expose two quick-reply buttons:

- index 0: Posso substituir
- index 1: Não posso

The first accepted backup is applied automatically to the schedule. Other pending offers expire.

## Webhook subscriptions

Configure the WhatsApp Business Account webhook to deliver message/status events to the URL above.

The route validates:

- Meta verification token during webhook setup.
- `X-Hub-Signature-256` HMAC signature on POST callbacks.
- sender phone against the member profile before accepting assignment/substitution actions.

## Activation sequence

1. Create/verify the Meta Business app and WhatsApp Business Account.
2. Add the production phone number.
3. Create the two templates above and wait for approval.
4. Add all secrets to Cloudflare.
5. Configure the webhook URL + verify token in Meta.
6. Subscribe to WhatsApp message events.
7. Run a test with a test member who explicitly opted into WhatsApp notifications.
8. Confirm the portal records sent → delivered → read and processes quick replies.


## Group note (2026)

Meta offers an official Groups API for eligible WhatsApp Business Platform accounts. It is a separate product with eligibility and group-size constraints. Reviver therefore keeps the existing Louvor group as a manual share target by default. If the church later qualifies and wants an API-created small group, that can be added as a separate integration.
