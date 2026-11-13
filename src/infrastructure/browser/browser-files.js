'use strict';

class BrowserFileReader {
  async read(file) {
    if (!/\.csv$/i.test(file.name)) throw new Error('Selecione um arquivo com a extensão .csv.');
    if (file.size > 5 * 1024 * 1024) throw new Error('O arquivo ultrapassa 5 MB. Envie um CSV menor.');
    const text = await file.text();
    if (text.includes('\uFFFD')) throw new Error('Não foi possível ler os acentos do arquivo. Salve como CSV UTF-8 e tente novamente.');
    return text;
  }
}

class BrowserDownloader {
  constructor({ document, URL, Blob, defer }) { Object.assign(this, { document, URL, Blob, defer }); }

  save({ text, filename, type }) {
    const url = this.URL.createObjectURL(new this.Blob([text], { type }));
    const link = this.document.createElement('a');
    link.href = url; link.download = filename;
    this.document.body.append(link);
    try { link.click(); }
    finally {
      link.remove();
      this.defer(() => this.URL.revokeObjectURL(url), 2000);
    }
  }
}

module.exports = { BrowserFileReader, BrowserDownloader };
