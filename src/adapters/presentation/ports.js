'use strict';

/**
 * Portas usadas pelo controlador de apresentação, implementadas no navegador.
 * O controlador também pode ser executado com implementações em memória.
 *
 * @typedef {Object} FileReaderPort
 * @property {function(object): Promise<string>} read
 *
 * @typedef {Object} DownloadPort
 * @property {function({text: string, filename: string, type: string}): void} save
 *
 * @typedef {Object} ScheduleExecutorPort
 * @property {function(object): Promise<object>} execute
 * @property {function(): void} dispose
 */

module.exports = {};
