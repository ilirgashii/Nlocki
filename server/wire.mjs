export function encode(value) {
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (value && typeof value.toText === "function")
    return { $principal: value.toText() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, encode(v)]),
    );
  return value;
}
export function decode(value) {
  if (value && typeof value === "object") {
    if (
      Object.keys(value).length === 1 &&
      typeof value.$bigint === "string" &&
      /^-?\d{1,30}$/.test(value.$bigint)
    )
      return BigInt(value.$bigint);
    if (Object.keys(value).length === 1 && typeof value.$principal === "string")
      return value.$principal;
    if (Array.isArray(value)) return value.map(decode);
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, decode(v)]),
    );
  }
  return value;
}
