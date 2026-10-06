# alphaTab 运行时资源

Bravura 从 npm 包 `@coderline/alphatab` 复制而来；钢琴和口琴使用原 Sonivox，其他音色来自 MuseScore MS Basic。

## font/Bravura.woff2

- 来源：`node_modules/@coderline/alphatab/dist/font/Bravura.woff2`
- 版权：Copyright © 2015, Steinberg Media Technologies GmbH，保留字体名 "Bravura"
- 许可：SIL Open Font License 1.1
- 用途：SMuFL 乐谱字体，五线谱的谱号、符头、符干等符号全部由它绘制。

字体再分发须保留上述声明。

## soundfont/ms-basic-<GM 编号>.sf3

- 来源：https://github.com/musescore/MuseScore/blob/main/share/sound/MS%20Basic.sf3
- 原始文件 SHA-256：`5ea2375e8bd7d8e71def1036978c1621e85b66934169b6a2744b27b9b3c2d99c`。
- MIT；完整版权、来源与许可保留在 `MS-Basic.LICENSE.md`（上游文档仍使用旧名称 MuseScore_General.sf2）。
- 从 `INSTRUMENTS` 自动提取菜单中各乐器的 bank 0 预设及全部关联采样、音色参数与调制器；文件名编号为 1-based GM，预设内部编号保持原样。
- 原始 Vorbis 采样字节保持不变，不解码重编码。各文件约 26–309 KB。
- 重建：下载上述原始文件后运行 `node scripts/prepare-score-soundfonts.mjs <MS Basic.sf3 路径>`。
- 播放器接近可视区域时加载口琴，首次选择其他音色时按需加载。下载后按构建清单校验 SHA-256，通过后才缓存并在页面间共享；URL 带内容哈希，失败重试绕过旧 HTTP 缓存。各播放器独立解析，并在收到成功通知后缓存安装状态；离开页面不取消共享下载。
- `npm run generate-soundfont-hashes` 生成 `.vitepress/generated/soundfont-hashes.mjs`；dev/build 自动执行。替换或提取音源后同步重建清单，勿手写哈希。
- 与 MuseScore MS Basic 共用采样，但 alphaTab 的合成器及效果处理不同，不保证最终音频逐样本一致；不包含 Muse Sounds。

## soundfont/sonivox-1.sf2 与 soundfont/sonivox-23.sf2

- 来源：`node_modules/@coderline/alphatab/dist/soundfont/sonivox.sf2`，即播放器原先使用的音源。
- 原始文件 SHA-256：`4978cf37e7164206f2d22dc4fdf4020ffe040787210bf781e31bdc79961f59ef`。
- 分别提取 bank 0 / GM 1 钢琴（11 个采样，19,822 字节）与 GM 23 口琴（4 个采样，1,492 字节），保留原始 PCM、音色参数和调制器；回归测试验证两种音色与原文件的合成输出完全一致。
- 不加载整套 Sonivox，避免覆盖已经加载的 MS Basic 乐器；播放器可见时加载口琴，钢琴首次选择时按需加载。
- 重建：`node scripts/prepare-score-soundfonts.mjs node_modules/@coderline/alphatab/dist/soundfont/sonivox.sf2`。
- `soundfont/sonivox.sf2` 保留完整原音源；播放器只引用上述独立预设文件。

> 注：alphaTab 还会按支持情况尝试同目录下的 `Bravura.woff` 与 `Bravura.otf`。现代浏览器统一支持
> woff2，因此这里只放了体积最小的 `Bravura.woff2`；极老的浏览器会出现一次字体请求 404，不影响页面。
