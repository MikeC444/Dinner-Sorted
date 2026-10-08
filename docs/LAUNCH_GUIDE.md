# Dinner Sorted: launch guide

This guide takes you from this code to a live app in the App Store and Google Play. Do the steps in order. Anything in `CAPITALS_LIKE_THIS` is a placeholder for your own value.

> You don't need a Mac. Expo's cloud service (EAS) builds the iPhone and Android versions for you.

---

## 1. Accounts you'll need

| Account | What it's for | Cost |
|---|---|---|
| [Apple Developer Program](https://developer.apple.com/programs/) | Publishing on the App Store | Yearly fee (99 USD; shown in GBP when you sign up) |
| [Google Play Console](https://play.google.com/console/signup) | Publishing on Google Play | One-off 25 USD |
| [Expo](https://expo.dev/signup) | Cloud builds and submitting to the stores | Free plan is enough to start |
| [Supabase](https://supabase.com) | Sign-in, database, storage, server functions | Free plan to start; paid plan when you grow |
| [RevenueCat](https://www.revenuecat.com) | Subscriptions on both stores | Free until you reach their revenue threshold, then a small percentage |
| [Spoonacular](https://spoonacular.com/food-api) | Main recipe source (photos, steps, nutrition) | Free for development; paid plan for launch |
| [Edamam Recipe Search API](https://developer.edamam.com) | Extra recipes and nutrition | Paid plan for launch |
| [TheMealDB](https://www.themealdb.com/api.php) | Extra recipes with photos and steps | Supporter key for launch |

Check each provider's current prices and terms before you commit. They change often.

**Store commission:** Apple and Google keep a share of each subscription payment, typically 15% for small businesses. Join Apple's App Store Small Business Program to qualify.

**Tip:** if you'll publish as a business, set up both store accounts as an *organisation* (you'll need a D-U-N-S number, which is free). Google requires *personal* Play accounts to run a closed test with at least 12 testers for 14 days before you can publish. Organisation accounts skip this.

---

## 2. Supabase (sign-in and database)

1. Create a new project in the **London (eu-west-2)** region, to keep UK users' data in the UK.
2. **Project settings > API:** copy the **Project URL** and **anon public key**. You'll use them in step 7.
3. On your computer, in the project folder:
   ```bash
   npm install
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
   This creates every table, the security rules (people can only ever see their own data), and the private screenshot storage.
4. **Authentication > Providers:** turn on **Email**, **Apple** and **Google** (steps 6a and 6b explain the Apple and Google settings).
5. **Authentication > Email templates > Magic Link:** change the email so it includes the code, for example: `Your Dinner Sorted code is {{ .Token }}`.
6. **Authentication > URL configuration > Redirect URLs:** add `dinnersorted://auth-callback`.

---

## 3. Recipe provider keys

1. Sign up for Spoonacular, Edamam (Recipe Search API) and TheMealDB, and get your keys.
2. Copy `supabase/.env.example` to `supabase/.env` and fill it in. Also make up a long random password for `REVENUECAT_WEBHOOK_SECRET`.
3. Upload the secrets and deploy the server functions:
   ```bash
   npx supabase secrets set --env-file supabase/.env
   npx supabase functions deploy recipes
   npx supabase functions deploy delete-account
   npx supabase functions deploy revenuecat-webhook --no-verify-jwt
   ```

**Provider terms to check before launch:**
- How long you're allowed to keep (cache) their data. The app keeps it for 1 hour by default (`CACHE_TTL_HOURS`).
- Attribution. Each recipe already shows "Recipe from [source]" with a link. Edamam also requires its "Powered by Edamam" badge wherever their recipes appear; add it if you use Edamam.
- Commercial use is allowed on the plan you choose.
- Any provider can be left out: if its key isn't set, the app simply skips it.

---

## 4. Subscription products in the stores

Create the same two products in both stores. Suggested product IDs:

| Product | ID | Price | Trial |
|---|---|---|---|
| Monthly | `ds_premium_monthly` | £6.99 / month | None |
| Yearly | `ds_premium_annual` | £74.99 / year | 7-day free trial |

**App Store Connect** (after step 8 creates the app record): go to **Subscriptions**, create a subscription group called "Dinner Sorted Premium", and add both products. On the yearly product, add an **introductory offer**: free, 1 week. Fill in the display names and descriptions. Apple reviews these too.

**Google Play Console** (after the first upload in step 9): go to **Monetise > Subscriptions**, create both products, each with a base plan (monthly and yearly auto-renewing). On the yearly base plan, add an **offer** for a 7-day free trial for new customers.

---

## 5. RevenueCat (one place for both stores)

1. Create a project and add an **App Store** app and a **Play Store** app. Follow RevenueCat's prompts to connect each store: an App Store Connect API key for Apple, and a Google service account for Google.
2. **Entitlements:** create one called exactly `premium`, and attach both products from both stores.
3. **Offerings:** make the *default* offering contain an **Annual** package (yearly product) and a **Monthly** package (monthly product).
4. **API keys:** copy the public **Apple** key (`appl_...`) and **Google** key (`goog_...`) for step 7.
5. **Integrations > Webhooks:** add a webhook with:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header: the same `REVENUECAT_WEBHOOK_SECRET` value you used in step 3.

The app logs in to RevenueCat with each person's account ID, so the server always knows who has Premium.

---

## 6. Social sign-in

### 6a. Sign in with Apple
1. In the [Apple Developer portal](https://developer.apple.com/account/resources/identifiers/list), open your app's identifier (created in step 8) and tick **Sign in with Apple**.
2. In Supabase (**Authentication > Providers > Apple**), turn it on and add your bundle ID (`com.yourcompany.dinnersorted`) as an authorised client ID. Native sign-in on iPhone doesn't need the extra web secret.

### 6b. Google
1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
2. Add the redirect URL Supabase shows you (`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`).
3. Paste the client ID and secret into Supabase (**Authentication > Providers > Google**).

---

## 7. Configure the app

1. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key, both RevenueCat keys, your support email, and the links to your privacy policy and terms (step 11).
2. In `app.json`, replace `com.yourcompany.dinnersorted` (in two places) with your own reverse-domain ID, for example `uk.co.yourcompany.dinnersorted`. **This can't be changed after you publish.**
3. Link the project to Expo:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init        # fills in the project ID in app.json
   ```
4. Add the same `EXPO_PUBLIC_...` values as **EAS environment variables** (expo.dev > your project > Environment variables) for the *preview* and *production* environments, so cloud builds get them.

---

## 8. Try it on your phone

```bash
npx eas-cli@latest build --profile development --platform ios       # or android
```

EAS gives you a link or QR code to install the build. Then run `npx expo start` on your computer and open the project in the installed app. On iPhone, EAS walks you through registering your device the first time.

Things to try:
- Sign up, complete all 4 onboarding steps, add allergies, and check that matching recipes never appear.
- Type ingredients in the Kitchen and run three searches: the fourth should open the Premium screen.
- Buy Premium with a **sandbox / test account**. Apple: Settings > Developer > Sandbox account. Google: add licence testers in Play Console. Check that meal plans unlock.
- Send feedback with a screenshot, then find it in Supabase (**Table editor > feedback**).
- Delete your account in Account and check that you're signed out.

---

## 9. Build and submit

```bash
npm run build:prod         # builds both iOS and Android in the cloud
npm run submit:ios         # uploads to App Store Connect (TestFlight)
npm run submit:android     # uploads to Google Play (internal testing track)
```

- **iOS:** EAS creates your certificates automatically. The first `submit` asks you to create the app in App Store Connect if it doesn't exist. Fill in `ascAppId` and `appleId` in `eas.json` to skip the questions next time.
- **Android:** the very first upload must be done by hand in Play Console (download the `.aab` from expo.dev). After that, create a [Google service account key](https://docs.expo.dev/submit/android/), save it as `google-play-service-account.json` (it's git-ignored), and `submit` works automatically.
- **Updates:** small JavaScript-only fixes can go out instantly with `npx eas-cli@latest update`. Anything that changes native code needs a new build and store review.

---

## 10. Store listings

### Both stores
- **Name:** Dinner Sorted. **Subtitle / short description:** "Dinner ideas from what you've got".
- **Screenshots:** at least 3 per platform. Use the Tonight, Kitchen results, Recipe and Goals screens.
- **Privacy policy URL** and **support URL** (step 11).
- **Category:** Food & Drink (or Health & Fitness).
- **Age rating:** set the target audience to **18+**. The weight tools are adults-only, and this avoids the stricter rules for apps aimed at children.

### Apple: App Privacy ("nutrition label")
Declare: **Contact info** (email), **Health and fitness** (weight, height and goals; linked to the user and used for app functionality), **User content** (feedback and screenshots), **Identifiers** (user ID), and **Purchases**. Nothing is used for tracking or advertising.

### Google Play: Data safety and declarations
Declare the same data types. Data is encrypted in transit, and people can request deletion (in-app). Also complete the **Health apps** declaration (the app gives nutrition and weight guidance) and the content rating questionnaire.

### Notes for app review
- Reviewers can sign in with **Sign in with Apple** or **Google**. (Email codes can't be received by reviewers, so don't rely on email sign-in for them.)
- Explain: "Premium is a subscription managed by the App Store. Allergy filtering is free for everyone."
- Apple requires the price, length and auto-renewal terms on the purchase screen, plus links to terms and privacy. The paywall already shows these, once your URLs are set in `.env`.

---

## 11. Legal checklist before launch

- [ ] **Privacy policy:** what you collect (email, food preferences, allergies, weight data, feedback), why, where it's stored (Supabase, London), who processes it (Supabase, RevenueCat, Apple/Google, recipe providers receive only search terms), how long you keep it, and how to delete it.
- [ ] **Terms of use**, including that nutrition and allergen information is a guide only.
- [ ] **ICO data protection fee:** most UK organisations that process personal data must register and pay it. Check on the ICO website.
- [ ] **Health data:** weight and goals are special category data. The app asks for explicit consent before saving them. Mention the lawful basis in your privacy policy.
- [ ] **Allergen wording:** have a solicitor check the in-app warnings, given the risk if a recipe's data is wrong.
- [ ] **Trademark search** on "Dinner Sorted" and the logo at the UK IPO before you spend on marketing.
- [ ] **Recipe providers:** a commercial plan and attribution for each provider you use.

---

## 12. After launch

- **Feedback:** every report lands in Supabase (**Table editor > feedback**) with a reference number, category, device details and any screenshot (**Storage > feedback-screenshots**). Update `status` as you work through them.
- **Subscribers:** RevenueCat's dashboard shows trials, conversions, cancellations and revenue.
- **Usage:** `usage_counters` shows how many free kitchen searches people use. This is useful for tuning the free plan.

---

## What has and hasn't been tested

**Tested while building:**
- The app type-checks.
- The iOS and Android bundles build.
- Unit tests pass for allergen detection, diet and taste filtering, kitchen matching, calorie maths and the ingredient catalogue.
- The provider normalisers pass tests against sample responses.
- The database migration was applied to a real Postgres database, with checks of the security rules, free-plan limits, the premium-only tables and account-deletion cascades.

**Needs your keys and devices:**
- Live recipe searches against Spoonacular, Edamam and TheMealDB.
- Real Apple and Google sign-in.
- Sandbox purchases.
- Running on an actual phone.

Section 8 covers all of these.
