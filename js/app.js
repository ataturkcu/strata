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
const context = canvas.getContext('2d');

let isDrawing = false;
let currentTool = 'brush';
let currentSize = Number(toolSize.value);

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
      return;
    }
    if (tool === 'shape') {
      toolOptionHint.textContent = 'Tool options: shape variants coming later';
      return;
    }
    toolOptionHint.textContent = 'Tool options: coming later';
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
  const { x, y } = getCanvasPosition(event);
  context.beginPath();
  context.moveTo(x, y);
  draw(event);
}

function endDraw() {
  isDrawing = false;
  context.beginPath();
}

function draw(event) {
  const { x, y } = getCanvasPosition(event);
  mouseCoords.textContent = `Mouse: x ${Math.round(x)}, y ${Math.round(y)}`;

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
  context.lineWidth = currentTool === 'line' ? Math.max(1, currentSize / 2) : currentSize;

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
