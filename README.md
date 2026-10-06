# Reviver Platform

Nova base técnica da Igreja Reviver.

## Stack
- Next.js / React
- Vercel
- Supabase Auth + PostgreSQL + Storage
- ChatGPT Sites como frontend institucional público, consumindo API pública

## Desenvolvimento
1. Copiar `.env.example` para `.env.local`.
2. Preencher `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Executar `npm install`.
4. Executar `npm run dev`.

Nenhuma chave secreta deve ser commitada.


Deployment trigger: sync latest Reviver Platform source with Vercel.

## Public CMS API

Read-only endpoints expose only content already published by the editorial workflow:

- `GET /api/public/content?type=event`
- `GET /api/public/content?type=campaign`
- `GET /api/public/content?type=video`
- `GET /api/public/content?type=post`
- `GET /api/public/content?type=home_highlight`
- `GET /api/public/content/:slug?type=event`
- `GET /api/public/site`

Supported filters on collection requests include `network`, `category`, `featured`, `from`, `to`, `limit` and `offset` where applicable.

Internal profiles, memberships, Academy progress, quiz answers and administration data are not exposed by these endpoints.
