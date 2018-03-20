'use strict'

var mainCanvas = document.querySelector('#main_canvas')
var smallCanvas = document.querySelector('#small_canvas')
var log = console.log.bind(console)
var startButton = document.getElementById('startGameBtn')

//常量
const ConstDefine = {
	//四个方向键
	dir_left: 'dir_left',
	dir_right: 'dir_right',
	dir_up: 'dir_up',
	dir_down: 'dir_down',

	//方块尺寸 单位：px
	block_width: 30,
	block_height: 30,

	//游戏等级，跟速度挂钩
	levelSpeed: [1000, 500, 250, 10, 100, 50], //不同等级对应的速度，单位(ms)

	//同时消除层数对应的分数
	score: [10, 20, 40, 100],

	//游戏状态
	gameStateStop: 0,
	gameStateRunning: 1,
}

// 常用颜色
const ConstColor = {
	WallBgColor: "#ddeeff", //'#C0C0C0',
	WallColor: '#000000',
	BlockBgColor: "#000000", // '#909090',
	BlockColor: '#000000',
}

const ConstBlockColor = [
	"#60ceff", //BlockType_S
	"#00fc00", //BlockType_Z
	"#ff6500", //BlockType_L
	"#cc30ff", //BlockType_J
	"#fdea10", //BlockType_I
	"#e3aca7", //BlockType_O
	"#d85eff", //BlockType_T
]

//常用字体
const Font = {
	GamePause: "40px Arial",
}

// 方块类型
const BlockType = {
	BlockType_S: 0,
	BlockType_Z: 1,
	BlockType_L: 2,
	BlockType_J: 3,
	BlockType_I: 4,
	BlockType_O: 5,
	BlockType_T: 6,
	BlockType_MAX: 7,
}

//全局变量
var Static = {
	game_state: 0,
	game_pause: false,//游戏是否暂停
	game_score: 0, //分数
	game_lines: 0, //消除的行数
	game_level: ConstDefine.gameStateStop, //游戏等级，与难度挂钩, 最高4
}

//向量，用于表示2D速度和2D坐标
var Vector2 = function () {
	var v = {
		x: 0,
		y: 0,
	}

	return v
}

//矩形对象
var Rect = function () {
	var r = {
		pos: Vector2(),
		width: 0,
		height: 0,
	}

	return r
}

//画图函数封装
var Draw = {
	//清空
	clearRect: function (canvas, x, y, w, h) {
		canvas.getContext('2d').clearRect(x, y, w, h);
	},

	//画外框
	drawRect: function (canvas, x, y, w, h, color) {
		canvas.getContext('2d').strokeStyle = color;
		canvas.getContext('2d').strokeRect(x, y, w, h);
	},

	//填充矩形
	fillRect: function (canvas, x, y, w, h, color) {
		canvas.getContext('2d').fillStyle = color;
		canvas.getContext('2d').fillRect(x, y, w, h);
	},

	//写字
	fillText: function (canvas, x, y, font, string) {
		canvas.getContext('2d').font = font;
		canvas.getContext('2d').fillText(string, x, y);
	}
}

//七种形状的基本数据，每一种包含的形态以及每个形态占据的位置
var blockData = [
	[//S
		[[0, -1], [1, -1], [-1, 0], [0, 0]], [[0, -1], [0, 0], [1, 0], [1, 1]],
	],
	[//Z
		[[-1, -1], [0, -1], [0, 0], [1, 0]], [[1, -1], [0, 0], [1, 0], [0, 1]],
	],
	[//L
		[[0, -1], [0, 0], [0, 1], [1, 1]],
		[[-1, 0], [0, 0], [1, 0], [-1, 1]],
		[[-1, -1], [0, -1], [0, 0], [0, 1]],
		[[1, -1], [-1, 0], [0, 0], [1, 0]],
	],
	[//J
		[[0, -1], [0, 0], [0, 1], [-1, 1]],
		[[-1, -1], [-1, 0], [0, 0], [1, 0]],
		[[0, -1], [1, -1], [0, 0], [0, 1]],
		[[-1, 0], [0, 0], [1, 0], [1, 1]],
	],
	[//I
		[[0, -1], [0, 0], [0, 1], [0, 2]],
		[[-1, 0], [0, 0], [1, 0], [2, 0]],
	],
	[//O
		[[-1, -1], [0, -1], [-1, 0], [0, 0]],
	],
	[//T
		[[-1, 0], [0, 0], [1, 0], [0, 1]],
		[[0, -1], [-1, 0], [0, 0], [0, 1]],
		[[0, -1], [-1, 0], [0, 0], [1, 0]],
		[[0, -1], [0, 0], [1, 0], [0, 1]],
	],
]

//形状的对象
var Tetromino = function () {
	var t = {
		canvas: null,
		blockType: 0,
		pos: Vector2(),
		index: 0,
	}

	//初始化形状
	t.reset = function (newType = 0) {
		this.blockType = newType
		this.index = 0
	}

	//旋转
	t.rotate = function () {
		this.index = (this.index + 1 >= blockData[this.blockType].length) ? 0 : this.index + 1
	}

	//移动到某个位置
	t.moveTo = function (pos) {
		this.pos.x += pos.x
		this.pos.y += pos.y
	}

	//获取形状当前状态的数据
	t.getShape = function () {
		return blockData[this.blockType][this.index]
	}

	//获取形状下一个状态的数据
	t.getNextShape = function () {
		var nextIndex = this.index + 1
		if (nextIndex >= blockData[this.blockType].length) {
			nextIndex = 0
		}
		return blockData[this.blockType][nextIndex]
	}

	//画形状
	t.draw = function (parentOffset) {
		var data = this.getShape()
		for (let i = 0; i < data.length; i++) {
			let x = parentOffset.x + (this.pos.x + data[i][0]) * ConstDefine.block_width
			let y = parentOffset.y + (this.pos.y + data[i][1]) * ConstDefine.block_height
			Draw.fillRect(this.canvas, x, y, ConstDefine.block_width, ConstDefine.block_height, ConstBlockColor[this.blockType])
			Draw.drawRect(this.canvas, x, y, ConstDefine.block_width, ConstDefine.block_height, ConstColor.BlockBgColor)
		}
	}

	return t
}

//墙体中用到的每一个小方块
var Block = function () {
	var b = {
		isFixed: false, //是否固定，如果形状落到底部，则固定在小方块中
		disappearAnimCount: 0, //消失状态
		type: 0, //固定的形状类型，用以绘图的时候显示
	}

	//初始化
	b.reset = function () {
		this.isFixed = false
		this.disappearAnimCount = 0
		this.type = 0
	}

	return b
}

//墙体
var Wall = function () {

	var w = {
		canvas: null,
		body: [], //墙体上10x20的小方块
		UIPos: Vector2(), //用于画在Canvas上的坐标
		tetromino: Tetromino(), //当前形状
		nextTetrominoType: 0, //下一形状
		speed: 0, //当前速度
		drapTimer: null, //计时器，用于下落计时
		animTimer: null, //计时器，用于动画计时
		GameLost: null, //游戏失败的callback
	}

	//初始化
	w.init = function () {
		this.UIPos.x = 10
		this.UIPos.y = 10
		for (let i = 0; i < 20; i++) {
			this.body[i] = []
			for (let j = 0; j < 10; j++) {
				this.body[i][j] = Block()
			}
		}

		//用主屏来画
		this.tetromino.canvas = mainCanvas

		//初始化下一个形状
		this.nextTetromino()
		//初始化当前速度
		this.speed = ConstDefine.levelSpeed[Static.game_level]
	}

	//初始化
	w.reset = function () {
		for (let i = 0; i < 20; i++) {
			for (let j = 0; j < 10; j++) {
				this.body[i][j].reset()
			}
		}

		this.tetromino.blockType = BlockType.BlockType_S
		this.tetromino.pos.x = this.body[0].length / 2
		this.tetromino.pos.y = 0

		this.setSpeed(Static.game_level)
	}

	//随机生成下一个形状
	w.randomNextTetromino = function () {
		this.nextTetrominoType = Math.floor(Math.random() * BlockType.BlockType_MAX)
		log('Error genrate wrong type', this.nextTetrominoType)
	}

	//充值计时器，开始下一次下落的计时
	w.resetTetrominoTimer = function () {
		if (this.drapTimer) {
			clearInterval(this.drapTimer)
		}
		this.drapTimer = setInterval(function () {
			w.autoMove()
		}, this.speed)
	}

	w.setSpeed = function(game_level) {
		this.speed = game_level < ConstDefine.levelSpeed.length ? ConstDefine.levelSpeed[game_level] : ConstDefine.levelSpeed[ConstDefine.levelSpeed.length - 1]
		if(Static.game_state == ConstDefine.gameStateRunning) {
			this.resetTetrominoTimer()
		}
	}

	//暂定计时
	w.stopTetrominoTimer = function () {
		var b = clearInterval(this.drapTimer)
	}

	//检查当前的固定的形状所占的行是否可以被消除
	w.getClearLines = function () {
		var allLines = []
		var fullLines = []
		var shape = this.tetromino.getShape()
		for (let i in shape) {
			allLines.push(this.tetromino.pos.y + shape[i][1])
		}
		allLines = allLines.filter(function (element, index, self) {
			log(self.indexOf(element), index)
			return self.indexOf(element) === index
		})
		for (let i in allLines) {
			let canClear = true
			for (let j = 0; j < this.body[0].length; j++) {
				if (!this.body[allLines[i]][j].isFixed) {
					canClear = false
					break
				}
			}
			if (canClear) {
				fullLines.push(allLines[i])
			}
		}
		return fullLines
	}

	w.playLineAnim = function (line) {
		for (let i in this.body[line]) {
			this.body[line][i].disappearAnimCount++
		}
	}

	w.stopLineAnim = function (line) {
		for (let i in this.body[line]) {
			this.body[line][i].disappearAnimCount = 0
		}
	}

	//开始进行消除动画，异步处理
	w.startLineClear = function (lines) {
		var that = this
		var clearAnim = new Promise(function (resolve, reject) {

			//每100ms 变换一次动画
			that.animTimer = setInterval(() => {
				for (let i in lines) {
					that.playLineAnim(lines[i])
				}
			}, 100)

			//1 sec 后结束
			setTimeout(() => {
				for (let i in lines) {
					that.stopLineAnim(lines[i])
				}
				clearInterval(that.animTimer)
				resolve()
			}, 500)
		})

		return clearAnim
	}

	//移动fromline数据到toline
	//如果fromline无效，则清空toline
	//如果toline无效，则清空fromline
	w.moveLineData = function (fromLine, toLine) {
		for (let i in this.body[fromLine]) {
			if (toLine >= 0 && toLine < this.body.length) {
				this.body[toLine][i].reset()

				if (fromLine >= 0 && fromLine < this.body.length) {
					this.body[toLine][i].isFixed = this.body[fromLine][i].isFixed
					this.body[toLine][i].type = this.body[fromLine][i].type
					this.body[toLine][i].disappearAnimCount = this.body[fromLine][i].disappearAnimCount
				}
			}
			else if (fromLine >= 0 && fromLine < this.body.length) {
				this.body[fromLine][i].reset()
				log("Error toline in w.moveLineData()")
			}

		}
	}

	w.lineClear = function (lines) {
		//排序，数字大的在第一位
		lines = lines.sort((x, y) => {
			if (x > y) {
				return -1
			}
			else if (x < y) {
				return 1
			}
			return 0
		})
		var fromLine = lines[0]
		for (let i = fromLine; i >= 0; i--) {
			this.moveLineData(i - lines.length, i)
		}
	}

	w.checkDisappearAndContinue = function () {
		var that = this
		//if can 
		var lines = this.getClearLines()
		if (lines.length > 0) {
			Static.game_score += ConstDefine.score[lines.length - 1]
			Static.game_lines += lines.length
			//stop timer
			this.stopTetrominoTimer()
			//clear lines
			this.startLineClear(lines).then(() => {
				//resume drop timer
				that.stopLineAnim(lines)
				that.resetTetrominoTimer()
				that.lineClear(lines)
			})
		}
	}

	//尝试移动到某个方向，需要在里面判断是否可移动
	w.moveTo = function (direction) {
		var newPos = Vector2()
		switch (direction) {
			case ConstDefine.dir_left:
				newPos.x = -1
				break
			case ConstDefine.dir_right:
				newPos.x = 1
				break
			case ConstDefine.dir_down:
				newPos.y = 1
				break
		}

		if (this.canMoveTo(newPos)) {
			this.tetromino.moveTo(newPos)
		}
	}

	//尝试旋转，判断是否可旋转
	w.rotateNext = function () {
		log('w.rotateNext')
		if (this.canRotate()) {
			this.tetromino.rotate()
		}
	}

	//碰撞检测，用于判断是否可移动和旋转
	w.checkCollision = function (pos, shape) {
		for (let i = 0; i < shape.length; i++) {
			let x = pos.x + shape[i][0]
			let y = pos.y + shape[i][1]
			if (x < 0 || x >= this.body[0].length || y >= this.body.length || (y > 0 && this.body[y][x].isFixed)) //不考虑y<0情况，因为是从顶部掉下来，顶部可能超过墙体上限
			{
				return false
			}
		}
		return true
	}

	//判断是否可旋转
	w.canRotate = function () {
		return this.checkCollision(this.tetromino.pos, this.tetromino.getNextShape())
	}

	//判断是否可移动
	w.canMoveTo = function (pos) {
		var newPos = Vector2()
		newPos.x = pos.x + this.tetromino.pos.x
		newPos.y = pos.y + this.tetromino.pos.y
		return this.checkCollision(newPos, this.tetromino.getShape())
	}

	//落到底部后固定形状到墙体中
	w.fixTetromino = function () {
		let shape = this.tetromino.getShape()
		for (let i = 0; i < shape.length; i++) {
			let x = this.tetromino.pos.x + shape[i][0]
			let y = this.tetromino.pos.y + shape[i][1]
			this.body[y][x].isFixed = true
			this.body[y][x].type = this.tetromino.blockType
		}
	}

	//检测是否失败
	w.checkLost = function () {
		let shape = this.tetromino.getShape()
		for (let i = 0; i < shape.length; i++) {
			if (this.tetromino.pos.y + shape[i][1] < 0)
				return true
		}
		return false
	}

	//随机生成下一个形状
	w.nextTetromino = function () {
		this.tetromino.reset()
		this.tetromino.blockType = this.nextTetrominoType
		this.tetromino.pos.x = this.body[0].length / 2
		this.tetromino.pos.y = 0
		this.randomNextTetromino()
	}

	//自动下落一层
	w.autoMove = function () {
		var downPos = Vector2()
		downPos.y = 1
		if (this.canMoveTo(downPos)) {
			this.tetromino.moveTo(downPos)
		}
		else if (this.checkLost()) {
			// this.lost()
		}
		else {
			this.fixTetromino()
			this.checkDisappearAndContinue()
			this.nextTetromino()
		}
	}

	//墙体绘制，包括当前下落的形状
	w.draw = function () {
		Draw.fillRect(this.canvas, this.UIPos.x, this.UIPos.y,
			this.body[0].length * ConstDefine.block_width,
			this.body.length * ConstDefine.block_height, ConstColor.WallBgColor)

		for (let i = 0; i < this.body[0].length; i++) {
			for (let j = 0; j < this.body.length; j++) {
				if (this.body[j][i].isFixed) {
					let x = i * ConstDefine.block_width + this.UIPos.x
					let y = j * ConstDefine.block_height + this.UIPos.y

					if (this.body[j][i].disappearAnimCount % 2 == 0) {
						Draw.drawRect(this.canvas, x, y, ConstDefine.block_width, ConstDefine.block_height, ConstColor.BlockColor)
						Draw.fillRect(this.canvas, x, y, ConstDefine.block_width, ConstDefine.block_height, ConstBlockColor[this.body[j][i].type])
					}
				}
			}
		}

		this.tetromino.draw(this.UIPos)
		
		Draw.drawRect(this.canvas, this.UIPos.x, this.UIPos.y,
			this.body[0].length * ConstDefine.block_width,
			this.body.length * ConstDefine.block_height, ConstColor.WallColor)
	}

	// w.getRect = function() {
	// 	var r = Rect()
	// 	r.pos = w.UIPos
	// 	r.width = this.body[0].length * ConstDefine.block_width
	// 	r.height = this.body.length * ConstDefine.block_height

	// 	return r
	// }

	//init
	w.init()

	return w
}

//游戏类
var Game = function () {
	var g = {
		actions: {},
		keydown: {},
	}

	var wall = Wall()
	wall.canvas = mainCanvas
	wall.UIPos.x = 0
	wall.UIPos.y = 0

	var nextTetromino = Tetromino()
	nextTetromino.canvas = smallCanvas

	g.init = function () {

		//添加按键按下的事件
		window.addEventListener('keydown', function (event) {
			if (event.key == 'a' || event.key == 'ArrowLeft') {
				g.keydown[ConstDefine.dir_left] = true
			} else if (event.key == 'd' || event.key == 'ArrowRight') {
				g.keydown[ConstDefine.dir_right] = true
			} else if (event.key == 'w' || event.key == 'ArrowUp') {
				g.keydown[ConstDefine.dir_up] = true
			} else if (event.key == 's' || event.key == 'ArrowDown') {
				g.keydown[ConstDefine.dir_down] = true
			} else if (event.key == ',') {
				Static.game_level = (Static.game_level - 1 < 0 ? 0 : Static.game_level - 1)
				wall.setSpeed(Static.game_level)
			} else if (event.key == '.') {
				Static.game_level += 1
				wall.setSpeed(Static.game_level)
			} else if (event.key == 'p') {
				Static.game_pause = !Static.game_pause
				if (Static.game_pause) {
					g.pauseGame()
				}
				else {
					g.resumeGame()
				}
			}
		})

		//添加按键松开的事件
		window.addEventListener('keyup', function (event) {
			if (event.key == 'a' || event.key == 'ArrowLeft') {
				g.keydown[ConstDefine.dir_left] = false
			} else if (event.key == 'd' || event.key == 'ArrowRight') {
				g.keydown[ConstDefine.dir_right] = false
			} else if (event.key == 'w' || event.key == 'ArrowUp') {
				g.keydown[ConstDefine.dir_up] = false
			} else if (event.key == 's' || event.key == 'ArrowDown') {
				g.keydown[ConstDefine.dir_down] = false
			}
		})

		//注册按键的回调
		this.registerAction(ConstDefine.dir_left, function () {
			wall.moveTo(ConstDefine.dir_left)
		})
		this.registerAction(ConstDefine.dir_right, function () {
			wall.moveTo(ConstDefine.dir_right)
		})
		this.registerAction(ConstDefine.dir_down, function () {
			wall.moveTo(ConstDefine.dir_down)
		})
		this.registerAction(ConstDefine.dir_up, function () {
			wall.rotateNext()
		})
	

		//开始游戏，后续需要通过按键或者按钮激活
		startButton.addEventListener('click', function () {
			g.newGame()
		});
	}

	g.registerAction = function (key, callback) {
		g.actions[key] = callback
	}

	//按键检测
	g.update = function () {
		if(Static.game_state == ConstDefine.gameStateRunning)
		{
			if (g.keydown[ConstDefine.dir_left])
				g.actions[ConstDefine.dir_left]()
			if (g.keydown[ConstDefine.dir_right])
				g.actions[ConstDefine.dir_right]()
			if (g.keydown[ConstDefine.dir_up]) {
				g.keydown[ConstDefine.dir_up] = false
				g.actions[ConstDefine.dir_up]()
			}
			if (g.keydown[ConstDefine.dir_down])
				g.actions[ConstDefine.dir_down]()
		}
	}

	//开始新的游戏
	g.newGame = function () {
		//clear score
		Static.game_score = 0
		Static.game_level = 0
		Static.game_lines = 0
		Static.game_pause = false
		Static.game_state = ConstDefine.gameStateRunning
		//clear wall
		wall.reset()
		//reset timer
		wall.resetTetrominoTimer()

		startButton.active = false
	}

	g.pauseGame = function () {
		//stop timer
		wall.stopTetrominoTimer()
	}

	g.resumeGame = function () {
		//restart timer
		wall.resetTetrominoTimer()
	}

	g.draw = function () {
		//clear canvas
		Draw.clearRect(mainCanvas, 0, 0, mainCanvas.width, mainCanvas.height)
		Draw.clearRect(smallCanvas, 0, 0, smallCanvas.width, smallCanvas.height)

		//draw wall
		wall.draw()

		//draw next tetromino
		var pos = Vector2()
		pos.x = smallCanvas.width / 2
		pos.y = smallCanvas.height / 2
		nextTetromino.blockType = wall.nextTetrominoType
		nextTetromino.draw(pos)

		//draw pause
		if (Static.game_pause) {
			Draw.fillText(mainCanvas, mainCanvas.width / 2 - 50, mainCanvas.height / 2, Font.GamePause, "PAUSED")
		}
	}

	g.init()

	return g
}

var __main = function () {
	log(ConstDefine)

	//init
	var game = Game()

	//run
	setInterval(function () {
		if (!Static.game_pause) {
			game.update()
		}

		game.draw()
	}, 1000 / 30)
}

__main()
