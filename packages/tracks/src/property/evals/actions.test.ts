import { describe, expect, it } from 'vitest';
import { tools } from '../tools';
import { actionMap } from './actions';

describe('property eval action map', () => {
  it('maps exactly the pack tools', () => {
    expect(actionMap.map((entry) => entry.tool).sort()).toEqual(tools.map((tool) => tool.name).sort());
  });
});
