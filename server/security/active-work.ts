export type ActiveWorkKind = 'provider' | 'solver'
export type TrackActiveWork = <T>(kind: ActiveWorkKind, start: () => Promise<T>) => Promise<T>

export interface ActiveWorkTracker {
  readonly pendingWork: number
  readonly isLogicalTerminal: boolean
  readonly isReleased: boolean
  track<T>(work: Promise<T>): Promise<T>
  markLogicalTerminal(): void
}

export function createActiveWorkTracker(onReleased: () => void = () => undefined): ActiveWorkTracker {
  let pendingWork = 0
  let isLogicalTerminal = false
  let isReleased = false

  const releaseIfSettled = (): void => {
    if (!isLogicalTerminal || pendingWork !== 0 || isReleased) return
    isReleased = true
    onReleased()
  }

  return {
    get pendingWork() { return pendingWork },
    get isLogicalTerminal() { return isLogicalTerminal },
    get isReleased() { return isReleased },
    track<T>(work: Promise<T>): Promise<T> {
      if (isLogicalTerminal) throw new Error('Cannot track work after the logical job is terminal.')
      pendingWork += 1
      let settled = false
      const settle = (): void => {
        if (settled) return
        settled = true
        pendingWork -= 1
        releaseIfSettled()
      }
      // The side chain always fulfills; the original promise remains available to its owner.
      void work.then(settle, settle)
      return work
    },
    markLogicalTerminal(): void {
      if (isLogicalTerminal) return
      isLogicalTerminal = true
      releaseIfSettled()
    },
  }
}