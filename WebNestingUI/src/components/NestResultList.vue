<template>
  <div class="q-pa-md">
    <q-table
      flat
      bordered
      title="Layouts"
      :rows="rows"
      :columns="columns"
      row-key="name"
      :hide-pagination="true"
      :rows-per-page-options="[0]"
    >

      <!-- add the editable feature of the quantity property -->
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td key="preview" :props="props">
            <div class="text-subtitle1"> 
               {{props.row.name}} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; duplicate: {{ props.row.duplicate }} 
            </div>
              <img id="img" v-bind:src="props.row.imgurl" />
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>

  <div class="q-pa-md fit row justify-end">
    <div class="q-gutter-md" >
      <q-btn no-caps color="primary" label="Download Report" @click="onViewReport"/>
      <q-btn no-caps color="primary" label="Download Dxf" @click="onDownloadNestResult"/>
    </div>
  </div>


  <!-- temp table used to generate dxf preview imag -->
  <div id="'temp_previewtable'" v-show="false">
    <q-table
      :rows="tmprows"
      :columns="tmpcolumns"
      :hide-pagination="true"
      :rows-per-page-options="[0]"
    >
      <!-- add the editable feature of the quantity property -->
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td key="preview" :props="props">
              <DxfViewer :dxfUrl="props.row.url" :canvasSize="{Width:props.row.width/5, Height:props.row.height/5}"  @updateImgUrl="(canvasElem, sizex, sizey, parseddxf)=>_updateImgUrl(props.row.url, canvasElem, sizex, sizey, parseddxf)">
            </DxfViewer>
          </q-td>
        </q-tr>
        
      </template>
    </q-table>
  </div>

  
</template>

<script setup>
import DxfViewer from "./DxfViewer.vue";
import { watch, onMounted, reactive, ref } from "vue";

import JSZip from "jszip";
import { saveAs } from "file-saver";
import {gethostname} from "@/global"

let props = defineProps(['layouts', 'jobid'])

let APIServer = gethostname()

//table data used for dxf preview generation
const tmpcolumns = [
  { name: "preview", label: "Preview", field: "preview", align: "left" },
];
const tmprows = reactive([]);



const columns = [
  { name: "preview", label: "Preview", field: "preview", align: "center" },
];
const rows = reactive([]);


onMounted(
  ()=>
  {
    const tmplayouts = JSON.parse(JSON.stringify(props.layouts));
    _pushtotemptable(tmplayouts)

  }
)

watch(
      ()=>props.layouts,
      (newresult)=>
      {
        const tmplayouts = JSON.parse(JSON.stringify(props.layouts));
        _pushtotemptable(tmplayouts)
      }
    )



function _pushtotemptable(tmplayouts) 
{
  
  if(tmplayouts.length>0)
  {
    let lastplayout= tmplayouts.shift();
    tmprows.push({url:lastplayout.dxfurl, width:lastplayout.matWidth, height:lastplayout.matHeight}) 
    setTimeout(function(){_pushtotemptable(tmplayouts)} ,100)
  }
}

function _updateImgUrl(rowurl, canvasElem) {
  var cav = canvasElem.querySelector(".canvasContainer canvas");
  var base64 = cav.toDataURL();

  //update the preview img to the layout list
  for (let index = 0; index <props.layouts.length ; index++) 
  {
    if(props.layouts[index].dxfurl===rowurl)
    {
      props.layouts[index].imgurl = base64;
      rows.push({name:props.layouts[index].name, duplicate:props.layouts[index].duplicate, imgurl:props.layouts[index].imgurl})
    }
  }
 
}


function onDownloadNestResult()
{
  const zip = new JSZip();

  for (let index = 0; index <props.layouts.length ; index++) 
  {
    let blob = fetch(props.layouts[index].dxfurl).then(r => r.blob());
    let dxfname = props.layouts[index].name+"_"+  props.layouts[index].duplicate + ".dxf";
    zip.file(dxfname, blob);
  }

  zip.generateAsync({ type: "blob" }).then(function (blob) {
                saveAs(blob, "nestingresult.zip");
            });

}




function onViewReport()
{
    if(props.jobid!="")
    {
        nestJob_GetReport(props.jobid)
    }

}


async function nestJob_GetReport(jobid)
{
    const requestOptions = {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/pdf',
        },
    };

    let res_ok = true
    await fetch(APIServer+'api/NestTask/JobReport?jobid='+jobid, requestOptions)
    .then(
        response => response.blob()
        )
      .then(data => {
        if (window.navigator.msSaveOrOpenBlob)
          window.navigator.msSaveBlob(data);
        else {
          var link = document.createElement("a");
          link.href = window.URL.createObjectURL(data);
          link.download = "nestresult.pdf";
          document.body.appendChild(link); // Required for FF
          link.click();
        }
      });
}


function clearResult()
{
  rows.length = 0
  tmprows.length = 0
}

defineExpose({
  clearResult,
});

</script>
