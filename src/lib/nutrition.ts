// Calorie target maths. Pure functions, unit-tested in tests/nutrition.test.ts.
// Uses the Mifflin-St Jeor equation, an activity multiplier, and a safe floor on daily calories.

export type Sex = 'f' | 'm';
export type Activity = 'low' | 'light' | 'active';
export type Pace = 0.25 | 0.5 | 0.75;

export interface Goal {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetKg: number;
  activity: Activity;
  pace: Pace; // kg per week
}

export interface GoalResult {
  mode: 'lose' | 'gain' | 'maintain';
  bmi: number;
  targetBmi: number;
  dailyKcal: number;
  dinnerKcal: number;
  weeks: number | null;
  reachDate: Date | null;
  /** True when the requested pace would take them under the safe minimum. */
  floorApplied: boolean;
  floorKcal: number;
  /** Lowest weight in the healthy BMI range for their height, if the target is below it. */
  lowestHealthyKg: number | null;
}

export const ACTIVITY_FACTOR: Record<Activity, number> = { low: 1.2, light: 1.375, active: 1.55 };
const KCAL_PER_KG = 7700;
/** Share of the day's calories suggested for dinner. */
export const DINNER_SHARE = 0.35;

export type GoalCheck = { ok: true } | { ok: false; reason: 'incomplete' | 'minor' | 'out_of_range' };

export function checkGoal(g: Partial<Goal>): GoalCheck {
  const { age, heightCm, weightKg, targetKg } = g;
  if (![age, heightCm, weightKg, targetKg].every((x) => typeof x === 'number' && isFinite(x) && x > 0)) return { ok: false, reason: 'incomplete' };
  if (age! < 18) return { ok: false, reason: 'minor' };
  if (age! > 100 || heightCm! < 120 || heightCm! > 230 || weightKg! < 35 || weightKg! > 300 || targetKg! < 35 || targetKg! > 300) {
    return { ok: false, reason: 'out_of_range' };
  }
  return { ok: true };
}

export function bmr(g: Goal): number {
  return 10 * g.weightKg + 6.25 * g.heightCm - 5 * g.age + (g.sex === 'm' ? 5 : -161);
}

export function calcGoal(g: Goal, today: Date = new Date()): GoalResult {
  const hm = g.heightCm / 100;
  const bmi = g.weightKg / (hm * hm);
  const targetBmi = g.targetKg / (hm * hm);
  const tdee = bmr(g) * ACTIVITY_FACTOR[g.activity];
  const diff = g.targetKg - g.weightKg;
  const mode: GoalResult['mode'] = diff < -0.5 ? 'lose' : diff > 0.5 ? 'gain' : 'maintain';
  const delta = (g.pace * KCAL_PER_KG) / 7;
  const floorKcal = g.sex === 'm' ? 1500 : 1200;

  let daily = tdee;
  let floorApplied = false;
  if (mode === 'lose') {
    daily = Math.max(tdee - delta, floorKcal);
    floorApplied = tdee - delta < floorKcal;
  } else if (mode === 'gain') {
    daily = tdee + Math.min(delta, 500);
  }
  const effPace = Math.abs(daily - tdee) * 7 / KCAL_PER_KG;
  const dailyKcal = Math.round(daily / 10) * 10;
  const dinnerKcal = Math.round((dailyKcal * DINNER_SHARE) / 10) * 10;

  let weeks: number | null = null;
  let reachDate: Date | null = null;
  if (mode !== 'maintain' && effPace > 0.05) {
    weeks = Math.ceil(Math.abs(diff) / effPace);
    reachDate = new Date(today.getTime());
    reachDate.setDate(reachDate.getDate() + weeks * 7);
  }

  const lowestHealthyKg = targetBmi < 18.5 ? Math.ceil(18.5 * hm * hm) : null;
  return { mode, bmi, targetBmi, dailyKcal, dinnerKcal, weeks, reachDate, floorApplied, floorKcal, lowestHealthyKg };
}

export function cmToFtIn(cm: number): string {
  if (!(cm > 0)) return '';
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)} ft ${inches % 12} in`;
}

export function kgToStLb(kg: number): string {
  if (!(kg > 0)) return '';
  const lb = Math.round(kg * 2.20462);
  return `${Math.floor(lb / 14)} st ${lb % 14} lb`;
}
