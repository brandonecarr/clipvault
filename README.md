# ClipVault 📼

> Save, organize, and revisit your favorite social media videos — all in one place.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native (Expo SDK 54, Expo Router) |
| Web | Next.js 16 (App Router) |
| API Server | Node.js + Express |
| Database | PostgreSQL (via Supabase) |
| ORM | Prisma |
| Auth | Supabase Auth |
| Storage | Supabase Storage (thumbnail cache) |
| State (mobile) | Zustand + TanStack Query |
| Monorepo | Turborepo |

---

## Project Structure

```
clipvault/
├── apps/
│   ├── mobile/        # React Native (Expo) app
│   └── web/           # Next.js web app
├── packages/
│   └── shared/        # Types, validators, utils shared across apps
├── server/            # Express API
│   └── prisma/        # Schema + migrations
├── supabase/
│   └── migrations/    # SQL migrations to run in Supabase dashboard
├── .env.example       # Copy to .env and fill in values
└── turbo.json
```

---

## Setup Instructions

### 1. Prerequisites

- Node.js 20+
- npm 10+
- [Supabase account](https://supabase.com) (free tier works)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### 2. Clone and install

```bash
git clone <your-repo-url> clipvault
cd clipvault
npm install
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **anon key** from Settings → API
3. In the Supabase SQL Editor, run **both migration files**:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_search_function.sql`
4. In Supabase → Storage, create a bucket named `thumbnails` and set it to **Public**

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
```

Also copy for mobile:
```bash
cp .env.example apps/mobile/.env
```

Expo reads `EXPO_PUBLIC_*` variables from the mobile `.env`.

### 5. Generate Prisma client

```bash
cd server
npm run db:generate
```

> Note: The actual schema is managed by Supabase via the SQL migrations above. Prisma's `schema.prisma` is used for type generation and query building — not for running migrations.

### 6. Start development

```bash
# Start all (server + mobile)
npm run dev

# Or individually:
npm run dev:server    # Express API on http://localhost:3001
npm run dev:mobile    # Expo on http://localhost:8081
npm run dev:web       # Next.js on http://localhost:3000
```

### 7. Run the mobile app

```bash
cd apps/mobile
npx expo start
```

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

---

## API Reference

Base URL: `http://localhost:3001/api/v1`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register with email/password |
| POST | `/auth/login` | Login → returns session |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user |
| PATCH | `/auth/me` | Update profile |

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/folders` | All folders (flat list) |
| GET | `/folders/:id` | Single folder + children + breadcrumbs |
| POST | `/folders` | Create folder |
| PATCH | `/folders/:id` | Update folder |
| DELETE | `/folders/:id` | Delete folder (cascades) |
| PATCH | `/folders/:id/move` | Move to new parent |
| PATCH | `/folders/reorder` | Reorder folders |

### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/folders/:folderId/videos` | List videos (paginated) |
| POST | `/videos` | Save video (auto-extracts metadata) |
| PATCH | `/videos/:id` | Update video |
| DELETE | `/videos/:id` | Delete video |
| PATCH | `/videos/:id/move` | Move to different folder |
| POST | `/videos/bulk-move` | Move multiple videos |
| GET | `/videos/search?q=` | Full-text search |

### Metadata
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/meta/extract` | Extract metadata from URL |

### Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tags` | All tags with counts |
| GET | `/tags/autocomplete?q=` | Tag suggestions |
| PATCH | `/tags/:id` | Rename tag |
| DELETE | `/tags/:id` | Delete tag |

---

## Supported Platforms

| Platform | oEmbed | OG Scrape | Deep Link |
|----------|--------|-----------|-----------|
| YouTube | ✅ | ✅ | ✅ |
| TikTok | ✅ | ✅ | ✅ |
| Instagram | — | ✅ | ✅ |
| Facebook | — | ✅ | ✅ |
| Pinterest | — | ✅ | — |
| X/Twitter | — | ✅ | — |
| Vimeo | ✅ | ✅ | — |
| Reddit | — | ✅ | — |

---

## Development Notes

- All API responses use the shape `{ data: T, error: null } | { data: null, error: { message, code } }`
- Maximum folder nesting depth: **5 levels**
- Video pagination: **cursor-based**, default 20 per page
- Thumbnails are cached to Supabase Storage so they persist even if the source video is deleted
- Full-text search uses PostgreSQL `tsvector` with GIN indexes for performance

---

## Share Extension (iOS/Android)

The share extension (Phase 7) allows users to share a video URL from any social media app directly into ClipVault. This requires:

- **iOS**: Native Share Extension via `expo-share-extension` (EAS build required)
- **Android**: Intent filter in `AndroidManifest.xml` (already configured in `app.json`)

See `apps/mobile/share-extension/` for implementation details.
