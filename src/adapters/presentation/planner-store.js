'use strict';

/** Observer: cada alteração publica um novo snapshot para os assinantes. */
class PlannerStore {
  constructor() {
    this.snapshot = Object.freeze({ data: null, result: null, filename: '', demo: true, busy: false, error: null, notice: null, elapsed: null, toast: null });
    this.listeners = new Set();
  }

  getSnapshot() { return this.snapshot; }

  update(patch) {
    this.snapshot = Object.freeze({ ...this.snapshot, ...patch });
    for (const listener of this.listeners) listener(this.snapshot);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
}

module.exports = { PlannerStore };
