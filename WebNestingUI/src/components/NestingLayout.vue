<template>
    <div class="q-pa-md">
        <PartList  ref="ref_partlist" @updateRows="updatePrtRows"/>
    </div>

    <div class="q-pa-md"></div>
    <div class="q-pa-md" v-if="partsqty>0">
        <q-separator spaced=12px color="black" inset/>
        <SheetList ref="ref_sheetlist" @updateRows="updateShtRows"/>
    </div>


    <div class="q-pa-md"></div>
    <div class="q-pa-md "  v-if="partsqty>0 && sheetsqty>0"> 
        <q-separator spaced=12px color="black" inset/>
        <RunNesting ref="ref_runnesting" :parts="parts" :sheets="sheets" @updateRows="updateLayouts"/>
    </div>  


    <div class="q-pa-md"></div>
    <div class="q-pa-md" v-if="layoutsqty>0">
        <q-separator spaced=12px color="black" inset/>
        <NestResultList ref="ref_nestresult" :layouts="layouts" :jobid="nestjobid"/>
    </div>


</template>

<script setup>
import { ref} from "vue";
import PartList from "./PartList.vue";
import SheetList from "./SheetList.vue";
import RunNesting from "./RunNesting.vue"
import NestResultList from "./NestResultList.vue"

let parts = []
let partsqty = ref(0)

let sheets = []
let sheetsqty = ref(0)

let layouts = []
let layoutsqty = ref(0)

let nestjobid = ref('')

function updatePrtRows(rows)
{
    parts = rows;
    partsqty.value = parts.length
    // console.log('updatePrtRows')
    // console.log(partsqty)
}

function updateShtRows(rows)
{
    sheets = rows
    sheetsqty.value = sheets.length
}


function updateLayouts(rows, jobid)
{
    layouts = rows
    layoutsqty.value = layouts.length
    nestjobid.value = jobid
}


</script>