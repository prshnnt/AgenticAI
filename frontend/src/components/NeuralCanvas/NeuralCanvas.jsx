import { useEffect, useRef } from 'react';
import styles from './NeuralCanvas.module.css';

const NODE_COUNT = 48;
const CONNECTION_DISTANCE = 160;
const SPEED = 0.18;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default function NeuralCanvas() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const nodesRef  = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initNodes() {
      nodesRef.current = Array.from({ length: NODE_COUNT }, () => ({
        x:   randomBetween(0, canvas.width),
        y:   randomBetween(0, canvas.height),
        vx:  randomBetween(-SPEED, SPEED),
        vy:  randomBetween(-SPEED, SPEED),
        r:   randomBetween(1.5, 3.5),
        pulse: randomBetween(0, Math.PI * 2),
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += 0.012;

        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx   = nodes[i].x - nodes[j].x;
          const dy   = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(79, 142, 255, ${alpha})`;
            ctx.lineWidth   = 0.8;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const pulsedR = n.r + Math.sin(n.pulse) * 0.6;
        const alpha   = 0.35 + Math.sin(n.pulse) * 0.15;

        // Outer glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pulsedR * 5);
        grd.addColorStop(0, `rgba(79, 142, 255, ${alpha * 0.6})`);
        grd.addColorStop(1, 'rgba(79, 142, 255, 0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulsedR * 5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulsedR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(79, 142, 255, ${alpha + 0.3})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    resize();
    initNodes();
    draw();

    window.addEventListener('resize', () => { resize(); initNodes(); });

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
