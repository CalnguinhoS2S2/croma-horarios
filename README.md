# Croma — horários sem conflito

Aplicação web em português para a apresentação do `coloracaoHARD.cpp`. Importe matrículas, gere horários com DSATUR, explore o grafo e exporte a grade.

## Abrir a aplicação

Abra **`dist/index.html`** no Chrome, Edge ou Firefox. Funciona localmente, sem instalação e sem internet. Os arquivos CSS e JavaScript devem ficar ao lado do HTML.

Para servir por HTTP, na pasta `web`, execute:

```powershell
python -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Abra http://localhost:8080. Por HTTP o cálculo roda em um Web Worker, mantendo a interface responsiva. Ao abrir o HTML diretamente, o cálculo roda no navegador sem Worker.

## Usar na apresentação

1. A tela inicia com os dados fictícios do CSV original. Clique em **Carregar exemplo** para reiniciar a demonstração.
2. Arraste seu CSV ou selecione um arquivo. Confira a quantidade de alunos e disciplinas.
3. Clique em **Gerar horários**. A grade anterior é removida ao importar novos dados, para evitar confusão.
4. Abra **Grafo de conflitos** e clique em uma disciplina para destacar os seus vizinhos.
5. Se desejar, defina início, duração e intervalo dos blocos. Isso apenas atribui horas aos blocos calculados.
6. Use **Exportar CSV** ou o botão de impressão para salvar em PDF.

## Formato do CSV

```csv
aluno,disciplina,nome
A01,CAL,Cálculo
A01,ALG,Algoritmos
A02,CAL,Cálculo
A02,BD,Banco de Dados
```

- `aluno` e `disciplina` são obrigatórios; `nome` é opcional.
- O formato `aluno,sigla,disciplina` também funciona: `sigla` identifica a disciplina e `disciplina` contém seu nome completo.
- Aceita vírgula, ponto e vírgula ou tabulação; UTF-8 com ou sem BOM; LF ou CRLF; aspas e valores com separadores.
- Identificadores distinguem maiúsculas de minúsculas. Espaços nas extremidades são removidos. Use a mesma sigla para a mesma disciplina em todas as linhas.
- Identificadores de alunos são mantidos como texto, preservando zeros à esquerda.
- Matrículas repetidas são ignoradas; nomes divergentes para uma mesma sigla geram erro.
- Disciplinas são descobertas no arquivo. Os nomes das oito disciplinas originais são preenchidos automaticamente quando `nome` não é fornecido.
- Limites: 5 MB, 100 mil linhas de matrículas e mil disciplinas. O grafo visual mostra redes de até 60 disciplinas; a grade e o CSV incluem todas.

O arquivo `dist/matriculas_exemplo.csv` é uma cópia do exemplo original.

## Algoritmo e limites

`dist/core.js` contém leitura do CSV, construção do grafo, DSATUR e validação. O critério é o mesmo do C++: maior saturação, maior grau e ordem de cadastro. Para as oito disciplinas do exemplo, a ordem de cadastro original é preservada. As cores usadas pelos vizinhos são atualizadas incrementalmente.

Uma aresta significa que duas disciplinas têm pelo menos um aluno em comum. Vizinhos recebem cores diferentes; cada cor vira um horário. Todas as arestas são verificadas antes de exibir a grade.

**DSATUR é uma heurística: não garante o menor número de horários para todo grafo.** A aplicação não modela salas, professores, disponibilidade ou datas. Ela produz blocos compatíveis segundo as matrículas fornecidas.

Nenhum dado enviado no formulário é transmitido a servidores ou guardado em armazenamento persistente. Recarregar a página restaura os dados fictícios.

## Verificação

Com Node.js instalado:

```powershell
node --test tests/core.test.cjs
```

Os testes verificam o CSV original, separadores, caracteres especiais, duplicatas, arquivos inválidos, clique, disciplinas isoladas, exportação e equivalência dos desempates DSATUR em todos os 1.024 grafos de cinco vértices.

`tests/browser_qa.py` usa Playwright e Chrome instalado para testar upload, geração, grafo, filtros, exportação, entrada inválida, responsividade e abertura offline. Requer um servidor local na porta 8080, a menos que `CROMA_QA_URL` seja definido.

## Arquivos

- `dist/`: aplicação completa, sem dependências de runtime e sem etapa de build.
- `tests/`: testes do algoritmo e do fluxo no navegador.
- `.openai/hosting.json`: configuração de hospedagem privada no Sites.
