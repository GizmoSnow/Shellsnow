# Google OAuth Setup Instructions

Follow these steps to enable Google sign-in for your Success Path Builder application.

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top, then click "New Project"
3. Enter a project name (e.g., "Success Path Builder")
4. Click "Create"

## 2. Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

## 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - **App name**: Success Path Builder
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the "Scopes" page, click "Save and Continue" (default scopes are sufficient)
7. On the "Test users" page, add your email for testing, then click "Save and Continue"
8. Review and click "Back to Dashboard"

## 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Enter a name (e.g., "Success Path Builder Web Client")
5. Under "Authorized JavaScript origins", add:
   - `http://localhost:5173` (for local development)
   - Your production domain (e.g., `https://yourdomain.com`)
6. Under "Authorized redirect URIs", you need to add your Supabase callback URLs

## 5. Get Your Supabase Callback URL

Your Supabase callback URL follows this format:
```
https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
```

To find your project reference:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to "Settings" > "API"
4. Your URL is shown under "Project URL"
5. The callback URL will be: `[YOUR-PROJECT-URL]/auth/v1/callback`

## 6. Add the Callback URL to Google

1. Back in Google Cloud Console credentials page
2. Under "Authorized redirect URIs", add:
   - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - For local development, also add: `http://localhost:54321/auth/v1/callback`
3. Click "Create"
4. You'll see your **Client ID** and **Client Secret** - keep these handy

## 7. Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to "Authentication" > "Providers"
4. Find "Google" in the list and click to expand it
5. Toggle "Enable Sign in with Google" to ON
6. Enter your Google OAuth credentials:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
7. Click "Save"

## 8. Test Your Integration

1. Start your development server
2. Go to the login or signup page
3. Click "Sign in with Google"
4. You should be redirected to Google's sign-in page
5. After signing in, you'll be redirected back to your dashboard

## Troubleshooting

### "redirect_uri_mismatch" Error
- Double-check that the redirect URI in Google Cloud Console exactly matches your Supabase callback URL
- Make sure there are no trailing slashes or typos

### "Access blocked: Authorization Error"
- Make sure you've added your email as a test user in the OAuth consent screen
- If in production, you may need to submit your app for verification

### Users Not Being Created
- Check your Supabase RLS policies to ensure authenticated users can insert into necessary tables
- Check the Supabase logs under "Logs" > "Auth logs" for any errors

## Security Notes

- Never commit your Google Client Secret to version control
- Store credentials securely in Supabase dashboard only
- Consider enabling additional security features like 2FA for your Google Cloud account
- Regularly review and rotate credentials if needed
