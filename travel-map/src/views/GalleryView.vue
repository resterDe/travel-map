<template>
  <div class="flex flex-col h-screen">
    <header class="h-14 bg-white dark:bg-[#1B2838] border-b border-[var(--border-color)] flex items-center px-4 shadow-sm">
      <button @click="goBack" class="mr-4 p-1 hover:bg-[var(--bg-secondary)] rounded">
        <span class="text-xl">←</span>
      </button>
      <h1 class="text-lg font-semibold">{{ cityName }}</h1>
      <span class="ml-2 text-[var(--text-secondary)]">({{ totalCount }} 项)</span>
      
      <div class="ml-auto flex gap-2">
        <button v-if="hasDirectory" @click="openInExplorer" class="px-3 py-1 text-sm border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)]">
          在文件夹中显示
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-auto p-4">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="animate-spin w-8 h-8 border-2 border-[var(--color-primary-light)] border-t-transparent rounded-full"></div>
      </div>
      
      <div v-else-if="!hasDirectory" class="flex flex-col items-center justify-center h-full text-center">
        <div class="text-6xl mb-4">🗺️</div>
        <h2 class="text-xl font-semibold mb-2">{{ cityName }}</h2>
        <p class="text-[var(--text-secondary)] mb-2">还没有旅行目录</p>
        <p class="text-sm text-[var(--text-secondary)] mb-6">点击下方按钮创建第一个旅行目录，开始记录你的旅行回忆</p>
        <button @click="showCreateDialog = true" class="px-6 py-3 bg-[var(--color-primary-light)] text-white rounded-lg hover:opacity-90">
          创建第一个旅行目录
        </button>
      </div>
      
      <div v-else-if="trips.length === 0" class="flex flex-col items-center justify-center h-full text-center">
        <div class="text-4xl mb-4">📁</div>
        <p class="text-[var(--text-secondary)] mb-4">还没有旅行目录</p>
        <button @click="showCreateDialog = true" class="px-4 py-2 bg-[var(--color-primary-light)] text-white rounded-lg">
          创建第一个旅行目录
        </button>
      </div>
      
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="trip in trips" :key="trip.id" 
          @click="openTrip(trip)"
          class="bg-white dark:bg-[#1B2838] rounded-xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 border border-[var(--border-color)]">
          <div class="h-32 bg-gradient-to-br from-[var(--color-primary-light)] to-[#9B59B6] flex items-center justify-center">
            <span class="text-4xl">📸</span>
          </div>
          <div class="p-3">
            <h3 class="font-medium truncate">{{ trip.dirname }}</h3>
            <p class="text-sm text-[var(--text-secondary)]">{{ trip.trip_date }}</p>
            <div class="flex gap-3 mt-2 text-xs text-[var(--text-secondary)]">
              <span>📷 {{ trip.photo_count }}</span>
              <span>🎬 {{ trip.video_count }}</span>
            </div>
          </div>
        </div>
        
        <div @click="showCreateDialog = true"
          class="h-48 border-2 border-dashed border-[var(--border-color)] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-primary-light)] hover:bg-[var(--bg-secondary)] transition-colors">
          <span class="text-3xl mb-2">+</span>
          <span class="text-[var(--text-secondary)]">添加新目录</span>
        </div>
      </div>
    </div>

    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showCreateDialog = false">
      <div class="bg-white dark:bg-[#1B2838] rounded-2xl w-[520px] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-semibold mb-4">创建新旅行目录</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-[var(--text-secondary)] mb-1">目标城市</label>
            <p class="font-medium text-lg">{{ cityName }}</p>
          </div>
          
          <div>
            <label class="block text-sm text-[var(--text-secondary)] mb-1">出发地点 *</label>
            <div class="relative">
              <input 
                v-model="departureSearch" 
                type="text" 
                placeholder="搜索城市..." 
                class="w-full h-11 px-3 border border-[var(--border-color)] rounded-lg dark:bg-[#0D1B2A] dark:border-[#2A3A4D]"
                @focus="showDepartureList = true"
                @blur="handleDepartureBlur"
              />
              <div v-if="showDepartureList && filteredDepartureCities.length > 0" 
                class="absolute z-10 w-full mt-1 bg-white dark:bg-[#1B2838] border border-[var(--border-color)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div v-for="city in filteredDepartureCities" 
                  :key="city"
                  @mousedown="selectDepartureCity(city)"
                  class="px-3 py-2 hover:bg-[var(--bg-secondary)] cursor-pointer">
                  {{ city }}
                </div>
              </div>
            </div>
            <p v-if="newTrip.departureCity" class="text-sm text-[var(--color-primary-light)] mt-1">
              已选择: {{ newTrip.departureCity }}
            </p>
          </div>
          
          <div>
            <label class="block text-sm text-[var(--text-secondary)] mb-1">目录备注 *</label>
            <input v-model="newTrip.dirname" type="text" placeholder="如：雷州一日游" 
              class="w-full h-11 px-3 border border-[var(--border-color)] rounded-lg dark:bg-[#0D1B2A] dark:border-[#2A3A4D]" />
          </div>
          
          <div>
            <label class="block text-sm text-[var(--text-secondary)] mb-1">旅行日期 *</label>
            <input v-model="newTrip.tripDate" type="date" 
              class="w-full h-11 px-3 border border-[var(--border-color)] rounded-lg dark:bg-[#0D1B2A] dark:border-[#2A3A4D]" />
          </div>
          
          <div>
            <label class="block text-sm text-[var(--text-secondary)] mb-1">描述</label>
            <input v-model="newTrip.description" type="text" placeholder="如：探索雷州古城" 
              class="w-full h-11 px-3 border border-[var(--border-color)] rounded-lg dark:bg-[#0D1B2A] dark:border-[#2A3A4D]" />
          </div>
          
          <div class="p-3 bg-[var(--bg-secondary)] rounded-lg">
            <p class="text-sm text-[var(--text-secondary)]">预览目录名：</p>
            <p class="text-[var(--text-secondary)] italic">{{ previewFolderName }}</p>
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showCreateDialog = false" class="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)]">取消</button>
          <button @click="handleCreateTrip" :disabled="!newTrip.dirname || !newTrip.tripDate"
            class="px-4 py-2 bg-[var(--color-primary-light)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGalleryStore } from '@/stores/gallery'
import type { Trip } from '@/types'

const route = useRoute()
const router = useRouter()
const galleryStore = useGalleryStore()

const cityId = computed(() => {
  const id = route.params.cityId as string
  const num = parseInt(id)
  return isNaN(num) ? id : num
})

const cityName = computed(() => {
  const id = route.params.cityId as string
  const num = parseInt(id)
  return isNaN(num) ? decodeURIComponent(id) : (galleryStore.currentCity?.name || '未知城市')
})

const trips = computed(() => galleryStore.trips)
const loading = computed(() => galleryStore.loading)
const hasDirectory = computed(() => galleryStore.hasDirectory)

const showCreateDialog = ref(false)
const newTrip = ref({
  dirname: '',
  tripDate: '',
  description: '',
  departureCity: ''
})

const departureSearch = ref('')
const showDepartureList = ref(false)

const allCities = [
  '北京', '上海', '天津', '重庆',
  '广州', '深圳', '珠海', '佛山', '东莞', '中山', '江门', '肇庆', '惠州', '汕头', '潮州', '揭阳', '汕尾', '韶关', '清远', '梅州', '河源', '阳江', '茂名', '湛江',
  '海口', '三亚', '南宁', '柳州', '桂林', '北海',
  '长沙', '株洲', '湘潭', '衡阳', '岳阳', '常德', '张家界', '宜昌', '襄阳', '荆州',
  '武汉', '南昌', '九江', '赣州', '上饶', '抚州',
  '杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水',
  '南京', '苏州', '无锡', '常州', '镇江', '扬州', '泰州', '南通', '盐城', '淮安', '连云港', '徐州', '宿迁',
  '福州', '厦门', '泉州', '漳州', '莆田', '宁德', '三明', '南平', '龙岩',
  '济南', '青岛', '烟台', '威海', '潍坊', '淄博', '临沂', '济宁', '泰安', '德州', '聊城', '滨州', '菏泽', '枣庄', '东营', '日照',
  '沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口',
  '长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边',
  '哈尔滨', '齐齐哈尔', '牡丹江', '佳木斯', '大庆', '鸡西', '双鸭山', '伊春', '七台河', '鹤岗', '黑河', '绥化', '大兴安岭',
  '郑州', '洛阳', '开封', '南阳', '新乡', '安阳', '焦作', '许昌', '平顶山', '商丘', '周口', '信阳', '驻马店', '濮阳', '三门峡', '漯河', '鹤壁', '济源',
  '太原', '大同', '朔州', '忻州', '阳泉', '晋中', '长治', '晋城', '临汾', '运城', '吕梁',
  '石家庄', '保定', '唐山', '廊坊', '邯郸', '秦皇岛', '沧州', '邢台', '衡水', '张家口', '承德',
  '贵阳', '昆明', '拉萨',
  '兰州', '西宁', '银川', '乌鲁木齐', '呼和浩特'
]

const filteredDepartureCities = computed(() => {
  if (!departureSearch.value) return allCities.slice(0, 20)
  const search = departureSearch.value.toLowerCase()
  return allCities.filter(city => city.toLowerCase().includes(search)).slice(0, 20)
})

function selectDepartureCity(city: string) {
  newTrip.value.departureCity = city
  departureSearch.value = city
  showDepartureList.value = false
}

function handleDepartureBlur() {
  setTimeout(() => {
    showDepartureList.value = false
  }, 200)
}

const totalCount = computed(() => {
  return trips.value.reduce((sum, t) => sum + t.photo_count + t.video_count, 0)
})

const previewFolderName = computed(() => {
  const parts = [newTrip.value.dirname, newTrip.value.tripDate, newTrip.value.description]
  return parts.filter(p => p).join('_')
})

onMounted(async () => {
  const id = cityId.value
  if (typeof id === 'number') {
    await galleryStore.loadTrips(id)
  } else {
    // For new cities, load trips by name
    await galleryStore.loadTripsByName(id)
  }
})

function goBack() {
  router.push('/')
}

function openTrip(trip: Trip) {
  // Navigate with path and name as query params
  router.push({
    path: `/carousel/${trip.id || 0}`,
    query: { 
      path: trip.full_path || '',
      name: trip.dirname || '旅行目录'
    }
  })
}

async function handleCreateTrip() {
  if (!newTrip.value.dirname || !newTrip.value.tripDate) return
  
  const city = cityName.value
  const dirname = newTrip.value.dirname
  const tripDate = newTrip.value.tripDate
  const description = newTrip.value.description || ''
  const departureCity = newTrip.value.departureCity || ''
  
  // 先创建目录
  try {
    // 使用原生 fetch 调用，避免 IPC 问题
    const result = await window.electronAPI.createTripByName(city, dirname, tripDate, description, departureCity)
    
    if (result && result.folderName) {
      alert('创建成功！目录: ' + result.folderName)
      showCreateDialog.value = false
      newTrip.value = { dirname: '', tripDate: '', description: '', departureCity: '' }
      departureSearch.value = ''
      
      // Reload trips
      await galleryStore.loadTripsByName(city)
    }
  } catch (e) {
    console.error('创建失败:', e)
    alert('创建失败，请重试')
  }
}

function openInExplorer() {
  const currentTrip = trips.value[0]
  if (currentTrip) {
    const path = currentTrip.full_path || currentTrip.fullPath
    if (path) {
      window.electronAPI.openInExplorer(path)
    }
  }
}
</script>
