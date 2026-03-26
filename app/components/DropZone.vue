<script setup lang="ts">
const props = defineProps<{
  previews: string[]
  maxImages: number
}>()

const emit = defineEmits<{
  files: [files: FileList]
  remove: [index: number]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  if (e.dataTransfer?.files) {
    emit('files', e.dataTransfer.files)
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    emit('files', input.files)
    input.value = ''
  }
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'drag-over': dragOver, 'has-images': previews.length > 0 }"
    @click="fileInput?.click()"
    @dragover.prevent="dragOver = true"
    @dragleave="dragOver = false"
    @drop="onDrop"
  >
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden-input"
      @change="onFileChange"
    />

    <template v-if="previews.length === 0">
      <div class="empty-icon">&#128247;</div>
      <p class="empty-title">Glissez vos photos ici</p>
      <p class="empty-subtitle">ou cliquez pour sélectionner &bull; max {{ maxImages }} photos</p>
    </template>

    <template v-else>
      <div class="previews">
        <ImageThumb
          v-for="(src, i) in previews"
          :key="i"
          :src="src"
          :index="i"
          @remove="emit('remove', i)"
        />
        <div v-if="previews.length < maxImages" class="add-more">+</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 52px 24px;
  text-align: center;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.3s ease;
}
.dropzone.has-images {
  padding: 24px;
}
.dropzone.drag-over {
  border-color: #6c63ff;
  background: rgba(108, 99, 255, 0.06);
}

.hidden-input {
  display: none;
}

.empty-icon {
  font-size: 42px;
  margin-bottom: 16px;
  filter: grayscale(0.3);
}
.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #c8c8d0;
  margin: 0;
}
.empty-subtitle {
  font-size: 13px;
  color: #666;
  margin-top: 8px;
}

.previews {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.add-more {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 28px;
  flex-shrink: 0;
  transition: border-color 0.2s;
}
.add-more:hover {
  border-color: rgba(255, 255, 255, 0.25);
}
</style>
