import DefaultTheme from 'vitepress/theme'
import MyLayout from './MyLayout.vue'
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

  // 各浏览器端增强收敛到独立 composable；此处仅做装配。
  setup() {
    useMediumZoom()
    useCodeLineNumbers()
    useBusuanzi()
    useTitleMeta()
  }
}
