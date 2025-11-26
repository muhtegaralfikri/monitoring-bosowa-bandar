<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useStockStore, type SiteKey } from '@/stores/stock.store';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import BaseChart from '@/components/BaseChart.vue';
import type { ChartData, ChartOptions } from 'chart.js';

const stockStore = useStockStore();
const {
  siteSummaries,
  siteSummaryLoading,
  siteSummaryError,
  siteTrends,
  siteTrendLoading,
  siteTrendError,
  siteInOutTrends,
  siteInOutTrendLoading,
  siteInOutTrendError,
} = storeToRefs(stockStore);

onMounted(() => {
  stockStore.fetchSummaryBySite('LANTEBUNG');
  stockStore.fetchSummaryBySite('JENEPONTO');
  stockStore.fetchTrendBySite('LANTEBUNG', 7);
  stockStore.fetchTrendBySite('JENEPONTO', 7);
  stockStore.fetchInOutTrendBySite('LANTEBUNG', 7);
  stockStore.fetchInOutTrendBySite('JENEPONTO', 7);
});

onUnmounted(() => {
});

const formatLiters = (value?: number | null) => {
  if (value === undefined || value === null) return '0 Liter';
  return `${value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} Liter`;
};

const siteKeys: SiteKey[] = ['LANTEBUNG', 'JENEPONTO'];

const siteDisplayNames: Record<SiteKey, string> = {
  LANTEBUNG: 'Genset',
  JENEPONTO: 'Tug Assist',
};

const siteSummaryCards = computed(() =>
  siteKeys.map((site) => {
    const data = siteSummaries.value[site];
    const title =
      site === 'LANTEBUNG'
        ? 'Monitoring Solar Genset (Lantebung)'
        : 'Monitoring Solar Tug Assist (Jeneponto)';
    return {
      site,
      title,
      cards: [
        {
          key: `${site}-opening`,
          title: 'Stok Awal Hari Ini',
          accent: 'text-gray-700',
          value: data?.todayInitialStock ?? null,
        },
        {
          key: `${site}-in`,
          title: 'Input Hari Ini',
          accent: 'text-green-600',
          value: data?.todayStockIn ?? null,
        },
        {
          key: `${site}-out`,
          title: 'Output Hari Ini',
          accent: 'text-orange-600',
          value: data?.todayStockOut ?? data?.todayUsage ?? null,
        },
        {
          key: `${site}-closing`,
          title: 'Stok Akhir Hari Ini',
          accent: 'text-blue-600',
          value: data?.todayClosingStock ?? data?.currentStock ?? null,
        },
      ],
    };
  }),
);

const trendChartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const value = ctx.parsed.y ?? 0;
          return `Stok: ${value.toLocaleString('id-ID')} L`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: any) =>
          `${Number(value).toLocaleString('id-ID')} L`,
      },
    },
  },
}));

const siteTrendChartData = computed(() => {
  const build = (site: SiteKey) => {
    const siteTrend = siteTrends.value[site];
    if (!siteTrend?.points?.length) return null;
    return {
      labels: siteTrend.points.map((point) => point.label),
      datasets: [
        {
          label: 'Stok Akhir',
          data: siteTrend.points.map((point) => point.closingStock),
          tension: 0.35,
          fill: true,
          borderColor: '#1e468c',
          backgroundColor: 'rgba(30, 70, 140, 0.15)',
          pointRadius: 3,
          pointBackgroundColor: '#1e468c',
          pointBorderColor: '#ffffff',
          borderWidth: 2,
          type: 'line' as const,
        },
      ],
    } as ChartData<'line'>;
  };
  return {
    LANTEBUNG: build('LANTEBUNG'),
    JENEPONTO: build('JENEPONTO'),
  };
});
const inOutChartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const label = ctx.dataset.label || '';
          const value = ctx.parsed.y ?? ctx.parsed ?? 0;
          return `${label}: ${value.toLocaleString('id-ID')} L`;
        },
      },
    },
  },
  scales: {
    x: {
      stacked: false,
    },
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: any) =>
          `${Number(value).toLocaleString('id-ID')} L`,
      },
    },
  },
}));

const siteInOutChartData = computed(() => {
  const build = (site: SiteKey) => {
    const siteTrendData = siteInOutTrends.value[site];
    if (!siteTrendData?.points?.length) return null;
    return {
      labels: siteTrendData.points.map((point) => point.label),
      datasets: [
        {
          type: 'bar' as const,
          label: 'Penambahan (IN)',
          data: siteTrendData.points.map((point) => point.totalIn),
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgba(22, 163, 74, 1)',
          borderWidth: 1,
        },
        {
          type: 'bar' as const,
          label: 'Pemakaian (OUT)',
          data: siteTrendData.points.map((point) => point.totalOut),
          backgroundColor: 'rgba(249, 115, 22, 0.7)',
          borderColor: 'rgba(234, 88, 12, 1)',
          borderWidth: 1,
        },
      ],
    } as ChartData<'bar'>;
  };
  return {
    LANTEBUNG: build('LANTEBUNG'),
    JENEPONTO: build('JENEPONTO'),
  };
});
</script>

<template>
  <div class="home-shell">
    <div
      v-for="siteBlock in siteSummaryCards"
      :key="siteBlock.site"
      class="site-section"
    >
      <h3 class="site-title">{{ siteBlock.title }}</h3>
      <div class="grid summary-grid">
        <div
          v-for="metric in siteBlock.cards"
          :key="metric.key"
          class="col-12 sm:col-6 lg:col-3"
        >
          <Card>
            <template #title>{{ metric.title }}</template>
            <template #content>
              <div v-if="siteSummaryLoading[siteBlock.site]">
                <Skeleton height="2rem" class="mb-2" />
              </div>
              <div v-else-if="siteSummaries[siteBlock.site]">
                <h2 class="text-3xl font-bold" :class="metric.accent">
                  {{ formatLiters(metric.value) }}
                </h2>
              </div>
              <div v-else-if="siteSummaryError[siteBlock.site]">
                <Message severity="warn">{{ siteSummaryError[siteBlock.site] }}</Message>
              </div>
              <div v-else>
                <small class="text-color-secondary">Belum ada data stok.</small>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <div class="grid mt-3">
        <div class="col-12 lg:col-6">
          <Card>
            <template #title>Tren Stok 7 Hari - {{ siteDisplayNames[siteBlock.site] }}</template>
            <template #content>
              <div v-if="siteTrendLoading[siteBlock.site]">
                <Skeleton height="260px" />
              </div>
              <div v-else-if="siteTrendError[siteBlock.site]">
                <Message severity="warn">{{ siteTrendError[siteBlock.site] }}</Message>
              </div>
              <div v-else-if="siteTrendChartData[siteBlock.site]">
                <div class="trend-chart-wrapper">
                  <BaseChart
                    type="line"
                    :data="siteTrendChartData[siteBlock.site]"
                    :options="trendChartOptions"
                  />
                </div>
              </div>
              <div v-else>
                <small class="text-color-secondary">Belum ada data tren.</small>
              </div>
            </template>
          </Card>
        </div>

        <div class="col-12 lg:col-6">
          <Card>
            <template #title>IN vs OUT - {{ siteDisplayNames[siteBlock.site] }}</template>
            <template #content>
              <div v-if="siteInOutTrendLoading[siteBlock.site]">
                <Skeleton height="260px" />
              </div>
              <div v-else-if="siteInOutTrendError[siteBlock.site]">
                <Message severity="warn">{{ siteInOutTrendError[siteBlock.site] }}</Message>
              </div>
              <div v-else-if="siteInOutChartData[siteBlock.site]">
                <div class="trend-chart-wrapper">
                  <BaseChart
                    type="bar"
                    :data="siteInOutChartData[siteBlock.site]"
                    :options="inOutChartOptions"
                  />
                </div>
              </div>
              <div v-else>
                <small class="text-color-secondary">Belum ada data in/out.</small>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Kita bisa tambahkan style kustom di sini jika perlu */
.p-card {
  /* Memberi bayangan & tepian bulat yang konsisten */
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}
h2 {
  margin: 0; /* Hapus margin default browser */
}

.trend-chart-wrapper {
  width: 100%;
  height: 260px;
}

.site-title {
  margin: 0 0 0.5rem 0;
  font-weight: 700;
  color: #0f172a;
}

.home-shell {
  padding: 1.5rem 1rem 2.5rem;
}

.site-section {
  margin-top: 1.5rem;
}
</style>
