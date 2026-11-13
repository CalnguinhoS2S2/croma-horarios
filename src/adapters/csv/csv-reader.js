'use strict';

class CsvReader {
  read(input) {
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
}

module.exports = { CsvReader };
