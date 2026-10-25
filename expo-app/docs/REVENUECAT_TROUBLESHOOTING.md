# RevenueCat "Error Fetching Offerings" Troubleshooting

This document explains the root cause of "Error fetching offerings" errors and the steps to resolve them.

## Root Cause

The error `[RevenueCat] Error fetching offerings - None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect` typically indicates a **configuration mismatch** between:

1. **App Store Connect** subscription products
2. **RevenueCat dashboard** product configuration  
3. **The app's code** (entitlement IDs, offering identifiers, and product identifiers)

This is **not** a code bug — it's a platform configuration issue that must be resolved in external dashboards.

## Common Causes

### 1. App Store Connect Products Not Approved/Attached

**Symptom**: Products exist in RevenueCat dashboard but can't be fetched from StoreKit.

**Cause**: 
- Subscription products in App Store Connect are in "Missing Metadata", "Ready to Submit", or "Waiting for Review" status
- Products are approved but not attached to the specific app version being tested
- The Paid Applications Agreement is not signed or is expired

**Fix**:
1. Open [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **My Apps** → Your App → **Subscriptions**
3. Verify each product's status is **"Ready to Sell"** (green checkmark)
4. If products are pending review:
   - Complete all required metadata (display name, description, pricing)
   - Submit for review
5. Check **Agreements, Tax, and Banking** → **Paid Applications** agreement is active
6. Attach approved products to your current app version:
   - Go to **App Store Connect** → **My Apps** → Your App → **App Store** tab
   - Scroll to **In-App Purchases and Subscriptions** section
   - Add your subscription products

### 2. Product ID Mismatch

**Symptom**: RevenueCat dashboard shows product IDs that don't match App Store Connect.

**Cause**: The Product ID entered in RevenueCat doesn't exactly match the Product ID in App Store Connect (case-sensitive).

**Fix**:
1. In **App Store Connect** → **Subscriptions**, copy the exact Product ID (e.g., `com.yourapp.premium.monthly`)
2. In **RevenueCat Dashboard** → **Products** → Select the product
3. Verify the **Product Identifier** field exactly matches (character-for-character, including case)
4. If they don't match, update RevenueCat to match App Store Connect

### 3. Entitlement Configuration Mismatch

**Symptom**: Products are configured but the app doesn't recognize premium access.

**Cause**: The entitlement identifier in the app code doesn't match RevenueCat dashboard configuration.

**Expected Configuration**:
- **Code**: `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium` (see `expo-app/src/lib/env.ts`)
- **RevenueCat Dashboard**: Entitlement with identifier `premium` (or `Grant Access Pro`, both are supported)
- **Products**: All subscription products must be attached to this entitlement in RevenueCat

**Fix**:
1. In **RevenueCat Dashboard** → **Entitlements**, verify you have an entitlement named `premium` or `Grant Access Pro`
2. Verify all subscription products are attached to this entitlement
3. If using a different entitlement name, update `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` in your environment variables

### 4. Offering Configuration Issues

**Symptom**: Paywall fails to load even with valid products and entitlements.

**Cause**: 
- No "current" offering set in RevenueCat dashboard
- The offering specified in `EXPO_PUBLIC_REVENUECAT_OFFERING_IDENTIFIER` doesn't exist
- The offering exists but has no products attached

**Expected Configuration**:
- **Code**: `EXPO_PUBLIC_REVENUECAT_OFFERING_IDENTIFIER=Official Offering`
- **RevenueCat Dashboard**: An offering with lookup key `Official Offering` containing at least one product

**Fix**:
1. In **RevenueCat Dashboard** → **Offerings**
2. Create or locate an offering (e.g., "Official Offering")
3. Set its **Identifier/Lookup Key** to match `EXPO_PUBLIC_REVENUECAT_OFFERING_IDENTIFIER`
4. Attach your subscription products to this offering
5. Mark it as **Current** if it's the default offering

### 5. Sandbox/Test Store vs Production Mismatch

**Symptom**: Works in sandbox but fails in production (or vice versa).

**Cause**: 
- Test Store products configured in RevenueCat but app is using production App Store
- App Store products configured but testing with Sandbox account

**Fix**:
1. For **production/TestFlight**: Ensure offering uses App Store products (not Test Store)
2. For **sandbox testing**: Use Test Store products in RevenueCat or actual App Store products with sandbox accounts
3. Verify `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` is the correct key (starts with `appl_` for iOS)

### 6. StoreKit Configuration File Issues (Development)

**Symptom**: Errors during development with a local StoreKit configuration file.

**Cause**: StoreKit Configuration file in Xcode doesn't match RevenueCat products.

**Fix**:
1. In Xcode, open the StoreKit Configuration file (if one exists)
2. Ensure product IDs match exactly what's in RevenueCat
3. For testing, prefer using sandbox accounts against real App Store Connect products instead of StoreKit files

## Verification Checklist

Before opening the app, verify:

- [ ] **App Store Connect**: All products are "Ready to Sell" (green checkmark)
- [ ] **App Store Connect**: Paid Applications Agreement is signed and active
- [ ] **App Store Connect**: Products are attached to the app version being tested
- [ ] **RevenueCat Dashboard**: Product IDs exactly match App Store Connect (case-sensitive)
- [ ] **RevenueCat Dashboard**: Entitlement `premium` exists and has products attached
- [ ] **RevenueCat Dashboard**: Offering exists with products attached
- [ ] **RevenueCat Dashboard**: Offering lookup key matches `EXPO_PUBLIC_REVENUECAT_OFFERING_IDENTIFIER`
- [ ] **Environment Variables**: `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium`
- [ ] **Environment Variables**: `EXPO_PUBLIC_REVENUECAT_OFFERING_IDENTIFIER=Official Offering`

## Testing After Configuration Changes

1. **Wait 10-15 minutes** after making App Store Connect changes for them to propagate to StoreKit
2. **Force quit the app** completely
3. **Re-open the app** and navigate to the Premium screen
4. **Check Sentry** for any new offering configuration warnings

## Code Changes Made (Already Implemented)

The following improvements have been made to handle offering errors gracefully:

1. **Dedicated Sentry error handler** (`revenueCatErrorHandler.ts`):
   - Deduplicates RevenueCat errors (one event per minute per error type)
   - Tags errors with `revenuecat=true` for filtering
   - Categorizes offering configuration errors as warnings (not errors)
   - Adds context about likely causes

2. **Enhanced error handling** (`revenueCat.ts`, `presentRevenueCatPaywall.ts`):
   - Returns structured error types (not_configured, network_error, no_offerings, unknown)
   - Provides user-friendly error messages based on error type
   - Includes retry option for network errors
   - Shows detailed messages in development mode

3. **Improved PaywallScreen UX** (`PaywallScreen.tsx`):
   - Shows specific error messages instead of generic "unavailable" text
   - Provides "Try Again" button when offerings fail to load
   - Prevents app from being stuck without recourse
   - Guides users based on error type

## Still Need Help?

If you've verified all the above and still see errors:

1. **Check RevenueCat Dashboard** → **Debugger** for real-time API logs
2. **Test with a fresh sandbox test account** (not one that's been used extensively)
3. **Verify the API key** matches the platform and environment (iOS production key starts with `appl_`, not `test_`)
4. **Contact RevenueCat Support** with:
   - App bundle ID
   - Product IDs from App Store Connect
   - Screenshot of offering configuration in RevenueCat
   - Full error message from Sentry or logs

## Related Documentation

- [REVENUECAT.md](./REVENUECAT.md) - Overview of RevenueCat integration
- [REVENUECAT_BILLING_SETUP.md](./REVENUECAT_BILLING_SETUP.md) - Initial setup instructions
- [RevenueCat: Why are offerings empty?](https://rev.cat/why-are-offerings-empty) - Official troubleshooting guide
