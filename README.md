# Social App — nearbi

A real, working MERN app: **Auth, Users, Posts, Feed** on the backend, with a full React frontend wired to it — Phase 1 of the larger build. This is the base that Messaging, Stories, Notes, Calling, and the Admin Panel will plug into in later phases.

## What's actually working right now

**Backend**
- **Auth**: register, login (email or username), logout, JWT access + refresh tokens (rotated on use, theft-detection on reuse), forgot/reset password, change password, email verification, account lockout after failed attempts, secure httpOnly cookies
- **Users**: profiles, avatar/cover upload, follow/unfollow, followers/following lists, privacy settings, user search, geo-location update + nearby-users query (2dsphere index)
- **Posts**: create (multi-image/video), edit, delete, archive, pin, hashtag/mention auto-extraction, tagging, location tagging
- **Feed**: paginated recent feed, "following only" scope, trending (engagement-scored), like, comment, nested replies, save/bookmark, share counter, report, hide, "not interested"
- **Security**: Helmet, rate limiting (tighter on auth/upload routes), NoSQL-injection sanitization, XSS sanitization, CORS, bcrypt (cost 12), input validation on every write route
- **Storage**: Cloudinary if you configure it, otherwise automatic fallback to local disk — no upload feature breaks if you skip Cloudinary
- **Email**: real SMTP if configured, otherwise verification/reset links are logged to the console so you can still test the full flow with zero email setup

**Frontend** (React + Vite + Redux Toolkit + TailwindCSS)
- Full auth flow: login, register, forgot/reset password, session persistence with automatic token refresh
- Home feed with infinite scroll, like/comment/save/share, create-post modal with real media upload
- Profile pages (own + others') with follow/unfollow, edit profile, avatar upload
- Explore (trending), Search (live user search), Saved posts
- Nearby page: real browser geolocation prompt → real backend nearby-users query with radius filter (1/5/10/50km)
- Settings: profile, privacy settings, change password
- Messaging and Notifications are honest "coming soon" screens — no fake/mocked data behind them, since those aren't built on the backend yet

Both were built and verified during development: backend was boot-tested against a live MongoDB (register → login → create post → fetch feed) plus a full route-wiring test; frontend was verified with a clean production build (`vite build`, zero errors) and served via `vite preview`.

## What's NOT built yet (next phases)

Messaging + Socket.IO, Stories, Notes, WebRTC audio/video calling, Explore-page nearby creators, notifications, admin dashboard, and Docker/deployment config. Tell me which one to build next.

## Setup

### Backend
You only need to provide one thing:

```bash
cd backend
cp .env.example .env
# edit .env and set:
MONGODB_URI=your_connection_string
```

Everything else (JWT secrets, cookie secret) is auto-generated on first boot and saved back into `.env` so it stays stable across restarts.

```bash
npm install
npm run seed   # optional: creates sample users + posts
npm run dev    # starts on http://localhost:5000
```

Sample login after seeding: username `brayn`, password `Password123`.

### Optional backend config (not required to run)
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — enables real cloud media storage. Without these, uploads are saved to `backend/uploads/` and served locally.
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` — enables real emails. Without these, verification/reset links print to your terminal.

### Frontend

```bash
cd frontend
npm install
npm run dev    # starts on http://localhost:5173
```

The dev server proxies `/api` and `/uploads` to `http://localhost:5000`, so just run the backend alongside it — no frontend `.env` needed.

## API quick reference

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account |
| POST | `/api/auth/login` | – | Login (identifier = email or username) |
| POST | `/api/auth/logout` | ✔ | Logout |
| POST | `/api/auth/refresh` | – (cookie) | Rotate access token |
| POST | `/api/auth/forgot-password` | – | Request reset link |
| POST | `/api/auth/reset-password` | – | Reset with token |
| POST | `/api/auth/change-password` | ✔ | Change password |
| GET | `/api/auth/me` | ✔ | Current user |
| GET | `/api/users/:username` | optional | Public profile |
| PATCH | `/api/users/me` | ✔ | Update profile |
| POST | `/api/users/:userId/follow` | ✔ | Follow |
| GET | `/api/users/nearby?radiusKm=5` | ✔ | Nearby users |
| POST | `/api/posts` | ✔ | Create post (multipart, field `media`) |
| GET | `/api/posts/feed?page=1&limit=10` | ✔ | Feed |
| GET | `/api/posts/trending` | ✔ | Trending posts |
| POST | `/api/posts/:postId/like` | ✔ | Toggle like |
| POST | `/api/posts/:postId/comments` | ✔ | Add comment |

Full route list is in `backend/routes/`.

## Known items to revisit

- `multer` is pinned to the 1.x LTS line because `multer-storage-cloudinary` hasn't been verified against multer 2.x yet — worth re-testing when that adapter updates.
- `xss-clean` is unmaintained upstream; it still works but a maintained replacement should be swapped in eventually.
- Frontend was verified via production build + preview server, not against a live MongoDB (sandbox couldn't download a Mongo binary) — worth a real end-to-end smoke test on your machine before you rely on it.

