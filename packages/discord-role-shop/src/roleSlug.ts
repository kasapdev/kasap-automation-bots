/**
 * Turns a role name into the slug used as the /buy command's role argument, e.g.
 * "VIP Uye" -> "vip-uye". Lowercases, strips diacritics so Turkish characters map to
 * their closest ASCII letter, replaces runs of whitespace/punctuation with a single
 * hyphen, and trims leading/trailing hyphens.
 */
export function slugifyRoleName(roleName: string): string {
  return roleName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks left by NFKD
    .toLowerCase()
    .replace(/ı/g, "i") // Turkish dotless i (i) has no diacritic decomposition
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
