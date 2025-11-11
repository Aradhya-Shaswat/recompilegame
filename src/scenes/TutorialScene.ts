import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Character } from '../entities/Character';
import { Task } from '../entities/Task';
import { TimerSystem } from '../systems/TimerSystem';
import { TaskSystem } from '../systems/TaskSystem';

interface TutorialStep {
  title: string;
  message: string;
  highlight?: { x: number; y: number; radius: number };
  condition?: () => boolean;
  action?: () => void;
}

export class TutorialScene extends Phaser.Scene {
  private characters!: Map<number, Character>;
  private activeCharacterId: number = 1;
  private timerSystem!: TimerSystem;
  private taskSystem!: TaskSystem;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private numberKeys!: Map<number, Phaser.Input.Keyboard.Key>;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private backgrounds: Phaser.GameObjects.TileSprite[] = [];
  private isMinigameActive: boolean = false;
  private tutorialStepIndex: number = 0;
  private tutorialSteps: TutorialStep[] = [];
  private tutorialBox?: Phaser.GameObjects.Container;
  private tutorialText?: Phaser.GameObjects.Text;
  private tutorialTitle?: Phaser.GameObjects.Text;
  private highlightGraphics?: Phaser.GameObjects.Graphics;
  private continueButton?: Phaser.GameObjects.Container;
  private hasMovedCharacter: boolean = false;
  private hasCompletedTask: boolean = false;
  private nearbyTaskId: number | null = null;
  private conditionMetTime: number = 0;
  private awaitingCondition: boolean = false;

  constructor() {
    super({ key: 'TutorialScene' });
  }

  create(): void {
    this.setupTutorialSteps();

    this.timerSystem = new TimerSystem(true);
    this.taskSystem = new TaskSystem();

    this.createBackground();
    this.createCharacters();
    this.createTutorialTasks();
    this.setupInput();
    this.setupEventHandlers();
    this.createTutorialUI();

    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const enterHandler = () => {
      const currentStep = this.tutorialSteps[this.tutorialStepIndex];
      if (currentStep && (!currentStep.condition || this.tutorialStepIndex === this.tutorialSteps.length - 1)) {
        this.nextTutorialStep();
      }
    };
    enterKey.on('down', enterHandler);
    
    this.events.once('shutdown', () => {
      enterKey.off('down', enterHandler);
    });

    this.showTutorialStep(0);
    this.events.emit('timersUpdated', this.timerSystem.getAllTimers());
    this.events.emit('characterSwitched', this.activeCharacterId);
  }

  update(_time: number, delta: number): void {
    this.timerSystem.update(delta * 0.3, this.activeCharacterId); 

    if (this.tutorialStepIndex >= 1 && this.tutorialStepIndex < this.tutorialSteps.length) {
      this.updateCharacterMovement(delta);
    }

    this.checkTaskProximity();
    this.events.emit('timersUpdated', this.timerSystem.getAllTimers());
    
    if (!this.isMinigameActive) {
      this.checkStepCondition();
    }
  }

  private setupTutorialSteps(): void {
    this.tutorialSteps = [
      {
        title: 'WELCOME TO THE TUTORIAL',
        message: 'You need to complete tasks to survive. Each task is a minigame. Complete them to win. Let us show you how each one works.',
      },
      {
        title: 'BASIC CONTROLS',
        message: 'Use WASD or Arrow Keys to move. Hold SHIFT to sprint but watch your energy! Press SPACE near a task to start it. Try moving around now.',
        condition: () => this.hasMovedCharacter,
      },
      {
        title: 'WIRE MAZE TASK',
        message: 'Walk to the GREEN task square. Use WASD or arrow keys.',
      },
      {
        title: 'CARD SWIPE TASK',
        message: 'Walk to the ORANGE task square. Click and drag the card through the reader. Match the perfect speed shown in the animation.',
      },
      {
        title: 'ASTEROID SHOOTER TASK',
        message: 'Walk to the PINK task square. Click to shoot and destroy 10 asteroids. Aim carefully and move fast.',
      },
      {
        title: 'MINI GOLF TASK',
        message: 'Walk to the CYAN task square. Click the ball to aim. Scroll wheel for power. Release to shoot. Get it in the hole in 5 shots.',
      },
      {
        title: 'DINO RUN TASK',
        message: 'Walk to the YELLOW task square. Press SPACE to jump over obstacles. One hit and you start over. Reach the end to win.',
      },
      {
        title: 'TELESCOPE ALIGN TASK',
        message: 'Walk to the PURPLE task square. Click and drag the handle to match the green dot. Hold steady for 3 seconds to complete.',
        condition: () => this.hasCompletedTask,
      },
      {
        title: 'READY TO PLAY',
        message: 'You now know all the tasks. In the real game you must manage timers and complete 12 tasks to win. Good luck!',
      },
    ];
  }

  private createBackground(): void {
    const tileSize = CONFIG.MAP.TILE_SIZE;
    const zoneWidth = CONFIG.MAP.WIDTH * tileSize;
    const zoneHeight = CONFIG.MAP.HEIGHT * tileSize;

    const bg = this.add.tileSprite(0, 0, zoneWidth, zoneHeight, 'background');
    bg.setOrigin(0, 0);
    bg.setTint(0x1a1a2e);
    this.backgrounds.push(bg);
  }

  private createCharacters(): void {
    this.characters = new Map();
    
    const zoneWidth = CONFIG.MAP.WIDTH * CONFIG.MAP.TILE_SIZE;
    const zoneHeight = CONFIG.MAP.HEIGHT * CONFIG.MAP.TILE_SIZE;

    for (let i = 1; i <= 2; i++) {
      const char = new Character(
        this,
        zoneWidth * 0.05,
        zoneHeight * 0.35,
        i
      );

      this.physics.add.existing(char);
      (char.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(false);
      (char.body as Phaser.Physics.Arcade.Body).setSize(220, 280);
      
      char.update = (_delta: number) => {
        const isMoving = (char as any).velocityX !== 0 || (char as any).velocityY !== 0;
        const currentAnim = char.anims.currentAnim?.key;
        const idleKey = `character_${i}_idle`;
        const walkKey = `character_${i}_walk`;
        
        if ((char as any).velocityX < 0) {
          char.setFlipX(true);
        } else if ((char as any).velocityX > 0) {
          char.setFlipX(false);
        }
        
        if (isMoving && currentAnim !== walkKey) {
          char.play(walkKey);
        } else if (!isMoving && currentAnim !== idleKey) {
          char.play(idleKey);
        }
      };
      
      this.characters.set(i, char);

      if (i !== this.activeCharacterId) {
        char.setVisible(false);
      }
    }
  }

  private createTutorialTasks(): void {
    const zoneWidth = CONFIG.MAP.WIDTH * CONFIG.MAP.TILE_SIZE;
    const zoneHeight = CONFIG.MAP.HEIGHT * CONFIG.MAP.TILE_SIZE;
    
    const tutorialTaskTypes: Array<'wire' | 'card' | 'asteroid' | 'golf' | 'dino' | 'telescope'> = [
      'wire', 'card', 'asteroid', 'golf', 'dino', 'telescope'
    ];

    const positions = [
      { x: zoneWidth * 0.15, y: zoneHeight * 0.30 },  
      { x: zoneWidth * 0.30, y: zoneHeight * 0.35 },  
      { x: zoneWidth * 0.45, y: zoneHeight * 0.30 },  
      { x: zoneWidth * 0.60, y: zoneHeight * 0.35 },  
      { x: zoneWidth * 0.75, y: zoneHeight * 0.30 },  
      { x: zoneWidth * 0.90, y: zoneHeight * 0.35 },  
    ];

    tutorialTaskTypes.forEach((type, index) => {
      const pos = positions[index];
      
      const task = new Task(this, pos.x, pos.y, type);
      task.setDepth(10);
      this.taskSystem.addTask(task);

      this.tweens.add({
        targets: task,
        y: task.y + 8,
        duration: 2000 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 1000
      });

      this.tweens.add({
        targets: task,
        angle: -3 + Math.random() * 6,
        duration: 1500 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 500
      });
    });

    this.createPathwayWalls(zoneWidth, zoneHeight);
  }

  private createPathwayWalls(zoneWidth: number, zoneHeight: number): void {
    const wallGraphics = this.add.graphics();
    wallGraphics.lineStyle(3, 0x444444, 1);
    wallGraphics.fillStyle(0x222222, 0.8);
    
    const pathY = zoneHeight * 0.325; 
    const pathHeight = 150; 
    
    wallGraphics.fillRect(0, 0, zoneWidth, pathY - pathHeight / 2);

    wallGraphics.fillRect(0, pathY + pathHeight / 2, zoneWidth, zoneHeight * 0.45);

    wallGraphics.lineStyle(6, 0x00FF00, 0.6);
    wallGraphics.strokeRect(0, pathY - pathHeight / 2, zoneWidth, pathHeight);

    wallGraphics.lineStyle(3, 0x00FF00, 1);
    wallGraphics.strokeRect(2, pathY - pathHeight / 2 + 2, zoneWidth - 4, pathHeight - 4);

    wallGraphics.lineStyle(4, 0x008800, 0.8);
    wallGraphics.strokeRect(0, 0, zoneWidth, zoneHeight);
    
    wallGraphics.setDepth(5);

    const topWallBody = this.add.rectangle(
      zoneWidth / 2, 
      (pathY - pathHeight / 2) / 2, 
      zoneWidth, 
      pathY - pathHeight / 2, 
      0x000000, 
      0
    );
    this.physics.add.existing(topWallBody, true);

    const bottomWallBody = this.add.rectangle(
      zoneWidth / 2, 
      pathY + pathHeight / 2 + (zoneHeight * 0.45) / 2, 
      zoneWidth, 
      zoneHeight * 0.45, 
      0x000000, 
      0
    );
    this.physics.add.existing(bottomWallBody, true);

    const leftWallBody = this.add.rectangle(
      0,
      zoneHeight / 2,
      10,
      zoneHeight,
      0x000000,
      0
    );
    this.physics.add.existing(leftWallBody, true);

    const rightWallBody = this.add.rectangle(
      zoneWidth,
      zoneHeight / 2,
      10,
      zoneHeight,
      0x000000,
      0
    );
    this.physics.add.existing(rightWallBody, true);

    this.characters.forEach(char => {
      this.physics.add.collider(char, topWallBody);
      this.physics.add.collider(char, bottomWallBody);
      this.physics.add.collider(char, leftWallBody);
      this.physics.add.collider(char, rightWallBody);
    });
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as any;

    this.numberKeys = new Map();
    for (let i = 1; i <= 2; i++) {
      const key = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE + i - 1);
      this.numberKeys.set(i, key);

      key.on('down', () => {
        this.switchCharacter(i);
      });
    }

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => {
      if (this.nearbyTaskId !== null && !this.isMinigameActive) {
        this.startMinigame(this.nearbyTaskId);
      }
    });

    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  private setupEventHandlers(): void {
    this.events.on('minigameCompleted', (data: { taskId: number; characterId: number }) => {
      this.completeTask(data.taskId, data.characterId);
    });

    this.events.on('minigameClosed', () => {
      this.isMinigameActive = false;
    });
  }

  private updateCharacterMovement(delta: number): void {
    if (this.isMinigameActive) return;

    const activeChar = this.characters.get(this.activeCharacterId);
    if (!activeChar) return;

    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      velocityX = -1;
      this.hasMovedCharacter = true;
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      velocityX = 1;
      this.hasMovedCharacter = true;
    }

    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      velocityY = -1;
      this.hasMovedCharacter = true;
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      velocityY = 1;
      this.hasMovedCharacter = true;
    }

    const speed = CONFIG.CHARACTER.SPEED;
    
    if (this.shiftKey.isDown && (velocityX !== 0 || velocityY !== 0)) {
      const sprintMultiplier = 1.5;
      velocityX *= sprintMultiplier;
      velocityY *= sprintMultiplier;
    }

    const body = activeChar.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(velocityX * speed, velocityY * speed);
    }

    activeChar.setVelocity(velocityX, velocityY);
    activeChar.update(delta);
  }

  private switchCharacter(id: number): void {
    if (id === this.activeCharacterId || !this.characters.has(id)) return;

    const currentChar = this.characters.get(this.activeCharacterId);
    if (currentChar) {
      currentChar.setVisible(false);
    }

    this.activeCharacterId = id;
    const newChar = this.characters.get(id);
    if (newChar) {
      newChar.setVisible(true);
    }

    this.events.emit('characterSwitched', this.activeCharacterId);
  }

  private checkTaskProximity(): void {
    const activeChar = this.characters.get(this.activeCharacterId);
    if (!activeChar) return;

    let nearestTaskId: number | null = null;
    let nearestDistance = CONFIG.TASK.PROXIMITY_RADIUS + 1;

    this.taskSystem.getAllTasks().forEach((task) => {
      if (task.isCompleted()) return;

      const distance = Phaser.Math.Distance.Between(
        activeChar.x,
        activeChar.y,
        task.x,
        task.y
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestTaskId = this.getTaskIdForTask(task);
      }

      task.updateProximityIndicator(distance < CONFIG.TASK.PROXIMITY_RADIUS);
    });

    this.nearbyTaskId = nearestTaskId;
  }

  private getTaskIdForTask(targetTask: Task): number | null {
    for (let i = 1; i <= 10; i++) {
      const task = this.taskSystem.getTask(i);
      if (task === targetTask) return i;
    }
    return null;
  }

  private startMinigame(taskId: number): void {
    const taskType = this.taskSystem.getTaskType(taskId);
    let minigameSceneKey: string;

    switch (taskType) {
      case 'card':
        minigameSceneKey = 'CardSwipeMinigame';
        break;
      case 'telescope':
        minigameSceneKey = 'TelescopeAlignMinigame';
        break;
      case 'asteroid':
        minigameSceneKey = 'AsteroidShooterMinigame';
        break;
      case 'golf':
        minigameSceneKey = 'MiniGolfMinigame';
        break;
      case 'dino':
        minigameSceneKey = 'DinoRunMinigame';
        break;
      case 'wire':
      default:
        minigameSceneKey = 'WireMazeMinigame';
        break;
    }

    this.isMinigameActive = true;

    this.scene.launch(minigameSceneKey, {
      taskId: taskId,
      characterId: this.activeCharacterId,
      gameScene: this,
    });
  }

  private completeTask(taskId: number, _characterId: number): void {
    this.taskSystem.completeTask(taskId, this.activeCharacterId);
    this.isMinigameActive = false;
    this.hasCompletedTask = true;

    const task = this.taskSystem.getTask(taskId);
    if (task) {
      this.tweens.add({
        targets: task,
        alpha: 0,
        scale: 1.5,
        duration: 500,
        ease: 'Power2',
      });
    }
  }

  public cancelMinigame(): void {
    this.isMinigameActive = false;
  }

  private createTutorialUI(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    overlay.setDepth(1000);

    this.tutorialBox = this.add.container(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 200);
    this.tutorialBox.setDepth(1001);

    const boxBg = this.add.graphics();
    boxBg.fillStyle(0x0f0f0f, 0.98);
    boxBg.fillRoundedRect(-470, -110, 940, 220, 20);
    boxBg.lineStyle(4, 0x00FF00, 0.8);
    boxBg.strokeRoundedRect(-470, -110, 940, 220, 20);

    this.tutorialTitle = this.add.text(0, -75, '', {
      fontSize: '20px',
      color: '#00FF00',
      fontStyle: 'bold',
      align: 'center',
      fontFamily: '"Press Start 2P", monospace',
    });
    this.tutorialTitle.setOrigin(0.5, 0.5);
    this.tutorialTitle.setStroke('#000000', 4);

    this.tutorialText = this.add.text(0, 10, '', {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 880 },
      lineSpacing: 10,
      fontFamily: '"Press Start 2P", monospace',
    });
    this.tutorialText.setOrigin(0.5, 0.5);

    this.tutorialBox.add([boxBg, this.tutorialTitle, this.tutorialText]);

    this.continueButton = this.add.container(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 60);
    this.continueButton.setDepth(1010);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x00FF00, 1);
    btnBg.fillRoundedRect(-90, -22, 180, 44, 10);
    btnBg.lineStyle(2, 0xFFFFFF, 0.8);
    btnBg.strokeRoundedRect(-90, -22, 180, 44, 10);

    const btnText = this.add.text(0, 0, 'CONTINUE', {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold',
      fontFamily: '"Press Start 2P", monospace',
    });
    btnText.setOrigin(0.5, 0.5);

    this.continueButton.add([btnBg, btnText]);
    this.continueButton.setInteractive(
      new Phaser.Geom.Rectangle(-90, -22, 180, 44),
      Phaser.Geom.Rectangle.Contains
    );

    this.continueButton.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x00FF88, 1);
      btnBg.fillRoundedRect(-90, -22, 180, 44, 10);
      btnBg.lineStyle(3, 0xFFFFFF, 1);
      btnBg.strokeRoundedRect(-90, -22, 180, 44, 10);
      btnText.setScale(1.05);
    });
    
    this.continueButton.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x00FF00, 1);
      btnBg.fillRoundedRect(-90, -22, 180, 44, 10);
      btnBg.lineStyle(2, 0xFFFFFF, 0.8);
      btnBg.strokeRoundedRect(-90, -22, 180, 44, 10);
      btnText.setScale(1.0);
    });
    
    this.continueButton.on('pointerdown', () => this.nextTutorialStep());
    this.continueButton.setVisible(false);

    this.highlightGraphics = this.add.graphics();
    this.highlightGraphics.setDepth(999);
  }

  private showTutorialStep(stepIndex: number): void {
    if (stepIndex >= this.tutorialSteps.length) {
      this.completeTutorial();
      return;
    }

    const step = this.tutorialSteps[stepIndex];

    if (this.tutorialTitle) {
      this.tutorialTitle.setText(step.title);
      
      this.tweens.add({
        targets: this.tutorialTitle,
        scale: { from: 0.8, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 300,
        ease: 'Back.easeOut'
      });
    }

    if (this.tutorialText) {
      this.tutorialText.setText(step.message);
      
      this.tweens.add({
        targets: this.tutorialText,
        alpha: { from: 0, to: 1 },
        duration: 400,
        delay: 150,
        ease: 'Power2'
      });
    }

    const shouldShowButton = !step.condition || stepIndex === this.tutorialSteps.length - 1;
    if (this.continueButton) {
      this.continueButton.setVisible(shouldShowButton);
      if (shouldShowButton) {
        this.continueButton.setDepth(1003);
        this.continueButton.setAlpha(0);
        this.tweens.add({
          targets: this.continueButton,
          alpha: 1,
          duration: 300,
          delay: 500,
          ease: 'Power2'
        });
      }
    }

    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
      if (step.highlight) {
        const pulse = this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          onUpdate: (tween) => {
            if (this.highlightGraphics && step.highlight) {
              this.highlightGraphics.clear();
              const value = tween.getValue();
              const alpha = 0.5 + (value || 0) * 0.5;
              const radius = step.highlight.radius + (value || 0) * 15;
              
              this.highlightGraphics.lineStyle(5, 0x00FF00, alpha);
              this.highlightGraphics.strokeCircle(step.highlight.x, step.highlight.y, radius);
              
              this.highlightGraphics.lineStyle(3, 0xFFFF00, alpha * 0.6);
              this.highlightGraphics.strokeCircle(step.highlight.x, step.highlight.y, radius + 10);
            }
          }
        });

        this.events.once('nextStep', () => {
          pulse.remove();
        });
      }
    }

    if (step.action) {
      step.action();
    }
  }

  private checkStepCondition(): void {
    if (this.tutorialStepIndex >= this.tutorialSteps.length) {
      return;
    }
    
    const step = this.tutorialSteps[this.tutorialStepIndex];
    if (step && step.condition && step.condition()) {
      if (!this.awaitingCondition) {
        this.awaitingCondition = true;
        this.conditionMetTime = this.time.now;
      } else if (this.time.now - this.conditionMetTime > 1000) {
        this.awaitingCondition = false;
        this.nextTutorialStep();
      }
    } else {
      this.awaitingCondition = false;
    }
  }

  private nextTutorialStep(): void {
    this.events.emit('nextStep');
    this.awaitingCondition = false;
    this.tutorialStepIndex++;
    this.showTutorialStep(this.tutorialStepIndex);
  }

  private completeTutorial(): void {
    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
    }

    if (this.tutorialTitle) {
      this.tutorialTitle.setText('TUTORIAL COMPLETE');
      this.tutorialTitle.setColor('#00FF00');
      
      this.tweens.add({
        targets: this.tutorialTitle,
        scale: { from: 0.5, to: 1.2 },
        duration: 600,
        ease: 'Back.easeOut',
        yoyo: true,
        repeat: 0
      });
    }

    if (this.tutorialText) {
      this.tutorialText.setText('You are ready to save your team!\n\nReturn to the main menu to start the REAL mission.\nGood luck developer. They are counting on you.');
      this.tutorialText.setLineSpacing(6); 
      this.tutorialText.setFontSize('12px'); 
    }

    if (this.continueButton) {
      const btnText = this.continueButton.getAt(1) as Phaser.GameObjects.Text;
      const btnBg = this.continueButton.getAt(0) as Phaser.GameObjects.Graphics;
      
      btnText.setText('EXIT TO MENU');
      btnText.setFontSize('10px'); 
      btnBg.clear();
      btnBg.fillStyle(0xFF0000, 1);
      btnBg.fillRoundedRect(-85, -18, 170, 36, 8); 
      btnBg.lineStyle(2, 0xFFFFFF, 0.8);
      btnBg.strokeRoundedRect(-85, -18, 170, 36, 8);
      
      this.continueButton.setVisible(true);
      this.continueButton.removeAllListeners('pointerdown');
      this.continueButton.removeAllListeners('pointerover');
      this.continueButton.removeAllListeners('pointerout');
      
      this.continueButton.setInteractive(
        new Phaser.Geom.Rectangle(-85, -18, 170, 36),
        Phaser.Geom.Rectangle.Contains
      );
      
      this.continueButton.on('pointerover', () => {
        btnBg.clear();
        btnBg.fillStyle(0xFF3333, 1);
        btnBg.fillRoundedRect(-85, -18, 170, 36, 8);
        btnBg.lineStyle(3, 0xFFFFFF, 1);
        btnBg.strokeRoundedRect(-85, -18, 170, 36, 8);
        btnText.setScale(1.05);
      });
      
      this.continueButton.on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0xFF0000, 1);
        btnBg.fillRoundedRect(-85, -18, 170, 36, 8);
        btnBg.lineStyle(2, 0xFFFFFF, 0.8);
        btnBg.strokeRoundedRect(-85, -18, 170, 36, 8);
        btnText.setScale(1.0);
      });
      
      this.continueButton.on('pointerdown', () => {
        this.scene.start('MenuScene');
      });

      this.tweens.add({
        targets: this.continueButton,
        y: '+=5',
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }
}
