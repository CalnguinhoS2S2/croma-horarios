'use strict';

/**
 * Contratos por comportamento: os casos de uso recebem objetos compatíveis.
 * Não exigem herança nem dependem das implementações externas.
 *
 * @typedef {Object} EnrollmentReader
 * @property {function(string): {records: Array<{student: string, code: string, name: string}>, sourceLabels: string[]}} read
 *
 * @typedef {Object} ColoringStrategy
 * @property {function(Map<string, Set<string>>): Map<string, number>} color
 *
 * @typedef {Object} ScheduleWriter
 * @property {function(Array<{slot: string, code: string, name: string, studentCount: number}>): string} write
 */

module.exports = {};
