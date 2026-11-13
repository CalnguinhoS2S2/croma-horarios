'use strict';

// Empacota o subconjunto CommonJS local usado pelo projeto, sem dependências.
// Os bundles clássicos preservam a abertura direta por file://.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const outputRoot = path.join(root, 'dist');

function bundle(entry) {
  const modules = new Map();
  function visit(filename) {
    const absolute = path.resolve(filename);
    if (!absolute.startsWith(sourceRoot + path.sep)) throw new Error('O bundle só pode importar arquivos de src/.');
    if (modules.has(absolute)) return modules.get(absolute).id;
    const source = fs.readFileSync(absolute, 'utf8').replace(/\r\n?/g, '\n');
    const record = { id: modules.size, source, dependencies: {} };
    modules.set(absolute, record);
    for (const match of source.matchAll(/\brequire\(['"]([^'"]+)['"]\)/g)) {
      const request = match[1];
      if (!request.startsWith('.')) throw new Error(`Dependência externa não suportada: ${request}`);
      record.dependencies[request] = visit(path.resolve(path.dirname(absolute), request));
    }
    return record.id;
  }
  const entryId = visit(path.join(sourceRoot, entry));
  const definitions = [...modules.values()].map(({ id, source, dependencies }) => `${id}: [function(require, module, exports) {\n${source}\n}, ${JSON.stringify(dependencies)}]`).join(',\n');
  return `/* Gerado por scripts/build.cjs. Edite src/, não este arquivo. */\n(function () {\n'use strict';\nconst modules = {\n${definitions}\n};\nconst cache = {};\nfunction load(id) {\n  if (cache[id]) return cache[id].exports;\n  const record = modules[id];\n  const module = { exports: {} };\n  cache[id] = module;\n  record[0](request => {\n    if (!Object.hasOwn(record[1], request)) throw new Error('Módulo não declarado: ' + request);\n    return load(record[1][request]);\n  }, module, module.exports);\n  return module.exports;\n}\nload(${entryId});\n})();\n`;
}

fs.mkdirSync(outputRoot, { recursive: true });
for (const file of fs.readdirSync(path.join(root, 'public'))) {
  fs.copyFileSync(path.join(root, 'public', file), path.join(outputRoot, file));
}
fs.writeFileSync(path.join(outputRoot, 'app.js'), bundle('bootstrap.js'));
fs.writeFileSync(path.join(outputRoot, 'worker.js'), bundle('worker-bootstrap.js'));
// Remove apenas o bundle antigo substituído pela nova composição.
const legacyCore = path.join(outputRoot, 'core.js');
if (fs.existsSync(legacyCore)) fs.unlinkSync(legacyCore);
console.log('Croma gerado em dist/: aplicação e worker sem dependências de runtime.');
