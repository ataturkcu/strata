const toolButtons = document.querySelectorAll('.tool-btn');
const addLayerButton = document.getElementById('addLayerButton');
const layersList = document.getElementById('layersList');
const activeToolLabel = document.getElementById('activeToolLabel');
const mouseCoords = document.getElementById('mouseCoords');
const zoomStatus = document.getElementById('zoomStatus');
const terrainSizeStatus = document.getElementById('terrainSizeStatus');
const infoTitle = document.getElementById('infoTitle');
const infoDescription = document.getElementById('infoDescription');
const toolSize = document.getElementById('toolSize');
const toolSizeValue = document.getElementById('toolSizeValue');
const brushColorInput = document.getElementById('brushColor');
const brushOpacityInput = document.getElementById('brushOpacity');
const brushOpacityValue = document.getElementById('brushOpacityValue');
const cornerRadiusInput = document.getElementById('cornerRadiusInput');
const cornerRadiusValue = document.getElementById('cornerRadiusValue');
const lineStyleSelect = document.getElementById('lineStyleSelect');
const lineSpacingInput = document.getElementById('lineSpacingInput');
const lineSpacingValue = document.getElementById('lineSpacingValue');
const shapeTypeSelect = document.getElementById('shapeTypeSelect');
const shapeModeSelect = document.getElementById('shapeModeSelect');
const swatchButtons = document.querySelectorAll('.swatch-btn');
const colorControls = document.getElementById('colorControls');
const rectangleControls = document.getElementById('rectangleControls');
const lineControls = document.getElementById('lineControls');
const shapeControls = document.getElementById('shapeControls');
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
const renameLayerModal = document.getElementById('renameLayerModal');
const renameLayerCloseButton = document.getElementById('renameLayerCloseButton');
const renameLayerInput = document.getElementById('renameLayerInput');
const renameLayerApplyButton = document.getElementById('renameLayerApplyButton');
const shortcutsButton = document.getElementById('shortcutsButton');
const shortcutsModal = document.getElementById('shortcutsModal');
const shortcutsCloseButton = document.getElementById('shortcutsCloseButton');
const aboutButton = document.getElementById('aboutButton');
const aboutModal = document.getElementById('aboutModal');
const aboutCloseButton = document.getElementById('aboutCloseButton');
const canvasWrap = document.getElementById('canvasWrap');
const canvas = document.getElementById('mapCanvas');
const brushPreview = document.getElementById('brushPreview');
const displayContext = canvas.getContext('2d');

let isDrawing = false;
let currentTool = 'brush';
let currentSize = Number(toolSize.value);
let currentColor = brushColorInput.value;
let currentOpacity = Number(brushOpacityInput.value) / 100;
let currentCornerRadius = Number(cornerRadiusInput.value);
let currentLineStyle = lineStyleSelect.value;
let currentLineSpacing = Number(lineSpacingInput.value);
let currentShapeType = shapeTypeSelect.value;
let currentShapeMode = shapeModeSelect.value;
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
let rectangleStartX = 0;
let rectangleStartY = 0;
let rectangleSnapshot = null;
let lineStartX = 0;
let lineStartY = 0;
let lineSnapshot = null;
let shapeStartX = 0;
let shapeStartY = 0;
let shapeSnapshot = null;

const layers = [];
let activeLayerId = -1;
let context = null;
let draggingLayerId = null;
let renameLayerId = -1;

const minZoom = 0.25;
const maxZoom = 4;
const zoomStepFactor = 1.1;
const fillTolerance = 0; // it is for clearing the flood fill "bleeding" effect, but it is causing problems so it is set to 0 not work.
const maxLayerNameLength = 15;

let maxHistoryStates = 20;
const undoStack = [];
const redoStack = [];

function createLayer(name) {
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = canvas.width;
  layerCanvas.height = canvas.height;
  const finalName = String(name).slice(0, maxLayerNameLength);

  return {
    id: Date.now() + Math.random(),
    name: finalName,
    visible: true,
    canvas: layerCanvas,
    context: layerCanvas.getContext('2d'),
  };
}

function getActiveLayer() {
  const active = layers.find((layer) => layer.id === activeLayerId);
  return active || layers[0] || null;
}

function getDrawingContext() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) {
    return null;
  }
  return activeLayer.context;
}

function isProtectedLayer(layer) {
  return layer.name === 'Default' || layer.name === 'Legend';
}

function getToolInfo(tool) {
  if (tool === 'brush') {
    return {
      title: 'Brush',
      description: 'You can freely draw lines on your map with the brush.',
    };
  }
  if (tool === 'rectangle') {
    return {
      title: 'Rectangle',
      description: 'Draw a rectangle by dragging on the canvas. Radius controls corner roundness.',
    };
  }
  if (tool === 'line') {
    return {
      title: 'Line',
      description: 'Draw straight lines by dragging from start to end. Style and spacing affect the stroke.',
    };
  }
  if (tool === 'fill') {
    return {
      title: 'Fill / Bucket',
      description: 'Click an area to flood fill connected pixels with the current color.',
    };
  }
  if (tool === 'eraser') {
    return {
      title: 'Eraser',
      description: 'Erase painted parts on the active layer using the current size.',
    };
  }
  if (tool === 'shape') {
    return {
      title: 'Shape',
      description: 'Drag to place shapes like circles, polygons, stars, and arrows.',
    };
  }
  if (tool === 'height-brush') {
    return {
      title: 'Height Brush',
      description: 'Terrain tool mode selected. Height painting behavior can be expanded later.',
    };
  }
  if (tool === 'slope') {
    return {
      title: 'Slope',
      description: 'Terrain slope mode selected for shaping transitions.',
    };
  }
  if (tool === 'smooth') {
    return {
      title: 'Smooth',
      description: 'Terrain smooth mode selected for softening local changes.',
    };
  }
  if (tool === 'biome-paint') {
    return {
      title: 'Biome Paint',
      description: 'Terrain biome mode selected for painting biome regions.',
    };
  }
  return {
    title: 'Information',
    description: 'Select a tool or interact with layers to see context here.',
  };
}

function setInteractionInfo(title, description) {
  infoTitle.textContent = title;
  infoDescription.textContent = description;
}

function getLayerSelectionInfo(layer) {
  if (layer.name === 'Legend') {
    return {
      title: 'Legend Layer',
      description: 'Use this layer for symbols and markers shown on your map legend. This layer is protected and cannot be deleted.',
    };
  }

  if (layer.name === 'Default') {
    return {
      title: 'Default Layer',
      description: 'This is your default layer, useful for background/base drawing. This layer is protected and cannot be deleted.',
    };
  }

  return {
    title: 'Layer Selected',
    description: `${layer.name} is now the active layer for editing.`,
  };
}

function moveLayerToIndex(layerId, targetIndex) {
  const currentIndex = layers.findIndex((layer) => layer.id === layerId);
  if (currentIndex < 0) {
    return;
  }

  const movingLayerName = layers[currentIndex].name;

  const boundedTarget = Math.max(0, Math.min(layers.length - 1, targetIndex));
  if (currentIndex === boundedTarget) {
    return;
  }

  const movingLayer = layers[currentIndex];
  layers.splice(currentIndex, 1);

  let insertIndex = boundedTarget;
  if (currentIndex < boundedTarget) {
    insertIndex -= 1;
  }
  layers.splice(insertIndex, 0, movingLayer);

  renderLayersList();
  renderVisibleLayers();
  setInteractionInfo('Layer Moved', `${movingLayerName} moved to a different priority.`);
}

function moveLayerByPriority(layerId, direction) {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index < 0) {
    return;
  }

  const movingLayerName = layers[index].name;

  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= layers.length) {
    return;
  }

  const temp = layers[index];
  layers[index] = layers[nextIndex];
  layers[nextIndex] = temp;

  renderLayersList();
  renderVisibleLayers();
  setInteractionInfo('Layer Moved', `${movingLayerName} moved to a different priority.`);
}

function deleteLayer(layerId) {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index < 0) {
    return;
  }

  const layer = layers[index];
  if (isProtectedLayer(layer)) {
    return;
  }

  const removedLayerName = layer.name;

  const wasActive = activeLayerId === layerId;
  layers.splice(index, 1);

  if (wasActive) {
    const fallback = layers[Math.max(0, index - 1)] || layers[0] || null;
    activeLayerId = fallback ? fallback.id : -1;
    syncActiveContext();
    undoStack.length = 0;
    redoStack.length = 0;
    pushHistoryState();
  }

  renderLayersList();
  renderVisibleLayers();
  setInteractionInfo('Layer Deleted', `${removedLayerName} was removed from the layer list.`);
}

function renameLayer(layerId) {
  const layer = layers.find((entry) => entry.id === layerId);
  if (!layer) {
    return;
  }

  if (isProtectedLayer(layer)) {
    setInteractionInfo('Rename Blocked', `${layer.name} cannot be renamed.`);
    return;
  }

  renameLayerId = layer.id;
  renameLayerInput.value = layer.name;
  renameLayerModal.hidden = false;
  renameLayerInput.focus();
  renameLayerInput.select();
  setInteractionInfo('Rename Layer', `Editing name for ${layer.name}.`);
}

function closeRenameLayerModal() {
  renameLayerId = -1;
  renameLayerModal.hidden = true;
}

function applyRenameLayer() {
  if (renameLayerId < 0) {
    return;
  }

  const layer = layers.find((entry) => entry.id === renameLayerId);
  if (!layer || isProtectedLayer(layer)) {
    closeRenameLayerModal();
    return;
  }

  const previousName = layer.name;
  const trimmedName = renameLayerInput.value.trim().slice(0, maxLayerNameLength);
  if (!trimmedName || trimmedName === layer.name) {
    closeRenameLayerModal();
    return;
  }

  layer.name = trimmedName;
  closeRenameLayerModal();
  renderLayersList();
  setInteractionInfo('Layer Renamed', `${previousName} renamed to ${trimmedName}.`);
}

function syncActiveContext() {
  const drawContext = getDrawingContext();
  context = drawContext || displayContext;
}

function refreshLucideIcons() {
  if (!window.lucide || typeof window.lucide.createIcons !== 'function') {
    return;
  }
  window.lucide.createIcons();
}

function renderLayersList() {
  layersList.innerHTML = '';

  const visualLayers = [...layers].reverse();
  visualLayers.forEach((layer) => {
    const li = document.createElement('li');
    li.className = 'layer-row';
    li.draggable = true;

    li.addEventListener('dragstart', (event) => {
      draggingLayerId = layer.id;
      event.dataTransfer.effectAllowed = 'move';
      li.classList.add('is-dragging');
    });

    li.addEventListener('dragend', () => {
      draggingLayerId = null;
      li.classList.remove('is-dragging');
    });

    li.addEventListener('dragover', (event) => {
      event.preventDefault();
      li.classList.add('is-drop-target');
      event.dataTransfer.dropEffect = 'move';
    });

    li.addEventListener('dragleave', () => {
      li.classList.remove('is-drop-target');
    });

    li.addEventListener('drop', (event) => {
      event.preventDefault();
      li.classList.remove('is-drop-target');
      if (!draggingLayerId || draggingLayerId === layer.id) {
        return;
      }

      const targetIndex = layers.findIndex((l) => l.id === layer.id);
      const placeAboveVisual = event.offsetY < li.clientHeight / 2;
      const insertIndex = placeAboveVisual ? targetIndex + 1 : targetIndex;
      moveLayerToIndex(draggingLayerId, insertIndex);
    });

    const eyeButton = document.createElement('button');
    eyeButton.type = 'button';
    eyeButton.className = 'layer-eye-btn';
    eyeButton.setAttribute('aria-label', layer.visible ? 'Hide layer' : 'Show layer');
    eyeButton.innerHTML = `<i data-lucide="${layer.visible ? 'eye' : 'eye-off'}"></i>`;
    eyeButton.addEventListener('click', () => {
      layer.visible = !layer.visible;
      renderLayersList();
      renderVisibleLayers();
      setInteractionInfo('Layer Visibility', `${layer.name} is now ${layer.visible ? 'visible' : 'hidden'}.`);
    });

    const layerButton = document.createElement('button');
    layerButton.type = 'button';
    layerButton.className = `layer-btn${layer.id === activeLayerId ? ' is-active' : ''}`;
    layerButton.innerHTML = `<span class="tool-icon" aria-hidden="true"><i data-lucide="layers"></i></span><span class="layer-label">${layer.name}</span>`;
    layerButton.addEventListener('click', () => {
      if (activeLayerId === layer.id) {
        return;
      }

      activeLayerId = layer.id;
      syncActiveContext();
      undoStack.length = 0;
      redoStack.length = 0;
      pushHistoryState();
      const layerButtons = layersList.querySelectorAll('.layer-btn');
      layerButtons.forEach((button) => button.classList.remove('is-active'));
      layerButton.classList.add('is-active');
      const layerInfo = getLayerSelectionInfo(layer);
      setInteractionInfo(layerInfo.title, layerInfo.description);
    });
    layerButton.addEventListener('dblclick', () => {
      renameLayer(layer.id);
    });

    li.appendChild(eyeButton);
    li.appendChild(layerButton);

    const actions = document.createElement('div');
    actions.className = 'layer-actions';

    const upButton = document.createElement('button');
    upButton.type = 'button';
    upButton.className = 'layer-action-btn';
    upButton.textContent = '▲';
    upButton.setAttribute('aria-label', 'Move layer up');
    upButton.addEventListener('click', () => {
      moveLayerByPriority(layer.id, 1);
    });

    const downButton = document.createElement('button');
    downButton.type = 'button';
    downButton.className = 'layer-action-btn';
    downButton.textContent = '▼';
    downButton.setAttribute('aria-label', 'Move layer down');
    downButton.addEventListener('click', () => {
      moveLayerByPriority(layer.id, -1);
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'layer-action-btn';
    deleteButton.textContent = 'Del';
    deleteButton.setAttribute('aria-label', 'Delete layer');
    deleteButton.disabled = isProtectedLayer(layer);
    deleteButton.addEventListener('click', () => {
      deleteLayer(layer.id);
    });

    actions.appendChild(upButton);
    actions.appendChild(downButton);
    actions.appendChild(deleteButton);
    li.appendChild(actions);

    layersList.appendChild(li);
  });

  refreshLucideIcons();
}

function renderVisibleLayers() {
  displayContext.clearRect(0, 0, canvas.width, canvas.height);
  layers.forEach((layer) => {
    if (layer.visible) {
      displayContext.drawImage(layer.canvas, 0, 0);
    }
  });
}

function addLayer(name) {
  const layer = createLayer(name);
  layers.push(layer);
  activeLayerId = layer.id;
  syncActiveContext();
  undoStack.length = 0;
  redoStack.length = 0;
  pushHistoryState();
  renderLayersList();
  renderVisibleLayers();
  setInteractionInfo('Layer Added', `${layer.name} was created and selected.`);
}

function initializeLayers() {
  layers.length = 0;
  layers.push(createLayer('Default'));
  layers.push(createLayer('Legend'));
  activeLayerId = layers[0].id;
  syncActiveContext();
  renderLayersList();
  renderVisibleLayers();
  const initialToolInfo = getToolInfo('brush');
  setInteractionInfo(initialToolInfo.title, initialToolInfo.description);
}

function clampHistoryStateCount(value) {
  return Math.min(200, Math.max(5, value));
}

function enforceHistoryLimit() {
  while (undoStack.length > maxHistoryStates) {
    undoStack.shift();
  }
}

function getCanvasSnapshot() {
  const drawContext = getDrawingContext();
  if (!drawContext) {
    return null;
  }
  return drawContext.getImageData(0, 0, canvas.width, canvas.height);
}

function restoreCanvasSnapshot(snapshot) {
  const drawContext = getDrawingContext();
  if (!drawContext || !snapshot) {
    return;
  }
  drawContext.putImageData(snapshot, 0, 0);
}

function pushHistoryState() {
  const snapshot = getCanvasSnapshot();
  if (!snapshot) {
    return;
  }
  undoStack.push(snapshot);
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
  renderVisibleLayers();
}

function redo() {
  if (redoStack.length === 0) {
    return;
  }

  const next = redoStack.pop();
  undoStack.push(next);
  restoreCanvasSnapshot(next);
  renderVisibleLayers();
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

function getEffectiveFillTolerance() {
  return fillTolerance;
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
const bucketCursor = createEmojiCursor('🪣');

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

function hexToFillColor(hex, opacity) {
  const rgb = hexToRgb(hex);
  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    a: Math.round(opacity * 255),
  };
}

function colorsMatch(data, index, target, tolerance) {
  if (tolerance <= 0) {
    return (
      data[index] === target.r &&
      data[index + 1] === target.g &&
      data[index + 2] === target.b &&
      data[index + 3] === target.a
    );
  }

  const dr = Math.abs(data[index] - target.r);
  const dg = Math.abs(data[index + 1] - target.g);
  const db = Math.abs(data[index + 2] - target.b);
  const da = Math.abs(data[index + 3] - target.a);
  const rgbDistance = dr + dg + db;
  const alphaAllowance = Math.max(16, tolerance * 2);

  return (
    rgbDistance <= tolerance * 3 &&
    da <= alphaAllowance
  );
}

function setPixelColor(data, index, color) {
  data[index] = color.r;
  data[index + 1] = color.g;
  data[index + 2] = color.b;
  data[index + 3] = color.a;
}

function applyFillAt(x, y) {
  const width = canvas.width;
  const height = canvas.height;

  if (x < 0 || y < 0 || x >= width || y >= height) {
    return false;
  }

  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const startIndex = (y * width + x) * 4;

  const target = {
    r: data[startIndex],
    g: data[startIndex + 1],
    b: data[startIndex + 2],
    a: data[startIndex + 3],
  };

  const fill = hexToFillColor(currentColor, currentOpacity);
  if (
    target.r === fill.r &&
    target.g === fill.g &&
    target.b === fill.b &&
    target.a === fill.a
  ) {
    return false;
  }

  const start = y * width + x;
  const stack = [start];
  const visited = new Uint8Array(width * height);
  const tolerance = getEffectiveFillTolerance();

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }

    if (visited[current] === 1) {
      continue;
    }
    visited[current] = 1;

    const px = current % width;
    const py = (current - px) / width;

    const index = current * 4;
    if (!colorsMatch(data, index, target, tolerance)) {
      continue;
    }

    setPixelColor(data, index, fill);

    if (px > 0) {
      stack.push(current - 1);
    }
    if (px < width - 1) {
      stack.push(current + 1);
    }
    if (py > 0) {
      stack.push(current - width);
    }
    if (py < height - 1) {
      stack.push(current + width);
    }
  }

  context.putImageData(imageData, 0, 0);
  renderVisibleLayers();
  return true;
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
  if (currentTool === 'fill') {
    canvas.style.cursor = bucketCursor;
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

function updateRectangleControlsVisibility() {
  rectangleControls.classList.toggle('is-hidden', currentTool !== 'rectangle');
}

function updateLineControlsVisibility() {
  lineControls.classList.toggle('is-hidden', currentTool !== 'line');
}

function updateShapeControlsVisibility() {
  shapeControls.classList.toggle('is-hidden', currentTool !== 'shape');
}

function drawRegularPolygon(cx, cy, radius, sides, rotation) {
  context.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i * Math.PI * 2) / sides;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }
  context.closePath();
}

function drawStar(cx, cy, outerRadius, innerRadius, points, rotation) {
  context.beginPath();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation + i * step;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }
  context.closePath();
}

function getLineDashPattern(style, spacing) {
  const gap = Math.max(2, spacing);
  if (style === 'dashed') {
    return [Math.max(8, gap * 1.6), gap];
  }
  if (style === 'dotted') {
    return [2, gap];
  }
  return [];
}

function drawRoundedRect(x, y, width, height, radius) {
  const maxRadius = Math.min(width / 2, height / 2);
  const r = Math.max(0, Math.min(radius, maxRadius));

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function buildShapePath(type, left, top, width, height) {
  const cx = left + width / 2;
  const cy = top + height / 2;

  context.beginPath();

  if (type === 'square') {
    const side = Math.min(width, height);
    const x = cx - side / 2;
    const y = cy - side / 2;
    context.rect(x, y, side, side);
    context.closePath();
    return;
  }

  if (type === 'triangle') {
    context.moveTo(cx, top);
    context.lineTo(left + width, top + height);
    context.lineTo(left, top + height);
    context.closePath();
    return;
  }

  if (type === 'pentagon') {
    drawRegularPolygon(cx, cy, Math.min(width, height) / 2, 5, -Math.PI / 2);
    return;
  }

  if (type === 'hexagon') {
    drawRegularPolygon(cx, cy, Math.min(width, height) / 2, 6, Math.PI / 6);
    return;
  }

  if (type === 'star') {
    const outerRadius = Math.min(width, height) / 2;
    const innerRadius = outerRadius * 0.45;
    drawStar(cx, cy, outerRadius, innerRadius, 5, -Math.PI / 2);
    return;
  }

  if (type === 'arrow') {
    const right = left + width;
    const bottom = top + height;
    const headW = width * 0.35;
    const bodyW = width - headW;
    const bodyHalfH = height * 0.22;

    context.moveTo(left, cy - bodyHalfH);
    context.lineTo(left + bodyW, cy - bodyHalfH);
    context.lineTo(left + bodyW, top);
    context.lineTo(right, cy);
    context.lineTo(left + bodyW, bottom);
    context.lineTo(left + bodyW, cy + bodyHalfH);
    context.lineTo(left, cy + bodyHalfH);
    context.closePath();
    return;
  }

  if (type === 'diamond') {
    context.moveTo(cx, top);
    context.lineTo(left + width, cy);
    context.lineTo(cx, top + height);
    context.lineTo(left, cy);
    context.closePath();
    return;
  }

  if (type === 'ellipse') {
    context.ellipse(cx, cy, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.closePath();
    return;
  }

  const radius = Math.min(width, height) / 2;
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.closePath();
}

function getToolStrokeSize() {
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
    updateRectangleControlsVisibility();
    updateLineControlsVisibility();
    updateShapeControlsVisibility();
    updateCanvasCursor();
    const toolInfo = getToolInfo(tool);
    setInteractionInfo(toolInfo.title, toolInfo.description);
  });
});

addLayerButton.addEventListener('click', () => {
  const userLayers = Math.max(0, layers.length - 2);
  addLayer(`Layer ${userLayers + 1}`);
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

  if (currentTool === 'rectangle') {
    rectangleStartX = x;
    rectangleStartY = y;
    rectangleSnapshot = getCanvasSnapshot();
    return;
  }

  if (currentTool === 'line') {
    lineStartX = x;
    lineStartY = y;
    lineSnapshot = getCanvasSnapshot();
    return;
  }

  if (currentTool === 'shape') {
    shapeStartX = x;
    shapeStartY = y;
    shapeSnapshot = getCanvasSnapshot();
    return;
  }

  if (currentTool === 'fill') {
    const pixelX = Math.floor(x);
    const pixelY = Math.floor(y);
    const changed = applyFillAt(pixelX, pixelY);
    if (changed) {
      commitHistoryState();
    }
    isDrawing = false;
    releasePointerIfCaptured();
    return;
  }

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
  rectangleSnapshot = null;
  lineSnapshot = null;
  shapeSnapshot = null;
  context.beginPath();
  context.setLineDash([]);
  renderVisibleLayers();
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

  if (currentTool === 'rectangle') {
    if (!rectangleSnapshot) {
      return;
    }

    restoreCanvasSnapshot(rectangleSnapshot);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = currentOpacity;
    context.strokeStyle = currentColor;
    context.lineWidth = Math.max(1, currentSize);

    const left = Math.min(rectangleStartX, x);
    const top = Math.min(rectangleStartY, y);
    const width = Math.abs(x - rectangleStartX);
    const height = Math.abs(y - rectangleStartY);

    if (currentCornerRadius > 0) {
      drawRoundedRect(left, top, width, height, currentCornerRadius);
      context.stroke();
    } else {
      context.strokeRect(left, top, width, height);
    }
    renderVisibleLayers();
    hasPendingStrokeChange = width > 0 || height > 0;
    return;
  }

  if (currentTool === 'line') {
    if (!lineSnapshot) {
      return;
    }

    restoreCanvasSnapshot(lineSnapshot);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = currentOpacity;
    context.strokeStyle = currentColor;
    context.lineWidth = Math.max(1, currentSize);
    context.lineJoin = 'round';
    context.lineCap = currentLineStyle === 'dotted' ? 'round' : 'butt';
    context.setLineDash(getLineDashPattern(currentLineStyle, currentLineSpacing));

    context.beginPath();
    context.moveTo(lineStartX, lineStartY);
    context.lineTo(x, y);
    context.stroke();
    context.setLineDash([]);
    renderVisibleLayers();

    hasPendingStrokeChange = x !== lineStartX || y !== lineStartY;
    return;
  }

  if (currentTool === 'shape') {
    if (!shapeSnapshot) {
      return;
    }

    restoreCanvasSnapshot(shapeSnapshot);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = currentOpacity;
    context.strokeStyle = currentColor;
    context.fillStyle = currentColor;
    context.lineWidth = Math.max(1, currentSize);
    context.lineJoin = 'round';

    const left = Math.min(shapeStartX, x);
    const top = Math.min(shapeStartY, y);
    const width = Math.abs(x - shapeStartX);
    const height = Math.abs(y - shapeStartY);

    if (width <= 0 || height <= 0) {
      hasPendingStrokeChange = false;
      return;
    }

    buildShapePath(currentShapeType, left, top, width, height);
    if (currentShapeMode === 'fill') {
      context.fill();
    } else {
      context.stroke();
    }

    renderVisibleLayers();

    hasPendingStrokeChange = true;
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
    renderVisibleLayers();
    return;
  }

  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = currentOpacity;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.setLineDash([]);
  context.strokeStyle = currentColor;
  context.lineWidth = getToolStrokeSize();
  hasPendingStrokeChange = true;

  context.lineTo(x, y);
  context.stroke();
  context.beginPath();
  context.moveTo(x, y);
  renderVisibleLayers();
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

cornerRadiusInput.addEventListener('input', () => {
  currentCornerRadius = Number(cornerRadiusInput.value);
  cornerRadiusValue.textContent = String(currentCornerRadius);
  localStorage.setItem('strata-corner-radius', String(currentCornerRadius));
});

lineStyleSelect.addEventListener('change', () => {
  currentLineStyle = lineStyleSelect.value;
  localStorage.setItem('strata-line-style', currentLineStyle);
});

lineSpacingInput.addEventListener('input', () => {
  currentLineSpacing = Number(lineSpacingInput.value);
  lineSpacingValue.textContent = String(currentLineSpacing);
  localStorage.setItem('strata-line-spacing', String(currentLineSpacing));
});

shapeTypeSelect.addEventListener('change', () => {
  currentShapeType = shapeTypeSelect.value;
  localStorage.setItem('strata-shape-type', currentShapeType);
});

shapeModeSelect.addEventListener('change', () => {
  currentShapeMode = shapeModeSelect.value;
  localStorage.setItem('strata-shape-mode', currentShapeMode);
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
  layers.forEach((layer) => {
    layer.canvas.width = width;
    layer.canvas.height = height;
    layer.context = layer.canvas.getContext('2d');
  });
  syncActiveContext();
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

renameLayerCloseButton.addEventListener('click', closeRenameLayerModal);
renameLayerApplyButton.addEventListener('click', applyRenameLayer);

renameLayerModal.addEventListener('click', (event) => {
  if (event.target === renameLayerModal) {
    closeRenameLayerModal();
  }
});

renameLayerInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    applyRenameLayer();
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

  if (event.key === 'Escape' && !renameLayerModal.hidden) {
    closeRenameLayerModal();
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
  layers.forEach((layer) => {
    layer.context.clearRect(0, 0, canvas.width, canvas.height);
  });
  renderVisibleLayers();
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

const savedCornerRadius = Number(localStorage.getItem('strata-corner-radius') || '0');
if (!Number.isNaN(savedCornerRadius)) {
  currentCornerRadius = Math.max(0, Math.min(256, savedCornerRadius));
  cornerRadiusInput.value = String(currentCornerRadius);
}

const savedLineStyle = localStorage.getItem('strata-line-style');
if (savedLineStyle === 'solid' || savedLineStyle === 'dashed' || savedLineStyle === 'dotted') {
  currentLineStyle = savedLineStyle;
  lineStyleSelect.value = savedLineStyle;
}

const savedLineSpacing = Number(localStorage.getItem('strata-line-spacing') || '10');
if (!Number.isNaN(savedLineSpacing)) {
  currentLineSpacing = Math.max(2, Math.min(64, savedLineSpacing));
  lineSpacingInput.value = String(currentLineSpacing);
}

const savedShapeType = localStorage.getItem('strata-shape-type');
if (
  savedShapeType === 'circle' ||
  savedShapeType === 'ellipse' ||
  savedShapeType === 'triangle' ||
  savedShapeType === 'diamond' ||
  savedShapeType === 'square' ||
  savedShapeType === 'pentagon' ||
  savedShapeType === 'hexagon' ||
  savedShapeType === 'star' ||
  savedShapeType === 'arrow'
) {
  currentShapeType = savedShapeType;
  shapeTypeSelect.value = savedShapeType;
}

const savedShapeMode = localStorage.getItem('strata-shape-mode');
if (savedShapeMode === 'stroke' || savedShapeMode === 'fill') {
  currentShapeMode = savedShapeMode;
  shapeModeSelect.value = savedShapeMode;
}

const savedHistoryStates = Number(localStorage.getItem('strata-history-states') || '20');
if (!Number.isNaN(savedHistoryStates)) {
  setHistoryStateCount(savedHistoryStates);
} else {
  historyStatesInput.value = String(maxHistoryStates);
}

clearCanvas();
initializeLayers();
updateCanvasDisplaySize();
updateGridVisibility();
updateViewStatus();
pushHistoryState();
updateBrushAppearance();
updateColorControlsVisibility();
updateRectangleControlsVisibility();
updateLineControlsVisibility();
updateShapeControlsVisibility();
cornerRadiusValue.textContent = String(currentCornerRadius);
lineSpacingValue.textContent = String(currentLineSpacing);
updateCanvasCursor();
refreshLucideIcons();
openTerrainSizeModal();
