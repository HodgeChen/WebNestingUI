import {NestResult, Layout} from "@/model";
import { saveAs } from "file-saver";

let dxfwritemodule = {"AppId":1,"Arc":2,"Block":3,"BlockRecord":4,"Circle":5,"Cylinder":6,"Dictionary":8,"DimStyleTable":9,"Ellipse":10,"Face":11,"Handle":12,"Layer":13,"Line":14,"Line3d":15,"LineType":16,"Point":17,"Polyline":18,"Polyline3d":19,"Spline":20,"Table":21,"TagsManager":22,"Text":23,"TextStyle":24,"Viewport":26,"MText":27}
var Drawing = require('Drawing')
var Line = require(dxfwritemodule.Line);
var Arc = require(dxfwritemodule.Arc);
var Circle = require(dxfwritemodule.Circle);
var Polyline = require(dxfwritemodule.Polyline);
var Point = require(dxfwritemodule.Point);
var Spline = require(dxfwritemodule.Spline)
var Text = require(dxfwritemodule.Text)
var MText = require(dxfwritemodule.MText)
var TextStyle = require(dxfwritemodule.TextStyle)

export function assemblelayout(partsdata, sheetsdata, layoutcollect)
{
    let nestresult = new NestResult()

    for(let sheetlayout of layoutcollect.Sheets)
    {
        
        let dxfdraw = new Drawing();
        dxfdraw.setUnits('Decimeters');

        let layout = new Layout()
        layout.name = sheetlayout.SheetName
        layout.matIndex = sheetlayout.MaterialId-1
        layout.matWidth = sheetsdata[layout.matIndex].width
        layout.matHeight = sheetsdata[layout.matIndex].height
        layout.duplicate = sheetlayout.Count

        //Create material entity of the sheet layout
        dxfdraw.addLayer('SheetMat', Drawing.ACI.WHITE, 'CONTINUOUS')
        .setActiveLayer('SheetMat')
        .drawRect(0, 0, layout.matWidth, layout.matHeight);

        for(let partpos of sheetlayout.PartPosList)
        {
            attachPrt2Sheet(dxfdraw, partpos, partsdata)
        }

        var b = new Blob([dxfdraw.toDxfString()], {type: 'application/dxf'});

        // let dxfname =  Date.now().toString()+".dxf"
        // saveAs(b, dxfname);

        layout.dxfurl = URL.createObjectURL(b);
        nestresult.layouts.push(layout)

    }

    return nestresult
}

export function clearlayout(nestresult)
{
    let layoutqty = nestresult.layouts.length
    for (let i=0; i<layoutqty; i++)
    {
        URL.revokeObjectURL(nestresult.layouts[i].dxfurl)
    }
    nestresult = null
}



/**`
 * 
 * @param {[]}  partentitys part entity list 
 * @param {*} srcparseddxf parsed dxf list 
 * @returns dxf URL object
 */
export function buildpartdxfurl(partentitys, srcparseddxf)
{

    let dxfdraw = new Drawing();
    dxfdraw.setUnits('Decimeters');

    //add part layers
    if(srcparseddxf.tables && srcparseddxf.tables.layer)
    {
        for (const [, layer] of Object.entries(srcparseddxf.tables.layer.layers)) {
            if(!dxfdraw.layers.hasOwnProperty(layer.name))
            {
                dxfdraw.addLayer(layer.name, layer.colorIndex)
            }
        }
    }

   //add text style
    if(srcparseddxf.tables && srcparseddxf.tables.style)
    {
        let styleTable = dxfdraw.tables["STYLE"]
        for (const [, style] of Object.entries(srcparseddxf.tables.style.styles)) {

            // console.log(style.bigFont)//4--
            // console.log(style.fixedTextHeight)//40
            // console.log(style.font)//3--
            // console.log(style.lastHeight)//42
            // console.log(style.obliqueAngle)//50--
            // console.log(style.standardFlag)//70
            // console.log(style.styleName)//2
            // console.log(style.textGenerationFlag)//71--
            // console.log(style.widthFactor)//41

            let hasStyle = false
            for(let i=0; i<styleTable.elements.length;i++)
            {
                let textStyle = styleTable.elements[i]
                if(textStyle.name.toLowerCase()==style.styleName.toLowerCase())
                {
                    if(style.font) {textStyle.setFont(style.font)}
                    if(style.bigFont) {textStyle.setBigFont(style.bigFont)}
                    if(style.obliqueAngle) {textStyle.setObliqueAngle(style.obliqueAngle)}
                    if(style.textGenerationFlag) {textStyle.setTextGenerationFlag(style.textGenerationFlag)}
                    if(style.widthFactor) {textStyle.setWidthFactor(style.widthFactor)}
                    if(style.standardFlag) {textStyle.setStandardFlag(style.standardFlag)}
                    if(style.lastHeight) {textStyle.setLastHeight(style.lastHeight)}
                    if(style.fixedTextHeight) {textStyle.setFixedTextHeight(style.fixedTextHeight)}
                    if(style.xData) {textStyle.setXData(style.xData)}
                    if(style.xFont) {textStyle.setXFont(style.xFont)}
                    hasStyle = true
                }
            }

            if(!hasStyle)
            {
                let textStyle = new TextStyle(style.styleName, style.font);
                if(style.bigFont) {textStyle.setBigFont(style.bigFont)}
                if(style.obliqueAngle) {textStyle.setObliqueAngle(style.obliqueAngle)}
                if(style.textGenerationFlag) {textStyle.setTextGenerationFlag(style.textGenerationFlag)}
                if(style.widthFactor) {textStyle.setWidthFactor(style.widthFactor)}
                if(style.standardFlag) {textStyle.setStandardFlag(style.standardFlag)}
                if(style.lastHeight) {textStyle.setLastHeight(style.lastHeight)}
                if(style.fixedTextHeight) {textStyle.setFixedTextHeight(style.fixedTextHeight)}
                if(style.xData) {textStyle.setXData(style.xData)}
                if(style.xFont) {textStyle.setXFont(style.xFont)}
                styleTable.add(textStyle)
            }

        }
    }


    for(let entity of partentitys)
    {
        let points = []
        switch (entity.type) {
            case "LINE":
                let line = new Line(entity.vertices[0].x, entity.vertices[0].y, entity.vertices[1].x, entity.vertices[1].y)
                if(entity.colorIndex)(line.setColorNumber(entity.colorIndex))
                else if (entity.color && entity.color !== -1)(line.setTrueColor(entity.color))
                dxfdraw.setActiveLayer(entity.layer)
                dxfdraw.activeLayer.addShape(line)
    
                break
    
            case "POLYLINE":
            case "LWPOLYLINE":
                points = []
                for(let vertice of entity.vertices)
                {
                    if (vertice.hasOwnProperty("bulge"))
                    {
                        points.push([vertice.x, vertice.y, vertice.bulge])
                    }
                    else{
                        points.push([vertice.x, vertice.y])
                    }
                }
    
                let polyline = new Polyline(points, entity.shape)
                if(entity.colorIndex)(polyline.setColorNumber(entity.colorIndex))
                else if (entity.color && entity.color !== -1)(polyline.setTrueColor(entity.color))
    
                dxfdraw.setActiveLayer(entity.layer)
                dxfdraw.activeLayer.addShape(polyline)
    
                break
            case "ARC":
                let arc = new Arc(entity.center.x, entity.center.y, entity.radius, entity.startAngle*180/Math.PI, entity.endAngle*180/Math.PI)
                if(entity.colorIndex)(arc.setColorNumber(entity.colorIndex))
                else if (entity.color && entity.color !== -1)(arc.setTrueColor(entity.color))
    
                dxfdraw.setActiveLayer(entity.layer)
                dxfdraw.activeLayer.addShape(arc)
    
                break
    
    
            case "CIRCLE":
                let circle = new Circle(entity.center.x, entity.center.y, entity.radius)
                if(entity.colorIndex)(circle.setColorNumber(entity.colorIndex))
                else if (entity.color && entity.color !== -1)(circle.setTrueColor(entity.color))
    
                dxfdraw.setActiveLayer(entity.layer)
                dxfdraw.activeLayer.addShape(circle)
    
                break
    
            case "POINT":
                let point = new Point(entity.position.x, entity.position.y)
                if(entity.colorIndex)(point.setColorNumber(entity.colorIndex))
                else if (entity.color && entity.color !== -1)(point.setTrueColor(entity.color))
    
                dxfdraw.setActiveLayer(entity.layer)
                dxfdraw.activeLayer.addShape(point)
    
                break
            case "SPLINE":
                points = []
                for(let point of entity.controlPoints)
                {
                    points.push([point.x, point.y])
                }
                let spline = new Spline(points, entity.degreeOfSplineCurve, entity.knotValues)
                if(entity.colorIndex)(spline.setColorNumber(entity.colorIndex))
                else if (entity.color && entity.color !== -1)(point.setTrueColor(entity.color))
    
                dxfdraw.setActiveLayer(entity.layer)
                dxfdraw.activeLayer.addShape(spline)
    
                break

            case "TEXT":

                let text = new Text(entity.startPoint.x, entity.startPoint.y, entity.textHeight, entity.text, entity.halign, entity.valign)
    
                if(entity.colorIndex)(text.setColorNumber(entity.colorIndex))
                else if (entity.color && entity.color !== -1)(text.setTrueColor(entity.color))
    
                if(entity.style)(text.setTextStyle(entity.style))
                if(entity.rotation){text.setTextRotation(entity.rotation)}


                dxfdraw.setActiveLayer(entity.layer)
                dxfdraw.activeLayer.addShape(text)
    
                break
            case "MTEXT":
                let mtext = new MText(entity.position.x, entity.position.y, entity.height, entity.width, entity.text, entity.attachmentPoint, entity.drawingDirection)

                if(entity.colorIndex)(mtext.setColorNumber(entity.colorIndex))
                else if (entity.color && entity.color !== -1)(mtext.setTrueColor(entity.color))

                if(entity.style)(mtext.setTextStyle(entity.style))
                if(entity.lineSpacingStyle)(mtext.setSpacingStyle(entity.lineSpacingStyle))
                if(entity.lineSpacingFactor)(mtext.setSpacingFactor(entity.lineSpacingFactor))

                dxfdraw.setActiveLayer(entity.layer)
                dxfdraw.activeLayer.addShape(mtext)

                break
        }
    }

    var b = new Blob([dxfdraw.toDxfString()], {type: 'application/dxf'});

    // let dxfname =  Date.now().toString()+".dxf"
    // saveAs(b, dxfname);

    return URL.createObjectURL(b)
}




function attachPrt2Sheet(dxfdraw, partpos, partsdata)
{
    //console.log('attachPrt2Sheet is called')
    let partdxf = partsdata[partpos.PartId-1].parseddxf

    let prt_x = partpos.TransX
    let prt_y = partpos.TransY
    let prt_ang = partpos.RotateAng

    //add part layers
    if(partdxf.tables && partdxf.tables.layer)
    {
        for (const [, layer] of Object.entries(partdxf.tables.layer.layers)) {
            if(!dxfdraw.layers.hasOwnProperty(layer.name))
            {
                dxfdraw.addLayer(layer.name, layer.colorIndex)
            }
        }
    }


    //add text style
    if(partdxf.tables && partdxf.tables.style)
    {
        let styleTable = dxfdraw.tables["STYLE"]
        for (const [, style] of Object.entries(partdxf.tables.style.styles)) {

            // console.log(style.bigFont)//4--
            // console.log(style.fixedTextHeight)//40
            // console.log(style.font)//3--
            // console.log(style.lastHeight)//42
            // console.log(style.obliqueAngle)//50--
            // console.log(style.standardFlag)//70
            // console.log(style.styleName)//2
            // console.log(style.textGenerationFlag)//71--
            // console.log(style.widthFactor)//41

            let hasStyle = false
            for(let i=0; i<styleTable.elements.length;i++)
            {
                let textStyle = styleTable.elements[i]
                if(textStyle.name.toLowerCase()==style.styleName.toLowerCase())
                {
                    if(style.font) {textStyle.setFont(style.font)}
                    if(style.bigFont) {textStyle.setBigFont(style.bigFont)}
                    if(style.obliqueAngle) {textStyle.setObliqueAngle(style.obliqueAngle)}
                    if(style.textGenerationFlag) {textStyle.setTextGenerationFlag(style.textGenerationFlag)}
                    if(style.widthFactor) {textStyle.setWidthFactor(style.widthFactor)}
                    if(style.standardFlag) {textStyle.setStandardFlag(style.standardFlag)}
                    if(style.lastHeight) {textStyle.setLastHeight(style.lastHeight)}
                    if(style.fixedTextHeight) {textStyle.setFixedTextHeight(style.fixedTextHeight)}
                    if(style.xData) {textStyle.setXData(style.xData)}
                    if(style.xFont) {textStyle.setXFont(style.xFont)}

                    hasStyle = true
                }
            }

            if(!hasStyle)
            {
                let textStyle = new TextStyle(style.styleName, style.font);
                if(style.bigFont) {textStyle.setBigFont(style.bigFont)}
                if(style.obliqueAngle) {textStyle.setObliqueAngle(style.obliqueAngle)}
                if(style.textGenerationFlag) {textStyle.setTextGenerationFlag(style.textGenerationFlag)}
                if(style.widthFactor) {textStyle.setWidthFactor(style.widthFactor)}
                if(style.standardFlag) {textStyle.setStandardFlag(style.standardFlag)}
                if(style.lastHeight) {textStyle.setLastHeight(style.lastHeight)}
                if(style.fixedTextHeight) {textStyle.setFixedTextHeight(style.fixedTextHeight)}
                if(style.xData) {textStyle.setXData(style.xData)}
                if(style.xFont) {textStyle.setXFont(style.xFont)}
                styleTable.add(textStyle)
            }
        }
    }


    
    //add entity
    for(let entity of partdxf.entities)
    {
        switch (entity.type) {
        case "LINE":
            let newvertice0 = trasfer(entity.vertices[0],prt_x, prt_y, prt_ang) 
            let newvertice1 = trasfer(entity.vertices[1],prt_x, prt_y, prt_ang) 

            let line = new Line(newvertice0.x, newvertice0.y, newvertice1.x, newvertice1.y)
            if(entity.colorIndex)(line.setColorNumber(entity.colorIndex))
            else if (entity.color && entity.color !== -1)(line.setTrueColor(entity.color))

            dxfdraw.setActiveLayer(entity.layer)
            dxfdraw.activeLayer.addShape(line)

            break

        case "POLYLINE":
        case "LWPOLYLINE":
            let points = []
            for(let vertice of entity.vertices)
            {
                let newvertice = trasfer(vertice,prt_x, prt_y, prt_ang)
                if (vertice.hasOwnProperty("bulge"))
                {
                    points.push([newvertice.x, newvertice.y, vertice.bulge])
                }
                else{
                    points.push([newvertice.x, newvertice.y])
                }
            }

            let polyline = new Polyline(points, entity.shape)
            if(entity.colorIndex)(polyline.setColorNumber(entity.colorIndex))
            else if (entity.color && entity.color !== -1)(polyline.setTrueColor(entity.color))

            dxfdraw.setActiveLayer(entity.layer)
            dxfdraw.activeLayer.addShape(polyline)

            break
        case "ARC":
            let arc_center = trasfer(entity.center,prt_x, prt_y, prt_ang) 
            let arc = new Arc(arc_center.x, arc_center.y, entity.radius, (entity.startAngle+prt_ang)*180/Math.PI, (entity.endAngle+prt_ang)*180/Math.PI)

            if(entity.colorIndex)(arc.setColorNumber(entity.colorIndex))
            else if (entity.color && entity.color !== -1)(arc.setTrueColor(entity.color))

            dxfdraw.setActiveLayer(entity.layer)
            dxfdraw.activeLayer.addShape(arc)

            break


        case "CIRCLE":
            let cir_center = trasfer(entity.center,prt_x, prt_y, prt_ang) 

            let circle = new Circle(cir_center.x, cir_center.y, entity.radius)
            if(entity.colorIndex)(circle.setColorNumber(entity.colorIndex))
            else if (entity.color && entity.color !== -1)(circle.setTrueColor(entity.color))

            dxfdraw.setActiveLayer(entity.layer)
            dxfdraw.activeLayer.addShape(circle)

            break

        case "POINT":
            let ptpos = trasfer(entity.position,prt_x, prt_y, prt_ang) 

            let point = new Point(ptpos.x, ptpos.y)
            if(entity.colorIndex)(point.setColorNumber(entity.colorIndex))
            else if (entity.color && entity.color !== -1)(point.setTrueColor(entity.color))

            dxfdraw.setActiveLayer(entity.layer)
            dxfdraw.activeLayer.addShape(point)

            break

        case "SPLINE":
            let ctlpoints = []
            for(let point of entity.controlPoints)
            {
                let ctlpt = trasfer(point,prt_x, prt_y, prt_ang) 
                ctlpoints.push([ctlpt.x, ctlpt.y])
            }
            let spline = new Spline(ctlpoints, entity.degreeOfSplineCurve, entity.knotValues)
            if(entity.colorIndex)(point.setColorNumber(entity.colorIndex))
            else if (entity.color && entity.color !== -1)(point.setTrueColor(entity.color))

            dxfdraw.setActiveLayer(entity.layer)
            dxfdraw.activeLayer.addShape(spline)

            break

        case "TEXT":
            let textpos = trasfer(entity.startPoint, prt_x, prt_y, prt_ang) 
  
            let text = new Text(textpos.x, textpos.y, entity.textHeight, entity.text, entity.halign, entity.valign)

            if(entity.colorIndex)(text.setColorNumber(entity.colorIndex))
            else if (entity.color && entity.color !== -1)(text.setTrueColor(entity.color))

            if(entity.style)(text.setTextStyle(entity.style))

            let textangle = prt_ang*180/Math.PI
            if(entity.rotation){textangle = entity.rotation + textangle}
            if(Math.abs(textangle)>0.1){text.setTextRotation(textangle)}

            dxfdraw.setActiveLayer(entity.layer)
            dxfdraw.activeLayer.addShape(text)

            break

        case "MTEXT":
            let mtextpos = trasfer(entity.position, prt_x, prt_y, prt_ang) 

            let mtext = new MText(mtextpos.x, mtextpos.y, entity.height, entity.width, entity.text, entity.attachmentPoint, entity.drawingDirection)

            if(entity.colorIndex)(mtext.setColorNumber(entity.colorIndex))
            else if (entity.color && entity.color !== -1)(mtext.setTrueColor(entity.color))

            if(entity.style)(mtext.setTextStyle(entity.style))
            if(entity.lineSpacingStyle)(mtext.setSpacingStyle(entity.lineSpacingStyle))
            if(entity.lineSpacingFactor)(mtext.setSpacingFactor(entity.lineSpacingFactor))

            let mtextangle = prt_ang*180/Math.PI
            if(entity.rotation){mtextangle = entity.rotation + mtextangle}
            if(Math.abs(mtextangle)>0.1){mtext.setTextRotation(mtextangle)}

            dxfdraw.setActiveLayer(entity.layer)
            dxfdraw.activeLayer.addShape(mtext)

            break

        }
    }
}







function trasfer(vertice, trans_x, trans_y, rotate_ang)
{
    let newvertice = {x:0,y:0}
    newvertice.x = (vertice.x*Math.cos(rotate_ang)-vertice.y*Math.sin(rotate_ang)+trans_x).toFixed(3)
    newvertice.y = (vertice.x*Math.sin(rotate_ang)+vertice.y*Math.cos(rotate_ang)+trans_y).toFixed(3)

    return newvertice
}

