// Subscriptions through RevenueCat, which wraps the App Store and Google Play billing.
// Products: monthly (£6.99) and yearly (£74.99, 7-day free trial) attached to an entitlement called "premium".

import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { env } from './env';

export const ENTITLEMENT = 'premium';
let configured = false;

function apiKey(): string {
  return Platform.OS === 'ios' ? env.revenueCatIos : Platform.OS === 'android' ? env.revenueCatAndroid : '';
}

export function purchasesAvailable(): boolean {
  return Boolean(apiKey());
}

export function hasPremium(info: CustomerInfo | null | undefined): boolean {
  return Boolean(info?.entitlements.active[ENTITLEMENT]);
}

/** Call once a person has signed in. Their Supabase user id becomes their RevenueCat id, so the webhook can find them. */
export async function startPurchases(userId: string, onChange: (premium: boolean) => void): Promise<void> {
  if (!purchasesAvailable()) return;
  if (!configured) {
    Purchases.configure({ apiKey: apiKey(), appUserID: userId });
    Purchases.addCustomerInfoUpdateListener((info) => onChange(hasPremium(info)));
    configured = true;
  } else {
    await Purchases.logIn(userId);
  }
  onChange(hasPremium(await Purchases.getCustomerInfo()));
}

export async function stopPurchases(): Promise<void> {
  if (!configured) return;
  try { await Purchases.logOut(); } catch { /* already anonymous */ }
}

export interface PlanOption {
  id: 'annual' | 'monthly';
  pkg: PurchasesPackage | null;
  price: string;        // from the store, e.g. "£74.99"
  period: string;       // "a year" / "a month"
  trial: string | null; // e.g. "7-day free trial"
  perMonth: string | null; // e.g. "£6.25"
}

/** Store prices with fallbacks so the paywall still renders in development. */
export async function loadPlans(): Promise<PlanOption[]> {
  let annual: PurchasesPackage | null = null;
  let monthly: PurchasesPackage | null = null;
  if (purchasesAvailable() && configured) {
    try {
      const offerings = await Purchases.getOfferings();
      annual = offerings.current?.annual ?? null;
      monthly = offerings.current?.monthly ?? null;
    } catch { /* show fallbacks */ }
  }
  const trialText = (p: PurchasesPackage | null) => {
    const intro = p?.product.introPrice;
    if (!intro || intro.price !== 0) return p ? null : '7-day free trial';
    const n = intro.periodNumberOfUnits;
    const unit = intro.periodUnit.toLowerCase();
    return `${n}-${unit.replace(/s$/, '')} free trial`;
  };
  return [
    { id: 'annual', pkg: annual, price: annual?.product.priceString ?? '£74.99', period: 'a year', trial: trialText(annual),
      perMonth: annual ? annual.product.pricePerMonthString : '£6.25' },
    { id: 'monthly', pkg: monthly, price: monthly?.product.priceString ?? '£6.99', period: 'a month', trial: null, perMonth: null },
  ];
}

export async function buy(plan: PlanOption): Promise<boolean> {
  if (!plan.pkg) throw new Error('Subscriptions are not set up yet in this build.');
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    return hasPremium(customerInfo);
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (!configured) return false;
  return hasPremium(await Purchases.restorePurchases());
}

export async function manageSubscription(): Promise<void> {
  if (configured) await Purchases.showManageSubscriptions();
}
