// /frontend/src/main.ts

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// --- 1. Impor PrimeVUE & PrimeFlex ---
import PrimeVue from 'primevue/config';
import Lara from '@primeuix/themes/lara';
import 'primeflex/primeflex.css';

import 'primeicons/primeicons.css';                   // Ikon
// --- 2. Hapus CSS Bawaan Vite (PENTING) ---
// import './assets/main.css' 
import './style.css'; // <-- Impor style global kita
// (Kita komentari ini. CSS bawaan Vite akan 'berkelahi' dengan PrimeFlex)
import ToastService from 'primevue/toastservice'; // <-- 1. Impor Service

const app = createApp(App)

app.use(createPinia())
app.use(router)

// --- 3. Aktifkan PrimeVUE ---
app.use(PrimeVue, {
  ripple: true, // Efek klik 'ripple' yang bagus
  theme: {
    preset: Lara,
    options: {
      darkModeSelector: 'none' // Paksa gunakan skema warna terang
    }
  }
});
app.use(ToastService); // <-- 2. Daftarkan Service
app.mount('#app')
