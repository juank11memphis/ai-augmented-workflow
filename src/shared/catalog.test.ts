import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STATE_RELATIVE_PATH } from './catalog.js';

describe('STATE_RELATIVE_PATH', () => {
  it('reports the Sibu state file path', () => {
    assert.equal(STATE_RELATIVE_PATH, '.sibu/state.json');
  });
});
