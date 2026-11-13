'use strict';

const { escapeHtml: escape, icon, styleAt, slotTime: formatTime } = require('../formatters.js');

class ScheduleView {
  constructor({ document }) {
    this.document = document;
    this.$ = id => document.getElementById(id);
  }

  render(snapshot, presentation) {
    const state = snapshot;
    const document = this.document;
    const $ = this.$;
    const slotTime = index => formatTime(index, presentation.times);
    const grid = $('schedule-grid');
    grid.style.setProperty('--slot-columns', state.result ? Math.min(4, state.result.slotCount) : 3);
    if (!state.result) {
      grid.innerHTML = `<div class="empty-state">${icon('clock')}<strong>Seus dados estão prontos.</strong><span>Clique em “Gerar horários” para montar uma nova grade sem conflitos.</span></div>`;
      document.querySelector('.validation-strip').hidden = true;
      return;
    }
    grid.innerHTML = state.result.slots.map(slot => `<article class="slot" style="${styleAt(slot.color)}" aria-label="Horário ${slot.color + 1}"><div class="slot-header"><span class="slot-title"><i class="slot-marker"></i>Horário ${slot.color + 1}</span><span class="slot-count">${slot.courses.length} ${slot.courses.length === 1 ? 'disciplina' : 'disciplinas'}</span></div><div class="slot-time">${escape(slotTime(slot.color))}</div><div class="slot-courses">${slot.courses.map(course => `<div class="course-card"><div class="course-card-top"><span class="course-code">${escape(course.code)}</span><span class="course-degree" title="Disciplinas com alunos em comum">${state.result.graph.get(course.code).size} conexões</span></div><p class="course-name">${escape(course.name)}</p><span class="course-students">${icon('users')}${course.students.size} ${course.students.size === 1 ? 'aluno' : 'alunos'}</span></div>`).join('')}</div></article>`).join('');
    document.querySelector('.validation-strip').hidden = false;
    $('validation-detail').textContent = `${state.data.students.size} alunos verificados. Nenhum tem disciplinas simultâneas.`;
  }
}

module.exports = { ScheduleView };
