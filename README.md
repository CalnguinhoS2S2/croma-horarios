# Croma — horários sem conflito

Aplicação web em português baseada no `coloracaoHARD.cpp`. Importe matrículas, gere horários com DSATUR, explore o grafo e exporte a grade.

**[Aplicação pública](https://calnguinhos2s2.github.io/croma-horarios/)** · **[Código-fonte](https://github.com/CalnguinhoS2S2/croma-horarios)** · **[Arquitetura e design patterns](docs/architecture.md)**

Qualquer pessoa pode testar sem login. As matrículas são processadas no navegador e permanecem em memória durante a sessão.

## Arquitetura

As dependências seguem a Arquitetura Limpa: regras de negócio independem de CSV, interface, navegador e hospedagem.

| Camada | Responsabilidade |
| --- | --- |
| `src/domain/` | Matrículas, grafo de conflitos, DSATUR e invariantes do cronograma. |
| `src/application/` | Casos de uso de importação, geração e exportação; contratos das dependências. |
| `src/adapters/csv/` | Conversão entre CSV e modelos da aplicação. |
| `src/adapters/presentation/` | Controlador, estado observável e componentes da interface. |
| `src/infrastructure/browser/` | Arquivos, downloads e execução em Web Worker. |
| `src/composition/` e os pontos de entrada | Montagem e injeção das implementações concretas. |

**Padrões aplicados:** Strategy para a coloração, Adapter para CSV e navegador, Observer para a interface e fábricas de composição com injeção de dependências. Veja o [diagrama, os fluxos e as decisões](docs/architecture.md).

## Executar localmente

Requer **Node.js 22 ou superior** para testar e gerar os arquivos. Não há dependências para instalar.

```powershell
git clone https://github.com/CalnguinhoS2S2/croma-horarios.git
cd croma-horarios
node --test
node scripts/build.cjs
```

Abra **`dist/index.html`** no navegador. Depois de gerada, essa pasta funciona sem servidor, Node.js ou internet; leve-a inteira para a apresentação.

Para servir por HTTP, na pasta do projeto:

```powershell
python -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Abra http://localhost:8080. Por HTTP o cálculo usa um Web Worker. Na abertura direta do HTML, ou se o Worker não estiver disponível, o mesmo caso de uso roda na thread local.

Edite o JavaScript em `src/` e a interface estática em `public/`. Execute novamente `node scripts/build.cjs` para atualizar `dist/`. Essa pasta contém arquivos gerados e não é versionada.

## Usar na apresentação

1. A aplicação inicia com as matrículas fictícias do exemplo original.
2. Arraste seu CSV ou selecione o arquivo. Confira a quantidade de alunos e disciplinas.
3. Clique em **Gerar horários**. Importar um arquivo válido remove a grade anterior até que o novo cálculo seja concluído.
4. Abra **Grafo de conflitos** e selecione uma disciplina para destacar suas conexões.
5. Se desejar, defina início, duração e intervalo dos blocos.
6. Use **Exportar CSV** ou imprima para salvar em PDF.

**Carregar exemplo** reinicia a demonstração. Um arquivo inválido preserva o último planejamento válido e apresenta a causa do erro.

## Formato do CSV

```csv
aluno,disciplina,nome
A01,CAL,Cálculo
A01,ALG,Algoritmos
A02,CAL,Cálculo
A02,BD,Banco de Dados
```

- `aluno` e `disciplina` são obrigatórios; `nome` é opcional.
- Também aceita `aluno,sigla,disciplina`, com o nome completo na coluna `disciplina`.
- Separadores: vírgula, ponto e vírgula ou tabulação. Codificação: UTF-8 com ou sem BOM.
- Valores com separadores devem estar entre aspas. Aspas escapadas, quebras de linha e linhas em branco são suportadas.
- Identificadores distinguem maiúsculas de minúsculas. Espaços nas extremidades são removidos e zeros à esquerda são preservados.
- Matrículas repetidas são ignoradas; nomes divergentes para a mesma sigla geram erro.
- Disciplinas são descobertas no CSV. O catálogo de demonstração fornece nomes para as oito siglas originais.
- Limites: 5 MB, 100 mil matrículas e mil disciplinas. A visualização do grafo está disponível para até 60 disciplinas; a grade e a exportação incluem todas.

O modelo está em [`public/matriculas_exemplo.csv`](public/matriculas_exemplo.csv).

## Algoritmo e limites do modelo

Uma aresta indica que duas disciplinas têm alunos em comum. DSATUR escolhe a próxima disciplina por maior saturação, maior grau e ordem de cadastro. Vizinhos recebem cores diferentes e cada cor corresponde a um horário. A ordem original das oito disciplinas do exemplo é fornecida pela composição, preservando os desempates do C++.

O domínio verifica a coloração antes de produzir o resultado, inclusive quando a Strategy é substituída.

**DSATUR é uma heurística: não garante o menor número de horários para todo grafo.** O modelo considera as matrículas informadas. Salas, professores, datas e disponibilidade não são modelados. Início e duração atribuem horas aos blocos já calculados.

## Testes

```powershell
node --test
```

A suíte cobre o CSV original, caracteres especiais, duplicatas, entradas inválidas, invariantes, exportação, contratos dos casos de uso, importações concorrentes, estado observável, execução com e sem Worker e limites entre camadas. A equivalência do DSATUR é verificada nos 1.024 grafos de cinco vértices.

Para testar o navegador, instale Playwright em seu ambiente Python, tenha Chrome disponível e mantenha o servidor local ativo:

```powershell
python -m pip install playwright
python tests/browser_qa.py
```

O caminho padrão do Chrome está em `tests/browser_qa.py`; ajuste por `CROMA_CHROME`. A URL pode ser definida por `CROMA_QA_URL`. O teste cobre upload, geração, grafo, busca, download, entrada inválida, conteúdo HTML no CSV, celular e abertura por `file://`.

## Publicação

O workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) executa os testes, gera `dist/` e publica no GitHub Pages a cada envio para `main`. Também permite execução manual em **Actions**. Em **Settings → Pages**, a origem é **GitHub Actions**.

O arquivo `.openai/hosting.json` identifica a publicação original no Sites; o GitHub Pages usa o workflow acima.
