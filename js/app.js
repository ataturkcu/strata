const toolButtons = document.querySelectorAll('.tool-btn');
const layerButtons = document.querySelectorAll('.layer-btn');
const activeToolLabel = document.getElementById('activeToolLabel');
const mouseCoords = document.getElementById('mouseCoords');
const zoomStatus = document.getElementById('zoomStatus');
const terrainSizeStatus = document.getElementById('terrainSizeStatus');
const toolSize = document.getElementById('toolSize');
const toolSizeValue = document.getElementById('toolSizeValue');
const brushColorInput = document.getElementById('brushColor');
const brushOpacityInput = document.getElementById('brushOpacity');
const brushOpacityValue = document.getElementById('brushOpacityValue');
const swatchButtons = document.querySelectorAll('.swatch-btn');
const colorControls = document.getElementById('colorControls');
const optionsButton = document.getElementById('optionsButton');
const optionsModal = document.getElementById('optionsModal');
const optionsCloseButton = document.getElementById('optionsCloseButton');
const themeSelect = document.getElementById('themeSelect');
const historyStatesInput = document.getElementById('historyStatesInput');
const showSectionDividersInput = document.getElementById('showSectionDividersInput');
const showFineGridInput = document.getElementById('showFineGridInput');
const viewButton = document.getElementById('viewButton');
const terrainSizeModal = document.getElementById('terrainSizeModal');
const terrainSizeCloseButton = document.getElementById('terrainSizeCloseButton');
const terrainWidthInput = document.getElementById('terrainWidthInput');
const terrainHeightInput = document.getElementById('terrainHeightInput');
const terrainDividerInput = document.getElementById('terrainDividerInput');
const terrainSizeApplyButton = document.getElementById('terrainSizeApplyButton');
const shortcutsButton = document.getElementById('shortcutsButton');
const shortcutsModal = document.getElementById('shortcutsModal');
const shortcutsCloseButton = document.getElementById('shortcutsCloseButton');
const aboutButton = document.getElementById('aboutButton');
const aboutModal = document.getElementById('aboutModal');
const aboutCloseButton = document.getElementById('aboutCloseButton');
const canvasWrap = document.getElementById('canvasWrap');
const canvas = document.getElementById('mapCanvas');
const brushPreview = document.getElementById('brushPreview');
const context = canvas.getContext('2d');

let isDrawing = false;
let currentTool = 'brush';
let currentSize = Number(toolSize.value);
let currentColor = brushColorInput.value;
let currentOpacity = Number(brushOpacityInput.value) / 100;
let hasPendingStrokeChange = false;
let isShiftPressed = false;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartScrollLeft = 0;
let panStartScrollTop = 0;
let zoomLevel = 1;
let terrainDividerSize = 1000;
let showSectionDividers = true;
let showFineGrid = true;
let activePointerId = null;

const minZoom = 0.25;
const maxZoom = 4;
const zoomStepFactor = 1.1;

let maxHistoryStates = 20;
const undoStack = [];
const redoStack = [];

function clampHistoryStateCount(value) {
  return Math.min(200, Math.max(5, value));
}

function enforceHistoryLimit() {
  while (undoStack.length > maxHistoryStates) {
    undoStack.shift();
  }
}

function getCanvasSnapshot() {
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function restoreCanvasSnapshot(snapshot) {
  context.putImageData(snapshot, 0, 0);
}

function pushHistoryState() {
  undoStack.push(getCanvasSnapshot());
  enforceHistoryLimit();
}

function commitHistoryState() {
  pushHistoryState();
  redoStack.length = 0;
}

function undo() {
  if (undoStack.length <= 1) {
    return;
  }

  const current = undoStack.pop();
  redoStack.push(current);
  restoreCanvasSnapshot(undoStack[undoStack.length - 1]);
}

function redo() {
  if (redoStack.length === 0) {
    return;
  }

  const next = redoStack.pop();
  undoStack.push(next);
  restoreCanvasSnapshot(next);
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  if (themeSelect) {
    themeSelect.value = theme;
  }
}

function setHistoryStateCount(value) {
  maxHistoryStates = clampHistoryStateCount(value);
  historyStatesInput.value = String(maxHistoryStates);
  enforceHistoryLimit();
  localStorage.setItem('strata-history-states', String(maxHistoryStates));
}

function clampZoom(value) {
  return Math.min(maxZoom, Math.max(minZoom, value));
}

function updateCanvasDisplaySize() {
  canvas.style.width = `${canvas.width * zoomLevel}px`;
  canvas.style.height = `${canvas.height * zoomLevel}px`;
  const dividerDisplaySize = Math.max(8, Math.round(terrainDividerSize * zoomLevel));
  canvas.style.setProperty('--divider-size', `${dividerDisplaySize}px`);
}

function updateGridVisibility() {
  canvas.classList.toggle('hide-section-dividers', !showSectionDividers);
  canvas.classList.toggle('hide-fine-grid', !showFineGrid);
  showSectionDividersInput.checked = showSectionDividers;
  showFineGridInput.checked = showFineGrid;
}

function updateViewStatus() {
  zoomStatus.textContent = `Zoom: ${Math.round(zoomLevel * 100)}%`;
  terrainSizeStatus.textContent = `Terrain: ${canvas.width} x ${canvas.height}`;
}

function setZoom(nextZoom, anchorClientX, anchorClientY) {
  const clamped = clampZoom(nextZoom);
  if (clamped === zoomLevel) {
    return;
  }

  const wrapRect = canvasWrap.getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const safeRectWidth = rect.width || 1;
  const safeRectHeight = rect.height || 1;

  const pointerX = typeof anchorClientX === 'number' ? anchorClientX : wrapRect.left + wrapRect.width / 2;
  const pointerY = typeof anchorClientY === 'number' ? anchorClientY : wrapRect.top + wrapRect.height / 2;

  const canvasX = ((pointerX - rect.left) / safeRectWidth) * canvas.width;
  const canvasY = ((pointerY - rect.top) / safeRectHeight) * canvas.height;
  const pointerXInWrap = pointerX - wrapRect.left;
  const pointerYInWrap = pointerY - wrapRect.top;

  zoomLevel = clamped;
  updateCanvasDisplaySize();
  updateViewStatus();

  const newRect = canvas.getBoundingClientRect();
  const newCanvasX = (canvasX / canvas.width) * newRect.width;
  const newCanvasY = (canvasY / canvas.height) * newRect.height;

  canvasWrap.scrollLeft = canvas.offsetLeft + newCanvasX - pointerXInWrap;
  canvasWrap.scrollTop = canvas.offsetTop + newCanvasY - pointerYInWrap;
}

function releasePointerIfCaptured() {
  if (activePointerId === null) {
    return;
  }

  if (canvas.hasPointerCapture(activePointerId)) {
    canvas.releasePointerCapture(activePointerId);
  }
  activePointerId = null;
}

function createEmojiCursor(emoji, x = 6, y = 20) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text x="2" y="24" font-size="22">${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, auto`;
}

const pencilCursor = createEmojiCursor('✏️');
const eraserCursor = createEmojiCursor('🧽');

function isEraserTool(tool) {
  return tool === 'eraser';
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const parsed = Number.parseInt(normalized, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function syncSwatchSelection() {
  swatchButtons.forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.color?.toLowerCase() === currentColor.toLowerCase());
  });
}

function updateBrushAppearance() {
  brushColorInput.value = currentColor;
  brushOpacityValue.textContent = `${Math.round(currentOpacity * 100)}%`;
  const rgb = hexToRgb(currentColor);
  brushPreview.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`;
  brushPreview.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0.08, currentOpacity * 0.2)})`;
  syncSwatchSelection();
}

function updateCanvasCursor() {
  if (isPanning) {
    canvasWrap.classList.add('is-panning');
    canvasWrap.classList.remove('is-pan-ready');
    return;
  }

  if (isShiftPressed) {
    canvasWrap.classList.add('is-pan-ready');
    canvasWrap.classList.remove('is-panning');
    return;
  }

  canvasWrap.classList.remove('is-pan-ready');
  canvasWrap.classList.remove('is-panning');

  if (isEraserTool(currentTool)) {
    canvas.style.cursor = eraserCursor;
    return;
  }
  canvas.style.cursor = pencilCursor;
}

function isColorTool(tool) {
  return tool === 'brush' || tool === 'line' || tool === 'rectangle' || tool === 'fill' || tool === 'shape';
}

function updateColorControlsVisibility() {
  if (isColorTool(currentTool)) {
    colorControls.classList.remove('is-hidden');
    return;
  }
  colorControls.classList.add('is-hidden');
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
  if (isShiftPressed || isPanning) {
    hideBrushPreview();
    return;
  }

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
    updateColorControlsVisibility();
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
  if (isShiftPressed || isPanning) {
    return;
  }

  activePointerId = event.pointerId;
  canvas.setPointerCapture(activePointerId);
  isDrawing = true;
  hasPendingStrokeChange = false;
  updateCanvasCursor();
  const { x, y } = getCanvasPosition(event);
  context.beginPath();
  context.moveTo(x, y);
  draw(event);
}

function endDraw() {
  if (isDrawing && hasPendingStrokeChange) {
    commitHistoryState();
  }
  isDrawing = false;
  hasPendingStrokeChange = false;
  context.beginPath();
  releasePointerIfCaptured();
  updateCanvasCursor();
}

function startPan(event) {
  activePointerId = event.pointerId;
  canvas.setPointerCapture(activePointerId);
  isPanning = true;
  isDrawing = false;
  panStartX = event.clientX;
  panStartY = event.clientY;
  panStartScrollLeft = canvasWrap.scrollLeft;
  panStartScrollTop = canvasWrap.scrollTop;
  hideBrushPreview();
  updateCanvasCursor();
}

function pan(event) {
  const dx = event.clientX - panStartX;
  const dy = event.clientY - panStartY;
  canvasWrap.scrollLeft = panStartScrollLeft - dx;
  canvasWrap.scrollTop = panStartScrollTop - dy;
}

function stopPan() {
  isPanning = false;
  releasePointerIfCaptured();
  updateCanvasCursor();
}

function draw(event) {
  if (isPanning) {
    pan(event);
    return;
  }

  const { x, y } = getCanvasPosition(event);
  mouseCoords.textContent = `Mouse: x ${Math.round(x)}, y ${Math.round(y)}`;
  updateBrushPreview(event);

  if (!isDrawing) {
    return;
  }

  if (currentTool === 'eraser') {
    hasPendingStrokeChange = true;
    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.globalAlpha = 1;
    context.beginPath();
    context.arc(x, y, currentSize / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = currentOpacity;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = currentColor;
  context.lineWidth = getToolStrokeSize();
  hasPendingStrokeChange = true;

  context.lineTo(x, y);
  context.stroke();
  context.beginPath();
  context.moveTo(x, y);
}

toolSize.addEventListener('input', () => {
  currentSize = Number(toolSize.value);
  toolSizeValue.textContent = String(currentSize);
});

brushColorInput.addEventListener('input', () => {
  currentColor = brushColorInput.value;
  updateBrushAppearance();
  localStorage.setItem('strata-brush-color', currentColor);
});

brushOpacityInput.addEventListener('input', () => {
  currentOpacity = Number(brushOpacityInput.value) / 100;
  updateBrushAppearance();
  localStorage.setItem('strata-brush-opacity', String(Math.round(currentOpacity * 100)));
});

swatchButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentColor = button.dataset.color || currentColor;
    updateBrushAppearance();
    localStorage.setItem('strata-brush-color', currentColor);
  });
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.button === 0 && event.shiftKey) {
    startPan(event);
    return;
  }
  startDraw(event);
});
canvas.addEventListener('pointermove', draw);
window.addEventListener('pointerup', () => {
  if (isPanning) {
    stopPan();
    return;
  }
  endDraw();
});
canvas.addEventListener('pointerleave', endDraw);
canvas.addEventListener('pointerleave', () => {
  mouseCoords.textContent = 'Mouse: x -, y -';
  hideBrushPreview();
  if (isPanning) {
    stopPan();
  }
});
canvas.addEventListener('pointerenter', (event) => {
  updateCanvasCursor();
  updateBrushPreview(event);
});

canvasWrap.addEventListener('wheel', (event) => {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  event.preventDefault();
  const zoomFactor = event.deltaY < 0 ? zoomStepFactor : 1 / zoomStepFactor;
  setZoom(zoomLevel * zoomFactor, event.clientX, event.clientY);
}, { passive: false });

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

function openShortcutsModal() {
  shortcutsModal.hidden = false;
}

function closeShortcutsModal() {
  shortcutsModal.hidden = true;
}

shortcutsButton.addEventListener('click', openShortcutsModal);
shortcutsCloseButton.addEventListener('click', closeShortcutsModal);

shortcutsModal.addEventListener('click', (event) => {
  if (event.target === shortcutsModal) {
    closeShortcutsModal();
  }
});

function openOptionsModal() {
  optionsModal.hidden = false;
}

function closeOptionsModal() {
  optionsModal.hidden = true;
}

optionsButton.addEventListener('click', openOptionsModal);
optionsCloseButton.addEventListener('click', closeOptionsModal);

optionsModal.addEventListener('click', (event) => {
  if (event.target === optionsModal) {
    closeOptionsModal();
  }
});

themeSelect.addEventListener('change', () => {
  applyTheme(themeSelect.value);
  localStorage.setItem('strata-theme', themeSelect.value);
});

historyStatesInput.addEventListener('change', () => {
  const parsed = Number(historyStatesInput.value);
  if (Number.isNaN(parsed)) {
    historyStatesInput.value = String(maxHistoryStates);
    return;
  }
  setHistoryStateCount(parsed);
});

showSectionDividersInput.addEventListener('change', () => {
  showSectionDividers = showSectionDividersInput.checked;
  updateGridVisibility();
  localStorage.setItem('strata-show-section-dividers', showSectionDividers ? '1' : '0');
});

showFineGridInput.addEventListener('change', () => {
  showFineGrid = showFineGridInput.checked;
  updateGridVisibility();
  localStorage.setItem('strata-show-fine-grid', showFineGrid ? '1' : '0');
});

function clampTerrainSize(value) {
  return Math.min(8192, Math.max(64, value));
}

function clampTerrainDividerSize(value) {
  return Math.min(8192, Math.max(64, value));
}

function openTerrainSizeModal() {
  terrainWidthInput.value = String(canvas.width);
  terrainHeightInput.value = String(canvas.height);
  terrainDividerInput.value = String(terrainDividerSize);
  terrainSizeModal.hidden = false;
}

function closeTerrainSizeModal() {
  terrainSizeModal.hidden = true;
}

function applyTerrainSize() {
  const widthValue = Number(terrainWidthInput.value);
  const heightValue = Number(terrainHeightInput.value);
  const dividerValue = Number(terrainDividerInput.value);

  if (Number.isNaN(widthValue) || Number.isNaN(heightValue) || Number.isNaN(dividerValue)) {
    return;
  }

  const width = clampTerrainSize(widthValue);
  const height = clampTerrainSize(heightValue);
  const divider = clampTerrainDividerSize(dividerValue);
  terrainWidthInput.value = String(width);
  terrainHeightInput.value = String(height);
  terrainDividerInput.value = String(divider);
  terrainDividerSize = divider;

  canvas.width = width;
  canvas.height = height;
  updateCanvasDisplaySize();
  updateViewStatus();
  localStorage.setItem('strata-terrain-width', String(width));
  localStorage.setItem('strata-terrain-height', String(height));
  localStorage.setItem('strata-terrain-divider-size', String(divider));

  clearCanvas();
  undoStack.length = 0;
  redoStack.length = 0;
  pushHistoryState();
  closeTerrainSizeModal();
}

viewButton.addEventListener('click', openTerrainSizeModal);
terrainSizeCloseButton.addEventListener('click', closeTerrainSizeModal);
terrainSizeApplyButton.addEventListener('click', applyTerrainSize);

terrainSizeModal.addEventListener('click', (event) => {
  if (event.target === terrainSizeModal) {
    closeTerrainSizeModal();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') {
    isShiftPressed = true;
    updateCanvasCursor();
  }

  if (event.key === 'Escape' && !aboutModal.hidden) {
    closeAboutModal();
    return;
  }

  if (event.key === 'Escape' && !shortcutsModal.hidden) {
    closeShortcutsModal();
    return;
  }

  if (event.key === 'Escape' && !optionsModal.hidden) {
    closeOptionsModal();
    return;
  }

  if (event.key === 'Escape' && !terrainSizeModal.hidden) {
    closeTerrainSizeModal();
    return;
  }

  const isMacRedo = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z';
  const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z';
  const isRedo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y';

  if (isUndo) {
    event.preventDefault();
    undo();
    return;
  }

  if (isRedo || isMacRedo) {
    event.preventDefault();
    redo();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') {
    isShiftPressed = false;
    if (isPanning) {
      stopPan();
    }
    updateCanvasCursor();
  }
});

function clearCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

const savedTheme = localStorage.getItem('strata-theme') || 'dark';
applyTheme(savedTheme);

const savedTerrainWidth = Number(localStorage.getItem('strata-terrain-width') || String(canvas.width));
const savedTerrainHeight = Number(localStorage.getItem('strata-terrain-height') || String(canvas.height));
if (!Number.isNaN(savedTerrainWidth) && !Number.isNaN(savedTerrainHeight)) {
  canvas.width = clampTerrainSize(savedTerrainWidth);
  canvas.height = clampTerrainSize(savedTerrainHeight);
}

const savedTerrainDividerSize = Number(localStorage.getItem('strata-terrain-divider-size') || '1000');
if (!Number.isNaN(savedTerrainDividerSize)) {
  terrainDividerSize = clampTerrainDividerSize(savedTerrainDividerSize);
}

const savedShowSectionDividers = localStorage.getItem('strata-show-section-dividers');
if (savedShowSectionDividers !== null) {
  showSectionDividers = savedShowSectionDividers === '1';
}

const savedShowFineGrid = localStorage.getItem('strata-show-fine-grid');
if (savedShowFineGrid !== null) {
  showFineGrid = savedShowFineGrid === '1';
}

const savedBrushColor = localStorage.getItem('strata-brush-color');
if (savedBrushColor) {
  currentColor = savedBrushColor;
}

const savedBrushOpacity = Number(localStorage.getItem('strata-brush-opacity') || '100');
if (!Number.isNaN(savedBrushOpacity)) {
  currentOpacity = Math.min(1, Math.max(0.1, savedBrushOpacity / 100));
  brushOpacityInput.value = String(Math.round(currentOpacity * 100));
}

const savedHistoryStates = Number(localStorage.getItem('strata-history-states') || '20');
if (!Number.isNaN(savedHistoryStates)) {
  setHistoryStateCount(savedHistoryStates);
} else {
  historyStatesInput.value = String(maxHistoryStates);
}

clearCanvas();
updateCanvasDisplaySize();
updateGridVisibility();
updateViewStatus();
pushHistoryState();
updateBrushAppearance();
updateColorControlsVisibility();
updateCanvasCursor();
openTerrainSizeModal();
