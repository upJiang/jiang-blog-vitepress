<script setup lang="ts">
import { nextTick } from 'vue'

export interface SectionTrackTab {
  key: string
  label: string
}

const props = defineProps<{
  tabs: SectionTrackTab[]
  activeKey: string
  idPrefix: string
  label: string
}>()

const emit = defineEmits<{
  select: [key: string]
}>()

const tabButtons = new Map<string, HTMLButtonElement>()

function tabId(key: string): string {
  return `${props.idPrefix}-tab-${key}`
}

function panelId(): string {
  return `${props.idPrefix}-panel`
}

async function selectAndFocus(key: string): Promise<void> {
  emit('select', key)
  await nextTick()
  tabButtons.get(key)?.focus()
}

async function moveFocus(currentIndex: number, offset: number): Promise<void> {
  const nextIndex = (currentIndex + offset + props.tabs.length) % props.tabs.length
  await selectAndFocus(props.tabs[nextIndex].key)
}

async function onKeydown(event: KeyboardEvent, index: number): Promise<void> {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    await moveFocus(index, 1)
    return
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    await moveFocus(index, -1)
    return
  }

  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    const nextIndex = event.key === 'Home' ? 0 : props.tabs.length - 1
    await selectAndFocus(props.tabs[nextIndex].key)
  }
}

function focusActiveTab(): void {
  tabButtons.get(props.activeKey)?.focus()
}

defineExpose({ focusActiveTab })
</script>

<template>
  <div class="frontend-track-tabs" role="tablist" :aria-label="label">
    <button
      v-for="(tab, index) in tabs"
      :id="tabId(tab.key)"
      :key="tab.key"
      :ref="(element) => element && tabButtons.set(tab.key, element as HTMLButtonElement)"
      type="button"
      role="tab"
      :aria-controls="panelId()"
      :aria-selected="activeKey === tab.key"
      :tabindex="activeKey === tab.key ? 0 : -1"
      @click="emit('select', tab.key)"
      @keydown="onKeydown($event, index)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
