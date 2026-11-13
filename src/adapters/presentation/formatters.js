'use strict';

const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const palette = [
  { color: '#6ea990', bg: '#f2f8f4', border: '#dfece2', ink: '#54856b' },
  { color: '#759fc1', bg: '#f0f5fa', border: '#dfe8f1', ink: '#5980a4' },
  { color: '#b19acb', bg: '#f6f2fa', border: '#e9e0f1', ink: '#9279ad' },
  { color: '#cfaa70', bg: '#fcf7ee', border: '#f0e5d2', ink: '#ad8a53' },
  { color: '#ca8b96', bg: '#fcf2f4', border: '#f0dce1', ink: '#ab6b79' },
  { color: '#74aaae', bg: '#eef8f8', border: '#d8ebeb', ink: '#538b91' }
];
function colorAt(index) {
  if (index < palette.length) return palette[index];
  const hue = Math.round((index * 137.508) % 360);
  return { color: `hsl(${hue} 30% 57%)`, bg: `hsl(${hue} 38% 96%)`, border: `hsl(${hue} 30% 88%)`, ink: `hsl(${hue} 30% 35%)` };
}
const styleAt = index => {
  const c = colorAt(index);
  return `--slot-color:${c.color};--slot-bg:${c.bg};--slot-border:${c.border};--slot-ink:${c.ink}`;
};

function slotTime(index, times) {
  if (!times) return '';
  const start = times.start + index * (times.duration + times.break);
  const end = start + times.duration;
  const display = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const day = Math.floor(start / 1440);
  return `${day ? `D+${day} · ` : ''}${display(start)} – ${display(end)}${Math.floor(end / 1440) > day ? ' (+1 dia)' : ''}`;
}

function slotLabel(index, times) { return `H${index + 1}${times ? ` · ${slotTime(index, times)}` : ''}`; }

module.exports = { escapeHtml, icon, colorAt, styleAt, slotTime, slotLabel };
