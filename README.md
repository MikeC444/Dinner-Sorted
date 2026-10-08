# Dinner Sorted

An iPhone and Android app that answers "what's for dinner?" It suggests meals from what's already in your kitchen, has thousands of recipes across many cuisines (via Spoonacular, Edamam and TheMealDB), filters for allergies, diet and tastes, and helps with weight goals. Free to use, with a Premium subscription (£6.99 a month or £74.99 a year with a 7-day free trial).

**New to this?** Start with [docs/LAUNCH_GUIDE.md](docs/LAUNCH_GUIDE.md). It walks through every account, key and step to get the app into the App Store and Google Play.

## What's in the box

| Part | Tech | Where |
|---|---|---|
| Mobile app (iOS and Android) | Expo SDK 57, React Native, TypeScript, Expo Router | `src/` |
| Sign-in, database, file storage | Supabase (Postgres with row-level security) | `supabase/migrations/` |
| Recipe service | Supabase Edge Function (Deno) combining Spoonacular, TheMealDB and Edamam | `supabase/functions/recipes/` |
| Subscriptions | RevenueCat (App Store and Google Play billing) | `src/lib/purchases.ts`, `supabase/functions/revenuecat-webhook/` |
| Account deletion | Edge Function (required by Apple and Google) | `supabase/functions/delete-account/` |
| Shared food logic | Allergen detection, diet checks, taste ranking, kitchen matching | `supabase/functions/_shared/domain.ts` |

### Screens

- **Sign-in:** Sign in with Apple (iOS), Google, or email with a 6-digit code.
- **Onboarding (4 steps):** how you eat (everything, pescatarian, vegetarian, vegan), allergies (the UK's 14 allergens plus anything typed in), food preferences (meats eaten, veg loved, cuisines, spice level, foods to avoid), and goal.
- **Tonight:** picks based on your tastes and kitchen, with a reason for each ("You like Indian food and spinach").
- **Kitchen:** type ingredients (commas for several) or tap from 99 in six groups. Then find dinners ranked by how much you already have.
- **Browse:** search, cuisines and filters. Allergies and diet are always applied.
- **Recipe:** photo, allergens, servings scaling, ingredients (with "Need" markers), step-by-step method, nutrition, cook mode, favourites, and "Report a problem".
- **Goals:** daily calorie target (Mifflin-St Jeor), dinner budget, BMI, healthy-weight warnings, a safe calorie floor, an adults-only check, and consent before storing health data.
- **Premium:** weekly meal plan and shopping list, progress tracking, full nutrition, extra filters, cook-mode timers, and unlimited kitchen searches and favourites.
- **Account:** diet, allergies, preferences, subscription, help and feedback (with screenshot), privacy and terms, sign out, delete account.

### Free vs Premium (enforced on the server)

| | Free | Premium |
|---|---|---|
| Recipes | A stable ~25% "starter" slice of every search | Everything |
| Kitchen searches | 3 a day | Unlimited |
| Allergy, diet and taste filtering | Yes | Yes |
| Calories and macros | Yes | Yes, plus fibre, sugar, salt and vitamins |
| Meal plans, shopping list, progress | No | Yes |
| Favourites | 10 | Unlimited |

## Running it on your computer

You need Node.js 20 or newer and the free Expo Go app (or a development build, see below).

```bash
npm install
cp .env.example .env.local      # then fill in your Supabase and RevenueCat keys
npx expo start
```

Sign-in with Apple and in-app purchases use native code, so they need a **development build** rather than Expo Go:

```bash
npx eas-cli@latest build --profile development --platform ios      # or android
```

### Backend setup (once)

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push                                     # creates tables, security rules and storage
cp supabase/.env.example supabase/.env                   # add provider keys and webhook secret
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy recipes
npx supabase functions deploy delete-account
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
```

In the Supabase dashboard:
- **Authentication > Providers:** enable Apple, Google and Email.
- **Authentication > Email templates > Magic Link:** include `{{ .Token }}` so emails contain the 6-digit code.
- **Authentication > URL configuration:** add `dinnersorted://auth-callback` as a redirect URL.

## Checks

```bash
npm run typecheck                     # TypeScript across the whole app
npm test                              # 17 unit tests: allergens, diets, tastes, kitchen matching, calorie maths
deno test supabase/functions/tests    # provider normalisers (Spoonacular, TheMealDB, Edamam)
```

## Changing things

- **Prices:** set them in App Store Connect and Google Play Console. The app shows the store's prices (the fallback text is in `src/lib/purchases.ts`).
- **Free-plan limits:** `FREE_KITCHEN_SEARCHES_PER_DAY` and `isFreeRecipe` in `supabase/functions/_shared/domain.ts`, and the favourites limit in the migration.
- **Colours and fonts:** `src/theme.ts`. Fonts are Bricolage Grotesque (headings) and DM Sans (text).
- **App icon:** `scripts/make-icons.py` redraws every icon from the logo.
- **App name and IDs:** `app.json` (`name`, `ios.bundleIdentifier`, `android.package`).

## Important notes

- **Allergens.** Detection is deliberately cautious: it uses each recipe's listed ingredients plus provider labels, and treats anything uncertain (such as stock cubes and curry pastes) as containing the allergen. Brands still vary, so the app tells people to check labels. Get legal advice on the wording before launch.
- **Health data.** Weight and goals are special category data under UK GDPR. The app asks for consent before saving them, and people can delete everything from Account.
- **Recipe providers.** Each provider has terms on caching, attribution and commercial use. Check them and pick paid plans before launch (see the launch guide).
