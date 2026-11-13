'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../src');
const allowed = {
  domain: new Set(['domain']),
  application: new Set(['application', 'domain']),
  adapters: new Set(['adapters', 'application', 'domain']),
  infrastructure: new Set(['infrastructure', 'adapters', 'application', 'domain'])
};

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : (entry.name.endsWith('.js') ? [target] : []);
  });
}

test('dependências estáticas respeitam a direção das camadas', () => {
  for (const filename of files(root)) {
    const relative = path.relative(root, filename);
    const layer = relative.split(path.sep)[0];
    if (!allowed[layer]) continue;
    const source = fs.readFileSync(filename, 'utf8');
    for (const match of source.matchAll(/\brequire\(['"]([^'"]+)['"]\)/g)) {
      const dependency = path.resolve(path.dirname(filename), match[1]);
      const targetLayer = path.relative(root, dependency).split(path.sep)[0];
      assert.ok(allowed[layer].has(targetLayer), `${relative} não pode depender de ${match[1]}`);
    }
  }
});

test('domínio e casos de uso não acessam ambiente, rede ou apresentação', () => {
  for (const directory of ['domain', 'application']) {
    for (const filename of files(path.join(root, directory))) {
      const source = fs.readFileSync(filename, 'utf8');
      assert.doesNotMatch(source, /\b(?:window|document|fetch|Worker|localStorage|sessionStorage|process)\s*[.(]/, path.relative(root, filename));
    }
  }
});

test('o controlador não depende de implementações do navegador ou de CSV', () => {
  const source = fs.readFileSync(path.join(root, 'adapters/presentation/planner-controller.js'), 'utf8');
  assert.doesNotMatch(source, /\b(?:window|document|Worker|Blob|URL)\s*[.(]/);
  assert.doesNotMatch(source, /require\([^)]*(?:infrastructure|csv)/);
});
