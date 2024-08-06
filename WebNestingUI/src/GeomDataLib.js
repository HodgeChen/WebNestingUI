const SPLINE_SUBDIVISION = 4

/** Target angle for each segment of tessellated arc. */
const arcTessellationAngle =  10 / 180 * Math.PI

/** Divide arc to at least the specified number of segments. */
const minArcTessellationSubdivisions =  8

import {RectBox} from "@/RectBox"


export class GeomDataLib
{
    #linearcList
    #circleList
    #polylineList
    #textList
    #mtextList

    constructor()
    {
        this.#linearcList = []
        this.#circleList = []
        this.#polylineList = []
        this.#textList = []
        this.#mtextList = []
    }



    attachEntity(entity)
    {
        switch (entity.type) {
            case "LINE":
            case "ARC":
                this.#linearcList.push(new GeomItem(entity))
                break
            case "CIRCLE":
                this.#circleList.push(new GeomItem(entity))
                break
            case "POLYLINE":
            case "LWPOLYLINE":
            case "SPLINE":
                this.#polylineList.push(new GeomItem(entity))
                break
            case "TEXT":
                this.#textList.push(new GeomItem(entity))
                break
            case "MTEXT":
                this.#mtextList.push(new GeomItem(entity))
                break
        }
    }

    /** @returns {[GeomItem]} */
    get circleList()
    {
        return this.#circleList
    }

    /** @returns {[GeomItem]} */
    get linearcList()
    {
        return this.#linearcList
    }

    /** @returns {[GeomItem]} */
    get polylineList()
    {
        return this.#polylineList
    }

    /** @returns {[GeomItem]} */
    get textList()
    {
        return this.#textList
    }
    get mtextList()
    {
        return this.#mtextList
    }
}




export class GeomItem
{
    constructor(entity)
    {
        this.entity = entity
        this.vertices = this.#generateGeom2Vertices(entity)
        this.rectbox = this.#getVerticesRectBox(this.vertices)
    }

    #generateGeom2Vertices(entity)
    {
    
        let vertices = []
        switch (entity.type) {
            case "LINE":
                vertices = entity.vertices
                break
            case "ARC":
                vertices = this.#GenerateArcVertices(entity.center, entity.radius, entity.startAngle, entity.endAngle)
                break
            case "CIRCLE":
                vertices = this.#GenerateArcVertices(entity.center, entity.radius, 0,  Math.PI*2)
                break
            case "POLYLINE":
            case "LWPOLYLINE":
                vertices = this.#GeneratePolyLineVertices(entity)
                break
            case "SPLINE":
                vertices = this.#GenerateSplineVertices(entity)
                break
            case "TEXT":
                vertices = this.#GenerateTextVertices(entity)
                break
            case "MTEXT":
                vertices = this.#GenerateMTextVertices(entity)
                break
        }
        return vertices
    }
    
    #GenerateArcVertices(center, radius, startAngle, endAngle) 
    {
        let vertices = []
        while (endAngle <= startAngle) {
        endAngle += Math.PI * 2
        }
    
        const arcAngle = endAngle - startAngle
    
        let numSegments = Math.floor(arcAngle / arcTessellationAngle)
        if (numSegments === 0) {
            numSegments = 1
        }
        const step = arcAngle / numSegments
    
        for (let i = 0; i <= numSegments; i++) {
            let a = startAngle + i * step
            vertices.push({x: center.x+radius * Math.cos(a), y: center.y+radius * Math.sin(a)})
        }
        return vertices
    }
    
    #GeneratePolyLineVertices(entity)
    {
        let entityVertices = entity.vertices
        let verticesCount = entity.vertices.length
    
        let vertices = []
        for(let i=0; i<verticesCount; i++)
        {
            if(i>0 && entityVertices[i-1].hasOwnProperty("bulge"))
            {
                let bulgvertices = this.#GenerateBulgeVertices(entityVertices[i-1], entityVertices[i], entityVertices[i-1].bulge) 
                vertices.push(...bulgvertices)
            }
            else
            {
                vertices.push({x: entityVertices[i].x, y: entityVertices[i].y})
            }
        }
    
        if(entity.shape==true ){vertices.push({x: entityVertices[0].x, y: entityVertices[0].y})}
    
        return vertices
    }
    
    
    #GenerateBulgeVertices(startVtx, endVtx, bulge) 
    {
        let vertices = []
    
        if(bulge==0)
        {
            vertices.push({x: endVtx.x, y: endVtx.y})
            return vertices
        }
    
        const a = 4 * Math.atan(bulge)
        const aAbs = Math.abs(a)
        if (aAbs < arcTessellationAngle) {
            vertices.push({x:endVtx.x, y:endVtx.y})
            return
        }
        const ha = a / 2
        const sha = Math.sin(ha)
        const cha = Math.cos(ha)
        const d = {x: endVtx.x - startVtx.x, y: endVtx.y - startVtx.y}
        const dSq = d.x * d.x + d.y * d.y
        if (dSq < Number.MIN_VALUE * 2) {
            /* No vertex is pushed since end vertex is duplicate of start vertex. */
            return
        }
        const D = Math.sqrt(dSq)
        let R = D / 2 / sha
        d.x /= D
        d.y /= D
        const center = {
            x: (d.x * sha - d.y * cha) * R + startVtx.x,
            y: (d.x * cha + d.y * sha) * R + startVtx.y
        }
    
        let numSegments = Math.floor(aAbs / arcTessellationAngle)
        if (numSegments < minArcTessellationSubdivisions) {
            numSegments = minArcTessellationSubdivisions
        }
        if (numSegments > 1) {
            const startAngle = Math.atan2(startVtx.y - center.y, startVtx.x - center.x)
            const step = a / numSegments
            if (a < 0) {
                R = -R
            }
            for (let i = 1; i < numSegments; i++) {
                const a = startAngle + i * step
                const v =  {x:center.x + R * Math.cos(a), y:center.y + R * Math.sin(a)}   
                vertices.push(v)
            }
        }
        vertices.push({x:endVtx.x, y:endVtx.y})
    
        return vertices
    }
    
    #GenerateSplineVertices(entity)
    {
        if (!entity.controlPoints) {
            //XXX knots or fit points not supported yet
            return
        }
        const controlPoints = entity.controlPoints.map(p => [p.x, p.y])
        const vertices = []
        const subdivisions = controlPoints.length * SPLINE_SUBDIVISION
        const step = 1 / subdivisions
        for (let i = 0; i <= subdivisions; i++) {
            const pt = this.#InterpolateSpline(i * step, entity.degreeOfSplineCurve, controlPoints,
                                               entity.knotValues)
            vertices.push({x: pt[0], y: pt[1]})
        }
    
        return vertices
    }
    

    #GenerateTextVertices(entity)
    {
        const vertices = []
        if(entity.startPoint){vertices.push({x: entity.startPoint.x, y: entity.startPoint.y})}
        if(entity.endPoint){vertices.push({x: entity.endPoint.x, y: entity.endPoint.y})}
        if(entity.textHeight){vertices.push({x: entity.startPoint.x+entity.textHeight, y: entity.startPoint.y+entity.textHeight})}

        return vertices
    }

    
    #GenerateMTextVertices(entity)
    {
        const vertices = []
        if(entity.position){vertices.push({x: entity.position.x, y: entity.position.y})}
        if(entity.height){vertices.push({x: entity.position.x, y: entity.position.y-entity.height})}
        if(entity.width){vertices.push({x: entity.position.x+entity.width, y: entity.position.y})}

        return vertices
    }


    #getVerticesRectBox(vertices)
    {
        let rectBox = null
        for(let v of vertices)
        {
            if(rectBox==null)
            {
                rectBox = new RectBox(v.x, v.y, v.x, v.y)
            }
            else
            {
                if (v.x < rectBox.min_X) {
                    rectBox.min_X = v.x
                } else if (v.x > rectBox.max_X) {
                    rectBox.max_X = v.x
                }
                if (v.y < rectBox.min_Y) {
                    rectBox.min_Y = v.y
                } else if (v.y > rectBox.max_Y) {
                    rectBox.max_Y = v.y
                }
            }
        }
        return rectBox
    }
    
    
    
    
    /** Get a point on a B-spline.
     * https://github.com/thibauts/b-spline
     * @param t {number} Point position on spline, [0..1].
     * @param degree {number} B-spline degree.
     * @param points {number[][]} Control points. Each point should have the same dimension which
     *  defines dimension of the result.
     * @param knots {?number[]} Knot vector. Should have size `points.length + degree + 1`. Default
     *  is uniform spline.
     * @param weights {?number} Optional weights vector.
     * @return {number[]} Resulting point on the specified position.
     */
    #InterpolateSpline(t, degree, points, knots = null, weights = null) {
        let i, j, s, l             // function-scoped iteration variables
        const n = points.length    // points count
        const d = points[0].length // point dimensionality
    
        if (degree < 1) {
            throw new Error("Degree must be at least 1 (linear)")
        }
        if (degree > (n - 1)) {
            throw new Error("Degree must be less than or equal to point count - 1")
        }
    
        if (!weights) {
            // build weight vector of length [n]
            weights = []
            for(i = 0; i < n; i++) {
                weights[i] = 1
            }
        }
    
        if (!knots) {
            // build knot vector of length [n + degree + 1]
            knots = []
            for(i = 0; i < n + degree + 1; i++) {
                knots[i] = i
            }
        } else {
            if (knots.length !== n + degree + 1) {
                throw new Error("Bad knot vector length")
            }
        }
    
        const domain = [
            degree,
            knots.length-1 - degree
        ]
    
        // remap t to the domain where the spline is defined
        const low  = knots[domain[0]]
        const high = knots[domain[1]]
        t = t * (high - low) + low
    
        if (t < low) {
            t = low
        } else if (t > high) {
            t = high
        }
    
        // find s (the spline segment) for the [t] value provided
        for (s = domain[0]; s < domain[1]; s++) {
            if (t >= knots[s] && t <= knots[s + 1]) {
                break
            }
        }
    
        // convert points to homogeneous coordinates
        const v = []
        for (i = 0; i < n; i++) {
            v[i] = []
            for (j = 0; j < d; j++) {
                v[i][j] = points[i][j] * weights[i]
            }
            v[i][d] = weights[i]
        }
    
        // l (level) goes from 1 to the curve degree + 1
        let alpha
        for (l = 1; l <= degree + 1; l++) {
            // build level l of the pyramid
            for(i = s; i > s - degree - 1 + l; i--) {
                alpha = (t - knots[i]) / (knots[i + degree + 1 - l] - knots[i])
                // interpolate each component
                for(j = 0; j < d + 1; j++) {
                    v[i][j] = (1 - alpha) * v[i - 1][j] + alpha * v[i][j]
                }
            }
        }
    
        // convert back to cartesian and return
        const result = []
        for(i = 0; i < d; i++) {
            result[i] = v[s][i] / v[s][d]
        }
        return result
    }
}





