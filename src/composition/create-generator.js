'use strict';

const { GenerateSchedule } = require('../application/generate-schedule.js');
const { DsaturColoring } = require('../domain/dsatur-coloring.js');

function createGenerator({ coloring = new DsaturColoring() } = {}) {
  return new GenerateSchedule({ coloring });
}

module.exports = { createGenerator };
