/**
 * background.js — Animated Parallax Arena Stage
 *
 * Layers (back → front):
 *   0. Sky gradient / moon
 *   1. Distant city skyline  (slowest parallax)
 *   2. Mid-ground building silhouettes + neon signs
 *   3. Crowd silhouettes      (gentle sway animation)
 *   4. Floor / stage surface  (reflective)
 *   5. Torch / fire particles (front-of-stage)
 */

export class Background {
    constructor(width, height) {
        this.W = width;   // 960
        this.H = height;  // 540

        this.GROUND_Y = 270; // must match gameLoop constant

        this.time = 0;

        // ---- Off-screen canvases for static layers (built once) ----
        this._skyCanvas   = this._buildSkyLayer();
        this._cityCanvas  = this._buildCityLayer();
        this._midCanvas   = this._buildMidLayer();

        // ---- Crowd silhouettes ----
        this.crowd = this._buildCrowd();

        // ---- Torch / fire emitters (left and right pillars) ----
        this.torches = [
            { x: 80,          y: this.GROUND_Y - 30, particles: [] },
            { x: this.W - 80, y: this.GROUND_Y - 30, particles: [] },
        ];

        // ---- Ambient floating embers ----
        this.embers = [];
        for (let i = 0; i < 25; i++) {
            this.embers.push(this._spawnEmber(true));
        }

        // ---- Parallax offset (driven by fighter positions) ----
        this.parallaxX = 0; // -1..1 range
    }

    // ---------------------------------------------------------------
    // Static layer builders
    // ---------------------------------------------------------------

    _buildSkyLayer() {
        const c = document.createElement('canvas');
        c.width = this.W; c.height = this.H;
        const ctx = c.getContext('2d');

        // Deep night gradient
        const grad = ctx.createLinearGradient(0, 0, 0, this.H);
        grad.addColorStop(0,    '#04000a');
        grad.addColorStop(0.45, '#0d0028');
        grad.addColorStop(0.75, '#1a0040');
        grad.addColorStop(1,    '#2a0050');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.W, this.H);

        // Stars
        const rng = this._seededRng(42);
        for (let i = 0; i < 120; i++) {
            const sx = rng() * this.W;
            const sy = rng() * this.GROUND_Y * 0.8;
            const sr = rng() * 1.4 + 0.3;
            const a  = rng() * 0.6 + 0.4;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.fill();
        }

        // Moon
        const moonX = this.W * 0.72, moonY = 55, moonR = 28;
        const moonGrad = ctx.createRadialGradient(moonX - 6, moonY - 4, 2, moonX, moonY, moonR);
        moonGrad.addColorStop(0,   'rgba(255,245,200,0.95)');
        moonGrad.addColorStop(0.5, 'rgba(240,230,170,0.8)');
        moonGrad.addColorStop(1,   'rgba(220,200,120,0)');
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fillStyle = moonGrad;
        ctx.fill();

        // Moon glow
        const glowGrad = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 3.5);
        glowGrad.addColorStop(0,   'rgba(140,100,255,0.18)');
        glowGrad.addColorStop(1,   'rgba(140,100,255,0)');
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        return c;
    }

    _buildCityLayer() {
        // Distant skyline
        const c = document.createElement('canvas');
        c.width = this.W * 2; c.height = this.H;
        const ctx = c.getContext('2d');

        const rng = this._seededRng(7);
        const groundY = this.GROUND_Y;

        // Buildings far back
        let bx = 0;
        while (bx < c.width) {
            const bw = rng() * 50 + 20;
            const bh = rng() * 130 + 40;
            const by = groundY - bh;
            ctx.fillStyle = `rgba(${Math.floor(rng()*20+5)},${Math.floor(rng()*10)},${Math.floor(rng()*40+20)},0.9)`;
            ctx.fillRect(bx, by, bw - 2, bh);

            // Random lit windows
            const cols = Math.floor(bw / 10);
            const rows = Math.floor(bh / 12);
            for (let r = 0; r < rows; r++) {
                for (let col = 0; col < cols; col++) {
                    if (rng() > 0.55) {
                        const wx = bx + col * 10 + 2;
                        const wy = by + r * 12 + 3;
                        const bright = rng() > 0.5;
                        ctx.fillStyle = bright ? 'rgba(255,220,80,0.8)' : 'rgba(100,180,255,0.6)';
                        ctx.fillRect(wx, wy, 5, 7);
                    }
                }
            }
            bx += bw + rng() * 8 + 2;
        }

        return c;
    }

    _buildMidLayer() {
        // Mid buildings + neon signs
        const c = document.createElement('canvas');
        c.width = this.W * 2; c.height = this.H;
        const ctx = c.getContext('2d');

        const rng = this._seededRng(13);
        const groundY = this.GROUND_Y;

        let bx = 30;
        const palette = [
            [12, 0, 30], [5, 0, 50], [20, 5, 40], [0, 8, 28]
        ];
        while (bx < c.width - 20) {
            const bw = rng() * 80 + 40;
            const bh = rng() * 100 + 60;
            const by = groundY - bh;
            const color = palette[Math.floor(rng() * palette.length)];
            ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
            ctx.fillRect(bx, by, bw - 4, bh);

            // Edge highlights
            ctx.fillStyle = 'rgba(120,60,255,0.25)';
            ctx.fillRect(bx, by, 3, bh);
            ctx.fillRect(bx + bw - 7, by, 3, bh);

            // Neon sign (sometimes)
            if (rng() > 0.5) {
                const signY = by + 15;
                const signW = bw * 0.6;
                const signX = bx + (bw - signW) / 2;
                const neons = ['rgba(255,0,120,0.9)', 'rgba(0,220,255,0.9)', 'rgba(180,0,255,0.9)', 'rgba(255,180,0,0.9)'];
                ctx.fillStyle = neons[Math.floor(rng() * neons.length)];
                ctx.fillRect(signX, signY, signW, 4);
            }

            bx += bw + rng() * 30 + 10;
        }

        return c;
    }

    // ---------------------------------------------------------------
    // Crowd
    // ---------------------------------------------------------------

    _buildCrowd() {
        const crowd = [];
        const rng = this._seededRng(99);
        const rows = 3;
        const W = this.W;
        const groundY = this.GROUND_Y;

        for (let row = 0; row < rows; row++) {
            const y = groundY - 35 - row * 22;
            const count = Math.floor(W / (14 - row * 0.5));
            for (let i = 0; i < count; i++) {
                crowd.push({
                    x:         (i / count) * W + rng() * 10 - 5,
                    y:         y,
                    headR:     4 + rng() * 2 - row,
                    bodyW:     7 + rng() * 3 - row,
                    bodyH:     12 + rng() * 5 - row,
                    row:       row,
                    phase:     rng() * Math.PI * 2,
                    swaySpeed: 0.6 + rng() * 0.8,
                    swayAmp:   1.5 + rng() * 2,
                    // colour: dark with slight tint
                    r: Math.floor(rng() * 30 + 10),
                    g: Math.floor(rng() * 20),
                    b: Math.floor(rng() * 50 + 20),
                    // occasional colourful sign / luminous fan
                    hasSign:   rng() > 0.88,
                    signColor: `hsl(${Math.floor(rng() * 360)},100%,60%)`,
                });
            }
        }
        return crowd;
    }

    // ---------------------------------------------------------------
    // Ember / particle helpers
    // ---------------------------------------------------------------

    _spawnEmber(randomY = false) {
        const x = Math.random() * this.W;
        const y = randomY
            ? Math.random() * this.GROUND_Y
            : this.GROUND_Y - 5;
        return {
            x, y,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -(Math.random() * 0.6 + 0.2),
            life: Math.random(),
            maxLife: 0.6 + Math.random() * 1.4,
            r: Math.random() * 1.5 + 0.5,
        };
    }

    _spawnFireParticle(tx, ty) {
        return {
            x:  tx + (Math.random() - 0.5) * 12,
            y:  ty,
            vx: (Math.random() - 0.5) * 1.1,
            vy: -(Math.random() * 2.5 + 1.0),
            life: 1,
            size: Math.random() * 8 + 4,
        };
    }

    // ---------------------------------------------------------------
    // Update
    // ---------------------------------------------------------------

    update(dt, p1x, p2x) {
        this.time += dt;

        // Parallax: mid-point between fighters relative to canvas centre
        const midFighter = (p1x + p2x) / 2;
        const targetPX = ((midFighter - this.W / 2) / (this.W / 2)) * 0.5; // -0.5..0.5
        this.parallaxX += (targetPX - this.parallaxX) * dt * 1.5;

        // ---- Torch particles ----
        for (const torch of this.torches) {
            // Spawn ~30 particles/s
            if (Math.random() < dt * 30) {
                torch.particles.push(this._spawnFireParticle(torch.x, torch.y));
            }
            for (const p of torch.particles) {
                p.x   += p.vx;
                p.y   += p.vy;
                p.life -= dt * 1.8;
                p.size *= 0.98;
            }
            torch.particles = torch.particles.filter(p => p.life > 0 && p.size > 0.5);
        }

        // ---- Embers ----
        for (const e of this.embers) {
            e.x   += e.vx;
            e.y   += e.vy * 0.4;
            e.life -= dt / e.maxLife;
            if (e.life <= 0 || e.y < 0) {
                Object.assign(e, this._spawnEmber(e.y < 0));
            }
        }
    }

    // ---------------------------------------------------------------
    // Draw
    // ---------------------------------------------------------------

    draw(ctx) {
        const { W, H, GROUND_Y, time } = this;

        // -- Layer 0: Sky --
        ctx.drawImage(this._skyCanvas, 0, 0);

        // -- Twinkling stars overlay (animate alpha) --
        // (simple: re-draw a few bright pixels with varying opacity)
        const rng2 = this._seededRng(42);
        for (let i = 0; i < 120; i++) {
            const sx = rng2() * W;
            const sy = rng2() * GROUND_Y * 0.8;
            const sr = rng2() * 1.4 + 0.3;
            const baseA = rng2() * 0.6 + 0.4;
            const twinkle = baseA + Math.sin(time * (1 + rng2() * 3) + i) * 0.15;
            ctx.globalAlpha = Math.max(0, Math.min(1, twinkle));
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // -- Layer 1: Distant city (slowest parallax) --
        const cityOff = -this.parallaxX * 30;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(this._cityCanvas, cityOff, 0, W, H, 0, 0, W, H);
        ctx.globalAlpha = 1;

        // -- Layer 2: Mid buildings (medium parallax) --
        const midOff = -this.parallaxX * 70;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(this._midCanvas, midOff, 0, W, H, 0, 0, W, H);
        ctx.globalAlpha = 1;

        // -- Crowd background glow (atmospheric) --
        const crowdGlow = ctx.createLinearGradient(0, GROUND_Y - 75, 0, GROUND_Y);
        crowdGlow.addColorStop(0, 'rgba(60,0,120,0)');
        crowdGlow.addColorStop(1, 'rgba(80,10,160,0.45)');
        ctx.fillStyle = crowdGlow;
        ctx.fillRect(0, GROUND_Y - 75, W, 75);

        // -- Layer 3: Crowd silhouettes --
        this._drawCrowd(ctx);

        // -- Layer 4: Floor / stage --
        this._drawFloor(ctx);

        // -- Ambient embers --
        for (const e of this.embers) {
            ctx.globalAlpha = e.life * 0.5;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.fillStyle = '#ffaa33';
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // -- Layer 5: Torches --
        this._drawTorches(ctx);
    }

    _drawCrowd(ctx) {
        const { time } = this;
        // Draw back row to front row
        for (let row = this.crowd[0]?.row ?? 0; row <= 2; row++) {
            const members = this.crowd.filter(m => m.row === row);
            for (const m of members) {
                const sway = Math.sin(time * m.swaySpeed + m.phase) * m.swayAmp;
                const px = m.x;
                const py = m.y + sway;

                ctx.fillStyle = `rgb(${m.r},${m.g},${m.b})`;

                // Body
                ctx.fillRect(px - m.bodyW / 2, py - m.bodyH, m.bodyW, m.bodyH);

                // Head
                ctx.beginPath();
                ctx.arc(px, py - m.bodyH - m.headR, m.headR, 0, Math.PI * 2);
                ctx.fill();

                // Glowing item (phone/sign)
                if (m.hasSign) {
                    const signY = py - m.bodyH * 0.6;
                    const pulse = 0.5 + Math.sin(time * 2 + m.phase) * 0.3;
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = m.signColor;
                    ctx.fillRect(px - 4, signY - 5, 8, 5);
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    _drawFloor(ctx) {
        const { W, H, GROUND_Y, time } = this;

        // Main floor surface
        const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
        floorGrad.addColorStop(0,    '#1a0035');
        floorGrad.addColorStop(0.15, '#110022');
        floorGrad.addColorStop(1,    '#050010');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

        // Reflective stripe lines on floor
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, GROUND_Y, W, H - GROUND_Y);
        ctx.clip();

        for (let i = 0; i < 12; i++) {
            const lineY = GROUND_Y + 8 + i * 22;
            const lineAlpha = Math.max(0, 0.18 - i * 0.012);
            ctx.strokeStyle = `rgba(160,80,255,${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, lineY);
            ctx.lineTo(W, lineY);
            ctx.stroke();
        }

        // Edge glows (torch reflections)
        const leftGlow = ctx.createRadialGradient(80, GROUND_Y, 0, 80, GROUND_Y, 120);
        leftGlow.addColorStop(0,   'rgba(255,100,0,0.22)');
        leftGlow.addColorStop(1,   'rgba(255,100,0,0)');
        ctx.fillStyle = leftGlow;
        ctx.fillRect(0, GROUND_Y, 200, 100);

        const rightGlow = ctx.createRadialGradient(W - 80, GROUND_Y, 0, W - 80, GROUND_Y, 120);
        rightGlow.addColorStop(0,   'rgba(255,100,0,0.22)');
        rightGlow.addColorStop(1,   'rgba(255,100,0,0)');
        ctx.fillStyle = rightGlow;
        ctx.fillRect(W - 200, GROUND_Y, 200, 100);

        // Center spotlight on floor
        const pulse = Math.sin(time * 0.5) * 0.04 + 0.14;
        const spotlight = ctx.createRadialGradient(W / 2, GROUND_Y, 0, W / 2, GROUND_Y, 320);
        spotlight.addColorStop(0,   `rgba(100,40,200,${pulse})`);
        spotlight.addColorStop(1,   'rgba(100,40,200,0)');
        ctx.fillStyle = spotlight;
        ctx.fillRect(0, GROUND_Y, W, 160);

        ctx.restore();

        // Ground dividing line
        ctx.strokeStyle = '#8833ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#aa55ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(W, GROUND_Y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }

    _drawTorches(ctx) {
        const { GROUND_Y, time } = this;

        for (const torch of this.torches) {
            // Pillar
            const px = torch.x;
            const pillarH = 75;
            const pillarW = 18;
            const pillarGrad = ctx.createLinearGradient(px - pillarW / 2, 0, px + pillarW / 2, 0);
            pillarGrad.addColorStop(0,   '#120a1e');
            pillarGrad.addColorStop(0.5, '#2a1540');
            pillarGrad.addColorStop(1,   '#0d0818');
            ctx.fillStyle = pillarGrad;
            ctx.fillRect(px - pillarW / 2, GROUND_Y - pillarH, pillarW, pillarH);

            // Torch bowl
            ctx.fillStyle = '#3a1a50';
            ctx.beginPath();
            ctx.ellipse(px, GROUND_Y - pillarH, 12, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Fire particles
            for (const p of torch.particles) {
                const alpha = p.life;
                const t = 1 - p.life;
                // Colour: white-yellow → orange → red
                const r = 255;
                const g = Math.floor(220 * (1 - t * 0.7));
                const b = Math.floor(80 * (1 - t));
                ctx.globalAlpha = alpha * 0.85;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Torch glow halo
            const flickerAmp = 0.08;
            const flicker = 1 + Math.sin(time * 18 + torch.x) * flickerAmp;
            const halo = ctx.createRadialGradient(px, GROUND_Y - pillarH - 10, 0, px, GROUND_Y - pillarH, 55 * flicker);
            halo.addColorStop(0,   'rgba(255,140,20,0.45)');
            halo.addColorStop(0.4, 'rgba(255,80,0,0.18)');
            halo.addColorStop(1,   'rgba(255,50,0,0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(px, GROUND_Y - pillarH, 55 * flicker, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ---------------------------------------------------------------
    // Seeded pseudo-random (simple LCG) for deterministic geometry
    // ---------------------------------------------------------------
    _seededRng(seed) {
        let s = seed;
        return function () {
            s = (s * 1664525 + 1013904223) & 0xffffffff;
            return (s >>> 0) / 0xffffffff;
        };
    }
}
