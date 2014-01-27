/**
 * The snake game that was popular on old-style Nokia phones.
 *
 * @param {jQuery | HTMLElement} element the game's canvas
 * @param {integer} height the number of rows on the game board, defaults to 16
 * @param {integer} width the number of columns on the game board, defaults to 10
 * @param {integer} turnInterval between turn iterations, defaults to 1000 ms
 */
function Snake(element, rows, cols, turnInterval) {

    var ROWS = rows || 15, COLS = cols || 11;
    var _element, $element;

    /** @constant @member {integer} */
    var SQUARE_SIZE;

    var gameOver = false;

    var snake = {
        asList: [],
        asObj: {},

        /**
         * Add a square to the head of the snake.
         *
         * @param {Square|Coords} the square to add, not falsy
         * @return {Square} a Square -- food if there was one at this location, otherwise
         *	the Square we just added
         */
        extend: function(square) {
            if (!(square instanceof Square)) {
                square = new Square(square.row, square.col, 'SNAKE');
            }

			// if the Square is already in the snake, then we have a collision.
			// otherwise add the Square to the front of the snake
            if (this.asObj[square.hash]) {
                return 0;
            }
			this.asList.unshift(square);
			this.asObj[square.hash] = square;

			return food[square.hash] || square;
        },

        /**
         * Move the snake one square in the given direction.
         *
         * @param {Function} dirFn One of right, left, up, or down, or undefined to
         *	move in the snake's current direction.
         * @return {boolean} true
         */
        move: function(dirFn) {
        	var dirFn = dirFn || currentDirection;

            // Move the snake by adding a new square to the front of the snake...
            var newhead = dirFn.call(this, snake.asList[0]), ex, tail;
            if (newhead === null || !(ex = snake.extend(newhead))) {
                return endGame();
            }

			// if we just ate food, delete it from that object
            if (ex.getType() == 'FOOD') {
            	return delete food[ex.hash];
            }

            // ...and removing the square at the tail.
            tail = snake.asList.pop();
            tail.getSvg().remove();
            return delete snake.asObj[tail.hash];     // evaluates to true since snake.asList.pop().hash
                                                      // is a property of snake.asObj and it's a property
                                                      // that we set via assignment
        },

        length: function() {
        	return this.asList.length;
        }
    };

	/** Map food coordinates to food Squares */
    var food = {};

    var paper = Raphael;

    var turnInterval = turnInterval || 1000;

    var COLORS = {
        SNAKE: 'rgb(0,200,0)',
        FOOD:  'rgb(0,0,200)',
        WHITE: 'rgb(255,255,255)'
    };

    var currentDirection = left;

    var moveTimerId, foodTimerId, foodIntervalId;

    /**
     * Initialize the game.
     *
     * @param {HTMLElement|jQuery} element The HTML element containing the game canvas.
     */
    function init(element) {
        if (element instanceof jQuery) {
            _element = element.get(0);
            $element = element;
        }
        else if (element instanceof HTMLElement) {
            _element = element;
            $element = $(element);
        }
        else {
            throw "First parameter to Snake must be an HTMLElement or jQuery object.";
        }

        if ($element.height() / ROWS != $element.width() / COLS) {
            throw "HTMLElement width/height ratio must match rows/cols ratio.";
        }

        $(document).on('keydown', $element, handleKeydown);

        SQUARE_SIZE = $element.height() / ROWS;

        paper = Raphael(_element);

        snake.extend(new Square(Math.floor(ROWS / 2), Math.floor(COLS / 2), 'SNAKE'));
    };

    /**
     * A coordinates object
     * @typedef {Object} Coords
     * @property {integer} row - the row
     * @property {integer} col - the column
     */

    /**
     * @constructor
     * @param {integer|Coords} _row the square's row, or a Coords object with its row and column
     * @param {integer} [_col] the square's column
     * @param {string} _type the type of the square, either 'SNAKE' or 'FOOD'
     */
    function Square(_row, _col, _type) {
        var row, col, type, svg;

        row = _.initial(arguments);
        if (row.length == 1) {
            row = row.row;
            col = row.col;
        }
        else {
            row = _row;
            col = _col;
        }

        type = _.last(arguments);

        svg = paper.rect(col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE).attr({
            'fill': COLORS[type],
            'stroke': COLORS.WHITE,
            'stroke-width': 2
        });

        this.getRow = function() {
            return row;
        };

        this.getCol = function() {
            return col;
        };

        this.getType = function() {
            return type;
        };

        this.getSvg = function() {
            return svg;
        };

        this.asCoords = function() {
            return { row: this.getRow(), col: this.getCol() };
        };

        this.hash = hash(row, col);
    };

	/**
	 * Turn a (row, col) pair into a string for indexing into an object literal.
	 *
	 * @param {integer} row The row
	 * @param {integer} col The column
	 * @return {string} the string
	 */
    function hash(row, col) {
    	return row + "," + col;
    }

    /* ****************************************************
     *
     * "Food"
     *
     *****************************************************/

    /**
     * Add food to the board.
     *
     * @param {Coords} coords The coordinates to add food to, or undefined to
     * 	put food on a random square
     * @param {integer} lifetime The time until this food is removed from the
     *	board
     * @param {integer} maxFood Maximum number of pieces of food on the board
     *	at a time
     * @return the Square representing the food
     */
    function addFood(coords, lifetime, maxFood) {
		var row = (coords && coords.row) || _.random(ROWS - 1),
			col = (coords && coords.col) || _.random(COLS - 1);
		var _hash = hash(row, col);
		var square, maxFood = maxFood || 5;
		var lifetime = lifetime || _.random(5000, 10000), defer;

    	// if this square is already occupied, then return
    	if (snake.asObj[_hash] || food[_hash]) {
    		return;
    	}
    	// if there are already maxFood pieces of food on the board, just return
    	if (_.size(food) >= maxFood) {
    		return;
    	}

		square = new Square(row, col, 'FOOD');

		function removeFood() {
			/**
			 * Blink the square.
			 *
			 * @param {Array<Number>} opacities Animate so as to hit all of the opacities
			 *	in this array
			 * @param {Function} doneFn The function to call when the blinking is done.
			 */
			function blink(opacities, doneFn) {
				square.getSvg().animate({
					opacity: opacities.shift()
				}, 500, Raphael.easing_formulas.linear, function() {
					if (opacities.length) {
						blink(opacities, doneFn);
					}
					else {
						doneFn();
					}
				});
			}

			blink([0.1, 1, 0.1, 1, 0], function() {
				square.getSvg().remove();
				delete food[_hash];
			});
		}

		setTimeout(removeFood, lifetime);

		return food[_hash] = square;
    }

    /* ****************************************************
     *
     * Event handling functions
     *
     *****************************************************/
    var handleKeydown = function(evt) {
        switch (evt.which) {
            case KeyboardEvent.DOM_VK_LEFT:
                currentDirection = left; break;
            case KeyboardEvent.DOM_VK_UP:
                currentDirection = up; break;
            case KeyboardEvent.DOM_VK_RIGHT:
                currentDirection = right; break;
            case KeyboardEvent.DOM_VK_DOWN:
                currentDirection = down; break;
            case KeyboardEvent.DOM_VK_P:
                pause(); break;
            default:
                break;
        }
    };

    /* ****************************************************
     *
     * Direction functions
     *
     *****************************************************/

    /**
     * Get the coordinates of the square to the left of the given one.
     *
     * @param {Square} square The square
     * @return {Coords} the coordinates of the square to the left, or null
     *    if that square is off the board
     */
    function left(square) {
        return square.getCol() > 0 ? { row: square.getRow(), col: square.getCol() - 1 } : null;
    }

    /**
     * Get the coordinates of the square to the right of the given one.
     *
     * @param {Square} square The square
     * @return {Coords} the coordinates of the square to the right, or null
     *    if that square is off the board
     */
    function right(square) {
        return square.getCol() < COLS - 1 ? { row: square.getRow(), col: square.getCol() + 1 } : null;
    }

    /**
     * Get the coordinates of the square above the given one.
     *
     * @param {Square} square The square
     * @return {Coords} the coordinates of the square above, or null
     *    if that square is off the board
     */
    function up(square) {
        return square.getRow() > 0 ? { row: square.getRow() - 1, col: square.getCol() } : null;
    }

    /**
     * Get the coordinates of the square below the given one.
     *
     * @param {Square} square The square
     * @return {Coords} the coordinates of the square below, or null
     *    if that square is off the board
     */
    function down(square) {
        return square.getRow() < ROWS - 1 ? { row: square.getRow() + 1, col: square.getCol() } : null;
    }

    /**
     * Run the game's next iteration then wait.
     */
    function nextTurn() {
		snake.move();
		if (!gameOver) {
			moveTimerId = setTimeout(nextTurn, turnInterval - (40 * (snake.length() - 1)));
		}
    }

    /**
     * Pause the game.
     */
    function pause() {
    	// easiest way I can think of to pause the game
    	window.alert('Paused');
    }

	/**
	 * End the game.
	 */
    function endGame() {
        gameOver = true;
        clearTimeout(moveTimerId);
        clearInterval(foodIntervalId);
        return !gameOver;
    };

    // Push functions to QUnit for testing
    if (window.QUnit) {
        QUnit.friends = {
            left: left,
            right: right,
            up: up,
            down: down,
            snake: snake,
            getDirection: function() {
            	return currentDirection;
            },

            /**
             * Delegate to Square constructor...
             *
             * @param {Coords|integer} the coords of the new square, or its row
             * @param {integer} [col] the column of the new square
             * @return {Square} the square
             */
            newSnakeSquare: function(row, col) {
                var _row, _col;

                if (arguments.length == 1) {
                    _row = arguments[0].row;
                    _col = arguments[0].col;
                }
                else {
                    _row = row;
                    _col = col;
                }

                return new Square(_row, _col, 'SNAKE');
            },

            addSnakeSquare: function(square) {
                return snake.extend(square);
            },

			food: food,
            addFoodSquare: function(coords) {
            	return addFood(coords);
            },

            endgame: endGame
        };
    }

	// run the game
    init(element);

	return {
		start: function() {
			nextTurn();
			_.delay(function() {
				foodIntervalId = setInterval(addFood, turnInterval);
			}, _.random(1000, 4000));
		},
		endgame: endGame
	};
}
