'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServices } = require('../src/composition/create-services.js');
const { PlannerController } = require('../src/adapters/presentation/planner-controller.js');
const { PlannerStore } = require('../src/adapters/presentation/planner-store.js');
const { BrowserScheduleExecutor } = require('../src/infrastructure/browser/schedule-executor.js');
const { BrowserFileReader } = require('../src/infrastructure/browser/browser-files.js');
const { slotTime } = require('../src/adapters/presentation/formatters.js');
const { EXAMPLE } = require('../src/data/example.js');

function fixture(overrides = {}) {
  const services = createServices();
  const store = new PlannerStore();
  const downloads = [];
  const controller = new PlannerController({
    services, store,
    executor: { execute: async data => services.generateSchedule.execute(data), dispose() {} },
    fileReader: { read: async file => file.content },
    downloader: { save: file => downloads.push(file) },
    example: { text: EXAMPLE, filename: 'exemplo.csv' }, now: () => 10,
    ...overrides
  });
  controller.initialize();
  return { controller, services, store, downloads };
}

test('Observer publica snapshots novos e permite cancelar assinatura', () => {
  const store = new PlannerStore();
  const values = [];
  const unsubscribe = store.subscribe(snapshot => values.push(snapshot));
  const initial = store.getSnapshot();
  store.update({ busy: true });
  assert.equal(initial.busy, false);
  assert.equal(values.length, 2);
  assert.notEqual(values[0], values[1]);
  assert.equal(Object.isFrozen(values[1]), true);
  unsubscribe(); store.update({ busy: false });
  assert.equal(values.length, 2);
});

test('controlador importa e gera sem DOM; a grade antiga desaparece após importar', async () => {
  const { controller, store } = fixture();
  await controller.importFile({ name: 'novo.csv', content: 'aluno,disciplina\n001,X\n001,Y' });
  assert.equal(store.getSnapshot().result, null);
  assert.equal(store.getSnapshot().demo, false);
  assert.equal(store.getSnapshot().data.students.size, 1);
  await controller.generate();
  assert.equal(store.getSnapshot().result.slotCount, 2);
  assert.equal(store.getSnapshot().notice, null);
  assert.equal(store.getSnapshot().busy, false);
});

test('CSV inválido preserva o planejamento anterior e informa o erro', async () => {
  const { controller, store } = fixture();
  const original = store.getSnapshot().result;
  await controller.importFile({ name: 'erro.csv', content: 'aluno,disciplina\nA,' });
  assert.equal(store.getSnapshot().result, original);
  assert.match(store.getSnapshot().error, /Linha 2/);
  assert.match(store.getSnapshot().error, /anterior foi preservado/);
});

test('uma importação antiga que termina depois não substitui o arquivo mais recente', async () => {
  let finishOld;
  const { controller, store } = fixture({ fileReader: { read: file => file.name === 'antigo.csv' ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve(file.content) } });
  const old = controller.importFile({ name: 'antigo.csv' });
  await controller.importFile({ name: 'novo.csv', content: 'aluno,disciplina\nN,NOVO' });
  finishOld('aluno,disciplina\nA,ANTIGO'); await old;
  assert.equal(store.getSnapshot().filename, 'novo.csv');
  assert.equal(store.getSnapshot().data.courses[0].code, 'NOVO');
});

test('geração em andamento bloqueia comandos duplicados e restaura o estado em falha', async () => {
  let fail, executions = 0;
  const { controller, store } = fixture({ executor: { execute: () => { executions++; return new Promise((_, reject) => { fail = reject; }); }, dispose() {} } });
  const pending = controller.generate();
  await controller.generate();
  await controller.importFile({ name: 'outro.csv', content: 'aluno,disciplina\nA,Z' });
  assert.equal(executions, 1);
  assert.equal(store.getSnapshot().busy, true);
  fail(new Error('Falha simulada')); await pending;
  assert.equal(store.getSnapshot().busy, false);
  assert.equal(store.getSnapshot().data.students.size, 26);
  assert.equal(store.getSnapshot().error, 'Falha simulada');
});

test('exportação e exemplo usam a porta de download sem APIs do navegador', () => {
  const { controller, downloads } = fixture();
  controller.exportCurrent(); controller.downloadExample();
  assert.equal(downloads[0].filename, 'cronograma_croma.csv');
  assert.match(downloads[0].text, /horario,sigla,disciplina,alunos/);
  assert.equal(downloads[1].filename, 'exemplo.csv');
});

test('executor usa a thread local se a criação ou o carregamento do Worker falhar', async () => {
  for (const workerFactory of [null, () => { throw new Error('Bloqueado'); }, () => ({ postMessage() { this.onerror({ preventDefault() {} }); }, terminate() {} })]) {
    const executor = new BrowserScheduleExecutor({ generateSchedule: { execute: data => ({ received: data }) }, workerFactory, defer: setTimeout });
    assert.deepEqual(await executor.execute('matrículas'), { received: 'matrículas' });
    executor.dispose();
  }
});

test('executor transporta matrículas estruturadas ao Worker e libera o recurso', async () => {
  let terminated = false;
  const worker = { postMessage(data) { this.onmessage({ data: { result: { received: data } } }); }, terminate() { terminated = true; } };
  const executor = new BrowserScheduleExecutor({ generateSchedule: { execute() { throw new Error('não deve rodar localmente'); } }, workerFactory: () => worker, defer: setTimeout });
  const data = { students: new Map([['A', new Set(['X'])]]) };
  assert.deepEqual(await executor.execute(data), { received: data });
  assert.equal(terminated, true);
});

test('encerrar o executor cancela a Promise e impede novos cálculos', async () => {
  const executor = new BrowserScheduleExecutor({ generateSchedule: {}, workerFactory: () => ({ postMessage() {}, terminate() {} }), defer: setTimeout });
  const pending = executor.execute({});
  executor.dispose();
  await assert.rejects(pending, /cancelado/);
  await assert.rejects(executor.execute({}), /encerrado/);
});

test('leitor de arquivos rejeita extensão, tamanho e codificação inválidos', async () => {
  const reader = new BrowserFileReader();
  await assert.rejects(reader.read({ name: 'x.txt', size: 1 }), /extensão/);
  await assert.rejects(reader.read({ name: 'x.csv', size: 6 * 1024 * 1024 }), /5 MB/);
  await assert.rejects(reader.read({ name: 'x.csv', size: 1, text: async () => '\uFFFD' }), /UTF-8/);
});

test('rótulos de hora identificam mudanças de dia sem alterar a coloração', () => {
  assert.equal(slotTime(0, null), '');
  assert.equal(slotTime(0, { start: 1410, duration: 60, break: 0 }), '23:30 – 00:30 (+1 dia)');
  assert.equal(slotTime(1, { start: 1410, duration: 60, break: 0 }), 'D+1 · 00:30 – 01:30');
});
