#!/usr/bin/env node
// 多页数据轮播编排（带配音）：每页 edge-tts → 配音时长驱动时间 plan → 生成 N 个 section → 软件渲染 → ffmpeg 混音
// 用法: node render.mjs scene.json
// 说明：数字直接显示终值（不计数），故无需 whisper 字级对齐——每页配音时长即该页时长，声画天然同步
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const sh = (cmd, opts = {}) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'], ...opts });
// 带重试（edge-tts 偶发连不上微软语音服务超时）
const retry = (cmd, tries = 4, delayMs = 2500) => {
  for (let i = 1; i <= tries; i++) {
    try { return sh(cmd, { stdio: 'inherit' }); }
    catch (e) { if (i === tries) throw e; console.log(`  ⚠ 第${i}次失败，${delayMs / 1000}s 后重试（${tries - i}次剩余）…`); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs); }
  }
};
const HF = 'npx --yes hyperframes@0.6.97';

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const pages = cfg.pages;
if (!pages || !pages.length) throw new Error('scene.json 缺少 pages 配置');
const VOICE = cfg.voice || 'zh-CN-XiaoxiaoNeural';
const FADE_IN = cfg.fadeIn ?? 0.3;
const FADE_OUT = cfg.fadeOut ?? 0.3;

// === 1. 每页 edge-tts 配音 → 该页时长 ===
console.log('▶ 1/4 每页 edge-tts 中文配音…');
const pageDurs = [];
for (let i = 0; i < pages.length; i++) {
  const text = pages[i].voice || pages[i].title;
  retry(`python -m edge_tts --voice ${VOICE} --rate ${cfg.rate || '+0%'} --text "${text}" --write-media assets/_vo_${i}.mp3`);
  sh(`ffmpeg -y -i assets/_vo_${i}.mp3 -ar 44100 -ac 1 assets/_vo_${i}.wav`, { stdio: 'ignore' });
  pageDurs.push(parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 assets/_vo_${i}.wav`).toString().trim()));
}

// === 2. 时间 plan：配音时长顺序累加（声画同步，页间 fadeIn/fadeOut 接力无重叠）===
let acc = 0;
const plan = pages.map((pg, i) => {
  const start = +acc.toFixed(3);
  const dur = +pageDurs[i].toFixed(3);
  acc += pageDurs[i];
  return { ...pg, start, dur };
});
const totalDur = +acc.toFixed(3);

// === 3. 拼接配音（ffmpeg concat）===
fs.writeFileSync('_concat.txt', pages.map((_, i) => `file 'assets/_vo_${i}.wav'`).join('\n'));
sh(`ffmpeg -y -f concat -safe 0 -i _concat.txt -c copy assets/_vo.wav`, { stdio: 'ignore' });

// === 生成 section HTML ===
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const sections = plan.map((pg, i) => {
  const accent = pg.accent || '#00E5A0';
  const end = (pg.start + pg.dur).toFixed(1);
  const kpisHtml = pg.kpis.map((k, j) => `
      <div class="kpi">
        <div class="label">${esc(k.label)}</div>
        <div class="big-row"><span class="big" id="cnt${i}_${j}">${k.val}</span><span class="unit">${esc(k.unit)}</span></div>
        <div class="desc">${esc(k.desc)}</div>
      </div>`).join('');
  return `
  <section id="page${i}" class="scene clip" data-start="${pg.start}" data-duration="${pg.dur}"
           style="--accent:${accent};--accent-rgb:${hexRgb(accent)}">
    <div class="top-line"></div>
    <div class="hint">PAGE ${i + 1} · ${pg.start.toFixed(1)}–${end}s</div>
    <div class="inner">
      <div class="eyebrow">${esc(pg.eyebrow || '核心参数')}</div>
      <h1>${esc(pg.title)}</h1>
      <div class="kpis">${kpisHtml}</div>
    </div>
  </section>`;
}).join('');

const planJson = JSON.stringify({ fadeIn: FADE_IN, fadeOut: FADE_OUT, pages: plan.map((p) => ({ start: p.start, dur: p.dur, kpis: p.kpis })) });
let html = fs.readFileSync('templates/index.template.html', 'utf8');
html = html.replaceAll('{{TOTAL_DUR}}', totalDur).replaceAll('{{SECTIONS}}', sections).replaceAll('{{PLAN_JSON}}', planJson);
fs.writeFileSync('index.html', html);
console.log(`▶ 2/4 已生成 index.html：${pages.length} 页，配音驱动总时长 ${totalDur}s`);

// === 4. 软件渲染 + ffmpeg 混音 ===
console.log('▶ 3/4 HyperFrames 软件渲染…');
sh(`${HF} render --no-browser-gpu -o renders/_out.mp4`, { stdio: 'inherit' });
console.log('▶ 4/4 ffmpeg 混入配音…');
sh('ffmpeg -y -i renders/_out.mp4 -i assets/_vo.wav -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest renders/final.mp4', { stdio: 'ignore' });

console.log(`\n✓ 完成: renders/final.mp4（${pages.length} 页带配音，${totalDur}s）`);
