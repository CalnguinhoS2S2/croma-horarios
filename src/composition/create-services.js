'use strict';

const { ImportEnrollments } = require('../application/import-enrollments.js');
const { ExportSchedule } = require('../application/export-schedule.js');
const { EnrollmentCsvReader } = require('../adapters/csv/enrollment-csv-reader.js');
const { ScheduleCsvWriter } = require('../adapters/csv/schedule-csv-writer.js');
const { createGenerator } = require('./create-generator.js');
const { COURSE_NAMES, COURSE_ORDER } = require('../data/example.js');

/** Composition Root: somente aqui os contratos recebem implementações concretas. */
function createServices({ reader = new EnrollmentCsvReader(), writer = new ScheduleCsvWriter(), coloring, catalog = { names: COURSE_NAMES, order: COURSE_ORDER } } = {}) {
  return {
    importEnrollments: new ImportEnrollments({ reader, catalog }),
    generateSchedule: createGenerator({ coloring }),
    exportSchedule: new ExportSchedule({ writer })
  };
}

module.exports = { createServices };
