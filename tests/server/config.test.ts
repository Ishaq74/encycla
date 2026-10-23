import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../server/config';

describe('loadConfig', () => {
  it('uses documented defaults', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      publicOrigin: null,
      databasePath: 'data/encycla.db',
      logLevel: 'info',
    });
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ PORT: '0' })).toThrow('Invalid PORT');
    expect(() => loadConfig({ PORT: 'not-a-port' })).toThrow('Invalid PORT');
  });
});
