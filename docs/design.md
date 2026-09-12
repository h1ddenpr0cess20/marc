# Design notes

How Marc is put together. The [README](../README.md) covers running it;
[configuration](configuration.md) covers the knobs.

## How the call is wired

The API key stays on the server. The browser gathers an SDP offer and posts it
with model, voice, memories, startup history and disabled tools to `/api/session`.
The proxy creates `/v1/live/sessions`; the browser applies `transport.sdp` and
waits for `session.started`. Audio flows directly over WebRTC, and transcripts
and delegated Responses events use the `oai-events` data channel.

GPT-Live handles full-duplex speech. Its Responses backend reasons and uses tools.
Typed input uses `response.item.create` followed by `response.create`; workspace
updates use `session.commentary.append`. Escape requests a speech interruption,
without cancelling coding tasks already dispatched.

Model, voice and tool changes reconnect with recent history. Hangup stops capture
and playback, sends `session.close`, and keeps the transport alive until
`session.closed` or a 15-second timeout. Voice usage is cumulative seconds;
backend usage is separate. Recording is not enabled.

The proxy is connect-style middleware rather than a server, so there's only one
implementation of `/api/*`: `vite.config.js` mounts it in development and
`src/server/app.js` mounts it in front of the static handler in production. No
second process, and the key lives in one place either way.

## Storage

History, memory and tool preferences use `marc.history.v1`, `marc.memory.v1`
and `marc.tools.v1` in browser storage. Relevant memory and resumed history are
sent through the proxy to OpenAI when creating a session; the proxy stores no copy.
Startup history is restricted to user and assistant text, at most 40 messages
and 6,000 UTF-8 bytes, and supplied as `session.input`.

Transcript fragments retain their exact text and timestamps. Each speaker has
independent display groups with stable IDs; later fragments update existing
history rows. A 1.5-second timestamp gap starts a new display group. This is a UI
heuristic, not a semantic turn boundary, and never triggers tool execution.

Nested `response.event` envelopes carry backend work. Completed function items
are collected before the terminal response event, executed once, and all outputs
are submitted through `response.item.create` before one `response.create`
continuation. Late results from disconnected calls are discarded. Backend output
is not spoken-caption text; its URL annotations become clickable sources under
the caption, deduplicated, the oldest giving way past six, and cleared with the
caption they belong to.

## States

`idle` · `listening` · `thinking` · `speaking` — each a set of targets for
jitter, lean, rock, roll, spin and squash. Marc eases between them, so
transitions read as the same egg changing mood rather than a cut.

- **idle** — rocks where he stands, with a fidget every few seconds.
- **listening** — leans in and settles, rocking a little quicker.
- **thinking** — lies down and spins like a hard-boiled egg. It's the one pose
  the other three never take, which is what makes the state legible at a glance.
- **speaking** — rolls a short arc and back, squashing on every syllable.

Transcript activity drives listening and speaking poses. Backend work drives
thinking between transcript updates. The display timeout is a visual heuristic,
not proof of audio playback completion.

Three nested groups keep those motions from fighting: the outer one carries world
tilt and tremor, the middle one spins about world up, and the inner one owns the
lie-down, the roll and the squash.

## Layout

```
Dockerfile              Build the client, then serve it from src/server
index.html              Markup only — Vite's entry
src/
  client/
    main.js             The wiring, and nothing else
    styles.css          The HUD around Marc
    api.js              The server's endpoints, as functions
    history.js          Past conversations in localStorage, and picking one up
    memory.js           What it remembers between calls, in localStorage
    tools.js            Which of the server's tools this browser switched off
    tasks.js            The work agents are doing, mirrored and polled
    egg/                Geometry and animation. Knows nothing about transports
      index.js            The controller and the per-frame loop
      moods.js            Targets per conversational state
      motion.js           The spring and the chase every channel eases on
      shell.js            The egg profile, and the material that wears the skin
      skin.js             Speckled cream, painted once onto a canvas
      environment.js      Warm studio env, so the shell reads as ceramic
    session/            The call. Emits transport-agnostic events
      index.js            Lifecycle: mic, session, connect, meter, tear down
      webrtc.js           Peer connection, data channel, SDP handshake
      events.js           Live and nested Responses events → this vocabulary
      tools.js            remember/forget in the page; the rest routed to the server
      metering.js         Two analysers → one 0..1 number per frame
      emitter.js
    ui/
      hud.js              Status chip, transcript, caption
      menu.js             The corner menu, and the list of panels it drops
      history.js          The log panel behind `log` in the menu, and its `continue`
      memory.js           The memory panel behind `memory` in the menu
      tools.js            The tool switches behind `tools` in the menu — web search
      connectors.js       The setup and the work board, behind `connectors` in the menu
      controls.js         Mic (tap mutes, hold hangs up), field, send, pickers
      viewport.js         Keeps the composer above the on-screen keyboard
    vendor/
      three-d-stage.js    Starter component (renderer, lighting, camera, controls)
  server/
    index.js            Entry point
    app.js              The middleware chain
    api.js              /api/models + /api/session, and the connector routes
    openai.js           The two calls it makes
    persona.js          Who Marc is, and the session config
    origin.js           Who is allowed to ask for a change
    config.js           The environment, resolved once
    static.js           Hosting for dist/ — production only
    connectors/         Coding agents, and the tasks handed to them
      index.js            The registry: settings, tools, dispatch
      agents.js           Each CLI as a command line, and how to read it back
      settings.js         What the panel may change, checked and saved
      tasks.js            The child processes, and their status
      tools.js            The three function tools, as the model sees them
docs/                   These notes, configuration, policies, screenshots
test/                   node:test, against a stub OpenAI
.github/workflows/      CI (lint, tests, build smoke test), CodeQL, Docker publish
```

`src/client/vendor/three-d-stage.js` is a copied starter component with two
local changes, listed at the top of the file — re-copying it drops them.

## The transport seam

`session/index.js` exposes `on`, `start`, `stop`, `send`, `note`, `cancel`,
`context`, `messages`, `connected`, `busy`, `stale`, `state`, `muted`, `model`,
`voice` — and emits:

```
'state'   connecting | listening | thinking | speaking | idle
'caption' the assistant's spoken row so far, whole — it replaces, not appends
'user'    the person's spoken row so far, whole
'source'  a url_citation the backend attached to what it answered
'tool'    a label while a tool works, or null
'memory'  the result of a remember/forget the model just called
'task'    a coding-agent task as it was dispatched, checked or stopped
'level'   0..1 sustained amplitude, per frame
'pulse'   0..1 transient, one per discrete event
'message' a row as it stands, { id, role, content, fragments } — what the log stores
'busy'    whether a backend response is in flight
'usage'   cumulative voice usage; `final` on the last one
'backend' a delegated response that settled, with its own usage
'error'   { message }
```

A spoken row grows: `caption`, `user` and `message` are re-emitted with the
whole row each time a fragment lands in it, identified by a stable `id`. The HUD
replaces what it is showing, and the log rewrites that row rather than adding
one. Those rewrites are held briefly before the log is serialised, so a sentence
costs one write instead of one per word; ending a call settles what is held.

Marc takes audio-shaped input:

```js
marc.setState('speaking')  // idle | listening | thinking | speaking
marc.setLevel(0.62)        // sustained amplitude 0..1, sampled per frame
marc.pulse(0.4)            // transient impulse 0..1, one per discrete event
```

Both land on the same internal energy value. `setLevel` carries the voice — two
`AnalyserNode`s, one on the mic and one on the model's track, read per frame and
smoothed with a fast attack and a slow release. `pulse` is for the beats where a
turn changes hands: it kicks the springs directly as well as the energy, so the
squash punctuates instead of strobing.

Swapping providers means writing a different `createVoiceSession()` with that
surface. `main.js` and the egg don't change.
