# 数据型视频自动化生成工具

> 配置 JSON → 中文配音 → 确定性渲染 → MP4。一条命令生成多页数据轮播视频。

AI 写代码做视频，**美感天花板很低**，做不了品牌片；但**信息型 / 数据型视频**（KPI、参数、数据展示）是代码生成的甜区——对手是 Excel / PPT，不是 AE / 设计师。本工具专注这个甜区：用确定性渲染 + 中文配音，把"数据"变成可播放的短视频。

## 成片示例

`mvp/renders/final.mp4` —— 3 页数据轮播带中文配音，约 5s（虚构穿戴设备示例数据）。

## 快速开始

### 环境依赖

| 依赖 | 说明 |
|------|------|
| Node.js ≥ 18 | 编排层（render.mjs） |
| Python ≥ 3.10 | `pip install edge-tts`（中文 TTS） |
| ffmpeg + ffprobe | 需在 PATH 可用 |

### 生成视频

```bash
cd mvp
node render.mjs scene.json
# → renders/final.mp4
```

### 自定义内容

编辑 `mvp/scene.json` 的 `pages` 数组（标题 / 配音文案 / 数值 / 配色），重新运行即可，**无需改任何代码**。

## 工作原理

```
scene.json(pages) → 每页 edge-tts 配音 → 配音时长驱动每页时间轴
                  → HyperFrames 软件渲染(逐帧) → ffmpeg 混音 → MP4
```

- `render.mjs`：编排层。读 pages → 每页 TTS → 算时间 plan → 生成 N 个 section 注入模板 → 渲染 → 混音。
- `templates/index.template.html`：数据驱动模板。`window.__PLAN` 注入后，通用遍历 pages 构建 GSAP timeline。

## 目录结构

```
├── mvp/                          # 工程目录
│   ├── render.mjs                # 端到端编排（配置→配音→渲染→混音）
│   ├── scene.json                # 视频配置（pages 数组，改这里换内容）
│   ├── templates/
│   │   └── index.template.html   # 数据驱动 HTML 模板
│   ├── assets/                   # 配音中间产物（运行时生成，不入库）
│   └── renders/                  # 输出 MP4
├── 视频自动化生成工具（精简MVP）PRD.md
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## 配置说明（scene.json）

```json
{
  "voice": "zh-CN-XiaoxiaoNeural",   // edge-tts 音色
  "rate": "+30%",                     // 语速（缩短时长）
  "fadeIn": 0.3, "fadeOut": 0.3,      // 页间转场
  "pages": [
    {
      "eyebrow": "续航能力",          // 小标题
      "title": "超长续航，14天不断电。", // 画面大标题
      "voice": "续航，14天。",         // 配音文案（可精简于 title）
      "accent": "#00E5A0",            // 该页强调色
      "kpis": [
        { "val": 14, "unit": "天", "label": "超长续航", "desc": "一次充电持久陪伴" }
      ]
    }
    // ... 更多页
  ]
}
```

**关键**：每页时长 = 该页配音时长（声画同步）；加一页只需往 `pages` 数组追加一个对象。

## 技术栈

| 层 | 选型 |
|----|------|
| 渲染引擎 | HyperFrames 0.6.97（`--no-browser-gpu` 强制 SwiftShader 软件渲染） |
| 中文 TTS | edge-tts（晓晓 zh-CN-XiaoxiaoNeural，免费） |
| 音频处理 | ffmpeg + ffprobe（混音 / 时长 / 拼接） |
| 编排 | Node.js ESM（render.mjs） |

## 确定性渲染

- **必须 `--no-browser-gpu`**：GPU 光栅化跨进程非确定；软件渲染把差异压到字体子像素级。
- **度量用 PSNR 不用 md5**：md5 对字体抗锯齿抖动过敏会误报。
- **多 section 显隐**：clip 时段（框架层）+ opacity（应用层）双保险，确定性 seek 下非当前页不残留。

详见 [PRD](视频自动化生成工具（精简MVP）PRD.md) §4 / §11 / §12。

## 文档

- [产品需求文档（PRD）](视频自动化生成工具（精简MVP）PRD.md)
- [变更记录](CHANGELOG.md)

## License

MIT — 见 [LICENSE](LICENSE)。
