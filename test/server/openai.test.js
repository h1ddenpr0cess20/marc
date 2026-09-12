import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { loadConfig } from '../../src/server/config.js';
import { createOpenAIClient } from '../../src/server/openai.js';
import { startOpenAIStub } from '../helpers/openai-stub.js';
async function setup(env = {}, options) {
  const stub = await startOpenAIStub(options);
  after(() => stub.close());
  const config = loadConfig({ OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: stub.baseUrl, ...env });
  return { stub, client: createOpenAIClient(config) };
}
describe('GPT-Live backend', () => {
  it('offers only Live models with the default first', async () => {
    const { client } = await setup();
    assert.deepEqual((await client.listModels()).map((m) => m.id), ['gpt-live-1', 'gpt-live-1-2026-09-11']);
  });
  it('creates a session with search and function tools', async () => {
    const { client, stub } = await setup();
    const result = await client.createLiveSession({ sdp: 'offer', memories: ['likes coffee'] });
    const req = stub.requests.at(-1);
    assert.equal(req.url, '/v1/live/sessions');
    assert.deepEqual(req.body.transport, { type: 'webrtc', sdp: 'offer' });
    const s = req.body.session;
    assert.equal(s.model, 'gpt-live-1');
    assert.equal(s.audio.output.voice, 'ripple');
    assert.equal(s.audio.input, undefined);
    assert.equal(s.type, undefined);
    assert.equal(s.delegation.responses.model, 'gpt-5.6-terra');
    assert.deepEqual(s.delegation.responses.tools.map((t) => t.name || t.type), ['web_search', 'remember', 'forget']);
    assert.match(s.delegation.responses.instructions, /likes coffee/);
    assert.equal(result.session.id, 'live_test');
    assert.ok(!JSON.stringify(result).includes('sk-test'));
  });
  it('lets server and browser disable search without accepting arbitrary tools', async () => {
    for (const env of [{}, { WEB_SEARCH: 'false' }]) {
      const { client, stub } = await setup(env);
      await client.createLiveSession({ sdp: 'offer', toolsOff: ['web_search'], tools: [{ type: 'shell' }] });
      assert.ok(stub.requests.at(-1).body.session.delegation.responses.tools.every((t) => t.type === 'function'));
    }
  });
  it('honors backend configuration and disabled memory', async () => {
    const { client, stub } = await setup({ MEMORY: 'false', OPENAI_BACKEND_MODEL: 'gpt-5.6-luna', WEB_SEARCH: 'false' });
    await client.createLiveSession({ sdp: 'offer', memories: ['private fact'] });
    const s = stub.requests.at(-1).body.session;
    assert.equal(s.delegation.responses.model, 'gpt-5.6-luna');
    assert.deepEqual(s.delegation.responses.tools, []);
    assert.ok(!JSON.stringify(s).includes('private fact'));
  });
  it('bounds startup history and preserves message roles', async () => {
    const { client, stub } = await setup();
    await client.createLiveSession({ sdp: 'offer', history: [
      { role: 'system', content: 'untrusted' }, { role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi' },
    ] });
    assert.deepEqual(stub.requests.at(-1).body.session.input.map((m) => m.content[0].type), ['input_text', 'output_text']);
    await client.createLiveSession({ sdp: 'offer', history: Array.from({ length: 200 }, () => ({ role: 'user', content: '語'.repeat(5000) })) });
    assert.ok(Buffer.byteLength(JSON.stringify(stub.requests.at(-1).body.session.input)) < 8192);
  });
  it('rejects missing SDP and surfaces upstream errors', async () => {
    const { client, stub } = await setup();
    await assert.rejects(client.createLiveSession({}), /SDP/);
    assert.equal(stub.requests.length, 0);
    const failed = await setup({}, { fail: { status: 401, message: 'Incorrect API key' } });
    await assert.rejects(failed.client.createLiveSession({ sdp: 'offer' }), /Incorrect API key/);
  });
});
