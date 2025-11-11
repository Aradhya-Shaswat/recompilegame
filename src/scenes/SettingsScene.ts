import Phaser from 'phaser';
import { CONFIG } from '../config';
import { SoundManager } from '../utils/SoundManager';

export class SettingsScene extends Phaser.Scene {
  private assistModeEnabled: boolean = false;
  private masterVolume: number = 0.7;
  private musicVolume: number = 1.0;
  private sfxVolume: number = 0.8;
  private returnTo: string = 'MenuScene';
  private soundManager!: SoundManager;

  constructor() {
    super({ key: 'SettingsScene' });
  }
  
  init(data?: { returnTo?: string }): void {
    this.returnTo = data?.returnTo || 'MenuScene';
  }

  create(): void {
    this.loadSettings();
    
    this.soundManager = new SoundManager(this);
    
    this.soundManager.setMasterVolume(this.masterVolume);
    this.soundManager.setMusicVolume(this.musicVolume);
    this.soundManager.setSfxVolume(this.sfxVolume);
    
    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, width, height);

    const title = this.add.text(width / 2, 80, 'SETTINGS', {
      fontSize: '48px',
      color: '#00CED1',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5, 0.5);

    this.createToggle(
      width / 2,
      200,
      'Assist Mode (50s timers)',
      this.assistModeEnabled,
      (value) => {
        this.assistModeEnabled = value;
        this.saveSettings();
      }
    );

    this.createSlider(
      width / 2,
      280,
      'Master Volume',
      this.masterVolume,
      (value) => {
        this.masterVolume = value;
        this.soundManager.setMasterVolume(value);
        this.saveSettings();
      }
    );

    this.createSlider(
      width / 2,
      360,
      'Music Volume',
      this.musicVolume,
      (value) => {
        this.musicVolume = value;
        this.soundManager.setMusicVolume(value);
        this.saveSettings();
      }
    );

    this.createSlider(
      width / 2,
      440,
      'SFX Volume',
      this.sfxVolume,
      (value) => {
        this.sfxVolume = value;
        this.soundManager.setSfxVolume(value);
        this.saveSettings();
      }
    );

    const info = this.add.text(width / 2, 540, 
      'Assist Mode: Increases all timers from 35s to 50s\n' +
      'Changes take effect on next game start', {
      fontSize: '16px',
      color: '#888888',
      align: 'center',
      lineSpacing: 5
    });
    info.setOrigin(0.5, 0.5);

    this.createBackButton();

    const resetBtn = this.add.text(width / 2, height - 100, 'Reset to Defaults', {
      fontSize: '18px',
      color: '#ff8888',
      backgroundColor: '#333333',
      padding: { x: 15, y: 8 }
    });
    resetBtn.setOrigin(0.5, 0.5);
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on('pointerdown', () => {
      this.soundManager.play('menu-click');
      this.resetSettings();
      this.scene.restart();
    });
  }

  private createToggle(x: number, y: number, label: string, initialValue: boolean, onChange: (value: boolean) => void): void {
    const container = this.add.container(x, y);
    
    const labelText = this.add.text(-200, 0, label, {
      fontSize: '22px',
      color: '#ffffff'
    });
    labelText.setOrigin(0, 0.5);

    const toggleBg = this.add.graphics();
    const isOn = initialValue;
    
    const drawToggle = (enabled: boolean) => {
      toggleBg.clear();
      toggleBg.fillStyle(enabled ? 0x00ff00 : 0x666666, 1);
      toggleBg.fillRoundedRect(150, -15, 60, 30, 15);

      toggleBg.fillStyle(0xffffff, 1);
      const knobX = enabled ? 195 : 165;
      toggleBg.fillCircle(knobX, 0, 12);
    };
    
    drawToggle(isOn);
    
    const toggleHitArea = this.add.rectangle(180, 0, 60, 30);
    toggleHitArea.setInteractive({ useHandCursor: true });
    
    let currentValue = initialValue;
    toggleHitArea.on('pointerdown', () => {
      currentValue = !currentValue;
      drawToggle(currentValue);
      onChange(currentValue);
    });
    
    container.add([labelText, toggleBg, toggleHitArea]);
  }

  private createSlider(x: number, y: number, label: string, initialValue: number, onChange: (value: number) => void): void {
    const container = this.add.container(x, y);
    
    const labelText = this.add.text(-200, 0, label, {
      fontSize: '22px',
      color: '#ffffff'
    });
    labelText.setOrigin(0, 0.5);

    const track = this.add.graphics();
    track.fillStyle(0x444444, 1);
    track.fillRoundedRect(150, -5, 200, 10, 5);

    const fill = this.add.graphics();
    
    const updateFill = (value: number) => {
      fill.clear();
      fill.fillStyle(0x00CED1, 1);
      fill.fillRoundedRect(150, -5, 200 * value, 10, 5);
    };
    
    updateFill(initialValue);

    const knob = this.add.circle(150 + 200 * initialValue, 0, 12, 0xffffff);
    knob.setInteractive({ useHandCursor: true, draggable: true });

    const valueText = this.add.text(370, 0, Math.round(initialValue * 100) + '%', {
      fontSize: '18px',
      color: '#00CED1'
    });
    valueText.setOrigin(0, 0.5);
    
    this.input.on('drag', (_pointer: unknown, gameObject: Phaser.GameObjects.GameObject, dragX: number) => {
      if (gameObject === knob) {
        const relativeX = Phaser.Math.Clamp(dragX, 150, 350);
        knob.x = relativeX;
        const value = (relativeX - 150) / 200;
        updateFill(value);
        valueText.setText(Math.round(value * 100) + '%');
        onChange(value);
      }
    });
    
    container.add([labelText, track, fill, knob, valueText]);
  }

  private createBackButton(): void {
    const backBtn = this.add.text(50, 50, '← Back', {
      fontSize: '24px',
      color: '#00CED1',
      fontStyle: 'bold'
    });
    backBtn.setOrigin(0, 0.5);
    backBtn.setInteractive({ useHandCursor: true });
    
    backBtn.on('pointerover', () => {
      backBtn.setScale(1.1);
    });
    
    backBtn.on('pointerout', () => {
      backBtn.setScale(1.0);
    });
    
    backBtn.on('pointerdown', () => {
      this.soundManager.play('menu-click');
      
      if (this.returnTo === 'PauseMenu') {
        this.scene.stop();
        this.scene.launch('PauseMenu');
      } else {
        this.scene.start('MenuScene');
      }
    });
  }

  private loadSettings(): void {
    const settings = localStorage.getItem(CONFIG.STORAGE.SETTINGS);
    if (settings) {
      const parsed = JSON.parse(settings);
      this.assistModeEnabled = parsed.assistMode || false;
      this.masterVolume = parsed.masterVolume ?? CONFIG.AUDIO.MASTER_VOLUME;
      this.musicVolume = parsed.musicVolume ?? 1.0;
      this.sfxVolume = parsed.sfxVolume ?? CONFIG.AUDIO.SFX_VOLUME;
    }
  }

  private saveSettings(): void {
    const settings = {
      assistMode: this.assistModeEnabled,
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume
    };
    localStorage.setItem(CONFIG.STORAGE.SETTINGS, JSON.stringify(settings));
  }

  private resetSettings(): void {
    this.assistModeEnabled = false;
    this.masterVolume = CONFIG.AUDIO.MASTER_VOLUME;
    this.musicVolume = 1.0;
    this.sfxVolume = CONFIG.AUDIO.SFX_VOLUME;
    this.saveSettings();
  }

  shutdown(): void {
    if (this.soundManager) {
      this.soundManager.destroy();
    }
  }
}
