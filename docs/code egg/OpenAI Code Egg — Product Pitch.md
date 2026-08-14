# OpenAI Code Egg
## The computer you can talk to.

**Concept by h1ddenpr0cess20 — unofficial OpenAI hardware concept**

What if an AI computer didn't need a screen?

What if you could simply talk to it, see when it was listening, watch it think, and know when it was actually doing something?

**Code Egg is a concept for a small, expressive AI computer built around OpenAI Realtime and Codex.**

It is not a smart speaker with a chatbot inside.

It is a physical interface to intelligence.

---

## The idea

Today, AI lives primarily inside screens: chat windows, apps, terminals and browsers.

Code Egg explores a different interface.

A small, speckled egg-shaped computer sits on a desk or countertop. It listens through a microphone array, responds through a spatial speaker, and communicates its state through subtle movement, light and sound.

When you speak, it leans toward you.

When it is thinking, it changes posture and spins.

When it speaks, its body moves with the rhythm of its voice.

When it is building something with Codex, you can see that work is actually happening.

**The interface isn't a screen. The interface is presence.**

---

## We don't need another AI donut

The current AI hardware conversation risks becoming a design exercise before it becomes a computing revolution.

A beautiful object sitting on a desk is not enough.

**We don't need to spend millions reinventing the donut if nobody can explain what the donut actually does.**

Code Egg starts from the opposite direction:

**What should an AI computer actually feel like to use?**

It should listen.

It should understand.

It should think.

It should act.

And it should make all four states understandable without forcing the user to stare at another screen.

The form follows that behavior.

The Egg isn't an expensive sculpture with AI inside.

**It's an AI computer that happens to have a body.**

---

## Why an egg?

The form is deliberately simple.

It has no screen to stare at, no face trying to imitate a human, and no robotic body pretending to be alive.

The egg gives computation a physical state without turning it into a person.

It can be:

- **Idle** — quietly present.
- **Listening** — attentive and leaning in.
- **Thinking** — visibly processing.
- **Speaking** — responding with movement synchronized to audio.
- **Building** — visibly executing an authorized task.

The physical behavior becomes a new kind of system status.

Instead of a spinner saying `Loading...`, the computer tells you what it is doing through its body.

---

## Built around OpenAI Realtime

The original Marc prototype already demonstrates the foundation for this interaction model.

Marc uses OpenAI Realtime over WebRTC, with server-side session configuration and semantic turn detection. Audio can flow directly between the client and OpenAI while the application maintains the surrounding interaction state.

Code Egg takes that architecture from a browser interface into a dedicated device.

### The experience

**You:**  
> "Code Egg, what's happening with my project?"

**Egg:**  
Listens.

Its body leans forward.

It processes the request.

It answers naturally.

Then:

**You:**  
> "Fix the failing tests."

The Egg asks for authorization if necessary, activates the Codex connection, and visibly transitions into its building state.

Codex works.

The Egg reports the result.

**Conversation becomes action.**

---

## Codex turns the speaker into a computer

This is the part that separates Code Egg from a conventional smart speaker.

A normal smart speaker primarily answers questions or controls other devices.

Code Egg could become an interface to an agent capable of doing real computer work.

With explicit user authorization, a request such as:

> "Add dark mode to my project."

could become:

**Conversation → intent → Codex task → execution → result**

The user doesn't have to open a terminal.

They don't have to watch a chat window.

They don't have to manually translate a conversation into a coding task.

The computer can move from understanding to execution.

---

## Designed around trust

A physical AI computer should make its boundaries obvious.

Code Egg should therefore make privacy and agency physical rather than hiding them in settings menus.

### Hardware-level controls

- Physical microphone mute
- Unambiguous recording/status indicator
- Explicit camera indicator if vision hardware is included
- User-controlled agent permissions
- Visible task execution state
- Clear separation between conversation and autonomous work

The principle is simple:

**If the computer is listening, you should know.  
If it is acting, you should know.  
If it needs permission, it should ask.**

---

## A new consumer-computing category

Code Egg sits somewhere between:

- a computer
- a smart speaker
- an AI assistant
- a creative tool
- an agent interface

But it isn't really any of those categories.

The opportunity is to make AI feel less like software you open and more like computing you interact with.

The device doesn't need to replace a laptop.

It can make the laptop more powerful.

A person could say:

> "Summarize these files."

> "Help me plan this."

> "Look at this bug."

> "Build me a prototype."

> "What changed in my project?"

> "Run the tests."

> "Explain what Codex just changed."

The Egg becomes the conversational front door to the rest of the computer.

---

## Why this prototype matters

This concept isn't starting from a render.

The underlying interaction has already been prototyped in **Marc**.

Marc demonstrates:

- OpenAI Realtime voice interaction
- WebRTC audio
- semantic turn-taking
- persistent conversation history
- explicit memory
- expressive 3D egg animation
- audio-reactive motion
- a provider-independent session seam
- a Codex connector
- headless Codex task execution
- bounded agent permissions

The important next step isn't making a better web demo.

It's asking:

**What happens when this interface becomes a real object?**

---

# The Product

### Code Egg

**Form factor:**  
Small desktop/home AI computer with a weighted charging base.

**Interaction:**  
Voice-first with touch and physical controls.

**Audio:**  
Far-field microphone array, echo cancellation and full-duplex speaker.

**Feedback:**  
Expressive movement, subtle light and audio.

**Optional vision:**  
Camera/vision system with an explicit physical privacy control.

**Connectivity:**  
Wi-Fi/Bluetooth with secure OpenAI Realtime connectivity.

**Intelligence:**  
OpenAI realtime conversational intelligence.

**Agent capability:**  
Codex integration with explicit permission and sandbox boundaries.

**Personality:**  
Expressive, useful and playful — but deliberately not a simulated human companion.

---

# The Design Principle

> **Don't make AI pretend to be a person. Make intelligence visible.**

The Egg doesn't need a human face.

It doesn't need to claim feelings.

It doesn't need to become a friend or therapist.

It simply gives computation a physical vocabulary.

Listening.

Thinking.

Speaking.

Building.

That is enough.

---

# The pitch to OpenAI

OpenAI has an opportunity to define what an AI-native consumer computer looks like before the category settles into another generation of screens and voice assistants.

Code Egg proposes a direction:

**A small, beautiful, physically expressive computer built around realtime intelligence and agentic capability.**

The prototype demonstrates the software interaction model.

OpenAI's hardware capabilities could turn that interaction into a consumer product.

And critically, this is not a proposal to make hardware for hardware's sake.

The industry doesn't need another beautifully machined object whose primary feature is that it photographs well.

**It needs a computer that earns its place on the desk.**

Code Egg does that by combining:

**Realtime** — conversation becomes natural.

**Physical motion** — AI state becomes understandable.

**Codex** — conversation becomes actionable.

**Hardware controls** — permissions become tangible.

**A dedicated object** — AI becomes available without requiring another screen.

The result isn't another donut.

**It's a computer.**

---

# The prototype path

### Phase 1 — Prove the interaction

Turn Marc into the definitive public software prototype.

Demonstrate:

`listen → think → speak → act`

### Phase 2 — Hardware prototype

Build an inexpensive physical Egg containing:

- microphone array
- speaker
- embedded computer
- status lighting
- motion mechanism
- physical mute
- wireless connectivity

### Phase 3 — Agent integration

Connect the device to a controlled Codex environment.

Make permissions and task status visible.

### Phase 4 — Industrial design

Develop the speckled ceramic-like shell, acoustic design, charging base and movement system.

### Phase 5 — Consumer testing

Put the device in real homes.

Measure whether physical state communication actually makes AI easier to understand and trust.

---

# The 60-second demo

The entire product should be understandable without a presentation.

A person walks up to the Egg.

**"Hey Code Egg."**

The Egg wakes.

**"What am I working on?"**

It listens.

It leans toward the person.

It thinks.

It spins.

It answers.

The person follows up:

**"Fix that bug."**

The Egg pauses.

**"I can have Codex work on that. Want me to?"**

**"Yes."**

The Egg changes state.

Codex begins.

A laptop screen in the background shows the repository changing.

The Egg continues moving while the work happens.

A moment later:

**"Done. I fixed the issue and the tests pass."**

The Egg settles back into idle.

No dashboard.

No tutorial.

No explanation required.

**You just watched an AI computer work.**

---

# Why now

The interface to AI is changing from:

**type → wait → read**

to:

**speak → understand → act**

That transition creates an opportunity for hardware.

The winning AI device may not be another phone-shaped computer.

It may be something much simpler:

**an object you can talk to.**

Code Egg is a proposal for what that object could feel like.

---

# The ask

This is an invitation to explore the concept, not a claim that OpenAI has endorsed it.

The prototype exists.

The interaction model exists.

The Codex bridge exists.

The next question is hardware:

**What could this become if realtime intelligence, agentic computing and industrial design were developed as one product?**

Not another donut.

Not another screen.

Not another AI gadget looking for a reason to exist.

**A computer that listens, thinks, speaks and builds.**

# OpenAI Code Egg

### The computer you can talk to.

*Unofficial concept. Not an OpenAI product or announcement.*