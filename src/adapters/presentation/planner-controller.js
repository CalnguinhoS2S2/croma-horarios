'use strict';

/**
 * Controlador sem acesso ao DOM ou a APIs do navegador.
 * Recebe casos de uso e portas de I/O pela composição.
 */
class PlannerController {
  /** @param {{services: object, store: object, executor: import('./ports.js').ScheduleExecutorPort, fileReader: import('./ports.js').FileReaderPort, downloader: import('./ports.js').DownloadPort, example: {text: string, filename: string}, now: function(): number}} dependencies */
  constructor({ services, store, executor, fileReader, downloader, example, now }) {
    Object.assign(this, { services, store, executor, fileReader, downloader, example, now });
    this.request = 0;
    this.toastId = 0;
    this.disposed = false;
  }

  initialize() {
    const started = this.now();
    const data = this.services.importEnrollments.execute(this.example.text);
    const result = this.services.generateSchedule.execute(data);
    this.store.update({ data, result, filename: this.example.filename, demo: true, elapsed: this.now() - started });
  }

  notify(message) { this.store.update({ toast: { id: ++this.toastId, message } }); }
  reportError(message) { this.store.update({ error: message }); }

  loadText(text, filename, demo = false) {
    const data = this.services.importEnrollments.execute(text);
    this.store.update({ data, result: null, filename, demo, error: null, elapsed: null, notice: 'Arquivo validado. Clique em “Gerar horários” para criar a grade com estes dados.' });
  }

  async importFile(file) {
    if (!file || this.store.getSnapshot().busy || this.disposed) return;
    const request = ++this.request;
    this.store.update({ error: null });
    try {
      const text = await this.fileReader.read(file);
      if (request !== this.request || this.disposed) return;
      this.loadText(text, file.name);
      this.notify('CSV importado. Pronto para gerar os horários.');
    } catch (error) {
      if (request === this.request && !this.disposed) this.reportError(`${error.message} O planejamento anterior foi preservado.`);
    }
  }

  async generate() {
    const snapshot = this.store.getSnapshot();
    if (snapshot.busy || !snapshot.data || this.disposed) return;
    const request = ++this.request;
    const started = this.now();
    this.store.update({ busy: true, error: null });
    try {
      const result = await this.executor.execute(snapshot.data);
      if (request !== this.request || this.disposed) return;
      this.store.update({ result, data: result.data, elapsed: this.now() - started, notice: null });
      this.notify(`${result.slotCount} horários gerados. Nenhum conflito encontrado.`);
    } catch (error) {
      if (request === this.request && !this.disposed) this.reportError(error.message);
    } finally {
      if (request === this.request && !this.disposed) this.store.update({ busy: false });
    }
  }

  async loadExample() {
    if (this.store.getSnapshot().busy || this.disposed) return;
    ++this.request;
    try {
      this.loadText(this.example.text, this.example.filename, true);
      await this.generate();
    } catch (error) { this.reportError(error.message); }
  }

  downloadExample() {
    this.downloader.save({ text: '\uFEFF' + this.example.text, filename: this.example.filename, type: 'text/csv;charset=utf-8' });
    this.notify('CSV de exemplo baixado.');
  }

  exportCurrent(formatSlot) {
    const { result } = this.store.getSnapshot();
    if (!result) return;
    try {
      const text = this.services.exportSchedule.execute(result, formatSlot);
      this.downloader.save({ text, filename: 'cronograma_croma.csv', type: 'text/csv;charset=utf-8' });
      this.notify('Cronograma exportado em CSV.');
    } catch (error) { this.reportError(error.message); }
  }

  dispose() {
    this.disposed = true;
    ++this.request;
    this.executor.dispose();
  }
}

module.exports = { PlannerController };
