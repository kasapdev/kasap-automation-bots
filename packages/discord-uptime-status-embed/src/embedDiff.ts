import type { StatusEmbed } from "./embedBuilder.js";

/**
 * Pure function: structurally compares two status embeds while deliberately
 * IGNORING `timestamp` (and `footer`, which is static text anyway) - two embeds
 * describing the same status should compare equal even though "checked at" always
 * changes between polls. Compares `title`, `color`, and each field's `name`/`value`
 * (order-sensitive, same length, same content).
 *
 * A field's `value` string embeds the latency (e.g. "🟢 Çevrimiçi (42ms)"), so a
 * latency change alone makes this return false even though `ok` didn't flip. That
 * is the intended, honest behavior: this function reports "did anything a viewer
 * would see change", not just up/down status. Callers that only care about the
 * up/down transition (e.g. to decide whether to log "durum değişti") should compare
 * on that basis themselves; this function's result is otherwise just an optional
 * optimization for skipping a no-op Discord edit call - callers are free to ignore
 * it and always edit anyway.
 */
export function embedsEqual(a: StatusEmbed, b: StatusEmbed): boolean {
  if (a.title !== b.title) return false;
  if (a.color !== b.color) return false;
  if (a.fields.length !== b.fields.length) return false;

  for (let i = 0; i < a.fields.length; i++) {
    const fieldA = a.fields[i];
    const fieldB = b.fields[i];
    if (fieldA === undefined || fieldB === undefined) return false;
    if (fieldA.name !== fieldB.name) return false;
    if (fieldA.value !== fieldB.value) return false;
  }

  return true;
}
