<template>
  <div class="q-pa-md">
    <q-file
      label="Select dxf part files"
      stack-label
      filled
      multiple
      append
      accept=".dxf"
      style="max-width: 300px"
      @input="_addfiles"
      @update:model-value="_updatemodel"
    >
      <template v-slot:prepend>
        <q-icon name="folder_open" />
      </template>
    </q-file>
  </div>
</template>

<script setup>
import { ref } from "vue";
import Part from "@/model";

let emits = defineEmits(['addParts'])

function _addfiles(eve) {
  let fileUrl = "";
  let addedprts = [];
  for(let file of eve.target.files)
  {
    fileUrl = URL.createObjectURL(file);
    addedprts.push(new Part(file.name, 1, fileUrl))
  }

  //向父组件触发事件
  emits('addParts',addedprts)

}

function _updatemodel() {}
</script>
