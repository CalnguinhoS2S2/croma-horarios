'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EnrollmentDataset } = require('../src/domain/enrollment-dataset.js');
const { ImportEnrollments } = require('../src/application/import-enrollments.js');
const { GenerateSchedule } = require('../src/application/generate-schedule.js');
const { ExportSchedule } = require('../src/application/export-schedule.js');
const { createGenerator } = require('../src/composition/create-generator.js');

const records = [
  { student: '001', code: 'A', name: 'Álgebra' },
  { student: '001', code: 'B', name: 'Biologia' },
  { student: '002', code: 'C', name: 'Cálculo' }
];

test('importação depende do contrato do leitor e aceita uma fonte não CSV', () => {
  const useCase = new ImportEnrollments({ reader: { read: source => ({ records: JSON.parse(source) }) } });
  const data = useCase.execute(JSON.stringify(records));
  assert.equal(data.students.size, 2);
  assert.equal(data.courses.length, 3);
  assert.equal(data.courses[0].name, 'Álgebra');
});

test('validação do domínio independe do formato do arquivo', () => {
  assert.throws(() => EnrollmentDataset.fromRecords([{ student: '', code: 'A' }]), /preenchidos/);
  assert.throws(() => EnrollmentDataset.fromRecords([{ student: 1, code: 'A' }]), /textos/);
  assert.throws(() => EnrollmentDataset.fromRecords([]), /pelo menos uma/);
  assert.throws(() => EnrollmentDataset.fromRecords([{ student: '1', code: 'A', name: 'x'.repeat(301) }]), /300/);
});

test('rótulos de origem são adicionados fora do domínio', () => {
  const useCase = new ImportEnrollments({ reader: { read: () => ({ records: [{ student: '', code: 'A' }], sourceLabels: ['Registro da API 7'] }) } });
  assert.throws(() => useCase.execute('qualquer fonte'), /Registro da API 7: aluno/);
});

test('uma Strategy alternativa pode ser injetada sem alterar o caso de uso', () => {
  let receivedGraph;
  const coloring = { color(graph) {
    receivedGraph = graph;
    return new Map([['A', 10], ['B', 20], ['C', 10]]);
  } };
  const result = new GenerateSchedule({ coloring }).execute(EnrollmentDataset.fromRecords(records));
  assert.equal(receivedGraph.get('A').has('B'), true);
  assert.equal(result.slotCount, 2);
  assert.deepEqual([...result.colors], [['A', 0], ['B', 1], ['C', 0]]);
});

test('a validação rejeita Strategies que retornem conflitos ou colorações incompletas', () => {
  const data = EnrollmentDataset.fromRecords(records);
  for (const colors of [new Map(), new Map([['A', 0], ['B', 0], ['C', 0]]), new Map([['A', 0], ['B', -1], ['C', 0]]), new Map([['A', 0], ['B', NaN], ['C', 0]]), new Map([['A', 0], ['B', 1], ['X', 0]])]) {
    assert.throws(() => new GenerateSchedule({ coloring: { color: () => colors } }).execute(data));
  }
});

test('exportação produz um modelo neutro e usa o writer injetado', () => {
  const schedule = createGenerator().execute(EnrollmentDataset.fromRecords(records));
  let receivedRows;
  const useCase = new ExportSchedule({ writer: { write: rows => { receivedRows = rows; return JSON.stringify(rows); } } });
  const output = JSON.parse(useCase.execute(schedule, color => `Bloco ${color + 1}`));
  assert.deepEqual(output, receivedRows);
  assert.equal(output.length, 3);
  assert.ok(output.every(row => row.slot.startsWith('Bloco ') && typeof row.studentCount === 'number'));
});

test('identificadores iguais a propriedades de Object são nomes de disciplinas válidos', () => {
  const data = EnrollmentDataset.fromRecords([{ student: '__proto__', code: 'constructor' }, { student: '__proto__', code: '__proto__' }]);
  const result = createGenerator().execute(data);
  assert.equal(result.slotCount, 2);
  assert.deepEqual(data.courses.map(course => course.name), ['constructor', '__proto__']);
});
