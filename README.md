# Meridian HR — Full-Stack
### Every workday, perfectly aligned.

A Human Resource Management System with a real backend: Node.js, Express, MongoDB, and JWT authentication, paired with a plain HTML/CSS/JavaScript frontend (no framework).

This replaces the earlier static prototype's in-memory mock data with an actual REST API and database, while keeping the same look, feel, and workflows.

## Tech Stack

| Module | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (vanilla — no React) |
| Backend | Node.js + Express |
| Database | MongoDB (via Mongoose) |
| Authentication | JWT (JSON Web Tokens) + bcrypt password hashing |

## Project Structure

```
meridian-hr/
├── backend/
│   ├── server.js            # Express app entry point, serves API + static frontend
│   ├── seed.js               # Populates MongoDB with demo employees/attendance/leave
│   ├── config/db.js          # MongoDB connection
│   ├── models/                # User, Attendance, Leave schemas
│   ├── middleware/auth.js    # JWT verification + role-based access control
│   ├── routes/                # auth, employees, attendance, leave, payroll endpoints
│   └── .env.example
└── frontend/
    ├── index.html
    ├── css/styles.css
    └── js/app.js             # All UI logic, talks to the API via fetch()
```

## Setup

**Requirements:** Node.js 18+, a running MongoDB instance (local or Atlas).

```bash
cd backend
npm install
cp .env.example .env       # then edit MONGO_URI and JWT_SECRET
npm run seed                # creates demo employees, attendance, and leave data
npm start                   # runs on http://localhost:5000
```

The backend also serves the frontend as static files, so once it's running, open **http://localhost:5000** in your browser — no separate frontend server needed.

## Demo Accounts

Seeded by `npm run seed` (password for all: `pass123`):

| Role | Email |
|---|---|
| Employee | aisha@company.com |
| HR / Admin | rohit@company.com |


## API Overview

| Method & Path | Access | Purpose |
|---|---|---|
| `POST /api/auth/signup` | Public | Register (Employee ID, email, password, role) |
| `POST /api/auth/login` | Public | Sign in, returns a JWT |
| `GET /api/employees` | HR | List all employees |
| `GET/PUT /api/employees/:id` | Self / HR | View or edit a profile |
| `GET /api/attendance/:userId` | Self / HR | Attendance history for a month |
| `POST /api/attendance/check-in` \| `check-out` | Self | Punch in/out for today |
| `GET/POST /api/leave` | Self / HR | List or apply for leave |
| `PUT /api/leave/:id/decision` | HR | Approve or reject with a comment |
| `GET /api/payroll` | HR | Payroll summary for all employees |
| `GET/PUT /api/payroll/:userId` | Self (read) / HR (edit) | View or update salary structure |

All routes except signup/login require a `Authorization: Bearer <token>` header, set automatically by the frontend after login.

## Security Notes for This Prototype

- Passwords are hashed with bcrypt before storage — never stored in plain text.
- JWTs are signed with `JWT_SECRET` from `.env`; replace the example value before any real deployment.
- **Email verification is stubbed.** Sign-up marks new accounts as unverified but does not send a real email or enforce verification before login — wiring up a provider like SendGrid or Postmark is the natural next step.
- Role checks are enforced server-side in `middleware/auth.js`, not just hidden in the UI.

## What Changed from the Frontend-Only Prototype

- All mock arrays moved into MongoDB collections (`User`, `Attendance`, `Leave`).
- React was intentionally **not** used — the frontend is plain HTML/CSS/JS calling the API with `fetch`.
- Sessions now persist across page refreshes (JWT stored in `localStorage`) instead of resetting.
- The "recent activity" feed on the employee dashboard is now derived from real leave data rather than a simulated log, since there's no dedicated activity-log collection yet.

## Possible Next Steps

- Real email verification and password-reset flows
- An activity-log collection for a genuine audit trail
- Pagination on the employee and leave-approval tables as data grows
- Deployment config (e.g. Render/Railway for the API, MongoDB Atlas for the database)
