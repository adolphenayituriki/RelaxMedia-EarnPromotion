# YouTube Watch Tracker — Relax Media Earn Promotion

A full-stack web application that rewards users for watching YouTube videos. Users earn **RFW (Relax Media Frank) tokens** by watching videos from a curated playlist. The platform tracks watch time, detects skips, and awards earnings based on time-watched tiers.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (Vite + React)        Backend (Express + Mongoose) │
│                                                              │
│  ┌─────────────────────┐         ┌─────────────────────────┐ │
│  │  YouTube IFrame API  │ ────→  │  /api/playlist/:id      │ │
│  │  Player + Tracking   │         │  (scrapes YouTube)      │ │
│  ├─────────────────────┤         ├─────────────────────────┤ │
│  │  StatsPanel         │ ────→  │  /api/watched  (POST)   │ │
│  │  ActivityLog        │         │  /api/earnings (PUT)    │ │
│  │  PlaylistSidebar    │         ├─────────────────────────┤ │
│  ├─────────────────────┤         │  /api/auth/*            │ │
│  │  SignIn             │ ────→  │  /api/comment/*         │ │
│  │  VerifyEmail        │         │  /api/reward/*          │ │
│  │  WithdrawModal      │         │  /api/withdraw/*        │ │
│  ├─────────────────────┤         ├─────────────────────────┤ │
│  │  AdminDashboard     │ ────→  │  /api/admin/*           │ │
│  │  (full CRUD UI)     │         │  (all CRUD endpoints)   │ │
│  └─────────────────────┘         └──────────┬──────────────┘ │
│                                             │                │
│                                    ┌────────▼──────────────┐ │
│                                    │    MongoDB Atlas       │ │
│                                    │  Users                │ │
│                                    │  WatchedVideos        │ │
│                                    │  Withdraws            │ │
│                                    │  RewardClaims         │ │
│                                    │  Comments             │ │
│                                    └───────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Frontend
- **React 19** with modern hooks
- **YouTube IFrame API** for video playback
- **Vite** for dev server and production builds
- **CSS** (single `App.css`, dark theme)
- **Vercel** for hosting (with API proxy rewrites)

### Backend
- **Express.js** REST API
- **MongoDB** via Mongoose (5 collections)
- **Swagger** auto-generated API docs (`/api-docs`)
- **Nodemailer** for email verification
- **Render** for hosting

---

## Features

| Feature | Description |
|---------|-------------|
| YouTube Playlist Loading | Scrapes YouTube playlist data via cheerio-like parsing |
| Unique Second Tracking | Only counts unique seconds to prevent replay abuse |
| Skip Detection | Detects fast-forwarding/scrubbing and subtracts skipped time |
| Cumulative Earnings | Watch time persists across sessions |
| Tiered Earning Rates | Starter (65 RFW/hr), Bronze (80 RFW/hr), Silver (100 RFW/hr) |
| Email Verification | 6-digit code sent via Gmail SMTP |
| First-to-Watch Rewards | +2.5 RFW bonus for being first to like/subscribe on a video |
| Comments | Users can comment on videos |
| Withdrawals | Request payouts (min 500 RFW), admin approves |
| Admin Dashboard | Full CRUD over users, videos, comments, rewards, withdrawals |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, CSS |
| Backend | Node.js, Express 4 |
| Database | MongoDB (Mongoose 8) |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Email | Nodemailer (Gmail SMTP) |
| Auth | scrypt password hashing, no JWT/sessions |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |

---

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)

### 1. Clone and install dependencies

```bash
git clone https://github.com/adolphenayituriki/RelaxMedia-EarnPromotion.git
cd RelaxMedia-EarnPromotion
npm run install:all
```

### 2. Configure environment

Create `backend/.env`:

```env
PORT=3001
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/relaxmedia_earnpromotion
ADMIN_EMAIL=youradmin@gmail.com
ADMIN_PASSWORD=yourpassword
OTP_EMAIL=youremail@gmail.com
OTP_PASSWORD=your-gmail-app-password
```

If `OTP_PASSWORD` is not set, verification codes are printed to the console (dev mode).

### 3. Run locally

```bash
# Run both backend and frontend concurrently:
npm run dev

# Or run separately:
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:5173
```

The frontend dev server proxies `/api/*` requests to `http://localhost:3001`.

### 4. Open the app

- **App:** http://localhost:5173
- **Swagger docs:** http://localhost:3001/api-docs
- **Admin login:** Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`

---

## How It Works

### Earning Model

| Tier | Min Hours | Rate (RFW/hr) |
|------|-----------|---------------|
| Starter | 0 | 65 |
| Bronze | 5 | 80 |
| Silver | 12 | 100 |

Earnings = `(total watch seconds / 3600) × current tier rate`

### Watch Time Tracking

1. The YouTube IFrame API player is loaded with a playlist
2. Every 1 second, the app samples the player's current time
3. Unique seconds are counted per video (no double-counting)
4. If a jump > 2.5 seconds is detected, the skipped portion is not counted
5. On `beforeunload`, the cumulative total is saved via `sendBeacon`
6. When a video ends, the watch record is saved to MongoDB

### Rewards

The first user to claim a video (by clicking Like/Subscribe) gets a +2.5 RFW bonus. Once claimed, no other user can claim the same video.

### Withdrawals

- Minimum withdrawal: **500 RFW**
- Fee structure:

| Amount Range | Fee |
|-------------|-----|
| 500 – 1,000 | 50 |
| 1,001 – 1,500 | 84 |
| 1,501 – 2,000 | 120 |
| 2,001+ | 200 |

- Admins approve/reject withdrawal requests via the admin dashboard.

---

## API Overview

All endpoints are documented via Swagger at `/api-docs` (or [production docs](https://relaxmedia-earnpromotion.onrender.com/api-docs)).

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signin` | Sign in / sign up |
| POST | `/api/auth/verify-email` | Verify email with 6-digit code |
| POST | `/api/auth/resend-code` | Resend verification code |
| GET | `/api/playlist/:id` | Scrape YouTube playlist metadata |
| GET | `/api/watched/:userId` | Get watch map for a user |
| POST | `/api/watched` | Save watched progress |
| GET | `/api/earnings/:userId` | Get user earnings |
| PUT | `/api/earnings` | Update cumulative watch time |
| GET | `/api/comments/:videoId` | Get comments for a video |
| POST | `/api/comment` | Post a comment |
| GET | `/api/reward/status/:videoId` | Check reward claim status |
| POST | `/api/reward/claim` | Claim first-to-watch reward |
| POST | `/api/withdraw` | Submit withdrawal request |
| GET | `/api/withdraw/earnings-info/:userId` | Get earnings info + history |

### Admin Endpoints (requires admin credentials)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/:id` | Get user by ID |
| POST | `/api/admin/users` | Create a user |
| PUT | `/api/admin/users/:id` | Update a user |
| DELETE | `/api/admin/users/:id` | Delete a user + all their data |
| GET | `/api/admin/watched` | List all watched video records |
| DELETE | `/api/admin/watched/:id` | Delete a watched record |
| GET | `/api/admin/comments` | List all comments |
| DELETE | `/api/admin/comments/:id` | Delete a comment |
| GET | `/api/admin/rewards` | List all reward claims |
| DELETE | `/api/admin/rewards/:id` | Delete a reward claim |
| GET | `/api/admin/withdrawals` | List all withdrawal requests |
| PUT | `/api/admin/withdraw/:id` | Approve/reject a withdrawal |
| DELETE | `/api/admin/withdraw/:id` | Delete a withdrawal request |

---

## Admin Dashboard

Sign in with the admin email/password (configured via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars) to access the admin dashboard with 6 tabs:

| Tab | Features |
|-----|----------|
| **Overview** | Platform stats (users, watch time, paid, claims, comments) |
| **Users** | List, edit (email, watch time, verified), add, delete users |
| **Withdrawals** | View, approve, reject, delete withdrawal requests |
| **Watched** | View all watched video records, delete records |
| **Comments** | View all user comments, delete comments |
| **Rewards** | View all reward claims, delete claims |

---

## Deployment

### Backend (Render)

1. Push to GitHub
2. Create a **Web Service** on Render
3. Connect your repo, set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Add environment variables: `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OTP_EMAIL`, `OTP_PASSWORD`

### Frontend (Vercel)

1. Import your GitHub repo on Vercel
2. Set:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Framework:** Vite
3. The `vercel.json` rewrites `/api/*` to the Render backend URL

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Backend server port |
| `MONGO_URI` | Yes (prod) | `mongodb://localhost:27017/...` | MongoDB connection string |
| `ADMIN_EMAIL` | No | `www.nayituriki.com@gmail.com` | Admin login email |
| `ADMIN_PASSWORD` | No | `Adolphe@078` | Admin login password |
| `OTP_EMAIL` | No | Falls back to `ADMIN_EMAIL` | Gmail address for sending OTPs |
| `OTP_PASSWORD` | No | — | Gmail app password (if unset, codes print to console) |

---

## Project Structure

```
youtube-app/
├── backend/
│   ├── models/
│   │   ├── User.js           # User accounts
│   │   ├── WatchedVideo.js   # Per-video watch records
│   │   ├── Withdraw.js       # Withdrawal requests
│   │   ├── RewardClaim.js    # First-to-watch rewards
│   │   └── Comment.js        # Video comments
│   ├── routes/
│   │   ├── auth.js           # Sign in, verify email
│   │   ├── watch.js          # Track watched videos
│   │   ├── playlist.js       # Scrape YouTube playlists
│   │   ├── earnings.js       # Earnings calculations
│   │   ├── reward.js         # Reward claiming
│   │   ├── comment.js        # Comments CRUD
│   │   ├── withdraw.js       # Withdrawal requests
│   │   └── admin.js          # Full admin CRUD
│   ├── email.js              # Nodemailer transport
│   ├── shared.js             # Tiers, fees, password hashing
│   ├── server.js             # Express app + swagger setup
│   ├── render.yaml           # Render deployment config
│   └── .env                  # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx   # Full admin interface
│   │   │   ├── VideoPlayer.jsx      # YouTube player wrapper
│   │   │   ├── StatsPanel.jsx       # Earnings & stats display
│   │   │   ├── PlaylistSidebar.jsx  # Video list navigation
│   │   │   ├── ActivityLog.jsx      # Real-time activity feed
│   │   │   ├── SignIn.jsx           # Login/signup modal
│   │   │   ├── VerifyEmail.jsx      # OTP verification modal
│   │   │   ├── WithdrawModal.jsx    # Withdrawal request form
│   │   │   └── Promotions.jsx       # Promotional content
│   │   ├── hooks/
│   │   │   ├── useAuth.js           # Auth state + localStorage
│   │   │   └── useYouTubePlayer.js  # Player + skip detection
│   │   ├── App.jsx                  # Root component + routing
│   │   └── App.css                  # All styles (dark theme)
│   ├── index.html
│   ├── vite.config.js              # Vite config + proxy
│   └── vercel.json                 # Vercel rewrites config
├── package.json                    # Root scripts
├── .gitignore
└── README.md
```

---

## Admin Credentials

- **Email:** configured via `ADMIN_EMAIL` env var (default: `www.nayituriki.com@gmail.com`)
- **Password:** configured via `ADMIN_PASSWORD` env var (default: `Adolphe@078`)

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend App | [https://relaxmedia-earnpromotion.vercel.app](https://relaxmedia-earnpromotion.vercel.app) |
| API + Swagger Docs | [https://relaxmedia-earnpromotion.onrender.com/api-docs](https://relaxmedia-earnpromotion.onrender.com/api-docs) |
| GitHub | [https://github.com/adolphenayituriki/RelaxMedia-EarnPromotion](https://github.com/adolphenayituriki/RelaxMedia-EarnPromotion) |

---

## License

MIT — © 2026 Nayituriki Adolphe / RELAX MEDIA, Rwanda
