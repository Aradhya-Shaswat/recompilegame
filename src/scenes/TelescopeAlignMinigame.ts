
import Phaser from 'phaser';
import { MinigameScene } from './MinigameScene';

export class TelescopeAlignMinigame extends MinigameScene {
  private outerRing?: Phaser.GameObjects.Graphics;
  private innerTarget?: Phaser.GameObjects.Graphics;
  private alignmentIndicators?: Phaser.GameObjects.Graphics;
  private currentRotation: number = 0;
  private targetRotation: number = 0;
  private isDragging: boolean = false;
  private lastAngle: number = 0;
  private statusText?: Phaser.GameObjects.Text;
  private readonly ALIGNMENT_TOLERANCE = 0.15; // idek what is this
  private readonly ROTATION_SMOOTHING = 0.95;
  private rotationVelocity: number = 0;
  private centerX: number = 0;
  private centerY: number = 0;
  private alignmentTime: number = 0;
  private readonly REQUIRED_ALIGNMENT_TIME = 3.0; 
  private readonly MIN_STARTING_OFFSET = 0.8;

  constructor() {
    super({ key: 'TelescopeAlignMinigame' });
  }

  init(data: any): void {
    super.init(data);
    
    this.targetRotation = Phaser.Math.FloatBetween(0, Math.PI * 2);

    let startRotation: number;
    let attempts = 0;
    do {
      startRotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const diff = this.normalizeAngle(startRotation - this.targetRotation);
      const quarterTurn = Math.PI / 2;
      const alignmentOffset = Math.round(diff / quarterTurn) * quarterTurn;
      const distanceFromAlignment = Math.abs(diff - alignmentOffset);

      if (distanceFromAlignment >= this.MIN_STARTING_OFFSET || attempts > 20) {
        break;
      }
      attempts++;
    } while (true);
    
    this.currentRotation = startRotation;
    this.isDragging = false;
    this.rotationVelocity = 0;
    this.alignmentTime = 0;
  }

  protected getMinigameTitle(): string {
    return 'Align Telescope';
  }

  protected createMinigameContent(): void {
    const containerWidth = 600;
    this.centerX = containerWidth / 2;
    this.centerY = 280; 

    
    const instructions = this.add.text(this.centerX, 100, 'Drag anywhere to rotate the outer ring\nAlign all 4 white marks with green dots', {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 5
    });
    instructions.setOrigin(0.5, 0.5);
    this.minigameContainer.add(instructions);

    
    this.innerTarget = this.add.graphics();
    this.outerRing = this.add.graphics();
    this.alignmentIndicators = this.add.graphics();
    
    this.minigameContainer.add([this.innerTarget, this.alignmentIndicators, this.outerRing]);

    
    this.drawInnerTarget();

    
    this.drawOuterRing();

    
    this.statusText = this.add.text(this.centerX, 450, 'Rotate to align...', {
      fontSize: '18px',
      color: '#888888'
    });
    this.statusText.setOrigin(0.5, 0.5);
    this.minigameContainer.add(this.statusText);

    
    this.setupInput();
  }

  private drawInnerTarget(): void {
    if (!this.innerTarget) return;

    this.innerTarget.clear();
    
    
    this.innerTarget.lineStyle(4, 0x00CED1, 1);
    this.innerTarget.strokeCircle(this.centerX, this.centerY, 80);
    
    
    this.innerTarget.fillStyle(0x001a1a, 0.5);
    this.innerTarget.fillCircle(this.centerX, this.centerY, 80);

    
    for (let i = 0; i < 4; i++) {
      const angle = this.targetRotation + (i * Math.PI / 2);
      const x = this.centerX + Math.cos(angle) * 70;
      const y = this.centerY + Math.sin(angle) * 70;
      
      this.innerTarget.fillStyle(0x00ff00, 1);
      this.innerTarget.fillCircle(x, y, 8);
      
      
      this.innerTarget.fillStyle(0x000000, 1);
      this.innerTarget.fillCircle(x, y, 3);
    }

    
    this.innerTarget.lineStyle(2, 0x00CED1, 0.5);
    this.innerTarget.lineBetween(this.centerX - 20, this.centerY, this.centerX + 20, this.centerY);
    this.innerTarget.lineBetween(this.centerX, this.centerY - 20, this.centerX, this.centerY + 20);
  }

  private drawOuterRing(): void {
    if (!this.outerRing) return;

    this.outerRing.clear();
    
    
    this.outerRing.lineStyle(6, 0xFFAA00, 1);
    this.outerRing.strokeCircle(this.centerX, this.centerY, 120);
    
    
    this.outerRing.lineStyle(3, 0xFFAA00, 0.5);
    this.outerRing.strokeCircle(this.centerX, this.centerY, 140);

    
    for (let i = 0; i < 4; i++) {
      const angle = this.currentRotation + (i * Math.PI / 2);
      const innerX = this.centerX + Math.cos(angle) * 105;
      const innerY = this.centerY + Math.sin(angle) * 105;
      const outerX = this.centerX + Math.cos(angle) * 135;
      const outerY = this.centerY + Math.sin(angle) * 135;
      
      
      this.outerRing.lineStyle(5, 0xFFFFFF, 1);
      this.outerRing.lineBetween(innerX, innerY, outerX, outerY);
    }

    
    const handleAngle = this.currentRotation;
    const handleX = this.centerX + Math.cos(handleAngle) * 150;
    const handleY = this.centerY + Math.sin(handleAngle) * 150;
    this.outerRing.fillStyle(0xFFAA00, 1);
    this.outerRing.fillCircle(handleX, handleY, 12);
    this.outerRing.lineStyle(2, 0x000000, 1);
    this.outerRing.strokeCircle(handleX, handleY, 12);
  }

  private drawAlignmentIndicators(): void {
    if (!this.alignmentIndicators) return;

    this.alignmentIndicators.clear();

    for (let i = 0; i < 4; i++) {
      const currentAngle = this.currentRotation + (i * Math.PI / 2);
      const targetAngle = this.targetRotation + (i * Math.PI / 2);

      const diff = this.normalizeAngle(currentAngle - targetAngle);

      const quarterTurn = Math.PI / 2;
      const alignmentOffset = Math.round(diff / quarterTurn) * quarterTurn;
      const alignmentError = Math.abs(diff - alignmentOffset);
      const isAligned = alignmentError < this.ALIGNMENT_TOLERANCE;

      if (isAligned) {
        const x = this.centerX + Math.cos(targetAngle) * 70;
        const y = this.centerY + Math.sin(targetAngle) * 70;

        this.alignmentIndicators.fillStyle(0x00ff00, 0.3);
        this.alignmentIndicators.fillCircle(x, y, 20);
      }
    }
  }

  private setupInput(): void {
    
    const zone = this.add.zone(this.centerX, this.centerY, 350, 350);
    zone.setInteractive({ draggable: true, useHandCursor: true });
    this.minigameContainer.add(zone);

    this.input.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      const localY = pointer.y - this.minigameContainer.y;
      const localX = pointer.x - this.minigameContainer.x;
      this.lastAngle = Math.atan2(localY - this.centerY, localX - this.centerX);
      this.rotationVelocity = 0;
    });

    this.input.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;

      const localY = pointer.y - this.minigameContainer.y;
      const localX = pointer.x - this.minigameContainer.x;
      const currentAngle = Math.atan2(localY - this.centerY, localX - this.centerX);
      
      let angleDiff = currentAngle - this.lastAngle;
      
      
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      this.currentRotation += angleDiff;
      this.rotationVelocity = angleDiff * 60; 
      this.lastAngle = currentAngle;
      
      this.drawOuterRing();
      this.drawAlignmentIndicators();
    });

    this.input.on('dragend', () => {
      this.isDragging = false;
    });
  }

  protected updateMinigameContent(delta: number): void {
    if (!this.isDragging && Math.abs(this.rotationVelocity) > 0.001) {
      this.rotationVelocity *= this.ROTATION_SMOOTHING;
      this.currentRotation += this.rotationVelocity * (delta / 1000);
      this.drawOuterRing();
    }

    
    this.currentRotation = this.normalizeAngle(this.currentRotation);

    
    this.drawAlignmentIndicators();
    const isAligned = this.checkAlignment();

    if (isAligned) {
      this.alignmentTime += delta / 1000;
      
      if (this.statusText) {
        const progress = Math.min(100, (this.alignmentTime / this.REQUIRED_ALIGNMENT_TIME) * 100);
        this.statusText.setText(`HOLD STEADY!: ${progress.toFixed(0)}%`);
        this.statusText.setColor('#00ff00');
        this.statusText.setFontSize('22px');
      }

      
      if (this.alignmentTime >= this.REQUIRED_ALIGNMENT_TIME) {
        this.completeMinigame();
      }
    } else {
      this.alignmentTime = 0;
      
      
      const closestDiff = this.getClosestAlignmentDiff();
      if (this.statusText) {
        if (closestDiff < 0.3) {
          this.statusText.setText('Almost there... keep rotating!');
          this.statusText.setColor('#ffff00');
        } else {
          this.statusText.setText('Rotate to align...');
          this.statusText.setColor('#888888');
        }
        this.statusText.setFontSize('18px');
      }
    }
  }

  private getClosestAlignmentDiff(): number {
    let minDiff = Math.PI;
    for (let i = 0; i < 4; i++) {
      const currentAngle = this.currentRotation + (i * Math.PI / 2);
      const targetAngle = this.targetRotation + (i * Math.PI / 2);
      const diff = Math.abs(this.normalizeAngle(currentAngle - targetAngle));
      minDiff = Math.min(minDiff, diff);
    }
    return minDiff;
  }

  private checkAlignment(): boolean {
    let alignedCount = 0;
    
    for (let i = 0; i < 4; i++) {
      const currentAngle = this.currentRotation + (i * Math.PI / 2);
      const targetAngle = this.targetRotation + (i * Math.PI / 2);

      const diff = this.normalizeAngle(currentAngle - targetAngle);

      const quarterTurn = Math.PI / 2;
      const alignmentOffset = Math.round(diff / quarterTurn) * quarterTurn;
      const alignmentError = Math.abs(diff - alignmentOffset);
      
      if (alignmentError < this.ALIGNMENT_TOLERANCE) {
        alignedCount++;
      }
    }

    const rotationDiff = this.normalizeAngle(this.currentRotation - this.targetRotation);
    const quarterTurn = Math.PI / 2;
    const alignmentOffset = Math.round(rotationDiff / quarterTurn) * quarterTurn;
    const alignmentError = Math.abs(rotationDiff - alignmentOffset);
    
    console.log(`[TELESCOPE] Current: ${(this.currentRotation * 180 / Math.PI).toFixed(1)}°, Target: ${(this.targetRotation * 180 / Math.PI).toFixed(1)}°, Error: ${(alignmentError * 180 / Math.PI).toFixed(1)}°, Aligned: ${alignedCount}/4`);

    return alignedCount === 4;
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}
