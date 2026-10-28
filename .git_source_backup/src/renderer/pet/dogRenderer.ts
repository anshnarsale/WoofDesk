import { PetAnimationState, PetDirection } from '../../shared/types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
  char?: string;
  rotation?: number;
  life: number;
  maxLife: number;
}

export class DogRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 220;
  private height: number = 240;
  private dpr: number = 1;

  // Animation parameters
  private state: PetAnimationState = 'idle';
  private direction: PetDirection = 'right';
  private animTime: number = 0;
  private blinkTimer: number = 0;
  private isBlinking: boolean = false;
  private particles: Particle[] = [];

  // Colors
  private readonly CARAMEL = '#E89846';
  private readonly CARAMEL_DARK = '#D28132';
  private readonly CREAM = '#FFF8EE';
  private readonly EAR_PINK = '#F8B8AB';
  private readonly NOSE_DARK = '#2D1B18';
  private readonly BLUSH_PINK = 'rgba(255, 155, 175, 0.55)';
  private readonly COLLAR_RED = '#E74C3C';
  private readonly BELL_GOLD = '#F1C40F';
  private readonly TONGUE_PINK = '#FF7D9A';

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public setState(state: PetAnimationState): void {
    if (this.state !== state) {
      this.state = state;
      this.animTime = 0;
      if (state === 'celebrate') {
        this.spawnConfetti();
      } else if (state === 'pet_react') {
        this.spawnHearts();
      }
    }
  }

  public getState(): PetAnimationState {
    return this.state;
  }

  public setDirection(dir: PetDirection): void {
    this.direction = dir;
  }

  public triggerHeart(): void {
    this.spawnHearts();
  }

  public triggerConfetti(): void {
    this.spawnConfetti();
  }

  private spawnHearts(): void {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: this.width / 2 + (Math.random() * 40 - 20),
        y: this.height / 2 - 20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1.2 - Math.random() * 1.5,
        alpha: 1,
        size: 14 + Math.random() * 8,
        color: '#FF4B72',
        char: '❤️',
        life: 0,
        maxLife: 60,
      });
    }
  }

  private spawnConfetti(): void {
    const colors = ['#FF4B72', '#FFC312', '#12CBC4', '#ED4C67', '#A3CB38', '#FDA7DF', '#9980FA'];
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x: this.width / 2,
        y: this.height / 2 + 10,
        vx: (Math.random() - 0.5) * 6,
        vy: -3.5 - Math.random() * 5,
        alpha: 1,
        size: 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 60 + Math.random() * 25,
      });
    }
  }

  private spawnZzz(): void {
    if (Math.random() < 0.04) {
      this.particles.push({
        x: this.width / 2 + (this.direction === 'right' ? 24 : -24),
        y: this.height / 2 - 10,
        vx: this.direction === 'right' ? 0.4 : -0.4,
        vy: -0.8 - Math.random() * 0.4,
        alpha: 1,
        size: 12 + Math.random() * 6,
        color: '#6C5CE7',
        char: 'z',
        life: 0,
        maxLife: 80,
      });
    }
  }

  public update(dt: number): void {
    this.animTime += dt;

    // Blinking logic
    this.blinkTimer += dt;
    if (!this.isBlinking && this.blinkTimer > 3.0 + Math.random() * 2.5) {
      this.isBlinking = true;
      this.blinkTimer = 0;
    } else if (this.isBlinking && this.blinkTimer > 0.16) {
      this.isBlinking = false;
      this.blinkTimer = 0;
    }

    // Sleeping particles
    if (this.state === 'sleeping') {
      this.spawnZzz();
    }

    // Particle update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.rotation !== undefined) {
        p.rotation += 0.08;
      }
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  public render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();

    // Base ground coordinate
    const groundY = this.height - 24;
    const centerX = this.width / 2;

    // Flip horizontally if facing left
    if (this.direction === 'left') {
      this.ctx.translate(this.width, 0);
      this.ctx.scale(-1, 1);
    }

    // Calculate pose offsets based on animation state
    let bodyY = groundY - 45;
    let bodyX = centerX;
    let bodySquashX = 1;
    let bodySquashY = 1;
    let bodyRotation = 0;
    let headOffsetY = 0;
    let headOffsetX = 0;
    let headAngle = 0;
    let tailWagAngle = 0;
    let frontPawOffset1 = 0;
    let frontPawOffset2 = 0;
    let rearPawOffset1 = 0;
    let rearPawOffset2 = 0;
    let shadowScale = 1;

    const t = this.animTime;

    switch (this.state) {
      case 'idle': {
        // Gentle breathing bounce
        const breath = Math.sin(t * 3);
        bodyY += breath * 1.5;
        bodySquashY = 1 + breath * 0.03;
        bodySquashX = 1 - breath * 0.02;
        tailWagAngle = Math.sin(t * 4) * 0.25;
        headOffsetY = breath * 0.8;
        break;
      }

      case 'walking': {
        // 4-legged walk cycle
        const walkCycle = Math.sin(t * 10);
        const bob = Math.abs(Math.sin(t * 10)) * 4;
        bodyY -= bob;
        tailWagAngle = Math.sin(t * 12) * 0.45;
        frontPawOffset1 = walkCycle * 8;
        frontPawOffset2 = -walkCycle * 8;
        rearPawOffset1 = -walkCycle * 7;
        rearPawOffset2 = walkCycle * 7;
        headOffsetY = -bob * 0.6;
        bodyRotation = (walkCycle * Math.PI) / 45;
        break;
      }

      case 'running': {
        // Fast energetic run
        const runCycle = Math.sin(t * 18);
        const bob = Math.abs(Math.sin(t * 18)) * 6;
        bodyY -= bob;
        tailWagAngle = Math.sin(t * 22) * 0.6;
        frontPawOffset1 = runCycle * 14;
        frontPawOffset2 = -runCycle * 14;
        rearPawOffset1 = -runCycle * 12;
        rearPawOffset2 = runCycle * 12;
        bodyRotation = 0.1 + Math.sin(t * 18) * 0.08;
        headOffsetY = -bob * 0.8;
        break;
      }

      case 'jumping': {
        // Airborne stretch
        bodyY -= 14;
        bodySquashY = 1.15;
        bodySquashX = 0.9;
        tailWagAngle = 0.5;
        frontPawOffset1 = 10;
        frontPawOffset2 = 8;
        rearPawOffset1 = -10;
        rearPawOffset2 = -8;
        shadowScale = 0.7;
        break;
      }

      case 'sitting': {
        bodyY += 4;
        bodySquashY = 0.92;
        tailWagAngle = Math.sin(t * 3.5) * 0.2;
        headOffsetY = -2;
        break;
      }

      case 'lying_down':
      case 'sleeping': {
        bodyY += 12;
        bodySquashY = 0.75;
        bodySquashX = 1.15;
        const breath = Math.sin(t * 2);
        bodyY += breath * 1.0;
        tailWagAngle = Math.sin(t * 1.5) * 0.1;
        headOffsetY = 8;
        headOffsetX = 12;
        break;
      }

      case 'stretching': {
        // Downward dog stretch
        bodyY += 4;
        bodyRotation = 0.22;
        tailWagAngle = 0.4 + Math.sin(t * 8) * 0.3;
        frontPawOffset1 = 12;
        rearPawOffset1 = -8;
        headOffsetY = 6;
        break;
      }

      case 'curious': {
        bodyY += Math.sin(t * 2.5) * 1.5;
        headAngle = 0.28; // Head tilt!
        headOffsetY = -2;
        tailWagAngle = Math.sin(t * 5) * 0.3;
        break;
      }

      case 'excited':
      case 'celebrate': {
        // Joyful bouncing
        const hop = Math.abs(Math.sin(t * 12)) * 10;
        bodyY -= hop;
        bodySquashY = 1 + (hop / 10) * 0.15;
        tailWagAngle = Math.sin(t * 25) * 0.7;
        headOffsetY = -hop * 0.6;
        break;
      }

      case 'sniffing': {
        bodyRotation = 0.12;
        headOffsetY = 10;
        headOffsetX = 10 + Math.sin(t * 12) * 4;
        tailWagAngle = Math.sin(t * 6) * 0.2;
        break;
      }

      case 'playful_hop': {
        const hop = Math.abs(Math.sin(t * 14)) * 12;
        bodyY -= hop;
        tailWagAngle = Math.sin(t * 18) * 0.5;
        bodyRotation = Math.sin(t * 14) * 0.12;
        break;
      }

      case 'eating': {
        const chew = Math.sin(t * 14) * 2;
        bodyY += chew;
        headOffsetY = 6 + chew;
        tailWagAngle = Math.sin(t * 10) * 0.4;
        break;
      }

      case 'pet_react': {
        bodyY += 2;
        bodySquashY = 0.94;
        headAngle = -0.15;
        tailWagAngle = Math.sin(t * 16) * 0.5;
        break;
      }

      case 'dragged': {
        // Dangling in the air
        bodySquashY = 1.15;
        bodySquashX = 0.9;
        frontPawOffset1 = 12 + Math.sin(t * 6) * 4;
        frontPawOffset2 = 10 - Math.sin(t * 6) * 4;
        rearPawOffset1 = 12 + Math.sin(t * 6) * 4;
        rearPawOffset2 = 10 - Math.sin(t * 6) * 4;
        tailWagAngle = Math.sin(t * 8) * 0.3;
        shadowScale = 0.4;
        break;
      }

      case 'wake_up': {
        bodyRotation = Math.sin(t * 15) * 0.08;
        tailWagAngle = Math.sin(t * 10) * 0.3;
        break;
      }
    }

    // 1. Draw Soft Ground Shadow
    this.drawShadow(centerX, groundY + 8, shadowScale);

    // 2. Draw Tail (Behind body)
    this.drawTail(bodyX - 28, bodyY - 10, tailWagAngle);

    // 3. Draw Back Hind Leg & Back Front Leg
    this.drawLeg(bodyX - 22 + rearPawOffset2, bodyY + 18, 14, 24, true);
    this.drawLeg(bodyX + 16 + frontPawOffset2, bodyY + 18, 14, 24, true);

    // 4. Draw Main Body
    this.drawBody(bodyX, bodyY, bodySquashX, bodySquashY, bodyRotation);

    // 5. Draw Front Hind Leg & Front Paw
    this.drawLeg(bodyX - 16 + rearPawOffset1, bodyY + 20, 15, 26, false);
    this.drawLeg(bodyX + 22 + frontPawOffset1, bodyY + 20, 15, 26, false);

    // 6. Draw Collar with Bell
    this.drawCollar(bodyX + 12, bodyY - 4, bodyRotation);

    // 7. Draw Head & Face
    const headX = bodyX + 24 + headOffsetX;
    const headY = bodyY - 22 + headOffsetY;
    this.drawHead(headX, headY, headAngle);

    this.ctx.restore();

    // 8. Draw Floating Particles (Confetti, Hearts, Zzz)
    this.drawParticles();
  }

  private drawShadow(x: number, y: number, scale: number): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 42 * scale, 12 * scale, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(40, 30, 20, 0.16)';
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawTail(x: number, y: number, wagAngle: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(-0.6 + wagAngle);

    // Shiba fluffy curled tail
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.bezierCurveTo(-15, -10, -28, -32, -12, -42);
    this.ctx.bezierCurveTo(4, -50, 18, -38, 12, -22);
    this.ctx.bezierCurveTo(8, -12, 6, -2, 0, 0);
    this.ctx.fillStyle = this.CARAMEL;
    this.ctx.fill();

    // White tip on tail
    this.ctx.beginPath();
    this.ctx.bezierCurveTo(-18, -34, -12, -42, 0, -44);
    this.ctx.bezierCurveTo(12, -44, 16, -34, 12, -22);
    this.ctx.bezierCurveTo(0, -28, -10, -30, -18, -34);
    this.ctx.fillStyle = this.CREAM;
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawLeg(x: number, y: number, w: number, h: number, isBack: boolean): void {
    this.ctx.save();
    this.ctx.translate(x, y);

    this.ctx.beginPath();
    this.ctx.roundRect(-w / 2, 0, w, h, [6, 6, 8, 8]);
    this.ctx.fillStyle = isBack ? this.CARAMEL_DARK : this.CARAMEL;
    this.ctx.fill();

    // White paw tip
    this.ctx.beginPath();
    this.ctx.roundRect(-w / 2, h - 8, w, 8, [2, 2, 8, 8]);
    this.ctx.fillStyle = isBack ? '#E5DED4' : this.CREAM;
    this.ctx.fill();

    // Tiny toe dividers
    this.ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(-1, h - 6);
    this.ctx.lineTo(-1, h);
    this.ctx.moveTo(2, h - 6);
    this.ctx.lineTo(2, h);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawBody(x: number, y: number, sx: number, sy: number, rot: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rot);
    this.ctx.scale(sx, sy);

    // Chubby caramel torso
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 36, 26, 0.05, 0, Math.PI * 2);
    this.ctx.fillStyle = this.CARAMEL;
    this.ctx.fill();

    // Fluffy cream chest and belly
    this.ctx.beginPath();
    this.ctx.ellipse(14, 6, 20, 18, 0.2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.CREAM;
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawCollar(x: number, y: number, rot: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rot);

    // Red bandana collar
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 6, 16, -0.2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.COLLAR_RED;
    this.ctx.fill();

    // Golden tag / bell
    this.ctx.beginPath();
    this.ctx.arc(4, 8, 4.5, 0, Math.PI * 2);
    this.ctx.fillStyle = this.BELL_GOLD;
    this.ctx.fill();
    this.ctx.strokeStyle = '#D4AC0D';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawHead(x: number, y: number, angle: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);

    // 1. Ears (Left & Right)
    this.drawEar(-16, -24, -0.25);
    this.drawEar(10, -26, 0.15);

    // 2. Head Shape (Caramel)
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 26, 24, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = this.CARAMEL;
    this.ctx.fill();

    // Fluffy cheek tufts
    this.ctx.beginPath();
    this.ctx.ellipse(-24, 6, 8, 10, -0.4, 0, Math.PI * 2);
    this.ctx.ellipse(24, 6, 8, 10, 0.4, 0, Math.PI * 2);
    this.ctx.fillStyle = this.CARAMEL;
    this.ctx.fill();

    // 3. White Muzzle / Cheeks
    this.ctx.beginPath();
    this.ctx.ellipse(2, 6, 18, 14, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = this.CREAM;
    this.ctx.fill();

    // White eyebrow dots (classic Shiba mark!)
    this.ctx.beginPath();
    this.ctx.ellipse(-10, -12, 4, 3, -0.1, 0, Math.PI * 2);
    this.ctx.ellipse(10, -12, 4, 3, 0.1, 0, Math.PI * 2);
    this.ctx.fillStyle = this.CREAM;
    this.ctx.fill();

    // 4. Eyes
    this.drawEyes();

    // 5. Cute Dark Nose
    this.ctx.beginPath();
    this.ctx.ellipse(5, 4, 4.5, 3.2, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = this.NOSE_DARK;
    this.ctx.fill();
    // Nose highlight
    this.ctx.beginPath();
    this.ctx.ellipse(4, 3.2, 1.5, 1, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fill();

    // 6. Mouth / Tongue
    this.drawMouth();

    // 7. Blush Cheeks
    this.ctx.beginPath();
    this.ctx.ellipse(-15, 8, 5.5, 3.5, 0, 0, Math.PI * 2);
    this.ctx.ellipse(19, 8, 5.5, 3.5, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = this.BLUSH_PINK;
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawEar(x: number, y: number, rot: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rot);

    // Outer ear triangle
    this.ctx.beginPath();
    this.ctx.moveTo(0, 16);
    this.ctx.lineTo(-10, 0);
    this.ctx.lineTo(2, -18);
    this.ctx.lineTo(14, 0);
    this.ctx.closePath();
    this.ctx.fillStyle = this.CARAMEL;
    this.ctx.fill();

    // Inner ear pink
    this.ctx.beginPath();
    this.ctx.moveTo(0, 12);
    this.ctx.lineTo(-6, 2);
    this.ctx.lineTo(2, -12);
    this.ctx.lineTo(10, 2);
    this.ctx.closePath();
    this.ctx.fillStyle = this.EAR_PINK;
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawEyes(): void {
    const isHappyState =
      this.state === 'celebrate' ||
      this.state === 'eating' ||
      this.state === 'pet_react' ||
      this.state === 'excited';

    const isClosedEyes = this.state === 'sleeping' || this.isBlinking;

    if (isClosedEyes) {
      // Gentle closed sleeping/blinking arcs ^^
      this.ctx.strokeStyle = this.NOSE_DARK;
      this.ctx.lineWidth = 2.5;
      this.ctx.lineCap = 'round';

      // Left eye arc
      this.ctx.beginPath();
      this.ctx.arc(-8, -2, 5, 0.1 * Math.PI, 0.9 * Math.PI, false);
      this.ctx.stroke();

      // Right eye arc
      this.ctx.beginPath();
      this.ctx.arc(10, -2, 5, 0.1 * Math.PI, 0.9 * Math.PI, false);
      this.ctx.stroke();
    } else if (isHappyState) {
      // Joyful squint eyes (^-^)
      this.ctx.strokeStyle = this.NOSE_DARK;
      this.ctx.lineWidth = 2.8;
      this.ctx.lineCap = 'round';

      this.ctx.beginPath();
      this.ctx.arc(-8, -1, 5, 1.1 * Math.PI, 1.9 * Math.PI, false);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(10, -1, 5, 1.1 * Math.PI, 1.9 * Math.PI, false);
      this.ctx.stroke();
    } else if (this.state === 'dragged') {
      // Big round shocked/surprised eyes (O.O)
      this.drawBigEye(-8, -3, 6, 2.5);
      this.drawBigEye(11, -3, 6, 2.5);
    } else {
      // Normal cute puppy eyes with white shiny dots
      this.drawNormalEye(-8, -3);
      this.drawNormalEye(11, -3);
    }
  }

  private drawNormalEye(x: number, y: number): void {
    // Dark iris
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 4.8, 5.5, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = this.NOSE_DARK;
    this.ctx.fill();

    // Large main sparkle
    this.ctx.beginPath();
    this.ctx.arc(x - 1.4, y - 1.8, 1.8, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();

    // Small secondary sparkle
    this.ctx.beginPath();
    this.ctx.arc(x + 1.6, y + 1.4, 0.9, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
  }

  private drawBigEye(x: number, y: number, r: number, pupilR: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    this.ctx.strokeStyle = this.NOSE_DARK;
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(x, y, pupilR, 0, Math.PI * 2);
    this.ctx.fillStyle = this.NOSE_DARK;
    this.ctx.fill();
  }

  private drawMouth(): void {
    const isMouthOpen =
      this.state === 'eating' ||
      this.state === 'running' ||
      this.state === 'celebrate' ||
      this.state === 'excited';

    if (isMouthOpen) {
      // Open happy mouth with pink tongue
      this.ctx.beginPath();
      this.ctx.arc(5, 8, 5.5, 0, Math.PI);
      this.ctx.fillStyle = '#7E1D2D';
      this.ctx.fill();

      // Tongue
      this.ctx.beginPath();
      this.ctx.ellipse(5, 11, 4, 3, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = this.TONGUE_PINK;
      this.ctx.fill();
    } else {
      // Cute puppy smiling 'w' mouth
      this.ctx.strokeStyle = this.NOSE_DARK;
      this.ctx.lineWidth = 1.6;
      this.ctx.lineCap = 'round';

      this.ctx.beginPath();
      this.ctx.arc(2, 7, 3.2, 0.1 * Math.PI, 0.8 * Math.PI);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(8, 7, 3.2, 0.2 * Math.PI, 0.9 * Math.PI);
      this.ctx.stroke();
    }
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;

      if (p.char) {
        this.ctx.font = `bold ${Math.round(p.size)}px "Segoe UI Emoji", sans-serif`;
        this.ctx.fillStyle = p.color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(p.char, p.x, p.y);
      } else {
        // Confetti quad
        this.ctx.translate(p.x, p.y);
        if (p.rotation !== undefined) {
          this.ctx.rotate(p.rotation);
        }
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }

      this.ctx.restore();
    }
  }
}

