# ChatApp Backend

The REST + WebSocket API powering ChatApp — a real-time one-on-one and group messaging application. Built with Express 5, Socket.IO, and MongoDB/Mongoose, with JWT authentication and an email verification / password-reset flow.

The companion frontend lives in a separate repository: [`ChatApp-Frontend`](https://github.com/DaniAThaheem/chatApp_frontend).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
- [Environment Variables](#environment-variables)
- [Running the Application (Development)](#running-the-application-development)
- [Production Build Instructions](#production-build-instructions)
- [API Overview](#api-overview)
- [Database Information](#database-information)
- [Authentication & Authorization](#authentication--authorization)
- [Available Scripts](#available-scripts)
- [Configuration](#configuration)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [Contributing Guidelines](#contributing-guidelines)
- [License](#license)
- [Authors / Credits](#authors--credits)
- [Acknowledgements](#acknowledgements)

---

## Project Overview

This service exposes a REST API for user accounts, one-on-one and group chats, and messaging, plus a Socket.IO layer that pushes real-time events (new messages, typing indicators, group updates) to connected clients. Authentication uses a JWT access/refresh token pair delivered as `httpOnly` cookies, and transactional emails (verification, password reset) are sent through Nodemailer with Mailgen-generated HTML templates.

## Key Features

**Authentication & Account Management**
- Email/password registration with server-side validation (`express-validator`)
- Email verification via a tokenized link sent through Nodemailer
- Login issuing a JWT access + refresh token pair as `httpOnly` cookies
- Refresh token endpoint to rotate an expired access token
- Forgot-password / reset-password flow using time-limited, hashed tokens
- Authenticated change-password and avatar upload (`multer`)
- Role field (`USER` / `ADMIN`) built into the user schema

**Chat & Messaging**
- One-on-one chat creation that reuses an existing chat if one already exists
- Group chat creation, renaming, and deletion (admin-only actions enforced in the controller)
- Add / remove participants in a group, and leave-group support
- Fetch all chats for the logged-in user
- Send messages with text content and/or up to 5 file attachments
- Delete a message, including cleanup of its local attachment files
- Search other registered users to start a new chat

**Real-Time Layer (Socket.IO)**
- Socket authentication via the `accessToken` cookie or an `auth.token` handshake fallback
- Per-user and per-chat room joining
- Events for new chats, message received/deleted, group rename, and typing/stop-typing

## Technology Stack

| Category | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Real-time | Socket.IO 4 |
| Database / ODM | MongoDB with Mongoose 8 (+ `mongoose-aggregate-paginate-v2`) |
| Authentication | JSON Web Tokens (`jsonwebtoken`), `bcrypt` password hashing |
| Validation | `express-validator` |
| File Uploads | `multer` (disk storage) |
| Email | `nodemailer` + `mailgen` |
| Sessions / OAuth deps | `express-session`, `passport`, `passport-google-oauth20` *(installed but not wired up — see [Future Improvements](#future-improvements))* |
| Utilities | `cookie-parser`, `cors`, `dotenv`, `nanoid` |
| Dev tooling | `nodemon`, `prettier` |

## Project Architecture

```
Request → Router → Validator → Middleware (auth) → Controller → Model → MongoDB
                                                          ↓
                                                  Socket.IO event emission
```

- **Routers** (`src/routes`) define endpoints and attach validators/middleware.
- **Validators** (`src/validators`) use `express-validator` to check payloads before a controller runs.
- **Middlewares** (`src/middlewares`) handle JWT verification, file upload staging, and centralized error handling.
- **Controllers** (`src/controllers`) hold the business logic, wrapped in a shared `asyncHandler` that forwards errors to Express's error middleware.
- **Models** (`src/models`) define Mongoose schemas for `User`, `Chat`, and `ChatMessage`, with instance methods for password hashing/verification and token generation.
- **Socket layer** (`src/socket`) authenticates each WebSocket connection using the same JWT used for REST calls, joins the user to personal and chat-specific rooms, and exposes `emitSocketEvent` for controllers to broadcast updates after a REST action completes.

## Folder Structure

```
ChatApp-Backend/
├── public/
│   └── images/                  # Uploaded avatars & message attachments
├── src/
│   ├── controllers/
│   │   ├── chat.controllers.js
│   │   ├── message.controllers.js
│   │   └── user.controllers.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── multer.middleware.js
│   ├── models/
│   │   ├── chat.model.js
│   │   ├── message.modal.js
│   │   └── user.model.js
│   ├── routes/
│   │   ├── chat.routes.js
│   │   ├── message.routes.js
│   │   └── user.routes.js
│   ├── validators/
│   │   ├── chat.validator.js
│   │   ├── message.validator.js
│   │   ├── mongoId.validator.js
│   │   ├── user.validator.js
│   │   └── validate.js
│   ├── socket/
│   │   └── index.js             # Socket.IO auth & event handlers
│   ├── db/
│   │   └── index.js             # MongoDB connection
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   ├── AsyncHandler.js
│   │   ├── Helper.js
│   │   └── Mail.js              # Nodemailer + Mailgen email sending
│   ├── passport/                # Reserved for Google OAuth strategy (currently empty)
│   ├── constants.js
│   ├── app.js                   # Express app, middleware, route mounting
│   └── index.js                 # Entry point (DB connect + server start)
├── .env
└── package.json
```

## Prerequisites

- **Node.js** v18 or later and npm
- **MongoDB** instance — local installation or a hosted cluster (e.g., MongoDB Atlas)
- A **Gmail account with an App Password** (or another SMTP-compatible account) for sending verification and password-reset emails

## Installation Guide

```bash
git clone https://github.com/DaniAThaheem/chatApp_backend.git
cd chatApp_backend
npm install
```

## Environment Variables

Create a `.env` file in the project root:

| Variable | Description |
|---|---|
| `NODE_ENV` | Runtime environment (`development` enables error stack traces in API error responses) |
| `MONGODB_URI` | MongoDB connection string (the database name `chatApp` is appended automatically) |
| `PORT` | Port the HTTP/Socket.IO server listens on |
| `ACCESS_TOKEN_SECRET` | Secret used to sign JWT access tokens |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime (e.g., `1d`) |
| `REFRESH_TOKEN_SECRET` | Secret used to sign JWT refresh tokens |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime (e.g., `10d`) |
| `CORS_ORIGIN` | Allowed origin for CORS and Socket.IO connections (your frontend URL) |
| `GMAIL_PASSWORD` | App password for the Gmail account used to send transactional emails |

> **Note:** The sender email address is currently hardcoded in `src/constants.js` rather than read from an environment variable. See [Future Improvements](#future-improvements).

## Running the Application (Development)

```bash
npm run start   # runs `nodemon src/index.js`
```

The server connects to MongoDB, then listens on the port defined by `PORT`.

## Production Build Instructions

There is no dedicated build step (plain Node/ES Modules). For production, run with a process manager instead of `nodemon`:

```bash
node src/index.js
# or
pm2 start src/index.js --name chatapp-backend
```

Set `NODE_ENV=production` and supply all secrets via your hosting provider's environment configuration rather than a committed `.env` file.

## API Overview

All routes are prefixed with `/api/v1`. Endpoints marked **Auth** require a valid access token (via `accessToken` cookie or `Authorization: Bearer <token>` header).

### Users — `/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new user, sends an email verification link |
| POST | `/login` | No | Authenticate and receive access/refresh token cookies |
| POST | `/refresh-token` | No* | Exchange a valid refresh token for a new token pair |
| GET | `/verify-email/:token` | No | Verify a user's email using the emailed token |
| POST | `/forgot-password` | No | Send a password-reset email |
| POST | `/reset-password/:token` | No | Reset password using the emailed token |
| POST | `/logout` | Yes | Clear refresh token and auth cookies |
| PATCH | `/avatar` | Yes | Upload/update the current user's avatar |
| PATCH | `/change-password` | Yes | Change password for the current user |
| GET | `/current-user` | Yes | Get the authenticated user's profile |
| POST | `/resend-email-verification` | Yes | Resend the email verification link |

\* Reads the refresh token from the request rather than the access token.

### Chats — `/chats` (all routes require Auth)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get all chats for the current user |
| GET | `/users` | Search for other users to start a chat with |
| POST | `/c/:receiverId` | Create (or reuse) a one-on-one chat |
| POST | `/group` | Create a group chat (`name`, `participants[]`, min. 2 participants) |
| GET | `/group/:chatId` | Get group chat details |
| PATCH | `/group/:chatId` | Rename a group chat |
| DELETE | `/group/:chatId` | Delete a group chat |
| POST | `/group/:chatId/:participantId` | Add a participant to a group |
| DELETE | `/group/:chatId/:participantId` | Remove a participant from a group |
| DELETE | `/leave/group/:chatId` | Leave a group chat |
| DELETE | `/remove/:chatId` | Delete a one-on-one chat |

### Messages — `/messages` (all routes require Auth)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/:chatId` | Get all messages for a chat |
| POST | `/:chatId` | Send a message (`content` text and/or up to 5 `attachments` files) |
| DELETE | `/:chatId/:messageId` | Delete a message |

### Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `connected` | Server → Client | Emitted after successful socket authentication |
| `socketError` | Server → Client | Emitted when socket auth fails |
| `joinChat` | Client → Server | Join a chat-specific room |
| `typing` / `stopTyping` | Bidirectional | Broadcast typing state to other room members |
| `newChat` | Server → Client | A new chat was created |
| `messageReceived` | Server → Client | A new message was sent in a chat |
| `messageDeleted` | Server → Client | A message was deleted |
| `updateGroupName` | Server → Client | A group chat was renamed |
| `disconnect` | Client → Server | Socket disconnected, leaves rooms |

## Database Information

**Database:** MongoDB, accessed through Mongoose. Database name (`chatApp`) is fixed in `src/constants.js` and appended to `MONGODB_URI` at connection time.

**Collections / Schemas:**

- **User** — avatar (`url`/`localPath`), `username`, `email`, `password` (bcrypt-hashed pre-save), `role` (`USER`/`ADMIN`), `loginType` (`EMAIL_PASSWORD`/`GOOGLE`), email verification and password-reset token fields, refresh token. Instance methods: `isPasswordCorrect`, `generateAccessToken`, `generateRefreshToken`, `generateTemporaryToken`.
- **Chat** — `name`, `isGroupChat`, `admin` (ref `User`), `participants` (ref `User[]`), `lastMesssage` (ref `ChatMessage`), timestamps.
- **ChatMessage** — `content`, `attachments` (`url`/`localPath[]`), `chat` (ref `Chat`), `sender` (ref `User`), timestamps.

The `User` schema also has the `mongoose-aggregate-paginate-v2` plugin attached, though no controller currently uses paginated aggregation.

## Authentication & Authorization

- **Password-based auth:** passwords are hashed with `bcrypt` (10 salt rounds) in a Mongoose pre-save hook.
- **Tokens:** login issues a short-lived JWT access token and a longer-lived JWT refresh token, both set as `httpOnly` cookies (`secure: true`); the refresh token is also persisted on the user document.
- **Route protection:** the `jwtVerify` middleware reads the token from the `accessToken` cookie or the `Authorization: Bearer` header, verifies it, and attaches the resolved user to `req.user`.
- **Socket protection:** the Socket.IO connection handler performs the same JWT verification (from cookies or the `auth.token` handshake payload) before allowing a socket to join any rooms.
- **Email verification & password reset:** implemented with single-use, hashed, time-limited tokens (`crypto.randomBytes` + SHA-256), generated by `generateTemporaryToken` on the `User` model.
- **Roles:** the schema defines `USER` and `ADMIN` roles, but no route or middleware currently restricts access based on role — role-based authorization is not enforced yet.
- **Google OAuth:** `passport` and `passport-google-oauth20` are listed as dependencies and `GOOGLE` is a valid `loginType`, but `src/passport` is empty and no OAuth route exists — this integration is not implemented yet.

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run start` | `nodemon src/index.js` | Run the server with auto-reload |
| `npm test` | — | Not implemented (placeholder script) |

## Configuration

- **CORS:** configured via `CORS_ORIGIN` on both the Express app and the Socket.IO server, with `credentials: true` so cookies can be sent cross-origin.
- **File uploads:** handled by `multer` with disk storage; files are saved to `public/images` and served statically at `/images/<filename>`. Filenames are sanitized and suffixed with a timestamp + random number to avoid collisions.
- **Request body limits:** JSON and URL-encoded bodies are capped at `16kb` in `app.js`.
- **Linting/formatting:** `.prettierrc` / `.prettierignore` are included for consistent formatting.

## Deployment Guide

1. Provision a MongoDB instance (e.g., MongoDB Atlas) and note the connection string.
2. Deploy to a Node-compatible host (Render, Railway, an EC2/VPS instance, etc.), setting all variables from the [Environment Variables](#environment-variables) table.
3. Set `CORS_ORIGIN` to the exact URL of your deployed frontend.
4. Deploy behind HTTPS — cookies are set with `secure: true` and will be silently dropped by browsers over plain HTTP.
5. If deploying behind a reverse proxy (Nginx, etc.), ensure WebSocket upgrade headers are passed through for Socket.IO to work correctly.

## Troubleshooting

| Issue | Likely Cause | Fix |
|---|---|---|
| `401 Unauthorized` on every request | Access token expired, missing, or malformed | Confirm the client is sending the `accessToken` cookie or a valid `Authorization: Bearer` header |
| Verification/reset emails not sending | Invalid `GMAIL_PASSWORD` | Gmail requires an **App Password** (not your regular account password) when 2FA is enabled |
| File uploads fail silently | `public/images` directory missing or not writable | Ensure the `public/images` folder exists and the process has write permissions |
| CORS errors from the frontend | `CORS_ORIGIN` doesn't exactly match the frontend origin | Set `CORS_ORIGIN` to the exact scheme + host + port of the frontend |
| Socket connections rejected | No token found in cookies or handshake auth | Ensure the client passes the access token via cookie or `auth.token` when connecting |

## Future Improvements

- Complete the Google OAuth login flow (dependencies are installed, but the `passport` strategy is not implemented)
- Enforce role-based access control for `ADMIN`-only actions, since the `role` field currently has no effect on route access
- Move the hardcoded sender email in `constants.js` into an environment variable
- Add an automated test suite (none currently exists)
- Add pagination for chat lists and message history using the already-installed `mongoose-aggregate-paginate-v2` plugin
- Add centralized logging and remove leftover `console.log` debug statements

## Contributing Guidelines

1. Fork the repository and create a feature branch: `git checkout -b feature/your-feature`
2. Follow the existing code style (Prettier config included)
3. Commit with clear, descriptive messages
4. Open a pull request describing the change and its motivation
5. Verify the API still works end-to-end (register → login → chat → message) before submitting

## License

The `package.json` declares an **ISC** license. No `LICENSE` file was found in the repository, so this should be treated as a stated intent rather than a formally applied license — add a `LICENSE` file to make this binding.

## Authors / Credits

**Danish A.** ([@DaniAThaheem](https://github.com/DaniAThaheem)) — sole author, as listed in `package.json`.

## Acknowledgements

- [Socket.IO](https://socket.io/) for the real-time engine
- [Mailgen](https://github.com/eladnava/mailgen) for transactional email templates
