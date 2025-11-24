import './style.css';
import p5 from 'p5';

console.log('Main script loaded');

const sketch = (p) => {
  let particles = [];
  const particleCount = 100;
  const connectionDistance = 100;

  p.setup = () => {
    const container = document.getElementById('bg-canvas');
    const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent('bg-canvas');

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(p));
    }
  };

  p.draw = () => {
    p.background(10, 14, 23); // Match --bg-dark

    // Update and draw particles
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });

    // Draw connections
    p.stroke(0, 242, 255, 50); // Cyan with low opacity
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        let d = p.dist(particles[i].pos.x, particles[i].pos.y, particles[j].pos.x, particles[j].pos.y);
        if (d < connectionDistance) {
          p.line(particles[i].pos.x, particles[i].pos.y, particles[j].pos.x, particles[j].pos.y);
        }
      }
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
  };

  class Particle {
    constructor(p) {
      this.p = p;
      this.pos = p.createVector(p.random(p.width), p.random(p.height));
      this.vel = p.createVector(p.random(-0.5, 0.5), p.random(-0.5, 0.5));
      this.size = p.random(2, 4);
    }

    update() {
      this.pos.add(this.vel);
      if (this.pos.x < 0 || this.pos.x > this.p.width) this.vel.x *= -1;
      if (this.pos.y < 0 || this.pos.y > this.p.height) this.vel.y *= -1;
    }

    draw() {
      this.p.noStroke();
      this.p.fill(0, 242, 255, 150);
      this.p.circle(this.pos.x, this.pos.y, this.size);
    }
  }
};

new p5(sketch);
