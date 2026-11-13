'use strict';

const { escapeHtml: escape, colorAt, slotLabel: formatLabel } = require('../formatters.js');

class GraphView {
  constructor({ document }) {
    this.document = document;
    this.$ = id => document.getElementById(id);
  }

  render(snapshot, presentation) {
    const state = snapshot;
    const $ = this.$;
    const slotLabel = index => formatLabel(index, presentation.times);
    const container = $('graph-container');
    if (!state.result) { container.innerHTML = '<div class="empty-state"><strong>Seu grafo começa por aqui.</strong><span>Gere os horários para visualizar as conexões entre disciplinas.</span></div>'; $('edge-count').textContent = ''; $('graph-legend').replaceChildren(); return; }
    const { graph, colors, edgeCount } = state.result;
    $('edge-count').textContent = `${edgeCount} ${edgeCount === 1 ? 'conexão' : 'conexões'}`;
    const courses = state.data.courses;
    if (courses.length > 60) {
      container.innerHTML = '<div class="empty-state"><strong>Uma rede com muitas conexões.</strong><span>A visualização interativa está disponível para até 60 disciplinas.<br>A grade e a exportação incluem todas as disciplinas do arquivo.</span></div>';
      $('graph-detail').textContent = `${courses.length} disciplinas e ${edgeCount} conexões calculadas.`;
      $('graph-legend').replaceChildren(); return;
    }
    const width = 760, height = Math.max(330, Math.min(550, courses.length * 10));
    const radius = Math.min(height * .36, 195);
    const nodeRadius = courses.length > 25 ? 19 : 25;
    const positions = courses.map((_, i) => {
      const angle = -Math.PI / 2 + 2 * Math.PI * i / courses.length;
      const r = courses.length === 1 ? 0 : radius;
      return { x: width / 2 + Math.cos(angle) * (courses.length > 25 && i % 2 ? r * .65 : r * 1.45), y: height / 2 + Math.sin(angle) * (courses.length > 25 && i % 2 ? r * .65 : r) };
    });
    const indices = new Map(courses.map((course, i) => [course.code, i]));
    let markup = `<svg class="conflict-graph" viewBox="0 0 ${width} ${height}" role="group" aria-label="Grafo de conflitos: cada ponto representa uma disciplina">`;
    for (let i = 0; i < courses.length; i++) for (const neighbor of graph.get(courses[i].code)) {
      const j = indices.get(neighbor);
      if (j <= i) continue;
      markup += `<line class="graph-edge" data-a="${i}" data-b="${j}" x1="${positions[i].x}" y1="${positions[i].y}" x2="${positions[j].x}" y2="${positions[j].y}"/>`;
    }
    courses.forEach((course, i) => {
      const color = colorAt(colors.get(course.code));
      const label = course.code.length > 7 ? course.code.slice(0, 6) + '…' : course.code;
      markup += `<g class="graph-node" data-index="${i}" role="button" tabindex="0" aria-label="${escape(course.name)}, horário ${colors.get(course.code) + 1}, ${graph.get(course.code).size} conexões" aria-pressed="false"><title>${escape(course.name)} · ${slotLabel(colors.get(course.code))}</title><circle cx="${positions[i].x}" cy="${positions[i].y}" r="${nodeRadius}" fill="${color.color}"/><text x="${positions[i].x}" y="${positions[i].y + 4}" text-anchor="middle" fill="#fff">${escape(label)}</text></g>`;
    });
    container.innerHTML = markup + '</svg>';
    $('graph-detail').textContent = 'Selecione uma disciplina para destacar suas conexões.';
    let selected = -1;
    function select(index) {
      selected = selected === index ? -1 : index;
      const course = courses[selected];
      const neighbors = course ? graph.get(course.code) : new Set();
      container.querySelectorAll('.graph-edge').forEach(edge => {
        const connected = Number(edge.dataset.a) === selected || Number(edge.dataset.b) === selected;
        edge.classList.toggle('highlight', selected >= 0 && connected); edge.classList.toggle('dimmed', selected >= 0 && !connected);
      });
      container.querySelectorAll('.graph-node').forEach(node => {
        const index = Number(node.dataset.index), isSelected = index === selected;
        node.classList.toggle('selected', isSelected); node.setAttribute('aria-pressed', String(isSelected));
        node.classList.toggle('dimmed', selected >= 0 && !isSelected && !neighbors.has(courses[index].code));
      });
      $('graph-detail').textContent = course ? `${course.name} · ${slotLabel(colors.get(course.code))}. ${neighbors.size ? `Alunos em comum com: ${[...neighbors].join(', ')}.` : 'Sem alunos em comum com outras disciplinas.'}` : 'Selecione uma disciplina para destacar suas conexões.';
    }
    container.querySelectorAll('.graph-node').forEach(node => {
      node.addEventListener('click', () => select(Number(node.dataset.index)));
      node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(Number(node.dataset.index)); } });
    });
    $('graph-legend').innerHTML = state.result.slots.map(slot => `<span><i style="background:${colorAt(slot.color).color}"></i>Horário ${slot.color + 1}</span>`).join('');
  }
}

module.exports = { GraphView };
