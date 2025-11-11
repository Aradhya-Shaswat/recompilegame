
import Phaser from 'phaser';
export class SceneTransition {
  /**
   * Creates a glitch effect transition before starting a new scene
   * @param scene - The current Phaser scene
   * @param targetScene - The key of the scene to transition to
   * @param duration - Duration of the glitch effect in milliseconds (default: 800)
   * @param onComplete - Optional callback when transition completes
   */
  static glitchTransition(
    scene: Phaser.Scene,
    targetScene: string,
    duration: number = 800,
    onComplete?: () => void
  ): void {
    const camera = scene.cameras.main;
    const width = camera.width;
    const height = camera.height;

    const glitchOverlay = scene.add.graphics();
    glitchOverlay.setDepth(10000);
    glitchOverlay.setScrollFactor(0);

    const rgbSplitDuration = duration * 0.3;
    let rgbOffset = 0;
    
    scene.tweens.add({
      targets: { value: 0 },
      value: 15,
      duration: rgbSplitDuration,
      yoyo: true,
      repeat: 2,
      ease: 'Cubic.easeInOut',
      onUpdate: (tween) => {
        const val = tween.getValue();
        rgbOffset = val !== null ? val : 0;
      }
    });

    const glitchStrips: Array<{ y: number; offset: number; height: number }> = [];
    const stripCount = 8;
    
    for (let i = 0; i < stripCount; i++) {
      glitchStrips.push({
        y: (height / stripCount) * i,
        offset: 0,
        height: height / stripCount
      });
    }

    let pixelSize = 1;
    scene.tweens.add({
      targets: { value: 1 },
      value: 8,
      duration: duration * 0.5,
      yoyo: true,
      ease: 'Quad.easeInOut',
      onUpdate: (tween) => {
        const val = tween.getValue();
        pixelSize = val !== null ? Math.floor(val) : 1;
      }
    });

    const noiseIntensity = { value: 0 };
    scene.tweens.add({
      targets: noiseIntensity,
      value: 1,
      duration: duration * 0.6,
      ease: 'Quad.easeIn'
    });

    camera.shake(duration * 0.7, 0.005, true);

    const flashCount = 3;
    const flashInterval = duration / (flashCount * 2);
    
    for (let i = 0; i < flashCount; i++) {
      scene.time.delayedCall(i * flashInterval * 2, () => {
        camera.flash(flashInterval, 255, 255, 255, false);
      });
    }

    const glitchEvent = scene.time.addEvent({
      delay: 16,
      callback: () => {
        glitchOverlay.clear();

        glitchStrips.forEach(strip => {
          strip.offset = Math.random() > 0.7 ? Phaser.Math.Between(-30, 30) : 0;
        });

        if (rgbOffset > 0) {
          glitchOverlay.fillStyle(0xff0000, 0.15);
          glitchOverlay.fillRect(-rgbOffset, 0, width, height);

          glitchOverlay.fillStyle(0x0000ff, 0.15);
          glitchOverlay.fillRect(rgbOffset, 0, width, height);

          glitchOverlay.fillStyle(0x00ff00, 0.1);
          glitchOverlay.fillRect(rgbOffset * 0.5, 0, width, height);
        }

        glitchStrips.forEach(strip => {
          if (Math.abs(strip.offset) > 0) {
            glitchOverlay.fillStyle(0x000000, 0.8);
            glitchOverlay.fillRect(strip.offset, strip.y, width, strip.height);
          }
        });

        if (noiseIntensity.value > 0) {
          const noiseCount = Math.floor(noiseIntensity.value * 200);
          for (let i = 0; i < noiseCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3;
            const brightness = Math.random() > 0.5 ? 0xffffff : 0x000000;
            glitchOverlay.fillStyle(brightness, noiseIntensity.value * 0.6);
            glitchOverlay.fillRect(x, y, size, size);
          }
        }

        if (pixelSize > 1 && Math.random() > 0.5) {
          const pixelCount = 20;
          for (let i = 0; i < pixelCount; i++) {
            const x = Math.floor(Math.random() * width / pixelSize) * pixelSize;
            const y = Math.floor(Math.random() * height / pixelSize) * pixelSize;
            const color = Phaser.Display.Color.RandomRGB();
            glitchOverlay.fillStyle(color.color, 0.3);
            glitchOverlay.fillRect(x, y, pixelSize, pixelSize);
          }
        }

        if (Math.random() > 0.6) {
          const lineY = Math.random() * height;
          glitchOverlay.fillStyle(0xffffff, 0.3);
          glitchOverlay.fillRect(0, lineY, width, 2);
        }
      },
      loop: true
    });

    scene.time.delayedCall(duration * 0.7, () => {
      camera.fadeOut(duration * 0.3, 0, 0, 0);
    });

    scene.time.delayedCall(duration, () => {
      glitchEvent.remove();
      glitchOverlay.destroy();
      
      if (onComplete) {
        onComplete();
      }

      if (targetScene === scene.scene.key) {
        scene.scene.restart();
      } else {
        scene.scene.start(targetScene);
      }
    });
  }

  /**
   * @param scene 
   * @param targetScene 
   * @param duration
   */

  static fadeTransition(
    scene: Phaser.Scene,
    targetScene: string,
    duration: number = 500
  ): void {
    const camera = scene.cameras.main;
    
    camera.fadeOut(duration, 0, 0, 0);
    
    scene.time.delayedCall(duration, () => {
      if (targetScene === scene.scene.key) {
        scene.scene.restart();
      } else {
        scene.scene.start(targetScene);
      }
    });
  }

  /**
   * @param scene 
   * @param targetScene 
   * @param duration 
   */
  static zoomTransition(
    scene: Phaser.Scene,
    targetScene: string,
    duration: number = 600
  ): void {
    const camera = scene.cameras.main;

    scene.tweens.add({
      targets: camera,
      zoom: 2,
      duration: duration,
      ease: 'Quad.easeIn'
    });

    camera.fadeOut(duration, 0, 0, 0);
    
    scene.time.delayedCall(duration, () => {
      if (targetScene === scene.scene.key) {
        scene.scene.restart();
      } else {
        scene.scene.start(targetScene);
      }
    });
  }
}
