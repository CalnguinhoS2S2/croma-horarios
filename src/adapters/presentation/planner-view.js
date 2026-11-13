'use strict';

const { icon, slotLabel } = require('./formatters.js');
const { ScheduleView } = require('./views/schedule-view.js');
const { GraphView } = require('./views/graph-view.js');
const { EnrollmentsView } = require('./views/enrollments-view.js');
const { HelpDialog } = require('./help-dialog.js');

/** Adaptador DOM: traduz eventos em comandos e snapshots em elementos visuais. */
class PlannerView {
  constructor({ document, window }) {
    Object.assign(this, { document, window });
    this.$ = id => document.getElementById(id);
    this.presentation = { view: 'grade', page: 0, times: null };
    this.snapshot = null;
    this.toastId = null;
    this.toastTimer = null;
    this.listeners = [];
    this.schedule = new ScheduleView({ document });
    this.graph = new GraphView({ document });
    this.enrollments = new EnrollmentsView({ document });
    this.help = new HelpDialog({ document });
  }

  on(node, event, handler) {
    node.addEventListener(event, handler);
    this.listeners.push(() => node.removeEventListener(event, handler));
  }

  bind(controller) {
    const $ = this.$;
    this.on($('format-button'), 'click', () => this.help.open('format'));
    for (const id of ['how-button', 'about-button']) this.on($(id), 'click', () => this.help.open('algorithm'));
    this.document.querySelectorAll('[data-view]').forEach(tab => this.on(tab, 'click', () => this.switchView(tab.dataset.view)));
    this.document.querySelectorAll('[data-nav]').forEach(button => this.on(button, 'click', () => this.switchView(button.dataset.nav, true)));
    this.on(this.document.querySelector('.tabs'), 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const views = ['grade', 'grafo', 'matriculas'];
      let index = views.indexOf(this.presentation.view);
      index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
      this.switchView(views[index]); $('tab-' + views[index]).focus();
    });

    const importFile = async file => {
      try { await controller.importFile(file); }
      finally { $('file-input').value = ''; }
    };
    this.on($('dropzone'), 'click', () => $('file-input').click());
    this.on($('file-input'), 'change', event => importFile(event.target.files[0]));
    for (const name of ['dragenter', 'dragover']) this.on($('dropzone'), name, event => {
      event.preventDefault();
      if (!this.snapshot.busy) $('dropzone').classList.add('dragover');
    });
    for (const name of ['dragleave', 'drop']) this.on($('dropzone'), name, event => { event.preventDefault(); $('dropzone').classList.remove('dragover'); });
    this.on($('dropzone'), 'drop', event => {
      if (event.dataTransfer.files.length !== 1) controller.reportError('Envie um CSV de matrículas por vez.');
      else importFile(event.dataTransfer.files[0]);
    });
    for (const name of ['dragover', 'drop']) this.on(this.window, name, event => event.preventDefault());

    this.on($('generate-button'), 'click', () => controller.generate());
    this.on($('example-button'), 'click', () => controller.loadExample());
    this.on($('download-example'), 'click', () => controller.downloadExample());
    this.on($('export-button'), 'click', () => controller.exportCurrent(index => slotLabel(index, this.presentation.times)));
    this.on($('print-button'), 'click', () => { this.switchView('grade'); this.window.print(); });

    this.on($('time-button'), 'click', () => { $('time-form').hidden = !$('time-form').hidden; if (!$('time-form').hidden) $('start-time').focus(); });
    this.on($('time-form'), 'submit', event => {
      event.preventDefault();
      if (!$('time-form').reportValidity()) return;
      const [hour, minute] = $('start-time').value.split(':').map(Number);
      this.presentation.times = { start: hour * 60 + minute, duration: Number($('duration').value), break: Number($('break-time').value) };
      this.renderResults(); this.showToast('Início e duração aplicados à grade.');
    });
    this.on($('clear-times'), 'click', () => { this.presentation.times = null; $('time-form').hidden = true; this.renderResults(); });
    this.on($('enrollment-search'), 'input', () => { this.presentation.page = 0; this.enrollments.render(this.snapshot, this.presentation); });
    this.on($('previous-page'), 'click', () => { this.presentation.page--; this.enrollments.render(this.snapshot, this.presentation); });
    this.on($('next-page'), 'click', () => { this.presentation.page++; this.enrollments.render(this.snapshot, this.presentation); });
  }

  render(snapshot) {
    const previous = this.snapshot;
    this.snapshot = snapshot;
    this.renderStatus(snapshot);
    if (!snapshot.data) return;
    const dataChanged = previous?.data !== snapshot.data;
    const resultChanged = previous?.result !== snapshot.result;
    if (dataChanged) { this.presentation.page = 0; this.$('enrollment-search').value = ''; }
    if (dataChanged || resultChanged) { this.renderStats(); this.renderResults(); }
    if (resultChanged && snapshot.result && !previous?.result) this.switchView('grade');
    if (snapshot.toast && snapshot.toast.id !== this.toastId) {
      this.toastId = snapshot.toast.id;
      this.showToast(snapshot.toast.message);
    }
  }

  renderStatus(snapshot) {
    const $ = this.$;
    for (const id of ['generate-button', 'example-button', 'dropzone', 'file-input']) $(id).disabled = snapshot.busy;
    if ($('generate-button').getAttribute('aria-busy') !== String(snapshot.busy)) {
      $('generate-button').innerHTML = `${icon('spark')}<span>${snapshot.busy ? 'Organizando horários…' : 'Gerar horários'}</span>${icon('arrow')}`;
      $('generate-button').setAttribute('aria-busy', String(snapshot.busy));
      if (snapshot.busy) $('generate-button').querySelector('svg').classList.add('spinning');
    }
    $('error-message').textContent = snapshot.error || '';
    $('error-message').hidden = !snapshot.error;
    $('pending-message').textContent = snapshot.notice || '';
    $('pending-message').hidden = !snapshot.notice;
    $('file-name').textContent = snapshot.filename;
    if (snapshot.data) {
      const data = snapshot.data;
      $('file-detail').textContent = `${data.enrollmentCount} matrículas · ${data.courses.length} disciplinas${data.duplicates ? ` · ${data.duplicates} duplicadas ignoradas` : ''}`;
    }
    $('results-subtitle').textContent = snapshot.result ? 'Uma visão clara de quem pode compartilhar o mesmo horário.' : 'Arquivo importado. A grade será criada ao gerar os horários.';
    $('run-time').textContent = snapshot.elapsed !== null ? `Validado em ${Math.max(1, Math.round(snapshot.elapsed))} ms · DSATUR` : 'Aguardando geração';
  }

  renderStats() {
    const { data, result, demo } = this.snapshot;
    this.$('stat-students').textContent = data.students.size.toLocaleString('pt-BR');
    this.$('stat-courses').textContent = data.courses.length.toLocaleString('pt-BR');
    this.$('stat-slots').textContent = result ? result.slotCount : '—';
    this.$('stat-conflicts').textContent = result ? result.remainingConflicts : '—';
    this.document.querySelector('.stat-success').hidden = !result;
    this.$('export-button').disabled = !result;
    this.$('print-button').disabled = !result;
    this.$('demo-badge').hidden = !demo;
  }

  renderResults() {
    this.schedule.render(this.snapshot, this.presentation);
    this.graph.render(this.snapshot, this.presentation);
    this.enrollments.render(this.snapshot, this.presentation);
  }

  switchView(view, scroll = false) {
    this.presentation.view = view;
    this.document.querySelectorAll('[data-view]').forEach(tab => {
      const active = tab.dataset.view === view;
      tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    });
    this.document.querySelectorAll('[data-nav]').forEach(button => button.classList.toggle('active', button.dataset.nav === view));
    for (const name of ['grade', 'grafo', 'matriculas']) this.$('view-' + name).hidden = name !== view;
    if (scroll) this.document.querySelector('.results-panel').scrollIntoView({ behavior: this.window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  showToast(message) {
    this.$('toast').textContent = message; this.$('toast').hidden = false;
    this.window.clearTimeout(this.toastTimer);
    this.toastTimer = this.window.setTimeout(() => { this.$('toast').hidden = true; }, 4500);
  }

  dispose() {
    this.window.clearTimeout(this.toastTimer);
    for (const remove of this.listeners) remove();
    this.listeners = [];
  }
}

module.exports = { PlannerView };
