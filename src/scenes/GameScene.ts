import Phaser from 'phaser';
import { CONFIG, SPAWN_POSITIONS, TASK_POSITIONS } from '../config';
import { Character } from '../entities/Character';
import { Task } from '../entities/Task';
import { TimerSystem } from '../systems/TimerSystem';
import { TaskSystem } from '../systems/TaskSystem';
import { SceneTransition } from '../utils/SceneTransition';
import { SoundManager } from '../utils/SoundManager';

export class GameScene extends Phaser.Scene {
  private characters!: Map<number, Character>;
  private activeCharacterId: number = 1;
  private timerSystem!: TimerSystem;
  private taskSystem!: TaskSystem;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private numberKeys!: Map<number, Phaser.Input.Keyboard.Key>;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private gameOver: boolean = false;
  private assistMode: boolean = false;
  private backgrounds: Phaser.GameObjects.TileSprite[] = [];
  private nearbyTaskId: number | null = null;
  private completedTasksCount: number = 0;
  private hasWon: boolean = false;
  private mapZoneSeparators: Phaser.GameObjects.Graphics[] = [];
  private isMinigameActive: boolean = false;
  private soundManager!: SoundManager;
  private sprintEnergy: number = 100;
  private maxSprintEnergy: number = 100;
  private sprintDrainRate: number = 30;
  private sprintRegenRate: number = 15;
  private isSprinting: boolean = false;
  private shiftKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameOver = false;
    this.hasWon = false;
    this.completedTasksCount = 0;
    this.sprintEnergy = 100;
    this.isSprinting = false;
    
    this.cameras.main.resetFX();
    this.cameras.main.clearAlpha();
    this.cameras.main.setAlpha(1);
    this.cameras.main.setBackgroundColor(0x000000);
  
    this.sound.stopAll();
    
    this.soundManager = new SoundManager(this);
    
    const settings = localStorage.getItem(CONFIG.STORAGE.SETTINGS);
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.masterVolume !== undefined) {
        this.soundManager.setMasterVolume(parsed.masterVolume);
      }
      if (parsed.musicVolume !== undefined) {
        this.soundManager.setMusicVolume(parsed.musicVolume);
      }
      if (parsed.sfxVolume !== undefined) {
        this.soundManager.setSfxVolume(parsed.sfxVolume);
      }
    }
    
    this.loadSettings();
    this.createBackground();
    
    this.timerSystem = new TimerSystem(this.assistMode);
    this.taskSystem = new TaskSystem();
    
    this.setupEventHandlers();
    
    this.events.on('minigameCompleted', (data: { taskId: number; characterId: number }) => {
      this.completeTask(data.taskId, data.characterId);
    });
    
    this.createCharacters();
    this.createTasks();
    this.setupInput();

    this.events.emit('timersUpdated', this.timerSystem.getAllTimers());
    this.events.emit('characterSwitched', this.activeCharacterId);
    this.events.emit('sprintEnergyUpdated', {
      energy: this.sprintEnergy,
      maxEnergy: this.maxSprintEnergy
    });
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.hasWon) return;

    this.timerSystem.update(delta, this.activeCharacterId);

    this.updateCharacterMovement(delta);
    this.updateSprint(delta);
    this.checkTaskProximity();

    this.events.emit('timersUpdated', this.timerSystem.getAllTimers());
  }

  private createBackground(): void {
    const tileSize = CONFIG.MAP.TILE_SIZE;
    const zoneWidth = CONFIG.MAP.WIDTH * tileSize;
    const zoneHeight = CONFIG.MAP.HEIGHT * tileSize;
    const spacing = CONFIG.MAP.ZONE_SPACING * tileSize;

    const zoneTiles = ['tile_zone1', 'tile_zone2', 'tile_zone3'];

    for (let zone = 0; zone < CONFIG.MAP.ZONE_COUNT; zone++) {
      const offsetX = zone * (zoneWidth + spacing);
      
      const bg = this.add.tileSprite(offsetX, 0, zoneWidth, zoneHeight, zoneTiles[zone]);
      bg.setOrigin(0, 0);
      this.backgrounds.push(bg);
    
      if (zone > 0) {
        const separator = this.add.graphics();
        separator.lineStyle(4, 0x00CED1, 0.5);
        separator.lineBetween(offsetX - spacing / 2, 0, offsetX - spacing / 2, zoneHeight);
        this.mapZoneSeparators.push(separator);
      }
    }

    this.cameras.main.setBounds(0, 0, zoneWidth, zoneHeight);
  }

  private createCharacters(): void {
    this.characters = new Map();
    const tileSize = CONFIG.MAP.TILE_SIZE;
    const zoneWidth = CONFIG.MAP.WIDTH * tileSize;
    const zoneHeight = CONFIG.MAP.HEIGHT * tileSize;
    const spacing = CONFIG.MAP.ZONE_SPACING * tileSize;
    
    SPAWN_POSITIONS.forEach((pos) => {
      const zoneOffsetX = pos.zone * (zoneWidth + spacing);
      const margin = 100;

      const pixelX = zoneOffsetX + margin + Math.random() * (zoneWidth - margin * 2);
      const pixelY = zoneHeight / 2;
      
      const character = new Character(
        this,
        pixelX,
        pixelY,
        pos.id
      );
      
      this.characters.set(pos.id, character);
    });
    
    this.setActiveCharacter(this.activeCharacterId);

    this.updateCameraForActiveCharacter();
  }

  private createTasks(): void {
    const tileSize = CONFIG.MAP.TILE_SIZE;
    const zoneWidth = CONFIG.MAP.WIDTH * tileSize;
    const zoneHeight = CONFIG.MAP.HEIGHT * tileSize;
    const spacing = CONFIG.MAP.ZONE_SPACING * tileSize;
    const margin = 100;
    const minDistance = 150; 

    const taskPositions: { x: number; y: number }[] = [];
    
    TASK_POSITIONS.forEach((pos) => {
      const zoneOffsetX = pos.zone * (zoneWidth + spacing);
      
      let randomX: number;
      let randomY: number;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        randomX = zoneOffsetX + margin + Math.random() * (zoneWidth - margin * 2);
        randomY = margin + Math.random() * (zoneHeight - margin * 2);
        attempts++;
       
        const isFarEnough = taskPositions.every(existingPos => {
          const distance = Math.sqrt(
            Math.pow(randomX - existingPos.x, 2) + 
            Math.pow(randomY - existingPos.y, 2)
          );
          return distance >= minDistance;
        });
        
        if (isFarEnough || attempts >= maxAttempts) {
          break;
        }
      } while (attempts < maxAttempts);
    
      taskPositions.push({ x: randomX, y: randomY });
      
      const task = new Task(this, randomX, randomY, pos.type);
      this.taskSystem.addTask(task);
  
      this.tweens.add({
        targets: task,
        y: task.y + 10,
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 1000
      });
      
      this.tweens.add({
        targets: task,
        angle: -5 + Math.random() * 10,
        duration: 1500 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 500
      });
    });
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys('W,A,S,D') as any;
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.numberKeys = new Map();
    this.numberKeys.set(1, this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE));
    this.numberKeys.set(2, this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO));
    this.numberKeys.set(3, this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE));
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const pKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    
    escKey.on('down', () => {
      if (!this.gameOver && !this.hasWon && !this.isMinigameActive) {
        this.openPauseMenu();
      }
    });
    
    pKey.on('down', () => {
      if (!this.gameOver && !this.hasWon && !this.isMinigameActive) {
        this.openPauseMenu();
      }
    });

    this.numberKeys.forEach((key, charId) => {
      key.on('down', () => {
        if (!this.gameOver && !this.isMinigameActive) {
          this.setActiveCharacter(charId);
        }
      });
    });

    this.spaceKey.on('down', () => {
      if (!this.gameOver && this.nearbyTaskId !== null) {
        this.handleTaskInteraction(this.nearbyTaskId);
      }
    });
  }
  
  private openPauseMenu(): void {
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('PauseMenu');
  }

  private updateCharacterMovement(delta: number): void {
    if (this.isMinigameActive) return;
    
    const activeChar = this.characters.get(this.activeCharacterId);
    if (!activeChar) return;
    
    let velocityX = 0;
    let velocityY = 0;
    
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) velocityX = -1;
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) velocityX = 1;
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) velocityY = -1;
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) velocityY = 1;
    
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    const isMoving = velocityX !== 0 || velocityY !== 0;
    if (isMoving && this.shiftKey.isDown && this.sprintEnergy > 0) {
      this.isSprinting = true;
      velocityX *= 1.8;
      velocityY *= 1.8;
    } else {
      this.isSprinting = false;
    }
    
    activeChar.setVelocity(velocityX, velocityY);
    activeChar.update(delta);
  }

  private updateSprint(delta: number): void {
    const deltaSeconds = delta / 1000;

    if (this.isSprinting && this.sprintEnergy > 0) {
      this.sprintEnergy = Math.max(0, this.sprintEnergy - this.sprintDrainRate * deltaSeconds);
    } else if (this.sprintEnergy < this.maxSprintEnergy) {
      this.sprintEnergy = Math.min(this.maxSprintEnergy, this.sprintEnergy + this.sprintRegenRate * deltaSeconds);
    }

    this.events.emit('sprintEnergyUpdated', {
      energy: this.sprintEnergy,
      maxEnergy: this.maxSprintEnergy
    });
  }

  private checkTaskProximity(): void {
    const activeChar = this.characters.get(this.activeCharacterId);
    if (!activeChar) return;
    
    const taskId = this.taskSystem.checkProximity(activeChar);
    
    this.taskSystem.getAllTasks().forEach((task) => {
      task.updateProximityIndicator(false);
    });
    
    if (taskId !== null) {
      const task = this.taskSystem.getTask(taskId);
      if (task) {
        task.updateProximityIndicator(true);
      }
    }
    
    this.nearbyTaskId = taskId;
    this.events.emit('proximityChanged', taskId !== null);
  }

  private handleTaskInteraction(taskId: number): void {
    this.startMinigame(taskId);
  }

  private startMinigame(taskId: number): void {
    const taskType = this.taskSystem.getTaskType(taskId);
    
    let minigameSceneKey: string;
    
    if (taskType === 'card') {
      minigameSceneKey = 'CardSwipeMinigame';
    } else if (taskType === 'asteroid') {
      minigameSceneKey = 'AsteroidShooterMinigame';
    } else if (taskType === 'golf') {
      minigameSceneKey = 'MiniGolfMinigame';
    } else if (taskType === 'dino') {
      minigameSceneKey = 'DinoRunMinigame';
    } else if (taskType === 'telescope') {
      minigameSceneKey = 'TelescopeAlignMinigame';
    } else {
      minigameSceneKey = 'WireMazeMinigame';
    }
    this.isMinigameActive = true;
    
    const task = this.taskSystem.getTask(taskId);
    if (task) {

      this.tweens.add({
        targets: task,
        scaleX: 1.3,
        scaleY: 1.3,
        alpha: 0.5,
        duration: 200,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }
    
    this.scene.launch(minigameSceneKey, {
      taskId: taskId,
      characterId: this.activeCharacterId,
      gameScene: this
    });
    
    this.events.emit('minigameStarted', taskId);
  }

  private completeTask(taskId: number, characterId: number): void {
    const success = this.taskSystem.completeTask(taskId, characterId);
  
    this.isMinigameActive = false;
    
    if (success) {
      this.completedTasksCount++;

      if (CONFIG.TASK.RESET_TIMER_ON_COMPLETE) {
        this.timerSystem.resetTimer(characterId);
      }

      this.soundManager.play('swipe-success');

      this.events.emit('taskCompleted', { taskId, characterId });
      
      this.cameras.main.flash(150, 0, 50, 0, false);
      
      this.checkWinCondition();
    }
  }

  public cancelMinigame(): void {
    this.isMinigameActive = false;
  }

  private setActiveCharacter(charId: number): void {
    this.activeCharacterId = charId;
   
    this.characters.forEach((char, id) => {
      char.setCharacterActive(id === charId);
    });

    this.soundManager.play('character-switch');    this.createCharacterSwitchGlitch();
   
    this.updateCameraForActiveCharacter();
    
    this.events.emit('characterSwitched', charId);
  }
  
  private updateCameraForActiveCharacter(): void {
    const activeChar = this.characters.get(this.activeCharacterId);
    if (!activeChar) return;
    
    const tileSize = CONFIG.MAP.TILE_SIZE;
    const zoneWidth = CONFIG.MAP.WIDTH * tileSize;
    const zoneHeight = CONFIG.MAP.HEIGHT * tileSize;
    const spacing = CONFIG.MAP.ZONE_SPACING * tileSize;

    const spawnInfo = SPAWN_POSITIONS.find(p => p.id === this.activeCharacterId);
    if (spawnInfo) {
      const zoneOffsetX = spawnInfo.zone * (zoneWidth + spacing);
      const zoneCenterX = zoneOffsetX + (zoneWidth / 2);
      const zoneCenterY = zoneHeight / 2;
      
      this.cameras.main.setBounds(zoneOffsetX, 0, zoneWidth, zoneHeight);
      this.cameras.main.pan(zoneCenterX, zoneCenterY, 500, 'Power2');
    }
  }

  private createCharacterSwitchGlitch(): void {
    const camera = this.cameras.main;
    const width = camera.width;
    const height = camera.height;
    const duration = 300; 

    const glitchOverlay = this.add.graphics();
    glitchOverlay.setDepth(10000);
    glitchOverlay.setScrollFactor(0);

    let rgbOffset = 0;
    this.tweens.add({
      targets: { value: 0 },
      value: 8,
      duration: duration * 0.5,
      yoyo: true,
      ease: 'Cubic.easeInOut',
      onUpdate: (tween) => {
        const val = tween.getValue();
        rgbOffset = val !== null ? val : 0;
      }
    });

    camera.flash(100, 255, 255, 255, false);
    camera.shake(duration, 0.003, true);

    const glitchStrips: Array<{ y: number; offset: number; height: number }> = [];
    const stripCount = 5;
    
    for (let i = 0; i < stripCount; i++) {
      glitchStrips.push({
        y: (height / stripCount) * i,
        offset: 0,
        height: height / stripCount
      });
    }

    const noiseIntensity = { value: 0 };
    this.tweens.add({
      targets: noiseIntensity,
      value: 0.5,
      duration: duration * 0.5,
      yoyo: true,
      ease: 'Quad.easeIn'
    });

    const glitchEvent = this.time.addEvent({
      delay: 16,
      callback: () => {
        glitchOverlay.clear();

        glitchStrips.forEach(strip => {
          strip.offset = Math.random() > 0.8 ? Phaser.Math.Between(-20, 20) : 0;
        });

        if (rgbOffset > 0) {
          glitchOverlay.fillStyle(0xff0000, 0.1);
          glitchOverlay.fillRect(-rgbOffset, 0, width, height);
          
          glitchOverlay.fillStyle(0x00ffff, 0.1);
          glitchOverlay.fillRect(rgbOffset, 0, width, height);
        }

        glitchStrips.forEach(strip => {
          if (Math.abs(strip.offset) > 0) {
            glitchOverlay.fillStyle(0x000000, 0.6);
            glitchOverlay.fillRect(strip.offset, strip.y, width, strip.height);
          }
        });

        if (noiseIntensity.value > 0) {
          const noiseCount = Math.floor(noiseIntensity.value * 80);
          for (let i = 0; i < noiseCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 2;
            const brightness = Math.random() > 0.5 ? 0xffffff : 0x000000;
            glitchOverlay.fillStyle(brightness, noiseIntensity.value * 0.4);
            glitchOverlay.fillRect(x, y, size, size);
          }
        }

        if (Math.random() > 0.7) {
          const lineY = Math.random() * height;
          glitchOverlay.fillStyle(0xffffff, 0.2);
          glitchOverlay.fillRect(0, lineY, width, 1);
        }
      },
      loop: true
    });

    this.time.delayedCall(duration, () => {
      glitchEvent.remove();
      glitchOverlay.destroy();
    });
  }

  private setupEventHandlers(): void {
    this.timerSystem.onTimeout((characterId) => {
      this.handleGameOver(characterId);
    });
    
    this.timerSystem.onTimerReset((characterId) => {
      console.log(`Timer reset for character ${characterId}`);
    });
    
    this.timerSystem.onLowTime((characterId) => {
      this.events.emit('lowTimeWarning', characterId);
    });
  }

  private handleGameOver(characterId: number): void {
    if (this.gameOver || this.hasWon) return;
    
    this.gameOver = true;

    this.soundManager.play('game-over');

    this.characters.forEach(char => {
      char.setVelocity(0, 0);
    });

    this.cameras.main.shake(500, 0.01);
    this.cameras.main.fade(1000, 100, 0, 0, false);

    this.events.emit('gameOver', {
      reason: 'timeout',
      characterId: characterId
    });
  }
  
  private checkWinCondition(): void {
    if (CONFIG.WIN.ENABLED && this.completedTasksCount >= CONFIG.WIN.REQUIRED_TASKS) {
      this.handleVictory();
    }
  }
  
  private handleVictory(): void {
    if (this.hasWon || this.gameOver) return;
    
    this.hasWon = true;
  
    this.characters.forEach(char => {
      char.setVelocity(0, 0);
    });
    
    this.cameras.main.flash(500, 255, 215, 0, false);

    this.events.emit('victory', {
      tasksCompleted: this.completedTasksCount,
      timeRemaining: this.timerSystem.getAllTimers()
    });

    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop('UIScene');
        this.scene.start('EndCreditsScene', {
          tasksCompleted: this.completedTasksCount,
          timeRemaining: this.timerSystem.getAllTimers()
        });
      });
    });
  }

  public restartGame(): void {
    SceneTransition.glitchTransition(this, 'GameScene', 800);
  }

  public toggleAssistMode(): void {
    this.assistMode = !this.assistMode;
    this.saveSettings();
    this.restartGame();
  }

  private loadSettings(): void {
    const settings = localStorage.getItem(CONFIG.STORAGE.SETTINGS);
    if (settings) {
      const parsed = JSON.parse(settings);
      this.assistMode = parsed.assistMode || false;
    }
  }

  private saveSettings(): void {
    const settings = {
      assistMode: this.assistMode
    };
    localStorage.setItem(CONFIG.STORAGE.SETTINGS, JSON.stringify(settings));
  }

  shutdown(): void {
    if (this.soundManager) {
      this.soundManager.destroy();
    }
  }
}
