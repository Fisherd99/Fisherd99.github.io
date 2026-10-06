// 每个打印行独立包含音符和 SVG 标记，禁止在两者之间分页。
// 固定当前可见排版的坐标，避免打印字体、制表位或容器宽度变化后错位。
export function groupJianpuPrintRows(items) {
  const rows = []
  for (const item of items) {
    const { box, phrase } = item
    const center = box.top + box.height / 2
    let row = rows.find(row => row.phrase === phrase && Math.abs(row.center - center) < 2)
    if (!row) {
      row = { phrase, center, top: box.top, bottom: box.bottom, elements: [] }
      rows.push(row)
    }
    row.top = Math.min(row.top, box.top)
    row.bottom = Math.max(row.bottom, box.bottom)
    row.elements.push(item)
  }
  return rows
}

export function findJianpuPrintRow(rows, y) {
  return rows.reduce((closest, candidate) =>
    Math.abs(candidate.top - y) < Math.abs(closest.top - y) ? candidate : closest)
}

export function createJianpuPrint(source) {
  const doc = source.ownerDocument
  const origin = source.getBoundingClientRect()
  const wrapper = doc.createElement('div')
  wrapper.className = 'vp-doc'
  wrapper.style.cssText = `width:${origin.width}px;color:#000;background:#fff;font-family:${getComputedStyle(source).fontFamily};zoom:${Math.min(1, 703 / origin.width)}`
  for (const name of ['--c-text-primary', '--c-text-secondary', '--c-text-muted']) wrapper.style.setProperty(name, '#000')
  const style = doc.createElement('style')
  style.textContent = Array.from(doc.styleSheets, sheet => {
    try { return Array.from(sheet.cssRules, rule => rule.cssText).join('\n') }
    catch { return '' }
  }).join('\n') + '\n.jianpu-print-row { break-inside: avoid; page-break-inside: avoid; }'
  wrapper.append(style)

  const clone = element => {
    const copy = element.cloneNode(true)
    const originals = [element, ...element.querySelectorAll('*')]
    const copies = [copy, ...copy.querySelectorAll('*')]
    originals.forEach((original, i) => {
      const target = copies[i]
      target.classList.remove('is-active', 'is-clickable')
      // 将继承及 rem 字体冻结为实测值，打印文档无需继承播放器外层样式。
      const css = getComputedStyle(original)
      for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing']) {
        target.style.setProperty(property, css.getPropertyValue(property))
      }
    })
    return copy
  }
  const meta = clone(source.querySelector('.jianpu-meta'))
  meta.querySelector('.jianpu-actions')?.remove()
  wrapper.append(meta)

  const rows = groupJianpuPrintRows(Array.from(source.querySelectorAll('.jianpu-group > span'), element => ({
    element, box: element.getBoundingClientRect(), phrase: element.closest('.jianpu-notes')
  })))
  const items = new Map()
  for (const row of rows) for (const { element } of row.elements) items.set(element, row)
  const rendered = new Set()
  const overlay = source.querySelector('.jianpu-ties')
  const markRows = new Map(Array.from(overlay.children, mark => {
    const y = mark.getBBox().y + origin.top
    return [mark, findJianpuPrintRow(rows, y)]
  }))
  for (const element of source.querySelectorAll('.jianpu-section-name, .jianpu-lyric, .jianpu-group > span')) {
    const row = items.get(element)
    if (!row) { wrapper.append(clone(element)); continue }
    if (rendered.has(row)) continue
    rendered.add(row)
    const top = row.top - origin.top - 24
    const height = row.bottom - row.top + 28
    const line = doc.createElement('div')
    line.className = 'jianpu-print-row'
    line.style.cssText = `position:relative;width:${origin.width}px;height:${height}px`
    const group = doc.createElement('span')
    group.className = 'jianpu-group'
    group.style.cssText = 'display:block;width:100%;height:100%'
    for (const { element: note, box } of row.elements) {
      const copy = clone(note)
      copy.style.cssText += `;position:absolute;box-sizing:border-box;margin:0;left:${box.left - origin.left}px;top:${box.top - origin.top - top}px;width:${box.width}px;height:${box.height}px`
      group.append(copy)
    }
    line.append(group)
    const marks = overlay.cloneNode(false)
    for (const [mark, owner] of markRows) if (owner === row) marks.append(mark.cloneNode(true))
    marks.setAttribute('viewBox', `0 ${top} ${origin.width} ${height}`)
    marks.setAttribute('width', origin.width)
    marks.setAttribute('height', height)
    marks.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;color:#000'
    line.append(marks)
    wrapper.append(line)
  }
  return wrapper
}
