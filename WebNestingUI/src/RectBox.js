
export class RectBox
{
    constructor(minX, minY, maxX, maxY)
    {
       this.min_X = minX
       this.min_Y = minY
       this.max_X = maxX
       this.max_Y = maxY
    }

    unin(rectbox)
    {
        this.min_X = this.min_X<rectbox.min_X?this.min_X:rectbox.min_X
        this.min_Y = this.min_Y<rectbox.min_Y?this.min_Y:rectbox.min_Y
        this.max_X = this.max_X>rectbox.max_X?this.max_X:rectbox.max_X
        this.max_Y = this.max_Y>rectbox.max_Y?this.max_Y:rectbox.max_Y
    }
    size()
    {
        return [this.max_X-this.min_X, this.max_Y-this.min_Y]
    }
    expand(val)
    {
        this.min_X = this.min_X-val
        this.min_Y = this.min_Y-val
        this.max_X = this.max_X+val
        this.max_Y = this.max_Y+val
    }

    include(rectbox)
    {
        if(this.min_X<rectbox.min_X &&
            this.min_Y<rectbox.min_Y &&
            this.max_X>rectbox.max_X &&
            this.max_Y>rectbox.max_Y
            )
        {
            return true

        }
        else
        {
            return false
        }
    }



    iscross(rectbox, TOL = 0.0)
    {
        //判断两个矩形是否相交
        //(x1,y1) (x2,y2)为第一个矩形左下和右上角的两个点
        //(x3,y3) (x4,y4)为第二个矩形左下角和右上角的两个点
        //max(x1, x3) <= min(x2, x4) and max(y1, y3) <= min(y2, y4)
        let desrect = new RectBox(rectbox.min_X-TOL, rectbox.min_Y-TOL, rectbox.max_X+TOL, rectbox.max_Y+TOL)

        if (Math.max(this.min_X, desrect.min_X) <= Math.min(this.max_X, desrect.max_X) && 
        Math.max(this.min_Y, desrect.min_Y) <= Math.min(this.max_Y, desrect.max_Y)) 
        { return true; }
        else 
        { return false; }
    }
}
