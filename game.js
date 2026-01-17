// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 400;

// Game state
let gameState = 'start'; // start, playing, gameover
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
let gameSpeed = 1.2;
let frameCount = 0;

// Player class
class Player {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = 100;
        this.y = canvas.height - 150;
        this.velocityY = 0;
        this.gravity = 0.35;
        this.jumpPower = -9;
        this.isJumping = false;
        this.groundLevel = canvas.height - 150;
        this.rotation = 0;
        this.color = '#FF6B6B';
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = this.jumpPower;
            this.isJumping = true;
        }
    }

    update() {
        // Apply gravity
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // Ground collision
        if (this.y >= this.groundLevel) {
            this.y = this.groundLevel;
            this.velocityY = 0;
            this.isJumping = false;
            this.rotation = 0;
        } else {
            // Rotate while in air
            this.rotation += 2;
        }

        // Prevent going above canvas
        if (this.y < 0) {
            this.y = 0;
            this.velocityY = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Draw cube with gradient
        const gradient = ctx.createLinearGradient(-this.width/2, -this.height/2, this.width/2, this.height/2);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, '#FF8E53');

        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

// Obstacle class
class Obstacle {
    constructor(x, type = 'spike') {
        this.x = x;
        this.type = type;
        this.width = type === 'spike' ? 30 : 40;
        this.height = type === 'spike' ? 40 : Math.random() * 100 + 50;
        this.y = canvas.height - 120 - (type === 'spike' ? 0 : this.height);
        this.color = type === 'spike' ? '#4ECDC4' : '#95E1D3';
        this.passed = false;
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        if (this.type === 'spike') {
            // Draw triangle spike
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y);
            ctx.lineTo(this.x, this.y + this.height);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Draw block
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, '#7FDBCA');

            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }

    getBounds() {
        if (this.type === 'spike') {
            return {
                x: this.x + 5,
                y: this.y + 5,
                width: this.width - 10,
                height: this.height - 5
            };
        }
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// Particle effect class
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.life = 1;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isDead() {
        return this.life <= 0;
    }
}

// Game objects
const player = new Player();
const obstacles = [];
const particles = [];

// Ground segments for parallax effect
const groundSegments = [];
for (let i = 0; i < canvas.width / 40 + 2; i++) {
    groundSegments.push({ x: i * 40, y: canvas.height - 120 });
}

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Spawn obstacles
function spawnObstacle() {
    const type = Math.random() > 0.7 ? 'block' : 'spike';
    obstacles.push(new Obstacle(canvas.width, type));
}

// Create particles
function createParticles(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y));
    }
}

// Draw ground
function drawGround() {
    // Ground platform
    ctx.fillStyle = '#38A169';
    ctx.fillRect(0, canvas.height - 120, canvas.width, 120);

    // Ground line
    ctx.strokeStyle = '#2F855A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 120);
    ctx.lineTo(canvas.width, canvas.height - 120);
    ctx.stroke();

    // Ground segments
    groundSegments.forEach(segment => {
        ctx.fillStyle = '#2F855A';
        ctx.fillRect(segment.x, segment.y, 35, 5);

        // Move segments
        segment.x -= gameSpeed * 0.5;
        if (segment.x + 35 < 0) {
            segment.x = canvas.width;
        }
    });
}

// Draw background
function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 120);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height - 120);

    // Simple clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const cloudOffset = (frameCount * 0.5) % (canvas.width + 100);

    for (let i = -1; i < 3; i++) {
        const x = i * 300 - cloudOffset;
        ctx.beginPath();
        ctx.arc(x, 50, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, 50, 25, 0, Math.PI * 2);
        ctx.arc(x + 50, 50, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x + 100, 100, 25, 0, Math.PI * 2);
        ctx.arc(x + 130, 100, 30, 0, Math.PI * 2);
        ctx.arc(x + 165, 100, 25, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Update game
function update() {
    if (gameState !== 'playing') return;

    frameCount++;
    player.update();

    // Update obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.update();

        // Check collision
        if (checkCollision(player.getBounds(), obstacle.getBounds())) {
            gameOver();
            createParticles(player.x + player.width / 2, player.y + player.height / 2, 20);
        }

        // Update score
        if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
            obstacle.passed = true;
            score++;
            updateScore();
        }

        // Remove off-screen obstacles
        if (obstacle.isOffScreen()) {
            obstacles.splice(index, 1);
        }
    });

    // Update particles
    particles.forEach((particle, index) => {
        particle.update();
        if (particle.isDead()) {
            particles.splice(index, 1);
        }
    });

    // Spawn new obstacles
    if (frameCount % 200 === 0) {
        spawnObstacle();
    }

    // Increase difficulty
    if (frameCount % 1000 === 0 && gameSpeed < 3) {
        gameSpeed += 0.1;
    }
}

// Draw game
function draw() {
    drawBackground();
    drawGround();

    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw());

    // Draw particles
    particles.forEach(particle => particle.draw());

    // Draw player
    player.draw();
}

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'playing') {
        update();
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = score;

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        document.getElementById('best-score').textContent = bestScore;
    }
}

// Game over
function gameOver() {
    gameState = 'gameover';
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').classList.remove('hidden');
}

// Start game
function startGame() {
    gameState = 'playing';
    score = 0;
    gameSpeed = 1.2;
    frameCount = 0;
    obstacles.length = 0;
    particles.length = 0;
    player.y = player.groundLevel;
    player.velocityY = 0;
    player.isJumping = false;
    player.rotation = 0;

    updateScore();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Jump controls
function handleJump() {
    if (gameState === 'playing') {
        player.jump();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
    }
});

canvas.addEventListener('click', handleJump);

// Initialize
document.getElementById('best-score').textContent = bestScore;
gameLoop();
