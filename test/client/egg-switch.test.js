import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { createEggSwitch } from '../../src/client/egg/switch.js';

describe('createEggSwitch', () => {
  let log;
  let state;
  let answer;
  let asked;

  const make = () => createEggSwitch({
    marc: { setLook: (l) => log.push(['look', l]) },
    session: {
      get connected() { return state.connected; },
      get context() { return state.context; },
      set egg(l) { log.push(['egg', l]); },
    },
    history: { get live() { return state.live; } },
    confirm: { ask: async (q) => { asked.push(q); return answer; } },
    save: (l) => log.push(['save', l]),
    startFresh: () => log.push(['fresh']),
  });

  const WOOD = { kind: 'wood', variant: 'oak' };

  beforeEach(() => {
    log = [];
    asked = [];
    answer = true;
    state = { connected: false, live: null, context: [] };
  });

  it('just changes the egg when nothing is under way, without asking', async () => {
    assert.equal(await make().change(WOOD), true);
    assert.deepEqual(asked, []);
    assert.deepEqual(log, [['look', WOOD], ['save', WOOD], ['egg', WOOD]]);
  });

  for (const [what, set] of [
    ['a call is up', () => { state.connected = true; }],
    ['a thread is open in the log', () => { state.live = 'c1'; }],
    ['an earlier conversation has been picked up', () => { state.context = [{ role: 'user', content: 'hi' }]; }],
  ]) {
    it(`asks first when ${what}, and on yes dresses him and starts a new conversation`, async () => {
      set();
      assert.equal(make().underway(), true);
      assert.equal(await make().change(WOOD), true);
      assert.equal(asked.length, 1);
      assert.match(asked[0].text, /new conversation/);
      assert.match(asked[0].text, /stays in the log/);
      assert.equal(asked[0].ok, 'New conversation');
      assert.equal(asked[0].cancel, 'Keep this egg');
      assert.deepEqual(log, [['look', WOOD], ['save', WOOD], ['egg', WOOD], ['fresh']]);
    });

    it(`changes nothing when ${what} and the answer is no, and says so`, async () => {
      set();
      answer = false;
      assert.equal(await make().change(WOOD), false);
      assert.deepEqual(log, [], 'not the egg, not what is remembered, not who he is, and no new conversation');
    });
  }

  it('says who he is before the new conversation starts, so it is dialed as the new egg', async () => {
    state.connected = true;
    await make().change(WOOD);
    assert.ok(log.findIndex(([what]) => what === 'egg') < log.findIndex(([what]) => what === 'fresh'));
  });

  it('is not underway for a call that has ended and left nothing open', () => {
    assert.equal(make().underway(), false);
  });
});
