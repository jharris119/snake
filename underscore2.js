/**
 * Some additional functions I think would be nice to add to underscore.js.
 */

_.mixin({
	
    /**
     * @param {Any} num The thing we're testing for integer-ship.
     * @return {boolean} true if num is an integer (between Number.MIN_VALUE and
     * 	Number.MAX_VALUE) and false otherwise
     */
    isInteger: function(num) {
        return _.isFinite(num) && parseInt(num, undefined) == num;
    }
});
