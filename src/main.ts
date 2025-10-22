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
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private enemies: Enemy[] = [];
  private score: number = 0;
  private lives: number = 3;
  private level: number = 1;
  private gameRunning: boolean = false;
  private currentInput: string = "";
  private targetedEnemy: Enemy | null = null;
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 2000;
  private enemyIdCounter: number = 0;
  private animationId: number = 0;

  // Combo system
  private combo: number = 0;
  private lastKillTime: number = 0;
  private comboTimeout: number = 2000; // 2 seconds to maintain combo
  private comboMessage: string = "";
  private comboMessageTime: number = 0;
  private comboMessageDuration: number = 1500;

  // UI Elements
  private scoreEl: HTMLElement;
  private livesEl: HTMLElement;
  private levelEl: HTMLElement;
  private currentInputEl: HTMLElement;
  private typeInput: HTMLInputElement;
  private finalScoreEl: HTMLElement;

  // Screens
  private titleScreen: HTMLElement;
  private gameScreen: HTMLElement;
  private gameOverScreen: HTMLElement;

  // Cat position (center)
  private catX: number = 0;
  private catY: number = 0;
  private catRadius: number = 60;

  // Cat images and animation
  private catImageDefault: HTMLImageElement;
  private catImageTail: HTMLImageElement;
  private imagesLoaded: boolean = false;
  private tailWiggleFrame: number = 0;
  private tailWiggleSpeed: number = 30; // frames between switches

  constructor() {
    this.canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;

    this.scoreEl = document.getElementById("score")!;
    this.livesEl = document.getElementById("lives")!;
    this.levelEl = document.getElementById("level")!;
    this.currentInputEl = document.getElementById("current-input")!;
    this.typeInput = document.getElementById("type-input") as HTMLInputElement;
    this.finalScoreEl = document.getElementById("final-score")!;

    this.titleScreen = document.getElementById("title-screen")!;
    this.gameScreen = document.getElementById("game-screen")!;
    this.gameOverScreen = document.getElementById("game-over-screen")!;

    this.setupCanvas();
    this.setupEventListeners();
    this.loadImages();

    window.addEventListener("resize", () => this.setupCanvas());
  }

  private loadImages() {
    this.catImageDefault = new Image();
    this.catImageTail = new Image();

    let loadedCount = 0;
    const onLoad = () => {
      loadedCount++;
      if (loadedCount === 2) {
        this.imagesLoaded = true;
      }
    };

    this.catImageDefault.onload = onLoad;
    this.catImageTail.onload = onLoad;

    this.catImageDefault.src = "/src/assets/meow-idle/meow-default.png";
    this.catImageTail.src = "/src/assets/meow-idle/meow-default-tail.png";
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
      this.currentInput = (e.target as HTMLInputElement).value.toLowerCase();
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
    this.currentInput = "";
    this.targetedEnemy = null;
    this.lastSpawnTime = Date.now();
    this.spawnInterval = 2000;
    this.gameRunning = true;

    // Reset combo system
    this.combo = 0;
    this.lastKillTime = 0;
    this.comboMessage = "";
    this.comboMessageTime = 0;

    this.updateUI();
    this.typeInput.value = "";
    // Text is now drawn on canvas, no need to update HTML element
    // this.currentInputEl.textContent = "";

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

    const enemy: Enemy = {
      id: this.enemyIdCounter++,
      word,
      x,
      y,
      targetX: this.catX,
      targetY: this.catY,
      speed: 0.5 + this.level * 0.1,
      radius: 30,
      angle,
    };

    this.enemies.push(enemy);
  }

  private handleTyping() {
    // Text is now drawn on canvas above cat's head
    // this.currentInputEl.textContent = this.currentInput;

    if (!this.currentInput) {
      this.targetedEnemy = null;
      return;
    }

    // Find enemy that matches current input
    const matchingEnemy = this.enemies.find((e) =>
      e.word.startsWith(this.currentInput)
    );

    if (matchingEnemy) {
      this.targetedEnemy = matchingEnemy;

      // Complete word typed
      if (this.currentInput === matchingEnemy.word) {
        this.destroyEnemy(matchingEnemy);
        this.typeInput.value = "";
        this.currentInput = "";
        // Text is now drawn on canvas
        // this.currentInputEl.textContent = "";
        this.targetedEnemy = null;
      }
    } else {
      this.targetedEnemy = null;
    }
  }

  private destroyEnemy(enemy: Enemy) {
    const word = enemy.word;

    // Find all enemies with the same word
    const matchingEnemies = this.enemies.filter((e) => e.word === word);
    const killCount = matchingEnemies.length;

    // Remove all matching enemies
    this.enemies = this.enemies.filter((e) => e.word !== word);

    // Update combo
    const now = Date.now();
    if (now - this.lastKillTime < this.comboTimeout) {
      this.combo += killCount;
    } else {
      this.combo = killCount;
    }
    this.lastKillTime = now;

    // Calculate score with combo multiplier
    const baseScore = 10 * this.level * killCount;
    const comboBonus =
      this.combo > 1 ? Math.floor(baseScore * (this.combo * 0.1)) : 0;
    this.score += baseScore + comboBonus;

    // Set combo message
    if (killCount > 1) {
      const killMessages = [
        "DOUBLE KILL!",
        "TRIPLE KILL!",
        "MULTI KILL!",
        "MEGA KILL!",
      ];
      const killMsg =
        killMessages[Math.min(killCount - 2, killMessages.length - 1)];
      this.comboMessage = killMsg;
    } else if (this.combo > 3) {
      this.comboMessage = `${this.combo}x COMBO!`;
    } else {
      this.comboMessage = "";
    }

    if (this.comboMessage) {
      this.comboMessageTime = now;
    }

    this.updateUI();

    // Level up every 10 enemies
    if (this.score % 100 === 0 && this.score > 0) {
      this.level++;
      this.spawnInterval = Math.max(800, this.spawnInterval - 200);
      this.updateUI();
    }
  }

  private updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Move toward center
      const dx = this.catX - enemy.x;
      const dy = this.catY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 1) {
        enemy.x += (dx / distance) * enemy.speed;
        enemy.y += (dy / distance) * enemy.speed;
      }

      // Check collision with cat
      if (distance < this.catRadius + enemy.radius) {
        this.enemies.splice(i, 1);
        this.lives--;
        this.updateUI();

        if (this.lives <= 0) {
          this.gameOver();
        }

        // Shake effect
        this.canvas.classList.add("shake");
        setTimeout(() => this.canvas.classList.remove("shake"), 300);
      }
    }
  }

  private updateUI() {
    this.scoreEl.textContent = this.score.toString();
    this.levelEl.textContent = this.level.toString();

    const hearts = "❤️".repeat(this.lives) + "🖤".repeat(3 - this.lives);
    this.livesEl.textContent = hearts;
  }

  private gameOver() {
    this.gameRunning = false;
    cancelAnimationFrame(this.animationId);
    this.showScreen("gameover");
  }

  private draw() {
    // Clear canvas
    this.ctx.fillStyle = "#0f0f1a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw cat in center
    this.drawCat();

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

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
      this.ctx.font = `bold ${48 * scale}px sans-serif`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Draw text shadow for better visibility
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;

      // Color based on message type
      if (this.comboMessage.includes("KILL")) {
        this.ctx.fillStyle = "#ff6b6b";
      } else {
        this.ctx.fillStyle = "#ffd93d";
      }

      this.ctx.fillText(
        this.comboMessage,
        this.canvas.width / 2,
        this.canvas.height / 3
      );

      this.ctx.restore();
    }

    // Draw combo counter if active
    if (this.combo > 1) {
      this.ctx.save();
      this.ctx.font = "bold 24px sans-serif";
      this.ctx.textAlign = "right";
      this.ctx.textBaseline = "top";
      this.ctx.fillStyle = "#ffd93d";
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      this.ctx.shadowBlur = 5;
      this.ctx.fillText(`${this.combo}x COMBO`, this.canvas.width - 20, 80);
      this.ctx.restore();
    }
  }

  private drawCat() {
    if (!this.imagesLoaded) return;

    this.ctx.save();

    // Determine which image to use based on animation frame
    const currentImage =
      Math.floor(this.tailWiggleFrame / this.tailWiggleSpeed) % 2 === 0
        ? this.catImageDefault
        : this.catImageTail;

    // Draw cat image centered, maintaining aspect ratio
    const scale = 0.5; // Adjust this to change cat size
    const catWidth = currentImage.naturalWidth * scale;
    const catHeight = currentImage.naturalHeight * scale;

    this.ctx.drawImage(
      currentImage,
      this.catX - catWidth / 2,
      this.catY - catHeight / 2,
      catWidth,
      catHeight
    );

    // Draw typing text above cat's head
    if (this.currentInput) {
      this.ctx.font = "bold 24px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "bottom";

      // Draw text background
      const textWidth = this.ctx.measureText(this.currentInput).width;
      const padding = 10;
      const textX = this.catX;
      const textY = this.catY - catHeight / 2 - 20;

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      this.ctx.fillRect(
        textX - textWidth / 2 - padding,
        textY - 30,
        textWidth + padding * 2,
        40
      );

      // Draw text
      this.ctx.fillStyle = "#4ecca3";
      this.ctx.fillText(this.currentInput, textX, textY);
    }

    this.ctx.restore();

    // Increment animation frame
    this.tailWiggleFrame++;
  }

  private drawEnemy(enemy: Enemy) {
    const isTargeted = this.targetedEnemy?.id === enemy.id;

    // Draw glow for targeted enemy
    if (isTargeted) {
      const gradient = this.ctx.createRadialGradient(
        enemy.x,
        enemy.y,
        0,
        enemy.x,
        enemy.y,
        enemy.radius * 2
      );
      gradient.addColorStop(0, "rgba(255, 192, 72, 0.5)");
      gradient.addColorStop(1, "rgba(255, 192, 72, 0)");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        enemy.x - enemy.radius * 2,
        enemy.y - enemy.radius * 2,
        enemy.radius * 4,
        enemy.radius * 4
      );
    }

    // Draw enemy circle
    this.ctx.fillStyle = isTargeted ? "#ffc048" : "#c44569";
    this.ctx.beginPath();
    this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw evil face
    this.ctx.fillStyle = "#fff";
    // Eyes (angry)
    this.ctx.beginPath();
    this.ctx.arc(enemy.x - 8, enemy.y - 5, 3, 0, Math.PI * 2);
    this.ctx.arc(enemy.x + 8, enemy.y - 5, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "#000";
    this.ctx.beginPath();
    this.ctx.arc(enemy.x - 8, enemy.y - 5, 1.5, 0, Math.PI * 2);
    this.ctx.arc(enemy.x + 8, enemy.y - 5, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Angry eyebrows
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(enemy.x - 12, enemy.y - 10);
    this.ctx.lineTo(enemy.x - 5, enemy.y - 7);
    this.ctx.moveTo(enemy.x + 12, enemy.y - 10);
    this.ctx.lineTo(enemy.x + 5, enemy.y - 7);
    this.ctx.stroke();

    // Evil grin
    this.ctx.beginPath();
    this.ctx.arc(enemy.x, enemy.y + 8, 8, 0, Math.PI);
    this.ctx.stroke();

    // Draw word
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
        enemy.y + enemy.radius + 15
      );

      // Draw untyped in white
      this.ctx.fillStyle = "#fff";
      this.ctx.fillText(
        untypedPortion,
        enemy.x + typedPortion.length * 4,
        enemy.y + enemy.radius + 15
      );
    } else {
      // Draw full word
      this.ctx.fillStyle = "#fff";
      this.ctx.fillText(enemy.word, enemy.x, enemy.y + enemy.radius + 15);
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

    // Reset combo if timeout expired
    if (now - this.lastKillTime > this.comboTimeout && this.combo > 0) {
      this.combo = 0;
    }

    this.updateEnemies();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }
}

// Initialize game
new Game();
