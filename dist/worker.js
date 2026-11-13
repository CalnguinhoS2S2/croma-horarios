importScripts('./core.js');
self.onmessage = function (event) {
  try {
    const data = CromaCore.parseEnrollments(event.data);
    self.postMessage({ result: CromaCore.generateSchedule(data) });
  } catch (error) { self.postMessage({ error: error.message }); }
};
