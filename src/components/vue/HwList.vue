<script setup lang="ts">
import { computed, ref } from "vue";
import html2canvas from "html2canvas";
import {
  countDueBy as countDueByUtil,
  countIssuedBy as countIssuedByUtil,
  filterHomework,
  getHomeworkStatus,
  isHwArray,
  type HwItem,
} from "../../lib/homework";

// Props passed from Astro server-side rendering
interface Props {
  data: HwItem[];
  subjects: string[];
  initialDate: string;
  isDataLoaded: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  subjects: () => [],
  initialDate: "",
  isDataLoaded: false,
});

// Client-side state initialized from props
const items = ref<HwItem[]>(props.data);
const showUpload = ref(!props.isDataLoaded || props.data.length === 0);
const issueDate = ref(props.initialDate);
const subject = ref("");
const dueStatus = ref("");
const tableRef = ref<HTMLTableElement | null>(null);
const propsSubjects = ref<string[]>(props.subjects);

const filtered = computed(() => {
  if (!items.value || items.value.length === 0) return [];
  return filterHomework(items.value, {
    issueDate: issueDate.value,
    subject: subject.value,
    dueStatus: dueStatus.value as "overdue" | "today" | "future" | undefined,
  });
});

// Use imported helper function
function getStatus(dueDateStr: string) {
  return getHomeworkStatus(dueDateStr);
}

function countIssuedBy(dateYmd: string): number {
  return items.value ? countIssuedByUtil(items.value, dateYmd) : 0;
}

function countDueBy(dateYmd: string): number {
  return items.value ? countDueByUtil(items.value, dateYmd) : 0;
}

function resetFilters() {
  subject.value = "";
  dueStatus.value = "";
  issueDate.value = new Date().toISOString().split("T")[0];
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result)) as unknown;
      const parsedObj = parsed as { items?: unknown };
      if (isHwArray(parsed)) items.value = parsed;
      else if (parsedObj.items && isHwArray(parsedObj.items))
        items.value = parsedObj.items;
      else throw new Error("數據格式不正確");

      // Update subjects list if new data has different subjects
      const newSubjects = Array.from(
        new Set(items.value.map((i) => i.subject)),
      ).sort();
      propsSubjects.value = newSubjects;
      showUpload.value = false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`解析文件失敗：${message}`);
    }
  };
  reader.readAsText(f);
}

async function downloadScreenshot() {
  try {
    const targetYmd = issueDate.value;
    const targetZh = new Date(targetYmd).toLocaleDateString("zh-Hant", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    const temp = document.createElement("div");
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    temp.style.top = "-9999px";
    temp.style.width = "1200px";
    temp.style.padding = "20px";
    temp.style.background =
      getComputedStyle(document.body).getPropertyValue(
        "--colorNeutralBackground2",
      ) || "#111111";

    const header = document.createElement("div");
    header.innerHTML = `<h2 style="margin:0 0 8px;color:${getComputedStyle(document.body).getPropertyValue("--colorBrandForeground1") || "#479ef5"}">功課表</h2><div style="color:var(--colorNeutralForeground2)">${targetZh}</div>`;
    temp.appendChild(header);

    if (tableRef.value) {
      const clone = tableRef.value.cloneNode(true) as HTMLElement;
      clone.style.width = "100%";
      temp.appendChild(clone);
    } else {
      throw new Error("找不到表格元素");
    }

    document.body.appendChild(temp);
    await new Promise((r) => setTimeout(r, 80));
    const canvas = await html2canvas(temp as HTMLElement, {
      scale: 3,
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = `功課表_${targetYmd.replace(/-/g, "")}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    link.remove();
    temp.remove();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    alert(`生成圖片失敗：${message}`);
  }
}

// Explicit references to suppress static analyzer warnings
void filtered;
void getStatus;
void countIssuedBy;
void countDueBy;
void resetFilters;
void handleFileUpload;
void downloadScreenshot;
</script>

<template>
  <div
    v-if="!isDataLoaded && items.length === 0"
    style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      gap: 8px;
      color: var(--colorNeutralForeground3);
    "
  >
    <fluent-spinner></fluent-spinner>
    <span>加載中…</span>
  </div>

  <div v-else>
    <!-- Page Header -->
    <div class="page-header">
      <h2>作業列表</h2>
      <fluent-button appearance="outline" @click="downloadScreenshot">下載圖片</fluent-button>
    </div>

    <!-- Filters -->
    <div class="filters-grid">
      <div class="filter-item">
        <fluent-label>發佈日期</fluent-label>
        <input type="date" class="filter-input" v-model="issueDate" />
      </div>
      <div class="filter-item">
        <fluent-label>科目</fluent-label>
        <select class="filter-input" v-model="subject">
          <option value="">全部</option>
          <option v-for="s in propsSubjects" :key="s" :value="s">
            {{ s }}
          </option>
        </select>
      </div>
      <div class="filter-item">
        <fluent-label>截止狀態</fluent-label>
        <select class="filter-input" v-model="dueStatus">
          <option value="">全部</option>
          <option value="overdue">已過期</option>
          <option value="today">今天到期</option>
          <option value="future">未來</option>
        </select>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions-row">
      <fluent-button appearance="outline" @click="resetFilters">重置篩選</fluent-button>
      <div v-if="showUpload" class="upload-area">
        <input type="file" accept="application/json" @change="handleFileUpload" />
      </div>
    </div>

    <!-- Stats -->
    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-content">
          <i class="bi bi-journal-plus stat-icon"></i>
          <div>
            <div class="stat-title">發布功課</div>
            <div class="stat-value">{{ countIssuedBy(issueDate) }}</div>
          </div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-content">
          <i class="bi bi-clock stat-icon"></i>
          <div>
            <div class="stat-title">截止功課</div>
            <div class="stat-value">{{ countDueBy(issueDate) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-card">
      <div class="table-scroll">
        <table ref="tableRef" class="hw-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>科目</th>
              <th>作業</th>
              <th>發佈</th>
              <th>截止</th>
              <th>班級</th>
              <th>狀態</th>
              <th>備註</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in filtered" :key="String(it.id)" :class="getStatus(it.due_date).cls">
              <td>{{ it.id }}</td>
              <td>{{ it.subject }}</td>
              <td>{{ it.homework_name }}</td>
              <td>{{ it.issue_date }}</td>
              <td>{{ it.due_date }}</td>
              <td>{{ it.class_group }}</td>
              <td>
                <span :class="['status-badge', getStatus(it.due_date).cls]">
                  <i :class="'bi bi-' + getStatus(it.due_date).icon"></i>
                  <span>{{ getStatus(it.due_date).text }}</span>
                </span>
              </td>
              <td>
                <div class="remarks-cell">{{ it.remarks || '無備註' }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  animation: slideInLeft 300ms cubic-bezier(0, 0, 0, 1) both;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  animation: slideUp 300ms cubic-bezier(0, 0, 0, 1) both;
  animation-delay: 50ms;
}
.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.filter-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--colorNeutralBackground4, #333);
  border: none;
  border-bottom: 2px solid var(--colorNeutralStroke1, #404040);
  color: var(--colorNeutralForeground1, #fff);
  font-family: inherit;
  font-size: 14px;
  border-radius: 4px 4px 0 0;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 100ms ease;
}
.filter-input:focus {
  outline: none;
  border-bottom-color: var(--colorBrandForeground1, #479ef5);
}

.actions-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  animation: slideUp 300ms cubic-bezier(0, 0, 0, 1) both;
  animation-delay: 100ms;
}
.stat-item {
  padding: 16px;
  background: var(--colorNeutralBackground2, #1b1b1b);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 12px;
  box-shadow: 0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28);
}
.stat-content {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-icon {
  font-size: 22px;
  color: var(--colorBrandForeground1, #479ef5);
}
.stat-title {
  font-size: 12px;
  color: var(--colorNeutralForeground3, #adadad);
  font-weight: 500;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--colorNeutralForeground1, #fff);
}

.table-card {
  padding: 0;
  overflow: hidden;
  background: var(--colorNeutralBackground2, #1b1b1b);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 12px;
  box-shadow: 0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28);
  animation: slideUp 300ms cubic-bezier(0, 0, 0, 1) both;
  animation-delay: 150ms;
}
.table-scroll {
  overflow-x: auto;
}
.hw-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.hw-table th {
  background: var(--colorNeutralBackground3, #282828);
  color: var(--colorNeutralForeground2, #d6d6d6);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--colorNeutralStroke1, #404040);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.hw-table td {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.053);
  color: var(--colorNeutralForeground2, #d6d6d6);
  vertical-align: middle;
}
.hw-table tbody tr {
  transition: background 100ms ease;
}
.hw-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.053);
}
.hw-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.06);
}
.hw-table tbody tr.overdue {
  background: rgba(196, 49, 75, 0.1);
}
.hw-table tbody tr.overdue:hover {
  background: rgba(196, 49, 75, 0.14);
}
.hw-table tbody tr.today {
  background: rgba(71, 158, 245, 0.05);
}
.hw-table tbody tr.today:hover {
  background: rgba(71, 158, 245, 0.09);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  min-width: 88px;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;
}
.status-badge i {
  font-size: 12px;
}
.status-badge.overdue {
  background: rgba(196, 49, 75, 0.1);
  color: var(--colorPaletteRedForeground1, #dc626d);
  border-color: rgba(220, 98, 109, 0.18);
}
.status-badge.today {
  background: rgba(71, 158, 245, 0.1);
  color: var(--colorBrandForeground1, #479ef5);
  border-color: rgba(71, 158, 245, 0.32);
}
.status-badge.normal {
  background: transparent;
  color: var(--colorNeutralForeground3, #adadad);
  border-color: var(--colorNeutralStroke2, #333);
}

.remarks-cell {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--colorNeutralForeground3, #adadad);
}
.remarks-cell:hover {
  white-space: normal;
  overflow: visible;
}

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
  .stat-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .hw-table td,
  .hw-table th {
    padding: 8px;
    font-size: 12px;
  }
}
</style>