import crypto from 'node:crypto';
import fs from 'node:fs';

export function sha256(contents: string): string {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

export function readFileHashIfPresent(filePath: string): string | undefined {
  if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
    return undefined;
  }

  return sha256(fs.readFileSync(filePath, 'utf8'));
}
