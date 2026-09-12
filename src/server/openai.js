import { sessionConfig } from './persona.js';

/** The Live models this proxy will offer and dial. */
const LIVE_MODEL = /^gpt-live-[a-z0-9.-]+$/;

/**
 * What may stand behind the call as the Responses backend: a text model, not
 * one of the speech, image or embedding ones that share the prefix. The browser
 * picks from the list `/models` filtered this way, and names one when it dials,
 * so the same rule is what vets what it names — a page cannot talk this server
 * into delegating to something that cannot answer.
 */
const BACKEND_MODEL = /^(?:gpt-[0-9]|o[0-9])[a-z0-9.-]*$/;
const NOT_BACKEND = /live|realtime|audio|transcribe|tts|image|embedding|moderation|search/;

export function isBackendModel(id) {
  return typeof id === 'string' && BACKEND_MODEL.test(id) && !NOT_BACKEND.test(id);
}

/**
 * One picker's worth of ids, the preferred one first. `always` keeps that one
 * on the list even when `/models` never named it: the backend the environment
 * chose is what a call gets when the browser names nothing, so it belongs in
 * the picker whether or not the key can list it.
 */
function offer(ids, accepts, preferred, always = false) {
  const chosen = ids.filter(accepts);
  if (always && preferred && !chosen.includes(preferred)) chosen.push(preferred);
  return chosen
    .sort((a, b) => Number(b === preferred) - Number(a === preferred) || a.localeCompare(b))
    .map((id) => ({ id, display_name: id }));
}

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
    /** Both pickers off one listing: the voice end of the call, and the backend. */
    async catalog() {
      const { data } = await request('/models');
      const ids = data.map((m) => m.id);
      return {
        models: offer(ids, (id) => LIVE_MODEL.test(id), defaultModel),
        backendModels: offer(ids, isBackendModel, backendModel, true),
      };
    },
    async createLiveSession({
      sdp, model, voice, backendModel: backend, memories, resumed, history, toolsOff,
    } = {}) {
      if (typeof sdp !== 'string' || !sdp.trim()) throw new Error('An SDP offer is required');
      const chosenModel = typeof model === 'string' && LIVE_MODEL.test(model)
        ? model : (defaultModel.startsWith('gpt-live-') ? defaultModel : 'gpt-live-1');
      const chosen = voices.includes(voice) ? voice : defaultVoice;
      const chosenBackend = isBackendModel(backend) ? backend : backendModel;
      const result = await request('/live/sessions', {
        method: 'POST',
        body: JSON.stringify({
          session: sessionConfig(chosenModel, chosen, {
            memories, memory, resumed, history, backendModel: chosenBackend,
            webSearch: webSearch && !(Array.isArray(toolsOff) && toolsOff.includes('web_search')),
            agents: connectors?.agents ?? [], tasks: connectors?.tasks() ?? [],
          }),
          transport: { type: 'webrtc', sdp },
        }),
      });
      if (!result?.transport?.sdp || !result?.session?.id) throw new Error('OpenAI returned an invalid Live session');
      return {
        session: { id: result.session.id }, transport: result.transport,
        model: chosenModel, voice: chosen, backendModel: chosenBackend,
      };
    },
  };
}
