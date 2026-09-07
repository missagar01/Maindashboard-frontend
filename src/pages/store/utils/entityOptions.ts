/**
 * ERP entity/company codes available in store reports.
 * Reports default to "SR"; users can switch to "AL" or "PA".
 */

export type EntityCode = "SR" | "AL" | "PA";

export const ENTITY_OPTIONS: { value: EntityCode; label: string }[] = [
  { value: "SR", label: "SR" },
  { value: "AL", label: "AL" },
  { value: "PA", label: "PA" },
];

export const DEFAULT_ENTITY: EntityCode = "SR";

export function resolveEntity(value: unknown): EntityCode {
  if (typeof value === "string") {
    const upper = value.trim().toUpperCase();
    if (ENTITY_OPTIONS.some((option) => option.value === upper)) {
      return upper as EntityCode;
    }
  }
  return DEFAULT_ENTITY;
}
