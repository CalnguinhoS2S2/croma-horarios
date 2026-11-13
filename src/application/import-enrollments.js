'use strict';

const { EnrollmentDataset, EnrollmentValidationError } = require('../domain/enrollment-dataset.js');

class ImportEnrollments {
  /** @param {{reader: import('./ports.js').EnrollmentReader, catalog?: object}} dependencies */
  constructor({ reader, catalog = {} }) {
    this.reader = reader;
    this.catalog = catalog;
  }

  execute(source) {
    const { records, sourceLabels = [] } = this.reader.read(source);
    try {
      return EnrollmentDataset.fromRecords(records, this.catalog);
    } catch (error) {
      if (error instanceof EnrollmentValidationError && error.recordIndex !== null && sourceLabels[error.recordIndex]) {
        throw new Error(`${sourceLabels[error.recordIndex]}: ${error.message}`);
      }
      throw error;
    }
  }
}

module.exports = { ImportEnrollments };
