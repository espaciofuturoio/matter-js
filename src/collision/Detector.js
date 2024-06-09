/**
* The `Matter.Detector` module contains methods for efficiently detecting collisions between a list of bodies using a broadphase algorithm.
*
* @class Detector
*/

var Detector = {};

module.exports = Detector;

var Common = require('../core/Common');
var Collision = require('./Collision');
var BVH = require('../collision/BVH');

(function () {

    /**
     * Creates a new collision detector.
     * @method create
     * @param {} options
     * @return {detector} A new collision detector
     */
    Detector.create = function (options) {
        var defaults = {
            bodies: [],
            collisions: [],
            pairs: null
        };

        return Common.extend(defaults, options);
    };

    /**
     * Sets the list of bodies in the detector.
     * @method setBodies
     * @param {detector} detector
     * @param {body[]} bodies
     */
    Detector.setBodies = function (detector, bodies) {
        detector.bodies = bodies.slice(0);
    };

    /**
     * Clears the detector including its list of bodies.
     * @method clear
     * @param {detector} detector
     */
    Detector.clear = function (detector) {
        detector.bodies = [];
        detector.collisions = [];
    };

    /**
     * Sorts bodies along the x-axis and checks for overlaps.
     * @method _sweepAndPrune
     * @param {detector} detector
     * @return {Array} potentialPairs
     */
    Detector._sweepAndPrune = function (detector) {
        var bodies = detector.bodies;
        var bodiesLength = bodies.length;
        var potentialPairs = [];

        // Sort bodies along the x-axis
        bodies.sort(function (bodyA, bodyB) {
            return bodyA.bounds.min.x - bodyB.bounds.min.x;
        });

        // Check for overlaps along the x-axis
        for (var i = 0; i < bodiesLength; i++) {
            var bodyA = bodies[i];
            for (var j = i + 1; j < bodiesLength; j++) {
                var bodyB = bodies[j];

                // If bodyB is too far along the x-axis, break the loop
                if (bodyB.bounds.min.x > bodyA.bounds.max.x) {
                    break;
                }

                // Check for overlap along the y-axis
                if (bodyA.bounds.max.y >= bodyB.bounds.min.y && bodyA.bounds.min.y <= bodyB.bounds.max.y) {
                    potentialPairs.push([bodyA, bodyB]);
                }
            }
        }

        return potentialPairs;
    };

    /**
     * Builds a BVH and queries it for potential collisions.
     * @method _bvh
     * @param {detector} detector
     * @return {Array} potentialPairs
     */
    Detector._bvh = function (detector) {
        var bodies = detector.bodies;
        var bvh = new BVH();
        var potentialPairs = [];

        // Insert bodies into the BVH
        for (var i = 0; i < bodies.length; i++) {
            bvh.insert(bodies[i]);
        }

        // Query the BVH for potential collisions
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];
            var candidates = bvh.query(body.bounds);
            for (var j = 0; j < candidates.length; j++) {
                var candidate = candidates[j];
                if (body !== candidate) {
                    potentialPairs.push([body, candidate]);
                }
            }
        }

        return potentialPairs;
    };

    Detector.collisionsBVH = function(detector) {
        var potentialPairs = Detector._sweepAndPrune(detector);
        var collisions = detector.collisions;
        var collisionIndex = 0;
        var collides = Collision.collides;

        for (var i = 0; i < potentialPairs.length; i++) {
            var pair = potentialPairs[i];
            var bodyA = pair[0];
            var bodyB = pair[1];

            var collision = collides(bodyA, bodyB, detector.pairs);
            if (collision) {
                collisions[collisionIndex++] = collision;
            }
        }

        if (collisions.length !== collisionIndex) {
            collisions.length = collisionIndex;
        }

        return collisions;
    };

    /**
     * Efficiently finds all collisions among all the bodies in `detector.bodies` using a broadphase algorithm.
     * 
     * _Note:_ The specific ordering of collisions returned is not guaranteed between releases and may change for performance reasons.
     * If a specific ordering is required then apply a sort to the resulting array.
     * @method collisions
     * @param {detector} detector
     * @return {collision[]} collisions
     */
    Detector.collisions = function (detector) {
        var pairs = detector.pairs,
            bodies = detector.bodies,
            bodiesLength = bodies.length,
            canCollide = Detector.canCollide,
            collides = Collision.collides,
            collisions = detector.collisions,
            collisionIndex = 0,
            i,
            j;

        bodies.sort(Detector._compareBoundsX);

        for (i = 0; i < bodiesLength; i++) {
            var bodyA = bodies[i],
                boundsA = bodyA.bounds,
                boundXMax = bodyA.bounds.max.x,
                boundYMax = bodyA.bounds.max.y,
                boundYMin = bodyA.bounds.min.y,
                bodyAStatic = bodyA.isStatic || bodyA.isSleeping,
                partsALength = bodyA.parts.length,
                partsASingle = partsALength === 1;

            for (j = i + 1; j < bodiesLength; j++) {
                var bodyB = bodies[j],
                    boundsB = bodyB.bounds;

                if (boundsB.min.x > boundXMax) {
                    break;
                }

                if (boundYMax < boundsB.min.y || boundYMin > boundsB.max.y) {
                    continue;
                }

                if (bodyAStatic && (bodyB.isStatic || bodyB.isSleeping)) {
                    continue;
                }

                if (!canCollide(bodyA.collisionFilter, bodyB.collisionFilter)) {
                    continue;
                }

                var partsBLength = bodyB.parts.length;

                if (partsASingle && partsBLength === 1) {
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
        }

        if (collisions.length !== collisionIndex) {
            collisions.length = collisionIndex;
        }

        return collisions;
    };

    /**
     * Returns `true` if both supplied collision filters will allow a collision to occur.
     * See `body.collisionFilter` for more information.
     * @method canCollide
     * @param {} filterA
     * @param {} filterB
     * @return {bool} `true` if collision can occur
     */
    Detector.canCollide = function (filterA, filterB) {
        if (filterA.group === filterB.group && filterA.group !== 0)
            return filterA.group > 0;

        return (filterA.mask & filterB.category) !== 0 && (filterB.mask & filterA.category) !== 0;
    };

    /**
     * The comparison function used in the broadphase algorithm.
     * Returns the signed delta of the bodies bounds on the x-axis.
     * @private
     * @method _sortCompare
     * @param {body} bodyA
     * @param {body} bodyB
     * @return {number} The signed delta used for sorting
     */
    Detector._compareBoundsX = function (bodyA, bodyB) {
        return bodyA.bounds.min.x - bodyB.bounds.min.x;
    };

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * The array of `Matter.Body` between which the detector finds collisions.
     * 
     * _Note:_ The order of bodies in this array _is not fixed_ and will be continually managed by the detector.
     * @property bodies
     * @type body[]
     * @default []
     */

    /**
     * The array of `Matter.Collision` found in the last call to `Detector.collisions` on this detector.
     * @property collisions
     * @type collision[]
     * @default []
     */

    /**
     * Optional. A `Matter.Pairs` object from which previous collision objects may be reused. Intended for internal `Matter.Engine` usage.
     * @property pairs
     * @type {pairs|null}
     * @default null
     */

})();
