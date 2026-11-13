'use strict';

const { createConflictGraph } = require('../domain/conflict-graph.js');
const { createValidatedSchedule } = require('../domain/schedule.js');

class GenerateSchedule {
  /** @param {{coloring: import('./ports.js').ColoringStrategy}} dependencies */
  constructor({ coloring }) { this.coloring = coloring; }

  execute(data) {
    const graph = createConflictGraph(data);
    const colors = this.coloring.color(graph);
    return createValidatedSchedule(data, graph, colors);
  }
}

module.exports = { GenerateSchedule };
