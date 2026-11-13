'use strict';

function createConflictGraph(data) {
  const graph = new Map(data.courses.map(course => [course.code, new Set()]));
  for (const subjects of data.students.values()) {
    const list = [...subjects];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        graph.get(list[i]).add(list[j]);
        graph.get(list[j]).add(list[i]);
      }
    }
  }
  return graph;
}

module.exports = { createConflictGraph };
