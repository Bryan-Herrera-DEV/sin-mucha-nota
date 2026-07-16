import type { DrawingDocument } from '@/domain/notes/note'
import type { Locale } from '@/domain/preferences/preferences'

export function getWelcomeMarkdown(locale: Locale, displayName: string): string {
  if (locale === 'en') {
    return `# Welcome, ${displayName}

This note stores **Markdown** and an **Excalidraw canvas** together.

- Write ideas with formatting.
- Draw flows, maps or wireframes beside the note.
- Organize everything in folders and endless subfolders.

> Everything is local: structured data lives in IndexedDB and note files use browser file storage when available.`
  }

  return `# Bienvenido, ${displayName}

Esta nota guarda **Markdown** y un **lienzo de Excalidraw** juntos.

- Escribe ideas con formato.
- Dibuja flujos, mapas o wireframes al lado de la nota.
- Organiza todo en carpetas y subcarpetas sin limite.

> Todo es local: la data estructurada vive en IndexedDB y los archivos de nota usan file storage del navegador cuando esta disponible.`
}

export function getWelcomeDrawing(): DrawingDocument {
  return {
    elements: [
      {
        id: 'welcome-note-card',
        type: 'rectangle',
        x: 120,
        y: 110,
        width: 360,
        height: 190,
        angle: 0,
        strokeColor: '#c7774a',
        backgroundColor: '#fff3df',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: { type: 3 },
        seed: 1212,
        versionNonce: 101,
        isDeleted: false,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false,
      },
      {
        id: 'welcome-note-text',
        type: 'text',
        x: 155,
        y: 160,
        width: 285,
        height: 70,
        angle: 0,
        strokeColor: '#2f261f',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: 3434,
        versionNonce: 202,
        isDeleted: false,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false,
        text: 'Markdown + Excalidraw',
        fontSize: 28,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: null,
        originalText: 'Markdown + Excalidraw',
        lineHeight: 1.25,
        baseline: 60,
      },
    ],
    appState: {
      viewBackgroundColor: '#fff8ec',
    },
    files: {},
  }
}
