import { performance } from 'node:perf_hooks'
import { createFolderTreeIndex, getVisibleNotes } from '../src/application/workspace/noteFilters.ts'
import { encodeGithubContentBase64 } from '../src/infrastructure/github/githubApi.ts'

const DEFAULTS = {
  folders: 1600,
  notes: 8000,
  markdownKb: 6,
  drawingKb: 4,
  iterations: 8,
  warmup: 2,
  seed: 41,
  encodeSample: 24,
}

const options = parseOptions(process.argv.slice(2))
const dataset = createDataset(options)
const activeFolderId = dataset.folders[0]?.id ?? null
const searchTerm = 'target'
let sink = 0

validateCurrentImplementations(dataset, activeFolderId, searchTerm)

const runs = [
  runBenchmark('visible all/current', () => getVisibleNotes(dataset.notes, dataset.folders, null, ''), options),
  runBenchmark('visible folder/current', () => getVisibleNotes(dataset.notes, dataset.folders, activeFolderId, ''), options),
  runBenchmark('visible search/current', () => getVisibleNotes(dataset.notes, dataset.folders, null, searchTerm), options),
  runBenchmark('visible folder+search/current', () => getVisibleNotes(dataset.notes, dataset.folders, activeFolderId, searchTerm), options),
  runBenchmark('folder tree index/current', () => createFolderTreeIndex(dataset.folders, dataset.notes), options),
  runBenchmark('sync snapshot/current', () => createSyncSnapshotLike(dataset), options),
  runBenchmark('github base64/current', () => encodeFileSample(dataset.files, options.encodeSample), options),
]

if (options.compareLegacy) {
  runs.push(
    runBenchmark('visible folder/legacy', () => getVisibleNotesLegacy(dataset.notes, dataset.folders, activeFolderId, ''), options),
    runBenchmark('visible folder+search/legacy', () => getVisibleNotesLegacy(dataset.notes, dataset.folders, activeFolderId, searchTerm), options),
    runBenchmark('folder counts/legacy', () => createLegacyFolderCounts(dataset.folders, dataset.notes), options),
  )
}

printSummary(dataset, options, runs)

function parseOptions(args) {
  const options = { ...DEFAULTS, compareLegacy: false }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--compare-legacy') {
      options.compareLegacy = true
      continue
    }

    const [rawKey, inlineValue] = arg.split('=')

    if (!rawKey.startsWith('--')) {
      continue
    }

    const key = rawKey.slice(2)
    const value = inlineValue ?? args[index + 1]

    if (inlineValue === undefined) {
      index += 1
    }

    if (key in options && value !== undefined) {
      options[key] = Number(value)
    }
  }

  return options
}

function createDataset(options) {
  const folders = createFolders(options.folders)
  const notes = createNotes(options.notes, folders)
  const markdownPayload = createPayload('markdown', options.markdownKb)
  const drawingPayload = createPayload('drawing', options.drawingKb)
  const files = new Map()

  for (const note of notes) {
    files.set(note.contentRef.markdownPath, `${markdownPayload}\n<!-- ${note.id} -->`)
    files.set(note.contentRef.drawingPath, `{"elements":[],"appState":{"seed":${options.seed}},"files":{"payload":"${drawingPayload}","note":"${note.id}"}}`)
  }

  return { folders, notes, files }
}

function validateCurrentImplementations(dataset, activeFolderId, searchTerm) {
  const currentVisibleIds = getVisibleNotes(dataset.notes, dataset.folders, activeFolderId, searchTerm).map((note) => note.id)
  const legacyVisibleIds = getVisibleNotesLegacy(dataset.notes, dataset.folders, activeFolderId, searchTerm).map((note) => note.id)

  if (currentVisibleIds.join('\n') !== legacyVisibleIds.join('\n')) {
    throw new Error('Current visible-note filtering does not match legacy behavior')
  }

  const folderIndex = createFolderTreeIndex(dataset.folders, dataset.notes)
  const countedNotes = folderIndex.rootFolders.reduce((total, folder) => total + (folderIndex.noteCountByFolderId.get(folder.id) ?? 0), 0)
  const assignedNotes = dataset.notes.filter((note) => note.folderId !== null).length

  if (countedNotes !== assignedNotes) {
    throw new Error(`Folder note counts are inconsistent: counted=${countedNotes} assigned=${assignedNotes}`)
  }
}

function createFolders(count) {
  const icons = ['folder', 'project', 'book', 'idea', 'travel', 'meeting', 'recipe', 'personal']
  const folders = []

  for (let index = 0; index < count; index += 1) {
    const id = createId('folder', index)
    const parentId = index === 0 ? null : createId('folder', Math.floor((index - 1) / 4))

    folders.push({
      id,
      name: `Benchmark Folder ${index}`,
      icon: icons[index % icons.length],
      parentId,
      createdAt: createTimestamp(index),
      updatedAt: createTimestamp(count - index),
    })
  }

  return folders
}

function createNotes(count, folders) {
  const notes = []
  const folderCount = Math.max(folders.length, 1)

  for (let index = 0; index < count; index += 1) {
    const id = createId('note', index)
    const folder = folders[(index * 37) % folderCount]
    const folderId = folders.length === 0 || index % 11 === 0 ? null : folder.id
    const target = index % 31 === 0 ? ' target' : ''

    notes.push({
      id,
      title: `Benchmark Note ${index}${target}`,
      folderId,
      contentRef: {
        markdownPath: `notes/${id}/markdown.md`,
        drawingPath: `notes/${id}/drawing.excalidraw.json`,
      },
      createdAt: createTimestamp(index),
      updatedAt: createTimestamp(count - index),
    })
  }

  return notes
}

function createPayload(label, kilobytes) {
  const targetLength = Math.max(1, kilobytes) * 1024
  const chunk = `${label}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. `
  let value = ''

  while (value.length < targetLength) {
    value += chunk
  }

  return value.slice(0, targetLength)
}

function createSyncSnapshotLike(dataset) {
  const document = {
    app: 'sin-mucha-nota',
    version: 1,
    exportedAt: createTimestamp(0),
    updatedAt: createTimestamp(1),
    preferences: null,
    folders: dataset.folders,
    notes: dataset.notes,
  }
  const files = [{ path: '.sin-mucha-nota/workspace.json', content: JSON.stringify(document, null, 2) }]
  let contentBytes = files[0].content.length

  for (const note of dataset.notes) {
    const markdown = dataset.files.get(note.contentRef.markdownPath) ?? ''
    const drawing = dataset.files.get(note.contentRef.drawingPath) ?? '{"elements":[],"appState":{},"files":{}}'

    files.push({ path: `.sin-mucha-nota/${note.contentRef.markdownPath}`, content: markdown })
    files.push({ path: `.sin-mucha-nota/${note.contentRef.drawingPath}`, content: drawing })
    contentBytes += markdown.length + drawing.length
  }

  return { document, files, contentBytes }
}

function encodeFileSample(files, sampleSize) {
  let encodedBytes = 0
  let index = 0

  for (const content of files.values()) {
    encodedBytes += encodeGithubContentBase64(content).length
    index += 1

    if (index >= sampleSize) {
      break
    }
  }

  return { files: index, encodedBytes }
}

function getVisibleNotesLegacy(notes, folders, activeFolderId, search) {
  const visibleFolderIds = activeFolderId ? [activeFolderId, ...collectDescendantFolderIdsLegacy(activeFolderId, folders)] : null
  const normalizedSearch = search.trim().toLowerCase()

  return notes.filter((note) => {
    const matchesFolder = visibleFolderIds === null || (note.folderId !== null && visibleFolderIds.includes(note.folderId))
    const matchesSearch = !normalizedSearch || note.title.toLowerCase().includes(normalizedSearch)

    return matchesFolder && matchesSearch
  })
}

function createLegacyFolderCounts(folders, notes) {
  const counts = new Map()

  for (const folder of folders) {
    const folderIds = [folder.id, ...collectDescendantFolderIdsLegacy(folder.id, folders)]
    const count = notes.filter((note) => note.folderId !== null && folderIds.includes(note.folderId)).length

    counts.set(folder.id, count)
  }

  return counts
}

function collectDescendantFolderIdsLegacy(folderId, folders) {
  const childFolders = folders.filter((folder) => folder.parentId === folderId)

  return childFolders.flatMap((folder) => [folder.id, ...collectDescendantFolderIdsLegacy(folder.id, folders)])
}

function runBenchmark(name, operation, options) {
  for (let index = 0; index < options.warmup; index += 1) {
    consume(operation())
  }

  const timings = []
  const heapDeltas = []
  let sample

  for (let index = 0; index < options.iterations; index += 1) {
    if (globalThis.gc) {
      globalThis.gc()
    }

    const heapBefore = process.memoryUsage().heapUsed
    const startedAt = performance.now()

    sample = operation()

    const duration = performance.now() - startedAt
    const heapAfter = process.memoryUsage().heapUsed

    timings.push(duration)
    heapDeltas.push(heapAfter - heapBefore)
    consume(sample)
  }

  timings.sort((first, second) => first - second)
  heapDeltas.sort((first, second) => first - second)

  return {
    name,
    averageMs: average(timings),
    minMs: timings[0] ?? 0,
    maxMs: timings.at(-1) ?? 0,
    medianMs: percentile(timings, 0.5),
    heapDelta: percentile(heapDeltas, 0.5),
    result: describeResult(sample),
  }
}

function consume(value) {
  if (Array.isArray(value)) {
    sink += value.length
    return
  }

  if (value instanceof Map) {
    sink += value.size
    return
  }

  if (value && typeof value === 'object') {
    sink += Object.keys(value).length
  }
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1)
}

function percentile(values, target) {
  if (values.length === 0) {
    return 0
  }

  return values[Math.min(values.length - 1, Math.floor(values.length * target))]
}

function describeResult(value) {
  if (Array.isArray(value)) {
    return `${value.length} items`
  }

  if (value instanceof Map) {
    return `${value.size} entries`
  }

  if (value?.files && value.contentBytes) {
    return `${value.files.length} files, ${formatBytes(value.contentBytes)}`
  }

  if (value?.encodedBytes) {
    return `${value.files} files, ${formatBytes(value.encodedBytes)}`
  }

  if (value?.rootFolders && value?.noteCountByFolderId) {
    return `${value.rootFolders.length} roots, ${value.noteCountByFolderId.size} counts`
  }

  return 'ok'
}

function printSummary(dataset, options, runs) {
  const totalFileBytes = [...dataset.files.values()].reduce((total, content) => total + content.length, 0)

  console.log(`Workspace benchmark`)
  console.log(`folders=${dataset.folders.length} notes=${dataset.notes.length} files=${dataset.files.size} content=${formatBytes(totalFileBytes)}`)
  console.log(`iterations=${options.iterations} warmup=${options.warmup} compareLegacy=${options.compareLegacy ? 'yes' : 'no'} exposeGc=${globalThis.gc ? 'yes' : 'no'}`)
  console.log('')
  console.log(`${'operation'.padEnd(32)} ${'avg'.padStart(9)} ${'median'.padStart(9)} ${'min'.padStart(9)} ${'max'.padStart(9)} ${'heap'.padStart(10)} result`)

  for (const run of runs) {
    console.log(`${run.name.padEnd(32)} ${formatMs(run.averageMs).padStart(9)} ${formatMs(run.medianMs).padStart(9)} ${formatMs(run.minMs).padStart(9)} ${formatMs(run.maxMs).padStart(9)} ${formatBytes(run.heapDelta).padStart(10)} ${run.result}`)
  }

  if (sink === 0) {
    console.log('')
  }
}

function formatMs(value) {
  return `${value.toFixed(2)}ms`
}

function formatBytes(value) {
  const absolute = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absolute >= 1024 * 1024) {
    return `${sign}${(absolute / 1024 / 1024).toFixed(1)}MB`
  }

  if (absolute >= 1024) {
    return `${sign}${(absolute / 1024).toFixed(1)}KB`
  }

  return `${sign}${absolute}B`
}

function createId(prefix, index) {
  return `${prefix}_${String(index).padStart(6, '0')}`
}

function createTimestamp(offset) {
  return new Date(Date.UTC(2026, 0, 1, 0, 0, offset)).toISOString()
}
