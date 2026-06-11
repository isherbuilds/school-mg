export function normalizeSchoolSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");

  if (slug.length >= 3) {
    return slug;
  }

  return slug ? `${slug}-school` : "school";
}
