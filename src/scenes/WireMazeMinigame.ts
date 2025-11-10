import Phaser from 'phaser';
import { MinigameScene } from './MinigameScene';

interface Wire {
  color: number;
  leftNode: Phaser.GameObjects.Arc;
  rightNode: Phaser.GameObjects.Arc;
  line?: Phaser.GameObjects.Graphics;
  connected: boolean;
}

export class WireMazeMinigame extends MinigameScene {
  private wires: Wire[] = [];
  private currentDrag?: {
    wire: Wire;
    line: Phaser.GameObjects.Graphics;
  };

  constructor() {
    super({ key: 'WireMazeMinigame' });
  }

  init(data: any): void {
    super.init(data);
    
    this.wires = [];
    this.currentDrag = undefined;
  }

  protected getMinigameTitle(): string {
    return 'Connect the Wires';
  }

  protected createMinigameContent(): void {
    const containerWidth = 600;
    const startY = 100;
    const spacing = 80;

    
    const colors = [
      0xff0000, 
      0x0000ff, 
      0xffff00, 
      0x00ff00  
    ];

    
    const rightPositions = [0, 1, 2, 3].sort(() => Math.random() - 0.5);

    
    colors.forEach((color, index) => {
      const leftY = startY + index * spacing;
      const rightY = startY + rightPositions[index] * spacing;

      
      const leftNode = this.add.circle(80, leftY, 15, color);
      leftNode.setStrokeStyle(3, 0xffffff);
      leftNode.setInteractive({ useHandCursor: true, draggable: true });

      
      const rightNode = this.add.circle(containerWidth - 80, rightY, 15, color);
      rightNode.setStrokeStyle(3, 0xffffff);

      const wire: Wire = {
        color,
        leftNode,
        rightNode,
        connected: false
      };

      this.wires.push(wire);

      
      leftNode.on('dragstart', () => {
        this.startDrag(wire);
      });

      leftNode.on('drag', (pointer: Phaser.Input.Pointer) => {
        this.updateDrag(pointer);
      });

      leftNode.on('dragend', (pointer: Phaser.Input.Pointer) => {
        this.endDrag(pointer, wire);
      });

      this.minigameContainer.add([leftNode, rightNode]);
    });

    
    const instructions = this.add.text(300, 450, 'Drag wires to matching colors', {
      fontSize: '18px',
      color: '#888888',
      align: 'center'
    });
    instructions.setOrigin(0.5, 0.5);
    this.minigameContainer.add(instructions);
  }

  private startDrag(wire: Wire): void {
    
    if (wire.line) {
      wire.line.destroy();
      wire.line = undefined;
      wire.connected = false;
    }

    
    const line = this.add.graphics();
    this.currentDrag = { wire, line };
    this.minigameContainer.add(line);
  }

  private updateDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.currentDrag) return;

    const { wire, line } = this.currentDrag;
    const containerPos = this.minigameContainer;
    
    
    const localX = pointer.x - containerPos.x;
    const localY = pointer.y - containerPos.y;

    line.clear();
    line.lineStyle(4, wire.color, 1);
    line.beginPath();
    line.moveTo(wire.leftNode.x, wire.leftNode.y);
    line.lineTo(localX, localY);
    line.strokePath();
  }

  private endDrag(pointer: Phaser.Input.Pointer, wire: Wire): void {
    if (!this.currentDrag) return;

    const { line } = this.currentDrag;
    const containerPos = this.minigameContainer;
    
    
    const localX = pointer.x - containerPos.x;
    const localY = pointer.y - containerPos.y;

    
    const distance = Phaser.Math.Distance.Between(
      localX,
      localY,
      wire.rightNode.x,
      wire.rightNode.y
    );

    if (distance < 30) {
      
      line.clear();
      line.lineStyle(4, wire.color, 1);
      line.beginPath();
      line.moveTo(wire.leftNode.x, wire.leftNode.y);
      line.lineTo(wire.rightNode.x, wire.rightNode.y);
      line.strokePath();

      wire.line = line;
      wire.connected = true;
      wire.leftNode.disableInteractive();
      
      this.checkCompletion();
    } else {
      
      line.destroy();
    }

    this.currentDrag = undefined;
  }

  private checkCompletion(): void {
    const allConnected = this.wires.every(wire => wire.connected);
    
    if (allConnected) {
      this.time.delayedCall(300, () => {
        this.completeMinigame();
      });
    }
  }
}
