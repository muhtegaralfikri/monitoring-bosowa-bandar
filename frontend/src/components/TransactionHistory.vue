<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import * as XLSX from 'xlsx-js-style';
import apiClient from '@/services/api';
import { useStockStore } from '@/stores/stock.store';
import { useAuthStore } from '@/stores/auth.store';

interface TransactionUser {
  id: string;
  username: string;
  email: string;
}

interface TransactionHistoryItem {
  id: string;
  timestamp: string;
  type: 'IN' | 'OUT';
  amount: number;
  description: string | null;
  user: TransactionUser;
}

interface HistoryResponse {
  data: TransactionHistoryItem[];
  openingBalanceBeforeRange?: number;
  category?: string | null;
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
}

const MAKASSAR_TIME_ZONE = 'Asia/Makassar';

const props = withDefaults(
  defineProps<{
    type: 'IN' | 'OUT';
    title: string;
    description?: string;
    limit?: number;
    timeZone?: string;
    allowTypeFilter?: boolean;
    allowUserFilter?: boolean;
  }>(),
  {
    description: '',
    limit: 10,
    timeZone: MAKASSAR_TIME_ZONE,
    allowTypeFilter: false,
    allowUserFilter: false,
  },
);

// Always use Makassar timezone unless component caller overrides via prop.
const resolvedTimeZone = computed(() => props.timeZone || MAKASSAR_TIME_ZONE);

const stockStore = useStockStore();
const authStore = useAuthStore();
const { summary } = storeToRefs(stockStore);
const { user, isOperasional } = storeToRefs(authStore);
const history = ref<TransactionHistoryItem[]>([]);
const historyOpeningBalance = ref<number>(0);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const page = ref(1);
const paginationMeta = ref<HistoryResponse['meta']>({
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: props.limit,
  currentPage: 1,
  totalPages: 1,
});
type DateRangeValue = [Date | null, Date | null] | null;
const selectedRange = ref<DateRangeValue>(null);
const appliedRange = ref<{ start: Date; end: Date } | null>(null);

type FilterType = 'ALL' | 'IN' | 'OUT';
const selectedType = ref<FilterType>(props.type);
const typeOptions = [
  { label: 'Penambahan', value: 'IN' as FilterType },
  { label: 'Pemakaian', value: 'OUT' as FilterType },
  { label: 'Semua', value: 'ALL' as FilterType },
];

const effectiveType = computed<FilterType>(() =>
  props.allowTypeFilter ? selectedType.value : props.type,
);

const showTypeColumn = computed(() => props.allowTypeFilter && selectedType.value === 'ALL');

interface UserOption {
  label: string;
  value: string;
  role: 'admin' | 'operasional' | string;
}

const userOptions = ref<UserOption[]>([]);
const availableUserOptions = computed(() => {
  if (!props.allowUserFilter) {
    return [];
  }
  if (effectiveType.value === 'IN') {
    return userOptions.value.filter((user) => user.role === 'admin');
  }
  if (effectiveType.value === 'OUT') {
    return userOptions.value.filter((user) => user.role === 'operasional');
  }
  return userOptions.value;
});
const selectedUser = ref<string | null>(null);
const operationalSite = computed(() => user.value?.site || null);

watch(
  () => props.type,
  (newType) => {
    if (!props.allowTypeFilter) {
      selectedType.value = newType;
    }
  },
);

const formatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatDate = (value: string | number | Date) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: resolvedTimeZone.value,
  }).format(new Date(value));

const startOfDayIso = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const endOfDayIso = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

const buildHistoryParams = (options?: { forExport?: boolean }) => {
  const params: Record<string, unknown> = {
    limit: selectedPageSize.value,
    page: page.value,
  };

  if (isOperasional.value && operationalSite.value) {
    params.site = operationalSite.value;
  }

  const exportAllTypesForOp =
    options?.forExport && isOperasional.value && effectiveType.value === 'OUT';

  if (effectiveType.value !== 'ALL' && !exportAllTypesForOp) {
    params.type = effectiveType.value;
  }

  if (appliedRange.value) {
    params.startDate = startOfDayIso(appliedRange.value.start);
    params.endDate = endOfDayIso(appliedRange.value.end);
  }

  if (props.allowUserFilter && selectedUser.value) {
    params.userId = selectedUser.value;
  }

  if (searchTerm.value.trim()) {
    params.q = searchTerm.value.trim();
  }

  if (exportAllTypesForOp) {
    params.type = 'ALL';
  }

  return params;
};

const fetchHistory = async () => {
  loading.value = true;
  errorMessage.value = null;
  try {
    const params = buildHistoryParams();
    const { data } = await apiClient.get<HistoryResponse>('/stock/history', {
      params,
    });
    history.value = (data?.data || []).map((item) => ({
      ...item,
      amount: Number(item.amount),
    }));
    historyOpeningBalance.value = Number(data?.openingBalanceBeforeRange ?? 0);
    if (data?.meta) {
      paginationMeta.value = data.meta;
      page.value = data.meta.currentPage;
    }
  } catch (error: any) {
    console.error('Failed to load history', error);
    errorMessage.value =
      error.response?.data?.message ||
      'Gagal memuat riwayat transaksi. Coba lagi beberapa saat.';
  } finally {
    loading.value = false;
  }
};

const loadUsers = async () => {
  if (!props.allowUserFilter) return;
  try {
    const { data } = await apiClient.get<{ id: string; username: string; email: string }[]>(
      '/users',
    );
    userOptions.value = data.map((user: any) => ({
      label: user.username || user.email,
      value: user.id,
      role: user.role,
    }));
  } catch (error) {
    console.error('Failed to load users', error);
  }
};

onMounted(async () => {
  if (props.allowUserFilter) {
    await loadUsers();
  }
  fetchHistory();
});

const refresh = () => fetchHistory();

const canApplyRange = computed(() => {
  if (!selectedRange.value) return false;
  const [start, end] = selectedRange.value;
  return Boolean(start && end);
});

let dateDebounce: ReturnType<typeof setTimeout> | null = null;
const quickRange = ref<string>('');

const quickRangeOptions = [
  { label: '1 Hari', value: '1d' },
  { label: '7 Hari', value: '7d' },
  { label: '1 Bulan', value: '30d' },
  { label: '3 Bulan', value: '90d' },
  { label: '1 Tahun', value: '365d' },
];

const applyQuickRange = (value: string) => {
  if (!value) {
    selectedRange.value = null;
    return;
  }
  const days = Number(value.replace('d', ''));
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  selectedRange.value = [start, end];
};

watch(
  () => selectedRange.value,
  (range) => {
    if (dateDebounce) {
      clearTimeout(dateDebounce);
    }
    dateDebounce = setTimeout(() => {
      if (range && range[0] && range[1]) {
        appliedRange.value = { start: range[0], end: range[1] };
      } else {
        appliedRange.value = null;
        quickRange.value = '';
      }
      page.value = 1;
      fetchHistory();
    }, 400);
  },
);

watch(quickRange, (value) => {
  applyQuickRange(value);
});

const activeRangeLabel = computed(() => {
  if (!appliedRange.value) return '';
  const { start, end } = appliedRange.value;
  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  });
  return `${dateFormatter.format(start)} — ${dateFormatter.format(end)}`;
});

const goToPage = (target: number) => {
  if (
    target < 1 ||
    target > paginationMeta.value.totalPages ||
    target === page.value ||
    loading.value
  ) {
    return;
  }
  page.value = target;
  fetchHistory();
};

const canGoPrev = computed(() => page.value > 1);
const canGoNext = computed(() => page.value < paginationMeta.value.totalPages);

type PageToken =
  | { type: 'page'; value: number; key: string }
  | { type: 'ellipsis'; key: string };

const displayedPages = computed<PageToken[]>(() => {
  const total = paginationMeta.value.totalPages;
  if (total <= 1) return [];

  const dynamicSet = new Set<number>();
  dynamicSet.add(1);
  dynamicSet.add(total);

  if (total <= 5) {
    for (let i = 2; i < total; i += 1) {
      dynamicSet.add(i);
    }
  } else {
    for (let i = page.value - 1; i <= page.value + 1; i += 1) {
      if (i > 1 && i < total) {
        dynamicSet.add(i);
      }
    }
  }

  const sorted = Array.from(dynamicSet).sort((a, b) => a - b);
  const result: PageToken[] = [];
  let prev: number | null = null;

  for (const p of sorted) {
    if (prev !== null && p - prev > 1) {
      result.push({ type: 'ellipsis', key: `ellipsis-${prev}-${p}` });
    }
    result.push({ type: 'page', value: p, key: `page-${p}` });
    prev = p;
  }

  return result;
});

const exportToExcel = async () => {
  let exportHistory: TransactionHistoryItem[] = history.value;
  let exportOpeningBalance = historyOpeningBalance.value;

  try {
    const { data } = await apiClient.get<HistoryResponse>('/stock/history', {
      params: buildHistoryParams({ forExport: true }),
    });

    exportHistory = (data?.data || []).map((item) => ({
      ...item,
      amount: Number(item.amount),
    }));
    exportOpeningBalance = Number(data?.openingBalanceBeforeRange ?? 0);
  } catch (error) {
    console.error('Failed to fetch full history for export', error);
    if (!exportHistory.length) {
      return;
    }
  }

  if (!exportHistory.length) {
    return;
  }

  const now = new Date();
  const exportTime = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: resolvedTimeZone.value,
  }).format(now);

  const exportUsageOnly = isOperasional.value && effectiveType.value === 'OUT';

  const periodDescription = appliedRange.value
    ? `Periode: ${activeRangeLabel.value}`
    : 'Periode: Semua data';

  const stockSummary = summary.value;
  const siteLabel =
    operationalSite.value === 'GENSET'
      ? 'Genset'
      : operationalSite.value === 'TUG_ASSIST'
        ? 'Tug Assist'
        : null;
  const rows: (string | number)[][] = [];
  const titleRow =
    props.title ||
    (effectiveType.value === 'IN'
      ? 'Riwayat Penambahan Stok'
      : effectiveType.value === 'OUT'
        ? 'Riwayat Pemakaian Bahan Bakar'
        : 'Riwayat Transaksi Stok');

  rows.push([titleRow]);
  rows.push([periodDescription]);
  rows.push([`Diekspor: ${exportTime}`]);
  if (siteLabel) {
    rows.push([`Monitoring: ${siteLabel}`]);
  }
  rows.push([]);
  const headerRow = exportUsageOnly
    ? ['No', 'Tanggal', 'Petugas', 'Keterangan', 'Output']
    : [
        'No',
        'Tanggal',
        'Petugas',
        'Keterangan',
        'Stok Awal',
        'Input',
        'Output',
        'Stok Akhir',
      ];
  const headerRowIndex = rows.length + 1; // 1-based index for XLSX utils
  rows.push(headerRow);

  let totalInput = 0;
  let totalOutput = 0;
  const usageDayKeys = new Set<string>();

  const sortedHistory = [...exportHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let runningStock = Number.isFinite(exportOpeningBalance)
    ? Number(exportOpeningBalance)
    : 0;

  let rowNumber = 1;
  sortedHistory.forEach((item) => {
    const amount = Number(item.amount) || 0;
    const input = item.type === 'IN' ? amount : 0;
    const output = item.type === 'OUT' ? amount : 0;
    totalInput += input;
    totalOutput += output;
    if (item.type === 'OUT') {
      const dayKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: resolvedTimeZone.value,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(item.timestamp));
      usageDayKeys.add(dayKey);
    }

    const startStock = runningStock;
    if (runningStock !== null) {
      runningStock = runningStock + input - output;
    }

    if (!exportUsageOnly || item.type === 'OUT') {
      rows.push(
        exportUsageOnly
          ? [
              rowNumber,
              formatDate(item.timestamp),
              item.user?.username || '-',
              item.description || '-',
              output,
            ]
          : [
              rowNumber,
              formatDate(item.timestamp),
              item.user?.username || '-',
              item.description || '-',
              startStock ?? '',
              input,
              output,
              runningStock ?? '',
            ],
      );
      rowNumber += 1;
    }
  });

  rows.push([]);
  rows.push(
    exportUsageOnly
      ? ['', '', 'Total', '', totalOutput]
      : ['', '', '', 'Total', '', totalInput, totalOutput, runningStock ?? ''],
  );

  if (exportUsageOnly) {
    const daysCount = usageDayKeys.size || 1;
    const avgPerDay = totalOutput / daysCount;
    rows.push(['', '', 'Rata-rata/Hari', '', avgPerDay]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Tata letak lebih rapi: lebar kolom, freeze header, autofilter, merge judul.
  const lastColIndex = headerRow.length - 1;
  worksheet['!cols'] = [
    { wch: 6 }, // No
    { wch: 18 }, // Tanggal
    { wch: 20 }, // Petugas
    { wch: 28 }, // Keterangan
    ...(exportUsageOnly
      ? [{ wch: 12 }] // Output
      : [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }]),
  ];

  worksheet['!freeze'] = { rows: headerRowIndex, cols: 0 };
  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex - 1, c: 0 },
      e: { r: rows.length - 1, c: lastColIndex },
    }),
  };

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } }, // title
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIndex } }, // period
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIndex } }, // exported time
  ];
  // If site row exists (row index 3), merge it too.
  const firstCellRow3 = rows[3]?.[0];
  const hasSiteRow =
    siteLabel && titleRow && typeof firstCellRow3 === 'string' && firstCellRow3.startsWith('Lokasi:');
  if (hasSiteRow) {
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: lastColIndex } });
  }
  worksheet['!merges'] = merges;

  // Styling ringkas agar tampak profesional.
  const applyCellStyle = (
    cellRef: string,
    style: Record<string, any>,
  ) => {
    const cell = worksheet[cellRef];
    if (!cell) return;
    const existing = (cell as any).s ?? {};
    (cell as any).s = { ...existing, ...style };
  };

  const applyRowStyle = (
    rowIndex1Based: number,
    cols: number[],
    style: Record<string, any>,
  ) => {
    cols.forEach((col) => {
      const ref = XLSX.utils.encode_cell({ r: rowIndex1Based - 1, c: col });
      applyCellStyle(ref, style);
    });
  };

  // Meta header (title/period/export time/site).
  const metaRowsCount = hasSiteRow ? 4 : 3;
  for (let r = 0; r < metaRowsCount; r += 1) {
    const ref = XLSX.utils.encode_cell({ r, c: 0 });
    applyCellStyle(ref, {
      font: { bold: r === 0, sz: r === 0 ? 14 : 11 },
    });
  }

  // Header styling.
  for (let c = 0; c <= lastColIndex; c += 1) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex - 1, c });
    applyCellStyle(cellRef, {
      font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      fill: { fgColor: { rgb: 'FF4A5568' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'FFCBD5E0' } },
        bottom: { style: 'thin', color: { rgb: 'FFCBD5E0' } },
        left: { style: 'thin', color: { rgb: 'FFCBD5E0' } },
        right: { style: 'thin', color: { rgb: 'FFCBD5E0' } },
      },
    });
  }

  // Data rows styling (zebra fill).
  const dataStartRow = headerRowIndex + 1;
  const dataEndRow = dataStartRow + (rowNumber - 1) - 1;
  for (let r = dataStartRow; r <= dataEndRow; r += 1) {
    const isAlt = (r - dataStartRow) % 2 === 1;
    const rowFill = isAlt ? { fgColor: { rgb: 'FFF7FAFC' } } : undefined;
    applyRowStyle(
      r,
      Array.from({ length: lastColIndex + 1 }, (_, i) => i),
      {
        alignment: { vertical: 'center' },
        ...(rowFill ? { fill: rowFill } : {}),
      },
    );
  }

  // Numbers right aligned tanpa pemisah ribuan dan tanpa desimal.
  const numericColumns = exportUsageOnly
    ? [headerRow.indexOf('Output')]
    : [
        headerRow.indexOf('Stok Awal'),
        headerRow.indexOf('Input'),
        headerRow.indexOf('Output'),
        headerRow.indexOf('Stok Akhir'),
      ].filter((idx) => idx >= 0);
  for (let r = dataStartRow; r <= dataEndRow; r += 1) {
    numericColumns.forEach((col) => {
      const ref = XLSX.utils.encode_cell({ r: r - 1, c: col });
      applyCellStyle(ref, {
        alignment: { horizontal: 'right' },
        numFmt: '0;[Red]-0;0',
      });
    });
  }

  // Total & average rows styling.
  const totalRowIndex = rows.length - (exportUsageOnly ? 2 : 1);
  applyRowStyle(
    totalRowIndex + 1,
    Array.from({ length: lastColIndex + 1 }, (_, i) => i),
    {
      font: { bold: true },
      border: {
        top: { style: 'thin', color: { rgb: 'FFCBD5E0' } },
      },
    },
  );
  if (exportUsageOnly) {
    const avgRowIndex = rows.length - 1;
    applyRowStyle(avgRowIndex + 1, [lastColIndex - 1, lastColIndex], {
      font: { italic: true },
      alignment: { horizontal: 'right' },
      numFmt: '0;[Red]-0;0',
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat');

  const filenameType =
    effectiveType.value === 'IN'
      ? 'tambah-stok'
      : effectiveType.value === 'OUT'
        ? 'pemakaian'
        : 'semua';
  const siteSlug = operationalSite.value ? operationalSite.value.toLowerCase() : null;
  const filename = `riwayat-${filenameType}${siteSlug ? `-${siteSlug}` : ''}-${new Date()
    .toISOString()
    .split('T')[0]}.xlsx`;

  XLSX.writeFile(workbook, filename);
};

defineExpose({
  refresh,
});

if (props.allowTypeFilter) {
  watch(selectedType, () => {
    page.value = 1;
    fetchHistory();
  });
}

if (props.allowUserFilter) {
  watch(selectedUser, () => {
    page.value = 1;
    fetchHistory();
  });

  watch(
    () => availableUserOptions.value,
    (options) => {
      if (!selectedUser.value) return;
      const stillExists = options.some((opt) => opt.value === selectedUser.value);
      if (!stillExists) {
        selectedUser.value = null;
      }
    },
    { deep: true },
  );
}

const resetFilters = () => {
  if (props.allowTypeFilter) {
    selectedType.value = props.type;
  }
  if (props.allowUserFilter) {
    selectedUser.value = null;
  }
  selectedPageSize.value = props.limit;
  searchTerm.value = '';
  selectedRange.value = null;
  appliedRange.value = null;
  quickRange.value = '';
  page.value = 1;
  fetchHistory();
};

const showResetAll = computed(
  () =>
    props.allowTypeFilter ||
    props.allowUserFilter ||
    Boolean(appliedRange.value) ||
    selectedPageSize.value !== props.limit ||
    Boolean(searchTerm.value.trim()),
);

const pageSizeOptions = [10, 25, 50];
const selectedPageSize = ref(props.limit);
const searchTerm = ref('');
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

watch(selectedPageSize, () => {
  page.value = 1;
  fetchHistory();
});

watch(
  searchTerm,
  (value) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      page.value = 1;
      fetchHistory();
    }, 400);
  },
  { flush: 'post' },
);

const filterSummary = computed(() => {
  const summaries: string[] = [];
  if (props.allowTypeFilter) {
    summaries.push(`Jenis: ${
      effectiveType.value === 'ALL'
        ? 'Semua'
        : effectiveType.value === 'IN'
          ? 'Penambahan'
          : 'Pemakaian'
    }`);
  }
  if (props.allowUserFilter && selectedUser.value) {
    const userLabel = userOptions.value.find((opt) => opt.value === selectedUser.value)?.label;
    summaries.push(`Petugas: ${userLabel ?? 'Unknown'}`);
  }
  if (appliedRange.value) {
    summaries.push(`Periode: ${activeRangeLabel.value}`);
  }
  if (selectedPageSize.value !== props.limit) {
    summaries.push(`Jumlah/Halaman: ${selectedPageSize.value}`);
  }
  if (searchTerm.value.trim()) {
    summaries.push(`Pencarian: "${searchTerm.value.trim()}"`);
  }
  return summaries;
});
</script>

<template>
  <Card class="history-card dashboard-card">
    <template #title>
      <div class="history-header">
        <div>
          <p class="eyebrow mb-2">
            {{ type === 'IN' ? 'Penambahan Stok' : 'Pemakaian Bahan Bakar' }}
          </p>
          <h3 class="m-0">
            {{ title || (type === 'IN' ? 'Riwayat Penambahan Stok' : 'Riwayat Pemakaian Bahan Bakar') }}
          </h3>
        </div>
        <div class="history-actions">
          <Button
            icon="pi pi-refresh"
            label="Muat Ulang"
            size="small"
            outlined
            :loading="loading"
            @click="refresh"
          />
          <Button
            icon="pi pi-file-excel"
            label="Export Excel"
            size="small"
            severity="success"
            :disabled="!history.length"
            @click="exportToExcel"
          />
        </div>
      </div>
    </template>

    <template #content>
      <p v-if="description" class="history-description">
        {{ description }}
      </p>

      <div v-if="loading" class="history-state">
        <i class="pi pi-spin pi-spinner" aria-hidden="true" />
        <span>Memuat riwayat...</span>
      </div>

      <div v-else-if="errorMessage" class="history-state error">
        <i class="pi pi-times-circle" aria-hidden="true" />
        <span>{{ errorMessage }}</span>
        <Button label="Coba Lagi" link @click="refresh" />
      </div>

      <div v-else-if="!history.length" class="history-state empty">
        <i class="pi pi-inbox" aria-hidden="true" />
        <span>Belum ada riwayat untuk jenis transaksi ini.</span>
        <Button
          v-if="showResetAll"
          label="Reset filter"
          link
          size="small"
          @click="resetFilters"
        />
      </div>

      <div v-else>
        <div class="history-filters">
          <div
            v-if="props.allowTypeFilter"
            class="filter-field type-filter"
          >
            <label class="filter-label" for="history-type">Jenis</label>
            <Dropdown
              id="history-type"
              v-model="selectedType"
              :options="typeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
          <div
            v-if="props.allowUserFilter"
            class="filter-field user-filter"
          >
            <label class="filter-label" for="history-user">Petugas</label>
            <Dropdown
              id="history-user"
              v-model="selectedUser"
              :options="userOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Semua petugas"
              showClear
              class="w-full"
            />
          </div>
          <div class="filter-field search-filter">
            <label class="filter-label" for="history-search">Cari deskripsi/petugas</label>
            <InputText
              id="history-search"
              v-model="searchTerm"
              class="w-full"
              placeholder="Masukkan kata kunci"
            />
          </div>
          <div class="filter-field period-filter">
            <label class="filter-label" for="history-range">Periode</label>
            <DatePicker
              id="history-range"
              v-model="selectedRange"
              selectionMode="range"
              dateFormat="dd M yy"
              :maxDate="new Date()"
              :disabled="loading"
              showButtonBar
              placeholder="Pilih rentang tanggal"
            />
          </div>
          <div class="filter-field quick-range-filter">
            <label class="filter-label" for="history-quick-range">Rentang Cepat</label>
            <Dropdown
              id="history-quick-range"
              v-model="quickRange"
              :options="quickRangeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Pilih rentang cepat"
              class="w-full"
            />
          </div>
          <div class="filter-field page-size-filter">
            <label class="filter-label" for="history-page-size">Jumlah/Halaman</label>
            <Dropdown
              id="history-page-size"
              v-model="selectedPageSize"
              :options="pageSizeOptions"
              class="w-full"
            />
          </div>
          <div class="filter-actions">
            <Button
              v-if="showResetAll"
              label="Reset Semua"
              size="small"
              link
              severity="secondary"
              :disabled="loading"
              @click="resetFilters"
            />
          </div>
        </div>

        <p v-if="appliedRange" class="active-range-label">
          Menampilkan transaksi antara {{ activeRangeLabel }}
        </p>
        <p v-if="filterSummary.length" class="active-filters">
          Filter aktif: {{ filterSummary.join(', ') }}
        </p>

        <div class="history-table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Petugas</th>
                <th v-if="showTypeColumn">Jenis</th>
                <th>Jumlah (L)</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in history" :key="item.id">
                <td>{{ index + 1 }}</td>
                <td>{{ formatDate(item.timestamp) }}</td>
                <td>{{ item.user?.username || '-' }}</td>
                <td v-if="showTypeColumn">{{ item.type === 'IN' ? 'IN' : 'OUT' }}</td>
                <td class="amount-cell">
                  {{ formatter.format(item.amount) }}
                </td>
                <td>{{ item.description || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="paginationMeta.totalPages > 1"
          class="history-pagination"
          role="navigation"
          aria-label="Pagination riwayat"
        >
          <button
            class="page-btn nav"
            type="button"
            :disabled="!canGoPrev"
            @click="goToPage(page - 1)"
            aria-label="Halaman sebelumnya"
          >
            <i class="pi pi-chevron-left" aria-hidden="true" />
          </button>

          <template v-for="token in displayedPages" :key="token.key">
            <button
              v-if="token.type === 'page'"
              class="page-btn"
              type="button"
              :class="{ active: token.value === page }"
              @click="goToPage(token.value)"
            >
              {{ token.value }}
            </button>
            <span v-else class="pagination-ellipsis">…</span>
          </template>

          <button
            class="page-btn nav"
            type="button"
            :disabled="!canGoNext"
            @click="goToPage(page + 1)"
            aria-label="Halaman berikutnya"
          >
            <i class="pi pi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.history-card {
  margin-top: 1.5rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.history-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.history-description {
  color: var(--surface-600);
  margin-bottom: 1rem;
}

.history-table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.history-table th,
.history-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.history-table th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--surface-500);
}

.history-table tbody tr:hover {
  background: rgba(15, 23, 42, 0.03);
}

.amount-cell {
  font-weight: 600;
  color: var(--surface-900);
}

.history-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: var(--surface-700);
}

.history-state i {
  font-size: 1.35rem;
}

.history-state.error {
  color: #dc2626;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.history-state.empty {
  color: var(--surface-500);
}

.history-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 0.75rem;
}

@media screen and (min-width: 768px) {
  .filter-field {
    flex: 1 1 calc(33.33% - 1rem);
    min-width: 220px;
  }
}

@media screen and (max-width: 767px) {
  .filter-field {
    flex: 1 1 100%;
  }
}

.filter-field {
  flex: 1 1 220px;
}

.filter-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--surface-600);
  margin-bottom: 0.3rem;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
}

.active-range-label {
  font-size: 0.85rem;
  color: var(--surface-500);
  margin-bottom: 0.5rem;
}

.active-filters {
  font-size: 0.85rem;
  color: var(--surface-600);
  margin-bottom: 0.5rem;
}

.history-pagination {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 0.35rem;
}

.page-btn {
  border: 1px solid rgba(15, 23, 42, 0.15);
  background: #ffffff;
  color: #1e468c;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

.page-btn.nav {
  padding-inline: 0.65rem;
}

.page-btn.active {
  background: #1e468c;
  color: #ffffff;
  border-color: #1e468c;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pagination-ellipsis {
  padding: 0.35rem 0.5rem;
  color: var(--surface-500);
}
</style>
.filter-field.quick-range-filter {
  flex: 0 0 200px;
}
