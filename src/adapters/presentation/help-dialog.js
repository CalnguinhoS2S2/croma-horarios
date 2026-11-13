'use strict';

const help = {
    format: `<h2 id="help-title">Um CSV. Muitas possibilidades.</h2><p>Cada linha representa a matrícula de um aluno em uma disciplina. Repita o aluno nas disciplinas que ele cursa.</p><pre>aluno,disciplina,nome\nA01,CAL,Cálculo\nA01,ALG,Algoritmos\nA02,CAL,Cálculo\nA02,BD,Banco de Dados</pre><p><strong>Obrigatórias:</strong> aluno e disciplina. <strong>Opcional:</strong> nome, para exibir o nome completo. Você também pode usar aluno,sigla,disciplina.</p><p>Use vírgula, ponto e vírgula ou tabulação como separador. Salve em UTF-8. Coloque entre aspas os valores que contêm separadores. Matrículas repetidas são contadas uma única vez.</p><p>Até 5 MB, 100 mil matrículas e mil disciplinas. Novas siglas são reconhecidas automaticamente.</p>`,
    algorithm: `<h2 id="help-title">Uma cor vira um horário.</h2><p>A mesma ideia de <strong>coloracaoHARD.cpp</strong>, agora em uma interface web.</p><ol><li><strong>Construímos um grafo.</strong> Cada disciplina é um vértice. Se um aluno cursa duas disciplinas, criamos uma ligação entre elas.</li><li><strong>Aplicamos DSATUR.</strong> A próxima disciplina é a que tem mais cores diferentes entre os vizinhos já coloridos. Em empate, escolhemos a de maior grau; depois, a ordem de cadastro.</li><li><strong>Escolhemos a menor cor disponível.</strong> Vizinhos sempre recebem cores diferentes. Cada cor define um bloco de horário.</li><li><strong>Validamos todas as conexões.</strong> Só mostramos o resultado quando nenhuma disciplina em conflito compartilha horário.</li></ol><p>DSATUR é uma <strong>heurística</strong>: encontra uma grade válida, mas não garante o menor número possível de horários em todo grafo.</p><p>A grade considera as matrículas do CSV. Salas, professores, datas e disponibilidade não fazem parte deste modelo. Início e duração apenas dão horas aos blocos encontrados.</p>`
  };

class HelpDialog {
  constructor({ document }) {
    this.$ = id => document.getElementById(id);
    const close = () => this.$('help-dialog').close();
    for (const id of ['close-dialog', 'dialog-done']) this.$(id).addEventListener('click', close);
    this.$('help-dialog').addEventListener('click', event => {
      if (event.target !== this.$('help-dialog')) return;
      const rect = this.$('help-dialog').getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
  }

  open(type) {
    this.$('help-content').innerHTML = help[type];
    this.$('help-dialog').showModal();
  }
}

module.exports = { HelpDialog };
