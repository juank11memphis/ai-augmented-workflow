const MAX_ASSOCIATIONS = 256;

type Association =
  | { readonly status: 'pending' | 'ambiguous'; readonly suiteId: string }
  | { readonly status: 'confirmed'; readonly suiteId: string; readonly runId: string };

/** Ephemeral, server-scoped proof of which queued run belongs to a start request. */
export class StartReferenceRegistry {
  private readonly associations = new Map<string, Association>();

  reserve(reference: string, suiteId: string): boolean {
    if (this.associations.has(reference)) {
      const previous = this.associations.get(reference)!;
      this.associations.set(reference, { status: 'ambiguous', suiteId: previous.suiteId });
      return false;
    }
    if (this.associations.size >= MAX_ASSOCIATIONS) {
      const oldest = this.associations.keys().next().value;
      if (oldest) this.associations.delete(oldest);
    }
    this.associations.set(reference, { status: 'pending', suiteId });
    return true;
  }

  confirm(reference: string, suiteId: string, runId: string): void {
    const association = this.associations.get(reference);
    if (association?.status === 'pending' && association.suiteId === suiteId) {
      this.associations.set(reference, { status: 'confirmed', suiteId, runId });
    }
  }

  resolve(reference: string, suiteId: string): { readonly status: 'confirmed'; readonly runId: string }
    | { readonly status: 'unconfirmed' | 'ambiguous' } {
    const association = this.associations.get(reference);
    if (!association) return { status: 'unconfirmed' };
    if (association.status === 'ambiguous') return { status: 'ambiguous' };
    if (association.suiteId !== suiteId || association.status !== 'confirmed') return { status: 'unconfirmed' };
    return { status: 'confirmed', runId: association.runId };
  }

  confirmedRunId(reference: string): string | undefined {
    const association = this.associations.get(reference);
    return association?.status === 'confirmed' ? association.runId : undefined;
  }
}
