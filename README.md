# Marc

A voice agent rendered as an egg. Marc is a speckled, cream-shelled egg that
rocks where he stands, lies down and spins like a hard-boiled egg while he
thinks, and squashes in time with whoever is making sound — all of it driven by
a live OpenAI Realtime call.

## Run

```sh
git clone https://github.com/h1ddenpr0cess20/marc
cd marc
npm install
cp .env.example .env      # add your OPENAI_API_KEY
npm run dev               # → http://localhost:5173
```

Click the mic, allow the browser's microphone prompt, and start talking.

| Script | |
|---|---|
| `npm run dev` | Vite, with the proxy mounted as middleware — one process |
| `npm run build` | Bundles the client to `dist/` |
| `npm start` | Serves `dist/` with the same proxy in front |
| `npm run preview` | `build` then `start` |
| `npm test` | `node:test` over the server |
| `npm run lint` | |

Open it on `localhost`. Microphone access needs a secure context, so serving
this from a LAN address over plain HTTP will fail at the mic prompt — put it
behind HTTPS if you want it off your own machine. `npm run dev -- --host` binds
to the network anyway, which is useful for checking layout on a phone even
though that phone won't get past the mic prompt.

| Variable | Default | Role |
|---|---|---|
| `OPENAI_API_KEY` | — | Required. Stays in the Node process. |
| `OPENAI_VOICE` | `cedar` | Which voice the picker opens on (`cedar`, `ballad`, `ash`, `echo`, `verse`) |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-2.1` | Preselected in the picker when the key can reach it |
| `OPENAI_BASE_URL` | OpenAI | Points the proxy at a gateway or a stub |
| `PORT` | `5173` | |

Both `npm run dev` and `npm start` read `.env`.

The voice picker lists the male voices only — Marc has one voice range, and
offering to change it mid-conversation would make him a different character
between turns. `cedar` is the default: realtime-native, and the most
naturalistic of them. `ballad` has a drier lift; `ash`, `echo` and `verse`
predate cedar and read flatter. An `OPENAI_VOICE` outside that list is still
honoured and joins the picker at the front: the list in `src/server/config.js`
goes stale, the API doesn't, and an operator naming a voice by hand has already
said what they want.

## How the call is wired

The API key never reaches the browser, but the audio never reaches the proxy either:

1. The page asks `POST /api/session` for a client secret, naming the model and
   voice it wants. The proxy mints one from `/v1/realtime/client_secrets` with the
   persona, voice and turn detection already attached, valid for ten minutes.
2. The page opens an `RTCPeerConnection`, adds the mic track, and POSTs its SDP
   offer straight to `/v1/realtime/calls` with that secret.
3. Audio flows browser ↔ OpenAI over WebRTC. Events flow over an `oai-events`
   data channel alongside it.

Turn-taking is server-side semantic VAD, so barge-in is free: speak over Marc
and the model truncates its own playback. `Escape` cancels the current response
for the typed path.

The picker lists every realtime model the key can reach, minus the ones that
can't hold a conversation — the `translate` and `whisper` tiers are streaming
translation and speech-to-text, and choosing one would leave you talking to an
egg with nothing to say back.

Both pickers are pinned into that secret, so changing the model or the voice
mid-call hangs up and dials again — the conversation doesn't carry over, since the
new voice has no memory of what the old one said.

The proxy is connect-style middleware rather than a server, which is why there
is only one implementation of `/api/*`: `vite.config.js` mounts it in
development and `src/server/app.js` mounts it in front of the static handler in
production. No second process, no request forwarding, and the key lives in
exactly one place either way.

## Tools — not yet

Marc has no tools. He answers from what the model already knows: no web search,
no retrieval, no function calls. Ask him about this morning and he should tell
you he doesn't know, which is the behaviour the system prompt asks for.

That's a choice, not a limitation. A realtime session takes tools two ways, and
both are cheap here:

- **Function tools**, which we execute — declare them in `session.tools`, then
  handle `response.function_call_arguments.done` on the data channel and post a
  `function_call_output` back.
- **Remote MCP servers**, which the Realtime API executes itself. Point
  `session.tools` at a server URL and its tools are live. Anything needing auth
  headers belongs in the server-side `/v1/realtime/client_secrets` payload rather
  than in browser code — which is already exactly where `sessionConfig()` lives,
  so this is a few lines in `src/server/persona.js` and nothing in the page.

**The plan: pick it up when GPT-Live reaches the API, and move onto that at the
same time.** GPT-Live shipped to ChatGPT in July 2026 — full-duplex, so it listens
and speaks at once instead of taking turns — but it's ChatGPT-only for now, with
API access promised "soon" and no timeline. Tools and the transport swap may as
well land together, rather than fitting search to a pipeline that's due to be
replaced.

## Layout

```
index.html              Markup only — Vite's entry
src/
  client/
    main.js             The wiring, and nothing else
    styles.css          The HUD around Marc
    api.js              The proxy's two endpoints, as functions
    egg/                Geometry and animation. Knows nothing about transports
      index.js            The controller and the per-frame loop
      moods.js            Targets per conversational state
      motion.js           The spring and the chase every channel eases on
      shell.js            The egg profile, and the material that wears the skin
      skin.js             Speckled cream, painted once onto a canvas
      environment.js      Warm studio env, so the shell reads as ceramic
    session/            The call. Emits transport-agnostic events
      index.js            Lifecycle: mic, secret, connect, meter, tear down
      webrtc.js           Peer connection, data channel, SDP handshake
      events.js           Realtime server events → this vocabulary
      metering.js         Two analysers → one 0..1 number per frame
      emitter.js
    ui/                 What you read and what you press
      hud.js              Status chip, transcript, caption
      controls.js         Mic, text field, send, pickers
      viewport.js         Keeps the composer above the on-screen keyboard
    vendor/
      three-d-stage.js    Starter component (renderer, lighting, camera, controls)
  server/
    index.js            Entry point
    app.js              The middleware chain
    api.js              /api/models + /api/session
    openai.js           The two calls it makes
    persona.js          Who Marc is, and the session config
    config.js           The environment, resolved once
    static.js           Hosting for dist/ — production only
test/                   node:test, against a stub OpenAI
```

`src/client/vendor/three-d-stage.js` is a copied starter component with two
local changes, listed at the top of the file — re-copying it drops them.

## States

`idle` · `listening` · `thinking` · `speaking` — each a set of targets for
jitter, lean, rock, roll, spin and squash. Marc eases between them, so
transitions read as the same egg changing mood rather than a cut.

- **idle** — rocks where he stands, with a fidget every few seconds.
- **listening** — leans in and settles, rocking a little quicker.
- **thinking** — lies down and spins like a hard-boiled egg. It's the one pose
  the other three never take, which is what makes the state legible at a glance.
- **speaking** — rolls a short arc and back, squashing on every syllable.

The call maps onto them directly: `listening` from `speech_started` and between
turns, `thinking` from `speech_stopped` until the first audio frame, `speaking`
while the model's track is live, `idle` when there is no call.

Three nested groups keep those motions from fighting: the outer one carries
world tilt and tremor, the middle one spins about world up, and the inner one
owns the lie-down, the roll and the squash.

## The transport seam

`session/index.js` exposes `on`, `start`, `stop`, `send`, `cancel`, `messages`,
`connected`, `busy`, `stale`, `state`, `model`, `voice` — and emits:

```
'state'  listening | thinking | speaking | idle
'text'   a chunk of assistant transcript
'user'   a completed transcript of what the person said
'level'  0..1 sustained amplitude, per frame
'pulse'  0..1 transient, one per discrete event
'busy'   whether a response is in flight
'done'   { model, usage }
'error'  { message }
```

Marc takes audio-shaped input, which is the whole point of the split:

```js
marc.setState('speaking')  // idle | listening | thinking | speaking
marc.setLevel(0.62)        // sustained amplitude 0..1, sampled per frame
marc.pulse(0.4)            // transient impulse 0..1, one per discrete event
```

Both land on the same internal energy value. `setLevel` carries the voice —
two `AnalyserNode`s, one on the mic and one on the model's track, read per frame
and smoothed with a fast attack and a slow release. `pulse` is left for the beats
where a turn changes hands: it kicks the springs directly as well as the energy,
so the squash punctuates instead of strobing.

Swapping providers means writing a different `createVoiceSession()` with that
surface. `main.js` and the egg do not change.
