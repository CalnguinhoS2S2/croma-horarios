'use strict';

const { CsvReader } = require('./csv-reader.js');
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_');

class EnrollmentCsvReader {
  constructor({ csv = new CsvReader() } = {}) { this.csv = csv; }

  read(text) {
    const rows = this.csv.read(text);
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
    if (rows.length === 1) throw new Error('O arquivo contém apenas o cabeçalho. Adicione pelo menos uma matrícula.');
    const records = [], sourceLabels = [];
    for (const { cells, line } of rows.slice(1)) {
      if (cells.length !== headers.length) throw new Error(`Linha ${line}: esperadas ${headers.length} colunas, recebidas ${cells.length}. Confira os separadores e as aspas.`);
      const name = nameCol >= 0 ? cells[nameCol] : (codeCol >= 0 && disciplineCol >= 0 ? cells[disciplineCol] : '');
      records.push({ student: cells[studentCol], code: cells[courseCol], name });
      sourceLabels.push(`Linha ${line}`);
    }
    return { records, sourceLabels };
  }
}

module.exports = { EnrollmentCsvReader };
