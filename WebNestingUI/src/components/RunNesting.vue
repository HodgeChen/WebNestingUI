<template>
    <div class="q-pa-md"></div>
    <div class="row q-col-gutter-xs">
        <div class="col-3" >
            <q-input  v-model="partSpace" type="number"  rounded standout="bg-grey-6 text-white" input-style="text-align:center" >
            <template v-slot:prepend>
                    <span>Part Space</span>
            </template>
            </q-input>
        </div>
        <div class="col-3" >
            <q-input  v-model="borderSpace" type="number"  rounded standout="bg-grey-6 text-white" input-style="text-align:center">
                <template v-slot:prepend>
                    <span>Border Space</span>
            </template>
            </q-input>
        </div>
        <div class="col-3" >
            <q-input  v-model="nestTime" type="number"  rounded standout="bg-grey-6 text-white" input-style="text-align:center">
                <template v-slot:prepend>
                    <span>Nesting Time</span>
            </template>
            </q-input>
        </div>
    </div>



    <div class="q-pa-md fit row justify-end">
        <q-btn unelevated rounded :loading=loading color="primary" size="lg"  no-caps @click="RunNesting" >
        Run Nesting
        <template v-slot:loading>
            <q-spinner-ios  class="on-left" />
            Running...
        </template>
        </q-btn>
        <span style="white-space: pre-line;"  class="q-pa-md fit row justify-end ">{{servermsg}}</span>
    </div>
</template>

<script setup>
import {ref} from "vue";
import { assemblelayout, clearlayout } from "@/assemblelayout";
import {GeomItem} from "@/GeomDataLib"
import {gethostname} from "@/global"


let props = defineProps(['parts','sheets'])
let emits = defineEmits(['updateRows'])


let partSpace = ref(5); 
let borderSpace = ref(5); 
let nestTime = ref(60);

let loading = ref(false)
let servermsg = ref("")


let APIServer = gethostname()

let nestresult = null
let nestjobid = ""

async function RunNesting()
{
    let nesttask = {}

    //clear nesting result
    if(nestresult!=null)
    {
        clearlayout(nestresult)
        emits('updateRows',[])
    }

    nesttask.Parts = _prepareParts(props.parts)
    nesttask.Materials = _prepareSheets(props.sheets)
    nesttask.NestParam = _prepareNestParam()


    await nestJob_New(nesttask)
    .then(
        jobid=>
        {
            if(jobid!=="")
            {
                nestJob_Run(jobid)
                .then(
                    jobid=>
                    {
                        if(jobid!=="")
                        {
                            nestJob_Watch(jobid)
                            .then(
                                jobid=>
                                {
                                    if(jobid!=="")
                                    {
                                        //get the nesting result
                                        nestJob_Result(jobid)
                                        nestjobid = jobid
                                    }
                                }
                            )
                        }

                    }
                )
            }
        }
    )

}

async function nestJob_Watch(jobid)
{

    let timeused = 0
    let msgstr = ""
    let timegap = 1
    let nestingstoped = false
    while(!nestingstoped)
    {
        if(timeused%timegap==0)
        {
            const requestOptions = {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                },
            };

            let res_ok = true
            let res_status = 201
            let res_status_text = ""
            await fetch(APIServer+'api/NestTask/JobStatus?jobid='+jobid, requestOptions)
            .then(
                response => {
                    //if(!response.ok){throw response}
                    //console.log(response)
                    res_ok = response.ok
                    res_status = response.status
                    res_status_text = response.statusText
                    return response.json()
                }
                )
            .then(
                data => {
                    //console.log(data)
                    if(res_ok)
                    {
                        if(data.JobID==="" || data.JobMsgType>0)
                        {
                            //alert("JobID:"+data.JobID+"-"+data.JobMsgTxt)
                            let arr = data.JobMsgTxt.split(',');
                            msgstr = arr[2]
                        }
                        else
                        {
                            let arr = data.JobMsgTxt.split(',');
                            msgstr = arr[2]
                            //console.log(data.JobMsgTxt)

                            if(arr[0]=="Running")
                            {
                                loading.value=true
                                timegap = 10
                                if(timeused+timegap>nestTime.value)
                                {
                                    timegap = 5
                                }

                            }
                            else if(arr[0]=="Stopped")
                            {
                                msgstr = ""
                                loading.value=false
                                nestingstoped = true //exit while loop
                            }
                            
                        }
                    }
                    else
                    {
                        alert("error:"+res_status+"-"+res_status_text+"\n"+data.value)
                    }

                })
            .catch(error => {
                alert("nestJob_Watch:"+error.status+"-"+error.statusText)
            });

        }
        if(msgstr!="")
        {
            servermsg.value = timeused+"s used, "+msgstr
        }
        else{
            servermsg.value = ""
        }
        
        await delay(1000)
        timeused++
    }


    return nestingstoped==true? jobid:""


}



async function nestJob_Run(jobid)
{
    console.log(jobid)
    const requestOptions = {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
        },
    };

    let res_ok = true
    let res_status = 201
    let res_status_text = ""

    let jobrunning = false
    await fetch(APIServer+'api/NestTask/JobRun?jobid='+jobid, requestOptions)
    .then(
        response => {
            //if(!response.ok){throw response}
            //console.log(response)
            res_ok = response.ok
            res_status = response.status
            res_status_text = response.statusText
            return response.json()
        }
        )
    .then(
        data => {
            if(res_ok)
            {
                //console.log(data)
                if(data.JobID==="" || data.JobMsgType>0)
                {
                    //alert("JobID:"+data.JobID+"-"+data.JobMsgTxt)
                    servermsg.value = data.JobMsgTxt
                }
                else
                {
                    //console.log("run="+data.JobID)
                    servermsg.value  = ""
                    jobrunning = true
                }
            }
            else
            {
                alert("error:"+res_status+"-"+res_status_text+"\n"+data.value)
            }

        })
    .catch(error => {
        alert("nestJob_Run:"+error.status+"-"+error.statusText)
    });

    return jobrunning==true? jobid:""
}

async function nestJob_New(nesttask)
{

    const requestOptions = {
    method: 'POST',
    mode: 'cors',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Basic xxxxxxxxxxxx'
     },
    body: JSON.stringify(nesttask)
    };

    let jobid = ""
    let res_ok = true
    let res_status = 201
    let res_status_text = ""
    await fetch(APIServer+'api/NestTask/JobNew', requestOptions)
    .then(
        response => {
            //if(!response.ok){throw response}
            //console.log(response)
            res_ok = response.ok
            res_status = response.status
            res_status_text = response.statusText
            return response.json()
        }
        )
    .then(
        data => {
            //console.log(data)
            if(res_ok)
            {
                if(data.JobID==="" || data.JobMsgType>0)
                {
                    //alert("JobID:"+data.JobID+"-"+data.JobMsgTxt)
                   
                    servermsg.value = data.JobMsgTxt //.replace(/\n/g, "<br />");
                }
                else
                {
                    //console.log(data.JobID)
                    jobid = data.JobID
                }
            }
            else
            {
                alert("error:"+res_status+"-"+res_status_text+"\n"+data.value)
            }

        })
    .catch(error => {
        alert("nestJob_New:"+error.status+"-"+error.statusText)
    });

    return jobid
}



async function nestJob_Result(jobid)
{
    const requestOptions = {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
        },
    };

    let res_ok = true
    let res_status = 201
    let res_status_text = ""
    await fetch(APIServer+'api/NestTask/JobResult?jobid='+jobid, requestOptions)
    .then(
        response => {
            //if(!response.ok){throw response}
            //console.log(response)
            res_ok = response.ok
            res_status = response.status
            res_status_text = response.statusText
            return response.json()
        }
        )
    .then(
        data => {
            //console.log(data)
            if(res_ok)
            {
                //console.log(data)
                if(data.Respons.JobMsgType>0)
                {
                    servermsg.value = data.Respons.JobMsgTxt
                }
                else
                {
                    servermsg.value = data.Respons.JobMsgTxt
                    generate_layoutView(props.parts, props.sheets, data)
                }
            }
            else
            {
                alert("error:"+res_status+"-"+res_status_text+"\n"+data.value)
            }

        })
    .catch(error => {
        alert(error.status+"-"+error.statusText)
    });
}



async function generate_layoutView(parts, sheets, nestresultjson)
{
    nestresult = assemblelayout(parts, sheets, nestresultjson)
    if(nestresult.layouts.length>0)
    {
        emits('updateRows',nestresult.layouts, nestjobid)
    }
}




function delay(milliseconds){
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}



function _prepareParts(parts)
{
    let nestParts = []

    for(let i=0; i<parts.length;i++)
    {
        let part = parts[i]
        if(part.qty<=0) {continue }

        let lines = []
        let arcs = []
        let polylines = []
        for(let entity of part.parseddxf.entities)
        {
            //console.log(entity)
            switch (entity.type) {
            case "LINE":
                lines.push([entity.vertices[0].x,entity.vertices[0].y,entity.vertices[1].x,entity.vertices[1].y])
                break
            case "CIRCLE":
                arcs.push({"Center":{"X":entity.center.x, "Y":entity.center.y}, "Radius":entity.radius, "StartAng":0, "SweepAng":2 * Math.PI})
                break
            case "ARC":
                let swpang = entity.endAngle-entity.startAngle
                if(swpang<0){swpang = swpang +Math.PI *2}
                arcs.push({"Center":{"X":entity.center.x, "Y":entity.center.y}, "Radius":entity.radius, "StartAng":entity.startAngle, "SweepAng":swpang})
                break
            case "POLYLINE":
            case "LWPOLYLINE":
                let points = []
                for(let vertice of entity.vertices)
                {
                    if (vertice.hasOwnProperty("bulge"))
                    {
                        points.push([vertice.x, vertice.y, vertice.bulge])
                    }
                    else{
                        points.push([vertice.x, vertice.y, 0])
                    }
                    
                }
                //for closed shape, add an end point
                if(entity.shape==true ){points.push([entity.vertices[0].x, entity.vertices[0].y, 0])}

                polylines.push({"Points":points})
                break
            case "SPLINE":
                let controlpoints = []

                let geomitem = new GeomItem(entity)
                let splineVertices = geomitem.vertices
                for(let vertice of splineVertices)
                {
                    controlpoints.push([vertice.x, vertice.y, 0])
                }
                polylines.push({"Points":controlpoints})
                break
            }

        }

        //create nest part object
        let nestpart = {}
        nestpart.Id = i+1
        nestpart.Name = part.name
        nestpart.Quantity = part.qty
        nestpart.Angle = "Free Rotate"
        if(lines.length>0) {nestpart.Lines = lines }
        if(arcs.length>0) {nestpart.Arcs = arcs }
        if(polylines.length>0) {nestpart.PolyLines = polylines }

        nestParts.push(nestpart)
    }

    return nestParts
}

function _prepareSheets(sheets)
{
    let nestSheets = []
    for(let i=0; i<sheets.length;i++)
    {
        let sheet = sheets[i]
        if(sheet.qty<=0) {continue }
        //console.log(sheet)
        nestSheets.push({"Name":"sheet-"+i, "Width":sheet.width, "Height": sheet.height,"Quantity": sheet.qty, "Id":i+1})
    }
    return nestSheets
}


function _prepareNestParam()
{
    let nestparam =  {
		"NestDir": "Left2Right",
		"StartCorner": "LeftBottom",
		"PartSpace": partSpace.value,
		"SheetBorder": borderSpace.value,
		"NestTime": nestTime.value
	}

    return nestparam

}



</script>