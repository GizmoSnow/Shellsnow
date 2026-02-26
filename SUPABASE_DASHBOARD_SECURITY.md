# Supabase Dashboard Security Configuration

This document outlines security configurations that must be set in the Supabase Dashboard. These settings cannot be configured via database migrations and require manual adjustment in the project settings.

## Required Dashboard Configurations

### 1. Auth Database Connection Strategy

**Issue**: Your Auth server uses a fixed connection limit (10 connections) instead of percentage-based allocation.

**Impact**: Increasing your database instance size won't automatically improve Auth server performance since the connection count is hardcoded.

**How to Fix**:
1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** > **Database** > **Connection Pooling**
3. Change the Auth connection allocation strategy from **fixed count** to **percentage-based**
4. This allows the Auth server to scale connections automatically with your database instance

**Recommended Setting**: Allocate 10-20% of total connections to Auth

---

### 2. Enable Leaked Password Protection

**Issue**: Protection against compromised passwords is currently disabled.

**Impact**: Users can set passwords that have been exposed in data breaches, making accounts vulnerable to credential stuffing attacks.

**How to Fix**:
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Settings** > **Password**
3. Enable **"Leaked Password Protection"**
4. This integrates with HaveIBeenPwned.org to check passwords against known breaches

**Benefits**:
- Prevents users from using compromised passwords
- Protects against credential stuffing attacks
- Increases overall account security

---

### 3. Review Anonymous Sign-Ins Configuration

**Issue**: Supabase has flagged potential concerns about anonymous access policies.

**Current Protection**: Database-level policies block all anonymous access to the roadmaps table.

**Review Required**:
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Settings** > **Auth Providers**
3. Check if **"Enable anonymous sign-ins"** is enabled
4. Decide if anonymous access is needed for your application

**Recommendations**:
- **If not needed**: Disable anonymous sign-ins completely
- **If needed**: Keep current database policies that block anonymous access to sensitive data
- The roadmaps table already has restrictive policies preventing anonymous access

---

## Database-Level Protections Already Applied

The following security measures have been implemented at the database level:

### ✅ Optimized RLS Policies
- All policies use `(select auth.uid())` for optimal performance
- Prevents function re-evaluation for every row
- Significantly improves query performance at scale

### ✅ Removed Duplicate Policies
- Eliminated duplicate SELECT and INSERT policies
- Cleaner policy structure
- Easier to maintain and audit

### ✅ Anonymous Access Blocked
- Restrictive policy blocks all anonymous access to roadmaps
- Defense-in-depth approach
- Works even if anonymous sign-ins are accidentally enabled

### ✅ Authentication Required
- All operations require authenticated users
- NULL checks ensure valid user IDs
- Users can only access their own data

---

## Security Best Practices

1. **Regularly Review Policies**: Audit RLS policies quarterly
2. **Monitor Failed Access Attempts**: Set up logging for security events
3. **Keep Dependencies Updated**: Regularly update Supabase client libraries
4. **Enable MFA**: Encourage or require multi-factor authentication for users
5. **Rate Limiting**: Configure rate limits in Supabase Dashboard
6. **Audit Logs**: Review authentication and database access logs regularly

---

## Next Steps

1. Apply the dashboard configurations listed above
2. Test authentication flows after making changes
3. Verify that anonymous access is properly blocked
4. Monitor performance improvements from RLS optimization
5. Set up alerting for security events

---

## Support

For more information:
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth)
- [Database Advisors](https://supabase.com/docs/guides/database/database-advisors)
