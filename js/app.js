const toolButtons = document.querySelectorAll('.tool-btn');
const layerButtons = document.querySelectorAll('.layer-btn');
const activeToolLabel = document.getElementById('activeToolLabel');
const mouseCoords = document.getElementById('mouseCoords');
const toolSize = document.getElementById('toolSize');
const toolSizeValue = document.getElementById('toolSizeValue');
const toolOptionHint = document.getElementById('toolOptionHint');
const aboutButton = document.getElementById('aboutButton');
const aboutModal = document.getElementById('aboutModal');
const aboutCloseButton = document.getElementById('aboutCloseButton');
const canvas = document.getElementById('mapCanvas');
const brushPreview = document.getElementById('brushPreview');
const context = canvas.getContext('2d');

let isDrawing = false;
let currentTool = 'brush';
let currentSize = Number(toolSize.value);

function createEmojiCursor(emoji, x = 6, y = 20) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text x="2" y="24" font-size="22">${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, auto`;
}

const pencilCursor = createEmojiCursor('✏️');
const eraserCursor = createEmojiCursor('🧽');

function isEraserTool(tool) {
  return tool === 'eraser';
}

function updateCanvasCursor() {
  if (isEraserTool(currentTool)) {
    canvas.style.cursor = eraserCursor;
    return;
  }
  canvas.style.cursor = pencilCursor;
}

function getToolStrokeSize() {
  if (currentTool === 'line') {
    return Math.max(1, currentSize / 2);
  }
  return currentSize;
}

function shouldShowSizePreview() {
  return currentTool === 'eraser' || currentTool === 'brush' || currentTool === 'line' || currentTool === 'height-brush' || currentTool === 'slope' || currentTool === 'smooth' || currentTool === 'biome-paint';
}

function hideBrushPreview() {
  brushPreview.style.display = 'none';
}

function updateBrushPreview(event) {
  if (!shouldShowSizePreview()) {
    hideBrushPreview();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const scaleX = rect.width / canvas.width;
  const size = getToolStrokeSize() * scaleX;

  brushPreview.style.display = 'block';
  brushPreview.style.width = `${size}px`;
  brushPreview.style.height = `${size}px`;
  brushPreview.style.left = `${localX + canvas.offsetLeft}px`;
  brushPreview.style.top = `${localY + canvas.offsetTop}px`;
}

function setActive(buttons, selectedButton, activeClass) {
  buttons.forEach((button) => button.classList.remove(activeClass));
  selectedButton.classList.add(activeClass);
}

toolButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tool = button.dataset.tool || 'brush';
    currentTool = tool;
    setActive(toolButtons, button, 'is-active');
    activeToolLabel.textContent = `Active Tool: ${button.textContent}`;
    if (tool === 'rectangle') {
      toolOptionHint.textContent = 'Tool options: rectangle shape coming later';
      updateCanvasCursor();
      return;
    }
    if (tool === 'shape') {
      toolOptionHint.textContent = 'Tool options: shape variants coming later';
      updateCanvasCursor();
      return;
    }
    toolOptionHint.textContent = 'Tool options: coming later';
    updateCanvasCursor();
  });
});

layerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActive(layerButtons, button, 'is-active');
  });
});

function getCanvasPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function startDraw(event) {
  isDrawing = true;
  updateCanvasCursor();
  const { x, y } = getCanvasPosition(event);
  context.beginPath();
  context.moveTo(x, y);
  draw(event);
}

function endDraw() {
  isDrawing = false;
  context.beginPath();
  updateCanvasCursor();
}

function draw(event) {
  const { x, y } = getCanvasPosition(event);
  mouseCoords.textContent = `Mouse: x ${Math.round(x)}, y ${Math.round(y)}`;
  updateBrushPreview(event);

  if (!isDrawing) {
    return;
  }

  if (currentTool === 'eraser') {
    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.arc(x, y, currentSize / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  context.globalCompositeOperation = 'source-over';
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = '#2f2f2f';
  context.lineWidth = getToolStrokeSize();

  context.lineTo(x, y);
  context.stroke();
  context.beginPath();
  context.moveTo(x, y);
}

toolSize.addEventListener('input', () => {
  currentSize = Number(toolSize.value);
  toolSizeValue.textContent = String(currentSize);
});

canvas.addEventListener('pointerdown', startDraw);
canvas.addEventListener('pointermove', draw);
window.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointerleave', endDraw);
canvas.addEventListener('pointerleave', () => {
  mouseCoords.textContent = 'Mouse: x -, y -';
  hideBrushPreview();
});
canvas.addEventListener('pointerenter', (event) => {
  updateCanvasCursor();
  updateBrushPreview(event);
});

function openAboutModal() {
  aboutModal.hidden = false;
}

function closeAboutModal() {
  aboutModal.hidden = true;
}

aboutButton.addEventListener('click', openAboutModal);
aboutCloseButton.addEventListener('click', closeAboutModal);

aboutModal.addEventListener('click', (event) => {
  if (event.target === aboutModal) {
    closeAboutModal();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !aboutModal.hidden) {
    closeAboutModal();
  }
});

function clearCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

clearCanvas();
updateCanvasCursor();
