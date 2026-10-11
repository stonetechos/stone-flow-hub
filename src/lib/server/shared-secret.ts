import { createHmac, timingSafeEqual } from "crypto";

/** Compare a supplied shared secret without leaking its length or contents. */
export function matchesSharedSecret(
  supplied: string | null,
  expected: string | undefined,
): boolean {
  if (supplied === null || !expected) return false;

  const suppliedDigest = createHmac("sha256", expected).update(supplied).digest();
  const expectedDigest = createHmac("sha256", expected).update(expected).digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}
