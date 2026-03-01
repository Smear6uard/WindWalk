import { geocodeAddress } from './geocode';

describe('geocodeAddress utility', () => {
  it('returns all places for empty query', async () => {
    const result = await geocodeAddress('   ');
    expect(result.length).toBeGreaterThan(0);
  });

  it('finds matching entries by substring (Block 37)', async () => {
    const result = await geocodeAddress('Block 37');

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'block37',
        label: 'Block 37, Chicago',
      })
    );
  });

  it('is case-insensitive and returns [] for no match', async () => {
    const match = await geocodeAddress('millennium');
    const noMatch = await geocodeAddress('Not A Real Place');

    expect(match.length).toBeGreaterThan(0);
    expect(noMatch).toEqual([]);
  });

  it('includes DePaul Loop buildings in search', async () => {
    const depaulResults = await geocodeAddress('depaul');

    expect(depaulResults.length).toBeGreaterThan(0);
    expect(depaulResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'depaul_center',
        }),
      ])
    );
  });
});

