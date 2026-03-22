import { createRouter, createWebHashHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'
import GalleryView from '@/views/GalleryView.vue'
import CarouselView from '@/views/CarouselView.vue'
import SettingsView from '@/views/SettingsView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'map',
      component: MapView
    },
    {
      path: '/gallery/:cityId',
      name: 'gallery',
      component: GalleryView
    },
    {
      path: '/carousel/:tripId',
      name: 'carousel',
      component: CarouselView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ]
})

export default router
