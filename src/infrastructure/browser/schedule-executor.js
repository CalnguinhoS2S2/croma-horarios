'use strict';

/** Adapter para execução assíncrona; o caso de uso não conhece Workers. */
class BrowserScheduleExecutor {
  constructor({ generateSchedule, workerFactory = null, defer }) {
    Object.assign(this, { generateSchedule, workerFactory, defer });
    this.worker = null;
    this.pendingReject = null;
    this.disposed = false;
  }

  execute(data) {
    if (this.disposed) return Promise.reject(new Error('O executor já foi encerrado.'));
    if (this.pendingReject) return Promise.reject(new Error('Já existe um cálculo em andamento.'));
    return new Promise((resolve, reject) => {
      this.pendingReject = reject;
      const finish = (error, result) => {
        if (this.worker) this.worker.terminate();
        this.worker = null; this.pendingReject = null;
        if (error) reject(error); else resolve(result);
      };
      const local = () => this.defer(() => {
        if (this.disposed) return;
        try { finish(null, this.generateSchedule.execute(data)); }
        catch (error) { finish(error); }
      }, 0);
      if (!this.workerFactory) { local(); return; }
      try {
        this.worker = this.workerFactory();
        this.worker.onmessage = event => {
          if (event.data.error) finish(new Error(event.data.error));
          else finish(null, event.data.result);
        };
        this.worker.onerror = event => {
          if (event && event.preventDefault) event.preventDefault();
          // file://, CSP ou falha de carregamento: usa o mesmo caso de uso local.
          if (this.worker) this.worker.terminate();
          this.worker = null;
          local();
        };
        this.worker.postMessage(data);
      } catch (_error) {
        if (this.worker) this.worker.terminate();
        this.worker = null;
        local();
      }
    });
  }

  dispose() {
    this.disposed = true;
    if (this.worker) this.worker.terminate();
    this.worker = null;
    if (this.pendingReject) this.pendingReject(new Error('Cálculo cancelado.'));
    this.pendingReject = null;
  }
}

module.exports = { BrowserScheduleExecutor };
