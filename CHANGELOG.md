# 变更记录

本格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-06-16

### 首个完整版：多页数据轮播 + 中文配音

- **多页数据轮播**：路径 A（单 timeline + 多 section 错位）。显隐双保险——`class="clip"` + `data-start/data-duration` 框架层硬控为主，GSAP `set/to` opacity 兜底；section 级显隐绝不用 `.from()`（规避 seek 不复位）。
- **数据驱动**：`scene.json` 的 `pages` 数组配置任意页数，零代码改动换内容 / 页数。
- **中文配音**：每页 edge-tts 单独生成 → 配音时长驱动该页时间轴。因已去掉数字计数，**无需 whisper 字级对齐**，管线比 Sprint 1 单页更简单。
- **省 token**：去数字计数 + 精简配音文案 + edge-tts `--rate` 加速，13.6s / 408 帧 → 5.0s / 150 帧（-63%）。
- **工程整理**：模板移至 `templates/` 子目录（规避 `multiple_root_compositions`）；根目录 README / CHANGELOG / LICENSE / .gitignore 就位。

## [0.1.0] - 2026-06-14

### Sprint 1：单页数据型 KPI 视频

- 单 section 端到端管线（`render.mjs`）。
- edge-tts（晓晓）+ faster-whisper 字级时间戳 + ffmpeg 显式混音。
- 数字计数对齐配音时长（"无静止"约束）。
- 确定性渲染验证：`--no-browser-gpu`，PSNR 50–61dB（视觉确定）。
- 实测：13s 视频单机约 60s 出片，远优于 ≤5min KPI。
