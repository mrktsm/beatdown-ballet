import "./style.css";

// Game Constants
const WORDS = [
  "cat",
  "meow",
  "purr",
  "paw",
  "whisker",
  "tail",
  "kitty",
  "feline",
  "hunter",
  "shadow",
  "ghost",
  "spirit",
  "demon",
  "beast",
  "monster",
  "dark",
  "evil",
  "curse",
  "spell",
  "magic",
  "power",
  "death",
  "note",
  "write",
  "type",
  "word",
  "letter",
  "key",
  "strike",
  "attack",
  "defend",
];

interface Enemy {
  id: number;
  word: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  radius: number;
  angle: number;
  frozen?: boolean;
  deathTimer?: number;
  animationFrame: number;
  direction: "right" | "left" | "down" | "up";
  hasSuperpower?: boolean;
  markedForFreeze?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FireEffect {
  x: number;
  y: number;
  frame: number;
  maxFrame: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private fireEffects: FireEffect[] = [];
  private score: number = 0;
  private lives: number = 3;
  private level: number = 1;
  private gameRunning: boolean = false;
  private currentInput: string = "";
  private completedWord: string = "";
  private completedWordTime: number = 0;
  private completedWordDuration: number = 2000; // 2 seconds
  private targetedEnemy: Enemy | null = null;
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 1200;
  private enemyIdCounter: number = 0;
  private animationId: number = 0;

  // Combo system
  private combo: number = 0;
  private lastKillTime: number = 0;
  private comboTimeout: number = 2000; // 2 seconds to maintain combo
  private comboMessage: string = "";
  private comboMessageTime: number = 0;
  private comboMessageDuration: number = 1500;

  // Freeze superpower
  private freezeActive: boolean = false;
  private freezeStartTime: number = 0;
  private freezeDuration: number = 3000; // 3 seconds

  // UI Elements
  private scoreEl: HTMLElement;
  private livesEl: HTMLElement;
  private levelEl: HTMLElement;
  private wpmEl: HTMLElement;
  private typeInput: HTMLInputElement;
  private finalScoreEl: HTMLElement;

  // Screens
  private titleScreen: HTMLElement;
  private gameScreen: HTMLElement;
  private gameOverScreen: HTMLElement;

  // Cat position (center)
  private catX: number = 0;
  private catY: number = 0;
  private catRadius: number = 95;

  private fire0!: HTMLImageElement;
  private fire1!: HTMLImageElement;
  private fire2!: HTMLImageElement;
  private bearSpriteSheet!: HTMLImageElement;
  private spriteWidth: number = 0; // Will be calculated from image
  private spriteHeight: number = 0; // Will be calculated from image
  private spritesPerRow: number = 4;
  private totalRows: number = 14;
  private imagesLoaded: boolean = false;

  // Dancer (main character) sprite state
  private dancerImages: Record<string, HTMLImageElement> = {};
  private currentDance: "balancing" | "hips" | "snap" | "skip" = "balancing";
  private dancerFrame: number = 0; // 0..7 for each 8-frame sheet
  private dancerAttackDelayFrames: number = 10;
  private idleFrameCounter: number = 0;
  private idleFrameSpeed: number = 12; // slower idle
  private lastTypeTimeMs: number = 0;
  private dancerAnimCounter: number = 0;
  private dancerAnimSpeed: number = 5;
  // Collision tuning (require enemies to get closer to deal damage)
  private collisionProximityFactor: number = 0.85;
  // Hurt state
  private isHurt: boolean = false;
  private hurtTimer: number = 0; // frames remaining for hurt animation
  private hurtDuration: number = 48; // total frames to show hurt animation
  private hurtSeqIndex: number = 0;
  private hurtSequence: number[] = [];

  // Sound effects
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private soundEnabled: boolean = true;

  // (Removed cat punch/hurt state)

  // Wrong input display
  private wrongInput: string = "";
  private wrongInputTime: number = 0;
  private wrongInputDuration: number = 500; // 0.5 seconds

  // Typing speed tracking
  private wordsCompleted: number = 0;
  private firstWordTime: number = 0;
  private wpm: number = 0;

  constructor() {
    this.canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    // Improve rendering quality
    this.ctx.imageSmoothingEnabled = true;
    (this.ctx as any).imageSmoothingQuality = "high";

    // High-quality rendering
    this.ctx.imageSmoothingEnabled = true;
    (this.ctx as any).imageSmoothingQuality = "high";

    this.scoreEl = document.getElementById("score")!;
    this.livesEl = document.getElementById("lives")!;
    this.levelEl = document.getElementById("level")!;
    this.wpmEl = document.getElementById("wpm")!;
    this.typeInput = document.getElementById("type-input") as HTMLInputElement;
    this.finalScoreEl = document.getElementById("final-score")!;

    this.titleScreen = document.getElementById("title-screen")!;
    this.gameScreen = document.getElementById("game-screen")!;
    this.gameOverScreen = document.getElementById("game-over-screen")!;

    this.setupCanvas();
    this.setupEventListeners();
    this.loadImages();
    this.loadSounds();

    window.addEventListener("resize", () => this.setupCanvas());
  }

  private loadSounds() {
    // Load sound effects - using actual Halo announcer sound names
    const soundFiles = {
      doublekill: "/sounds/doublekill.mp3",
      triplekill: "/sounds/triplekill.mp3",
      overkill: "/sounds/overkill.mp3", // Quadruple kill in Halo
      killtacular: "/sounds/killtacular.mp3", // Quintuple kill in Halo
      killtrocity: "/sounds/killtrocity.mp3", // Sextuple kill in Halo
      killimanjaro: "/sounds/killimanjaro.mp3", // Septuple kill in Halo
      killtastrophe: "/sounds/killtastrophe.mp3", // Octuple kill in Halo
      killpocalypse: "/sounds/killpocalypse.mp3", // Nonuple kill in Halo
      killionaire: "/sounds/killionaire.mp3", // Decuple kill in Halo
      megakill: "/sounds/megakill.mp3",
      ultrakill: "/sounds/ultrakill.mp3",
      monsterkill: "/sounds/monsterkill.mp3",
      running_riot: "/sounds/running_riot.mp3",
      rampage: "/sounds/rampage.mp3",
      untouchable: "/sounds/untouchable.mp3",
      invincible: "/sounds/invincible.mp3",
      freeze: "/sounds/freeze.mp3",
      explosion: "/sounds/explosion.mp3",
    };

    // Create audio elements for each sound
    for (const [key, path] of Object.entries(soundFiles)) {
      const audio = new Audio();
      audio.src = path;
      audio.preload = "auto";
      // Ignore load errors so missing sounds don't break the game
      audio.onerror = () => {
        console.warn(`Failed to load sound: ${path}`);
      };
      this.sounds.set(key, audio);
    }
  }

  private playSound(soundKey: string, volumeOverride?: number) {
    if (!this.soundEnabled) return;

    const sound = this.sounds.get(soundKey);
    if (sound) {
      // Clone the audio to allow overlapping sounds
      const soundClone = sound.cloneNode() as HTMLAudioElement;

      // Set volume - lower for explosion to avoid being too loud
      let volume = volumeOverride ?? 0.6;
      if (soundKey === "explosion") {
        volume = 0.4; // Quieter for explosions
      }

      soundClone.volume = volume;
      soundClone.play().catch((e) => {
        // Ignore play errors (e.g., if user hasn't interacted with page yet)
        console.warn(`Failed to play sound ${soundKey}:`, e);
      });
    }
  }

  private loadImages() {
    // Dancer sprites (each is an 8-frame horizontal sprite sheet)
    this.dancerImages["balancing"] = new Image();
    this.dancerImages["hips"] = new Image();
    this.dancerImages["snap"] = new Image();
    this.dancerImages["skip"] = new Image();

    // Effects and enemies
    this.fire0 = new Image();
    this.fire1 = new Image();
    this.fire2 = new Image();
    this.bearSpriteSheet = new Image();

    let loadedCount = 0;
    const onLoad = () => {
      loadedCount++;
      // 4 dancer sheets + 3 fire images + 1 enemy sheet = 8
      if (loadedCount === 8) {
        this.imagesLoaded = true;
      }
    };

    const onBearLoad = () => {
      // Calculate sprite dimensions from loaded image
      this.spriteWidth = this.bearSpriteSheet.naturalWidth / this.spritesPerRow;
      this.spriteHeight = this.bearSpriteSheet.naturalHeight / this.totalRows;
      console.log(
        `Bear sprite sheet loaded: ${this.bearSpriteSheet.naturalWidth}x${this.bearSpriteSheet.naturalHeight}`
      );
      console.log(
        `Individual sprite size: ${this.spriteWidth}x${this.spriteHeight}`
      );
      onLoad();
    };

    // Hook onloads
    this.dancerImages["balancing"].onload = onLoad;
    this.dancerImages["hips"].onload = onLoad;
    this.dancerImages["snap"].onload = onLoad;
    this.dancerImages["skip"].onload = onLoad;
    this.fire0.onload = onLoad;
    this.fire1.onload = onLoad;
    this.fire2.onload = onLoad;
    this.bearSpriteSheet.onload = onBearLoad;

    // Set sources (exclude slide per requirement)
    this.dancerImages["balancing"].src =
      "/src/assets/dancing-lady/balancing.png";
    this.dancerImages["hips"].src = "/src/assets/dancing-lady/hips.png";
    this.dancerImages["snap"].src = "/src/assets/dancing-lady/snap.png";
    this.dancerImages["skip"].src = "/src/assets/dancing-lady/skip.png";
    this.fire0.src = "/src/fire/fire-0.png";
    this.fire1.src = "/src/fire/fire-1.png";
    this.fire2.src = "/src/fire/fire-2.png";
    this.bearSpriteSheet.src = "/src/assets/enemies/Bear.png";
  }

  private setupCanvas() {
    // Set canvas to proper size
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight; // Full screen canvas

    this.catX = this.canvas.width / 2;
    this.catY = this.canvas.height / 2;
  }

  private setupEventListeners() {
    document
      .getElementById("start-btn")
      ?.addEventListener("click", () => this.startGame());
    document
      .getElementById("restart-btn")
      ?.addEventListener("click", () => this.startGame());

    this.typeInput.addEventListener("input", (e) => {
      const val = (e.target as HTMLInputElement).value.toLowerCase();

      // Select a random dance (excluding slide and balancing) when starting to type
      if (this.currentInput.length === 0 && val.length > 0) {
        const dances = ["hips", "snap"] as const;
        this.currentDance = dances[Math.floor(Math.random() * dances.length)];
        this.dancerFrame = 0;
        this.lastTypeTimeMs = Date.now();
      }

      // Record last type time and switch animation to time-based while typing
      if (val.length > 0) {
        this.lastTypeTimeMs = Date.now();
      }

      // Revert to idle when input becomes empty
      if (val.length === 0) {
        this.currentDance = "balancing";
        this.dancerFrame = 0;
      }

      this.currentInput = val;
      this.handleTyping();
    });

    // Keep input focused when clicking on canvas
    this.canvas.addEventListener("click", () => {
      if (this.gameRunning) {
        this.typeInput.focus();
      }
    });

    // Auto-focus input on any key press
    window.addEventListener("keydown", () => {
      if (this.gameRunning) {
        this.typeInput.focus();
      }
    });
  }

  private startGame() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.enemies = [];
    this.particles = [];
    this.fireEffects = [];
    this.currentInput = "";
    this.completedWord = "";
    this.completedWordTime = 0;
    this.targetedEnemy = null;
    this.lastSpawnTime = Date.now();
    this.spawnInterval = 1200; // Start faster
    this.gameRunning = true;

    // Reset combo system
    this.combo = 0;
    this.lastKillTime = 0;
    this.comboMessage = "";
    this.comboMessageTime = 0;

    // Reset dancer frame
    this.currentDance = "balancing";
    this.dancerFrame = 0;

    // Reset wrong input display
    this.wrongInput = "";
    this.wrongInputTime = 0;

    // Reset freeze superpower
    this.freezeActive = false;
    this.freezeStartTime = 0;

    // Reset WPM tracking
    this.wordsCompleted = 0;
    this.firstWordTime = 0;
    this.wpm = 0;

    this.updateUI();
    this.typeInput.value = "";
    // Text is now drawn on canvas, no need to update HTML element
    // this.currentInputEl.textContent = "";

    // Spawn initial enemy to ensure at least one is always present
    this.spawnEnemy();

    this.showScreen("game");
    this.typeInput.focus();

    this.gameLoop();
  }

  private showScreen(screen: "title" | "game" | "gameover") {
    this.titleScreen.classList.remove("active");
    this.gameScreen.classList.remove("active");
    this.gameOverScreen.classList.remove("active");

    switch (screen) {
      case "title":
        this.titleScreen.classList.add("active");
        break;
      case "game":
        this.gameScreen.classList.add("active");
        break;
      case "gameover":
        this.gameOverScreen.classList.add("active");
        this.finalScoreEl.textContent = this.score.toString();
        break;
    }
  }

  private spawnEnemy() {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];

    // Random side: 0 = left, 1 = right, 2 = top, 3 = bottom
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: // Left
        x = -50;
        y = Math.random() * this.canvas.height;
        break;
      case 1: // Right
        x = this.canvas.width + 50;
        y = Math.random() * this.canvas.height;
        break;
      case 2: // Top
        x = Math.random() * this.canvas.width;
        y = -50;
        break;
      case 3: // Bottom
        x = Math.random() * this.canvas.width;
        y = this.canvas.height + 50;
        break;
      default:
        x = -50;
        y = Math.random() * this.canvas.height;
    }

    const angle = Math.atan2(this.catY - y, this.catX - x);

    // 10% chance to have superpower (blue enemy with "freeze" word)
    const hasSuperpower = Math.random() < 0.1;
    const enemyWord = hasSuperpower ? "freeze" : word;

    const enemy: Enemy = {
      id: this.enemyIdCounter++,
      word: enemyWord,
      x,
      y,
      targetX: this.catX,
      targetY: this.catY,
      speed: 0.5 + this.level * 0.3, // Faster speed increase per level
      radius: 45,
      angle,
      animationFrame: 0,
      direction: "right", // Will be updated in updateEnemies based on movement
      hasSuperpower,
      markedForFreeze: false,
      frozen: this.freezeActive, // Spawn frozen if freeze is active
    };

    this.enemies.push(enemy);
  }

  private handleTyping() {
    // Helper to get the longest suffix of text that is a prefix of any candidate word
    const getEffectiveInput = (text: string, candidates: Enemy[]): string => {
      for (let i = 0; i < text.length; i++) {
        const suffix = text.slice(i);
        if (candidates.some((e) => e.word.startsWith(suffix))) {
          return suffix;
        }
      }
      return "";
    };

    const allEnemies = this.enemies;

    // Effective input for global checks (including FREEZE activation)
    const searchInputGlobal = getEffectiveInput(this.currentInput, allEnemies);

    // Clear completed word when user starts typing again
    if (this.currentInput.length === 1 && this.completedWord) {
      this.completedWord = "";
    }

    // Check for "freeze" superpower activation using effective input
    if (searchInputGlobal.toLowerCase() === "freeze" && !this.freezeActive) {
      const freezeEnemies = this.enemies.filter(
        (e) => e.word.toLowerCase() === "freeze"
      );

      if (freezeEnemies.length > 0) {
        // Activate freeze
        this.freezeActive = true;
        this.freezeStartTime = Date.now();

        const killCount = freezeEnemies.length;
        const explosionDelay = 15; // ~0.25s at 60fps

        freezeEnemies.forEach((enemy, index) => {
          enemy.frozen = true;
          enemy.deathTimer =
            this.dancerAttackDelayFrames + index * explosionDelay;
        });

        // Freeze all remaining enemies
        this.enemies.forEach((e) => {
          if (e.word.toLowerCase() !== "freeze") {
            e.frozen = true;
            e.markedForFreeze = false;
          }
        });

        // Show freeze message
        this.comboMessage = "FREEZE!";
        this.comboMessageTime = Date.now();
        this.playSound("freeze");

        // Update score
        const baseScore = 10 * this.level * killCount;
        this.score += baseScore;

        // Track WPM
        if (this.firstWordTime === 0) this.firstWordTime = Date.now();
        this.wordsCompleted++;

        this.updateUI();

        this.typeInput.value = "";
        this.currentInput = "";
        this.completedWord = "freeze";
        if (!this.isHurt) {
          this.currentDance = "balancing";
          this.dancerFrame = 0;
        }
        this.completedWordTime = Date.now();
        return;
      }
    }

    // During freeze, typing enemy names marks them for destruction
    if (this.freezeActive) {
      const nonFreeze = this.enemies.filter(
        (e) => e.word.toLowerCase() !== "freeze"
      );
      const searchInput = getEffectiveInput(this.currentInput, nonFreeze);

      const matchingEnemy = nonFreeze.find((e) =>
        e.word.startsWith(searchInput)
      );

      if (matchingEnemy) {
        this.targetedEnemy = matchingEnemy;

        if (searchInput === matchingEnemy.word) {
          // Mark all with same word
          const word = matchingEnemy.word;
          this.enemies.forEach((e) => {
            if (e.word === word) e.markedForFreeze = true;
          });

          // Track WPM
          if (this.firstWordTime === 0) this.firstWordTime = Date.now();
          this.wordsCompleted++;

          this.typeInput.value = "";
          this.currentInput = "";
          if (!this.isHurt) {
            this.currentDance = "balancing";
            this.dancerFrame = 0;
          }
          this.completedWord = matchingEnemy.word;
          this.completedWordTime = Date.now();
          this.targetedEnemy = null;

          // End freeze immediately if all marked
          const allMarked = this.enemies.every((e) => e.markedForFreeze);
          if (allMarked) {
            this.freezeActive = false;

            const killCount = this.enemies.length;
            const explosionDelay = 15;
            this.enemies.forEach((enemy, index) => {
              const baseScore = 10 * this.level;
              this.score += baseScore;
              enemy.deathTimer = index * explosionDelay;
              enemy.frozen = true;
            });

            if (killCount > 1) {
              const killMessages = [
                "DOUBLE KILL!",
                "TRIPLE KILL!",
                "QUADRUPLE KILL!",
                "QUINTUPLE KILL!",
                "SEXTUPLE KILL!",
                "SEPTUPLE KILL!",
                "OCTUPLE KILL!",
                "NONUPLE KILL!",
                "DECUPLE KILL!",
                "MEGA KILL!",
                "ULTRA KILL!",
                "MONSTER KILL!",
                "LEGENDARY KILL!",
                "GODLIKE KILL!",
              ];
              const soundKeys = [
                "doublekill",
                "triplekill",
                "overkill",
                "killtacular",
                "killtrocity",
                "killimanjaro",
                "killtastrophe",
                "killpocalypse",
                "killionaire",
                "running_riot",
                "rampage",
                "untouchable",
                "invincible",
                "invincible",
              ];
              const msgIndex = Math.min(killCount - 2, killMessages.length - 1);
              this.comboMessage = killMessages[msgIndex];
              this.comboMessageTime = Date.now();
              this.playSound(soundKeys[msgIndex]);
            }

            this.updateUI();
          }
        }
      } else {
        this.targetedEnemy = null;
        if (this.currentInput.length > 2) {
          this.wrongInput = this.currentInput;
          this.wrongInputTime = Date.now();
          // Do NOT clear input; allow suffix recovery
        }
      }
      return;
    }

    // Normal typing logic (when not frozen) using effective input
    const searchInput = searchInputGlobal;
    const matchingEnemy = this.enemies.find((e) =>
      e.word.startsWith(searchInput)
    );

    if (matchingEnemy) {
      this.targetedEnemy = matchingEnemy;
      if (searchInput === matchingEnemy.word) {
        this.completedWord = matchingEnemy.word;
        this.completedWordTime = Date.now();
        if (this.firstWordTime === 0) this.firstWordTime = Date.now();
        this.wordsCompleted++;

        this.destroyEnemy(matchingEnemy);
        this.typeInput.value = "";
        this.currentInput = "";
        if (!this.isHurt) {
          this.currentDance = "balancing";
          this.dancerFrame = 0;
        }
        this.targetedEnemy = null;
      }
    } else {
      this.targetedEnemy = null;
      if (this.currentInput && this.currentInput.length > 2) {
        this.wrongInput = this.currentInput;
        this.wrongInputTime = Date.now();
        this.canvas.classList.add("shake");
        setTimeout(() => this.canvas.classList.remove("shake"), 300);
        // Do NOT clear input; allow suffix recovery
      }
    }
  }

  private createFireEffect(x: number, y: number) {
    const fireEffect: FireEffect = {
      x,
      y,
      frame: 0,
      maxFrame: 45, // Total animation: 10 + 15 + 20 = 45 frames
    };
    this.fireEffects.push(fireEffect);

    // Play explosion sound
    this.playSound("explosion");
  }

  private destroyEnemy(enemy: Enemy) {
    const word = enemy.word;

    // Find all enemies with the same word
    const matchingEnemies = this.enemies.filter((e) => e.word === word);
    const killCount = matchingEnemies.length;

    // Freeze enemies and turn them white with staggered death timers
    const explosionDelay = 15; // 15 frames = ~0.25 seconds at 60fps
    matchingEnemies.forEach((e, index) => {
      e.frozen = true;
      // Stagger the death timer so they explode one after another
      e.deathTimer = this.dancerAttackDelayFrames + index * explosionDelay;
    });

    // Update combo
    const now = Date.now();
    if (now - this.lastKillTime < this.comboTimeout) {
      this.combo += killCount;
    } else {
      this.combo = killCount;
    }
    this.lastKillTime = now;

    // Calculate score with combo multiplier (update score immediately)
    const baseScore = 10 * this.level * killCount;
    const comboBonus =
      this.combo > 1 ? Math.floor(baseScore * (this.combo * 0.1)) : 0;
    this.score += baseScore + comboBonus;
    this.updateUI();

    // Set combo message
    if (killCount > 1) {
      const killMessages = [
        "DOUBLE KILL!",
        "TRIPLE KILL!",
        "QUADRUPLE KILL!",
        "QUINTUPLE KILL!",
        "SEXTUPLE KILL!",
        "SEPTUPLE KILL!",
        "OCTUPLE KILL!",
        "NONUPLE KILL!",
        "DECUPLE KILL!",
        "MEGA KILL!",
        "ULTRA KILL!",
        "MONSTER KILL!",
        "LEGENDARY KILL!",
        "GODLIKE KILL!",
      ];
      const soundKeys = [
        "doublekill",
        "triplekill",
        "overkill",
        "killtacular",
        "killtrocity",
        "killimanjaro",
        "killtastrophe",
        "killpocalypse",
        "killionaire",
        "running_riot",
        "rampage",
        "untouchable",
        "invincible",
        "invincible", // Repeat for 14+
      ];
      const msgIndex = Math.min(killCount - 2, killMessages.length - 1);
      this.comboMessage = killMessages[msgIndex];
      this.playSound(soundKeys[msgIndex]);
    } else if (this.combo > 3) {
      this.comboMessage = `${this.combo}x COMBO!`;
    } else {
      this.comboMessage = "";
    }

    if (this.comboMessage) {
      this.comboMessageTime = now;
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Add gravity
      p.vy += 0.15;

      // Add friction
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Fade out
      p.life -= 0.02;

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFireEffects() {
    for (let i = this.fireEffects.length - 1; i >= 0; i--) {
      const fire = this.fireEffects[i];
      fire.frame++;

      // Remove completed fire effects
      if (fire.frame >= fire.maxFrame) {
        this.fireEffects.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Handle death timer for frozen enemies
      if (enemy.frozen && enemy.deathTimer !== undefined) {
        enemy.deathTimer--;
        if (enemy.deathTimer <= 0) {
          // Create fire effect at enemy position when death timer expires
          this.createFireEffect(enemy.x, enemy.y);

          this.enemies.splice(i, 1);

          // Update score and level when enemy actually dies (no need to recalculate, already done)
          this.updateUI();

          // Level up every 5 enemies (faster progression)
          if (this.score % 50 === 0 && this.score > 0) {
            this.level++;
            this.spawnInterval = Math.max(300, this.spawnInterval - 150);
            this.updateUI();
          }
          continue;
        }
      }

      // Don't move if frozen
      if (enemy.frozen) {
        continue;
      }

      // Move toward center
      const dx = this.catX - enemy.x;
      const dy = this.catY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 1) {
        enemy.x += (dx / distance) * enemy.speed;
        enemy.y += (dy / distance) * enemy.speed;

        // Update direction based on movement
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy) {
          enemy.direction = dx > 0 ? "right" : "left";
        } else {
          enemy.direction = dy > 0 ? "down" : "up";
        }

        // Update animation frame counter (faster animation)
        enemy.animationFrame++;
        if (enemy.animationFrame >= 32) {
          // Faster: 8 frames per sprite instead of 15
          enemy.animationFrame = 0;
        }
      }

      // Check collision with dancer (tighter threshold)
      const collisionThreshold =
        (this.catRadius + enemy.radius) * this.collisionProximityFactor;
      if (distance < collisionThreshold) {
        this.enemies.splice(i, 1);
        this.lives--;
        this.updateUI();

        // Trigger hurt animation: random skip sequence, red tint
        this.isHurt = true;
        this.hurtTimer = this.hurtDuration;
        this.currentDance = "skip";
        this.hurtSeqIndex = 0;
        // Generate a random sequence of skip frames (length equals hurtDuration, mapped to 8 frames)
        this.hurtSequence = Array.from({ length: this.hurtDuration }, () =>
          Math.floor(Math.random() * 8)
        );

        if (this.lives <= 0) {
          this.gameOver();
        }

        // Shake effect
        this.canvas.classList.add("shake");
        setTimeout(() => this.canvas.classList.remove("shake"), 300);
      }
    }

    // Always ensure at least one enemy is present
    if (this.enemies.length === 0 && this.gameRunning) {
      this.spawnEnemy();
    }
  }

  private updateUI() {
    this.scoreEl.textContent = this.score.toString();
    this.levelEl.textContent = this.level.toString();

    const hearts = "❤️".repeat(this.lives) + "🖤".repeat(3 - this.lives);
    this.livesEl.textContent = hearts;

    // Calculate WPM - only count from when first word was typed
    if (this.firstWordTime > 0) {
      const now = Date.now();
      const timeElapsed = (now - this.firstWordTime) / 1000 / 60; // Convert to minutes
      if (timeElapsed > 0) {
        this.wpm = Math.round(this.wordsCompleted / timeElapsed);
      }
    } else {
      this.wpm = 0;
    }
    this.wpmEl.textContent = this.wpm.toString();
  }

  private gameOver() {
    // If hurt sequence is active, delay game over until it finishes to show last red animation
    if (this.isHurt && this.hurtTimer > 0) {
      // Poll until hurtTimer ends, then call gameOver again
      const checkAfterHurt = () => {
        if (this.hurtTimer > 0) {
          requestAnimationFrame(checkAfterHurt);
        } else {
          this.gameOver();
        }
      };
      requestAnimationFrame(checkAfterHurt);
      return;
    }

    this.gameRunning = false;
    cancelAnimationFrame(this.animationId);
    this.showScreen("gameover");
  }

  private drawParticles() {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();

      // Add glow effect for fire
      this.ctx.globalAlpha = alpha * 0.5;
      this.ctx.fillStyle = "#ffff00";
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawFireEffects() {
    for (const fire of this.fireEffects) {
      // Determine which fire image to use based on frame
      let fireImage: HTMLImageElement;
      let fireScale: number;

      if (fire.frame < 10) {
        fireImage = this.fire0;
        fireScale = 0.4;
      } else if (fire.frame < 25) {
        fireImage = this.fire1;
        fireScale = 0.6;
      } else {
        fireImage = this.fire2;
        fireScale = 0.8;
      }

      const fireWidth = fireImage.naturalWidth * fireScale;
      const fireHeight = fireImage.naturalHeight * fireScale;

      // Draw fire at enemy position (centered)
      this.ctx.drawImage(
        fireImage,
        fire.x - fireWidth / 2,
        fire.y - fireHeight / 2,
        fireWidth,
        fireHeight
      );
    }
  }

  private draw() {
    // Clear canvas
    this.ctx.fillStyle = "#0f0f1a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw main character (dancing lady) in center
    this.drawDancer();

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw particles on top
    this.drawParticles();

    // Draw fire effects
    this.drawFireEffects();

    // Draw combo message
    const now = Date.now();
    if (
      this.comboMessage &&
      now - this.comboMessageTime < this.comboMessageDuration
    ) {
      const elapsed = now - this.comboMessageTime;
      const progress = elapsed / this.comboMessageDuration;

      // Fade out effect
      const alpha = 1 - progress;

      // Scale effect - start big and shrink slightly
      const scale = 1 + (1 - progress) * 0.5;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.font = `${48 * scale}px 'Star Crush', sans-serif`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Draw text shadow for better visibility
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;

      // Color based on message type
      if (this.comboMessage.includes("FREEZE")) {
        this.ctx.fillStyle = "#4db8ff"; // Blue for freeze
      } else if (this.comboMessage.includes("KILL")) {
        this.ctx.fillStyle = "#ff6b6b";
      } else {
        this.ctx.fillStyle = "#ffd93d";
      }

      this.ctx.fillText(
        this.comboMessage,
        this.canvas.width / 2,
        this.canvas.height / 6
      );

      this.ctx.restore();
    }

    // Draw combo counter if active
    if (this.combo > 1) {
      this.ctx.save();
      this.ctx.font = "bold 28px sans-serif";
      this.ctx.textAlign = "right";
      this.ctx.textBaseline = "top";
      this.ctx.fillStyle = "#ffd93d";
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      this.ctx.shadowBlur = 5;
      this.ctx.fillText(`${this.combo}x COMBO`, this.canvas.width - 20, 80);
      this.ctx.restore();
    }
  }

  private drawDancer() {
    if (!this.imagesLoaded) return;

    // Ensure we revert to idle if not typing (but don't interrupt hurt)
    if (
      !this.currentInput &&
      this.currentDance !== "balancing" &&
      !this.isHurt
    ) {
      this.currentDance = "balancing";
      this.dancerFrame = 0;
    }

    const sheet = this.dancerImages[this.currentDance];
    const frames = 8;
    const frameWidth = sheet.naturalWidth / frames;
    const frameHeight = sheet.naturalHeight;

    // Animate while typing; when idle on balancing, play slow idle; when hurt, drive from hurtSequence
    const typingActive =
      this.currentInput.length > 0 && Date.now() - this.lastTypeTimeMs < 400;
    if (this.isHurt && this.currentDance === "skip") {
      // Advance hurt timeline every frame
      if (this.hurtTimer > 0) {
        const seqIdx = Math.min(
          this.hurtSeqIndex,
          Math.max(0, this.hurtSequence.length - 1)
        );
        this.dancerFrame = this.hurtSequence[seqIdx] % frames;
        this.hurtSeqIndex++;
        this.hurtTimer--;
      }

      // End of hurt: return to balancing
      if (this.hurtTimer <= 0) {
        this.isHurt = false;
        if (!this.currentInput) {
          this.currentDance = "balancing";
          this.dancerFrame = 0;
        } else {
          // If user is still typing, resume typing dance
          const dances = ["hips", "snap"] as const;
          this.currentDance = dances[Math.floor(Math.random() * dances.length)];
          this.dancerFrame = 0;
        }
      }
    } else if (typingActive) {
      this.dancerAnimCounter++;
      if (this.dancerAnimCounter >= this.dancerAnimSpeed) {
        this.dancerAnimCounter = 0;
        this.dancerFrame = (this.dancerFrame + 1) % frames;
      }
    } else if (this.currentDance === "balancing") {
      this.idleFrameCounter++;
      if (this.idleFrameCounter >= this.idleFrameSpeed) {
        this.idleFrameCounter = 0;
        this.dancerFrame = (this.dancerFrame + 1) % frames;
      }
    }

    const srcX = Math.floor(this.dancerFrame) * frameWidth;
    const srcY = 0;

    const scale = 1.6; // bigger dancer
    const drawWidth = frameWidth * scale;
    const drawHeight = frameHeight * scale;

    this.ctx.save();
    this.ctx.translate(this.catX, this.catY);
    // Apply red filter while hurt
    if (this.isHurt && this.currentDance === "skip") {
      this.ctx.filter =
        "brightness(0.8) sepia(100%) hue-rotate(-50deg) saturate(400%)";
    }
    this.ctx.drawImage(
      sheet,
      srcX,
      srcY,
      frameWidth,
      frameHeight,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    // Reset filter if applied
    this.ctx.filter = "none";
    this.ctx.restore();

    // Text overlays above dancer
    const now = Date.now();
    const textBaseY = this.catY - drawHeight / 2 - 20;
    const textX = this.catX;

    if (
      this.completedWord &&
      now - this.completedWordTime < this.completedWordDuration
    ) {
      this.ctx.font = "bold 24px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "bottom";
      const fadeProgress =
        (now - this.completedWordTime) / this.completedWordDuration;
      const alpha = 1 - fadeProgress;
      this.ctx.save();
      this.ctx.shadowBlur = 30;
      this.ctx.shadowColor = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.fillText(this.completedWord, textX, textBaseY);
      this.ctx.shadowBlur = 15;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 1.2})`;
      this.ctx.fillText(this.completedWord, textX, textBaseY);
      this.ctx.restore();
    } else if (
      this.wrongInput &&
      now - this.wrongInputTime < this.wrongInputDuration
    ) {
      this.ctx.font = "bold 24px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "bottom";
      const fadeProgress =
        (now - this.wrongInputTime) / this.wrongInputDuration;
      const alpha = 1 - fadeProgress;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = "#ff4444";
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(this.wrongInput, textX, textBaseY);
      this.ctx.fillText(this.wrongInput, textX, textBaseY);
      this.ctx.restore();
    } else if (this.currentInput) {
      this.ctx.font = "bold 24px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "bottom";
      const textWidth = this.ctx.measureText(this.currentInput).width;
      const padding = 10;
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      this.ctx.fillRect(
        textX - textWidth / 2 - padding,
        textBaseY - 30,
        textWidth + padding * 2,
        40
      );
      this.ctx.fillStyle = "#4ecca3";
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(this.currentInput, textX, textBaseY);
      this.ctx.fillText(this.currentInput, textX, textBaseY);
    }
  }

  private drawEnemy(enemy: Enemy) {
    if (!this.imagesLoaded) return;

    const isTargeted = this.targetedEnemy?.id === enemy.id;
    const isFrozen = enemy.frozen;

    // Draw glow for targeted enemy
    if (isTargeted && !isFrozen) {
      const gradient = this.ctx.createRadialGradient(
        enemy.x,
        enemy.y,
        0,
        enemy.x,
        enemy.y,
        enemy.radius * 2
      );
      gradient.addColorStop(0, "rgba(255, 50, 50, 0.5)");
      gradient.addColorStop(1, "rgba(255, 50, 50, 0)");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        enemy.x - enemy.radius * 2,
        enemy.y - enemy.radius * 2,
        enemy.radius * 4,
        enemy.radius * 4
      );
    }

    // Determine which sprite to use based on direction and animation frame
    let spriteRow = 8; // Default to row 9 (index 8) - walking right
    switch (enemy.direction) {
      case "right":
        spriteRow = 8; // Row 9
        break;
      case "left":
        spriteRow = 9; // Row 10
        break;
      case "down":
        spriteRow = 10; // Row 11
        break;
      case "up":
        spriteRow = 11; // Row 12
        break;
    }

    // Calculate which of the 4 sprites in the row to use (changes every 8 frames)
    // This will give us 0, 1, 2, 3 as discrete values
    const spriteIndex = Math.floor(enemy.animationFrame / 8) % 4;

    // Extract sprite from sheet using discrete pixel positions
    const srcX = spriteIndex * this.spriteWidth;
    const srcY = spriteRow * this.spriteHeight;

    // Debug logging for first enemy
    if (enemy.id === 0 && enemy.animationFrame % 8 === 0) {
      console.log(
        `Enemy animation - Frame: ${enemy.animationFrame}, SpriteIndex: ${spriteIndex}, Direction: ${enemy.direction}, srcX: ${srcX}, srcY: ${srcY}`
      );
    }

    // Draw the bear sprite
    this.ctx.save();

    // Apply color filter based on enemy state
    if (enemy.markedForFreeze) {
      // Red filter for marked enemies
      this.ctx.filter =
        "brightness(0.8) sepia(100%) hue-rotate(-50deg) saturate(400%)";
    } else if (enemy.hasSuperpower && !isFrozen) {
      // Blue filter for superpower enemies
      this.ctx.filter =
        "brightness(0.9) sepia(100%) hue-rotate(180deg) saturate(300%)";
    } else if (isFrozen) {
      // White filter for frozen enemies
      this.ctx.filter = "brightness(2) saturate(0)";
    }

    const scale = 2.2; // Bigger enemies
    const drawWidth = this.spriteWidth * scale;
    const drawHeight = this.spriteHeight * scale;

    this.ctx.drawImage(
      this.bearSpriteSheet,
      srcX,
      srcY, // Source x, y in sprite sheet
      this.spriteWidth,
      this.spriteHeight, // Source width, height
      enemy.x - drawWidth / 2,
      enemy.y - drawHeight / 2, // Destination x, y (centered)
      drawWidth,
      drawHeight // Destination width, height
    );

    this.ctx.restore();

    // Draw word below bear
    this.ctx.font = "bold 16px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // Highlight typed portion
    const typedPortion = enemy.word.substring(0, this.currentInput.length);
    const untypedPortion = enemy.word.substring(this.currentInput.length);

    if (isTargeted && this.currentInput.length > 0) {
      // Draw typed in green
      this.ctx.fillStyle = "#4ecca3";
      this.ctx.fillText(
        typedPortion,
        enemy.x - untypedPortion.length * 4,
        enemy.y - drawHeight / 2 - 10
      );

      // Draw untyped in white
      this.ctx.fillStyle = "#fff";
      this.ctx.fillText(
        untypedPortion,
        enemy.x + typedPortion.length * 4,
        enemy.y - drawHeight / 2 - 10
      );
    } else {
      // Draw full word
      this.ctx.fillStyle = "#fff";
      this.ctx.fillText(enemy.word, enemy.x, enemy.y - drawHeight / 2 - 10);
    }
  }

  private gameLoop() {
    if (!this.gameRunning) return;

    const now = Date.now();

    // Spawn enemies
    if (now - this.lastSpawnTime > this.spawnInterval) {
      this.spawnEnemy();
      this.lastSpawnTime = now;
    }

    // Reset combo if timeout expired (but not during freeze - freeze preserves combo)
    if (
      !this.freezeActive &&
      now - this.lastKillTime > this.comboTimeout &&
      this.combo > 0
    ) {
      this.combo = 0;
    }

    // Check if freeze has expired
    if (this.freezeActive && now - this.freezeStartTime > this.freezeDuration) {
      this.freezeActive = false;

      // Update last kill time to preserve combo when exiting freeze
      this.lastKillTime = now;

      // Explode all marked enemies with staggered timing
      const markedEnemies = this.enemies.filter((e) => e.markedForFreeze);
      const killCount = markedEnemies.length;
      const explosionDelay = 15; // 15 frames = ~0.25 seconds at 60fps

      // No punch animation for dancer

      markedEnemies.forEach((enemy, index) => {
        // Update score immediately
        const baseScore = 10 * this.level;
        this.score += baseScore;

        // Set death timer with stagger
        enemy.deathTimer = index * explosionDelay;
        enemy.frozen = true;
      });

      // Show kill message
      if (killCount > 1) {
        const killMessages = [
          "DOUBLE KILL!",
          "TRIPLE KILL!",
          "QUADRUPLE KILL!",
          "QUINTUPLE KILL!",
          "SEXTUPLE KILL!",
          "SEPTUPLE KILL!",
          "OCTUPLE KILL!",
          "NONUPLE KILL!",
          "DECUPLE KILL!",
          "MEGA KILL!",
          "ULTRA KILL!",
          "MONSTER KILL!",
          "LEGENDARY KILL!",
          "GODLIKE KILL!",
        ];
        const soundKeys = [
          "doublekill",
          "triplekill",
          "overkill",
          "killtacular",
          "killtrocity",
          "killimanjaro",
          "killtastrophe",
          "killpocalypse",
          "killionaire",
          "running_riot",
          "rampage",
          "untouchable",
          "invincible",
          "invincible", // Repeat for 14+
        ];
        const msgIndex = Math.min(killCount - 2, killMessages.length - 1);
        this.comboMessage = killMessages[msgIndex];
        this.comboMessageTime = now;
        this.playSound(soundKeys[msgIndex]);
      }

      // Unfreeze remaining unmarked enemies
      this.enemies.forEach((e) => {
        if (!e.markedForFreeze) {
          e.frozen = false;
        }
      });

      if (markedEnemies.length > 0) {
        this.updateUI();
      }
    }

    this.updateEnemies();
    this.updateParticles();
    this.updateFireEffects();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }
}

// Initialize game
new Game();
