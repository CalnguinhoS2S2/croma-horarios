const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServices } = require('../src/composition/create-services.js');
const { CsvReader } = require('../src/adapters/csv/csv-reader.js');
const { DsaturColoring } = require('../src/domain/dsatur-coloring.js');
const { EXAMPLE } = require('../src/data/example.js');
const services = createServices();
const C = {
  EXAMPLE,
  readCSV: text => new CsvReader().read(text),
  parseEnrollments: text => services.importEnrollments.execute(text),
  generateSchedule: data => services.generateSchedule.execute(data),
  dsatur: graph => new DsaturColoring().color(graph),
  exportCSV: (result, formatSlot) => services.exportSchedule.execute(result, formatSlot)
};

function verify(result) {
  assert.equal(result.remainingConflicts, 0);
  assert.equal(result.colors.size, result.data.courses.length);
  for (const subjects of result.data.students.values()) {
    const slots = [...subjects].map(code => result.colors.get(code));
    assert.equal(new Set(slots).size, slots.length, 'aluno com disciplinas no mesmo horário');
  }
}
test('exemplo é o CSV original e preserva os dados do C++', () => {
  const original = fs.readFileSync(path.join(__dirname, '../public/matriculas_exemplo.csv'), 'utf8');
  assert.equal(C.EXAMPLE.trim(), original.replace(/\r/g, '').trim());
  const data = C.parseEnrollments(original), result = C.generateSchedule(data);
  assert.equal(data.students.size, 26); assert.equal(data.courses.length, 8);
  assert.equal(result.edgeCount, 18); verify(result);
});
test('separa vírgula, ponto e vírgula e tabulação, com BOM e CRLF', () => {
  for (const sep of [',', ';', '\t']) {
    const data = C.parseEnrollments(`\uFEFFaluno${sep}disciplina${sep}nome\r\n001${sep}MAT${sep}Matemática\r\n001${sep}FIS${sep}Física\r\n002${sep}MAT${sep}Matemática\r\n`);
    const result = C.generateSchedule(data); assert.equal(result.slotCount, 2); verify(result);
    assert.equal(data.courses.find(course => course.code === 'MAT').name, 'Matemática');
  }
});
test('nomes com vírgulas, aspas escapadas e quebras de linha', () => {
  const data = C.parseEnrollments('aluno,disciplina,nome\n"A,01",X,"Ciência, dados e ""IA"""\nB,Y,"Uma\nmatéria"');
  assert.equal(data.courses[0].name, 'Ciência, dados e "IA"');
  assert.equal(data.courses[1].name, 'Uma\nmatéria');
  verify(C.generateSchedule(data));
});
test('aceita o formato aluno,sigla,disciplina e identifica disciplinas novas', () => {
  const data = C.parseEnrollments('aluno;sigla;disciplina\n001;BIO;Biologia\n001;QUI;Química');
  assert.equal(data.courses[0].name, 'Biologia');
  assert.equal(C.generateSchedule(data).slotCount, 2);
});
test('duplicatas não criam autoarestas nem inflacionam as contagens', () => {
  const data = C.parseEnrollments('aluno,disciplina\n001,AA\n001,AA\n001,BB\n002,AA\n\n');
  assert.equal(data.duplicates, 1); assert.equal(data.enrollmentCount, 3);
  assert.equal(data.courses[0].students.size, 2);
  const result = C.generateSchedule(data); assert.equal(result.edgeCount, 1); verify(result);
});
test('uma disciplina ou disciplinas isoladas compartilham um único horário', () => {
  for (const csv of ['aluno,disciplina\nA,UMA', 'aluno,disciplina\nA,UMA\nB,OUTRA\nC,TERCEIRA']) {
    const result = C.generateSchedule(C.parseEnrollments(csv)); assert.equal(result.slotCount, 1); verify(result);
  }
});
test('clique: um aluno em N disciplinas exige N horários', () => {
  const csv = 'aluno,disciplina\n' + Array.from({ length: 12 }, (_, i) => `A,D${i}`).join('\n');
  const result = C.generateSchedule(C.parseEnrollments(csv));
  assert.equal(result.slotCount, 12); assert.equal(result.edgeCount, 66); verify(result);
});
test('CSV inválido informa a causa e a linha', () => {
  for (const csv of ['', 'aluno,disciplina', 'nome,curso\nA,B', 'aluno,aluno\nA,B', 'aluno,disciplina\nA,', 'aluno,disciplina\nA,B,C', 'aluno,disciplina\nA,"B', 'aluno,disciplina\nA,"B"C', 'aluno,disciplina,nome\nA,X,Um\nB,X,Outro']) assert.throws(() => C.parseEnrollments(csv));
  assert.throws(() => C.parseEnrollments('aluno,disciplina\nA,X\nB,'), /Linha 3/);
});
test('exportação é um CSV válido, com BOM e nomes com separadores', () => {
  const result = C.generateSchedule(C.parseEnrollments('aluno,disciplina,nome\nA,ABC,"Nome, com vírgula"\nB,XYZ,Outro'));
  const output = C.exportCSV(result);
  assert.equal(output.charCodeAt(0), 0xFEFF);
  const rows = C.readCSV(output);
  assert.deepEqual(rows[0].cells, ['horario', 'sigla', 'disciplina', 'alunos']);
  assert.equal(rows[1].cells[2], 'Nome, com vírgula');
  assert.match(C.exportCSV(result, i => `H${i + 1} · 08:00`), /H1 · 08:00/);
});
test('exportação neutraliza fórmulas e mantém dados HTML como texto', () => {
  const result = C.generateSchedule(C.parseEnrollments('aluno,disciplina,nome\nA,=1+1,<script>alert(1)</script>'));
  assert.match(C.exportCSV(result), /'=1\+1/);
  assert.equal(result.data.courses[0].name, '<script>alert(1)</script>');
});
test('DSATUR incremental equivale à seleção do C++ em todos os grafos de cinco vértices', () => {
  function reference(graph) {
    const colors = new Map();
    while (colors.size < graph.size) {
      let chosen, bestSat = -1, bestDegree = -1;
      for (const [code, neighbors] of graph) {
        if (colors.has(code)) continue;
        const used = new Set([...neighbors].filter(n => colors.has(n)).map(n => colors.get(n)));
        if (used.size > bestSat || (used.size === bestSat && neighbors.size > bestDegree)) { chosen = code; bestSat = used.size; bestDegree = neighbors.size; }
      }
      const forbidden = new Set([...graph.get(chosen)].filter(n => colors.has(n)).map(n => colors.get(n)));
      let color = 0; while (forbidden.has(color)) color++; colors.set(chosen, color);
    }
    return colors;
  }
  const edges = [];
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) edges.push([String(i), String(j)]);
  for (let mask = 0; mask < 1024; mask++) {
    const graph = new Map(Array.from({ length: 5 }, (_, i) => [String(i), new Set()]));
    edges.forEach(([a, b], bit) => { if (mask & (1 << bit)) { graph.get(a).add(b); graph.get(b).add(a); } });
    assert.deepEqual(C.dsatur(graph), reference(graph));
    const colors = C.dsatur(graph);
    for (const [a, neighbors] of graph) for (const b of neighbors) assert.notEqual(colors.get(a), colors.get(b));
  }
});
