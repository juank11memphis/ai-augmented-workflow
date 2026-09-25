export class BoundedNdjsonParser {
  private pending = Buffer.alloc(0);
  private total = 0;
  private readonly events: unknown[] = [];
  constructor(private readonly lineLimit: number, private readonly totalLimit: number) {}
  push(chunk: Buffer): void {
    this.total += chunk.length;
    if (this.total > this.totalLimit) throw new Error('stdout-limit');
    this.pending = Buffer.concat([this.pending, chunk]);
    while (true) {
      const newline = this.pending.indexOf(10);
      if (newline < 0) break;
      const line = this.pending.subarray(0, newline);
      this.pending = this.pending.subarray(newline + 1);
      if (line.length > this.lineLimit) throw new Error('line-limit');
      this.events.push(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line)) as unknown);
      if (this.events.length > 1) throw new Error('event-count');
    }
    if (this.pending.length > this.lineLimit) throw new Error('line-limit');
  }
  finish(): unknown {
    if (this.pending.length || this.events.length !== 1) throw new Error('incomplete');
    return this.events[0];
  }
}
