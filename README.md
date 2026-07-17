# Neon Fighter 2D

A blistering, arcade-style 2D fighting game built entirely with HTML5 Canvas and Vanilla JavaScript. Focused on gameplay "juice", smooth procedural animations, and authentic fighting game mechanics.

## 🌟 Key Features

### 🥋 Advanced Combat & Roster
- **Procedural Humanoid Renderer:** Characters are articulated dynamically—no sprites needed. Visualizations adapt to character scales and poses smoothly.
- **3 Unique Fighters:**
  - **KAI:** The Balanced Striker (Fireball, Blade Dash)
  - **VEGA:** The Blazing Assassin (Dragon Uppercut, Flying Knee)
  - **GOLEM:** The Unstoppable Force (Spinning Kick, Earthquake Smash)
- **Natural Combos:** Built-in fluid 3-hit string combos (`P` → `P` → `K`).
- **Motion Inputs:** Deep rolling input buffer handling Quarter-Circle and DP motions for special moves.
- **Juggle System:** Suspend airborne opponents with successive attacks for extending combos.
- **Supers:** Fill the meter for invincible screen-shaking super drives.

### 🎭 Cinematic Presentation
- **Dramatic K.O.s:** When the final hit connects, time freezes, the screen shakes, and physics shift into slow-motion as the defeated fighter crashes to the ground.
- **Satisfying Visual Feedback:** Tekken/Mortal Kombat style secondary health bar that softly drains yellow after taking hits.
- **Animated Backgrounds:** A dense, parallax scrolling arena environment that grounds the combatants.
- **Sound Design:** High-impact synthesized sound effects and announcer callouts.

### 🎮 Modes
- **1P VS AI:** A progressive arcade mode where the AI becomes increasingly difficult—eventually transforming into Monsters and Demons in later rounds!
- **2P LOCAL:** Challenge a friend on the same keyboard. Features a full, pre-match Character Selection and Custom Naming screen.

## 🚀 How to Run

No build steps, no external dependencies, and no canvas libraries.

1. **Serve the directory:** Start a local HTTP server in the directory.
   ```bash
   python -m http.server 8080
   # OR
   npx serve .
   ```
2. **Play:** Open your browser and navigate to `http://localhost:8080`!

## ⚙️ Project Architecture
- `gameLoop.js` - The core game and rendering pipeline.
- `Character.js` - Finite State Machine (FSM) dictating character behavioral states, combo chaining, physics, and state transitions.
- `FighterRenderer.js` - Procedural inverse-kinematics styled skeletal drawing system.
- `input.js` - Buffered edge-detection framework that intercepts multi-key rolling sequences for fighting game specials.
- `moves.js` & `characters.js` - Action data and configuration payloads for fighters.
