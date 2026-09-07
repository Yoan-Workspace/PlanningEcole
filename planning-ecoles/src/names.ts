export function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('fr-FR') === b.trim().toLocaleLowerCase('fr-FR')
}

export function withoutName(list: string[], name: string): string[] {
  return list.filter((item) => !sameName(item, name))
}

export function withName(list: string[], name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed || list.some((item) => sameName(item, trimmed))) return list
  return [...list, trimmed]
}
