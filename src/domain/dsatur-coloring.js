'use strict';

/** Strategy: maior saturação, maior grau e ordem de cadastro, como no C++. */
class DsaturColoring {
  color(graph) {
    const colors = new Map();
    const saturation = new Map([...graph.keys()].map(code => [code, new Set()]));
    while (colors.size < graph.size) {
      let chosen = null, bestSaturation = -1, bestDegree = -1;
      for (const [code, neighbors] of graph) {
        if (colors.has(code)) continue;
        const value = saturation.get(code).size;
        if (value > bestSaturation || (value === bestSaturation && neighbors.size > bestDegree)) {
          chosen = code; bestSaturation = value; bestDegree = neighbors.size;
        }
      }
      let color = 0;
      while (saturation.get(chosen).has(color)) color++;
      colors.set(chosen, color);
      for (const neighbor of graph.get(chosen)) {
        if (!colors.has(neighbor)) saturation.get(neighbor).add(color);
      }
    }
    return colors;
  }
}

module.exports = { DsaturColoring };
