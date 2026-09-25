import { randomBytes } from 'node:crypto';
export function runIdentity(now: number, random: () => string = () => randomBytes(16).toString('hex')): string {
  const suffix = random();
  if (!Number.isSafeInteger(now) || now < 0 || !/^[a-f0-9]{32}$/.test(suffix)) throw new Error('invalid-identity');
  return `${now.toString(16).padStart(14, '0')}-${suffix}`;
}
