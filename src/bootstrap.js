'use strict';

const { createServices } = require('./composition/create-services.js');
const { EXAMPLE } = require('./data/example.js');
const { PlannerStore } = require('./adapters/presentation/planner-store.js');
const { PlannerController } = require('./adapters/presentation/planner-controller.js');
const { PlannerView } = require('./adapters/presentation/planner-view.js');
const { BrowserFileReader, BrowserDownloader } = require('./infrastructure/browser/browser-files.js');
const { BrowserScheduleExecutor } = require('./infrastructure/browser/schedule-executor.js');

const services = createServices();
const store = new PlannerStore();
const defer = window.setTimeout.bind(window);
const executor = new BrowserScheduleExecutor({
  generateSchedule: services.generateSchedule,
  workerFactory: window.location.protocol !== 'file:' && window.Worker ? () => new window.Worker('./worker.js') : null,
  defer
});
const controller = new PlannerController({
  services, store, executor,
  fileReader: new BrowserFileReader(),
  downloader: new BrowserDownloader({ document, URL: window.URL, Blob: window.Blob, defer }),
  example: { text: EXAMPLE, filename: 'matriculas_exemplo.csv' },
  now: () => window.performance.now()
});
const view = new PlannerView({ document, window });
view.bind(controller);
controller.initialize();
const unsubscribe = store.subscribe(snapshot => view.render(snapshot));
window.addEventListener('pagehide', event => {
  if (!event.persisted) { unsubscribe(); view.dispose(); controller.dispose(); }
});
