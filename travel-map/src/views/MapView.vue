<template>
  <div class="flex flex-col h-screen">
    <header class="h-14 bg-white dark:bg-[#1B2838] border-b border-[var(--border-color)] flex items-center px-4 shadow-sm z-10">
      <div class="flex items-center gap-2">
        <span class="text-xl">🗺️</span>
        <span class="font-semibold text-[var(--color-primary)] dark:text-white">Travel-Map</span>
      </div>
      <nav class="ml-8 flex gap-4">
        <router-link to="/" class="px-3 py-1 text-[var(--color-primary-light)] border-b-2 border-[var(--color-primary-light)]">地图</router-link>
        <router-link to="/settings" class="px-3 py-1 text-[var(--text-secondary)] hover:text-[var(--color-primary-light)]">设置</router-link>
      </nav>
      <div class="ml-auto flex gap-2 items-center">
        <select v-model="vehicleType" @change="refreshTravelLines" class="px-2 py-1 text-sm border border-[var(--border-color)] rounded-lg bg-white dark:bg-[#1B2838]">
          <option value="none">无动画</option>
          <option value="arrow">⬆️ 箭头</option>
          <option value="plane">✈️ 飞机</option>
          <option value="train">🚄 高铁</option>
        </select>
        <select v-model="vehicleCount" @change="refreshTravelLines" class="px-2 py-1 text-sm border border-[var(--border-color)] rounded-lg bg-white dark:bg-[#1B2838]">
          <option :value="1">1个</option>
          <option :value="2">2个</option>
          <option :value="3">3个</option>
          <option :value="5">5个</option>
        </select>
        <select v-model="lineStyle" @change="refreshTravelLines" class="px-2 py-1 text-sm border border-[var(--border-color)] rounded-lg bg-white dark:bg-[#1B2838]">
          <option value="solid">实线</option>
          <option value="dashed">虚线</option>
          <option value="dotted">点线</option>
        </select>
        <button @click="refreshTravelLines" :disabled="syncing" class="px-3 py-1 text-sm border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)]">
          🔄 刷新线路
        </button>
        <button @click="syncData" :disabled="syncing" class="px-3 py-1 text-sm bg-[var(--color-primary-light)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
          {{ syncing ? '同步中...' : '🔄 同步数据' }}
        </button>
      </div>
    </header>

    <!-- 同步通知 -->
    <div v-if="syncMessage" class="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1B2838] shadow-lg rounded-lg px-4 py-3 flex items-center gap-3">
      <span>{{ syncMessage }}</span>
      <button @click="syncMessage = ''" class="text-gray-500 hover:text-gray-700">✕</button>
    </div>

    <main class="flex-1 relative">
      <div id="map" class="absolute inset-0 z-0"></div>
      
      <!-- 城市列表侧边栏 -->
      <div class="absolute right-4 top-4 bottom-4 w-64 bg-white/40 dark:bg-[#1B2838]/40 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden flex flex-col z-20">
        <div class="p-3 border-b border-[var(--border-color)]">
          <h3 class="font-semibold">已记录城市</h3>
          <p class="text-xs text-[var(--text-secondary)]">点击定位到城市</p>
        </div>
        <div class="flex-1 overflow-auto p-2">
          <div v-if="recordedCities.length === 0" class="text-center text-[var(--text-secondary)] text-sm py-4">
            暂无记录的城市
          </div>
          <div v-else class="space-y-1">
            <div v-for="city in recordedCities" :key="city.name"
              @click="panToCity(city)"
              class="p-2 rounded-lg hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors">
              <div class="font-medium">{{ city.name }}</div>
              <div class="text-xs text-[var(--text-secondary)]">
                {{ city.photoCount || 0 }} 张照片 · {{ city.tripCount || 0 }} 个行程
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/50">
        <div class="text-center">
          <div class="animate-spin w-8 h-8 border-2 border-[var(--color-primary-light)] border-t-transparent rounded-full mx-auto mb-2"></div>
          <p class="text-[var(--text-secondary)]">加载中...</p>
        </div>
      </div>
    </main>

    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showCreateDialog = false">
      <div class="bg-white dark:bg-[#1B2838] rounded-2xl w-[520px] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-semibold mb-4">创建新旅行目录</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-[var(--text-secondary)] mb-1">目标城市</label>
            <p class="font-medium text-lg">{{ selectedCityData?.name }}</p>
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
                  @click="selectDepartureCity(city)"
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
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMapStore } from '@/stores/map'
import { useGalleryStore } from '@/stores/gallery'

const router = useRouter()
const mapStore = useMapStore()
const galleryStore = useGalleryStore()

const loading = ref(true)
const syncing = ref(false)
const syncMessage = ref('')
const map = ref<any>(null)
const showCreateDialog = ref(false)
const selectedCityData = ref<any>(null)
const geoJsonLayer = ref<any>(null)
const travelLineLayers = ref<any[]>([])
const movingMarkers = ref<any[]>([])

const newTrip = ref({
  dirname: '',
  tripDate: '',
  description: '',
  departureCity: ''
})

const departureSearch = ref('')
const showDepartureList = ref(false)
const lineStyle = ref('dashed')
const vehicleType = ref('none')  // none, plane, train, arrow
const vehicleCount = ref(3)  // Number of vehicles (1-5)

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
  '兰州', '西宁', '银川', '乌鲁木齐', '呼和浩特',
  // 海外城市
  '东京', '大阪', '京都', '首尔',
  '曼谷', '清迈', '普吉', '新加坡',
  '巴厘岛', '雅加达', '吉隆坡',
  '马尼拉', '胡志明', '河内',
  '悉尼', '墨尔本', '布里斯班',
  '奥克兰', '皇后镇',
  '伦敦', '巴黎', '罗马',
  '巴塞罗那', '阿姆斯特丹', '慕尼黑',
  '柏林', '威尼斯', '米兰',
  '莫斯科', '伊斯坦布尔', '迪拜',
  '开罗', '约翰内斯堡', '开普敦',
  '纽约', '洛杉矶', '旧金山',
  '芝加哥', '华盛顿', '波士顿',
  '西雅图', '拉斯维加斯', '迈阿密',
  '多伦多', '温哥华', '蒙特利尔',
  '墨西哥城', '里约热内卢', '圣保罗',
  '布宜诺斯艾利斯', '利马', '圣地亚哥'
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

function handleClickOutside() {
  showDepartureList.value = false
}

function handleDepartureBlur() {
  setTimeout(() => {
    showDepartureList.value = false
  }, 200)
}

const previewFolderName = computed(() => {
  const parts = [newTrip.value.dirname, newTrip.value.tripDate, newTrip.value.description]
  return parts.filter(p => p).join('_')
})

// 已记录的城市列表 - 显示所有有行程的城市
const recordedCities = computed(() => {
  return mapStore.cityData.map(city => ({
    name: city.name,
    photoCount: city.photoCount,
    tripCount: city.trips?.length || 0,
    coords: getCityCoords(city.name)
  })).filter(c => c.tripCount > 0 || c.photoCount > 0 || c.coords !== null)
})

function getCityCoords(cityName: string): [number, number] | null {
  const coords: Record<string, [number, number]> = {
    '北京': [39.9, 116.4], '上海': [31.2, 121.5], '天津': [39.1, 117.2], '重庆': [29.6, 106.5],
    '广州': [23.1, 113.3], '深圳': [22.5, 114.1], '珠海': [22.3, 113.5], '佛山': [23.0, 113.1],
    '东莞': [23.0, 113.7], '中山': [22.5, 113.4], '江门': [22.6, 113.1], '肇庆': [23.0, 112.5],
    '惠州': [23.1, 114.4], '汕头': [23.4, 116.7], '潮州': [23.7, 116.6], '揭阳': [23.6, 116.4],
    '汕尾': [22.8, 115.4], '韶关': [24.8, 113.6], '清远': [23.7, 113.1], '梅州': [24.3, 116.1],
    '河源': [23.7, 114.7], '阳江': [21.9, 111.9], '茂名': [21.7, 110.9], '湛江': [21.2, 110.4],
    '海口': [20.0, 110.3], '三亚': [18.3, 109.5], '南宁': [22.8, 108.3], '柳州': [24.3, 109.4],
    '桂林': [25.3, 110.2], '北海': [21.5, 109.1], '长沙': [28.2, 112.9], '武汉': [30.6, 114.3],
    '杭州': [30.3, 120.2], '南京': [32.1, 118.8], '成都': [30.6, 104.1], '西安': [34.3, 108.9],
    '郑州': [34.7, 113.6], '济南': [36.7, 117.0], '青岛': [36.1, 120.4], '沈阳': [41.8, 123.4],
    '大连': [39.0, 121.6], '长春': [43.9, 125.3], '哈尔滨': [45.8, 126.5], '福州': [26.1, 119.3],
    '厦门': [24.5, 118.1], '南昌': [28.7, 115.9], '贵阳': [26.6, 106.6], '昆明': [25.0, 102.7],
    '兰州': [36.0, 103.8], '乌鲁木齐': [43.8, 87.6], '太原': [37.9, 112.5], '石家庄': [38.0, 114.5],
    '株洲': [27.8, 113.1], '湘潭': [27.8, 112.9], '衡阳': [26.9, 112.6], '岳阳': [29.4, 113.1],
    '常德': [29.0, 111.7], '张家界': [29.1, 110.5], '宜昌': [30.7, 111.3], '襄阳': [32.0, 112.1],
    '荆州': [30.3, 112.2], '九江': [29.7, 116.0], '赣州': [25.8, 114.9], '上饶': [28.4, 117.9],
    '抚州': [27.9, 116.3], '宁波': [29.9, 121.6], '温州': [28.0, 120.7], '嘉兴': [30.8, 120.8],
    '湖州': [30.9, 120.1], '绍兴': [30.0, 120.6], '金华': [29.1, 119.6], '衢州': [28.9, 118.9],
    '舟山': [30.0, 122.1], '台州': [28.7, 121.4], '丽水': [28.5, 119.9], '苏州': [31.3, 120.6],
    '无锡': [31.5, 120.3], '常州': [31.8, 119.9], '镇江': [32.2, 119.5], '扬州': [32.4, 119.4],
    '泰州': [32.5, 119.9], '南通': [32.0, 120.9], '盐城': [33.4, 120.1], '淮安': [33.6, 119.0],
    '连云港': [34.6, 119.2], '徐州': [34.2, 117.2], '宿迁': [33.9, 118.3], '泉州': [24.9, 118.7],
    '漳州': [24.5, 117.6], '莆田': [25.5, 119.0], '宁德': [26.7, 119.5], '三明': [26.3, 117.6],
    '南平': [26.6, 118.2], '龙岩': [25.1, 117.0], '烟台': [37.5, 121.4], '威海': [37.5, 122.1],
    '潍坊': [36.7, 119.2], '淄博': [36.8, 118.1], '临沂': [35.1, 118.4], '济宁': [35.4, 116.6],
    '泰安': [36.2, 117.1], '德州': [37.4, 116.4], '聊城': [36.5, 115.9], '滨州': [37.4, 117.9],
    '菏泽': [35.2, 115.5], '枣庄': [34.8, 117.3], '东营': [37.4, 118.7], '日照': [35.4, 119.5],
    '鞍山': [41.1, 122.9], '抚顺': [41.9, 123.9], '本溪': [41.3, 123.7], '丹东': [40.0, 124.4],
    '锦州': [41.1, 121.1], '营口': [40.7, 122.2], '吉林': [43.8, 126.6], '四平': [43.2, 124.4],
    '辽源': [42.9, 125.1], '通化': [41.7, 125.9], '白山': [41.9, 126.4], '松原': [45.1, 124.8],
    '白城': [45.6, 122.8], '延边': [42.9, 129.5], '齐齐哈尔': [47.4, 123.9], '牡丹江': [44.6, 129.6],
    '佳木斯': [46.8, 130.3], '大庆': [46.6, 125.0], '鸡西': [45.3, 130.9], '洛阳': [34.6, 112.4],
    '开封': [34.9, 114.3], '南阳': [33.0, 112.5], '新乡': [35.3, 113.9], '安阳': [36.1, 114.4],
    '焦作': [35.2, 113.2], '许昌': [34.0, 113.8], '平顶山': [33.8, 113.2], '商丘': [34.4, 115.7],
    '周口': [33.6, 114.7], '信阳': [32.1, 114.1], '大同': [40.1, 113.3], '保定': [38.9, 115.5],
    '唐山': [39.6, 118.2], '廊坊': [39.5, 116.7], '邯郸': [36.6, 114.5], '秦皇岛': [39.9, 119.6],
    '沧州': [38.3, 116.9], '拉萨': [29.7, 91.1], '西宁': [36.6, 101.8], '银川': [38.5, 106.2],
    '呼和浩特': [40.8, 111.7],
    // 海外城市
    '东京': [35.6762, 139.6503], '大阪': [34.6937, 135.5023], '京都': [35.0116, 135.7681], '首尔': [37.5665, 126.978],
    '曼谷': [13.7563, 100.5018], '清迈': [18.7883, 98.9853], '普吉': [7.8804, 98.3923], '新加坡': [1.3521, 103.8198],
    '巴厘岛': [-8.3405, 115.0920], '雅加达': [-6.2088, 106.8456], '吉隆坡': [3.1390, 101.6869],
    '马尼拉': [14.5995, 120.9842], '胡志明': [10.8231, 106.6297], '河内': [21.0278, 105.8342],
    '悉尼': [-33.8688, 151.2093], '墨尔本': [-37.8136, 144.9631], '布里斯班': [-27.4698, 153.0251],
    '奥克兰': [-36.8485, 174.7633], '皇后镇': [-45.0312, 168.6626],
    '伦敦': [51.5074, -0.1278], '巴黎': [48.8566, 2.3522], '罗马': [41.9028, 12.4964],
    '巴塞罗那': [41.3851, 2.1734], '阿姆斯特丹': [52.3676, 4.9041], '慕尼黑': [48.1351, 11.5820],
    '柏林': [52.5200, 13.4050], '威尼斯': [45.4408, 12.3155], '米兰': [45.4642, 9.1900],
    '莫斯科': [55.7558, 37.6173], '伊斯坦布尔': [41.0082, 28.9784], '迪拜': [25.2048, 55.2708],
    '开罗': [30.0444, 31.2357], '约翰内斯堡': [-26.2041, 28.0473], '开普敦': [-33.9249, 18.4241],
    '纽约': [40.7128, -74.0060], '洛杉矶': [34.0522, -118.2437], '旧金山': [37.7749, -122.4194],
    '芝加哥': [41.8781, -87.6298], '华盛顿': [38.9072, -77.0369], '波士顿': [42.3601, -71.0589],
    '西雅图': [47.6062, -122.3321], '拉斯维加斯': [36.1699, -115.1398], '迈阿密': [25.7617, -80.1918],
    '多伦多': [43.6532, -79.3832], '温哥华': [49.2827, -123.1207], '蒙特利尔': [45.5017, -73.5673],
    '墨西哥城': [19.4326, -99.1332], '里约热内卢': [-22.9068, -43.1729], '圣保罗': [-23.5505, -46.6333],
    '布宜诺斯艾利斯': [-34.6037, -58.3816], '利马': [-12.0464, -77.0428], '圣地亚哥': [-33.4489, -70.6693]
  }
  // 去掉"市"后缀再查找
  const city = cityName.replace('市', '')
  return coords[city] || null
}

// 生成曲线路径点（大圆航线）
function getCurvedPath(start: [number, number], end: [number, number], numPoints: number = 50): [number, number][] {
  const points: [number, number][] = []
  const lat1 = start[0] * Math.PI / 180
  const lng1 = start[1] * Math.PI / 180
  const lat2 = end[0] * Math.PI / 180
  const lng2 = end[1] * Math.PI / 180
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints
    const A = Math.sin((1 - f) * lat1) / Math.sin(lat2 - lat1)
    const B = Math.sin(f * lat1) / Math.sin(lat2 - lat1)
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2)
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI
    const lng = Math.atan2(y, x) * 180 / Math.PI
    points.push([lat, lng])
  }
  return points
}

function panToCity(city: { name: string, coords: [number, number] | null }) {
  if (map.value && city.coords && city.coords[0] && city.coords[1]) {
    try {
      map.value.setView(city.coords, 10, { animate: false })
    } catch (e) {
      console.error('Pan to city error:', e)
    }
  }
}

async function syncData() {
  syncing.value = true
  syncMessage.value = ''
  try {
    const result = await window.electronAPI.syncData()
    console.log('Sync result:', result)
    
    let message = ''
    if (result.removedTrips.length > 0) {
      message += `删除 ${result.removedTrips.length} 个行程; `
    }
    if (result.addedTrips.length > 0) {
      message += `新增 ${result.addedTrips.length} 个行程; `
    }
    if (result.removedCities.length > 0) {
      message += `删除 ${result.removedCities.length} 个城市; `
    }
    if (result.errors.length > 0) {
      message += `错误: ${result.errors.length} 个`
    }
    
    if (message === '') {
      message = '数据已是最新状态'
    }
    
    syncMessage.value = message
    
    // Refresh the data
    await mapStore.scanDirectory()
  } catch (e) {
    console.error('Sync error:', e)
    syncMessage.value = '同步失败: ' + String(e)
  } finally {
    syncing.value = false
    // Auto hide message after 5 seconds
    setTimeout(() => {
      syncMessage.value = ''
    }, 5000)
  }
}

onMounted(async () => {
  // Initial sync check
  await syncData()
  
  await mapStore.loadCities()
  await mapStore.scanDirectory()
  loading.value = false
  
  setTimeout(initMap, 100)
})

function initMap() {
  try {
    const mapContainer = document.getElementById('map')
    if (!mapContainer) {
      console.error('Map container not found')
      return
    }
    
    map.value = L.map('map', {
      center: [35, 105],
      zoom: 4,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: false
    })

    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      subdomains: '1234'
    }).addTo(map.value)

    L.control.zoom({ position: 'bottomright' }).addTo(map.value)

    L.control.attribution({ position: 'bottomright', prefix: '' }).addTo(map.value)
      .addAttribution('&copy; 高德地图')

    loadPrefectureBoundaries()
    loadTravelLines()
  } catch (e) {
    console.error('Map init error:', e)
  }
}

async function loadPrefectureBoundaries() {
  try {
    const response = await fetch('https://unpkg.com/cn-atlas/prefectures.json')
    const geojson = await response.json()
    
    const cityNamesSet = new Set<string>()
    recordedCities.value.forEach(c => {
      cityNamesSet.add(c.name)
      cityNamesSet.add(c.name.replace('市', ''))
    })
    
    L.geoJSON(geojson, {
      style: (feature: any) => {
        const cityNameRaw = feature.properties['地名'] || feature.properties.name || ''
        const cityName = cityNameRaw.replace('市', '').replace('地区', '').replace('盟', '').replace('自治州', '')
        const hasData = cityNamesSet.has(cityName) || cityNamesSet.has(cityNameRaw)
        
        return {
          fillColor: hasData ? '#22C55E' : '#E5E7EB',
          fillOpacity: hasData ? 0.6 : 0.15,
          color: hasData ? '#16A34A' : '#D1D5DB',
          weight: hasData ? 1.5 : 0.5,
          opacity: 1
        }
      },
      onEachFeature: (feature: any, layer: any) => {
        const cityNameRaw = feature.properties['地名'] || feature.properties.name || ''
        const cityName = cityNameRaw.replace('市', '').replace('地区', '').replace('盟', '').replace('自治州', '')
        
        let cityData: any = null
        let hasData = false
        for (const c of recordedCities.value) {
          if (c.name === cityName || c.name === cityNameRaw || c.name.replace('市', '') === cityName) {
            cityData = mapStore.getCityByName(c.name)
            hasData = cityData && (cityData.photoCount > 0 || (cityData.trips && cityData.trips.length > 0))
            break
          }
        }
        
        layer.on({
          mouseover: (e: any) => {
            e.target.setStyle({
              weight: 2.5,
              fillOpacity: 0.75
            })
          },
          mouseout: (e: any) => {
            const cn = feature.properties['地名'] || feature.properties.name || ''
            const cityN = cn.replace('市', '').replace('地区', '').replace('盟', '').replace('自治州', '')
            const h = cityNamesSet.has(cityN) || cityNamesSet.has(cn)
            e.target.setStyle({
              fillColor: h ? '#22C55E' : '#E5E7EB',
              fillOpacity: h ? 0.6 : 0.15,
              color: h ? '#16A34A' : '#D1D5DB',
              weight: h ? 1.5 : 0.5
            })
          },
          click: () => {
            handleCityClick(cityNameRaw)
          }
        })
        
        const tooltipText = cityNameRaw + (hasData && cityData ? ` (${cityData.photoCount}张)` : '')
        layer.bindTooltip(tooltipText, {
          direction: 'top',
          sticky: true
        })
      }
    }).addTo(map.value)
  } catch (e) {
    console.error('Failed to load prefecture boundaries:', e)
  }
}

async function loadTravelLines() {
  try {
    if (!map.value) {
      console.log('Map not ready')
      return
    }
    
    // 清除之前的线条和标记
    travelLineLayers.value.forEach(layer => {
      try { map.value.removeLayer(layer) } catch(e) {}
    })
    travelLineLayers.value = []
    movingMarkers.value.forEach(marker => {
      try { map.value.removeLayer(marker) } catch(e) {}
    })
    movingMarkers.value = []
    
    const allTrips = await window.electronAPI.getAllTrips()
    console.log('All trips:', allTrips)
    
    if (!allTrips || allTrips.length === 0) {
      console.log('No trips found')
      return
    }
    
    const departureCoords: Record<string, [number, number]> = {}
    recordedCities.value.forEach(city => {
      const coords = getCityCoords(city.name)
      if (coords) {
        departureCoords[city.name] = coords
        departureCoords[city.name.replace('市', '')] = coords
      }
    })
    
    console.log('Departure coords:', departureCoords)
    
    const drawnLines = new Set<string>()
    let lineCount = 0
    
    for (const trip of allTrips) {
      console.log('Trip:', trip.departure_city, trip.city_name)
      
      if (trip.departure_city && trip.city_name) {
        const departureCity = trip.departure_city.replace('市', '').trim()
        const targetCity = trip.city_name.replace('市', '').trim()
        
        console.log('Looking for coords:', departureCity, targetCity)
        
        const depCoords = departureCoords[departureCity] || getCityCoords(departureCity)
        const targetCoords = departureCoords[targetCity] || getCityCoords(targetCity)
        
        console.log('Coords found:', depCoords, targetCoords)
        
        if (depCoords && targetCoords) {
          const lineKey = [departureCity, targetCity].sort().join('-')
          if (!drawnLines.has(lineKey)) {
            drawnLines.add(lineKey)
            
            // 根据选择设置线条样式
            let dashArray = null
            if (lineStyle.value === 'dashed') {
              dashArray = '10, 10'
            } else if (lineStyle.value === 'dotted') {
              dashArray = '2, 6'
            }
            
            try {
              // 绘制底线条
              const line = L.polyline([depCoords, targetCoords], {
                color: '#3B82F6',
                weight: 3,
                opacity: 0.3,
                dashArray: dashArray,
                lineCap: 'round'
              }).addTo(map.value)
              travelLineLayers.value.push(line)
              
              // 使用曲线路径
              const curvedPath = getCurvedPath(depCoords, targetCoords, 50)
              
              // 绘制曲线路径线条
              const animLine = L.polyline(curvedPath, {
                color: '#3B82F6',
                weight: 2,
                opacity: 1,
                dashArray: dashArray || '10, 10',
                lineCap: 'round'
              }).addTo(map.value)
              travelLineLayers.value.push(animLine)
              
              // 添加流动动画
              if (lineStyle.value !== 'solid') {
                let dashOffset = 0
                const animateFlow = () => {
                  dashOffset = (dashOffset + 1) % 20
                  const pathEl = animLine as any
                  if (pathEl._path) {
                    pathEl._path.style.strokeDashoffset = dashOffset.toString()
                  }
                  requestAnimationFrame(animateFlow)
                }
                animateFlow()
              }
              
              // 添加箭头动画（伪3D大箭头）- 沿曲线路径
              if (vehicleType.value === 'arrow') {
                const arrowIcon = L.divIcon({
                  html: `
                    <div style="
                      width: 0; 
                      height: 0; 
                      border-left: 14px solid transparent;
                      border-right: 14px solid transparent;
                      border-bottom: 24px solid #3B82F6;
                      filter: drop-shadow(0 3px 4px rgba(0,0,0,0.4));
                    "></div>
                  `,
                  className: 'arrow-marker',
                  iconSize: [28, 28],
                  iconAnchor: [14, 14]
                })
                
                // 创建多个箭头沿曲线路径移动
                for (let i = 0; i < vehicleCount.value; i++) {
                  const offset = i / vehicleCount.value
                  const marker = L.marker(curvedPath[0], { icon: arrowIcon }).addTo(map.value)
                  marker.bindTooltip(`${departureCity} → ${targetCity}`, { direction: 'top' })
                  movingMarkers.value.push(marker)
                  
                  let progress = offset
                  const animate = () => {
                    progress += 0.003
                    if (progress > 1) progress = 0
                    
                    const idx = Math.floor(progress * (curvedPath.length - 1))
                    const nextIdx = Math.min(idx + 1, curvedPath.length - 1)
                    const lat = curvedPath[idx][0]
                    const lng = curvedPath[idx][1]
                    
                    marker.setLatLng([lat, lng])
                    
                    // 计算切线角度
                    if (nextIdx > idx) {
                      const nextLat = curvedPath[nextIdx][0]
                      const nextLng = curvedPath[nextIdx][1]
                      const angle = Math.atan2(nextLat - lat, nextLng - lng) * 180 / Math.PI + 90
                      const iconEl = marker.getElement()?.querySelector('div') as HTMLElement
                      if (iconEl) {
                        iconEl.style.transform = `rotate(${angle}deg)`
                      }
                    }
                    
                    requestAnimationFrame(animate)
                  }
                  setTimeout(() => animate(), i * (1500 / vehicleCount.value))
                }
              }
              
              // 添加飞机或高铁动画 - 沿曲线路径
              if (vehicleType.value === 'plane' || vehicleType.value === 'train') {
                const iconEmoji = vehicleType.value === 'plane' ? '✈️' : '🚄'
                const vehicleIcon = L.divIcon({
                  html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">${iconEmoji}</div>`,
                  className: 'vehicle-marker',
                  iconSize: [28, 28],
                  iconAnchor: [14, 14]
                })
                
                // 创建多个交通工具沿曲线路径移动
                for (let i = 0; i < vehicleCount.value; i++) {
                  const offset = i / vehicleCount.value
                  const marker = L.marker(curvedPath[0], { icon: vehicleIcon }).addTo(map.value)
                  marker.bindTooltip(`${departureCity} → ${targetCity}`, { direction: 'top' })
                  movingMarkers.value.push(marker)
                  
                  let progress = offset
                  const animate = () => {
                    progress += 0.003
                    if (progress > 1) progress = 0
                    
                    const idx = Math.floor(progress * (curvedPath.length - 1))
                    const nextIdx = Math.min(idx + 1, curvedPath.length - 1)
                    const lat = curvedPath[idx][0]
                    const lng = curvedPath[idx][1]
                    
                    marker.setLatLng([lat, lng])
                    
                    // 根据方向旋转图标
                    if (nextIdx > idx) {
                      const nextLat = curvedPath[nextIdx][0]
                      const nextLng = curvedPath[nextIdx][1]
                      const angle = Math.atan2(nextLat - lat, nextLng - lng) * 180 / Math.PI
                      const iconEl = marker.getElement()?.querySelector('div') as HTMLElement
                      if (iconEl) {
                        iconEl.style.transform = `rotate(${angle}deg)`
                      }
                    }
                    
                    requestAnimationFrame(animate)
                  }
                  // 间隔启动动画
                  setTimeout(() => animate(), i * (1500 / vehicleCount.value))
                }
              }
              
              lineCount++
            } catch (e) {
              console.error('Error drawing line:', e)
            }
          }
        }
      }
    }
    console.log('Lines drawn:', lineCount)
  } catch (e) {
    console.error('Failed to load travel lines:', e)
  }
}

async function refreshTravelLines() {
  // Clear existing lines if any (would need to track them)
  // For now, just reload
  if (map.value) {
    await mapStore.scanDirectory()
    await loadTravelLines()
  }
}

function handleCityClick(cityName: string) {
  // 尝试带"市"后缀和不带"市"后缀两种情况
  const cityNameWithSuffix = cityName.endsWith('市') ? cityName : cityName + '市'
  const cityNameWithoutSuffix = cityName.endsWith('市') ? cityName.slice(0, -1) : cityName
  
  // 优先使用不带"市"的目录名
  const dirName = cityNameWithoutSuffix
  
  // 优先匹配数据库中带"市"的城市
  const city = mapStore.cities.find(c => c.name === cityNameWithSuffix || c.name === cityNameWithoutSuffix || c.name === cityName)
  
  if (city) {
    router.push(`/gallery/${city.id}`)
  } else {
    // 如果数据库中没有这个城市，使用城市名跳转（不带"市"以匹配目录）
    router.push(`/gallery/${encodeURIComponent(dirName)}`)
  }
}

function getDefaultCityCoords(cityName: string): { lat: number, lng: number } {
  const coords: Record<string, { lat: number, lng: number }> = {
    '北京市': { lat: 39.9, lng: 116.4 },
    '上海市': { lat: 31.2, lng: 121.5 },
    '天津市': { lat: 39.1, lng: 117.2 },
    '重庆市': { lat: 29.6, lng: 106.5 },
    '广州市': { lat: 23.1, lng: 113.3 },
    '深圳市': { lat: 22.5, lng: 114.1 },
    '成都市': { lat: 30.6, lng: 104.1 },
    '杭州市': { lat: 30.3, lng: 120.2 },
    '西安市': { lat: 34.3, lng: 108.9 },
    '武汉市': { lat: 30.6, lng: 114.3 },
    '南京市': { lat: 32.1, lng: 118.8 },
    '湛江市': { lat: 21.2, lng: 110.4 }
  }
  return coords[cityName] || { lat: 35, lng: 105 }
}

async function handleCreateTrip() {
  if (!newTrip.value.dirname || !newTrip.value.tripDate || !selectedCityData.value) return
  
  try {
    const result = await window.electronAPI.createTripByName(
      selectedCityData.value.name,
      newTrip.value.dirname,
      newTrip.value.tripDate,
      newTrip.value.description,
      newTrip.value.departureCity
    )
    
    if (result && result.folderName) {
      // 刷新数据
      await mapStore.scanDirectory()
      await syncData()
      
      // 跳转到城市页面
      const city = mapStore.cities.find(c => c.name === selectedCityData.value.name)
      if (city) {
        router.push(`/gallery/${city.id}`)
      } else {
        router.push(`/gallery/${encodeURIComponent(selectedCityData.value.name)}`)
      }
      
      // 重置表单
      newTrip.value = { dirname: '', tripDate: '', description: '', departureCity: '' }
      departureSearch.value = ''
      showCreateDialog.value = false
    }
  } catch (e) {
    console.error('创建失败:', e)
    alert('创建失败: ' + String(e))
  }
}
</script>

<style scoped>
#map {
  background: #E8F4F8;
}
</style>
