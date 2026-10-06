// 简谱文本 → 内部模型 → MusicXML 的纯函数集合。
// 无第三方依赖、不碰文件系统，便于单独测试；文件 IO 见 generate-scores.js。
//
// 语法速查（完整说明见 public/scores/README.md）：
//   音高  1-7 为级数，0 为休止；#n 升高半音（半音阶口琴按键）、bn 降低半音
//   八度  前置：,n 低八度、'n 高八度，可叠加（,,n / ''n）
//   时值  后置：默认四分音符；- 加一个四分时值、_ 缩短一半、. 附点、~ 连到下个同音
//         - 不与 . 或 _ 混用；复杂时值拆成同音符，用 ~ 连接
//   结构  | 与 || 为小节线；|: 反复开始；:| 反复结束，其后可跟 xN 指定次数
//   注释  // 起至行尾
//
// 基准：1 = C5（MIDI 72）。12 孔半音阶口琴音域 C4–C7，即 ,1 到 ''1。

/** 级数 → 相对主音的半音数（1=C 时）。 */
const DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]

/** 音高 token：八度前缀 + 变音 + 级数 + 时值后缀。 */
const PITCH_TOKEN = /^([,']*)([#b]?)([0-7])((?:[-_.~^])*)$/

/** 半音阶口琴音域（MIDI）。 */
const MIN_MIDI = 60 // C4，即 ,1
const MAX_MIDI = 96 // C7，即 ''1

/** 以四分音符为 1 的时值 → MusicXML 的 type 与是否附点。 */
const BASE_TYPES = [
  [4, 'whole'],
  [2, 'half'],
  [1, 'quarter'],
  [0.5, 'eighth'],
  [0.25, '16th'],
  [0.125, '32nd'],
  [0.0625, '64th']
]

const SVG_SHARP_STEPS = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B']
const SHARP_ALTERS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]

/**
 * MIDI 音高 → MusicXML 的 step/alter/octave。
 * 一律用升号拼写：本格式里 #n 的语义就是"升高半音"，所以 #3 记为 F、#7 记为 C，
 * 与"E#/B#"这种理论拼写等价但更简单，也避免 alphaTab 侧的边界情况。
 */
export function midiToPitch(midi) {
  const octave = Math.floor(midi / 12) - 1
  const pitchClass = ((midi % 12) + 12) % 12
  return { step: SVG_SHARP_STEPS[pitchClass], alter: SHARP_ALTERS[pitchClass], octave }
}

/** 时值（以 divisions 为单位）→ { type, dot }，不支持的时值返回 null。 */
function typeOf(duration, divisions) {
  const quarters = duration / divisions
  for (const [base, name] of BASE_TYPES) {
    if (Math.abs(quarters - base) < 1e-9) return { type: name, dot: false }
  }
  for (const [base, name] of BASE_TYPES) {
    if (Math.abs(quarters - base * 1.5) < 1e-9) return { type: name, dot: true }
  }
  return null
}

/**
 * 计算时值：增时线每根增加一个四分时值；减时线每根减半，可带附点。
 * 增时线与附点/减时线互斥，非法组合返回 NaN；~ 和 ^ 不影响时值。
 * 返回以 divisions 为单位的整数，非整数即语法或 divisions 设置有问题。
 */
export function durationOf(suffix, divisions) {
  const dashes = (suffix.match(/-/g) ?? []).length
  if (dashes) {
    if (/[_.]/.test(suffix)) return NaN
    return (1 + dashes) * divisions
  }
  const underlines = (suffix.match(/_/g) ?? []).length
  return divisions / (2 ** underlines) * (suffix.includes('.') ? 1.5 : 1)
}

/** 解析音高 token → { kind, midi, pitch, duration, tieStart }。 */
export function parsePitchToken(token, divisions) {
  const match = PITCH_TOKEN.exec(token)
  if (!match) return null

  const [, octaveMarks, accidental, degreeText, suffix] = match
  if (suffix.includes('-') && /[_.]/.test(suffix)) {
    return { error: '增时线 - 不能与附点 . 或减时线 _ 混用；复杂时值请拆成同音符并用延音线 ~ 连接（如 2.5 个四分时值写为 1-~ 1_）' }
  }
  const duration = durationOf(suffix, divisions)
  if (!Number.isInteger(duration) || duration <= 0) {
    return { error: `时值 ${JSON.stringify(suffix || '（四分）')} 在 divisions=${divisions} 下不是整数` }
  }

  const degree = Number(degreeText)
  const tieStart = suffix.includes('~')
  // 圆滑线：两个不同音高之间的连奏弧，与同音相连的连音线（tie）在记谱上都是弧线，
  // 靠音高是否相同来区分，所以渲染时可以画同一个记号。
  const slurStart = suffix.includes('^')
  const type = typeOf(duration, divisions)
  if (!type) {
    return { error: `时值 ${JSON.stringify(suffix)} 无法表示为音符类型（divisions=${divisions}）` }
  }

  if (degree === 0) {
    return { kind: 'rest', degree: 0, duration, type, tieStart: false, slurStart: false }
  }

  let octaveShift = 0
  for (const mark of octaveMarks) octaveShift += mark === ',' ? -1 : 1

  const alter = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
  const midi = 72 + octaveShift * 12 + DEGREE_SEMITONES[degree - 1] + alter

  return {
    kind: 'note',
    midi,
    duration,
    type,
    tieStart,
    slurStart,
    degree,
    alter,
    octaveShift,
    pitch: midiToPitch(midi),
    source: token
  }
}

/** 拆分头部（--- 之前）与正文。 */
export function parseScoreText(text) {
  const lines = text.split(/\r?\n/)
  const meta = {}
  let index = 0

  for (; index < lines.length; index++) {
    const line = lines[index].replace(/\/\/.*$/, '').trim()
    if (line === '---') {
      index++
      break
    }
    if (!line || line.startsWith('//')) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }

  return { meta, body: lines.slice(index).join('\n') }
}

/**
 * 正文 → token 流。
 *
 * 三种换行/标记的语义要分清：
 *   - `|`            小节线，参与时值校验（必须满一小节）
 *   - 换行           乐句行，纯显示用，长度随意；播放与五线谱仍按小节走
 *   - `\t`          行内制表，纯显示用，不增加时值或音符
 *   - `[A]`          段落标记
 *   - 行内 `= 歌词`   该乐句的歌词（可选），第一个 = 之后全是歌词
 */
export function tokenize(body) {
  const tokens = []
  let lineIndex = 0

  for (const rawLine of body.split(/\r?\n/)) {
    lineIndex++
    const withoutComment = rawLine.replace(/\/\/.*$/, '')
    const eq = withoutComment.indexOf('=')
    const notesPart = (eq >= 0 ? withoutComment.slice(0, eq) : withoutComment).trim()
    const lyric = eq >= 0 ? withoutComment.slice(eq + 1).trim() : ''

    if (!notesPart) continue

    const sectionMatch = /^\[([^\]]+)\]$/.exec(notesPart)
    if (sectionMatch) {
      tokens.push({ kind: 'section', name: sectionMatch[1] })
      continue
    }

    // 每个非空行开启一个新的乐句（显示用）
    tokens.push({ kind: 'phrase', line: lineIndex, lyric })

    for (const word of notesPart.replace(/\\t/g, ' \\t ').split(/\s+/).filter(Boolean)) {
      if (word === '\\t') tokens.push({ kind: 'tab' }) // 仅显示：推进到下一制表位
      else if (word === 'v' || word === 'V') tokens.push({ kind: 'breath' }) // 换气记号
      else if (word === '|' || word === '||') tokens.push({ kind: 'bar' })
      else if (word === '|:') tokens.push({ kind: 'repeatStart' })
      else if (word === ':|') tokens.push({ kind: 'repeatEnd' })
      else if (/^[xX]\d+$/.test(word)) tokens.push({ kind: 'repeatTimes', times: Number(word.slice(1)) })
      else if (/^\|[0-9]+\.$/.test(word)) tokens.push({ kind: 'endingStart', number: Number(word.slice(1, -1)) })
      else tokens.push({ kind: 'pitch', token: word })
    }
  }

  return tokens
}

/**
 * token 流 → 小节数组，并逐小节校验拍数。
 * 不做自动切分、不做休止符补足——拍数不符就报错，把决定权留给作者。
 */
export function buildMeasures(tokens, meta) {
  const divisions = Number(meta.divisions ?? 4)
  const [beats, beatType] = String(meta.time ?? '4/4')
    .split('/')
    .map((part) => Number(part.trim()))
  const expected = beats * (4 / beatType) * divisions

  const measures = []
  const errors = []
  let endingOpen = null
  let current = { tokens: [], repeatStart: false, repeatEnd: false, repeatTimes: 2, endingStart: null }

  const closeMeasure = () => {
    measures.push(current)
    current = { tokens: [], repeatStart: false, repeatEnd: false, repeatTimes: 2, endingStart: null }
  }

  for (const token of tokens) {
    switch (token.kind) {
      case 'bar':
        closeMeasure()
        break
      case 'repeatStart':
        // 紧跟在 `|` 后面的 `|:` 不该产生一个空小节
        if (current.tokens.length || current.repeatStart) closeMeasure()
        current.repeatStart = true
        break
      case 'repeatEnd':
        current.repeatEnd = true
        closeMeasure()
        break
      case 'repeatTimes': {
        const last = measures[measures.length - 1]
        if (!last?.repeatEnd) errors.push('xN 前面没有 :| 反复结束标记')
        else last.repeatTimes = token.times
        break
      }
      case 'endingStart':
        // 结尾段落从新小节开始；同时把上一段结尾标记为结束
        if (current.tokens.length || current.repeatStart || current.endingStart) closeMeasure()
        if (measures.length && endingOpen) measures[measures.length - 1].endingEnd = endingOpen
        endingOpen = token.number
        current.endingStart = token.number
        break
      case 'section':
        // 只关掉还开着的结尾，否则它的结束标记会落到下一段的小节上。
        // 注意：**不在这里收尾当前小节** —— 小节可以跨段落，
        // 例如 [A] 末尾的 #5 与 [B] 开头的休止+弱起合起来才是一个完整小节。
        if (measures.length && endingOpen) measures[measures.length - 1].endingEnd = endingOpen
        endingOpen = null
        break
      case 'phrase':
      case 'breath':
      case 'tab':
        break // 乐句、换气与制表只影响简谱显示，不参与时值
      default:
        current.tokens.push(token)
    }
  }

  // 末小节没有收尾的 | 也要算一小节。
  if (current.tokens.length || current.repeatStart || current.repeatEnd || current.endingStart) closeMeasure()
  // 收尾：最后一段结尾延伸到文件末尾
  if (measures.length && endingOpen) measures[measures.length - 1].endingEnd = endingOpen

  // 解析音高并校验拍数。
  const parsed = measures.map((measure, measureIndex) => {
    const events = []
    for (const token of measure.tokens) {
      const event = parsePitchToken(token.token, divisions)
      if (!event) {
        errors.push(`第 ${measureIndex + 1} 小节：无法识别的记号 ${JSON.stringify(token.token)}`)
        continue
      }
      if (event.error) {
        errors.push(`第 ${measureIndex + 1} 小节：${event.error}`)
        continue
      }
      events.push(event)
    }

    const total = events.reduce((sum, event) => sum + event.duration, 0)
    // 弱起（anacrusis）：只允许第一小节短于整小节，这是记谱惯例。
    const isPickup = measureIndex === 0 && total > 0 && total < expected
    if (total !== expected && !isPickup) {
      const delta = (total - expected) / divisions
      errors.push(
        `第 ${measureIndex + 1} 小节：共 ${total / divisions} 拍，` +
          `${beats}/${beatType} 应为 ${expected / divisions} 拍（${delta > 0 ? '多' : '少'} ${Math.abs(delta)} 拍）`
      )
    }

    return { ...measure, events, measureIndex, isPickup }
  })

  // 连音线/圆滑线都在拍平后的音序列上解析，所以允许跨小节、甚至跨段落
  // （例如 [A] 末尾的 #5 直接连到 [B] 开头的 #5，中间不重新起音）。
  const flat = parsed.flatMap((measure) => measure.events)
  for (let i = 0; i < flat.length; i++) {
    if (flat[i].slurStart) {
      const next = flat[i + 1]
      if (!next || next.kind !== 'note') {
        errors.push(`圆滑线 ^ 后面必须是音符（${flat[i].source} 之后不是）`)
      } else {
        next.slurStop = true
      }
    }
    if (!flat[i].tieStart) continue
    const next = flat[i + 1]
    if (!next || next.kind !== 'note' || next.midi !== flat[i].midi) {
      errors.push(`连音线 ~ 后面必须是同音高的音（${flat[i].source} 之后不是）`)
    } else {
      next.tieStop = true
    }
  }

  // 音域校验。
  for (const measure of parsed) {
    for (const event of measure.events) {
      if (event.kind !== 'note') continue
      if (event.midi < MIN_MIDI || event.midi > MAX_MIDI) {
        errors.push(
          `第 ${measure.measureIndex + 1} 小节：${event.source} 的音高超出 12 孔半音阶口琴音域` +
            `（C4–C7，即 ,1 到 ''1）`
        )
      }
    }
  }

  return { measures: parsed, errors, divisions, beats, beatType, expected }
}

/** 生成 MusicXML。measures 为 buildMeasures 的输出。 */
export function toMusicXml({ measures, divisions, beats, beatType }, meta) {
  const fifths = Number(meta.key ?? 0)
  const program = Number(meta.program ?? 23)
  const title = [meta.title, meta.subtitle].filter(Boolean).join(' ')

  const noteXml = (event) => {
    const parts = ['    <note>']
    if (event.kind === 'rest') {
      parts.push('      <rest/>')
    } else {
      const { step, alter, octave } = event.pitch
      parts.push(
        '      <pitch>' +
          `<step>${step}</step><alter>${alter}</alter><octave>${octave}</octave>` +
          '</pitch>'
      )
    }
    parts.push(`      <duration>${event.duration}</duration>`)
    if (event.tieStart) parts.push('      <tie type="start"/>')
    if (event.tieStop) parts.push('      <tie type="stop"/>')
    parts.push(`      <type>${event.type.type}</type>`)
    if (event.type.dot) parts.push('      <dot/>')
    if (event.tieStart || event.tieStop || event.slurStart || event.slurStop) {
      const notations = []
      if (event.tieStop) notations.push('<tied type="stop"/>')
      if (event.tieStart) notations.push('<tied type="start"/>')
      // 圆滑线与连音线在 MusicXML 里是两套标记：slur 不改变发声，只表示连奏
      if (event.slurStart) notations.push('<slur type="start" number="1"/>')
      if (event.slurStop) notations.push('<slur type="stop" number="1"/>')
      parts.push(`      <notations>${notations.join('')}</notations>`)
    }
    parts.push('    </note>')
    return parts.join('\n')
  }

  // 小节线的子元素顺序按 MusicXML DTD：bar-style → ending → repeat
  const barlineXml = (measure) => {
    const left = []
    if (measure.repeatStart) left.push('<bar-style>heavy-light</bar-style>')
    if (measure.endingStart != null) left.push(`<ending number="${measure.endingStart}" type="start"/>`)
    if (measure.repeatStart) left.push('<repeat direction="forward"/>')

    const right = []
    if (measure.repeatEnd) right.push('<bar-style>light-heavy</bar-style>')
    if (measure.endingEnd != null) right.push(`<ending number="${measure.endingEnd}" type="stop"/>`)
    if (measure.repeatEnd) right.push(`<repeat direction="backward" times="${measure.repeatTimes}"/>`)

    const lines = []
    if (left.length) lines.push(`    <barline location="left">${left.join('')}</barline>`)
    if (right.length) lines.push(`    <barline location="right">${right.join('')}</barline>`)
    return lines
  }

  const measureXml = (measure, index) => {
    const parts = [`  <measure number="${index + 1}">`]
    if (index === 0) {
      parts.push(
        '    <attributes>',
        `      <divisions>${divisions}</divisions>`,
        `      <key><fifths>${fifths}</fifths></key>`,
        `      <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>`,
        '      <clef><sign>G</sign><line>2</line></clef>',
        '    </attributes>'
      )
      if (meta.tempo) {
        // 只写 <sound tempo>，不再额外写 <words>：alphaTab 会自己把速度渲染到谱面信息区，
        // 两者都写会在谱面上出现两个重复的速度标记。
        parts.push('    <direction placement="above">', `      <sound tempo="${meta.tempo}"/>`, '    </direction>')
      }
    }
    for (const event of measure.events) parts.push(noteXml(event))
    parts.push(...barlineXml(measure))
    parts.push('  </measure>')
    return parts.join('\n')
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<!-- 个人演奏用谱，仅供学习交流。 -->
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <identification>
    <creator type="composer">${escapeXml(meta.composer ?? '')}</creator>
    <encoding><software>scripts/generate-scores.js</software></encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Harmonica</part-name>
      <score-instrument id="P1-I1"><instrument-name>Harmonica</instrument-name></score-instrument>
      <midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>${program}</midi-program></midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
${measures.map(measureXml).join('\n')}
  </part>
</score-partwise>
`
}

/**
 * 生成简谱显示模型：段落 → 乐句行 → 音符。
 * 与 buildMeasures 消费同一个 token 流，所以两条路线的音符顺序一一对应，
 * 前端可以用"第 N 个音"把五线谱的播放位置和简谱的高亮对齐。
 */
export function buildDisplay(tokens, meta) {
  const divisions = Number(meta.divisions ?? 4)
  const sections = []
  let currentSection = { name: null, phrases: [] }
  let currentPhrase = null
  let lastRepeatEnd = null

  const pushSection = () => {
    if (currentSection.phrases.length > 0 || currentSection.name) sections.push(currentSection)
  }

  for (const token of tokens) {
    if (token.kind === 'section') {
      pushSection()
      currentSection = { name: token.name, phrases: [] }
      currentPhrase = null
      continue
    }
    if (token.kind === 'phrase') {
      currentPhrase = { line: token.line, lyric: token.lyric, notes: [] }
      currentSection.phrases.push(currentPhrase)
      continue
    }
    if (token.kind === 'tab') {
      if (currentPhrase) currentPhrase.notes.push({ kind: 'tab' })
      continue
    }
    // 换气记号也是序列里的一个条目，按它在行内的位置渲染
    if (token.kind === 'breath') {
      if (!currentPhrase) {
        currentPhrase = { line: 0, lyric: '', notes: [] }
        currentSection.phrases.push(currentPhrase)
      }
      currentPhrase.notes.push({ kind: 'breath' })
      continue
    }

    // 小节线也插进序列：简谱上画出小节线，才能看出「换行 ≠ 换小节」。
    if (token.kind === 'bar') {
      if (!currentPhrase) {
        currentPhrase = { line: 0, lyric: '', notes: [] }
        currentSection.phrases.push(currentPhrase)
      }
      currentPhrase.notes.push({ kind: 'bar' })
      continue
    }

    if (token.kind === 'endingStart') {
      currentPhrase.notes.push({ kind: 'endingStart', number: token.number })
      continue
    }

    // 反复记号作为「音符序列里的一个条目」插入原位，而不是挂在乐句首尾。
    // 这样 `|:` 出现在一行的中间时，简谱就画在中间 —— 换行因而可以纯粹表示乐句分隔。
    if (token.kind === 'repeatStart' || token.kind === 'repeatEnd' || token.kind === 'repeatTimes') {
      if (!currentPhrase) {
        currentPhrase = { line: 0, lyric: '', notes: [] }
        currentSection.phrases.push(currentPhrase)
      }
      if (token.kind === 'repeatStart') {
        currentPhrase.notes.push({ kind: 'repeatStart' })
      } else if (token.kind === 'repeatEnd') {
        const marker = { kind: 'repeatEnd', times: 2 }
        currentPhrase.notes.push(marker)
        lastRepeatEnd = marker // xN 在 :| 之后出现，先记下再回填次数
      } else if (lastRepeatEnd) {
        lastRepeatEnd.times = token.times
      }
      continue
    }
    if (token.kind !== 'pitch') continue

    const event = parsePitchToken(token.token, divisions)
    if (!event || event.error) continue

    if (!currentPhrase) {
      // 正文第一行之前就出现的音符（正常不该发生）也要有归属，避免丢音。
      currentPhrase = { line: 0, lyric: '', notes: [] }
      currentSection.phrases.push(currentPhrase)
    }

    const quarters = event.duration / divisions
    // 长音全部用增时线：3 个四分时值画为「1 - -」；短附点音正常保留附点。
    const dotted = quarters < 2 && event.type.dot
    // 去掉附点后的基准时值，决定减时线条数
    const base = dotted ? quarters / 1.5 : quarters

    currentPhrase.notes.push({
      kind: 'note',
      rest: event.kind === 'rest',
      degree: event.kind === 'rest' ? 0 : event.degree,
      sharp: event.alter === 1,
      flat: event.alter === -1,
      octave: event.octaveShift,
      underlines: base < 1 ? Math.round(Math.log2(1 / base)) : 0,
      dashes: quarters >= 2 ? quarters - 1 : 0,
      dotted,
      tieStart: Boolean(event.tieStart),
      tieStop: Boolean(event.tieStop),
      slurStart: Boolean(event.slurStart),
      slurStop: Boolean(event.slurStop),
      midi: event.midi ?? null
    })
  }

  pushSection()
  // 显示模型也保留连音终点；忽略小节线、结尾标记和乐句/段落边界。
  const notes = sections.flatMap(section => section.phrases.flatMap(phrase =>
    phrase.notes.filter(note => note.kind === 'note')))
  for (let i = 0; i < notes.length - 1; i++) {
    if (notes[i].slurStart && !notes[i + 1].rest) notes[i + 1].slurStop = true
    if (notes[i].tieStart && !notes[i + 1].rest && notes[i].midi === notes[i + 1].midi) {
      notes[i + 1].tieStop = true
    }
  }
  // 结尾覆盖范围跨乐句保留，遇到反复结束、下个结尾或段落边界收尾。
  // 只标注显示条目，不插入音符，以免改变播放/高亮索引。
  let endingId = 0
  for (const section of sections) {
    let activeEnding = null
    let lastItem = null
    const closeEnding = () => {
      if (activeEnding && lastItem) lastItem.endingLast = true
      activeEnding = null
    }
    for (const phrase of section.phrases) {
      for (const item of phrase.notes) {
        if (item.kind === 'endingStart') {
          closeEnding()
          activeEnding = ++endingId
        }
        if (activeEnding) item.endingId = activeEnding
        lastItem = item
        if (item.kind === 'repeatEnd') closeEnding()
      }
    }
    closeEnding()
  }
  // 丢弃既无段落名又无乐句的空壳
  return sections.filter((section) => section.phrases.length > 0)
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (ch) => {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch]
  })
}
