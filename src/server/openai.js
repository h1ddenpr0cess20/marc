import { sessionConfig } from './persona.js';

/** Read connector settings anew for every session. */
export function createOpenAIClient({
  baseUrl, apiKey, defaultModel, defaultVoice, voices,
  memory = true, backendModel, webSearch = true,
}, connectors = null) {
  async function request(path, init = {}) {
    const res = await fetch(baseUrl + path, {
      ...init,
      headers: {
        authorization: 'Bearer ' + apiKey,
        'content-type': 'application/json',
        ...init.headers,
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error?.message ?? ('OpenAI returned ' + res.status));
    return body;
  }
  return {
    async listModels() {
      const { data } = await request('/models');
      return data
        .filter((m) => /^gpt-live-[a-z0-9.-]+$/.test(m.id))
        .sort((a, b) => Number(b.id === defaultModel) - Number(a.id === defaultModel) || a.id.localeCompare(b.id))
        .map((m) => ({ id: m.id, display_name: m.id }));
    },
    async createLiveSession({ sdp, model, voice, memories, resumed, history, toolsOff } = {}) {
      if (typeof sdp !== 'string' || !sdp.trim()) throw new Error('An SDP offer is required');
      const chosenModel = typeof model === 'string' && /^gpt-live-[a-z0-9.-]+$/.test(model)
        ? model : (defaultModel.startsWith('gpt-live-') ? defaultModel : 'gpt-live-1');
      const chosen = voices.includes(voice) ? voice : defaultVoice;
      const result = await request('/live/sessions', {
        method: 'POST',
        body: JSON.stringify({
          session: sessionConfig(chosenModel, chosen, {
            memories, memory, resumed, history, backendModel,
            webSearch: webSearch && !(Array.isArray(toolsOff) && toolsOff.includes('web_search')),
            agents: connectors?.agents ?? [], tasks: connectors?.tasks() ?? [],
          }),
          transport: { type: 'webrtc', sdp },
        }),
      });
      if (!result?.transport?.sdp || !result?.session?.id) throw new Error('OpenAI returned an invalid Live session');
      return { session: { id: result.session.id }, transport: result.transport, model: chosenModel, voice: chosen };
    },
  };
}
