'use strict'

var canvas = document.querySelector('#id_canvas')
var context = canvas.getContext('2d')
var log = console.log.bind(console)

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

	//方块速度，掉落一层的时间(ms)
	defaultSpeed: 1000 //1 sec
}

// 常用颜色
const ConstColor = {
	WallBgColor: '#C0C0C0',
	WallColor: '#000000',
	BlockBgColor: '#909090',
	BlockColor: '#000000',
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
	game_pause: false,//游戏是否暂停
}

//向量，用于表示2D速度和2D坐标
var Vector2 = function() {
	var v = {
		x: 0,
		y: 0,
	}

	return v
}

//矩形对象
var Rect = function() {
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
	clearRect: function(x,y,w,h) {
		context.clearRect(x,y,w,h); 
	},

	//画外框
	drawRect: function(x,y,w,h,color) {
		context.strokeStyle = color;  
		context.strokeRect(x,y,w,h);  
	},

	//填充矩形
	fillRect: function(x,y,w,h,color) {
		context.fillStyle = color;  
		context.fillRect(x,y,w,h);  
	},

	//写字
	fillText: function(x,y,font,string) {
		context.font=font;
		context.fillText(string,x,y);
	}
}

//七种形状的基本数据，每一种包含的形态以及每个形态占据的位置
var blockData = [	
	[//S
		[[0,-1],[1,-1],[-1,0],[0,0]], [[0,-1],[0,0],[1,0],[1,1]],
	],
	[//Z
		[[-1,-1],[0,-1],[0,0],[0,1]], [[1,-1],[0,0],[1,0],[0,1]],
	],
	[//L
		[[0,-1],[0,0],[0,1],[1,1]],
		[[-1,0],[0,0],[1,0],[-1,1]],
		[[-1,-1],[0,-1],[0,0],[0,1]],
		[[1,-1],[-1,0],[0,0],[1,0]],
	],
	[//J
		[[0,-1],[0,0],[0,1],[-1,1]],
		[[-1,-1],[-1,0],[0,0],[1,0]],
		[[0,-1],[1,-1],[0,0],[0,1]],
		[[-1,0],[0,0],[1,0],[1,1]],
	],
	[//I
		[[0,-1],[0,0],[0,1],[0,2]],
		[[-1,0],[0,0],[1,0],[2,0]],
	],
	[//O
		[[-1,-1],[0,-1],[-1,0],[0,0]],
	],
	[//T
		[[-1,0],[0,0],[1,0],[0,1]],
		[[0,-1],[-1,0],[0,0],[0,1]],
		[[0,-1],[-1,0],[0,0],[1,0]],
		[[0,-1],[0,0],[1,0],[0,1]],
	],
]

//形状的对象
var Tetromino = function() {
	var t = {
		blockType: 0,
		pos: Vector2(),
		index: 0,
	}

	//初始化形状
	t.reset = function(newType=0) {
		this.blockType = newType
		this.index = 0
	}

	//旋转
	t.rotate = function() {
		this.index = (this.index + 1 >= blockData[this.blockType].length) ? 0 : this.index + 1
	}

	//移动到某个位置
	t.moveTo = function(pos) {
		this.pos.x += pos.x
		this.pos.y += pos.y
	}

	//获取形状当前状态的数据
	t.getShape = function() {
		return blockData[this.blockType][this.index]
	}
	
	//获取形状下一个状态的数据
	t.getNextShape = function() {
		var nextIndex = this.index + 1
		if(nextIndex >= blockData[this.blockType].length)
		{
			nextIndex = 0
		}
		return blockData[this.blockType][nextIndex]
	}

	//画形状
	t.draw = function(parentOffset) {
		var data = this.getShape()
		for(let i = 0; i < data.length; i++)
		{
			let x = parentOffset.x + (this.pos.x + data[i][0]) * ConstDefine.block_width
			let y = parentOffset.y + (this.pos.y + data[i][1]) * ConstDefine.block_height
			Draw.fillRect(x, y, ConstDefine.block_width, ConstDefine.block_height, ConstColor.BlockBgColor)
			Draw.drawRect(x, y, ConstDefine.block_width, ConstDefine.block_height, ConstColor.BlockColor)
		}
	}

	return t
}

//墙体中用到的每一个小方块
var Block = function() {
	var b = {
		isFixed: false, //是否固定，如果形状落到底部，则固定在小方块中
		type: 0, //固定的形状类型，用以绘图的时候显示
	}

	//初始化
	b.reset = function() {
		this.isFixed = false
		this.type = 0
	}

	return b
}

//墙体
var Wall = function() {
	var timer = 0

	var w = {
		body: [], //墙体上10x20的小方块
		UIPos: Vector2(), //用于画在Canvas上的坐标
		tetromino: Tetromino(), //当前形状
		nextTetrominoType: 0, //下一形状
		speed: 0, //当前速度
		timer: null, //计时器，用于下落计时
		GameLost: null, //游戏失败的callback
	}

	//初始化
	w.init = function() {
		this.UIPos.x = 10
		this.UIPos.y = 10
		for(let i = 0; i < 20; i++)	{
			this.body[i] = []
			for(let j = 0; j < 10; j++)	{
				this.body[i][j] = Block()
			}
		}

		//初始化下一个形状
		this.nextTetromino()
		//初始化当前速度
		this.speed = ConstDefine.defaultSpeed
	}

	//初始化
	w.reset = function() {
		for(let i = 0; i < 20; i++)	{
			for(let j = 0; j < 10; j++)	{
				this.body[i][j].reset()
			}
		}

		this.tetromino.blockType = BlockType.BlockType_S
		this.tetromino.pos.x = this.body[0].length / 2
		this.tetromino.pos.y = 0
		
		this.speed = ConstDefine.defaultSpeed
	}

	//随机生成下一个形状
	w.randomNextTetromino = function() {
		this.nextTetrominoType = Math.floor(Math.random() * BlockType.BlockType_MAX)
		log('Error genrate wrong type', this.nextTetrominoType)
	}

	//充值计时器，开始下一次下落的计时
	w.resetTetrominoTimer = function() {
		this.timer = setInterval(function() {
			w.autoMove()
		}, this.speed)
	}

	//尝试移动到某个方向，需要在里面判断是否可移动
	w.moveTo = function(direction) {
		var newPos = Vector2()
		switch(direction)
		{
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

		if(this.canMoveTo(newPos))
		{
			this.tetromino.moveTo(newPos)
		}
	}

	//尝试旋转，判断是否可旋转
	w.rotateNext = function() {
		log('w.rotateNext')
		if(this.canRotate())
		{
			this.tetromino.rotate()
		}
	}

	//碰撞检测，用于判断是否可移动和旋转
	w.checkCollision = function(pos, shape) {
		for(let i = 0; i < shape.length; i++)
		{
			let x = pos.x + shape[i][0]
			let y = pos.y + shape[i][1]
			if(x < 0 || x >= this.body[0].length || y >= this.body.length || (y > 0 && this.body[y][x].isFixed)) //不考虑y<0情况，因为是从顶部掉下来，顶部可能超过墙体上限
			{
				return false
			}			
		}
		return true
	}

	//判断是否可旋转
	w.canRotate = function() {
		return this.checkCollision(this.tetromino.pos, this.tetromino.getNextShape())
	}

	//判断是否可移动
	w.canMoveTo = function(pos) {
		var newPos = Vector2()
		newPos.x = pos.x + this.tetromino.pos.x
		newPos.y = pos.y + this.tetromino.pos.y
		return this.checkCollision(newPos, this.tetromino.getShape())
	}

	//落到底部后固定形状到墙体中
	w.fixTetromino = function() {
		let shape = this.tetromino.getShape()
		for(let i = 0; i < shape.length; i++)
		{
			let x = this.tetromino.pos.x + shape[i][0]
			let y = this.tetromino.pos.y + shape[i][1]
			this.body[y][x].isFixed = true
			this.body[y][x].type = this.tetromino.blockType
		}
	}

	//检测是否失败
	w.checkLost = function() {
		let shape = this.tetromino.getShape()
		for(let i = 0; i < shape.length; i++){
			if(this.tetromino.pos.y + shape[i][1] < 0)
				return true
		}
		return false
	}

	//随机生成下一个形状
	w.nextTetromino = function() {
		this.tetromino.reset()
		this.tetromino.blockType = this.nextTetrominoType
		this.tetromino.pos.x = this.body[0].length / 2
		this.tetromino.pos.y = 0
		this.randomNextTetromino()
	}

	//自动下落一层
	w.autoMove = function() {
		var downPos = Vector2()
		downPos.y = 1
		if(this.canMoveTo(downPos)) {
			this.tetromino.moveTo(downPos)
		}
		else if(this.checkLost()) {
			// this.lost()
		}
		else{
			this.fixTetromino()
			this.nextTetromino()
		}
	}

	//墙体绘制，包括当前下落的形状
	w.draw = function () {
		Draw.fillRect(this.UIPos.x, this.UIPos.y, 
			this.body[0].length * ConstDefine.block_width, 
			this.body.length * ConstDefine.block_height, ConstColor.WallBgColor)
		Draw.drawRect(this.UIPos.x, this.UIPos.y, 
			this.body[0].length * ConstDefine.block_width, 
			this.body.length * ConstDefine.block_height, ConstColor.WallColor)

		for(let i = 0; i < this.body[0].length; i++) {
			for(let j = 0; j < this.body.length; j++) {
				if(this.body[j][i].isFixed){
					let x = i * ConstDefine.block_width + this.UIPos.x
					let y = j * ConstDefine.block_height + this.UIPos.y
					
					Draw.drawRect(x, y, ConstDefine.block_width, ConstDefine.block_height, ConstColor.BlockBgColor)
					Draw.fillRect(x, y, ConstDefine.block_width, ConstDefine.block_height, ConstColor.BlockColor)
				}
			}
		}

		this.tetromino.draw(this.UIPos)
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
		score: 0
	}

	var wall = Wall()
	wall.UIPos.x = 10
	wall.UIPos.y = 10

	g.init = function() {
		
		//添加按键按下的事件
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
				if(Static.game_pause)
				{
					g.pauseGame()
				}
				else
				{
					g.resumeGame()
				}
			} 
		})
	
		//添加按键松开的事件
		window.addEventListener('keyup', function(event) {
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
		this.registerAction(ConstDefine.dir_left, function() {
			wall.moveTo(ConstDefine.dir_left)
		})
		this.registerAction(ConstDefine.dir_right, function() {
			wall.moveTo(ConstDefine.dir_right)
		})
		this.registerAction(ConstDefine.dir_down, function() {
			wall.moveTo(ConstDefine.dir_down)
		})
		this.registerAction(ConstDefine.dir_up, function() {
			wall.rotateNext()
		})

		//开始游戏，后续需要通过按键或者按钮激活
		g.newGame()
	}

	g.registerAction = function(key, callback) {
		g.actions[key] = callback
	}

	//按键检测
	g.update = function() {
		if(g.keydown[ConstDefine.dir_left])
			g.actions[ConstDefine.dir_left]()
		if(g.keydown[ConstDefine.dir_right])
			g.actions[ConstDefine.dir_right]()
		if(g.keydown[ConstDefine.dir_up])
		{
			g.keydown[ConstDefine.dir_up] = false
			g.actions[ConstDefine.dir_up]()
		}
		if(g.keydown[ConstDefine.dir_down])
			g.actions[ConstDefine.dir_down]()
	}

	//开始新的游戏
	g.newGame = function() {
		//clear score
		this.score = 0
		//clear wall
		wall.reset()
		//reset timer
		wall.resetTetrominoTimer()
	}

	g.pauseGame = function() {
		//stop timer
	}

	g.resumeGame = function() {
		//restart timer
	}

	g.draw = function() {
		Draw.clearRect(0, 0, canvas.width, canvas.height)

		wall.draw()
	}

	g.init()

	return g
}

var __main = function() {
	log(ConstDefine)

	//init
	var game = Game()

	//run
	setInterval(function () {
		if (!Static.game_pause)
		{
			game.update()
		}

		game.draw()
	}, 1000/30)
}

__main()
