/* DSATUR adaptado de coloracaoHARD.cpp. Sem dependências ou acesso à rede. */
(function (root) {
  'use strict';
  const COURSE_NAMES = {
    CAL: 'Cálculo', ALG: 'Algoritmos', BD: 'Banco de Dados', RED: 'Redes',
    SO: 'Sistemas Operacionais', IA: 'Inteligência Artificial',
    EST: 'Estatística', ED: 'Estruturas de Dados'
  };
  const COURSE_ORDER = Object.keys(COURSE_NAMES);
  const EXAMPLE = 'aluno,disciplina\nA01,CAL\nA01,ALG\nA02,CAL\nA02,BD\nA03,CAL\nA03,SO\nA04,ALG\nA04,BD\nA05,ALG\nA05,RED\nA06,ALG\nA06,IA\nA07,BD\nA07,RED\nA08,BD\nA08,SO\nA09,BD\nA09,IA\nA10,BD\nA10,EST\nA11,RED\nA11,SO\nA12,RED\nA12,ED\nA13,RED\nA13,EST\nA14,SO\nA14,IA\nA15,SO\nA15,ED\nA16,IA\nA16,ED\nA17,IA\nA17,EST\nA18,EST\nA18,ED\nA19,CAL\nA20,ALG\nA21,BD\nA22,RED\nA23,SO\nA24,IA\nA25,EST\nA26,ED\n';
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  function readCSV(input) {
    if (typeof input !== 'string' || !input.trim()) throw new Error('O CSV está vazio. Adicione o cabeçalho e pelo menos uma matrícula.');
    if (input.length > 5 * 1024 * 1024) throw new Error('O arquivo ultrapassa 5 MB. Divida as matrículas em um arquivo menor.');
    const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const firstLine = text.split('\n').find(line => line.trim()) || '';
    let quoted = false;
    const counts = { ',': 0, ';': 0, '\t': 0 };
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        if (quoted && firstLine[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && Object.hasOwn(counts, firstLine[i])) counts[firstLine[i]]++;
    }
    const delimiter = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    const rows = [];
    let row = [], field = '', inQuotes = false, closedQuote = false, line = 1, rowLine = 1;
    function finishField() { row.push(field.trim()); field = ''; closedQuote = false; }
    function finishRow() {
      finishField();
      if (row.some(value => value !== '')) rows.push({ cells: row, line: rowLine });
      row = []; rowLine = line + 1;
      if (rows.length > 100001) throw new Error('O limite é de 100 mil matrículas por arquivo.');
    }
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; closedQuote = true; }
        } else field += ch;
      } else if (ch === delimiter) finishField();
      else if (ch === '\n') finishRow();
      else if (ch === '"') {
        if (field.trim() || closedQuote) throw new Error(`Aspas fora de posição na linha ${line}.`);
        field = ''; inQuotes = true;
      } else {
        if (closedQuote && ch.trim()) throw new Error(`Separador ausente após as aspas na linha ${line}.`);
        if (!closedQuote) field += ch;
      }
      if (ch === '\n') line++;
    }
    if (inQuotes) throw new Error(`Aspas não fechadas no CSV, a partir da linha ${rowLine}.`);
    if (field || row.length || closedQuote) finishRow();
    return rows;
  }

  function parseEnrollments(text) {
    const rows = readCSV(text);
    if (!rows.length) throw new Error('O CSV está vazio.');
    const headers = rows[0].cells.map(normalize);
    if (new Set(headers).size !== headers.length) throw new Error('O cabeçalho contém colunas repetidas.');
    const find = names => headers.findIndex(header => names.includes(header));
    const studentCol = find(['aluno', 'matricula', 'id_aluno', 'estudante']);
    const codeCol = find(['sigla', 'codigo', 'codigo_disciplina']);
    const disciplineCol = find(['disciplina', 'materia']);
    const courseCol = codeCol >= 0 ? codeCol : disciplineCol;
    const nameCol = find(['nome', 'nome_disciplina']);
    if (studentCol < 0 || courseCol < 0) throw new Error('Cabeçalho inválido. Use aluno,disciplina. A coluna nome é opcional.');
    const students = new Map(), courses = new Map();
    let duplicates = 0, totalRows = 0;
    for (const { cells, line } of rows.slice(1)) {
      if (cells.length !== headers.length) throw new Error(`Linha ${line}: esperadas ${headers.length} colunas, recebidas ${cells.length}. Confira os separadores e as aspas.`);
      const student = cells[studentCol], code = cells[courseCol];
      if (!student || !code) throw new Error(`Linha ${line}: aluno e disciplina precisam estar preenchidos.`);
      if (student.length > 200 || code.length > 200) throw new Error(`Linha ${line}: use identificadores de até 200 caracteres.`);
      const explicitName = nameCol >= 0 ? cells[nameCol] : (codeCol >= 0 && disciplineCol >= 0 ? cells[disciplineCol] : '');
      if (explicitName.length > 300) throw new Error(`Linha ${line}: o nome da disciplina ultrapassa 300 caracteres.`);
      if (!courses.has(code)) courses.set(code, { code, name: explicitName || COURSE_NAMES[code] || code, students: new Set(), explicitName: explicitName || '' });
      const course = courses.get(code);
      if (explicitName && course.explicitName && course.explicitName !== explicitName) throw new Error(`Linha ${line}: a disciplina ${code} tem dois nomes diferentes.`);
      if (explicitName) { course.name = explicitName; course.explicitName = explicitName; }
      if (!students.has(student)) students.set(student, new Set());
      if (students.get(student).has(code)) duplicates++;
      else { students.get(student).add(code); course.students.add(student); }
      totalRows++;
      if (courses.size > 1000) throw new Error('O limite desta versão é de mil disciplinas por arquivo.');
    }
    if (!totalRows) throw new Error('O arquivo contém apenas o cabeçalho. Adicione pelo menos uma matrícula.');
    // Mantém os desempates do C++ para as disciplinas do exemplo.
    const orderedCourses = [...courses.values()].sort((a, b) => {
      const ai = COURSE_ORDER.indexOf(a.code), bi = COURSE_ORDER.indexOf(b.code);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return 0;
    });
    return { students, courses: orderedCourses, duplicates, totalRows, enrollmentCount: totalRows - duplicates };
  }

  function createGraph(data) {
    const graph = new Map(data.courses.map(course => [course.code, new Set()]));
    for (const subjects of data.students.values()) {
      const list = [...subjects];
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        graph.get(list[i]).add(list[j]); graph.get(list[j]).add(list[i]);
      }
    }
    return graph;
  }

  function dsatur(graph) {
    const colors = new Map();
    const saturation = new Map([...graph.keys()].map(code => [code, new Set()]));
    while (colors.size < graph.size) {
      let chosen = null, bestSaturation = -1, bestDegree = -1;
      for (const [code, neighbors] of graph) {
        if (colors.has(code)) continue;
        const sat = saturation.get(code).size;
        if (sat > bestSaturation || (sat === bestSaturation && neighbors.size > bestDegree)) {
          chosen = code; bestSaturation = sat; bestDegree = neighbors.size;
        }
      }
      let color = 0;
      while (saturation.get(chosen).has(color)) color++;
      colors.set(chosen, color);
      for (const neighbor of graph.get(chosen)) if (!colors.has(neighbor)) saturation.get(neighbor).add(color);
    }
    return colors;
  }

  function generateSchedule(data) {
    const graph = createGraph(data), colors = dsatur(graph);
    let remainingConflicts = 0, edgeCount = 0;
    for (const [code, neighbors] of graph) for (const neighbor of neighbors) {
      edgeCount++;
      if (colors.get(code) === colors.get(neighbor)) remainingConflicts++;
    }
    if (remainingConflicts) throw new Error('Não foi possível validar a grade. Reimporte os dados e tente novamente.');
    const slotCount = Math.max(...colors.values()) + 1;
    const slots = Array.from({ length: slotCount }, (_, color) => ({ color, courses: data.courses.filter(course => colors.get(course.code) === color) }));
    return { graph, colors, edgeCount: edgeCount / 2, remainingConflicts, slotCount, slots, data };
  }

  function csvCell(value) {
    let text = String(value);
    // Evita interpretar identificadores enviados pelo usuário como fórmulas no Excel.
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return /[",\n\r;]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function exportCSV(result, formatSlot = color => `H${color + 1}`) {
    const rows = [['horario', 'sigla', 'disciplina', 'alunos']];
    for (const slot of result.slots) for (const course of slot.courses) rows.push([formatSlot(slot.color), course.code, course.name, course.students.size]);
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  const api = { COURSE_NAMES, EXAMPLE, readCSV, parseEnrollments, createGraph, dsatur, generateSchedule, exportCSV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CromaCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
