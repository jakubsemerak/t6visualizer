import { describe, expect, it } from 'vitest';
import { decodeState, encodeState, type AppState } from '../../src/core/urlState';

const ids = ['coast', 'beach'];

describe('url state', () => {
  it('round-trips', () => {
    const s: AppState = {
      presetId: 'beach',
      view: 'plan',
      overrides: { state: 'bed', popTop: true, passenger: 'singleSwivel', benchFrontX: 1970, benchModel: 'rib-1200', kitchenLength: 900, fridge: 'coolbox' },
    };
    expect(decodeState(`#${encodeState(s)}`, ids)).toEqual(s);
  });
  it('falls back on garbage', () => {
    expect(decodeState('#preset=nope&view=x&popTop=maybe&benchFrontX=abc&fridge=ice', ids))
      .toEqual({ presetId: 'coast', view: 'orbit', overrides: {} });
  });
  it('handles an empty hash', () => {
    expect(decodeState('', ids)).toEqual({ presetId: 'coast', view: 'orbit', overrides: {} });
  });
});
