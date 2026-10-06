// Usage: node scripts/prepare-score-soundfonts.mjs <MS Basic.sf3 or alphaTab sonivox.sf2>
// Extract menu instruments without changing their recorded samples.
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { INSTRUMENTS } from '../.vitepress/theme/score-player/alphatab.mjs'

const source = fs.readFileSync(process.argv[2])
const tables = new Map()
function readChunks(start, end) {
  const chunks = []
  for (let offset = start; offset + 8 <= end;) {
    const id = source.toString('ascii', offset, offset + 4)
    const size = source.readUInt32LE(offset + 4)
    const body = offset + 8
    if (body + size > end) throw new Error('Invalid RIFF chunk')
    const data = source.subarray(body, body + size)
    chunks.push({ id, data })
    tables.set(id, data)
    if (id === 'LIST') readChunks(body + 4, body + size)
    offset = body + size + (size % 2)
  }
  return chunks
}
if (source.toString('ascii', 0, 4) !== 'RIFF' || source.toString('ascii', 8, 12) !== 'sfbk') throw new Error('Expected SoundFont')
const lists = readChunks(12, source.length)
const sizes = { phdr: 38, pbag: 4, pmod: 10, pgen: 4, inst: 22, ibag: 4, imod: 10, igen: 4, shdr: 46 }
const records = Object.fromEntries(Object.entries(sizes).map(([id, size]) => {
  const data = tables.get(id)
  if (!data || data.length % size) throw new Error(`Invalid ${id}`)
  return [id, Array.from({ length: data.length / size }, (_, i) => Buffer.from(data.subarray(i * size, (i + 1) * size)))]
}))

// Copy whole zones, including global generators and modulators, and rebuild indices.
function copyZones(indices, headerId, bagId, genId, modId, headerOffset, transform) {
  const headers = [], bags = [], gens = [], mods = []
  for (const index of indices) {
    const header = Buffer.from(records[headerId][index])
    const start = header.readUInt16LE(headerOffset)
    const end = records[headerId][index + 1].readUInt16LE(headerOffset)
    header.writeUInt16LE(bags.length, headerOffset)
    headers.push(header)
    for (let i = start; i < end; i++) {
      const original = records[bagId][i], next = records[bagId][i + 1]
      const bag = Buffer.alloc(4)
      bag.writeUInt16LE(gens.length, 0)
      bag.writeUInt16LE(mods.length, 2)
      bags.push(bag)
      for (let j = original.readUInt16LE(0); j < next.readUInt16LE(0); j++) {
        const gen = Buffer.from(records[genId][j])
        const extra = transform(gen, records[genId].slice(original.readUInt16LE(0), next.readUInt16LE(0)))
        if (extra) gens.push(extra)
        gens.push(gen)
      }
      for (let j = original.readUInt16LE(2); j < next.readUInt16LE(2); j++) mods.push(records[modId][j])
    }
  }
  const terminalHeader = Buffer.from(records[headerId].at(-1))
  terminalHeader.writeUInt16LE(bags.length, headerOffset)
  headers.push(terminalHeader)
  const terminalBag = Buffer.alloc(4)
  terminalBag.writeUInt16LE(gens.length, 0)
  terminalBag.writeUInt16LE(mods.length, 2)
  bags.push(terminalBag)
  gens.push(Buffer.alloc(sizes[genId]))
  mods.push(Buffer.alloc(sizes[modId]))
  return { [headerId]: headers, [bagId]: bags, [genId]: gens, [modId]: mods }
}
function extract(program) {
  const presets = records.phdr.slice(0, -1).flatMap((header, i) =>
    header.readUInt16LE(22) === 0 && header.readUInt16LE(20) === program - 1 ? [i] : [])
  if (presets.length !== 1) throw new Error(`Expected one bank-0 preset for GM ${program}`)
  const instruments = new Map()
  const presetTables = copyZones(presets, 'phdr', 'pbag', 'pgen', 'pmod', 24, gen => {
    if (gen.readUInt16LE(0) !== 41) return
    const original = gen.readUInt16LE(2)
    if (!instruments.has(original)) instruments.set(original, instruments.size)
    gen.writeUInt16LE(instruments.get(original), 2)
  })
  const samples = new Map()
  const instrumentTables = copyZones([...instruments.keys()], 'inst', 'ibag', 'igen', 'imod', 20, (gen, zone) => {
    if (gen.readUInt16LE(0) !== 53) return
    const original = gen.readUInt16LE(2)
    if (!samples.has(original)) samples.set(original, samples.size)
    gen.writeUInt16LE(samples.get(original), 2)
    // alphaTab only accepts mono sample headers. Linked left/right Vorbis streams
    // are themselves mono: preserve both streams and encode their pan explicitly.
    const type = records.shdr[original].readUInt16LE(44)
    if ((type & 6) && !zone.some(item => item.readUInt16LE(0) === 17)) {
      const pan = Buffer.alloc(4)
      pan.writeUInt16LE(17, 0)
      pan.writeInt16LE(type & 4 ? -500 : 500, 2)
      return pan
    }
  })
  // Include linked stereo partners, even if only one side is referenced by a zone.
  for (const index of samples.keys()) {
    const header = records.shdr[index]
    if (header.readUInt16LE(44) & 6) {
      const partner = header.readUInt16LE(42)
      if (!samples.has(partner)) samples.set(partner, samples.size)
    }
  }
  const sampleHeaders = [], sampleData = []
  let sampleOffset = 0
  for (const index of samples.keys()) {
    const header = Buffer.from(records.shdr[index])
    const compressed = Boolean(header.readUInt16LE(44) & 16)
    const unit = compressed ? 1 : 2
    const start = header.readUInt32LE(20)
    const data = tables.get('smpl').subarray(start * unit, header.readUInt32LE(24) * unit)
    if (compressed && data.toString('ascii', 0, 4) !== 'OggS') throw new Error('Invalid Vorbis sample')
    if (!compressed) {
      // SF2 offsets count PCM frames; loop positions are absolute within smpl.
      for (const offset of [28, 32]) header.writeUInt32LE(header.readUInt32LE(offset) - start + sampleOffset / unit, offset)
    }
    header.writeUInt32LE(sampleOffset / unit, 20)
    sampleOffset += data.length
    header.writeUInt32LE(sampleOffset / unit, 24)
    if (header.readUInt16LE(44) & 6) header.writeUInt16LE(samples.get(header.readUInt16LE(42)), 42)
    if (header.readUInt16LE(44) & 6) {
      header.writeUInt16LE(compressed ? 17 : 1, 44)
      header.writeUInt16LE(0, 42)
    }
    sampleHeaders.push(header)
    sampleData.push(data)
    if (!compressed) {
      sampleData.push(Buffer.alloc(46 * 2)) // SoundFont 2 sample guard frames.
      sampleOffset += 46 * 2
    }
  }
  sampleHeaders.push(Buffer.from(records.shdr.at(-1)))
  function chunk(id, data) {
    const header = Buffer.alloc(8)
    header.write(id, 0, 'ascii')
    header.writeUInt32LE(data.length, 4)
    return Buffer.concat([header, data, ...(data.length % 2 ? [Buffer.alloc(1)] : [])])
  }
  const outputTables = { ...presetTables, ...instrumentTables, shdr: sampleHeaders }
  const info = lists.find(item => item.id === 'LIST' && item.data.toString('ascii', 0, 4) === 'INFO')
  // Include trailing alignment inside smpl: alphaTab's RIFF reader does not skip odd-chunk padding.
  // Sample end offsets still exclude this unused byte.
  const packedSamples = Buffer.concat([...sampleData, ...(sampleOffset % 2 ? [Buffer.alloc(1)] : [])])
  const result = chunk('RIFF', Buffer.concat([
    Buffer.from('sfbk'), chunk('LIST', info.data),
    chunk('LIST', Buffer.concat([Buffer.from('sdta'), chunk('smpl', packedSamples)])),
    chunk('LIST', Buffer.concat([Buffer.from('pdta'), ...Object.keys(sizes).map(id => chunk(id, Buffer.concat(outputTables[id])))]))
  ]))
  const { soundFont } = INSTRUMENTS.find(instrument => instrument.program === program)
  fs.writeFileSync(new URL(`../public${soundFont}`, import.meta.url), result)
  console.log(`GM ${program}: ${samples.size} samples, ${result.length} bytes`)
}
for (const { program, soundFont } of INSTRUMENTS) {
  if (soundFont.endsWith(process.argv[2].endsWith('.sf2') ? '.sf2' : '.sf3')) extract(program)
}
console.log(`Source SHA-256: ${createHash('sha256').update(source).digest('hex')}`)
