function createQuadtree(bounds, capacity) {
    const quadtree = {
        bounds,
        capacity,
        bodies: [],
        divided: false,
        northeast: null,
        northwest: null,
        southeast: null,
        southwest: null
    };

    quadtree.subdivide = function() {
        const { x, y, width, height } = this.bounds;
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        this.northeast = createQuadtree({ x: x + halfWidth, y: y, width: halfWidth, height: halfHeight }, this.capacity);
        this.northwest = createQuadtree({ x: x, y: y, width: halfWidth, height: halfHeight }, this.capacity);
        this.southeast = createQuadtree({ x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.capacity);
        this.southwest = createQuadtree({ x: x, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.capacity);

        this.divided = true;
    };

    quadtree.insert = function(body) {
        if (!this.contains(this.bounds, body)) {
            return false;
        }

        if (this.bodies.length < this.capacity) {
            this.bodies.push(body);
            return true;
        } else {
            if (!this.divided) {
                this.subdivide();
            }

            if (this.northeast.insert(body)) return true;
            if (this.northwest.insert(body)) return true;
            if (this.southeast.insert(body)) return true;
            if (this.southwest.insert(body)) return true;
        }
    };

    quadtree.contains = function(bounds, body) {
        return (
            body.position.x >= bounds.x &&
            body.position.x < bounds.x + bounds.width &&
            body.position.y >= bounds.y &&
            body.position.y < bounds.y + bounds.height
        );
    };

    quadtree.query = function(range, found) {
        if (!this.intersects(range, this.bounds)) {
            return found;
        }

        for (let body of this.bodies) {
            if (this.contains(range, body)) {
                found.push(body);
            }
        }

        if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }

        return found;
    };

    quadtree.intersects = function(range, bounds) {
        return !(
            range.x > bounds.x + bounds.width ||
            range.x + range.width < bounds.x ||
            range.y > bounds.y + bounds.height ||
            range.y + range.height < bounds.y
        );
    };

    return quadtree;
}

module.exports = createQuadtree;