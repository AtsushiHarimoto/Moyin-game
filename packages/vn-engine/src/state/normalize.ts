export function isPlayerCharId(charId: string, playerId = 'player') {
  return charId === playerId;
}

export function normalizeRelationships(input: Record<string, number | Record<string, number>>, playerId = 'player') {
  return Object.keys(input || {})
    .filter(key => !isPlayerCharId(key, playerId))
    .sort()
    .reduce<Record<string, number | Record<string, number>>>((acc, key) => {
      const val = input[key];
      acc[key] = typeof val === 'object' ? { ...val } : Number(val ?? 0);
      return acc;
    }, {});
}
