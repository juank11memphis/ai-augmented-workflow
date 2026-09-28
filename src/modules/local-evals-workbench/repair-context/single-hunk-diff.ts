export function applySingleHunkDiff(current: string, targetPath: string, representation: string): string {
  const lines = representation.split('\n').map(line => line.endsWith('\r') ? line.slice(0, -1) : line);
  if (lines.length < 4 || lines[0] !== `--- a/${targetPath}` || lines[1] !== `+++ b/${targetPath}`) throw new Error('Diff headers must name the selected file.');
  const hunk = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:.*)$/.exec(lines[2] ?? '');
  if (!hunk) throw new Error('Use exactly one supported diff hunk.');
  const oldStart = Number(hunk[1]), oldCount = Number(hunk[2] ?? 1), newCount = Number(hunk[4] ?? 1);
  if (!Number.isSafeInteger(oldStart) || oldStart < (oldCount === 0 ? 0 : 1) || !Number.isSafeInteger(oldCount) || !Number.isSafeInteger(newCount)) throw new Error('Invalid diff range.');
  const body = lines.slice(3).filter((line, index, all) => index < all.length - 1 || line !== '');
  if (!body.length || body.some(line => !/^[ +-]/.test(line)) || body.some(line => line.startsWith('@@'))) throw new Error('Use exactly one supported diff hunk.');
  const previous = body.filter(line => line[0] !== '+').map(line => line.slice(1));
  const next = body.filter(line => line[0] !== '-').map(line => line.slice(1));
  if (previous.length !== oldCount || next.length !== newCount || !body.some(line => line[0] === '-' || line[0] === '+')) throw new Error('Diff counts do not match.');
  const source = current.split('\n');
  const index = oldCount === 0 ? oldStart : oldStart - 1;
  if (index > source.length - (current.endsWith('\n') ? 1 : 0)) throw new Error('Diff range is outside the current file.');
  if (JSON.stringify(source.slice(index, index + oldCount)) !== JSON.stringify(previous)) throw new Error('Diff does not match the current file.');
  source.splice(index, oldCount, ...next);
  return source.join('\n');
}
