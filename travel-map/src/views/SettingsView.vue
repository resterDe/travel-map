<template>
  <div class="flex flex-col h-screen">
    <header class="h-14 bg-white dark:bg-[#1B2838] border-b border-[var(--border-color)] flex items-center px-4 shadow-sm">
      <button @click="goBack" class="mr-4 p-1 hover:bg-[var(--bg-secondary)] rounded">
        <span class="text-xl">←</span>
      </button>
      <h1 class="text-lg font-semibold">设置</h1>
    </header>

    <div class="flex-1 overflow-auto p-6">
      <div class="max-w-2xl mx-auto space-y-6">
        <section class="bg-white dark:bg-[#1B2838] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
          <h2 class="text-lg font-semibold mb-4">存储设置</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-[var(--text-secondary)] mb-2">资源目录</label>
              <div class="flex gap-2">
                <input v-model="resourcePath" type="text" readonly
                  class="flex-1 h-11 px-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] dark:bg-[#0D1B2A]" />
                <button @click="selectDirectory" class="px-4 h-11 bg-[var(--color-primary-light)] text-white rounded-lg hover:opacity-90">
                  浏览
                </button>
              </div>
              <p class="text-xs text-[var(--text-secondary)] mt-1">照片和视频将存储在此目录下，按城市分类</p>
            </div>
          </div>
        </section>

        <section class="bg-white dark:bg-[#1B2838] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
          <h2 class="text-lg font-semibold mb-4">外观</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-[var(--text-secondary)] mb-2">主题</label>
              <div class="flex gap-2">
                <button @click="setTheme('light')" 
                  :class="['px-4 py-2 rounded-lg border', theme === 'light' ? 'bg-[var(--color-primary-light)] text-white border-[var(--color-primary-light)]' : 'border-[var(--border-color)]']">
                  ☀️ 浅色
                </button>
                <button @click="setTheme('dark')" 
                  :class="['px-4 py-2 rounded-lg border', theme === 'dark' ? 'bg-[var(--color-primary-light)] text-white border-[var(--color-primary-light)]' : 'border-[var(--border-color)]']">
                  🌙 深色
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="bg-white dark:bg-[#1B2838] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
          <h2 class="text-lg font-semibold mb-4">播放设置</h2>
          
          <div class="space-y-4">
            <div>
              <label class="flex items-center gap-2">
                <input type="checkbox" v-model="localAutoPlay" @change="updateAutoPlay" class="w-4 h-4" />
                <span class="text-sm">自动播放视频</span>
              </label>
            </div>
            
            <div>
              <label class="block text-sm text-[var(--text-secondary)] mb-2">自动播放间隔 (毫秒)</label>
              <input v-model.number="autoPlayInterval" @change="updateAutoPlayInterval" type="number" min="1000" max="30000" step="1000"
                class="w-40 h-10 px-3 border border-[var(--border-color)] rounded-lg" />
            </div>
          </div>
        </section>

        <section class="bg-white dark:bg-[#1B2838] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
          <h2 class="text-lg font-semibold mb-4">关于</h2>
          
          <div class="space-y-2 text-sm text-[var(--text-secondary)]">
            <p>Travel-Map 旅行地图相册</p>
            <p>版本: 1.0.0</p>
            <p>一款管理本地旅行照片的桌面应用</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()

const resourcePath = ref('')
const theme = ref<'light' | 'dark'>('light')
const localAutoPlay = ref(true)
const autoPlayInterval = ref(5000)

onMounted(async () => {
  await settingsStore.loadSettings()
  resourcePath.value = settingsStore.resourcePath
  theme.value = settingsStore.theme
  localAutoPlay.value = settingsStore.autoPlay
  autoPlayInterval.value = settingsStore.autoPlayInterval
})

async function selectDirectory() {
  const path = await window.electronAPI.selectDirectory()
  if (path) {
    resourcePath.value = path
    await settingsStore.setResourcePath(path)
  }
}

async function setTheme(newTheme: 'light' | 'dark') {
  theme.value = newTheme
  await settingsStore.setTheme(newTheme)
}

async function updateAutoPlay() {
  await settingsStore.setAutoPlay(localAutoPlay.value)
}

async function updateAutoPlayInterval() {
  await settingsStore.setAutoPlayInterval(autoPlayInterval.value)
}

function goBack() {
  router.push('/')
}
</script>
