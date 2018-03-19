
var canvas = document.querySelector('#id_canvas')
var context = canvas.getContext('2d')
var log = console.log.bind(console)

var ImageLoad = function(path) {
	var img = new Image()
	img.src = path
	return img
}

//常量
const ConstDefine = {
	dir_left: 'dir_left',
	dir_right: 'dir_right',
	dir_up: 'dir_up',
	dir_down: 'dir_down',

	test_initBody: 'test_initBody'
}

//全局变量
var Static = {
	game_pause: false,
}


var Vector2 = function() {
	var v = {
		x: 0,
		y: 0,
	}

	return v
}

var Body = function() {
	var b = {
		id: 0,
		pos: Vector2(),
	}

	b.regsiterAction = function(listner) {
		this.dirChangeAction = listner
	}


	b.update = function() {
	}

	b.draw = function() {
		// context.drawImage(img, this.pos.x - img.width / 2, this.pos.y - img.height / 2)
	}

	return b
}


var Wall = function() {
	var s = {
		body: [],
		speed: 1,
		body_w: 33,
	}

	s.update = function() {
		for (i = 0; i < this.body.length; i++) {
			this.body[i].update()
		}
	}

	s.draw = function () {
		for (i = 0; i < this.body.length; i++) {
			this.body[i].draw()
		}
	}

	return s
}

var Game = function () {
	var g = {
		actions: {},
		keydown: {},
	}

	//event
	window.addEventListener('keydown', function(event) {
		if (event.key == 'a' || event.key == 'ArrowLeft') {
			g.keydown[ConstDefine.dir_left] = true
		} else if (event.key == 'd' || event.key == 'ArrowRight') {
			g.keydown[ConstDefine.dir_right] = true
		} else if (event.key == 'w' || event.key == 'ArrowUp') {
			g.keydown[ConstDefine.dir_up] = true
		} else if (event.key == 's' || event.key == 'ArrowDown') {
			g.keydown[ConstDefine.dir_down] = true
		} else if (event.key == ' ') {
			Static.game_pause = !Static.game_pause
		} 
	})

	window.addEventListener('keyup', function(event) {
		if (event.key == 'a' || event.key == 'ArrowLeft') {
			g.keydown[ConstDefine.dir_left] = false
		} else if (event.key == 'd' || event.key == 'ArrowRight') {
			g.keydown[ConstDefine.dir_right] = false
		} else if (event.key == 'w' || event.key == 'ArrowUp') {
			g.keydown[ConstDefine.dir_up] = false
		} else if (event.key == 's' || event.key == 'ArrowDown') {
			g.keydown[ConstDefine.dir_down] = false
		} else if (event.key == 'q') {
			g.actions[ConstDefine.test_initBody]()
		}
	})

	g.registerAction = function(key, callback) {
		g.actions[key] = callback
	}

	g.update = function() {
		if(g.keydown[ConstDefine.dir_left])
			g.actions[ConstDefine.dir_left]()
		if(g.keydown[ConstDefine.dir_right])
			g.actions[ConstDefine.dir_right]()
		if(g.keydown[ConstDefine.dir_up])
			g.actions[ConstDefine.dir_up]()
		if(g.keydown[ConstDefine.dir_down])
			g.actions[ConstDefine.dir_down]()
	}

	g.draw = function() {
		context.clearRect(0, 0, canvas.width, canvas.height)
	}

	return g
}

var __main = function() {
	log(ConstDefine)

	//init
	var game = Game()
	var wall = Wall()

	//regsiter event
	game.registerAction(ConstDefine.dir_left, function() {
		wall.setDirection(ConstDefine.dir_left)
	})
	game.registerAction(ConstDefine.dir_right, function() {
		wall.setDirection(ConstDefine.dir_right)
	})
	game.registerAction(ConstDefine.dir_up, function() {
		wall.setDirection(ConstDefine.dir_up)
	})
	game.registerAction(ConstDefine.dir_down, function() {
		wall.setDirection(ConstDefine.dir_down)
	})
	game.registerAction(ConstDefine.test_initBody, function() {
		wall.addBody()
	})

	//run
	setInterval(function () {
		if (!Static.game_pause)
		{
			game.update()
			snake.update()
		}

		game.draw()
		snake.draw()
	})
}

__main()
