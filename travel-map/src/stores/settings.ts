import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const resourcePath = ref('')
  const theme = ref<'light' | 'dark'>('light')
  const thumbnailSize = ref(200)
  const autoPlay = ref(true)
  const autoPlayInterval = ref(5000)

  async function loadSettings() {
    const settings = await window.electronAPI.getSettings()
    resourcePath.value = settings.resourcePath || ''
    theme.value = (settings.theme || 'light') as 'light' | 'dark'
    thumbnailSize.value = parseInt(settings.thumbnailSize) || 200
    autoPlay.value = settings.autoPlay !== 'false'
    autoPlayInterval.value = parseInt(settings.autoPlayInterval) || 5000
  }

  async function setResourcePath(path: string) {
    await window.electronAPI.setSetting('resourcePath', path)
    resourcePath.value = path
  }

  async function setTheme(newTheme: 'light' | 'dark') {
    await window.electronAPI.setSetting('theme', newTheme)
    theme.value = newTheme
  }

  async function setThumbnailSize(size: number) {
    await window.electronAPI.setSetting('thumbnailSize', size.toString())
    thumbnailSize.value = size
  }

  async function setAutoPlay(enabled: boolean) {
    await window.electronAPI.setSetting('autoPlay', enabled.toString())
    autoPlay.value = enabled
  }

  async function setAutoPlayInterval(interval: number) {
    await window.electronAPI.setSetting('autoPlayInterval', interval.toString())
    autoPlayInterval.value = interval
  }

  return {
    resourcePath,
    theme,
    thumbnailSize,
    autoPlay,
    autoPlayInterval,
    loadSettings,
    setResourcePath,
    setTheme,
    setThumbnailSize,
    setAutoPlay,
    setAutoPlayInterval
  }
})
