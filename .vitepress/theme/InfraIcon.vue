<script setup lang="ts">
import type { Component } from 'vue'
import {
  Activity,
  Blocks,
  Boxes,
  ChartNoAxesCombined,
  CloudCog,
  Code2,
  Container,
  Cpu,
  Database,
  DoorOpen,
  GitBranch,
  Grid3X3,
  HardDrive,
  Layers3,
  ListTodo,
  Map,
  MemoryStick,
  Network,
  Package,
  RadioTower,
  Rocket,
  Route,
  Search,
  Server,
  ShieldCheck,
  ShipWheel,
  SlidersHorizontal,
  Split,
  Terminal,
  Waypoints,
  Workflow,
} from '@lucide/vue'

const props = defineProps<{
  name: string
  label?: string
}>()

const icons: Record<string, Component> = {
  activity: Activity,
  api: Waypoints,
  blocks: Blocks,
  cache: Layers3,
  chart: ChartNoAxesCombined,
  cluster: Boxes,
  code: Code2,
  communication: RadioTower,
  container: Container,
  database: Database,
  deploy: Rocket,
  gateway: DoorOpen,
  gpu: Cpu,
  grid: Grid3X3,
  layers: Layers3,
  map: Map,
  memory: MemoryStick,
  models: Boxes,
  network: Network,
  observability: Activity,
  package: Package,
  pipeline: GitBranch,
  platform: CloudCog,
  queue: ListTodo,
  recovery: ShipWheel,
  rocket: Rocket,
  route: Route,
  scheduler: SlidersHorizontal,
  search: Search,
  server: Server,
  shards: Split,
  shield: ShieldCheck,
  sliders: SlidersHorizontal,
  storage: HardDrive,
  terminal: Terminal,
  training: Workflow,
  workflow: Workflow,
}
</script>

<template>
  <span
    class="infra-icon"
    :aria-label="props.label"
    :aria-hidden="props.label ? undefined : 'true'"
    :role="props.label ? 'img' : undefined"
  >
    <component :is="icons[props.name] ?? Boxes" :size="17" :stroke-width="1.8" />
  </span>
</template>
