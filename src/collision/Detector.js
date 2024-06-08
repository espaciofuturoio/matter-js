var Detector = {};

module.exports = Detector;

var Common = require('../core/Common');
var Collision = require('./Collision');
var Quadtree = require('./Quadtree');

(function() {

    Detector.create = function(options) {
        var defaults = {
            bodies: [],
            collisions: [],
            pairs: null
        };

        return Common.extend(defaults, options);
    };

    Detector.setBodies = function(detector, bodies) {
        detector.bodies = bodies.slice(0);
    };

    Detector.clear = function(detector) {
        detector.bodies = [];
        detector.collisions = [];
    };

    Detector.collisions = function(detector) {
        var pairs = detector.pairs,
            bodies = detector.bodies,
            bodiesLength = bodies.length,
            canCollide = Detector.canCollide,
            collides = Collision.collides,
            collisions = detector.collisions,
            collisionIndex = 0,
            i,
            j;

        // Initialize Quadtree
        const quadtree = new Quadtree({ x: 0, y: 0, width: 800, height: 600 }, 4);
        for (let body of bodies) {
            quadtree.insert(body);
        }

        const potentialCollisions = [];
        for (let body of bodies) {
            const range = { 
                x: body.bounds.min.x, 
                y: body.bounds.min.y, 
                width: body.bounds.max.x - body.bounds.min.x, 
                height: body.bounds.max.y - body.bounds.min.y 
            };
            const found = quadtree.query(range, []);
            for (let other of found) {
                if (body !== other) {
                    potentialCollisions.push([body, other]);
                }
            }
        }

        // Narrow-phase collision detection
        for (let [bodyA, bodyB] of potentialCollisions) {
            if (!canCollide(bodyA.collisionFilter, bodyB.collisionFilter)) {
                continue;
            }

            var partsALength = bodyA.parts.length,
                partsBLength = bodyB.parts.length,
                partsASingle = partsALength === 1,
                partsBSingle = partsBLength === 1;

            if (partsASingle && partsBSingle) {
                var collision = collides(bodyA, bodyB, pairs);

                if (collision) {
                    collisions[collisionIndex++] = collision;
                }
            } else {
                var partsAStart = partsALength > 1 ? 1 : 0,
                    partsBStart = partsBLength > 1 ? 1 : 0;
                
                for (var k = partsAStart; k < partsALength; k++) {
                    var partA = bodyA.parts[k],
                        boundsA = partA.bounds;

                    for (var z = partsBStart; z < partsBLength; z++) {
                        var partB = bodyB.parts[z],
                            boundsB = partB.bounds;

                        if (boundsA.min.x > boundsB.max.x || boundsA.max.x < boundsB.min.x
                            || boundsA.max.y < boundsB.min.y || boundsA.min.y > boundsB.max.y) {
                            continue;
                        }

                        var collision = collides(partA, partB, pairs);

                        if (collision) {
                            collisions[collisionIndex++] = collision;
                        }
                    }
                }
            }
        }

        if (collisions.length !== collisionIndex) {
            collisions.length = collisionIndex;
        }

        return collisions;
    };

    Detector.canCollide = function(filterA, filterB) {
        if (filterA.group === filterB.group && filterA.group !== 0)
            return filterA.group > 0;

        return (filterA.mask & filterB.category) !== 0 && (filterB.mask & filterA.category) !== 0;
    };

    Detector._compareBoundsX = function(bodyA, bodyB) {
        return bodyA.bounds.min.x - bodyB.bounds.min.x;
    };

})();