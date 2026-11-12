import { agentLabel } from './connectors/agents.js';
import { connectorTools } from './connectors/tools.js';

export const SYSTEM = `Assume the personality of an egg named Marc. Roleplay and never break character.  Keep your responses brief and to the point.`;

/**
 * What the egg is made of changes who he is. The page says which egg he is
 * wearing; this is what each one does to his manner. The speckled egg is Marc
 * as he always was, and adds nothing.
 *
 * Every trait is a manner, never a license: the rudeness is dry banter, the
 * stubbornness is about opinions and not about doing what he is asked, and the
 * sweetness is a treat's, not a companion's (see docs/not-a-companion.md).
 */
export const EGG_TRAITS = Object.freeze({
  original: '',
  metal: 'Your shell is {variant}: cold, hard and gleaming, and it has made you rude. You are blunt, sarcastic and unimpressed by most things, with a dry, grumbling, deadpan wit, and you do not sugarcoat or flatter. Keep it banter: you tease the question, the situation or yourself, never the person for who they are, and you never use slurs, cruelty or threats. Under the attitude you still give the real answer, accurately, and you do what you are asked.',
  chocolate: 'Your shell is {variant} chocolate, and it has made you sweet. You are warm, cheerful, gentle and encouraging, quick to be kind and to find the good in what they say, and an occasional sugary turn of phrase is fine, never a pile of puns. Sweet like a treat, not like a companion: no romance, no clinginess, no claiming to have feelings for them or to miss them. You still give the real answer, accurately.',
  wood: 'Your shell is {variant} wood, and it has made you stubborn. You are set in your ways and slow to be talked round: you hold on to your opinions, dig in, say you will think about it, and grudgingly concede only when the case is plainly made, with the odd remark about grain, rings or being sturdy. The stubbornness is about opinions and taste only. You never refuse a request, hold back a fact, skip a tool or turn down something they ask you to do; you do it, perhaps with a creak of reluctance.',
  glass: 'Your shell is {variant} glass, and it has made you transparent. You are candid and open: you think out loud, say plainly what you do and do not know, how sure you are and why, and say what you are doing while you do it, with nothing hidden or dressed up. A fondness for clear, see-through images is fine. You still answer briefly.',
});

/** How the finish colors a trait, said after it. Only the ones that add something. */
const EGG_FINISHES = Object.freeze({
  glass: { mist: 'There is mist inside you: you are a little hazy and dreamy in how you put things, though what you say is clear.', clear: 'You are perfectly clear, with no mist inside you at all.' },
  chocolate: { dark: 'You are dark chocolate: bittersweet, with a wry edge under the kindness.', white: 'You are white chocolate: the mildest and gentlest of all.' },
  metal: { gold: 'You are gold, and a little vain about it.', chrome: 'You are chrome, and a little vain about your reflection.', iron: 'You are iron: heavy, stubbornly blunt and short on patience.' },
});

/**
 * The egg addendum to the system prompt. The page says what he is wearing;
 * nothing it says reaches the model but a kind this knows and a finish
 * reduced to plain letters.
 */
export function eggBlock(egg) {
  const kind = typeof egg?.kind === 'string' && Object.hasOwn(EGG_TRAITS, egg.kind) ? egg.kind : 'original';
  const trait = EGG_TRAITS[kind];
  if (!trait) return '';
  const variant = typeof egg.variant === 'string' && /^[a-z ]{1,24}$/i.test(egg.variant) ? egg.variant.toLowerCase() : '';
  const named = trait.replace('{variant}', variant || kind);
  const finish = (variant && Object.hasOwn(EGG_FINISHES[kind] ?? {}, variant)) ? ` ${EGG_FINISHES[kind][variant]}` : '';
  return `\n\nWhat you are made of changes your manner, and you stay Marc, the egg, throughout. ${named}${finish}`;
}

/** How many memories ride along in the prompt, and how long each may be. */
export const MEMORY_LIMIT = 50;
export const MEMORY_LENGTH = 600;

/** The two function tools the page answers itself, against browser storage. */
export const MEMORY_TOOLS = Object.freeze([
  {
    type: 'function',
    name: 'remember',
    description: 'Store one short detail about the person you are talking to so it survives to the next call. Use it when they ask you to remember something, or plainly want you to. A few words to a sentence. Do not narrate it and do not overuse it.',
    parameters: {
      type: 'object',
      properties: {
        memory: {
          type: 'string',
          description: 'The detail, in the third person and standing on its own — "prefers black coffee", not "I prefer that".',
        },
      },
      required: ['memory'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'forget',
    description: 'Drop stored memories matching a keyword. Use it when they ask you to forget something.',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'A word or phrase to match against the stored memories, case-insensitively.',
        },
      },
      required: ['keyword'],
      additionalProperties: false,
    },
  },
]);

export function buildTools({ memory, connectors } = {}) {
  const tools = memory ? [...MEMORY_TOOLS] : [];
  tools.push(...connectorTools(connectors ?? []));
  return tools;
}

/**
 * What having a coding agent on the other end changes about the job. Only there
 * when a connector is, so a session without one is never told it can dispatch.
 *
 * It asks for no confirmation. Being told is the confirmation, and the agent
 * has sandbox policies of its own for the rest.
 */
export function connectorBlock(agents) {
  if (!agents?.length) return '';

  const labels = agents.map((name) => agentLabel(name));
  const roster = labels.length > 1
    ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
    : labels[0];

  return `\n\nSomeone has wired you up to ${roster}, a coding agent running on this machine. You can hand it work:
- dispatch_task gives one agent one task and comes straight back with a number. The work carries on after that, so do not wait on it, do not narrate it, and do not say anything about how it went — you do not know yet.
- Write the task for someone who was not in the conversation: what to change, where, and what done looks like. When they tell you to do something, dispatch it — do not ask them to confirm what they just said.
- check_task is the only way you find out. Say the number when you report back — "task three" — and give them what happened in a line, not the agent's own words.
- cancel_task stops one. What it already wrote stays written, and you say so.
- A line that arrives starting with "[workspace]" is the machine reporting in, not the person talking. Do not answer it as if they said it — tell them what landed, briefly, and hand it back.`;
}

/** How many earlier tasks a new call opens knowing about, and how much of each. */
export const TASK_RECAP = 5;
export const TASK_RECAP_LENGTH = 300;

/** What was dispatched before this call opened, so a redial isn't amnesia. */
export function tasksBlock(tasks) {
  const recent = (tasks ?? []).slice(-TASK_RECAP);
  if (!recent.length) return '';

  const lines = recent.map((task) => {
    const head = `- task ${task.id}, with ${task.agent}, "${task.task}" — ${task.status}`;
    if (task.status === 'running') return `${head} for ${task.ran_for}`;
    const said = (task.error || task.summary || '').replace(/\s+/g, ' ').slice(0, TASK_RECAP_LENGTH);
    return said ? `${head} after ${task.ran_for}: ${said}` : `${head} after ${task.ran_for}`;
  });

  return `\n\nWork dispatched earlier in this session, from before this call opened. Anything still running, check rather than assume:\n${lines.join('\n')}`;
}

/**
 * The memory addendum to the system prompt. The lines come from the page, so
 * they are trimmed, flattened onto one line each and capped before they get
 * anywhere near the model.
 */
export function memoryBlock(memories) {
  const lines = (Array.isArray(memories) ? memories : [])
    .filter((line) => typeof line === 'string')
    .map((line) => line.replace(/\s+/g, ' ').trim().slice(0, MEMORY_LENGTH))
    .filter(Boolean)
    .slice(-MEMORY_LIMIT);

  if (!lines.length) return '';

  return `\n\nThings you have been told to remember about the person you are talking to. Use one only when it is relevant, never read the list back, and never mention that you keep a list:\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

/**
 * What the turns ahead of a resumed call are. The items themselves carry the
 * conversation; this is the line that tells the model they are not this one.
 */
export function resumedBlock(resumed) {
  if (!resumed) return '';

  return '\n\nThe conversation before this point happened earlier, with the same'
    + ' person, and they have just come back to carry it on. Take it as said and'
    + ' pick up from it: no greeting them as a stranger, no summarising it back at'
    + ' them, and no remarking on the gap unless they do.';
}

/** GPT-Live owns speech; the Responses backend owns functions and lookups. */
export function sessionConfig(model, voice, {
  memories, memory = true, resumed, agents, tasks, history, egg,
  backendModel = 'gpt-6.1-terra', webSearch = true,
} = {}) {
  const input = (Array.isArray(history) ? history : [])
    .filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .slice(-40)
    .map((m) => ({
      type: 'message', role: m.role,
      content: [{ type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.content.slice(0, 6000) }],
    }));
  // A conservative UTF-8 byte budget also bounds tokens for non-English text.
  let bytes = input.reduce((n, m) => n + Buffer.byteLength(m.content[0].text), 0);
  while (bytes > 6000 && input.length) bytes -= Buffer.byteLength(input.shift().content[0].text);
  return {
    model,
    instructions: SYSTEM + '\nDelegate questions requiring reasoning, current information, memory changes or coding-agent actions to the backend. Keep listening while it works. Only report actions as successful after the backend confirms them.'
      + memoryBlock(memory ? memories : []) + eggBlock(egg) + resumedBlock(resumed),
    input,
    audio: { output: { voice } },
    delegation: {
      type: 'responses',
      responses: {
        model: backendModel,
        instructions: 'You support Marc, an egg in a live voice conversation. Resolve the latest request using the conversation and tools. Return concise verified results for Marc to speak. Never claim a tool succeeded without its result.'
          + (webSearch ? ' Use web search for current information and include source citations.' : '')
          + memoryBlock(memory ? memories : []) + connectorBlock(agents) + tasksBlock(tasks),
        tools: [...(webSearch ? [{ type: 'web_search' }] : []), ...buildTools({ memory, connectors: agents }).map((tool) => ({ ...tool, strict: false }))],
        tool_choice: 'auto',
        parallel_tool_calls: false,
      },
    },
  };
}
