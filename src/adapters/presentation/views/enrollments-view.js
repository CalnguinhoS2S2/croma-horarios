'use strict';

const { escapeHtml: escape, styleAt, slotLabel: formatLabel } = require('../formatters.js');

class EnrollmentsView {
  constructor({ document }) {
    this.document = document;
    this.$ = id => document.getElementById(id);
  }

  render(snapshot, presentation) {
    const state = snapshot;
    const $ = this.$;
    const slotLabel = index => formatLabel(index, presentation.times);
    const query = $('enrollment-search').value.trim().toLocaleLowerCase('pt-BR');
    const courseMap = new Map(state.data.courses.map(course => [course.code, course]));
    const rows = [];
    for (const [student, subjects] of state.data.students) for (const code of subjects) {
      const course = courseMap.get(code);
      if (!query || `${student} ${code} ${course.name}`.toLocaleLowerCase('pt-BR').includes(query)) rows.push({ student, course });
    }
    const pageSize = 15, pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    presentation.page = Math.min(presentation.page, pageCount - 1);
    const start = presentation.page * pageSize;
    $('enrollment-body').innerHTML = rows.slice(start, start + pageSize).map(({ student, course }) => {
      const color = state.result ? state.result.colors.get(course.code) : null;
      return `<tr><td>${escape(student)}</td><td>${escape(course.code)}</td><td>${escape(course.name)}</td><td>${color !== null ? `<span class="table-slot" style="${styleAt(color)}">${escape(slotLabel(color))}</span>` : 'A gerar'}</td></tr>`;
    }).join('') || '<tr><td colspan="4">Nenhuma matrícula encontrada para esta busca.</td></tr>';
    $('enrollment-count').textContent = `${rows.length.toLocaleString('pt-BR')} matrículas${query ? ' encontradas' : ' únicas'}`;
    $('pagination-info').textContent = rows.length ? `${start + 1}–${Math.min(start + pageSize, rows.length)} de ${rows.length.toLocaleString('pt-BR')}` : '0 resultados';
    $('previous-page').disabled = presentation.page === 0; $('next-page').disabled = presentation.page >= pageCount - 1;
  }
}

module.exports = { EnrollmentsView };
