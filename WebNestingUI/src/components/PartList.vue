<template>
  <div class="q-pa-md">
    <q-table
      flat
      bordered
      title="Part List"
      :rows="rows"
      :columns="columns"
      row-key="name"
      :filter="filter"
      :hide-pagination="true"
      :rows-per-page-options="[0]"
    >
      <!-- add the search item on the top-right of the table -->
      <template v-slot:top-right>
        <q-input
          borderless
          dense
          debounce="300"
          v-model="filter"
          placeholder="Search"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </template>

      <!-- add the editable feature of the quantity property -->
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td key="preview" :props="props">
            <img id="img" v-bind:src="props.row.imgurl" />
          </q-td>
          <q-td key="name" :props="props">{{ props.row.name }}</q-td>
          <q-td key="size" :props="props"
            >{{ props.row.size_x.toFixed(2) }}x{{
              props.row.size_y.toFixed(2)
            }}</q-td
          >
          <q-td key="quantity" :props="props" style="max-width: 50px;">
            <q-input 
                v-model="props.row.qty"  
                type="number"
                rounded standout="bg-grey-6 text-white"
                input-style="text-align:center"
               />
          </q-td>
          <q-td key="action" :props="props">
            <q-icon name="clear" color="red" size="md" @click="onDelete(props.row)"/>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>

  <!-- select part button -->
  <div class="q-pa-md fit row justify-end " id="myFileInput">
    <q-file
      ref="fileinput"
      label="Select dxf part files"
      stack-label
      filled
      multiple
      append
      accept=".dxf"
      style="max-width: 200px;"
      @input="_addfiles"
    >
      <template v-slot:prepend>
        <q-icon name="folder_open" />
      </template>
    </q-file>
  </div>

  <div class="q-pa-md fit row justify-end">
    <div class="q-gutter-md" >
      <q-btn  no-caps color="primary"  label="Clear" @click="onClear()"/>
      <q-btn no-caps color="primary"  label="Add Part" @click="$refs.fileinput.pickFiles()"/>
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
            <DxfViewer :dxfUrl="props.row" :canvasSize="partCanvasSize"  @updateImgUrl="(canvasElem, sizex, sizey, parseddxf)=>_updateImgUrl(props.row, canvasElem, sizex, sizey, parseddxf)">
            </DxfViewer>
          </q-td>
        </q-tr>
        
      </template>
    </q-table>
  </div>


</template>

<script setup>
  import DxfViewer from "./DxfViewer.vue";
  import { reactive, ref , watch} from "vue";
  import {Part} from "@/model";
  import {seperateparts} from "@/seperateparts"
  import { buildpartdxfurl } from "@/assemblelayout";

  let filter = ref("");

  let emits = defineEmits(['updateRows'])

  //table data used for dxf preview generation
  const tmpcolumns = [
    { name: "preview", label: "TmpPreview", field: "preview", align: "left" },
  ];
  const tmprows = reactive([]);

  let partCanvasSize = reactive({
      Width:100,
      Height:100,
  })




  const columns = [
    { name: "preview", label: "Preview", field: "preview", align: "center" },
    {
      name: "name",
      label: "Name",
      required: true,
      align: "center",
      field: (row) => row.name,
      sortable: true,
    },
    { name: "size", label: "Size", field: "size", align: "center" },
    { name: "quantity", label: "Quantity", field: "quantity", align: "center" },
    { name: "action", label: "", field: "action", align: "center" },
  ];
  const rows = reactive([]);

  function _pushtotemptable(newparts) 
  {
    if(newparts.length>0)
    {
      let lastpart = newparts.pop();
      tmprows.push(lastpart.fileurl)
      setTimeout(function(){_pushtotemptable(newparts)} ,100)
    }
  }



  function _updateImgUrl(rowpart, canvasElem, sizex, sizey, parseddxf) {
    var cav = canvasElem.querySelector(".canvasContainer canvas");
    var base64 = cav.toDataURL();
    //cav.remove()

    let sepPrtList = seperateparts(parseddxf)
    if(sepPrtList.length==0)
    {
      //remove the original part item from the row
      for (let index = rows.length - 1; index >= 0; index--) 
      {
        //remove the original part record
        if(rows[index].fileurl===rowpart)
        {
          URL.revokeObjectURL(rows[index].imgurl)
          rows.splice(index,1)
        }
      }

      alert("Failed to find the close boundary!");

    }
    if(sepPrtList.length==1)
    {
      //update the preview info to the part list
      for (let index = rows.length - 1; index >= 0; index--) 
      {
        // console.log(rows[index].fileurl)
        if(rows[index].fileurl===rowpart)
        {
          rows[index].imgurl = base64;
          rows[index].size_x = sizex;
          rows[index].size_y = sizey;
          rows[index].parseddxf = parseddxf;
          rows[index].entitylist = sepPrtList[0]
        }
      }
    }
    else if(sepPrtList.length>1)
    {
      let mainprtname = ""

      //remove the original part item from the row
      for (let index = rows.length - 1; index >= 0; index--) 
      {
        //remove the original part record
        if(rows[index].fileurl===rowpart)
        {
          mainprtname = rows[index].name
          URL.revokeObjectURL(rows[index].imgurl)
          rows.splice(index,1)
        }
      }

      //create the seperated part
      let addedprts = [];
      for(let i=0; i<sepPrtList.length; i++)
      {
        let subprt = sepPrtList[i]
        let subprturl = buildpartdxfurl(subprt, parseddxf)
        
        addedprts.push(new Part(mainprtname+"_"+(i+1), 1, subprturl))

      }

      //add parts info to the part rows
      for (let part of addedprts) {
        rows.push(part);
      }

      //update the  temp table to get preview img
      tmprows.length = 0
      _pushtotemptable(addedprts) 


    }
  }


  function _addfiles(eve) {
    let fileUrl = "";
    let addedprts = [];
    for(let file of eve.target.files)
    {
      fileUrl = URL.createObjectURL(file);
      addedprts.push(new Part(file.name, 1, fileUrl))
    }

    //add parts info to the part rows
    for (let part of addedprts) {
      rows.push(part);
    }

    //update the  temp table to get preview img

    //tmprows.length = 0
    _pushtotemptable(addedprts) 

  }


  watch(
    rows,
    (newData)=>
    {
      emits('updateRows',rows)
    }

  )

  function onDelete(delrow)
  {
    for (let index = 0; index <rows.length; index++) 
    {
      if(rows[index].fileurl===delrow.fileurl)
      {
        rows.splice(index, 1);
      }
    }
  }


  function onClear()
  {
    rows.length = 0
  }



  function GetPartRows()
  {
    return rows;
  }


  defineExpose({
    GetPartRows,
  });

</script>




<style scoped>

#myFileInput {
    display:none;
}

</style>
