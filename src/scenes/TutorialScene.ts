import Phaser from 'phaser';
import { CONFIG, SPAWN_POSITIONS } from '../config';
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
  private hasSwitchedCharacter: boolean = false;
  private hasCompletedTask: boolean = false;
  private nearbyTaskId: number | null = null;

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

    if (this.tutorialStepIndex >= 2) {
      this.updateCharacterMovement(delta);
    }

    this.checkTaskProximity();
    this.events.emit('timersUpdated', this.timerSystem.getAllTimers());
    this.checkStepCondition();
  }

  private setupTutorialSteps(): void {
    this.tutorialSteps = [
      {
        title: 'EMERGENCY: SYSTEM BREACH DETECTED',
        message: 'Your dev team has been pulled into the game code during final testing. The brutal final level—designed to have ZERO survivors—is now their reality. You\'re their only hope from outside the system.',
      },
      {
        title: 'THE SITUATION',
        message: 'Three teammates are trapped in parallel instances of the level. Each character has a timer counting down to their "scripted death." Your job: rewrite the code in real-time to keep them alive.',
      },
      {
        title: 'MOVEMENT CONTROLS',
        message: 'Use WASD or Arrow Keys to move your active character. Each character exists in their own isolated zone—you can\'t see the others, but their timers are ticking. Try moving now!',
        condition: () => this.hasMovedCharacter,
      },
      {
        title: 'SWITCHING CHARACTERS',
        message: 'Press 1, 2, or 3 to switch between your trapped teammates. You can only control one at a time. The others\' timers keep ticking while you\'re away. Try switching now!',
        condition: () => this.hasSwitchedCharacter,
      },
      {
        title: 'DEPLOYING CODE PATCHES',
        message: 'Green task markers are your "backdoors"—code patches you can deploy to buy time. Get close to a task and press SPACE to execute the patch. This requires solving a quick minigame.',
        highlight: { x: 300, y: 300, radius: 50 },
      },
      {
        title: 'COMPLETING TASKS',
        message: 'Move to the highlighted task and press SPACE. Complete the minigame to deploy the patch. Each successful patch brings you closer to extracting your team safely.',
        highlight: { x: 300, y: 300, radius: 50 },
        condition: () => this.hasCompletedTask,
      },
      {
        title: 'TIME MANAGEMENT IS CRITICAL',
        message: 'Watch all three timers carefully. If ANY character\'s timer reaches zero, they\'re written out of the code—permanently. Manage your time wisely. Prioritize who needs help most.',
      },
      {
        title: 'THE MISSION',
        message: 'Complete enough code patches to override the level\'s kill script and extract your team. The game was designed to be unbeatable. Prove it wrong. Good luck, developer.',
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

    for (let i = 1; i <= 2; i++) {
      const spawnData = SPAWN_POSITIONS[i - 1];
      const char = new Character(
        this,
        spawnData.x * CONFIG.MAP.TILE_SIZE,
        spawnData.y * CONFIG.MAP.TILE_SIZE,
        i
      );
      this.characters.set(i, char);

      if (i !== this.activeCharacterId) {
        char.setVisible(false);
      }
    }
  }

  private createTutorialTasks(): void {
    const zoneWidth = CONFIG.MAP.WIDTH * CONFIG.MAP.TILE_SIZE;
    const zoneHeight = CONFIG.MAP.HEIGHT * CONFIG.MAP.TILE_SIZE;
    const margin = 80;
    
    const tutorialTaskTypes: Array<'wire' | 'card' | 'telescope'> = ['wire', 'card', 'telescope'];

    tutorialTaskTypes.forEach((type) => {
      const randomX = margin + Math.random() * (zoneWidth - margin * 2);
      const randomY = margin + Math.random() * (zoneHeight - margin * 2);
      
      const task = new Task(this, randomX, randomY, type);
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

    activeChar.setVelocity(velocityX, velocityY);
    activeChar.update(delta);
  }

  private switchCharacter(id: number): void {
    if (id === this.activeCharacterId || !this.characters.has(id)) return;

    this.hasSwitchedCharacter = true;

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

    if (taskType === 'card') {
      minigameSceneKey = 'CardSwipeMinigame';
    } else if (taskType === 'telescope') {
      minigameSceneKey = 'TelescopeAlignMinigame';
    } else {
      minigameSceneKey = 'WireMazeMinigame';
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

  private createTutorialUI(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    overlay.setDepth(1000);

    this.tutorialBox = this.add.container(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 150);
    this.tutorialBox.setDepth(1001);

    const boxBg = this.add.graphics();
    boxBg.fillStyle(0x0a0a0a, 0.95);
    boxBg.fillRoundedRect(-450, -100, 900, 200, 15);
    boxBg.lineStyle(3, 0xFF0000, 1);
    boxBg.strokeRoundedRect(-450, -100, 900, 200, 15);

    this.tutorialTitle = this.add.text(0, -70, '', {
      fontSize: '28px',
      color: '#FF0000',
      fontStyle: 'bold',
      align: 'center',
    });
    this.tutorialTitle.setOrigin(0.5, 0.5);

    this.tutorialText = this.add.text(0, 0, '', {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 850 },
      lineSpacing: 8,
    });
    this.tutorialText.setOrigin(0.5, 0.5);

    this.tutorialBox.add([boxBg, this.tutorialTitle, this.tutorialText]);

    this.continueButton = this.add.container(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 30);
    this.continueButton.setDepth(1010);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xFF0000, 1);
    btnBg.fillRoundedRect(-80, -20, 160, 40, 8);

    const btnText = this.add.text(0, 0, 'CONTINUE', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5, 0.5);

    this.continueButton.add([btnBg, btnText]);
    this.continueButton.setInteractive(
      new Phaser.Geom.Rectangle(-80, -20, 160, 40),
      Phaser.Geom.Rectangle.Contains
    );

    this.continueButton.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0xFF3333, 1);
      btnBg.fillRoundedRect(-80, -20, 160, 40, 8);
      btnText.setScale(1.1);
    });
    
    this.continueButton.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0xFF0000, 1);
      btnBg.fillRoundedRect(-80, -20, 160, 40, 8);
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
    }

    if (this.tutorialText) {
      this.tutorialText.setText(step.message);
    }

    const shouldShowButton = !step.condition || stepIndex === this.tutorialSteps.length - 1;
    if (this.continueButton) {
      this.continueButton.setVisible(shouldShowButton);
      if (shouldShowButton) {
        this.continueButton.setDepth(1003);
      }
    }

    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
      if (step.highlight) {
        this.highlightGraphics.lineStyle(4, 0x00FF00, 1);
        this.highlightGraphics.strokeCircle(step.highlight.x, step.highlight.y, step.highlight.radius);
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
      this.time.delayedCall(500, () => this.nextTutorialStep());
    }
  }

  private nextTutorialStep(): void {
    this.tutorialStepIndex++;
    this.showTutorialStep(this.tutorialStepIndex);
  }

  private completeTutorial(): void {
    if (this.tutorialTitle) {
      this.tutorialTitle.setText('TUTORIAL COMPLETE');
    }
    if (this.tutorialText) {
      this.tutorialText.setText('You\'re ready to save your team. Return to the main menu to start the real mission.');
    }

    if (this.continueButton) {
      const btnText = this.continueButton.getAt(1) as Phaser.GameObjects.Text;
      btnText.setText('EXIT');
      this.continueButton.setVisible(true);
      this.continueButton.removeAllListeners('pointerdown');
      this.continueButton.on('pointerdown', () => {

        window.location.reload();
      });
    }
  }
}
