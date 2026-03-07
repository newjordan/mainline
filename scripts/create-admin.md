# Creating the Admin User

This document explains how to create one or more admin users for the dashboard.

## Prerequisites

- Supabase project is created
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured in `.env.local`
- `ALLOWED_EMAILS` in `.env.local` includes the admin email(s)

## Method 1: Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project
3. Navigate to **Authentication** > **Users**
4. Click **Add User** > **Create new user**
5. Fill in:
   - **Email:** admin email address
   - **Password:** strong password (minimum 8 characters)
   - **Auto Confirm User:** ON (if you want immediate login)
6. Click **Create user**

The user can now log in at `/auth/login`.

## Method 2: App Sign-Up Page

1. Start the app: `npm run dev`
2. Open `http://localhost:3000/auth/sign-up`
3. Enter admin email and password
4. Submit the form
5. Confirm the email if confirmations are enabled in Supabase

## Verify Admin Access

1. Go to `http://localhost:3000/auth/login`
2. Log in with the admin credentials
3. Confirm redirect to dashboard routes
4. Confirm non-allowlisted emails are blocked

## Security Notes

- Use a password manager for admin credentials
- Keep `ALLOWED_EMAILS` restricted to trusted users
- Session cookies are HTTPOnly and secure in production
- Keep Supabase service role keys out of client-side code

## Troubleshooting

### "Invalid login credentials"

- Confirm the user exists in Supabase Auth > Users
- Confirm password is correct
- Check for accidental spaces in email input

### "Unauthorized" after login

- Confirm the email exists in `ALLOWED_EMAILS`
- Restart the dev server after editing `.env.local`

### "Email not confirmed"

- Confirm user in Supabase dashboard
- Or disable confirmation temporarily in Supabase email auth settings
