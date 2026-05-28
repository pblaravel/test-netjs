import { InMemoryIdempotencyStore } from './idempotency.store';

describe('InMemoryIdempotencyStore', () => {
  it('should track processed keys', () => {
    const store = new InMemoryIdempotencyStore();

    expect(store.has('key-1')).toBe(false);
    store.add('key-1');
    expect(store.has('key-1')).toBe(true);
  });
});
