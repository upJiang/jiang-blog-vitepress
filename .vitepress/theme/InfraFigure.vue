<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  src: string
  alt: string
  caption: string
  icon: string
}>()

const available = ref(false)

onMounted(() => {
  const image = new Image()
  image.onload = () => {
    available.value = true
  }
  image.src = props.src
})
</script>

<template>
  <figure v-if="available" class="infra-figure">
    <img :src="src" :alt="alt" loading="lazy" />
    <figcaption><InfraIcon :name="icon" />{{ caption }}</figcaption>
  </figure>
</template>
