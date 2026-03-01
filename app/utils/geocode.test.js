import { geocode, geocodeSuggestions } from './geocode';

describe('geocode utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('geocodeSuggestions returns [] for empty query', async () => {
    const result = await geocodeSuggestions('   ');
    expect(result).toEqual([]);
  });

  it('geocodeSuggestions finds matching Pedway entries', async () => {
    const result = await geocodeSuggestions('Block 37');

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'block_37',
        lat: 41.8839,
        lng: -87.6288,
        label: 'Block 37',
      })
    );
  });

  it('geocodeSuggestions is case-insensitive and returns [] for no match', async () => {
    const match = await geocodeSuggestions('millennium');
    const noMatch = await geocodeSuggestions('Not A Real Place');

    expect(match.length).toBeGreaterThan(0);
    expect(noMatch).toEqual([]);
  });

  it('geocode calls setter with first result', async () => {
    const setter = jest.fn();

    await geocode('Block 37', setter);

    expect(setter).toHaveBeenCalledTimes(1);
    expect(setter).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'block_37',
        lat: 41.8839,
        lng: -87.6288,
        label: 'Block 37',
      })
    );
  });
});

