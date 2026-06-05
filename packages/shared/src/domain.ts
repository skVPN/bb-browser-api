/**
 * Domain utility helpers.
 */

/**
 * 判断 hostname 是否在指定的根域下.
 *
 * @param hostname 子域名
 * @param rootDomain 根域名
 */
export function isUnderDomain(hostname: string, rootDomain: string): boolean {
  if (!hostname || !rootDomain) return false;
  const h = hostname.toLowerCase();
  const r = rootDomain.toLowerCase();
  return h === r || h.endsWith("." + r);
}
