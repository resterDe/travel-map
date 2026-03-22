<template>
  <div class="flex flex-col h-screen">
    <header class="h-14 bg-white dark:bg-[#1B2838] border-b border-[var(--border-color)] flex items-center px-4 shadow-sm">
      <button @click="goBack" class="mr-4 p-1 hover:bg-[var(--bg-secondary)] rounded">
        <span class="text-xl">←</span>
      </button>
      <h1 class="text-lg font-semibold">{{ tripName }}</h1>
      <span class="ml-2 text-[var(--text-secondary)]">({{ totalCount }} 项)</span>
      
      <div class="ml-auto flex gap-2">
        <button v-if="tripPath" @click="openInExplorer" class="px-3 py-1 text-sm border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)]">
          在文件夹中显示
        </button>
      </div>
    </header>

    <div class="flex-1 flex">
      <div class="flex-1 flex items-center justify-center bg-black relative">
        <!-- Debug info -->
        <div class="absolute top-2 left-2 text-xs text-gray-500 z-10">
          路径: {{ tripPath }}
        </div>
        
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
          <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
        </div>
        
        <div v-else-if="currentMedia?.type === 'video'" class="w-full h-full flex items-center justify-center">
          <video ref="videoRef" :src="videoUrl" controls class="max-w-full max-h-full" @ended="onVideoEnded"></video>
        </div>
        
        <div v-else-if="currentMedia?.type === 'image'" class="w-full h-full flex items-center justify-center p-4">
          <img :src="imageUrl" :alt="currentMedia.filename" class="max-w-full max-h-full object-contain" />
        </div>
        
        <div v-else class="text-white">选择文件查看</div>
        
        <button v-if="media.length > 0" @click="prev" class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white">
          ‹
        </button>
        <button v-if="media.length > 0" @click="next" class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white">
          ›
        </button>
      </div>
      
      <div class="w-64 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] overflow-auto">
        <div v-if="loading" class="flex items-center justify-center p-4">
          <div class="animate-spin w-6 h-6 border-2 border-[var(--color-primary-light)] border-t-transparent rounded-full"></div>
        </div>
        <div v-else-if="media.length === 0" class="p-4 text-center text-[var(--text-secondary)]">
          暂无媒体文件
        </div>
        <div v-else class="p-2 grid gap-1">
          <div v-for="(item, index) in media" :key="index"
            @click="selectMedia(index)"
            :class="['aspect-square rounded cursor-pointer overflow-hidden border-2', currentIndex === index ? 'border-[var(--color-primary-light)]' : 'border-transparent']">
            <div v-if="item.type === 'video'" class="w-full h-full bg-gray-800 flex items-center justify-center relative">
              <span class="text-2xl">🎬</span>
              <div class="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-xs text-white">{{ item.format }}</div>
            </div>
            <img v-else :src="'file:///' + item.path.replace(/\\/g, '/')" :alt="item.name" class="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>

    <div class="h-12 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center px-4">
      <div class="flex gap-4 text-sm">
        <button @click="showImagesOnly = false; showVideosOnly = false" :class="['px-2 py-1 rounded', !showImagesOnly && !showVideosOnly ? 'bg-[var(--color-primary-light)] text-white' : '']">
          全部 ({{ media.length }})
        </button>
        <button @click="showImagesOnly = true; showVideosOnly = false" :class="['px-2 py-1 rounded', showImagesOnly ? 'bg-[var(--color-primary-light)] text-white' : '']">
          📷 图片 ({{ imageCount }})
        </button>
        <button @click="showVideosOnly = true; showImagesOnly = false" :class="['px-2 py-1 rounded', showVideosOnly ? 'bg-[var(--color-primary-light)] text-white' : '']">
          🎬 视频 ({{ videoCount }})
        </button>
      </div>
      
      <div class="ml-auto text-sm text-[var(--text-secondary)]">
        {{ media.length > 0 ? currentIndex + 1 : 0 }} / {{ filteredMedia.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()

const tripId = computed(() => {
  const id = route.params.tripId as string
  const num = parseInt(id)
  return isNaN(num) ? 0 : num
})
const tripPath = computed(() => route.query.path as string || '')
const tripName = computed(() => route.query.name as string || '旅行目录')

const media = ref<any[]>([])
const loading = ref(false)

const currentIndex = ref(0)
const autoPlay = ref(true)
const showImagesOnly = ref(false)
const showVideosOnly = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)

const filteredMedia = computed(() => {
  if (showImagesOnly.value) return media.value.filter(m => m.type === 'image')
  if (showVideosOnly.value) return media.value.filter(m => m.type === 'video')
  return media.value
})

const imageCount = computed(() => media.value.filter(m => m.type === 'image').length)
const videoCount = computed(() => media.value.filter(m => m.type === 'video').length)
const totalCount = computed(() => media.value.length)

const currentMedia = computed(() => filteredMedia.value[currentIndex.value] || null)

const imageUrl = computed(() => currentMedia.value ? 'file:///' + currentMedia.value.path.replace(/\\/g, '/') : '')
const videoUrl = computed(() => currentMedia.value ? 'file:///' + currentMedia.value.path.replace(/\\/g, '/') : '')

onMounted(async () => {
  autoPlay.value = settingsStore.autoPlay
  await loadMedia()
})

async function loadMedia() {
  loading.value = true
  console.log('Loading media, tripPath:', tripPath.value, 'tripId:', tripId.value)
  try {
    if (tripPath.value) {
      console.log('Scanning by path:', tripPath.value)
      // Direct scan by path
      media.value = await window.electronAPI.scanMediaByPath(tripPath.value)
      console.log('Found media:', media.value.length, 'items')
    } else if (!isNaN(tripId.value)) {
      // Scan by trip ID
      media.value = await window.electronAPI.scanTripDirectory(tripId.value)
      console.log('Found media by trip ID:', media.value.length, 'items')
    } else {
      console.log('No trip path or ID provided')
      media.value = []
    }
  } catch (e) {
    console.error('Failed to load media:', e)
    media.value = []
  } finally {
    loading.value = false
  }
}

function selectMedia(index: number) {
  currentIndex.value = index
  if (videoRef.value) {
    videoRef.value.load()
  }
}

function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = filteredMedia.value.length - 1
  }
}

function next() {
  if (currentIndex.value < filteredMedia.value.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
}

function onVideoEnded() {
  if (autoPlay.value) {
    next()
  }
}

function goBack() {
  router.go(-1)
}

function openInExplorer() {
  if (tripPath.value) {
    window.electronAPI.openInExplorer(tripPath.value)
  }
}

watch(showImagesOnly, (val) => {
  if (val) showVideosOnly.value = false
})

watch(showVideosOnly, (val) => {
  if (val) showImagesOnly.value = false
})
</script>
