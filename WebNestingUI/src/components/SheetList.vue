<template>
    <div class="q-pa-md">
      <q-table
        flat
        bordered
        title="Sheet List"
        :rows="rows"
        :columns="columns"
        :hide-pagination="true"
        :rows-per-page-options="[0]"
      >
        <!-- add the editable feature of the quantity property -->
        <template v-slot:body="props">
          <q-tr :props="props">

            <q-td key="width" :props="props" style="max-width: 50px;">
              <q-input 
                  v-model="props.row.width"  
                  type="number"
                  rounded standout="bg-grey-6 text-white"
                  input-style="text-align:center"
                 />
            </q-td>
            <q-td key="height" :props="props" style="max-width: 50px;">
              <q-input 
                  v-model="props.row.height"  
                  type="number"
                  rounded standout="bg-grey-6 text-white"
                  input-style="text-align:center"
                 />
            </q-td>
            <q-td key="quantity" :props="props" style="max-width: 10px;">
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

    <div class="q-pa-md fit row justify-end">
      <div class="q-gutter-md" >
        <q-btn  no-caps color="primary"  label="Clear" @click="onClear()"/>
        <q-btn no-caps color="primary"  label="Add Sheet" @click="newSheet"/>
      </div>
    </div>
  
  </template>
  
  <script setup>
    import { reactive, watch} from "vue";
    import {Sheet} from "@/model";

    let emits = defineEmits(['updateRows'])
    
    const columns = [
        { name: "width", label: "Width", field: "width", align: "center"  },
        { name: "height", label: "Height", field: "height", align: "center"  },
        { name: "quantity", label: "Quantity", field: "quantity" ,align: "center" },
        { name: "action", label: "", field: "action", align: "center" },
    ];
    const rows = reactive([]);

    
    function newSheet()
    {
        rows.push(new Sheet(3000, 1500, 1))
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
        if(rows[index].id===delrow.id)
        {
          rows.splice(index, 1);
        }
      }
    }

    function onClear()
    {
      rows.length = 0
    }



    function GetSheetRows()
    {
      return rows;
    }


    defineExpose({
      GetSheetRows,
    });

</script>
  