import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const marker = '// score-player AudioWorklet lifecycle patch v1'
const upstreamHash = '963fe3b8cea40d0671c26a4368437f25f7cfe6ba3d1a6e29a8cd46607136208d'
const patchedHash = '034da55d75282a32024a0b17c5bf2e847d171e7d2e4fef13f1ca01106e4870ac'
const hash = source => createHash('sha256').update(source).digest('hex')

// MPL-2.0: narrowly modifies alphaTab 1.8.4's AlphaSynthAudioWorkletOutput.
// Keep upstream's licensing headers intact. Fail closed when its source changes.
export function patchAudioWorklet(source, version) {
  if (version !== '1.8.4') throw new Error(`Review the AudioWorklet patch for alphaTab ${version}`)
  // Public MIDI acknowledgement subscriptions replay loadedMidiInfo on registration.
  // Fix the upstream recursive getter so these subscriptions are safe in Worker mode.
  const getter = '\tget loadedMidiInfo() {\n\t\treturn this.loadedMidiInfo;\n\t}'
  const fixedGetter = '\t// score-player MIDI acknowledgement getter fix\n\tget loadedMidiInfo() {\n\t\treturn this._loadedMidiInfo;\n\t}'
  if (source.split(getter).length === 2) source = source.replace(getter, fixedGetter)
  else if (source.split(fixedGetter).length !== 2) throw new Error('alphaTab MIDI getter source has changed')
  const start = source.indexOf('class AlphaSynthAudioWorkletOutput extends AlphaSynthWebAudioOutputBase {')
  const end = source.indexOf('\n//#endregion', start)
  if (start < 0 || end < 0) throw new Error('alphaTab AudioWorklet class not found')
  let output = source.slice(start, end)
  if (output.includes(marker)) {
    if (hash(output) !== patchedHash) throw new Error('alphaTab AudioWorklet patch has changed')
    return source
  }
  if (hash(output) !== upstreamHash) throw new Error('alphaTab AudioWorklet upstream source has changed')
  const playStart = output.indexOf('\tplay() {')
  const playEnd = output.indexOf('\t_handleMessage(e) {', playStart)
  output = output.slice(0, playStart) + `\t${marker}
\t_playback = null;
\t_modulePromise;
\tplay() {
\t\tthis.pause();
\t\tsuper.play();
\t\tconst ctx = this.context;
\t\tconst playback = { source: this.source, started: false, worklet: null, handler: null };
\t\tthis._playback = playback;
\t\tthis._pendingEvents = [];
\t\t// Register once per output/context; rapid restarts share the pending registration.
\t\tconst module = this._modulePromise ??= Promise.resolve()
\t\t\t.then(() => BrowserUiFacade.createAlphaSynthAudioWorklet(ctx, this._settings))
\t\t\t.catch(error => { this._modulePromise = void 0; throw error; });
\t\tmodule.then(() => {
\t\t\tif (this._playback !== playback || this.context !== ctx || ctx.state === "closed") return;
\t\t\tconst worklet = playback.worklet = new AudioWorkletNode(ctx, "alphatab", {
\t\t\t\tnumberOfOutputs: 1,
\t\t\t\toutputChannelCount: [2],
\t\t\t\tprocessorOptions: { bufferTimeInMilliseconds: this._bufferTimeInMilliseconds }
\t\t\t});
\t\t\tthis._worklet = worklet;
\t\t\tplayback.handler = e => { if (this._playback === playback) this._handleMessage(e); };
\t\t\tworklet.port.addEventListener("message", playback.handler);
\t\t\tworklet.port.start();
\t\t\tplayback.source.connect(worklet);
\t\t\tplayback.source.start(0);
\t\t\tplayback.started = true;
\t\t\tworklet.connect(ctx.destination);
\t\t\tfor (const event of this._pendingEvents ?? []) worklet.port.postMessage(event);
\t\t\tthis._pendingEvents = void 0;
\t\t}).catch(reason => {
\t\t\tif (this._playback !== playback) return;
\t\t\tthis.pause();
\t\t\tLogger.error("WebAudio", "Audio Worklet creation failed", reason);
\t\t});
\t}
` + output.slice(playEnd)
  const pauseStart = output.indexOf('\tpause() {')
  const pauseEnd = output.indexOf('\t_postWorkerMessage(message) {', pauseStart)
  output = output.slice(0, pauseStart) + `\tpause() {
\t\tconst playback = this._playback;
\t\t// Invalidate first, so pending startup and queued messages cannot revive this output.
\t\tthis._playback = null;
\t\tif (playback) {
\t\t\tif (playback.started) playback.source.stop(0);
\t\t\tplayback.source.disconnect();
\t\t\tif (playback.worklet) {
\t\t\t\tplayback.worklet.port.postMessage({ cmd: "alphaSynth.output.stop" });
\t\t\t\tplayback.worklet.port.removeEventListener("message", playback.handler);
\t\t\t\tplayback.worklet.port.close();
\t\t\t\tplayback.worklet.disconnect();
\t\t\t}
\t\t}
\t\tthis.source = null;
\t\tthis.buffer = null;
\t\tthis._worklet = null;
\t\tthis._pendingEvents = void 0;
\t}
` + output.slice(pauseEnd)
  return source.slice(0, start) + output + source.slice(end)
}

export function applyPatch() {
  const packageDir = new URL('../node_modules/@coderline/alphatab/', import.meta.url)
  const { version } = JSON.parse(fs.readFileSync(new URL('package.json', packageDir), 'utf8'))
  const file = new URL('dist/alphaTab.core.mjs', packageDir)
  const original = fs.readFileSync(file, 'utf8')
  const patched = patchAudioWorklet(original, version)
  if (patched !== original) {
    fs.writeFileSync(file, patched)
    // The known generated Vite cache may otherwise keep the old optimized dependency.
    const cache = fileURLToPath(new URL('../.vitepress/cache/', import.meta.url))
    const root = fileURLToPath(new URL('../', import.meta.url))
    if (!cache.startsWith(root)) throw new Error('Cache path must stay inside the project')
    fs.rmSync(cache, { recursive: true, force: true })
  }
  console.log(`alphaTab ${version}: AudioWorklet lifecycle patch verified`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) applyPatch()
