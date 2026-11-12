/**
 * Changing the egg changes who Marc is — what he is made of is said as a call
 * opens — so a conversation that is under way cannot carry on across it. This
 * asks first, and when the answer is yes dresses him in the new egg and starts
 * a new conversation. The old one stays in the log.
 *
 * With nothing under way there is nothing to lose, and the egg just changes.
 * Returns whether it did: false is the picker's cue to put the old egg back.
 */
export function createEggSwitch({ marc, session, history, confirm, save, startFresh }) {
  /** A call that is up, or a thread open in the log, or one picked up and not yet dialed. */
  const underway = () => session.connected || Boolean(history.live) || session.context.length > 0;

  return {
    underway,

    async change(next) {
      if (underway()) {
        const ok = await confirm.ask({
          title: 'A new egg, a new conversation',
          text: 'What Marc is made of changes who he is, so this starts a new conversation. The one you are in stays in the log.',
          ok: 'New conversation',
          cancel: 'Keep this egg',
        });
        if (!ok) return false;
      }
      const was = underway();
      marc.setLook(next);
      save(next);
      session.egg = next;
      if (was) startFresh();
      return true;
    },
  };
}
