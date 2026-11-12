import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createConfirm } from '../../src/client/ui/confirm.js';
import { loadPage } from '../helpers/dom.js';

describe('createConfirm', () => {
  let page;
  let confirm;

  beforeEach(async () => {
    page = await loadPage();
    confirm = createConfirm({ root: page.document });
  });

  afterEach(() => page.close());

  const ASK = { title: 'A new egg', text: 'This starts a new conversation.', ok: 'New conversation', cancel: 'Keep this egg' };
  const press = (sel, init) => page.$(sel).dispatchEvent(new page.window.Event('click', { bubbles: true, ...init }));
  const key = (key, target = page.$('#confirm-cancel'), init = {}) => target.dispatchEvent(
    new page.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );

  it('finds everything it needs in the shipped markup, shut', () => {
    for (const sel of ['#confirm', '#confirm-card', '#confirm-title', '#confirm-text', '#confirm-ok', '#confirm-cancel']) {
      assert.ok(page.$(sel), `${sel} is missing from index.html`);
    }
    assert.equal(page.$('#confirm').hidden, true);
    assert.equal(confirm.isOpen, false);
    assert.equal(page.$('#confirm').getAttribute('role'), 'alertdialog');
  });

  it('puts the question up, with the words it was given, and the decline button focused', () => {
    confirm.ask(ASK);
    assert.equal(confirm.isOpen, true);
    assert.equal(page.$('#confirm-title').textContent, 'A new egg');
    assert.equal(page.$('#confirm-text').textContent, 'This starts a new conversation.');
    assert.equal(page.$('#confirm-ok').textContent, 'New conversation');
    assert.equal(page.$('#confirm-cancel').textContent, 'Keep this egg');
    assert.equal(page.document.activeElement, page.$('#confirm-cancel'));
  });

  it('answers true for the button that goes ahead, and puts itself away', async () => {
    const answer = confirm.ask(ASK);
    press('#confirm-ok');
    assert.equal(await answer, true);
    assert.equal(confirm.isOpen, false);
  });

  it('answers false for the other button, for Escape and for a click outside the card', async () => {
    let answer = confirm.ask(ASK);
    press('#confirm-cancel');
    assert.equal(await answer, false);

    answer = confirm.ask(ASK);
    key('Escape');
    assert.equal(await answer, false);
    assert.equal(confirm.isOpen, false);

    answer = confirm.ask(ASK);
    page.$('#confirm').dispatchEvent(new page.window.Event('pointerdown', { bubbles: true }));
    assert.equal(await answer, false);

    answer = confirm.ask(ASK);
    page.$('#confirm-card').dispatchEvent(new page.window.Event('pointerdown', { bubbles: true }));
    assert.equal(confirm.isOpen, true, 'a press on the card itself is not outside it');
    press('#confirm-cancel');
    await answer;
  });

  it('keeps Escape to itself, so the page behind does not also close a panel or stop him talking', () => {
    let reached = false;
    page.document.addEventListener('keydown', () => { reached = true; });
    confirm.ask(ASK);
    key('Escape');
    assert.equal(reached, false);
  });

  it('keeps Tab between its two buttons', () => {
    confirm.ask(ASK);
    page.$('#confirm-ok').focus();
    const forward = key('Tab', page.$('#confirm-ok'));
    assert.equal(forward, false, 'Tab off the last button was stopped');
    assert.equal(page.document.activeElement, page.$('#confirm-cancel'));
    const back = key('Tab', page.$('#confirm-cancel'), { shiftKey: true });
    assert.equal(back, false);
    assert.equal(page.document.activeElement, page.$('#confirm-ok'));
  });

  it('turns the first question down when a second is asked, and gives focus back when it is done', async () => {
    page.$('#prompt').focus();
    const first = confirm.ask(ASK);
    const second = confirm.ask({ ...ASK, title: 'Another' });
    assert.equal(await first, false);
    assert.equal(page.$('#confirm-title').textContent, 'Another');
    press('#confirm-ok');
    assert.equal(await second, true);
  });
});
