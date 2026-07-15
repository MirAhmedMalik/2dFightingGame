class HealthBar {
    constructor(x, y, width, height, color, isPlayer1 = true) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.isPlayer1 = isPlayer1;
    }

    render(context, health, maxHealth) {
        const healthPercent = Math.max(0, health / maxHealth);
        const barWidth = this.width * healthPercent;

        // Background (dark)
        context.fillStyle = '#333';
        context.fillRect(this.x, this.y, this.width, this.height);

        // Health fill
        context.fillStyle = this.color;
        if (this.isPlayer1) {
            // Player 1 bar fills from left to right
            context.fillRect(this.x, this.y, barWidth, this.height);
        } else {
            // Player 2 bar fills from right to left
            context.fillRect(this.x + this.width - barWidth, this.y, barWidth, this.height);
        }

        // Border
        context.strokeStyle = '#fff';
        context.strokeRect(this.x, this.y, this.width, this.height);
    }
}

export default HealthBar;