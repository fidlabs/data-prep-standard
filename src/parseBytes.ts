const multipliers = {
  K: 1024,
  M: 1024 * 1024,
  G: 1024 * 1024 * 1024,
  T: 1024 * 1024 * 1024 * 1024,
  P: 1024 * 1024 * 1024 * 1024 * 1024,
};

/* parseBytes
 * Parses a string representing a number of bytes, with optional unit suffixes.
 * @returns {number} The number of bytes as an integer.
 */
export default function parseBytes(input: string): number {
  const matches = /^(\d*\.*\d*)\s*([KMGTP]{0,1})I{0,1}B{0,1}$/.exec(
    input.toUpperCase()
  );

  if (!matches || matches.length < 2 || matches[1] === undefined) {
    throw new Error("invalid byte length '" + input);
  }

  const [, value, unit] = matches;
  const multiplier = unit ? multipliers[unit as keyof typeof multipliers] : 1;

  return Math.round(parseFloat(value) * multiplier);
}
