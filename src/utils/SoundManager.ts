import { CONFIG } from '../config';

export type SoundCategory = 'music' | 'ui' | 'minigame' | 'gameplay' | 'system';

interface SoundConfig {
  file: string;
  type: 'music' | 'sfx';
  loop: boolean;
  volume: number;
  category: SoundCategory;
  description: string;
  usedIn: string[];
}

const SOUND_CATALOG: Record<string, SoundConfig> = {
  'menu-music': {
    file: 'menu-music.mp3',
    type: 'music',
    loop: true,
    volume: 0.6,
    category: 'music',
    description: 'Background music for menu scenes',
    usedIn: ['MenuScene', 'SettingsScene', 'EndCreditsScene']
  },
  'gameplay-music': {
    file: 'gameplay-music.mp3',
    type: 'music',
    loop: true,
    volume: 0.5,
    category: 'music',
    description: 'Background music during gameplay',
    usedIn: ['GameScene', 'UIScene']
  },
  'menu-click': {
    file: 'menu-click.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.8,
    category: 'ui',
    description: 'Button click sound',
    usedIn: ['MenuScene', 'SettingsScene', 'PauseMenu']
  },
  'menu-hover': {
    file: 'menu-hover.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.4,
    category: 'ui',
    description: 'Button hover sound',
    usedIn: ['MenuScene', 'SettingsScene', 'PauseMenu']
  },
  'character-switch': {
    file: 'character-switch.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.7,
    category: 'ui',
    description: 'Character switch indicator sound',
    usedIn: ['GameScene']
  },
  'laser-shoot': {
    file: 'laser-shoot.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.6,
    category: 'minigame',
    description: 'Laser shooting sound',
    usedIn: ['AsteroidShooterMinigame']
  },
  'asteroid-explosion': {
    file: 'asteroid-explosion.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.8,
    category: 'minigame',
    description: 'Asteroid destruction sound',
    usedIn: ['AsteroidShooterMinigame']
  },
  'card-swipe': {
    file: 'card-swipe.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.7,
    category: 'minigame',
    description: 'Card swipe motion sound',
    usedIn: ['CardSwipeMinigame']
  },
  'swipe-success': {
    file: 'swipe-success.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.8,
    category: 'minigame',
    description: 'Successful card swipe',
    usedIn: ['CardSwipeMinigame']
  },
  'swipe-fail': {
    file: 'swipe-fail.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.7,
    category: 'minigame',
    description: 'Failed card swipe',
    usedIn: ['CardSwipeMinigame']
  },
  'golf-hit': {
    file: 'golf-hit.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.4,
    category: 'minigame',
    description: 'Golf ball hit sound',
    usedIn: ['MiniGolfMinigame']
  },
  'golf-hole': {
    file: 'golf-hole.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.9,
    category: 'minigame',
    description: 'Ball in hole success sound',
    usedIn: ['MiniGolfMinigame']
  },
  'dino-jump': {
    file: 'dino-jump.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.6,
    category: 'minigame',
    description: 'Dino jump sound',
    usedIn: ['DinoRunMinigame']
  },
  'dino-hit': {
    file: 'dino-hit.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.8,
    category: 'minigame',
    description: 'Dino collision sound',
    usedIn: ['DinoRunMinigame']
  },
  'electric-buzz': {
    file: 'electric-buzz.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.7,
    category: 'minigame',
    description: 'Wire maze collision buzz',
    usedIn: ['WireMazeMinigame']
  },
  'walk': {
    file: 'walk.mp3',
    type: 'sfx',
    loop: true,
    volume: 0.4,
    category: 'gameplay',
    description: 'Character walking footsteps',
    usedIn: ['GameScene']
  },
  'low-time-warning': {
    file: 'low-time-warning.mp3',
    type: 'sfx',
    loop: true,
    volume: 0.6,
    category: 'system',
    description: 'Warning sound when timer is low',
    usedIn: ['UIScene', 'TimerSystem']
  },
  'game-over': {
    file: 'game-over.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.8,
    category: 'system',
    description: 'Character timeout/game over sound',
    usedIn: ['GameScene', 'TimerSystem']
  },
  'glitch': {
    file: 'glitch.mp3',
    type: 'sfx',
    loop: false,
    volume: 0.7,
    category: 'system',
    description: 'Error or fail state sound',
    usedIn: ['MinigameScene']
  }
};

export class SoundManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private categoryVolumes: Map<SoundCategory, number> = new Map();
  private masterVolume: number = CONFIG.AUDIO.MASTER_VOLUME;
  private musicVolume: number = 1.0;
  private sfxVolume: number = CONFIG.AUDIO.SFX_VOLUME;
  private isMuted: boolean = false;
  private currentMusic: Phaser.Sound.BaseSound | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeCategoryVolumes();
  }

  private initializeCategoryVolumes(): void {
    this.categoryVolumes.set('music', 1.0);
    this.categoryVolumes.set('ui', 1.0);
    this.categoryVolumes.set('minigame', 1.0);
    this.categoryVolumes.set('gameplay', 1.0);
    this.categoryVolumes.set('system', 1.0);
  }

  static preloadSounds(scene: Phaser.Scene): void {
    Object.entries(SOUND_CATALOG).forEach(([key, soundData]) => {
      scene.load.audio(key, `assets/sounds/${soundData.file}`);
    });
  }

  play(key: string, config?: Phaser.Types.Sound.SoundConfig): Phaser.Sound.BaseSound | null {
    if (this.isMuted) return null;

    try {
      const soundData = SOUND_CATALOG[key];
      if (!soundData) {
        console.warn(`Sound key "${key}" not found in catalog`);
        return null;
      }

      const categoryVolume = this.categoryVolumes.get(soundData.category) || 1.0;
      const typeVolume = soundData.type === 'music' ? this.musicVolume : this.sfxVolume;
      const finalVolume = soundData.volume * categoryVolume * typeVolume * this.masterVolume;

      const sound = this.scene.sound.add(key, {
        loop: soundData.loop,
        volume: finalVolume,
        ...config,
      });

      sound.play();
      this.sounds.set(key, sound);

      return sound;
    } catch (error) {
      console.error(`Error playing sound "${key}":`, error);
      return null;
    }
  }

  playMusic(key: string, fadeDuration: number = 1000): void {
    if (this.currentMusic && this.currentMusic.isPlaying) {
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: 0,
        duration: fadeDuration / 2,
        onComplete: () => {
          this.currentMusic?.stop();
        },
      });
    }

    const soundData = SOUND_CATALOG[key];
    if (!soundData) {
      console.warn(`Music key "${key}" not found`);
      return;
    }

    const music = this.scene.sound.add(key, {
      loop: true,
      volume: 0,
    });

    const categoryVolume = this.categoryVolumes.get('music') || 1.0;
    const finalVolume = soundData.volume * categoryVolume * this.musicVolume * this.masterVolume;

    music.play();
    this.currentMusic = music;

    this.scene.tweens.add({
      targets: music,
      volume: finalVolume,
      duration: fadeDuration,
    });
  }

  stop(key: string): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.stop();
      this.sounds.delete(key);
    }
  }

  stopAll(): void {
    this.sounds.forEach(sound => sound.stop());
    this.sounds.clear();
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }

  pause(key: string): void {
    const sound = this.sounds.get(key);
    if (sound && sound.isPlaying) {
      sound.pause();
    }
  }

  resume(key: string): void {
    const sound = this.sounds.get(key);
    if (sound && sound.isPaused) {
      sound.resume();
    }
  }

  pauseAll(): void {
    this.scene.sound.pauseAll();
  }

  resumeAll(): void {
    this.scene.sound.resumeAll();
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setCategoryVolume(category: SoundCategory, volume: number): void {
    this.categoryVolumes.set(category, Math.max(0, Math.min(1, volume)));
    this.updateAllVolumes();
  }

  private updateAllVolumes(): void {
    this.sounds.forEach((sound, key) => {
      const soundData = SOUND_CATALOG[key];
      if (soundData && 'setVolume' in sound) {
        const categoryVolume = this.categoryVolumes.get(soundData.category) || 1.0;
        const typeVolume = soundData.type === 'music' ? this.musicVolume : this.sfxVolume;
        const finalVolume = soundData.volume * categoryVolume * typeVolume * this.masterVolume;
        (sound as any).setVolume(finalVolume);
      }
    });

    if (this.currentMusic && 'setVolume' in this.currentMusic) {
      const musicKey = Array.from(this.sounds.entries()).find(([_, sound]) => sound === this.currentMusic)?.[0];
      if (musicKey) {
        const soundData = SOUND_CATALOG[musicKey];
        if (soundData) {
          const categoryVolume = this.categoryVolumes.get('music') || 1.0;
          const finalVolume = soundData.volume * categoryVolume * this.musicVolume * this.masterVolume;
          (this.currentMusic as any).setVolume(finalVolume);
        }
      }
    }
  }

  mute(): void {
    this.isMuted = true;
    this.scene.sound.mute = true;
  }

  unmute(): void {
    this.isMuted = false;
    this.scene.sound.mute = false;
  }

  toggleMute(): void {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  isPlaying(key: string): boolean {
    const sound = this.sounds.get(key);
    return sound ? sound.isPlaying : false;
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  destroy(): void {
    this.stopAll();
    this.sounds.clear();
    this.currentMusic = null;
  }
}
