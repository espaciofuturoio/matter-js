class BVHNode {
    constructor(bounds, bodies = []) {
        this.bounds = bounds;
        this.bodies = bodies;
        this.left = null;
        this.right = null;
    }
}

class BVH {
    constructor() {
        this.root = null;
    }

    insert(body) {
        const bounds = body.bounds;
        const node = new BVHNode(bounds, [body]);

        if (!this.root) {
            this.root = node;
        } else {
            this._insertNode(this.root, node);
        }
    }

    _insertNode(root, node) {
        if (!root.left) {
            root.left = node;
        } else if (!root.right) {
            root.right = node;
        } else {
            const leftVolume = this._calculateVolume(root.left.bounds);
            const rightVolume = this._calculateVolume(root.right.bounds);
            const newVolumeLeft = this._calculateVolume(this._mergeBounds(root.left.bounds, node.bounds));
            const newVolumeRight = this._calculateVolume(this._mergeBounds(root.right.bounds, node.bounds));

            const increaseLeft = newVolumeLeft - leftVolume;
            const increaseRight = newVolumeRight - rightVolume;

            if (increaseLeft < increaseRight) {
                this._insertNode(root.left, node);
            } else {
                this._insertNode(root.right, node);
            }
        }

        root.bounds = this._mergeBounds(root.bounds, node.bounds);
    }

    query(bounds) {
        const potentialBodies = [];
        this._queryNode(this.root, bounds, potentialBodies);
        return potentialBodies;
    }

    _queryNode(node, bounds, potentialBodies) {
        if (!node) return;

        if (this._boundsOverlap(node.bounds, bounds)) {
            if (node.bodies.length > 0) {
                potentialBodies.push(...node.bodies);
            }

            this._queryNode(node.left, bounds, potentialBodies);
            this._queryNode(node.right, bounds, potentialBodies);
        }
    }

    _calculateVolume(bounds) {
        return (bounds.max.x - bounds.min.x) * (bounds.max.y - bounds.min.y);
    }

    _mergeBounds(boundsA, boundsB) {
        return {
            min: {
                x: Math.min(boundsA.min.x, boundsB.min.x),
                y: Math.min(boundsA.min.y, boundsB.min.y)
            },
            max: {
                x: Math.max(boundsA.max.x, boundsB.max.x),
                y: Math.max(boundsA.max.y, boundsB.max.y)
            }
        };
    }

    _boundsOverlap(boundsA, boundsB) {
        return !(boundsA.min.x > boundsB.max.x || boundsA.max.x < boundsB.min.x ||
                 boundsA.min.y > boundsB.max.y || boundsA.max.y < boundsB.min.y);
    }
}

module.exports = BVH;