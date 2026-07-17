class HealthBar {
    constructor(x, y, width, height, color, isPlayer1 = true) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.isPlayer1 = isPlayer1;

        this.displayedHealth = 100;
        this.lastTime = performance.now();
        this.drainDelay = 0;
    }

    render(context, health, maxHealth) {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // Initialize displayed health if needed
        if (this.displayedHealth > maxHealth && health === maxHealth) {
            this.displayedHealth = maxHealth;
        }

        // Logic for satisfying drain effect
        if (this.displayedHealth > health) {
            // Only start draining if health hasn't dropped again recently
            if (this.drainDelay > 0) {
                this.drainDelay -= dt;
            } else {
                this.displayedHealth -= 40 * dt; // drain speed
                if (this.displayedHealth < health) this.displayedHealth = health;
            }
        } else if (this.displayedHealth < health) {
            this.displayedHealth = health; // Instant heal
        } else {
            this.drainDelay = 0.5; // Short delay before yellow bar starts shrinking
        }

        const healthPercent = Math.max(0, health / maxHealth);
        const displayedPercent = Math.max(0, this.displayedHealth / maxHealth);

        const realBarWidth = this.width * healthPercent;
        const lagBarWidth = this.width * displayedPercent;

        // Background (dark inner frame)
        context.fillStyle = '#333';
        context.fillRect(this.x, this.y, this.width, this.height);

        if (this.isPlayer1) {
            // Player 1 fills from left to right
            // 1. Draw yellow lag bar
            context.fillStyle = '#ffcc00';
            context.fillRect(this.x, this.y, lagBarWidth, this.height);
            // 2. Draw real health bar over it
            context.fillStyle = this.color;
            context.fillRect(this.x, this.y, realBarWidth, this.height);
        } else {
            // Player 2 fills from right to left
            context.fillStyle = '#ffcc00';
            context.fillRect(this.x + this.width - lagBarWidth, this.y, lagBarWidth, this.height);
            context.fillStyle = this.color;
            context.fillRect(this.x + this.width - realBarWidth, this.y, realBarWidth, this.height);
        }

        // Beautiful metallic border
        context.strokeStyle = '#fff';
        context.lineWidth = 2;
        context.strokeRect(this.x, this.y, this.width, this.height);
    }
}

export default HealthBar;