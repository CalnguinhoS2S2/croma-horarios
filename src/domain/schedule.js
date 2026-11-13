'use strict';

/** As invariantes são verificadas independentemente da Strategy escolhida. */
function createValidatedSchedule(data, graph, colors) {
  if (!graph.size || !(colors instanceof Map) || colors.size !== graph.size) {
    throw new Error('A coloração precisa atribuir um horário a cada disciplina.');
  }
  let edgeCount = 0;
  for (const [code, neighbors] of graph) {
    const color = colors.get(code);
    if (!Number.isInteger(color) || color < 0) throw new Error('A coloração contém um horário inválido.');
    for (const neighbor of neighbors) {
      edgeCount++;
      if (color === colors.get(neighbor)) throw new Error('Não foi possível validar a grade: disciplinas em conflito compartilham horário.');
    }
  }
  const used = [...new Set(colors.values())].sort((a, b) => a - b);
  // Uma Strategy pode usar rótulos esparsos; os blocos apresentados são contíguos.
  const indices = new Map(used.map((color, index) => [color, index]));
  const normalizedColors = new Map([...colors].map(([code, color]) => [code, indices.get(color)]));
  const slots = used.map((_, color) => ({ color, courses: data.courses.filter(course => normalizedColors.get(course.code) === color) }));
  return { graph, colors: normalizedColors, edgeCount: edgeCount / 2, remainingConflicts: 0, slotCount: used.length, slots, data };
}

module.exports = { createValidatedSchedule };
