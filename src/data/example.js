'use strict';

const COURSE_NAMES = {
  CAL: 'Cálculo', ALG: 'Algoritmos', BD: 'Banco de Dados', RED: 'Redes',
  SO: 'Sistemas Operacionais', IA: 'Inteligência Artificial',
  EST: 'Estatística', ED: 'Estruturas de Dados'
};
const COURSE_ORDER = Object.keys(COURSE_NAMES);
const EXAMPLE = 'aluno,disciplina\nA01,CAL\nA01,ALG\nA02,CAL\nA02,BD\nA03,CAL\nA03,SO\nA04,ALG\nA04,BD\nA05,ALG\nA05,RED\nA06,ALG\nA06,IA\nA07,BD\nA07,RED\nA08,BD\nA08,SO\nA09,BD\nA09,IA\nA10,BD\nA10,EST\nA11,RED\nA11,SO\nA12,RED\nA12,ED\nA13,RED\nA13,EST\nA14,SO\nA14,IA\nA15,SO\nA15,ED\nA16,IA\nA16,ED\nA17,IA\nA17,EST\nA18,EST\nA18,ED\nA19,CAL\nA20,ALG\nA21,BD\nA22,RED\nA23,SO\nA24,IA\nA25,EST\nA26,ED\n';

module.exports = { COURSE_NAMES, COURSE_ORDER, EXAMPLE };
