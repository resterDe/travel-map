<template>
  <div :class="{ 'dark': isDark }" class="min-h-screen bg-[var(--bg-primary)]">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const isDark = ref(false)
const settingsStore = useSettingsStore()

onMounted(async () => {
  await settingsStore.loadSettings()
  isDark.value = settingsStore.theme === 'dark'
})
</script>
