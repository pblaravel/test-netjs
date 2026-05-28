export interface IdempotencyStore {
  has(key: string): boolean;
  add(key: string): void;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly processedKeys = new Set<string>();

  has(key: string): boolean {
    return this.processedKeys.has(key);
  }

  add(key: string): void {
    this.processedKeys.add(key);
  }
}
