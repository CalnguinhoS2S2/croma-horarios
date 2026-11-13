(function () {
  'use strict';
  const Core = window.CromaCore;
  const $ = id => document.getElementById(id);
  const escape = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const palette = [
    { color: '#6ea990', bg: '#f2f8f4', border: '#dfece2', ink: '#54856b' },
    { color: '#759fc1', bg: '#f0f5fa', border: '#dfe8f1', ink: '#5980a4' },
    { color: '#b19acb', bg: '#f6f2fa', border: '#e9e0f1', ink: '#9279ad' },
    { color: '#cfaa70', bg: '#fcf7ee', border: '#f0e5d2', ink: '#ad8a53' },
    { color: '#ca8b96', bg: '#fcf2f4', border: '#f0dce1', ink: '#ab6b79' },
    { color: '#74aaae', bg: '#eef8f8', border: '#d8ebeb', ink: '#538b91' }
  ];
  function colorAt(index) {
    if (index < palette.length) return palette[index];
    const hue = Math.round((index * 137.508) % 360);
    return { color: `hsl(${hue} 30% 57%)`, bg: `hsl(${hue} 38% 96%)`, border: `hsl(${hue} 30% 88%)`, ink: `hsl(${hue} 30% 35%)` };
  }
  const styleAt = index => {
    const c = colorAt(index);
    return `--slot-color:${c.color};--slot-bg:${c.bg};--slot-border:${c.border};--slot-ink:${c.ink}`;
  };
  const state = { text: Core.EXAMPLE, data: null, result: null, demo: true, busy: false, view: 'grade', page: 0, times: null, request: 0, worker: null, elapsed: 0 };
  let toastTimer;
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
  function showError(message) { $('error-message').textContent = message; $('error-message').hidden = false; }
  function clearError() { $('error-message').hidden = true; }
  function slotTime(index) {
    if (!state.times) return '';
    const start = state.times.start + index * (state.times.duration + state.times.break);
    const end = start + state.times.duration;
    const display = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const day = Math.floor(start / 1440);
    return `${day ? `D+${day} · ` : ''}${display(start)} – ${display(end)}${Math.floor(end / 1440) > day ? ' (+1 dia)' : ''}`;
  }
  function slotLabel(index) { return `H${index + 1}${state.times ? ` · ${slotTime(index)}` : ''}`; }
  function setBusy(busy) {
    state.busy = busy;
    for (const id of ['generate-button', 'example-button', 'dropzone', 'file-input']) $(id).disabled = busy;
    $('generate-button').innerHTML = `${icon('spark')}<span>${busy ? 'Organizando horários…' : 'Gerar horários'}</span>${icon('arrow')}`;
    $('generate-button').setAttribute('aria-busy', String(busy));
    if (busy) $('generate-button').querySelector('svg').classList.add('spinning');
  }
  function renderStats() {
    $('stat-students').textContent = state.data.students.size.toLocaleString('pt-BR');
    $('stat-courses').textContent = state.data.courses.length.toLocaleString('pt-BR');
    $('stat-slots').textContent = state.result ? state.result.slotCount : '—';
    $('stat-conflicts').textContent = state.result ? state.result.remainingConflicts : '—';
    document.querySelector('.stat-success').hidden = !state.result;
    $('export-button').disabled = !state.result;
    $('print-button').disabled = !state.result;
    $('demo-badge').hidden = !state.demo;
  }
  function renderSchedule() {
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
  function renderGraph() {
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
  function renderEnrollments() {
    const query = $('enrollment-search').value.trim().toLocaleLowerCase('pt-BR');
    const courseMap = new Map(state.data.courses.map(course => [course.code, course]));
    const rows = [];
    for (const [student, subjects] of state.data.students) for (const code of subjects) {
      const course = courseMap.get(code);
      if (!query || `${student} ${code} ${course.name}`.toLocaleLowerCase('pt-BR').includes(query)) rows.push({ student, course });
    }
    const pageSize = 15, pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    state.page = Math.min(state.page, pageCount - 1);
    const start = state.page * pageSize;
    $('enrollment-body').innerHTML = rows.slice(start, start + pageSize).map(({ student, course }) => {
      const color = state.result ? state.result.colors.get(course.code) : null;
      return `<tr><td>${escape(student)}</td><td>${escape(course.code)}</td><td>${escape(course.name)}</td><td>${color !== null ? `<span class="table-slot" style="${styleAt(color)}">${escape(slotLabel(color))}</span>` : 'A gerar'}</td></tr>`;
    }).join('') || '<tr><td colspan="4">Nenhuma matrícula encontrada para esta busca.</td></tr>';
    $('enrollment-count').textContent = `${rows.length.toLocaleString('pt-BR')} matrículas${query ? ' encontradas' : ' únicas'}`;
    $('pagination-info').textContent = rows.length ? `${start + 1}–${Math.min(start + pageSize, rows.length)} de ${rows.length.toLocaleString('pt-BR')}` : '0 resultados';
    $('previous-page').disabled = state.page === 0; $('next-page').disabled = state.page >= pageCount - 1;
  }
  function renderAll() { renderStats(); renderSchedule(); renderGraph(); renderEnrollments(); }
  function switchView(view, scroll) {
    state.view = view;
    document.querySelectorAll('[data-view]').forEach(tab => { const active = tab.dataset.view === view; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
    document.querySelectorAll('[data-nav]').forEach(button => { button.classList.toggle('active', button.dataset.nav === view); });
    for (const name of ['grade', 'grafo', 'matriculas']) $('view-' + name).hidden = name !== view;
    if (scroll) document.querySelector('.results-panel').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  function loadContent(text, name, demo) {
    const parsed = Core.parseEnrollments(text);
    state.text = text; state.data = parsed; state.result = null; state.demo = demo; state.page = 0;
    $('file-name').textContent = name;
    $('file-detail').textContent = `${parsed.enrollmentCount} matrículas · ${parsed.courses.length} disciplinas${parsed.duplicates ? ` · ${parsed.duplicates} duplicadas ignoradas` : ''}`;
    $('pending-message').textContent = 'Arquivo validado. Clique em “Gerar horários” para criar a grade com estes dados.';
    $('pending-message').hidden = false;
    $('results-subtitle').textContent = 'Arquivo importado. A grade será criada ao gerar os horários.';
    $('run-time').textContent = 'Aguardando geração';
    $('enrollment-search').value = '';
    clearError(); renderAll();
  }
  async function importFile(file) {
    if (!file || state.busy) return;
    const request = ++state.request;
    clearError();
    try {
      if (!/\.csv$/i.test(file.name)) throw new Error('Selecione um arquivo com a extensão .csv.');
      if (file.size > 5 * 1024 * 1024) throw new Error('O arquivo ultrapassa 5 MB. Envie um CSV menor.');
      const text = await file.text();
      if (request !== state.request) return;
      if (text.includes('\uFFFD')) throw new Error('Não foi possível ler os acentos do arquivo. Salve como CSV UTF-8 e tente novamente.');
      loadContent(text, file.name, false); toast('CSV importado. Pronto para gerar os horários.');
    } catch (error) { if (request === state.request) showError(`${error.message} O planejamento anterior foi preservado.`); }
    finally { $('file-input').value = ''; }
  }
  async function generate() {
    if (state.busy) return;
    clearError(); setBusy(true);
    const started = performance.now();
    try {
      const result = await new Promise((resolve, reject) => {
        if (location.protocol !== 'file:' && window.Worker) {
          const worker = new Worker('./worker.js'); state.worker = worker;
          worker.onmessage = event => { worker.terminate(); state.worker = null; event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result); };
          worker.onerror = () => { worker.terminate(); state.worker = null; reject(new Error('Não foi possível iniciar o cálculo. Atualize a página e tente novamente.')); };
          worker.postMessage(state.text);
        } else setTimeout(() => { try { resolve(Core.generateSchedule(state.data)); } catch (error) { reject(error); } }, 30);
      });
      state.result = result; state.data = result.data; state.elapsed = performance.now() - started;
      $('pending-message').hidden = true;
      $('results-subtitle').textContent = 'Uma visão clara de quem pode compartilhar o mesmo horário.';
      $('run-time').textContent = `Validado em ${Math.max(1, Math.round(state.elapsed))} ms · DSATUR`;
      renderAll(); switchView('grade', false);
      toast(`${result.slotCount} horários gerados. Nenhum conflito encontrado.`);
    } catch (error) { showError(error.message); }
    finally { setBusy(false); }
  }
  function download(text, filename) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const help = {
    format: `<h2 id="help-title">Um CSV. Muitas possibilidades.</h2><p>Cada linha representa a matrícula de um aluno em uma disciplina. Repita o aluno nas disciplinas que ele cursa.</p><pre>aluno,disciplina,nome\nA01,CAL,Cálculo\nA01,ALG,Algoritmos\nA02,CAL,Cálculo\nA02,BD,Banco de Dados</pre><p><strong>Obrigatórias:</strong> aluno e disciplina. <strong>Opcional:</strong> nome, para exibir o nome completo. Você também pode usar aluno,sigla,disciplina.</p><p>Use vírgula, ponto e vírgula ou tabulação como separador. Salve em UTF-8. Coloque entre aspas os valores que contêm separadores. Matrículas repetidas são contadas uma única vez.</p><p>Até 5 MB, 100 mil matrículas e mil disciplinas. Novas siglas são reconhecidas automaticamente.</p>`,
    algorithm: `<h2 id="help-title">Uma cor vira um horário.</h2><p>A mesma ideia de <strong>coloracaoHARD.cpp</strong>, agora em uma interface web.</p><ol><li><strong>Construímos um grafo.</strong> Cada disciplina é um vértice. Se um aluno cursa duas disciplinas, criamos uma ligação entre elas.</li><li><strong>Aplicamos DSATUR.</strong> A próxima disciplina é a que tem mais cores diferentes entre os vizinhos já coloridos. Em empate, escolhemos a de maior grau; depois, a ordem de cadastro.</li><li><strong>Escolhemos a menor cor disponível.</strong> Vizinhos sempre recebem cores diferentes. Cada cor define um bloco de horário.</li><li><strong>Validamos todas as conexões.</strong> Só mostramos o resultado quando nenhuma disciplina em conflito compartilha horário.</li></ol><p>DSATUR é uma <strong>heurística</strong>: encontra uma grade válida, mas não garante o menor número possível de horários em todo grafo.</p><p>A grade considera as matrículas do CSV. Salas, professores, datas e disponibilidade não fazem parte deste modelo. Início e duração apenas dão horas aos blocos encontrados.</p>`
  };
  function openHelp(type) { $('help-content').innerHTML = help[type]; $('help-dialog').showModal(); }
  $('format-button').addEventListener('click', () => openHelp('format'));
  for (const id of ['how-button', 'about-button']) $(id).addEventListener('click', () => openHelp('algorithm'));
  for (const id of ['close-dialog', 'dialog-done']) $(id).addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const rect = $('help-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('help-dialog').close(); } });
  document.querySelectorAll('[data-view]').forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view, false)));
  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.nav, true)));
  document.querySelector('.tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const views = ['grade', 'grafo', 'matriculas']; let index = views.indexOf(state.view);
    index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
    switchView(views[index], false); $('tab-' + views[index]).focus();
  });
  $('dropzone').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', event => importFile(event.target.files[0]));
  for (const eventName of ['dragenter', 'dragover']) $('dropzone').addEventListener(eventName, event => { event.preventDefault(); if (!state.busy) $('dropzone').classList.add('dragover'); });
  for (const eventName of ['dragleave', 'drop']) $('dropzone').addEventListener(eventName, event => { event.preventDefault(); $('dropzone').classList.remove('dragover'); });
  $('dropzone').addEventListener('drop', event => { if (event.dataTransfer.files.length !== 1) showError('Envie um CSV de matrículas por vez.'); else importFile(event.dataTransfer.files[0]); });
  window.addEventListener('dragover', event => { event.preventDefault(); });
  window.addEventListener('drop', event => { event.preventDefault(); });
  $('generate-button').addEventListener('click', generate);
  $('example-button').addEventListener('click', () => { if (state.busy) return; ++state.request; loadContent(Core.EXAMPLE, 'matriculas_exemplo.csv', true); generate(); });
  $('download-example').addEventListener('click', () => { download('\uFEFF' + Core.EXAMPLE, 'matriculas_exemplo.csv'); toast('CSV de exemplo baixado.'); });
  $('export-button').addEventListener('click', () => { if (!state.result) return; download(Core.exportCSV(state.result, slotLabel), 'cronograma_croma.csv'); toast('Cronograma exportado em CSV.'); });
  $('print-button').addEventListener('click', () => { switchView('grade', false); window.print(); });
  $('time-button').addEventListener('click', () => { $('time-form').hidden = !$('time-form').hidden; if (!$('time-form').hidden) $('start-time').focus(); });
  $('time-form').addEventListener('submit', event => {
    event.preventDefault(); if (!$('time-form').reportValidity()) return;
    const [hour, minute] = $('start-time').value.split(':').map(Number);
    state.times = { start: hour * 60 + minute, duration: Number($('duration').value), break: Number($('break-time').value) };
    renderSchedule(); renderGraph(); renderEnrollments(); toast('Início e duração aplicados à grade.');
  });
  $('clear-times').addEventListener('click', () => { state.times = null; $('time-form').hidden = true; renderSchedule(); renderGraph(); renderEnrollments(); });
  $('enrollment-search').addEventListener('input', () => { state.page = 0; renderEnrollments(); });
  $('previous-page').addEventListener('click', () => { state.page--; renderEnrollments(); });
  $('next-page').addEventListener('click', () => { state.page++; renderEnrollments(); });
  state.data = Core.parseEnrollments(Core.EXAMPLE);
  const started = performance.now(); state.result = Core.generateSchedule(state.data);
  state.elapsed = performance.now() - started;
  renderAll();
})();
