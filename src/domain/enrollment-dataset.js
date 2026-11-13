'use strict';

class EnrollmentValidationError extends Error {
  constructor(message, recordIndex = null) {
    super(message);
    this.name = 'EnrollmentValidationError';
    this.recordIndex = recordIndex;
  }
}

/** Matrículas normalizadas. Não conhece CSV, DOM, arquivos ou servidores. */
class EnrollmentDataset {
  static fromRecords(records, { names = {}, order = [] } = {}) {
    if (!records.length) throw new EnrollmentValidationError('Adicione pelo menos uma matrícula.');
    if (records.length > 100000) throw new EnrollmentValidationError('O limite é de 100 mil matrículas por conjunto de dados.');
    const students = new Map();
    const courses = new Map();
    let duplicates = 0;

    records.forEach(({ student, code, name = '' }, index) => {
      if (typeof student !== 'string' || typeof code !== 'string' || typeof name !== 'string') {
        throw new EnrollmentValidationError('aluno, disciplina e nome precisam ser textos.', index);
      }
      student = student.trim(); code = code.trim(); name = name.trim();
      if (!student || !code) throw new EnrollmentValidationError('aluno e disciplina precisam estar preenchidos.', index);
      if (student.length > 200 || code.length > 200) throw new EnrollmentValidationError('use identificadores de até 200 caracteres.', index);
      if (name.length > 300) throw new EnrollmentValidationError('o nome da disciplina ultrapassa 300 caracteres.', index);

      if (!courses.has(code)) {
        const fallbackName = Object.hasOwn(names, code) ? names[code] : code;
        courses.set(code, { code, name: name || fallbackName, students: new Set(), explicitName: name });
      }
      const course = courses.get(code);
      if (name && course.explicitName && name !== course.explicitName) {
        throw new EnrollmentValidationError(`a disciplina ${code} tem dois nomes diferentes.`, index);
      }
      if (name) { course.name = name; course.explicitName = name; }
      if (!students.has(student)) students.set(student, new Set());
      if (students.get(student).has(code)) duplicates++;
      else { students.get(student).add(code); course.students.add(student); }
      if (courses.size > 1000) throw new EnrollmentValidationError('O limite desta versão é de mil disciplinas por conjunto de dados.');
    });

    const priority = new Map(order.map((code, index) => [code, index]));
    const orderedCourses = [...courses.values()].sort((a, b) => {
      const ai = priority.get(a.code) ?? Infinity;
      const bi = priority.get(b.code) ?? Infinity;
      return ai === bi ? 0 : ai - bi;
    });
    return new EnrollmentDataset(students, orderedCourses, duplicates, records.length);
  }

  constructor(students, courses, duplicates, totalRows) {
    this.students = students;
    this.courses = courses;
    this.duplicates = duplicates;
    this.totalRows = totalRows;
    this.enrollmentCount = totalRows - duplicates;
  }
}

module.exports = { EnrollmentDataset, EnrollmentValidationError };
