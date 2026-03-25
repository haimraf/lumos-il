# LUMOS IL

LUMOS IL is a production Hebrew Harry Potter fan community platform with a gameplay-first browser RPG layer.

## What The Site Is

LUMOS IL is not a generic content website. It is a shared magical world with:

- Houses and House Cup competition
- A gameplay layer with quests, rewards, momentum, and next-action guidance
- Galleons, contribution points, inventory, wand and patronus identity
- Duel systems, trivia, daily actions, live events, and community missions
- Forums, news, fanfics, Great Hall chat, and castle navigation

The current product direction is:

`content platform -> social RPG / browser MMO lite experience`

## Core Systems

- `src/app/quests/page.tsx`: Quest Board V2, daily actions, mission focus, gameplay feedback
- `src/lib/gameplay/questProgress.ts`: computed quests from real profile and activity data
- `src/lib/gameplay/nextActionEngine.ts`: 1-3 recommended next actions
- `src/lib/gameplay/processUserAction.ts`: reward-feedback normalization layer
- `src/app/dashboard/page.tsx`: gameplay-first player overview and mission focus
- `src/components/HouseCupLeaderboard.tsx`: live house race with contribution and momentum
- `src/components/QuestBeacon.tsx`: global “what should I do now” beacon
- `src/app/events/passover/page.tsx`: live event experience with missions, rewards, leaderboard, countdown

## Product Rules

- Do not rebuild architecture.
- Do not duplicate reward or quest systems.
- Reuse existing Supabase data and profile fields.
- Preserve RTL and Hebrew-first UX.
- Treat the site as a living magical world, not as a blog with extra widgets.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth / Database / Realtime
- Framer Motion

## Public Surfaces

- `/`
- `/house-cup`
- `/forums`
- `/library`
- `/news`
- `/faq`
- `/events/[slug]`

## Gameplay Surfaces

- `/quests`
- `/dashboard`
- `/arena`
- `/great-hall`
- `/map`
- `/shop`

## Current Experience Direction

The core loop should feel like:

`enter -> see mission -> act -> reward -> progress -> repeat`

Every meaningful action should answer:

- What should I do now?
- Why should I do it?
- What do I gain?
- How does it affect my house?

## SEO / AI Context

- Public SEO matters most on landing, House Cup, FAQ, forums, library, and live events.
- `public/llms.txt` describes the site for AI readers and external tooling.
- Metadata should reflect the gameplay-first nature of the product, not only “forum/community” language.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
