# No Limit Fitness Client Portal — Production Runbook

## Current release status

The app is stable as a localStorage-first frontend with Supabase/Auth/Sync readiness added.

The app currently supports:

- Login-first flow
- Demo Preview mode
- Coach Portal mode
- Client Portal mode
- Client management
- Workout plan builder
- Workout tracker
- Workout log details
- Messaging/unread flags
- Notification preferences
- Exercise Library
- Progress tracking
- Supabase-safe auth panel
- Supabase-ready sync payload utility

## Daily development commands

Start the local app:

```cmd
cd /d "C:\Users\Cody O\Desktop\no-limit-fitness-client"
npm.cmd run dev
```

Run the full stable regression suite:

```cmd
npm.cmd run test:stable:headed
```

Run the final release check:

```cmd
npm.cmd run check:release:headed
```

Build for production:

```cmd
npm.cmd run build
```

## Environment variables

Supabase is optional right now. The frontend should not crash if env values are missing.

Use `.env.local` for frontend-safe keys only:

```text
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Alternative supported key:

```text
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never place service-role keys, private API keys, Resend secret keys, or SendGrid secret keys directly in the React frontend.

## Release checklist

Before using the app with real clients:

1. Run `npm.cmd run test:stable:headed`.
2. Run `npm.cmd run build`.
3. Confirm `git status` says the working tree is clean.
4. Open the app locally and click through Home, Clients, Plans, Tracker, Messages, Exercises, Progress, and Login.
5. Confirm Login/Auth panel does not crash without Supabase env values.
6. Confirm client, plan, workout log, and message data persists after refresh.
7. Confirm Clear Local Data restores starter data.
8. Confirm no secret backend keys exist in frontend files.
9. Commit the final release checkpoint.

## Current architecture rule

The app stays localStorage-first until live Supabase data sync is intentionally turned on.

Supabase/Auth work is guarded and ready, but real production sync should stay behind safe helper functions and tests.

## Final stable command

```cmd
npm.cmd run test:stable:headed
```

## Final release command

```cmd
npm.cmd run check:release:headed
```
