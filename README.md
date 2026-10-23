# 诗画

75 首古诗的水墨微动配图，配有环境声、诗词朗诵与「看图猜诗」小游戏。

**在线访问：<https://keosu.github.io/poem/>** · [看图猜诗](https://keosu.github.io/poem/game.html)

## 功能

- **诗画**：每首诗一幅水墨画，叠加飘雪、流水、飞鸟、灯火等动态效果；诗文竖排逐字显现
- **朗诵**：神经网络语音按诗的情绪选择嗓音与节奏，逐句高亮
- **环境声**：风雨、虫鸣、钟声等，全部由 Web Audio 实时合成
- **随机 / 轮播**：随机顺序浏览，或自动播放
- **看图猜诗**：画面逐行显现，从四个选项中选出对应的诗，每局十题，越早答对得分越高

## 操作

| 按键 | 主页 | 看图猜诗 |
| --- | --- | --- |
| ← → / PageUp PageDown | 上一首 / 下一首 | 方向键选择答案 |
| 回车 | — | 开始 · 提前作答 · 确定 · 下一题 |
| 1–4 | — | 直接选答案 |
| R / S | 朗诵 / 环境声 | 朗诵 / 声音 |
| X / 空格 | 随机 / 轮播 | — |
| M / F | 目录 / 全屏 | — / 全屏 |

手机上可左右滑动切换。支持遥控器（方向键 + 确定）。

## 本地运行

纯静态页面，无需构建。任意静态服务器即可：

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

## 结构

```
index.html / game.html   主页与看图猜诗
js/poems.js              诗文与各场景的动效配置
js/scenes.js             六个手写定制场景
js/fx.js                 可复用的动效模块（雾、雨、雪、鸟、萤火……）
js/audio.js              环境声与音效合成
js/voice.js, recite.js   朗诵时间轴与播放
assets/                  配图、缩略图、朗诵音频
fonts/                   马善政楷书（已按用字裁剪）
```

## 致谢

- 字体：[Ma Shan Zheng 马善政楷书](https://fonts.google.com/specimen/Ma+Shan+Zheng)，SIL Open Font License 1.1（见 `fonts/OFL.txt`）
- 朗诵：Microsoft 神经网络语音（经 [edge-tts](https://github.com/rany2/edge-tts) 生成）
- 配图：AI 生成的水墨风格插画
