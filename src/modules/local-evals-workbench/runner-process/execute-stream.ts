/** Serial UTF-8 NDJSON decoder. The caller awaits each accepted event before reading more bytes. */
export class BoundedExecuteStream {
  private pending = Buffer.alloc(0);
  private total = 0;
  private count = 0;
  constructor(private readonly limits: { readonly lineBytes: number; readonly stdoutBytes: number; readonly events: number }) {}

  async push(chunk: Buffer, consume: (event: unknown) => Promise<void>): Promise<void> {
    this.total += chunk.length;
    if (this.total > this.limits.stdoutBytes) throw new Error('stdout-limit');
    this.pending = Buffer.concat([this.pending, chunk]);
    while (true) {
      const newline = this.pending.indexOf(10);
      if (newline < 0) break;
      const line = this.pending.subarray(0, newline);
      this.pending = this.pending.subarray(newline + 1);
      if (line.length > this.limits.lineBytes || ++this.count > this.limits.events) throw new Error('event-limit');
      const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line)) as unknown;
      await consume(value);
    }
    if (this.pending.length > this.limits.lineBytes) throw new Error('line-limit');
  }

  finish(): void { if (this.pending.length) throw new Error('trailing-data'); }
}
