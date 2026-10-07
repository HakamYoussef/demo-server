import test from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch } from '../src/app/lib/api.mjs';

test('API requests retain cookies, remove obsolete bearer headers, and refuse other origins', async () => {
  const original = globalThis.fetch;
  let captured;
  globalThis.fetch = async (input, options) => { captured = { input, options }; return new Response('{}'); };
  try {
    await apiFetch('/api/admin/threshold', { method: 'POST', credentials: 'omit', headers: { Authorization: 'Bearer obsolete', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(captured.input, '/api/admin/threshold');
    assert.equal(captured.options.credentials, 'same-origin');
    assert.equal(captured.options.headers.has('Authorization'), false);
    assert.equal(captured.options.headers.get('Content-Type'), 'application/json');
    await assert.rejects(apiFetch('http://untrusted.example/api/users/login'), /same origin/);
    await assert.rejects(apiFetch('//untrusted.example/api/users/login'), /same origin/);
  } finally { globalThis.fetch = original; }
});
test('a rejected session clears client auth state; a failed login does not clear it', async () => {
  const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
  const events = [];
  globalThis.window = { dispatchEvent(event) { events.push(event.type); } };
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  try {
    await apiFetch('/api/users/me'); await apiFetch('/api/users/login');
    assert.deepEqual(events, ['session-expired']);
  } finally { globalThis.fetch = originalFetch; globalThis.window = originalWindow; }
});
