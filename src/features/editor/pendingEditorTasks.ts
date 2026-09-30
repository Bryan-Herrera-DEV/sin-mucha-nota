const pendingTasks = new Set<Promise<void>>()

export function trackEditorTask(task: Promise<void>): void {
  pendingTasks.add(task)
  void task.finally(() => pendingTasks.delete(task))
}

export async function waitForEditorTasks(): Promise<void> {
  while (pendingTasks.size) await Promise.all(pendingTasks)
}
