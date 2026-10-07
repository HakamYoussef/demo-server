import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
test('Tailwind form and heading utilities outrank Chakra UI reset rules', async () => {
  const source = fileURLToPath(new URL('../src/app/globals.css', import.meta.url));
  const base = fileURLToPath(new URL('../', import.meta.url));
  const result = await postcss([tailwind({ base })]).process(await readFile(source, 'utf8'), { from: source });
  for (const selector of ['.px-12', '.py-3', '.border-2', '.text-2xl', '.font-bold', '.bg-white']) {
    let rule; result.root.walkRules(selector, candidate => { rule = candidate; });
    assert.ok(rule, `Missing ${selector}`);
    for (let parent = rule.parent; parent; parent = parent.parent) assert.ok(!(parent.type === 'atrule' && parent.name === 'layer'), `${selector} must outrank unlayered Chakra resets`);
  }
});
