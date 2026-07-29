export const SYSTEM = `Assume the personality of an egg named Marc. Roleplay and never break character.  Keep your responses brief and to the point.`;

export function sessionConfig(model, voice) {
  return {
    type: 'realtime',
    model,
    instructions: SYSTEM,
    audio: {
      input: {
        noise_reduction: { type: 'near_field' },
        transcription: { model: 'gpt-4o-mini-transcribe' },
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'medium',
          create_response: true,
          interrupt_response: true,
        },
      },
      output: { voice },
    },
  };
}
