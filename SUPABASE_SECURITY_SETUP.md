# Supabase Security Configuration Guide

This guide covers important security settings that need to be configured in your Supabase Dashboard.

## Critical Security Issues to Fix

### 1. Auth DB Connection Strategy (Switch to Percentage-Based)

**Issue**: Your Auth server is using a fixed connection limit (10 connections) instead of a percentage-based allocation. This prevents the Auth server from scaling properly with your database instance.

**How to Fix**:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** > **Database**
4. Scroll down to **Connection pooling** section
5. Find the **Auth connection pooling** settings
6. Change the connection strategy from **Fixed** to **Percentage**
7. Set an appropriate percentage (recommended: **10-15%** of total connections)
8. Click **Save** to apply changes

**Why This Matters**: With a fixed connection limit, your Auth server cannot take advantage of additional resources if you upgrade your database instance. A percentage-based strategy automatically scales Auth connections with your database capacity.

---

### 2. Disable Anonymous Sign-ins

**Issue**: Anonymous sign-ins may be enabled, allowing users to create sessions without credentials. This is a security risk for most applications.

**How to Fix**:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Anonymous** in the providers list
5. Toggle it to **OFF** (if enabled)
6. Click **Save**

**Database Protection Applied**: ✅ A restrictive RLS policy has been added to block any anonymous access attempts at the database level.

**Why This Matters**: Anonymous sign-ins bypass authentication, creating potential security vulnerabilities. Unless your app specifically requires this feature, it should be disabled.

---

### 3. Enable Leaked Password Protection

**Issue**: Password breach protection via HaveIBeenPwned.org is currently disabled. This allows users to set passwords that have been compromised in data breaches.

**How to Fix**:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Policies**
4. Find the **Password Protection** section
5. Toggle **Enable breach password protection** to ON
6. This will automatically check passwords against the HaveIBeenPwned database
7. Changes are applied immediately

**Why This Matters**: Compromised passwords are a major security risk. Users often reuse passwords across multiple sites. If one site is breached, attackers can use those credentials on other services. Enabling this protection prevents users from setting passwords that are known to be compromised.

---

## Additional Recommended Security Settings

### 4. Email Confirmations (Optional but Recommended)

Currently, email confirmation is disabled. Consider enabling it for production:

1. Go to **Authentication** > **Providers** > **Email**
2. Toggle **Enable email confirmations** to ON
3. Configure email templates under **Authentication** > **Email Templates**

**Note**: This will require users to verify their email before accessing the application.

---

### 5. Rate Limiting (Highly Recommended)

Protect your Auth endpoints from brute force attacks:

1. Go to **Authentication** > **Rate Limits**
2. Configure appropriate limits:
   - **Sign up**: 5-10 attempts per hour per IP
   - **Sign in**: 10-20 attempts per hour per IP
   - **Password reset**: 5-10 attempts per hour per IP
3. Save changes

---

### 6. Session Management

Configure secure session settings:

1. Go to **Authentication** > **Settings**
2. Review and adjust:
   - **JWT expiry**: Default is 3600 seconds (1 hour) - reasonable for most apps
   - **Refresh token expiry**: Default is 2592000 seconds (30 days) - adjust based on security needs
   - **Minimum password length**: Currently set to 6 - consider increasing to 8+ for better security

---

### 7. Two-Factor Authentication (MFA)

Enable Multi-Factor Authentication for enhanced security:

1. Go to **Authentication** > **Policies**
2. Find **Multi-Factor Authentication (MFA)** section
3. Toggle **Enable MFA** to ON
4. Users can then enable 2FA in their account settings

---

## Security Checklist

Use this checklist to ensure all security measures are in place:

### Critical (Must Fix)
- [ ] Auth connection strategy set to percentage-based (10-15%)
- [ ] Anonymous sign-ins disabled in Dashboard
- [ ] Leaked password protection enabled

### Database Security (Already Applied ✅)
- [x] RLS policies reviewed and restrictive by default
- [x] Anonymous access blocked at database level
- [x] All policies require authenticated users with explicit checks

### Recommended
- [ ] Rate limiting configured for Auth endpoints
- [ ] Session timeouts configured appropriately
- [ ] Email confirmation enabled (if required for your use case)
- [ ] MFA enabled for enhanced security
- [ ] Google OAuth credentials secured (never in code)
- [ ] Service role key never exposed to client-side code
- [ ] HTTPS enforced for all production traffic

---

## Testing Security Settings

After applying these changes:

1. **Test Password Protection**:
   - Try signing up with a common compromised password like "password123"
   - Should be rejected with an appropriate error message

2. **Test Rate Limiting**:
   - Attempt multiple rapid sign-in attempts
   - Should be rate-limited after exceeding threshold

3. **Test Connection Scaling**:
   - Monitor Auth performance under load
   - Connection pool should scale with database resources

---

## Monitoring & Maintenance

Regularly review security settings:

1. Check **Auth logs** under **Logs** > **Auth logs** for suspicious activity
2. Monitor failed login attempts for potential brute force attacks
3. Review RLS policies whenever adding new tables or features
4. Keep Supabase client libraries updated to latest versions
5. Periodically rotate OAuth credentials

---

## Support & Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [RLS Policy Examples](https://supabase.com/docs/guides/auth/row-level-security)

If you encounter issues with any of these settings, check the Supabase Dashboard for error messages or contact Supabase support.
