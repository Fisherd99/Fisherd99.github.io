import DefaultTheme from 'vitepress/theme'
import MyLayout from './MyLayout.vue'
import BilibiliPlayer from './BilibiliPlayer.vue'
import ScorePlayer from './ScorePlayer.vue'
import './custom.css';
import 'katex/dist/katex.min.css'
import { useMediumZoom } from './composables/useMediumZoom'
import { useCodeLineNumbers } from './composables/useCodeLineNumbers'
import { useBusuanzi } from './composables/useBusuanzi'
import { useTitleMeta } from './composables/useTitleMeta'

export default {
  extends: DefaultTheme,
  // 使用注入插槽的包装组件覆盖 Layout
  Layout: MyLayout,

  // 文章正文里直接写标签即可。alphaTab 本体在 ScorePlayer 内部动态 import，
  // 不会进主包；两个组件自身也都在滚动到可见时才真正加载外部资源。
  enhanceApp({ app }) {
    app.component('BilibiliPlayer', BilibiliPlayer)
    app.component('ScorePlayer', ScorePlayer)
  },

  // 各浏览器端增强收敛到独立 composable；此处仅做装配。
  setup() {
    useMediumZoom()
    useCodeLineNumbers()
    useBusuanzi()
    useTitleMeta()
  }
}
