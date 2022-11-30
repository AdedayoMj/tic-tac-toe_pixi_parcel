

// const endpoint = "ws://localhost:2567"

// import { Client } from 'colyseus.js'
import * as PIXI from 'pixi.js';
import { BlurFilter, Container, Graphics, Sprite } from 'pixi.js';
import type Server from './services/Server';
import ITicTacToeState, { Cell, GameState } from '../types/ITicTacToeState'
import { IGameOverSceneData, IGameSceneData } from '../types/scenes';
// window.colyseus = new Client(endpoint);
import { Client, Room } from 'colyseus.js'
import { Message } from '../types/messages'
import { application } from 'express';

export default class Application extends PIXI.Application  {
    private server?: Server
	public stage: PIXI.Container;
	background: PIXI.Sprite
	// private onGameOver?: (data: IGameOverSceneData) => void
    // private gameStateText?:PIXI.BitmapText
    // private cells: { display: PIXI.Rectangle, value: Cell }[] = []
    private client: Client
	private events:  PIXI.utils.EventEmitter
	public readonly view!: HTMLCanvasElement;
	private cells: { display: PIXI.GameObjects.Rectangle, value: Cell }[] = []
	private gameStateText?: PIXI.BitmapText
	private room?: Room<ITicTacToeState>
	private _playerIndex = -1

    get playerIndex()
	{
		return this._playerIndex
	}

	get gameState()
	{
		if (!this.room)
		{
			return GameState.WaitingForPlayers
		}

		return this.room?.state.gameState
	}


    constructor(){
        super({
			// width: window.innerWidth,
			// height: window.innerHeight,
            width:600,
            height: 600,
            backgroundColor: 0x0c0c0c
        });
        this.client = new Client('ws://localhost:2567')
		this.events = new PIXI.utils.EventEmitter()
        this.create();
		
    }
	// {
	// 	super('game')
	// }

    init()
	{
		this.cells = []
	}

    async create(){
		await this.join()
		this.onceStateChanged(this.createBoard, this)
    }
	
    async join() {
        this.room = await this.client.joinOrCreate<ITicTacToeState>('tic-tac-toe')

		this.room.onMessage(Message.PlayerIndex, (message: { playerIndex: number }) => {
			console.log(message.playerIndex)
			this._playerIndex = message.playerIndex
		})

		this.room.onStateChange.once(state => {
			this.events.emit('once-state-changed', state)
		})

		this.room.state.onChange = (changes) => {
			changes.forEach(change => {
				console.log(change)
				const { field, value } = change

				switch (field)
				{
					// case 'board':
					// 	this.events.emit('board-changed', value)
					// 	break
					
					case 'activePlayer':
						this.events.emit('player-turn-changed', value)
						break

					case 'winningPlayer':
						this.events.emit('player-win', value)
						break

					case 'gameState':
						this.events.emit('game-state-changed', value)
						break
				}
			})
		}

		this.room.state.board.onChange = (item, idx) => {
			this.events.emit('board-changed', item, idx)
		}
    }

	private createBoard(state: ITicTacToeState)
	{
		// const { width, height } = PIXI.scale
		const size = 128
		this.background = new PIXI.Sprite.fromImage('assets/board.png')
		this.stage.addChild(this.background)
		
		// let x = (super.width * 0.5) - size
		// let y = (super.height * 0.5) - size
		let slot = new PIXI.Graphics()
    	slot.beginFill(0xFFFFFF, 0.0)
    	slot.drawRect(0, 0, size, size)
		for (let y=0; y<3; y++) {
			for (let x=0; x<3; x++) {
			  let s = slot.clone()
			  s.x = x * size
			  s.y = y * size
			  s.interactive = true
			//   s.on('click', this.onSelect.bind(this, x, y))
			//   s.on('touchend', this.onSelect.bind(this, x, y))
			  this.stage.addChild(s)
			}
		  }
		state.board.forEach((cellState, idx) => {
			
			// const cell = super.addchild.rectangle(x, y, size, size, 0xffffff)
			// 	.setInteractive()
			// 	.on(PIXI.Input.Events.GAMEOBJECT_POINTER_UP, () => {
			// 		this.server?.makeSelection(idx)
			// 	})

			// switch (cellState)
			// {
			// 	case Cell.X:
			// 	{
			// 		super.add.star(cell.x, cell.y, 4, 4, 60, 0xff0000)
			// 			.setAngle(45)
			// 		break
			// 	}

			// 	case Cell.O:
			// 	{
			// 		super.add.circle(cell.x, cell.y, 50, 0x0000ff)
			// 		break
			// 	}
			// }

			// this.cells.push({
			// 	display: cell,
			// 	value: cellState 
			// })

			// x += size + 5

			// if ((idx + 1) % 3 === 0)
			// {
			// 	y += size + 5
			// 	x = (width * 0.5) - size
			// }
		})
		

		// this.gameStateText = new PIXI.BitmapText('Waiting for opponent...', {
			
		// 	fontName: 'Desyrel',
		// 	fontSize: 35,
		// });
		if (this.server?.gameState === GameState.WaitingForPlayers)
		{
			this.gameStateText = new PIXI.BitmapText('Waiting for opponent...', {
				fontSize: 50
			});

		}

		this.onBoardChanged(this.handleBoardChanged, this)
		this.onPlayerTurnChanged(this.handlePlayerTurnChanged, this)
		this.onPlayerWon(this.handlePlayerWon, this)
		this.onGameStateChanged(this.handleGameStateChanged, this)
	}

	leave()
	{
		this.room?.leave()
		this.events.removeAllListeners()
	}

	makeSelection(idx: number)
	{
		if (!this.room)
		{
			return
		}

		if (this.room.state.gameState !== GameState.Playing)
		{
			return
		}

		if (this.playerIndex !== this.room.state.activePlayer)
		{
			console.warn('not this player\'s turn')
			return
		}

		this.room.send(Message.PlayerSelection, { index: idx })
	}

	onceStateChanged(cb: (state: ITicTacToeState) => void, context?: any)
	{
		this.events.once('once-state-changed', cb, context)
	}

	onBoardChanged(cb: (cell: number, index: number) => void, context?: any)
	{
		this.events.on('board-changed', cb, context)
	}

	onPlayerTurnChanged(cb: (playerIndex: number) => void, context?: any)
	{
		this.events.on('player-turn-changed', cb, context)
	}

	onPlayerWon(cb: (playerIndex: number) => void, context?: any)
	{
		this.events.on('player-win', cb, context)
	}

	onGameStateChanged(cb: (state: GameState) => void, context?: any)
	{
		this.events.on('game-state-changed', cb, context)
	}

	private handleBoardChanged(newValue: Cell, idx: number)
	{
		const cell = this.cells[idx]
		if (cell.value !== newValue)
		{
			switch (newValue)
			{
				case Cell.X:
				{
					super.add.star(cell.display.x, cell.display.y, 4, 4, 60, 0xff0000)
						.setAngle(45)
					break
				}

				case Cell.O:
				{
					super.add.circle(cell.display.x, cell.display.y, 50, 0x0000ff)
					break
				}
			}

			cell.value = newValue
		}
	}

	private handlePlayerTurnChanged(playerIndex: number)
	{
		// TODO: show a message letting the player know it is their turn
	}

	private handlePlayerWon(playerIndex: number)
	{
		// this.time.delayedCall(1000, () => {
		// 	if (!this.onGameOver)
		// 	{
		// 		return
		// 	}

		// 	this.onGameOver({
		// 		winner: this.server?.playerIndex === playerIndex
		// 	})
		// })
	}

	private handleGameStateChanged(state: GameState)
	{
		if (state === GameState.Playing && this.gameStateText)
		{
			this.gameStateText.destroy()
			this.gameStateText = undefined
		}
	}

}