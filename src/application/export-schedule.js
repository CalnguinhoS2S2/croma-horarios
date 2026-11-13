'use strict';

class ExportSchedule {
  /** @param {{writer: import('./ports.js').ScheduleWriter}} dependencies */
  constructor({ writer }) { this.writer = writer; }

  execute(schedule, formatSlot = color => `H${color + 1}`) {
    const rows = [];
    for (const slot of schedule.slots) {
      for (const course of slot.courses) {
        rows.push({ slot: formatSlot(slot.color), code: course.code, name: course.name, studentCount: course.students.size });
      }
    }
    return this.writer.write(rows);
  }
}

module.exports = { ExportSchedule };
