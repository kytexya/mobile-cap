/**
 * Robustly extracts an array from various API response structures.
 * Handles:
 * - Direct array: [ ... ]
 * - Nested in value: { value: [ ... ] }
 * - Nested in data: { data: [ ... ] }
 * - Double nested: { data: { items: [ ... ] } }
 * - Generic keys: { items: [ ... ], records: [ ... ], result: [ ... ], payload: [ ... ] }
 */
export const extractArray = <T>(payload: any, depth = 0): T[] => {
  if (!payload || depth > 5) return [];

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (typeof payload !== 'object') return [];

  const candidates = [
    payload.value,
    payload.data,
    payload.result,
    payload.payload,
    payload.items,
    payload.records,
    payload.students, // Common in attendance
    payload.content,
    payload.data?.value,
    payload.data?.data,
    payload.data?.items,
    payload.data?.records,
    payload.data?.students,
    payload.result?.data,
    payload.payload?.data,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) return candidate as T[];
    // Recursively check if the candidate is an object that might contain the array
    if (typeof candidate === 'object') {
      const nested = extractArray<T>(candidate, depth + 1);
      if (nested.length > 0) return nested;
    }
  }

  return [];
};

/**
 * Robustly extracts a single object from various API response structures.
 */
export const extractObject = <T>(payload: any, depth = 0): T | null => {
  if (!payload || depth > 5) return null;

  // If it's an array, take the first element if it's an object
  if (Array.isArray(payload)) {
    if (payload.length > 0 && typeof payload[0] === 'object' && !Array.isArray(payload[0])) {
      return payload[0] as T;
    }
    return null;
  }

  if (typeof payload !== 'object') return null;

  // If it looks like a direct DTO (has multiple specific keys), return it
  // We can't know for sure, so we check for common non-wrapper keys
  const keys = Object.keys(payload);
  const isWrapper = keys.length <= 3 && (keys.includes('value') || keys.includes('data') || keys.includes('success') || keys.includes('message'));

  if (!isWrapper && keys.length > 0) {
    return payload as T;
  }

  const candidates = [
    payload.value,
    payload.data,
    payload.result,
    payload.payload,
    payload.sheet, // specific to attendance
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as T;
    }
    // If candidate is a wrapper too, recurse
    const nested = extractObject<T>(candidate, depth + 1);
    if (nested) return nested;
  }

  return null;
};
