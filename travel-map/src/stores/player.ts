import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Howl } from 'howler'

interface BGMTrack {
  id: number
  filename: string
  filepath: string
  title: string
  artist: string
  duration: number
}

export const usePlayerStore = defineStore('player', () => {
  const playlist = ref<BGMTrack[]>([])
  const currentIndex = ref(0)
  const isPlaying = ref(false)
  const volume = ref(0.5)
  const currentTime = ref(0)
  const duration = ref(0)
  const howl = ref<Howl | null>(null)

  const currentTrack = computed(() => playlist.value[currentIndex.value] || null)

  function setPlaylist(tracks: BGMTrack[]) {
    stop()
    playlist.value = tracks
    currentIndex.value = 0
  }

  function play() {
    if (!currentTrack.value) return
    
    if (howl.value) {
      howl.value.play()
      isPlaying.value = true
      return
    }

    howl.value = new Howl({
      src: [currentTrack.value.filepath],
      volume: volume.value,
      onend: () => next(),
      onplay: () => {
        isPlaying.value = true
        duration.value = howl.value?.duration() || 0
        updateTime()
      },
      onpause: () => {
        isPlaying.value = false
      },
      onstop: () => {
        isPlaying.value = false
      }
    })

    howl.value.play()
  }

  function pause() {
    howl.value?.pause()
    isPlaying.value = false
  }

  function stop() {
    howl.value?.stop()
    howl.value?.unload()
    howl.value = null
    isPlaying.value = false
    currentTime.value = 0
  }

  function toggle() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function next() {
    if (currentIndex.value < playlist.value.length - 1) {
      stop()
      currentIndex.value++
      play()
    } else {
      stop()
    }
  }

  function prev() {
    if (currentIndex.value > 0) {
      stop()
      currentIndex.value--
      play()
    }
  }

  function seek(time: number) {
    howl.value?.seek(time)
    currentTime.value = time
  }

  function setVolume(v: number) {
    volume.value = v
    howl.value?.volume(v)
  }

  function updateTime() {
    if (howl.value && isPlaying.value) {
      currentTime.value = howl.value.seek() as number
      requestAnimationFrame(updateTime)
    }
  }

  return {
    playlist,
    currentIndex,
    isPlaying,
    volume,
    currentTime,
    duration,
    currentTrack,
    setPlaylist,
    play,
    pause,
    stop,
    toggle,
    next,
    prev,
    seek,
    setVolume
  }
})
