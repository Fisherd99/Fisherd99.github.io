import { nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'

// 代码块行号：按实际行数设置 `--code-line-number-digits` 并写入每行 data-line-number，
// 使行号在代码自动换行时仍与所属行对齐（样式见 custom.css）。
const syncWrappedLineNumbers = () => {
  document.querySelectorAll('.vp-doc .line-numbers-mode code').forEach((code) => {
    const lines = code.querySelectorAll(':scope > .line')
    const block = code.closest<HTMLElement>('.line-numbers-mode')
    const digitCount = Math.max(1, String(lines.length).length)
    block?.style.setProperty('--code-line-number-digits', String(digitCount))

    lines.forEach((line, index) => {
      line.setAttribute('data-line-number', String(index + 1))
    })
  })
}

export const useCodeLineNumbers = () => {
  const route = useRoute()

  onMounted(syncWrappedLineNumbers)

  watch(
    () => route.path,
    () => nextTick(syncWrappedLineNumbers)
  )
}
