<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue';
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useAuthStore } from './stores/auth.store';
import { useStockStore } from './stores/stock.store';
import Toast from 'primevue/toast';

const authStore = useAuthStore();
const stockStore = useStockStore();
const currentYear = new Date().getFullYear();

const stopAuthWatcher = watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      stockStore.startPolling();
    } else {
      stockStore.stopPolling();
    }
  },
  { immediate: true },
);

onMounted(() => {
  authStore.checkAuth();
});

onBeforeUnmount(() => {
  stockStore.stopPolling();
  stopAuthWatcher();
});
</script>

<template>
  <div class="app-shell">
    <Toast />
    <Navbar />
    <main class="app-main">
      <RouterView />
    </main>
    <footer class="app-footer">
      © {{ currentYear }} Bosowa Bandar Group. All rights reserved.
    </footer>
  </div>
</template>
