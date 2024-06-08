class Quadtree {
    constructor(bounds, capacity) {
        this.bounds = bounds;
        this.capacity = capacity;
        this.bodies = [];
        this.divided = false;
    }

    subdivide() {
        const { x, y, width, height } = this.bounds;
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        this.northeast = new Quadtree({ x: x + halfWidth, y: y, width: halfWidth, height: halfHeight }, this.capacity);
        this.northwest = new Quadtree({ x: x, y: y, width: halfWidth, height: halfHeight }, this.capacity);
        this.southeast = new Quadtree({ x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.capacity);
        this.southwest = new Quadtree({ x: x, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.capacity);

        this.divided = true;
    }

    insert(body) {
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
    }

    contains(bounds, body) {
        return (
            body.position.x >= bounds.x &&
            body.position.x < bounds.x + bounds.width &&
            body.position.y >= bounds.y &&
            body.position.y < bounds.y + bounds.height
        );
    }

    query(range, found) {
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
    }

    intersects(range, bounds) {
        return !(
            range.x > bounds.x + bounds.width ||
            range.x + range.width < bounds.x ||
            range.y > bounds.y + bounds.height ||
            range.y + range.height < bounds.y
        );
    }
}