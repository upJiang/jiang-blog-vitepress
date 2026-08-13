import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface TrackSelection {
  activeTrack: Ref<string>
  selectTrack: (track: string, replace?: boolean) => void
}

export function useTrackSelection(validKeys: () => readonly string[]): TrackSelection {
  const activeTrack = ref('all')

  function readTrackFromLocation(): string {
    const value = new URLSearchParams(window.location.search).get('track')
    return value && validKeys().includes(value) ? value : 'all'
  }

  function writeTrackToLocation(track: string, replace = false): void {
    const url = new URL(window.location.href)
    url.searchParams.set('track', track)
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url)
  }

  function selectTrack(track: string, replace = false): void {
    if (!validKeys().includes(track)) return
    if (activeTrack.value === track && !replace) return
    activeTrack.value = track
    writeTrackToLocation(track, replace)
  }

  function syncFromHistory(): void {
    activeTrack.value = readTrackFromLocation()
  }

  onMounted(() => {
    activeTrack.value = readTrackFromLocation()
    const rawTrack = new URLSearchParams(window.location.search).get('track')
    if (rawTrack !== activeTrack.value) writeTrackToLocation(activeTrack.value, true)
    window.addEventListener('popstate', syncFromHistory)
  })

  onBeforeUnmount(() => window.removeEventListener('popstate', syncFromHistory))

  return { activeTrack, selectTrack }
}
