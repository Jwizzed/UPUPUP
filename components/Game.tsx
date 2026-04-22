'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Play, ArrowLeft, ArrowRight } from 'lucide-react';
import { playJumpSound, playFallSound, playRecordSound } from '@/lib/sounds';

// Constants
const GRAVITY = 0.4;
const INITIAL_JUMP_FORCE = -15;
const MAX_JUMP_FORCE = -24;
const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 15;
const PLAYER_SIZE = 30;
const INITIAL_PLATFORM_GAP = 150;
const MAX_PLATFORM_GAP = 280;

const FRENZY_DURATION = 3000; // 3 seconds
const FRENZY_VELOCITY = -36;
const PERFECT_MARGIN_PCT = 0.35; // 35% center margin for "Perfect"
const VOID_INITIAL_SPEED = 0.8;
const ZONE_STEP = 1000;

interface Platform {
  x: number;
  y: number;
  width: number;
  id: number;
  type: 'static' | 'moving' | 'crumbling';
  direction?: number;
  crumbleStartTime?: number;
  speed?: number;
  multiplier?: number;
  lane?: 'safe' | 'risky';
  zone?: ZoneType;
}

type ZoneType = 'normal' | 'ice' | 'wind' | 'low-g';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [frenzyActive, setFrenzyActive] = useState(false);
  const [currentZone, setCurrentZone] = useState<ZoneType>('normal');
  const [combo, setCombo] = useState(0);

  // Refs for game logic to avoid closure/re-render issues
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const requestRef = useRef<number>(0);
  const comboRef = useRef(0);
  const frenzyTimerRef = useRef(0);
  const voidYRef = useRef(0);
  const voidSpeedRef = useRef(VOID_INITIAL_SPEED);
  const zoneTypeRef = useRef<ZoneType>('normal');
  const windForceRef = useRef(0);

  // Game state refs (to avoid closure issues in loop)
  const playerRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    squash: 1,
    stretch: 1,
    tilt: 0,
  });

  const platformsRef = useRef<Platform[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cameraYRef = useRef(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const lastPlatformIdRef = useRef(0);
  const lastLandedPlatformIdRef = useRef<number>(-1);
  const jumpForceRef = useRef(INITIAL_JUMP_FORCE);
  const platformGapRef = useRef(INITIAL_PLATFORM_GAP);
  const recordBrokenRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('upupup_highscore');
      if (saved) {
        const parsed = parseInt(saved);
        if (!isNaN(parsed)) {
          setTimeout(() => setHighScore(parsed), 0);
          highScoreRef.current = parsed;
        }
      }
    }
  }, []);

  const spawnPlatform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const lastPlatform = platformsRef.current[platformsRef.current.length - 1];
    
    // Use the projected score based on the platform's Y coordinate to avoid generating unreachable platforms
    // when the player's zone changes mid-air
    const platformScore = Math.floor(Math.abs(Math.min(0, lastPlatform.y - (canvas.height - 100))));
    
    // Choose zone
    const zoneIndex = Math.floor(platformScore / ZONE_STEP) % 4;
    const zones: ZoneType[] = ['normal', 'ice', 'wind', 'low-g'];
    const spawnZone = zones[zoneIndex];

    // Lane Logic: occasionally branching
    const isBranching = Math.random() < 0.25 && platformScore > 500;
    
    const createPlatformAt = (offsetX: number, lane: 'safe' | 'risky') => {
      // Difficulty Settings based on Score
      let pWidth = PLATFORM_WIDTH;
      let pGap = INITIAL_PLATFORM_GAP;
      let type: Platform['type'] = 'static';
      let multiplier = 1;
      
      if (lane === 'risky') {
        pWidth *= 0.6;
        type = Math.random() < 0.5 ? 'moving' : 'crumbling';
        multiplier = 2;
      }

      if (platformScore < 500) {
        pWidth = PLATFORM_WIDTH;
        pGap = INITIAL_PLATFORM_GAP;
      } else if (platformScore < 1500) {
        pWidth *= 0.9;
        pGap = INITIAL_PLATFORM_GAP * 1.1;
        if (Math.random() < 0.4 && lane === 'safe') type = 'moving';
      } else {
        pWidth *= 0.7;
        pGap = Math.min(MAX_PLATFORM_GAP, INITIAL_PLATFORM_GAP * 1.3);
      }
      
      // Scaling gap for low-g (since height is lower there)
      if (spawnZone === 'low-g') {
        pGap *= 0.6;
      }

      const x = Math.max(0, Math.min(canvas.width - pWidth, offsetX));
      const y = lastPlatform.y - (Math.random() * 30 + pGap * 0.8);

      return {
        x,
        y,
        width: pWidth,
        id: ++lastPlatformIdRef.current,
        type,
        direction: Math.random() < 0.5 ? 1 : -1,
        speed: 1 + Math.random() * 2 + (platformScore / 5000),
        multiplier,
        lane,
        zone: spawnZone
      };
    };

    if (isBranching) {
      const p1 = createPlatformAt(Math.random() * (canvas.width / 2 - 50), 'safe');
      const p2 = createPlatformAt(canvas.width / 2 + Math.random() * (canvas.width / 2 - 50), 'risky');
      platformsRef.current.push(p1 as Platform, p2 as Platform);
    } else {
      const p = createPlatformAt(Math.random() * (canvas.width - PLATFORM_WIDTH), 'safe');
      platformsRef.current.push(p as Platform);
    }
  }, []);

  const createDust = useCallback((x: number, y: number) => {
    // 8 dust particles
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        color: 'rgba(255, 255, 255, 0.6)',
      });
    }
    // 4 yellow sparks
    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 4,
        life: 0.8,
        color: 'rgba(234, 179, 8, 0.8)', // yellow-500
      });
    }
  }, []);

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    playerRef.current = {
      x: canvas.width / 2 - PLAYER_SIZE / 2,
      y: canvas.height - 100,
      vx: 0,
      vy: INITIAL_JUMP_FORCE,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      squash: 1,
      stretch: 1,
      tilt: 0,
    };

    // Initial platforms
    platformsRef.current = [
      { x: canvas.width / 2 - 60, y: canvas.height - 50, width: 120, id: 0, type: 'static', zone: 'normal' },
    ];
    lastPlatformIdRef.current = 0;
    
    // Generate some starting platforms
    for (let i = 1; i < 10; i++) {
      spawnPlatform();
    }

    cameraYRef.current = 0;
    voidYRef.current = canvas.height + 200;
    voidSpeedRef.current = VOID_INITIAL_SPEED;
    comboRef.current = 0;
    setCombo(0);
    setFrenzyActive(false);
    frenzyTimerRef.current = 0;
    zoneTypeRef.current = 'normal';
    setCurrentZone('normal');
    
    jumpForceRef.current = INITIAL_JUMP_FORCE;
    platformGapRef.current = INITIAL_PLATFORM_GAP;
    scoreRef.current = 0;
    setScore(0);
    setNewRecord(false);
    recordBrokenRef.current = false;
    lastLandedPlatformIdRef.current = -1;
    particlesRef.current = [];
  }, [spawnPlatform]);

  const update = useCallback(() => {
    if (gameState !== 'playing') return;

    const player = playerRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Horizontal movement handling
    let moveSpeed = 7;
    let friction = 0.2;
    
    // Zone physics
    if (zoneTypeRef.current === 'ice') {
      moveSpeed = 9;
      friction = 0.05; // Slippery
    } else if (zoneTypeRef.current === 'wind') {
      player.vx += windForceRef.current;
    }

    let targetVx = 0;

    if (keysRef.current['ArrowLeft'] || keysRef.current['a']) {
      targetVx = -moveSpeed;
    } else if (keysRef.current['ArrowRight'] || keysRef.current['d']) {
      targetVx = moveSpeed;
    } else if (keysRef.current['touch']) {
      const touchX = keysRef.current['touchX'] as unknown as number;
      const diff = touchX - (player.x + player.width / 2);
      targetVx = Math.sign(diff) * Math.min(moveSpeed, Math.abs(diff) / 10);
      if (Math.abs(diff) < 5) targetVx = 0;
    }

    if (targetVx !== 0) {
      player.vx += (targetVx - player.vx) * friction;
    } else {
      player.vx *= (1 - friction);
    }

    // Momentum-based tilt
    player.tilt = player.vx * 0.03;

    player.x += player.vx;

    // Wrap around
    if (player.x + player.width < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -player.width;

    // Vertical movement
    let gravity = GRAVITY;
    if (zoneTypeRef.current === 'low-g') gravity *= 0.6;

    // Frenzy State
    if (frenzyTimerRef.current > 0) {
      frenzyTimerRef.current -= 16.6; // Assuming 60fps
      player.vy = FRENZY_VELOCITY;
      if (frenzyTimerRef.current <= 0) {
        setFrenzyActive(false);
      }
    } else {
      player.vy += gravity;
    }
    
    player.y += player.vy;

    // Rising Void Logic
    voidSpeedRef.current = VOID_INITIAL_SPEED + (scoreRef.current / 10000);
    voidYRef.current -= voidSpeedRef.current;

    // Squash and stretch logic
    if (player.vy < 0) {
      player.stretch = Math.min(1.4, 1 + Math.abs(player.vy) * 0.03);
      player.squash = 1 / player.stretch;
    } else {
      player.stretch = Math.min(1.2, 1 + Math.abs(player.vy) * 0.015);
      player.squash = 1 / player.stretch;
    }

    // Platform logic
    platformsRef.current.forEach((platform) => {
      // Handle Moving Platforms
      if (platform.type === 'moving' && platform.direction && platform.speed) {
        platform.x += platform.direction * platform.speed;
        if (platform.x <= 0) {
          platform.x = 0;
          platform.direction = 1;
        } else if (platform.x + platform.width >= canvas.width) {
          platform.x = canvas.width - platform.width;
          platform.direction = -1;
        }
      }

      // Collision with platforms
      if (player.vy > 0 && frenzyTimerRef.current <= 0) {
        if (
          player.y + player.height > platform.y &&
          player.y + player.height < platform.y + PLATFORM_HEIGHT + player.vy &&
          player.x + player.width > platform.x &&
          player.x < platform.x + platform.width
        ) {
          if (platform.type === 'crumbling' && platform.crumbleStartTime && Date.now() - platform.crumbleStartTime > 500) {
            return;
          }

          // Landing
          player.y = platform.y - player.height;
          
          // Switch to platform's zone when landing
          if (platform.zone && platform.zone !== zoneTypeRef.current) {
            zoneTypeRef.current = platform.zone;
            setCurrentZone(platform.zone);
            if (platform.zone === 'wind') {
              windForceRef.current = (Math.random() - 0.5) * 0.4;
            }
          }
          
          let jumpForce = INITIAL_JUMP_FORCE;
          if (zoneTypeRef.current === 'low-g') jumpForce *= 0.7;
          player.vy = jumpForce;
          
          player.squash = 1.6;
          player.stretch = 0.5;
          playJumpSound();
          createDust(player.x + player.width / 2, platform.y);

          if (platform.id !== lastLandedPlatformIdRef.current) {
            // Only count combo if we are actually progressing upwards to a new platform
            if (platform.id > lastLandedPlatformIdRef.current) {
              comboRef.current += 1;
              setCombo(comboRef.current);
              // Trigger Frenzy
              if (comboRef.current >= 10) {
                frenzyTimerRef.current = FRENZY_DURATION;
                setFrenzyActive(true);
                comboRef.current = 0;
                setCombo(0);
                playRecordSound();
              }
            } else {
              // Falling to a lower/older platform breaks combo
              comboRef.current = 0;
              setCombo(0);
            }
            lastLandedPlatformIdRef.current = platform.id;
          }

          // Start crumbling
          if (platform.type === 'crumbling' && !platform.crumbleStartTime) {
            platform.crumbleStartTime = Date.now();
          }
        }
      }
    });

    // Clean up crumbled platforms
    platformsRef.current = platformsRef.current.filter(p => {
      if (p.type === 'crumbling' && p.crumbleStartTime) {
        return Date.now() - p.crumbleStartTime <= 500;
      }
      return true;
    });

    // Camera tracking
    const targetCameraY = Math.min(cameraYRef.current, player.y - canvas.height / 2);
    cameraYRef.current = targetCameraY;

    // Score calculation
    const heightScore = Math.floor(Math.abs(Math.min(0, player.y - (canvas.height - 100))));
    if (heightScore > scoreRef.current) {
      scoreRef.current = heightScore;
      setScore(heightScore);
      
      // High score check
      if (highScoreRef.current > 0 && heightScore > highScoreRef.current && !recordBrokenRef.current) {
        recordBrokenRef.current = true;
        setNewRecord(true);
        playRecordSound();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }

    // Spawn new platforms
    const topPlatform = platformsRef.current[platformsRef.current.length - 1];
    if (topPlatform.y > cameraYRef.current - 200) {
      spawnPlatform();
    }

    // Remove old platforms
    platformsRef.current = platformsRef.current.filter(p => p.y < cameraYRef.current + canvas.height + 200);

    // Update particles
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // Game Over check
    if (player.y > cameraYRef.current + canvas.height + 100 || player.y + player.height > voidYRef.current) {
      setGameState('gameover');
      playFallSound();
      if (scoreRef.current > highScoreRef.current) {
        highScoreRef.current = scoreRef.current;
        setHighScore(scoreRef.current);
        localStorage.setItem('upupup_highscore', scoreRef.current.toString());
      }
    }
  }, [gameState, spawnPlatform, createDust]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const camY = cameraYRef.current;

    // Background Gradient based on Zone
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (currentZone === 'normal') {
      grad.addColorStop(0, '#0f172a'); // Slate 900
      grad.addColorStop(1, '#1e293b'); // Slate 800
    } else if (currentZone === 'ice') {
      grad.addColorStop(0, '#0c4a6e'); // Sky 900
      grad.addColorStop(1, '#0ea5e9'); // Sky 500
    } else if (currentZone === 'wind') {
      grad.addColorStop(0, '#14532d'); // Green 900
      grad.addColorStop(1, '#22c55e'); // Green 500
    } else if (currentZone === 'low-g') {
      grad.addColorStop(0, '#581c87'); // Purple 900
      grad.addColorStop(1, '#a855f7'); // Purple 500
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines for sense of movement
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    const offset = -camY % gridSize;
    for (let y = offset; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // High Score Line
    if (highScoreRef.current > 0) {
      const hsY = (canvas.height - 100) - highScoreRef.current - camY;
      if (hsY > 0 && hsY < canvas.height) {
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)'; // Yellow 500
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, hsY);
        ctx.lineTo(canvas.width, hsY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
        ctx.font = '12px Inter';
        ctx.fillText('BEST: ' + highScoreRef.current, 10, hsY - 5);
      }
    }

    // Draw Platforms
    platformsRef.current.forEach((p) => {
      const drawY = p.y - camY;
      if (drawY > -50 && drawY < canvas.height + 50) {
        ctx.save();
        
        // Crumbling effect
        if (p.type === 'crumbling' && p.crumbleStartTime) {
          const elapsed = Date.now() - p.crumbleStartTime;
          const shake = Math.sin(elapsed * 0.1) * 2;
          ctx.translate(shake, 0);
          ctx.globalAlpha = Math.max(0, 1 - elapsed / 500);
        }

        // Platform shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(p.x + 4, drawY + 4, p.width, PLATFORM_HEIGHT);

        // Platform body colors
        const pGrad = ctx.createLinearGradient(p.x, drawY, p.x, drawY + PLATFORM_HEIGHT);
        if (p.type === 'static') {
          pGrad.addColorStop(0, p.multiplier && p.multiplier > 1 ? '#eab308' : '#10b981'); 
          pGrad.addColorStop(1, p.multiplier && p.multiplier > 1 ? '#ca8a04' : '#059669');
        } else if (p.type === 'moving') {
          pGrad.addColorStop(0, '#3b82f6');
          pGrad.addColorStop(1, '#2563eb');
        } else if (p.type === 'crumbling') {
          pGrad.addColorStop(0, '#f97316');
          pGrad.addColorStop(1, '#ea580c');
        }
        ctx.fillStyle = pGrad;
        
        if (typeof (ctx as any).roundRect === 'function') {
          ctx.beginPath();
          (ctx as any).roundRect(p.x, drawY, p.width, PLATFORM_HEIGHT, 4);
          ctx.fill();
        } else {
          ctx.fillRect(p.x, drawY, p.width, PLATFORM_HEIGHT);
        }
        
        // Risk decoration
        if (p.lane === 'risky') {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x + 2, drawY + 2, p.width - 4, PLATFORM_HEIGHT - 4);
        }

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(p.x, drawY, p.width, 2);
        
        ctx.restore();
      }
    });

    // Draw Rising Void (Lava/Void)
    const voidDrawY = voidYRef.current - camY;
    if (voidDrawY < canvas.height + 100) {
      const vGrad = ctx.createLinearGradient(0, voidDrawY, 0, voidDrawY + 300);
      vGrad.addColorStop(0, '#ef4444'); // Red 500
      vGrad.addColorStop(0.5, '#7f1d1d'); // Red 900
      vGrad.addColorStop(1, 'black');
      ctx.fillStyle = vGrad;
      
      // Wavy top
      ctx.beginPath();
      ctx.moveTo(0, voidDrawY);
      for (let x = 0; x <= canvas.width; x += 20) {
        ctx.lineTo(x, voidDrawY + Math.sin(Date.now() * 0.005 + x * 0.05) * 10);
      }
      ctx.lineTo(canvas.width, canvas.height + 1000);
      ctx.lineTo(0, canvas.height + 1000);
      ctx.fill();
      
      // Bubbles
      ctx.fillStyle = 'rgba(251, 146, 60, 0.5)'; // Orange 400
      for (let i = 0; i < 5; i++) {
        const bx = (Math.sin(Date.now() * 0.001 + i) * 0.5 + 0.5) * canvas.width;
        const by = voidDrawY + 20 + Math.sin(Date.now() * 0.002 + i) * 10;
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y - camY, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw Player
    const player = playerRef.current;
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y - camY + player.height / 2);
    ctx.rotate(player.tilt);
    ctx.scale(player.squash, player.stretch);
    
    // Player body
    const playerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, player.width / 2);
    if (frenzyTimerRef.current > 0) {
      // Frenzy mode: Golden/Fire
      playerGrad.addColorStop(0, '#facc15'); // Yellow 400
      playerGrad.addColorStop(1, '#fb923c'); // Orange 400
      
      // Speed lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo((i - 1) * 10, 20);
        ctx.lineTo((i - 1) * 10, 40);
        ctx.stroke();
      }
    } else {
      playerGrad.addColorStop(0, '#f43f5e'); // Rose 500
      playerGrad.addColorStop(1, '#e11d48'); // Rose 600
    }
    ctx.fillStyle = playerGrad;
    
    // Draw a rounded square for the player
    const r = 8;
    const w = player.width;
    const h = player.height;
    ctx.beginPath();
    ctx.moveTo(-w/2 + r, -h/2);
    ctx.lineTo(w/2 - r, -h/2);
    ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
    ctx.lineTo(w/2, h/2 - r);
    ctx.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
    ctx.lineTo(-w/2 + r, h/2);
    ctx.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
    ctx.lineTo(-w/2, -h/2 + r);
    ctx.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-6, -4, 4, 0, Math.PI * 2);
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    // Eyes look up or down based on velocity
    const eyeOffset = player.vy < 0 ? -2 : 1;
    ctx.beginPath();
    ctx.arc(-6, -4 + eyeOffset, 2, 0, Math.PI * 2);
    ctx.arc(6, -4 + eyeOffset, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (canvasRef.current) {
          canvasRef.current.width = entry.contentRect.width;
          canvasRef.current.height = entry.contentRect.height;
          // Redraw once on resize to avoid flicker
          draw();
        }
      }
    });

    resizeObserver.observe(container);

    const gameLoop = () => {
      update();
      draw();
      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);

    const handleKeyDown = (e: KeyboardEvent) => keysRef.current[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.key] = false;
    
    const handlePointerDown = (e: PointerEvent) => {
      if (gameState === 'playing') {
        keysRef.current['touch'] = true;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          keysRef.current['touchX'] = (e.clientX - rect.left) as any;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (keysRef.current['touch']) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          keysRef.current['touchX'] = (e.clientX - rect.left) as any;
        }
      }
    };

    const handlePointerUp = () => {
      keysRef.current['touch'] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(requestRef.current);
    };
  }, [update, draw, gameState]);

  const startGame = () => {
    initGame();
    setGameState('playing');
  };

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#0f172a', overflow: 'hidden' }}
      className="relative w-full h-full bg-slate-900 overflow-hidden font-sans"
    >
      <canvas 
        ref={canvasRef} 
        style={{ display: 'block', width: '100%', height: '100%' }}
        className="block w-full h-full" 
      />

      {/* UI Overlay */}
      <div 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '24px', pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}
        className="absolute top-0 left-0 w-full p-6 pointer-events-none flex justify-between items-start"
      >
        <div style={{ display: 'flex', flexDirection: 'column' }} className="flex flex-col">
          <span style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }} className="text-slate-400 text-xs uppercase tracking-widest font-bold">{currentZone}</span>
          <motion.span 
            key={score}
            initial={{ scale: 1.2, color: newRecord ? '#eab308' : '#fff' }}
            animate={{ scale: 1, color: newRecord ? '#eab308' : '#fff' }}
            style={{ fontSize: '36px', fontWeight: 900, color: newRecord ? '#eab308' : '#fff' }}
            className="text-4xl font-black tabular-nums"
          >
            {score}
          </motion.span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }} className="flex flex-col items-end">
          <span style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }} className="text-slate-400 text-xs uppercase tracking-widest font-bold">Best</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="flex items-center gap-2">
            <Trophy style={{ width: '16px', height: '16px', color: '#eab308' }} className="w-4 h-4 text-yellow-500" />
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }} className="text-xl font-bold text-white tabular-nums">{highScore}</span>
          </div>
        </div>

        {/* Combo Counter */}
        {combo > 0 && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(234, 179, 8, 0.9)', color: 'white', padding: '12px 24px', borderRadius: '24px', textAlign: 'center', zIndex: 11 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-white px-6 py-3 rounded-full text-center z-11 font-black"
          >
            <div className="text-xs uppercase opacity-80">COMBO</div>
            <div className="text-4xl">x{combo}</div>
          </motion.div>
        )}

        {/* Frenzy Alert */}
        {frenzyActive && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#f43f5e', color: 'white', padding: '8px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', zIndex: 11 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest z-11"
          >
            FRENZY MODE
          </motion.div>
        )}
      </div>

      {/* Start Screen */}
      <AnimatePresence>
        {gameState === 'start' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', padding: '32px', textAlign: 'center', zIndex: 20 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm p-8 text-center"
          >
            <motion.h1 
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              style={{ fontSize: '60px', fontWeight: 900, color: 'white', marginBottom: '8px', letterSpacing: '-0.05em' }}
              className="text-6xl font-black text-white mb-2 tracking-tighter"
            >
              UPUPUP
            </motion.h1>
            <p style={{ color: '#94a3b8', marginBottom: '32px', maxWidth: '320px' }} className="text-slate-400 mb-8 max-w-xs">
              Drag left or right to move. How high can you go?
            </p>
            
            <button 
              onClick={startGame}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', color: '#0f172a', padding: '16px 32px', borderRadius: '16px', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', border: 'none', pointerEvents: 'auto' }}
              className="group relative flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold text-xl hover:bg-rose-500 hover:text-white transition-all active:scale-95 pointer-events-auto"
            >
              <Play style={{ width: '24px', height: '24px', fill: 'currentColor' }} className="w-6 h-6 fill-current" />
              START JUMPING
            </button>

            <div className="mt-8 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Created By</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-400 font-medium opacity-60">
                <span>Nanthawat D.</span>
                <span>Nantawan P.</span>
                <span>Yanatchara J.</span>
                <span>Krittin S.</span>
              </div>
            </div>

            <div className="mt-12 flex gap-4 text-slate-500">
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <div className="p-2 border border-slate-700 rounded-lg"><ArrowLeft className="w-4 h-4" /></div>
                  <div className="p-2 border border-slate-700 rounded-lg"><ArrowRight className="w-4 h-4" /></div>
                </div>
                <span className="text-[10px] uppercase font-bold">Move</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Screen */}
      <AnimatePresence>
        {gameState === 'gameover' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', padding: '32px', textAlign: 'center', zIndex: 30 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md p-8 text-center"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 style={{ color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', marginBottom: '8px' }} className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">Game Over</h2>
              <div style={{ fontSize: '72px', fontWeight: 900, color: 'white', marginBottom: '8px' }} className="text-7xl font-black text-white mb-2">{score}</div>
              
              {newRecord && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ backgroundColor: '#eab308', color: '#0f172a', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 900, marginBottom: '32px', display: 'inline-block' }}
                  className="bg-yellow-500 text-slate-900 px-3 py-1 rounded-full text-xs font-black mb-8 inline-block"
                >
                  NEW PERSONAL BEST!
                </motion.div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }} className="flex flex-col gap-3 mt-8">
                <button 
                  onClick={startGame}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: '#f43f5e', color: 'white', padding: '16px 32px', borderRadius: '16px', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', border: 'none', pointerEvents: 'auto' }}
                  className="flex items-center justify-center gap-3 bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold text-xl hover:bg-rose-600 transition-all active:scale-95 pointer-events-auto"
                >
                  <RotateCcw style={{ width: '24px', height: '24px' }} className="w-6 h-6" />
                  TRY AGAIN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
