# -*- coding: utf-8 -*-
"""字级时间戳：faster-whisper 对音频转写，输出字级 {t,s,e} 到 JSON。
用法: python whisper_ts.py <audio.wav> <out.json>
模型 base（轻量）；中文 word-level timestamps。后续可升级 large-v3 提升简体准确度。"""
import sys, json
from faster_whisper import WhisperModel

audio, out = sys.argv[1], sys.argv[2]
model = WhisperModel("base", device="cpu", compute_type="int8")
segs, info = model.transcribe(audio, language="zh", word_timestamps=True)
words = [{"t": w.word, "s": round(w.start, 3), "e": round(w.end, 3)}
         for s in segs for w in (s.words or [])]
json.dump({"lang": info.language, "duration": round(info.duration, 3), "words": words},
          open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[whisper] 字数={len(words)} 时长={info.duration:.2f}s")
