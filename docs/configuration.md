# Configuration

Both `npm run dev` and `npm start` read `.env`.

| Variable | Default | Role |
|---|---|---|
| `OPENAI_API_KEY` | — | Required. Stays in the Node process. |
| `MEMORY` | `true` | The `remember` and `forget` tools, and the memory block in the prompt |
| `OPENAI_VOICE` | `cedar` | Which voice the picker opens on (`cedar`, `ballad`, `ash`, `echo`, `verse`) |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-2.1` | Preselected in the picker when the key can reach it |
| `OPENAI_BASE_URL` | OpenAI | Points the proxy at a gateway or a stub |
| `PORT` | `5173` | |
| `SSL_KEY`, `SSL_CERT` | — | Paths to a real certificate; `npm start` then serves HTTPS |
| `CONNECTORS` | — | Coding agents Marc may hand work to: `codex` |
| `CONNECTOR_CWD` | `process.cwd()` | The workspace agents run in |
| `CONNECTOR_TIMEOUT` | `900` | Seconds before a task is stopped |
| `CONNECTOR_LIMIT` | `3` | How many tasks may run at once |
| `CONNECTOR_FILE` | `connectors.json` | Where the panel saves the setup |
| `CONNECTOR_ANNOUNCE` | `true` | Tell Marc when a task finishes |
| `CODEX_COMMAND` | `codex` | A whole command line, so the CLI can be wrapped |
| `CODEX_MODEL`, `CODEX_ARGS`, `CODEX_CWD` | — | Per agent |
| `CODEX_SANDBOX` | `workspace-write` | Its sandbox policy |

The voice picker lists male voices only — Marc has one voice range, and changing
it mid-conversation would make him a different character between turns. `cedar`
is the default: realtime-native, and the most naturalistic of them. `ballad` has
a drier lift; `ash`, `echo` and `verse` predate cedar and read flatter. An
`OPENAI_VOICE` outside that list is still honoured and joins the picker at the
front — the list in `src/server/config.js` goes stale, the API doesn't.

## On a phone

```sh
npm run dev:lan           # → https://192.168.x.x:5173, printed on start
```

Microphone access needs a secure context. `localhost` is one; a LAN address over
plain HTTP is not — `navigator.mediaDevices` doesn't exist there, so the page
can't even raise the mic prompt. The `:lan` scripts serve HTTPS with a
self-signed certificate, cached in `node_modules/.vite/`.

No browser trusts that certificate, so the phone shows a warning the first time
("Advanced" → proceed on Chrome, "Show details" → "visit this website" on
Safari). Tap through it once per device. To skip it, point `SSL_KEY` and
`SSL_CERT` at a certificate the device already trusts —
[mkcert](https://github.com/FiloSottile/mkcert) issues one for a LAN IP.

## Docker

```sh
docker run --rm -p 5173:5173 -e OPENAI_API_KEY=sk-... h1ddenpr0cess20/marc
```

Images go to Docker Hub on every push to `main` (`latest`) and on `v*` tags
(`1.2.3`, `1.2`), for `linux/amd64` and `linux/arm64`. Configuration is the same
set of variables as `.env` — pass them with `-e` or `--env-file .env`.

The container serves HTTP on `PORT` and expects TLS to be terminated in front of
it; to serve TLS from the container, mount a certificate and set `SSL_KEY` and
`SSL_CERT`. Build it yourself with `docker build -t marc .`. Publishing from a
fork needs a `DOCKERHUB_TOKEN` secret, plus a `DOCKERHUB_USERNAME` variable if
your Docker Hub account isn't `h1ddenpr0cess20`.

## Tools

Marc has no tools beyond memory. He answers from what the model already knows:
no web search, no retrieval. Ask him about this morning and he should say he
doesn't know, which is what the system prompt asks for.

The exceptions are `remember` and `forget`, which the page executes itself
against browser storage, and the connectors below, which the server executes. Remote MCP servers, which the Realtime API executes on
its own, would be a few lines in the same place: `sessionConfig()` in
`src/server/persona.js` already builds the tool list, and anything needing auth
headers stays in the server-side `/v1/realtime/client_secrets` payload rather
than in the page.

### The tools panel, ahead of the tools

`tools` opens the panel those switches will live in. It is empty today, and says
so: Marc has nothing to switch beyond memory, which keeps its own switch in
the `memory` panel. `/api/models` publishes the list — `switches`, empty for now
— and the page renders one row per entry, so a tool declared in `sessionConfig()`
becomes a switch without a change to the panel.

The switches themselves are per browser, kept in `localStorage`, and they can
only ever take a tool away. What exists stays the server's to decide.

## Connectors

`connectors` opens the panel for the coding agent Marc can hand work to: Codex,
run headless, once per task, in a workspace directory. Say what you want built
and it goes out to an agent that reads, writes and runs things for real.

Nothing is on by default. A connector runs a CLI that edits files on the machine
serving the page, so it is opt-in there — `CONNECTORS` names the agents to start
with, and the panel turns them on and off while the server runs. What the panel
writes goes to `connectors.json` and survives a restart.

One thing is deliberately not editable from the browser: the command each agent
is run as. That is the difference between configuring a tool and choosing which
binary this server executes, and the second one does not belong to anything a
page can reach. It comes from `CODEX_COMMAND`, and it takes a whole command
line, so `docker exec -w /work dev codex` wraps the CLI as well as names it.

Sandbox policies come from the CLI, safest first, and the panel warns on the
ones that can act outside the workspace. The agent inherits the server's
environment minus `OPENAI_API_KEY` — the key that dials the call is not the
agent's to spend.

Three tools do the work: `dispatch_task` hands one task to one agent and returns
a number immediately, `check_task` reports where it stands, and `cancel_task`
stops it. Whatever an agent already wrote to disk stays written when a task is
stopped or times out.

### How a tool call gets to the server

Marc's call runs browser-to-OpenAI over WebRTC, so a tool call the model makes
arrives in the page and nowhere else. The page hands the connector ones back to
the server at `POST /api/connectors/run`, which is the only reason this server
can dispatch at all. Anything that changes something — that route, and saving
the setup — is refused unless it came from this page, since there are no
accounts here and these routes spawn processes that edit files.

The panel polls `/api/tasks` while something is running, for the same reason:
there is no socket back from the server to push a status down. A task that
settles is told to the model as it lands, as a line marked `[workspace]` so it
is not mistaken for the person talking. `CONNECTOR_ANNOUNCE=false` keeps the
board and drops the telling.

Which agents are on is settled when a session is minted, so switching one on
mid-call redials — the conversation is kept, and the new tool list goes out with
it.

## The log and the memory

`log` opens past conversations, newest first. `new` closes the record and, if a
call is up, dials again — the model's memory of what was said is the call
itself, so a new call is the only thing that clears it. `clear` asks once, then
removes the log.

`memory` opens the short list of details Marc carries between calls. Ask him to
remember something and he calls `remember`; ask him to forget it and he calls
`forget`, which drops every stored line matching the keyword. You can also add a
line by hand, drop one, switch the whole thing off, or clear it. `MEMORY=false`
removes the tools and the prompt block for everyone the server serves.

Editing the list by hand takes effect on the next call rather than the current
one — the instructions are baked into the client secret, and the page has no
copy of the persona to re-send with. A `remember` the model makes mid-call needs
no such round trip: it already knows what it just stored, because the tool
result said so.

Both live in `localStorage`, in the browser that made the call — see the
[design notes](design.md#storage) for the caps and what crosses the wire.
