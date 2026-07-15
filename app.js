import Character from './Character.js';
import { player1Keys, player2Keys } from './input.js';

// Create player instances (Player 1 = blue, Player 2 = red)
const player1 = new Character(100, 200, 50, 50, 'blue');
const player2 = new Character(800, 200, 50, 50, 'red');

// Game loop
function gameLoop(timestamp) {
    const deltaTime = (timestamp - (gameLoop.lastTime || timestamp)) / 1000;
    gameLoop.lastTime = timestamp;

    // Clear canvas
    const canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground line
    context.fillStyle = '#4a4a4a';
    context.fillRect(0, 270, 960, 2);
    
    // Update and render players
    player1.update(deltaTime, player1Keys);
    player2.update(deltaTime, player2Keys);
    player1.render(context);
    player2.render(context);

    requestAnimationFrame(gameLoop);
}

// Start game loop
requestAnimationFrame(gameLoop);