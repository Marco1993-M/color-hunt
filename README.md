# See Places Differently

Prototype travel photography challenge app built with Next.js App Router and Supabase.

## Core loop

1. Create a trip
2. Choose a color mission
3. Upload 9 compressed photos
4. View the poster layout

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth with SSR cookies
- Supabase Postgres
- Supabase Storage
- Browser image compression

## Local setup

1. Copy `.env.example` to `.env.local`
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (defaults to `trip-photos`)
3. In Supabase SQL Editor, run `supabase/schema.sql`
4. Enable email auth in Supabase and set the site URL / redirect URL to `http://localhost:3000/auth/callback`
5. Run `npm run dev`

## Notes

- Uploads use Supabase standard uploads, which Supabase recommends for smaller files.
- Images are compressed client-side and uploaded as WebP.
- `color_match_score` is intentionally left `null` for MVP v1.
- The poster is an HTML/CSS route for now; PNG export can come later.
