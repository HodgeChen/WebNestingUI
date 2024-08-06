export class Part
{
    constructor(name, qty, fileurl="", imgurl="", size_x=0, size_y=0, parseddxf = null, entitylist = [])
    {
        this.name=name;
        this.qty = qty;
        this.fileurl = fileurl;
        this.imgurl = imgurl;
        this.size_x = size_x;
        this.size_y = size_y;
        this.parseddxf = parseddxf;
        this.entitylist = entitylist;
    }
    
}


export class Sheet
{
    constructor(width=3000, height=1500, qty = 0)
    {
        this.id = Math.floor(Math.random() * 1000000)
        this.width = width;
        this.height = height;
        this.qty = qty;
    }

}


export class NestResult
{
    constructor()
    {
        this.nestedParts = []
        this.nestedMats = []
        this.layouts = []
    }

}


export class NestedPart{
    prtIndex = 0
    submitedCount = 0
    nestedCount = 0
    imgurl = ""
    size_x = 0
    size_y = 0
}

export class NestedMat{
    matIndex = 0
    submitedCount = 0
    nestedCount = 0
    width = 0
    height = 0
}

export class Layout{
    name = ""
    matIndex = 0
    matWidth = 0
    matHeight = 0
    duplicate = 0
    imgurl = ""
    dxfurl = ""
}

