/*
 * Origem e autoria do projeto:
 * A implementacao original deste programa em C++ foi desenvolvida pelo autor
 * do projeto, CalnguinhoS2S2, sem ajuda de IA.
 * Depois, o autor pediu ao ChatGPT/Codex que criasse a aplicacao web a partir
 * deste codigo e, posteriormente, a refatorasse com Arquitetura Limpa.
 * Esta versao inclui um ajuste posterior na localizacao do arquivo CSV,
 * realizado com apoio de IA. A logica original de coloracao foi preservada.
 */

#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

using namespace std;
namespace fs = std::filesystem;

struct Disciplina {
    string sigla;
    string nome;
};

const vector<Disciplina> disciplinas = {
    {"CAL", "Calculo"}, {"ALG", "Algoritmos"},
    {"BD", "Banco de Dados"}, {"RED", "Redes"},
    {"SO", "Sistemas Operacionais"}, {"IA", "Inteligencia Artificial"},
    {"EST", "Estatistica"}, {"ED", "Estruturas de Dados"}
};

using Grafo = map<string, set<string>>;
using Cores = map<string, int>;

string localizarCSVPadrao(const char* executavel) {
    const fs::path nome = "matriculas_exemplo.csv";
    const fs::path pastaExecutavel = fs::absolute(executavel).parent_path();
    // O executavel pode estar na pasta do codigo ou na subpasta output.
    const vector<fs::path> candidatos = {
        nome,
        pastaExecutavel / nome,
        pastaExecutavel.parent_path() / nome,
        fs::path(__FILE__).parent_path() / nome
    };
    for (const auto& caminho : candidatos)
        if (fs::is_regular_file(caminho)) return caminho.string();
    return nome.string();
}

string nomeDaDisciplina(const string& sigla) {
    for (const auto& d : disciplinas)
        if (d.sigla == sigla) return d.nome;
    return sigla;
}

// Cada linha do CSV tem: aluno,disciplina.
// Dois vertices sao adjacentes se um aluno cursa ambas as disciplinas.
Grafo montarGrafo(const string& arquivo, int& totalAlunos) {
    Grafo grafo;
    for (const auto& d : disciplinas) grafo[d.sigla] = {};

    ifstream entrada(arquivo);
    if (!entrada)
        throw runtime_error("Nao foi possivel abrir: " + arquivo +
                            "\nDiretorio de execucao: " + fs::current_path().string() +
                            "\nInforme o caminho do CSV como argumento, se necessario.");

    map<string, set<string>> matriculas;
    string linha;
    getline(entrada, linha);  // ignora cabecalho
    while (getline(entrada, linha)) {
        if (!linha.empty() && linha.back() == '\r') linha.pop_back();
        if (linha.empty()) continue;

        string aluno, sigla;
        stringstream ss(linha);
        getline(ss, aluno, ',');
        getline(ss, sigla, ',');
        if (aluno.empty() || sigla.empty())
            throw runtime_error("Linha CSV incompleta: " + linha);
        if (!grafo.count(sigla))
            throw runtime_error("Disciplina desconhecida: " + sigla);
        matriculas[aluno].insert(sigla);
    }

    totalAlunos = static_cast<int>(matriculas.size());
    for (const auto& [aluno, materias] : matriculas) {
        (void) aluno;
        for (auto it = materias.begin(); it != materias.end(); ++it) {
            for (auto jt = next(it); jt != materias.end(); ++jt) {
                grafo[*it].insert(*jt);
                grafo[*jt].insert(*it);
            }
        }
    }
    return grafo;
}

// DSATUR: escolhe o vertice com mais cores distintas entre seus vizinhos
// ja coloridos. Em empate, prioriza maior grau; depois, ordem cadastrada.
Cores dsatur(const Grafo& grafo) {
    Cores cores;

    while (cores.size() < grafo.size()) {
        string escolhido;
        int maiorSaturacao = -1, maiorGrau = -1;

        for (const auto& d : disciplinas) {
            const string& v = d.sigla;
            if (cores.count(v)) continue;

            set<int> coresVizinhas;
            for (const auto& vizinho : grafo.at(v)) {
                if (cores.count(vizinho))
                    coresVizinhas.insert(cores.at(vizinho));
            }

            int saturacao = static_cast<int>(coresVizinhas.size());
            int grau = static_cast<int>(grafo.at(v).size());
            if (saturacao > maiorSaturacao ||
                (saturacao == maiorSaturacao && grau > maiorGrau)) {
                escolhido = v;
                maiorSaturacao = saturacao;
                maiorGrau = grau;
            }
        }

        set<int> proibidas;
        for (const auto& vizinho : grafo.at(escolhido)) {
            if (cores.count(vizinho)) proibidas.insert(cores.at(vizinho));
        }

        int cor = 0;
        while (proibidas.count(cor)) ++cor;  // menor cor disponivel
        cores[escolhido] = cor;
    }
    return cores;
}

int contarConflitos(const Grafo& grafo, const Cores& cores) {
    int conflitos = 0;
    for (const auto& [v, vizinhos] : grafo)
        for (const auto& u : vizinhos)
            if (v < u && cores.at(v) == cores.at(u)) ++conflitos;
    return conflitos;
}

int main(int argc, char* argv[]) {
    try {
        string entrada = argc > 1 ? argv[1] : localizarCSVPadrao(argv[0]);
        int totalAlunos = 0;
        Grafo grafo = montarGrafo(entrada, totalAlunos);
        Cores cores = dsatur(grafo);

        int arestas = 0, maxCor = -1;
        for (const auto& [v, vizinhos] : grafo)
            arestas += static_cast<int>(vizinhos.size());
        arestas /= 2;
        for (const auto& [v, cor] : cores) maxCor = max(maxCor, cor);
        int horarios = maxCor + 1;
        int conflitos = contarConflitos(grafo, cores);
        if (conflitos != 0) throw runtime_error("Erro: cronograma tem conflitos!");

        cout << "COMPQUEST 2026 | COLORACAO DE GRAFOS\n";
        cout << "Dados FICTICIOS: " << totalAlunos << " alunos, "
             << grafo.size() << " disciplinas, " << arestas << " conflitos de pares\n";
        cout << "DSATUR: " << horarios << " horarios | Conflitos restantes: "
             << conflitos << "\n";

        // Neste exemplo, CAL, ALG e BD formam um triangulo (clique de tamanho 3).
        // Isso prova que >= 3 horarios sao necessarios. Como achamos 3, e otimo.
        bool triangulo = grafo.at("CAL").count("ALG") &&
                         grafo.at("CAL").count("BD") &&
                         grafo.at("ALG").count("BD");
        if (triangulo && horarios == 3)
            cout << "Otimo neste caso: CAL, ALG e BD formam um triangulo.\n";

        ofstream saida("cronograma_cpp.csv");
        if (!saida) throw runtime_error("Nao foi possivel criar cronograma_cpp.csv");
        saida << "horario,sigla,disciplina\n";

        cout << "----------------------------------------------\n";
        for (int h = 0; h < horarios; ++h) {
            cout << "H" << h + 1 << ": ";
            bool primeira = true;
            for (const auto& d : disciplinas) {
                if (cores.at(d.sigla) == h) {
                    if (!primeira) cout << " | ";
                    cout << d.nome;
                    saida << "H" << h + 1 << "," << d.sigla << "," << d.nome << "\n";
                    primeira = false;
                }
            }
            cout << "\n";
        }
        cout << "----------------------------------------------\n";
        cout << "Arquivo criado: cronograma_cpp.csv\n";
    } catch (const exception& e) {
        cerr << "Erro: " << e.what() << "\n";
        return 1;
    }
    return 0;
}
