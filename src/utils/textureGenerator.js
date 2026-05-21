import * as THREE from 'three';

// Generate a vintage leather cover texture
function createCoverTexture(title, subtitle, color = '#4a2c11') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base background (leather color)
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1024, 1024);

  // Add noise/texture to make it look like leather
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const size = Math.random() * 2 + 1;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(x, y, size, size);
  }

  // Add subtle highlight to mimic worn edges
  const grad = ctx.createRadialGradient(512, 512, 100, 512, 512, 600);
  grad.addColorStop(0, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Gold decorative border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 12;
  ctx.strokeRect(60, 60, 904, 904);
  
  ctx.lineWidth = 4;
  ctx.strokeRect(80, 80, 864, 864);

  // Corner ornaments
  const corners = [
    [80, 80],
    [944, 80],
    [80, 944],
    [944, 944]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fill();
  });

  // Title Text
  ctx.fillStyle = '#d4af37';
  ctx.textAlign = 'center';
  ctx.font = 'bold 70px "Georgia", serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  
  // Wrap and draw title
  ctx.fillText(title, 512, 400);

  // Divider
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(350, 480);
  ctx.lineTo(674, 480);
  ctx.stroke();

  // Subtitle Text
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#bfa36b';
  ctx.font = 'italic 36px "Georgia", serif';
  ctx.fillText(subtitle, 512, 560);

  // Embossed logo/icon in center bottom
  ctx.font = '50px serif';
  ctx.fillText('⚜', 512, 720);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

// Generate aged page texture with custom content
function createPageTexture(pageNumber, title, paragraphs, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Background - Aged paper color
  ctx.fillStyle = options.bgColor || '#f3ebd9';
  ctx.fillRect(0, 0, 1024, 1024);

  // Vignette/Shadow on edges (spine shadow on the left/right depending on page side)
  const isLeftPage = pageNumber % 2 === 0;
  const grad = ctx.createLinearGradient(isLeftPage ? 1024 : 0, 0, isLeftPage ? 824 : 200, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Page border
  ctx.strokeStyle = 'rgba(92, 70, 51, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, 944, 944);

  // Title
  ctx.fillStyle = '#2c1e11';
  ctx.textAlign = isLeftPage ? 'left' : 'right';
  ctx.font = 'bold 52px "Georgia", serif';
  const titleX = isLeftPage ? 100 : 924;
  ctx.fillText(title, titleX, 150);

  // Text alignment
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3a2d1e';
  ctx.font = '32px "Georgia", serif';

  let currentY = 250;
  const margin = 100;
  const maxWidth = 824;

  // Draw paragraph text with word wrap
  paragraphs.forEach(pText => {
    const words = pText.split(' ');
    let line = '';
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, margin, currentY);
        line = words[n] + ' ';
        currentY += 45;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, margin, currentY);
    currentY += 65; // Paragraph spacing
  });

  // Page number
  ctx.fillStyle = '#8c7760';
  ctx.font = 'italic 28px "Georgia", serif';
  ctx.textAlign = isLeftPage ? 'left' : 'right';
  ctx.fillText(`- ${pageNumber} -`, isLeftPage ? 100 : 924, 950);

  // Decorative header line
  ctx.strokeStyle = 'rgba(92, 70, 51, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 180);
  ctx.lineTo(924, 180);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

// Generate paper stack edge texture for the fake thickness boxes
export function createPaperEdgeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base beige edge color
  ctx.fillStyle = '#eae2cf';
  ctx.fillRect(0, 0, 128, 1024);

  // Draw lines to represent page edges
  ctx.strokeStyle = '#c4bfae';
  ctx.lineWidth = 2;
  for (let y = 0; y < 1024; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random() * 2);
    ctx.lineTo(128, y + Math.random() * 2);
    ctx.stroke();
  }

  // Draw some darker lines for groups of pages/chapters
  ctx.strokeStyle = '#999281';
  ctx.lineWidth = 3;
  for (let y = 0; y < 1024; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 20); // Repeat along height
  texture.anisotropy = 16;
  return texture;
}

// Generate the full set of textures needed for the book
export function getBookTextures() {
  return [
    // Cover Front (Leaf 0 Front)
    createCoverTexture('3D POP-UP BOOK', 'An Interactive WebGL Experience', '#6b1919'),
    // Inside Front Cover (Leaf 0 Back) - blank paper
    createPageTexture(0, 'Preface', [
      'Welcome to this 3D Pop-up Book demo, built using React, Three.js, and React Three Fiber.',
      'This project demonstrates realistic procedural page-bending math on the GPU, dynamic paper stack thickness, and beautiful animated pop-up 3D models.',
      'Use the buttons below to turn the pages, or drag the scene to orbit and view the book from different angles!'
    ]),

    // Page 1 (Leaf 1 Front)
    createPageTexture(1, 'The Monument', [
      'Pop-up books date back to the 13th century, where they were used for calculations and maps.',
      'On this page, a majestic red monument pop-up arises directly from the center seam of the book.',
      'As you turn this page, notice how the monument folds flat and disappears, simulating a physical pop-up mechanisms.'
    ]),
    // Page 2 (Leaf 1 Back)
    createPageTexture(2, 'The Solar System', [
      'Interactive elements enhance user engagement by providing physical feedback.',
      'WebGL allows us to render complex geometries and apply real-time lighting to paper materials.',
      'The right page shows our planet Earth orbiting in space, complete with satellite rings.'
    ]),

    // Page 3 (Leaf 2 Front)
    createPageTexture(3, 'The Blue Planet', [
      'A beautiful glowing planet Earth floats above the book center when fully opened.',
      'Notice the specular reflections on the pages as they curve. A strategic directional light creates realistic paper sheen.',
      'The shadow map dynamically updates to cast shadows of the pop-up models onto the pages.'
    ]),
    // Page 4 (Leaf 2 Back)
    createPageTexture(4, 'The Crystal Prism', [
      'This page features a spinning glass crystal prism, refracting light onto the pages below.',
      'You can hover over the 3D models to trigger interactive micro-animations.',
      'Adjust the lighting or toggle between pages to explore the mechanism.'
    ]),

    // Inside Back Cover (Leaf 3 Front)
    createPageTexture(5, 'Epilogue', [
      'Thank you for exploring this interactive WebGL pop-up experience.',
      'All assets, animations, and shaders are computed in real-time on your graphics processor.',
      'Designed and coded by Antigravity under Google DeepMind.'
    ]),
    // Back Cover (Leaf 3 Back)
    createCoverTexture('3D POP-UP BOOK', 'Back Cover', '#5c1616')
  ];
}
