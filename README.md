# AthleTech - Backend API

REST API and business logic layer for **AthleTech**, a web-based athletic meet management system. This service handles authentication, athlete registration, payment slip storage and verification, event scheduling, IAAF-based performance scoring, result publishing and email notifications.

Both front-ends consume this API and live in separate repositories:

| Layer | Repository |
|---|---|
| REST API & Database layer (this repo) | [AthleTech_Backend](https://github.com/Ishari-928/AthleTech_Backend) |
| Client / Public UI | [AthleTech_Client_UI](https://github.com/Ishari-928/AthleTech_Client_UI) |
| Admin Dashboard | [AthleTech_Admin_Dashboard](https://github.com/Ishari-928/AthleTech_Admin_Dashboard) |

---

## Tech Stack

- **Node.js** - server-side runtime
- **Express.js** - routing and middleware
- **MySQL** - relational data store (athletes, events, registrations, payments, performances, advertisements)
- **JWT** - stateless session handling
- **Firebase Authentication** - identity provider
- **Multer** (or equivalent) - payment slip file upload handling
- **SMTP / email service API** - registration confirmations, BIB numbers, slip status notices
- **ESLint** - linting

---

## Architecture

AthleTech follows a three-tier architecture. This repository is the **business logic layer** sitting between the React front-ends and MySQL:

```
React front-ends  ──HTTPS/REST──▶  Express API  ──SQL──▶  MySQL
                                       │
                                       ├──▶ File storage (payment slips)
                                       ├──▶ Email service (notifications)
                                       └──▶ IAAF point scoring
```

Requests flow **route → middleware → controller → service → model**, keeping HTTP handling separate from domain logic and data access.

---

## Project Structure

```
AthleTech_Backend/
├── src/
│   ├── config/             # DB connection, environment config, upload & mail client setup
│   ├── constants/          # Enums, status codes, fixed values (event statuses, roles, payment states)
│   ├── controllers/        # Request handlers - parse input, call services, shape responses
│   ├── middleware/         # Auth guards, JWT verification, role checks, file upload, error handling
│   ├── models/             # Database models and query definitions
│   ├── routes/             # Express route definitions grouped by resource
│   ├── services/           # Business logic - scoring, registration rules, slip verification, email
│   ├── utils/              # Helpers - validators, formatters, PDF/report generation
│   ├── app.js              # Express app setup, middleware registration, route mounting
│   └── server.js           # Server bootstrap and port binding
├── eslint.config.mjs       # ESLint rules
├── package.json            # Dependencies and npm scripts
├── package-lock.json       # Locked dependency tree
└── .gitignore
```

---

## Core Responsibilities

### Authentication & Authorisation
- Admin and athlete login with hashed credentials
- JWT issuance and verification middleware
- Role-based access control (System Administrator, Event Manager, Finance Manager, Athlete, Coach)
- Automatic session expiry on inactivity

### Athlete & Registration
- Athlete record creation with unique athlete ID generation
- Event registration with participant-limit enforcement (track events capped, field events unlimited)
- Registration deadline enforcement
- BIB number generated and released only once payment is verified

### Payment Slip Handling
Registration fees are paid offline by bank deposit or transfer. The API stores the uploaded slip and exposes it to admins for manual verification.

- Accepts slip uploads (image or PDF) with MIME type and file size validation
- Stores the file and links it to the registration record
- Registration begins at status **Pending**, moving to **Verified** or **Rejected** after admin review
- Rejection reasons recorded and emailed to the athlete, allowing re-upload
- Confirmation email with BIB number triggered on verification
- Endpoints for payment status filtering and financial reporting

### Events & Competition
- Event CRUD with age group and max participant configuration
- Event status transitions (open → closed → finished)
- Heat, semifinal and final progression; automatic qualifier selection
- Performance recording (time/distance, position)

### Scoring & Results
- Automated scoring using the **IAAF Point Table**
- Athlete rankings per event and age group
- School/club total point aggregation and championship ranking
- PDF result report generation
- Historical event data queries for trend analysis

### Advertisements
- Advertisement records (title, company, sponsor amount, image/GIF, display area)
- Sponsor contribution reporting

### Notifications
- Registration confirmation emails with BIB number and event details
- Slip verification and rejection notices
- Bulk event update announcements

### Auditing & Maintenance
- Audit logging of user actions, registration changes and slip verification decisions
- Database backup and restore support
- Performance and error logging

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MySQL 8.0+
- SMTP credentials or an email service API key
- Firebase project credentials

### Installation

```bash
git clone https://github.com/Ishari-928/AthleTech_Backend.git
cd AthleTech_Backend
git checkout test
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=athletech

# Auth
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Payment slip uploads
SLIP_UPLOAD_DIR=./uploads/slips
MAX_SLIP_SIZE_MB=5
ALLOWED_SLIP_TYPES=image/jpeg,image/png,application/pdf

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=noreply@athletech.lk

# CORS
CLIENT_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
```

`.env` and the uploads directory must stay out of version control.

### Database Setup

Create the schema, then run your migration or schema script:

```sql
CREATE DATABASE athletech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Core tables: `admin`, `athlete`, `coach`, `event`, `registration`, `payment`, `performance`, `school_club`, `club_ranking`, `advertisement`.

The `payment` table holds the slip file path, upload timestamp, verification status, verifying admin and rejection reason.

### Running the Server

```bash
npm run dev     # Development with auto-reload
npm start       # Production
npm run lint    # Run ESLint
```

The API is served at `http://localhost:5000` by default.

---

## API Overview

All endpoints are versioned under `/api/v1`. Protected routes require an `Authorization: Bearer <token>` header.

| Group | Base path | Purpose |
|---|---|---|
| Auth | `/api/v1/auth` | Login, token issue, session handling |
| Admins | `/api/v1/admins` | Admin accounts, roles and profiles |
| Athletes | `/api/v1/athletes` | Athlete records, registration and profiles |
| Events | `/api/v1/events` | Event CRUD, status and participant counts |
| Track Events | `/api/v1/track-events` | Track event records and capped entries |
| Field Events | `/api/v1/field-events` | Field event records and entries |
| Heats | `/api/v1/heats` | Heat allocation, semifinal and final progression |
| Coaches | `/api/v1/coaches` | Coach profiles and article submissions |
| News Updates | `/api/v1/news-updates` | Event news and announcements |
| Gallery | `/api/v1/gallery` | Event photo gallery management |

---

## Security

- Passwords hashed before storage; sensitive fields encrypted at rest
- JWT-based session handling with expiry
- Payment slips contain bank details - files are stored outside the public web root and served only to authenticated admins and the owning athlete
- Uploads validated by MIME type and size; original filenames replaced with generated names
- HTTPS with TLS required in production
- Transaction rollback on failed writes to preserve database consistency
- Audit logs retained for administrative review

---

## Author

**Abeysooriya I. P**
BSc (Hons) Information Technology & Management
Faculty of Information Technology
University of Moratuwa

Developed for **Individual Project on Business Solutions**.

---

## Contact

For questions about this repository, integration support, or collaboration enquiries:

| | |
|---|---|
| **Email** | [ishariabeysooriya628@gmail.com](mailto:ishariabeysooriya628@gmail.com) |
| **LinkedIn** | [ishari-abeysooriya-628i](https://www.linkedin.com/in/ishari-abeysooriya-628i) |
| **GitHub** | [@Ishari-928](https://github.com/Ishari-928) |

**Bug reports and feature requests** - please open an issue on the relevant repository rather than emailing directly, so the discussion stays with the code:

- API issues → [AthleTech_Backend/issues](https://github.com/Ishari-928/AthleTech_Backend/issues)
- Admin panel issues → [AthleTech_Admin_Dashboard/issues](https://github.com/Ishari-928/AthleTech_Admin_Dashboard/issues)
- Public site issues → [AthleTech_Client_UI/issues](https://github.com/Ishari-928/AthleTech_Client_UI/issues)

**Security disclosures** - if you find a vulnerability, please report it privately by email rather than opening a public issue.

### Academic Supervision

- **Ms. B. N. N. T. Batagoda** - Lecturer, Faculty of Information Technology, University of Moratuwa
- **Mr. Chandeepa Pathirana** - Software Engineer, SimCentric Technologies