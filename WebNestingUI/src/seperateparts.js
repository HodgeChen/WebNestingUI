const CONNECT_TOLERANCE = 0.01
const BOXCROSS_TOLERANCE = 0.001

import {GeomDataLib} from "@/GeomDataLib"

export function seperateparts(parseddxf)
{
    //读取 dxf 图元
    let partGeomData = new GeomDataLib()
    _preparePartGeomData(parseddxf, partGeomData)
    //console.log(partGeomData)

    let looplist = _generateLoopItemsfromGeom(partGeomData, CONNECT_TOLERANCE)
    //console.log(looplist)

    let looptoplist = _generateLoopTopItemsfromLoopList(looplist)
    //console.log(looptoplist)

    let seperatedPrtList = []
    let seperatedPrtRectBoxList = []
    _buildPartListfromLoopTopList(looptoplist, seperatedPrtList, seperatedPrtRectBoxList)
    //console.log(seperatedPrtList)
    //console.log(seperatedPrtRectBoxList)

    //seperate text/mtext to each part
    if(seperatedPrtRectBoxList.length>1)
    {
        _separateText2PrtList(partGeomData, seperatedPrtRectBoxList, seperatedPrtList)
    }
    //console.log(seperatedPrtList)

    return seperatedPrtList
}
 


/** @param partGeomData {GeomDataLib}  */
function _preparePartGeomData(parseddxf, partGeomData)
{
    for(let entity of parseddxf.entities)
    {
        //console.log(entity)
        switch (entity.type) {
            case "LINE":
            case "ARC":
            case "CIRCLE":
            case "POLYLINE":
            case "LWPOLYLINE":
            case "SPLINE":
            case "TEXT":
            case "MTEXT":
                partGeomData.attachEntity(entity)
                break
        }
    }
}



/**
* @param desLoopItem {LoopItem} 
* @param entity
* @param entityIdx {number} array index
* @param srcGeomDataLib {GeomDataLib}  
*/
function _attachEntity2Loop(desLoopItem, entity, entityIdx, srcGeomDataLib, attachtype = 0)
{
    switch (entity.type) {
        case "LINE":
        case "ARC":
            desLoopItem.attachGeomItem(entity, srcGeomDataLib.linearcList[entityIdx].vertices , srcGeomDataLib.linearcList[entityIdx].rectbox, attachtype)
            break
        case "CIRCLE":
            desLoopItem.attachGeomItem(entity, srcGeomDataLib.circleList[entityIdx].vertices, srcGeomDataLib.circleList[entityIdx].rectbox, attachtype)
            break
        case "POLYLINE":
        case "LWPOLYLINE":
        case "SPLINE":
            desLoopItem.attachGeomItem(entity, srcGeomDataLib.polylineList[entityIdx].vertices, srcGeomDataLib.polylineList[entityIdx].rectbox, attachtype)
            break
    }

}



/** @param partGeomData {GeomDataLib}  */
function _generateLoopItemsfromGeom(partGeomData, tolerance)
{
    //prepare the flag for loop identification
    let geomDataFlag = {
        linearcItem: Array(partGeomData.linearcList.length).fill(0),
        circleItem: Array(partGeomData.circleList.length).fill(0),
        polylineItem: Array(partGeomData.polylineList.length).fill(0)
    }


    //create depend loop item for circle and closed polyline
    let loopItemList = []
    for(let i=0; i<partGeomData.circleList.length; i++)
    {
        let newloopitem = new loopItem()
        _attachEntity2Loop(newloopitem, partGeomData.circleList[i].entity, i, partGeomData)
        geomDataFlag.circleItem[i] = 1
        loopItemList.push(newloopitem)
    }

    if(partGeomData.polylineList.length>0)
    {
        for(let i=0; i<partGeomData.polylineList.length;i++)
        {
            if(partGeomData.polylineList[i].entity.shape==true)
            {
                let newloopitem = new loopItem()
                _attachEntity2Loop(newloopitem, partGeomData.polylineList[i].entity, i, partGeomData)
                geomDataFlag.polylineItem[i] = 1
                loopItemList.push(newloopitem)
            }
        }
    }


    //create loop for line arc and polyline left
    let bNewLoopCreated = false
    do{
        bNewLoopCreated = false
        let newloopitem = new loopItem()

        //get the first enetity of the new loop item
        if(bNewLoopCreated==false)
        {
            //find the first entity not assigned as the first one in the loop
            for(let i=0; i<partGeomData.linearcList.length;i++)
            {
                if(geomDataFlag.linearcItem[i]==0) //not assigned
                {
                    _attachEntity2Loop(newloopitem, partGeomData.linearcList[i].entity, i, partGeomData)
                    geomDataFlag.linearcItem[i] = 1
                    bNewLoopCreated = true
                    break
                }

            }
        }
        if(bNewLoopCreated==false)
        {
            //find the first entity not assigned as the first one in the loop
            for(let i=0; i<partGeomData.polylineList.length;i++)
            {
                if(geomDataFlag.polylineItem[i]==0) //nto assigned
                {
                    _attachEntity2Loop(newloopitem, partGeomData.polylineList[i].entity, i, partGeomData)
                    geomDataFlag.polylineItem[i] = 1
                    bNewLoopCreated = true
                    break
                }

            }
        }



        //look for connected entities for the created new loop
        if(bNewLoopCreated == true)
        {
            let bFoundNewEntity = false
            do{
                bFoundNewEntity = false
                for(let ii=0; ii<partGeomData.linearcList.length; ii++)
                {
                    if(geomDataFlag.linearcItem[ii]==0)
                    {
                        let entity = partGeomData.linearcList[ii].entity
                        let entityVertices =  partGeomData.linearcList[ii].vertices
                        let entityRectBox = partGeomData.linearcList[ii].rectbox


                        //compare with the end vertice of the new loop item first
                        if(isSameVertice(entityVertices.at(0), newloopitem.lastVertice, tolerance))
                        {
                            _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 0)
                            geomDataFlag.linearcItem[ii] = 1
                            bFoundNewEntity = true
                            continue
                        }
                        if(isSameVertice(entityVertices.at(0), newloopitem.firstVertice, tolerance))
                        {
                            _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 3)
                            geomDataFlag.linearcItem[ii] = 1
                            bFoundNewEntity = true
                            continue
                        }
                        if(isSameVertice(entityVertices.at(-1), newloopitem.lastVertice, tolerance))
                        {
                            _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 1)
                            geomDataFlag.linearcItem[ii] = 1
                            bFoundNewEntity = true
                            continue
                        }
                        if(isSameVertice(entityVertices.at(-1), newloopitem.firstVertice, tolerance))
                        {
                            _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 2) 
                            geomDataFlag.linearcItem[ii] = 1
                            bFoundNewEntity = true
                            continue
                        }



                        //make further compare
                        if(entityRectBox.iscross(newloopitem.rectBox, BOXCROSS_TOLERANCE))
                        {
                            let loopvertices = newloopitem.loopVertices
                            for(let jj=0; jj<loopvertices.length; jj++)
                            {
                                if(isSameVertice(loopvertices[jj],entityVertices.at(0), tolerance) ||
                                   isSameVertice(loopvertices[jj],entityVertices.at(-1), tolerance)
                                )
                                {
                                    _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 5) 
                                    geomDataFlag.linearcItem[ii] = 1
                                    bFoundNewEntity = true
                                    break
                                }
                            }
                        }

                    }
                }

                //process the polyline
                for(let ii=0; ii<partGeomData.polylineList.length; ii++)
                {
                    if(geomDataFlag.polylineItem[ii]==0)
                    {
                        let entity = partGeomData.polylineList[ii].entity
                        let entityVertices =  partGeomData.polylineList[ii].vertices
                        let entityRectBox = partGeomData.polylineList[ii].rectbox


                        //compare with the end vertice of the new loop item first
                        if(isSameVertice(entityVertices.at(0), newloopitem.lastVertice, tolerance))
                        {
                            _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 0)
                            geomDataFlag.polylineItem[ii] = 1
                            bFoundNewEntity = true
                            continue
                        }
                        if(isSameVertice(entityVertices.at(0), newloopitem.firstVertice, tolerance))
                        {
                            _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 3)
                            geomDataFlag.polylineItem[ii] = 1
                            bFoundNewEntity = true
                            continue
                        }
                        if(isSameVertice(entityVertices.at(-1), newloopitem.lastVertice, tolerance))
                        {
                            _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 1)
                            geomDataFlag.polylineItem[ii] = 1
                            bFoundNewEntity = true
                            continue
                        }
                        if(isSameVertice(entityVertices.at(-1), newloopitem.firstVertice, tolerance))
                        {
                            _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 2) 
                            geomDataFlag.polylineItem[ii] = 1
                            bFoundNewEntity = true
                            continue
                        }



                        //make further compare
                        if(entityRectBox.iscross(newloopitem.rectBox, BOXCROSS_TOLERANCE))
                        {
                            let loopvertices = newloopitem.loopVertices
                            for(let jj=0; jj<loopvertices.length; jj++)
                            {
                                if(isSameVertice(loopvertices[jj],entityVertices.at(0), tolerance) ||
                                   isSameVertice(loopvertices[jj],entityVertices.at(-1), tolerance)
                                )
                                {
                                    _attachEntity2Loop(newloopitem, entity, ii, partGeomData, 5) 
                                    geomDataFlag.polylineItem[ii] = 1
                                    bFoundNewEntity = true
                                    break
                                }
                            }
                        }

                    }
                }
            }while(bFoundNewEntity)

        }

        if(bNewLoopCreated) 
        {
            loopItemList.push(newloopitem)
        } 
        

    }while(bNewLoopCreated)

    return loopItemList

}


/** @param looplist {[GeomDataLib]}  */
function _generateLoopTopItemsfromLoopList(looplist)
{
    let loopTopItemList = []
    for(let loopitem of looplist)
    {
        let loopTopItem = new LoopTopItem(loopitem)
        if(loopTopItemList.length==0)
        {
            loopTopItemList.push(loopTopItem)
        }
        else
        {
            _addLoopTopItem2LoopTopList(loopTopItemList, loopTopItem)
        }
    }

    return loopTopItemList

}


/** @param loopTopItemList {[LoopTopItem]}  */
/** @param loopTopItem {LoopTopItem}  */
function _addLoopTopItem2LoopTopList(loopTopItemList, loopTopItem)
{
    let bIncluded = false  //flag, check if the looptopitem could be included in other looptopitem assigned
    //只有具有唯一封闭轮廓的图形才能包含其他轮廓
    //检查待分配轮廓是否包含已分配轮廓
    if(loopTopItem.cadLoopItem.isClosed==true && loopTopItem.cadLoopItem.isMessLoop==false)
    {
        for(let i=loopTopItemList.length-1; i>=0; i--)
        {

            let assignedCadLoopItem = loopTopItemList[i].cadLoopItem
            let cadLoopItem = loopTopItem.cadLoopItem
            if(cadLoopItem.rectBox.include(assignedCadLoopItem.rectBox))
            {
                //如果是开发轮廓，直接包含处理
                if(assignedCadLoopItem.isClosed==false || loopTopItem.cadLoopItem.isMessLoop==true)
                {
                    bIncluded = true
                    loopTopItem.subLoopTopItemList.push(loopTopItemList[i])
                    loopTopItemList.splice(i,1)
                }
                else
                {
                    if(checkLoopVerticesInclude(cadLoopItem.loopVertices, assignedCadLoopItem.loopVertices))
                    {
                        bIncluded = true
                        loopTopItem.subLoopTopItemList.push(loopTopItemList[i])
                        loopTopItemList.splice(i,1)
                    }
                }
            }
        }
    }


    let bBeIncluded = false
    if(!bIncluded)
    {
        for (let assignedLoopTopItem of loopTopItemList)
        {
            //检查已分配轮廓矩形框是否包含待分配轮廓矩形框
            if(assignedLoopTopItem.cadLoopItem.rectBox.include(loopTopItem.cadLoopItem.rectBox) )
            {
                //进一步检查是否精确包含
                if(checkLoopVerticesInclude(assignedLoopTopItem.cadLoopItem.loopVertices, loopTopItem.cadLoopItem.loopVertices))
                {
                    bBeIncluded = true

                    _addLoopTopItem2LoopTopList(assignedLoopTopItem.subLoopTopItemList, loopTopItem)
                }
            }

        }
    }

    if(!bBeIncluded)
    {
        loopTopItemList.push(loopTopItem)
    }
}

/** 
 * @param looptoplist {[LoopTopItem]}  
 * @param partSepList {[]}   dxf entity list
*/
function _buildPartListfromLoopTopList(looptoplist, partSepList=[], partRectBoxList=[])
{
    for(let i=0; i<looptoplist.length; i++)
    {
        let looptopitem = looptoplist[i]
        if(looptopitem.cadLoopItem.isClosed==true )
        {
            let partEntityList= looptopitem.cadLoopItem.loopEntityList
            let partRectBox = looptopitem.cadLoopItem.rectBox
        
            let sublooptoplist = looptopitem.subLoopTopItemList
            for(let j=0; j<sublooptoplist.length; j++)
            {
                let sublooptopitem = sublooptoplist[j]
                partEntityList.push(...sublooptopitem.cadLoopItem.loopEntityList)
                partRectBox.unin(sublooptopitem.cadLoopItem.rectBox)

                _buildPartListfromLoopTopList(sublooptopitem.subLoopTopItemList, partSepList,partRectBoxList)
            }

            partSepList.push(partEntityList)
            partRectBoxList.push(partRectBox)
        }
    }
}

/** 
 * @param textList {{[]}}   part geom data list
 * @param prtRectBoxList {[]}   RectBox list
 * @param prtList {[]}   dxf entity list
*/
function _separateText2PrtList(prtgeomdata, prtRectBoxList, prtList)
{

    if(prtgeomdata.textList.length>0)
    {
        let textList = prtgeomdata.textList
        for(let i=0; i<textList.length; i++)
        {
            let text= textList[i]
            for(let j=0; j<prtRectBoxList.length; j++)
            {
                if(prtRectBoxList[j].iscross(text.rectbox))
                {
                    prtList[j].push(text.entity)
                }
            }
        }
    }

    if(prtgeomdata.mtextList.length>0)
    {
        let mtextList = prtgeomdata.mtextList
        for(let i=0; i<mtextList.length; i++)
        {
            let mtext= mtextList[i]
            for(let j=0; j<prtRectBoxList.length; j++)
            {
                if(prtRectBoxList[j].iscross(mtext.rectbox))
                {
                    prtList[j].push(mtext.entity)
                }
            }
        }
    }

}


class loopItem
{
    #loopEntityList
    #rectBox
    #verticeList
    #messFlag

    constructor()
    {
        this.#loopEntityList = []
        this.#rectBox = null
        this.#verticeList = []
        this.#messFlag = false
    }

    //attachtype
    //0 = joint to end of the loop
    //1 = reverse the entity and joint to end of the loop
    //2 = joint to head of the loop
    //3 = reverse the entity and joint to head of the loop
    //4 = messed loop item
    attachGeomItem(entity, vertices, rectbox, attachtype=0)
    {
        this.#loopEntityList.push(entity)
        if(vertices.length>0)
        {
            if(this.#verticeList.length==0){this.#verticeList.push(...vertices)}
            else
            {
                if(attachtype==1 || attachtype==3) {vertices.reverse() }
                if(attachtype==0 || attachtype==1) {this.#verticeList.push(...vertices.slice(1))}
                if(attachtype==2 || attachtype==3) {this.#verticeList = vertices.concat(this.#verticeList.slice(1))}
                if(attachtype==5)
                {
                    this.#verticeList.push(...vertices)
                    this.#messFlag = true
                }
            }
        }

        if(this.#rectBox==null)
        {
            this.#rectBox = rectbox
        }
        else
        {
            this.#rectBox.unin(rectbox)
        }
    }


    get lastVertice()
    {
        return this.#verticeList.at(-1)
    }
    get firstVertice()
    {
        return this.#verticeList.at(0)
    }

    get loopVertices()
    {
        return this.#verticeList
    }

    get isClosed()
    {
        if(isSameVertice(this.lastVertice, this.firstVertice, CONNECT_TOLERANCE ))
        {return true}
        else
        {return false}
        
    }

    get isMessLoop()
    {
        return this.#messFlag
    }

    /** @returns {RectBox} */
    get rectBox()
    {
        return this.#rectBox
    }

    /** @returns loop entity list*/
    get loopEntityList()
    {
        return this.#loopEntityList
    }


}




class LoopTopItem
{
    #cadLoopItem
    #subLoopTopItemList
    constructor(cadloopitem)
    {
        this.#cadLoopItem = cadloopitem
        this.#subLoopTopItemList = []
    }

    /** @returns {loopItem} */
    get cadLoopItem()
    {
        return this.#cadLoopItem
    }

    set subLoopTopItemList(loopTopList)
    {
        this.#subLoopTopItemList = loopTopList
    }

    /**@returns {[LoopTopItem]}  */
    get subLoopTopItemList()
    {
        return this.#subLoopTopItemList
    }
}



function checkLoopVerticesInclude(verticesMain, verticesSub)
{
    for(let vertice of verticesSub)
    {
        if(_isOnEdge(vertice, verticesMain)){continue}
        if(!_isInside(vertice, verticesMain)){return false}
    }

    return true

}

function _isInside(vertice, verticesMain) 
{
    var x = vertice.x, y = vertice.y;
    
    var inside = false;
    for (var i = 0, j = verticesMain.length - 1; i < verticesMain.length; j = i++) {
        var xi = verticesMain[i].x, yi = verticesMain[i].y;
        var xj = verticesMain[j].x, yj = verticesMain[j].y;
        
        var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

function _isOnEdge(vertice, verticesMain)
{
    var x = vertice.x, y = vertice.y;

    for(let tmpvertice of verticesMain)
    {
        if(Math.abs(tmpvertice.x-x)<CONNECT_TOLERANCE && Math.abs(tmpvertice.y-y)<CONNECT_TOLERANCE)
        {
            //on the edge
            return true
        }
    }

    for (var i = 0, j = verticesMain.length - 1; i < verticesMain.length; j = i++) {
        var xi = verticesMain[i].x, yi = verticesMain[i].y;
        var xj = verticesMain[j].x, yj = verticesMain[j].y;
        
        if(x>=Math.min(xi, xj)-CONNECT_TOLERANCE && 
            x<=Math.max(xi, xj)+CONNECT_TOLERANCE &&
            y>=Math.min(yi, yj)-CONNECT_TOLERANCE &&
            y<=Math.max(yi, yj)+CONNECT_TOLERANCE &&
            Math.abs((y-yi)*(xj-xi)-(yj-yi)*(x-xi))<CONNECT_TOLERANCE  )
        {
            return true
        }

    }

    return false

}






function isSameVertice(v1, v2, tolerval=CONNECT_TOLERANCE)
{
    if(Math.abs(v1.x-v2.x)<tolerval && Math.abs(v1.y-v2.y)<tolerval)
    {
        return true
    }
    else
    {
        return false
    }
}











