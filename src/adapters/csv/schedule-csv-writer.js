'use strict';

function csvCell(value) {
  let text = String(value);
  // Evita fórmulas ao abrir dados fornecidos pelo visitante em uma planilha.
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return /[",\n\r;]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

class ScheduleCsvWriter {
  write(records) {
    const rows = [['horario', 'sigla', 'disciplina', 'alunos']];
    for (const record of records) rows.push([record.slot, record.code, record.name, record.studentCount]);
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
}

module.exports = { ScheduleCsvWriter };
