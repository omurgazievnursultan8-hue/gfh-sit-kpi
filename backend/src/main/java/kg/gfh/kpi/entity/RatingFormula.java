package kg.gfh.kpi.entity;

/**
 * Four KPI rating formulas. All enforce MAX(0, result) floor.
 *
 * Variables:
 *   P  = sum of (positive_raw_value * weight / 100) for all positive criteria
 *   A  = sum of (anti_bonus_raw_value * weight / 100) for all anti-bonus criteria
 *   Aw = sum of anti_bonus weights
 *   Ab = number of anti-bonus incidents (raw integer count)
 *
 * FORMULA_1: P - A                          (direct deduction, most common)
 * FORMULA_2: P * (1 - A/100)               (proportional reduction)
 * FORMULA_3: P - (Ab * Aw / workingDays)   (incidents × daily rate)
 * FORMULA_4: MAX(0, P - A) / P * 100       (efficiency percentage)
 */
public enum RatingFormula {
    FORMULA_1, FORMULA_2, FORMULA_3, FORMULA_4
}
