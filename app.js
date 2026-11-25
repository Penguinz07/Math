const shapeSelect = document.querySelector("#shape-select");
const unitSelect = document.querySelector("#unit-select");
const dimensionFields = document.querySelector("#dimension-fields");
const rightTriangleOption = document.querySelector("#right-triangle-option");
const rightTriangleToggle = document.querySelector("#right-triangle-toggle");
const calculatorForm = document.querySelector("#calculator-form");
const errorMessage = document.querySelector("#error-message");
const resultPanel = document.querySelector("#results");
const areaResult = document.querySelector("#area-result");
const perimeterResult = document.querySelector("#perimeter-result");
const perimeterLabel = document.querySelector("#perimeter-label");
const diagramTitle = document.querySelector("#diagram-title");
const diagramSubtitle = document.querySelector("#diagram-subtitle");
const unitChip = document.querySelector("#unit-chip");
const heightCaption = document.querySelector("#height-caption");
const svg = document.querySelector("#shape-drawing");

const svgNamespace = "http://www.w3.org/2000/svg";
const canvas = { width: 640, height: 480 };

const shapeFields = {
  square: [{ key: "side", label: "Side length", placeholder: "e.g. 5" }],
  rectangle: [
    { key: "width", label: "Width", placeholder: "e.g. 6" },
    { key: "height", label: "Height", placeholder: "e.g. 4" },
  ],
  circle: [{ key: "radius", label: "Radius", placeholder: "e.g. 3" }],
  triangle: [
    { key: "side-a", label: "Side AB", placeholder: "e.g. 3" },
    { key: "side-b", label: "Side BC", placeholder: "e.g. 4" },
    { key: "side-c", label: "Side CA", placeholder: "e.g. 5" },
  ],
};

const rightTriangleFields = [
  { key: "leg-a", label: "Leg 1", placeholder: "e.g. 3" },
  { key: "leg-b", label: "Leg 2", placeholder: "e.g. 4" },
];

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

function createField({ key, label, placeholder }) {
  const field = document.createElement("label");
  field.className = "dimension-field";
  field.htmlFor = `dimension-${key}`;

  const fieldLabel = document.createElement("span");
  fieldLabel.textContent = label;

  const input = document.createElement("input");
  input.id = `dimension-${key}`;
  input.name = key;
  input.type = "number";
  input.min = "0";
  input.step = "any";
  input.required = true;
  input.placeholder = placeholder;
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.setAttribute("aria-describedby", "error-message");

  field.append(fieldLabel, input);
  return field;
}

function showEmptyDrawing() {
  svg.replaceChildren();
  svg.append(
    svgElement("rect", {
      class: "drawing-background",
      width: canvas.width,
      height: canvas.height,
    }),
    svgElement(
      "text",
      {
        class: "empty-message",
        x: canvas.width / 2,
        y: canvas.height / 2,
      },
      "Your drawing will appear here",
    ),
  );
  svg.setAttribute("aria-label", "Shape drawing preview");
}

function updateShapeFields() {
  const shape = shapeSelect.value;
  rightTriangleOption.hidden = shape !== "triangle";
  const fields = shape === "triangle" && rightTriangleToggle.checked
    ? rightTriangleFields
    : shapeFields[shape];
  dimensionFields.replaceChildren(...fields.map(createField));
  errorMessage.hidden = true;
  resultPanel.hidden = true;
  heightCaption.hidden = true;
  diagramTitle.textContent = "Ready to sketch";
  diagramSubtitle.textContent = "Enter measurements to get started.";
  showEmptyDrawing();
}

function readDimensions() {
  const values = {};
  const fields = shapeSelect.value === "triangle" && rightTriangleToggle.checked
    ? rightTriangleFields
    : shapeFields[shapeSelect.value];
  for (const field of fields) {
    const input = document.querySelector(`#dimension-${field.key}`);
    const rawValue = input.value.trim();
    const value = Number(rawValue);

    if (rawValue === "" || !Number.isFinite(value) || value <= 0) {
      input.focus();
      throw new Error(`${field.label} must be a number greater than zero.`);
    }

    values[field.key] = value;
  }
  return values;
}

function isRightTriangle(sideA, sideB, sideC) {
  const [legA, legB, hypotenuse] = [sideA, sideB, sideC].sort((a, b) => a - b);
  const legsSquared = legA * legA + legB * legB;
  const hypotenuseSquared = hypotenuse * hypotenuse;
  const tolerance = Math.max(legsSquared, hypotenuseSquared) * 1e-9;
  return Math.abs(legsSquared - hypotenuseSquared) <= tolerance;
}

function calculateShape(shape, values, rightTriangleMode = false) {
  if (shape === "square") {
    const side = values.side;
    return {
      vertices: [
        { x: 0, y: 0 },
        { x: side, y: 0 },
        { x: side, y: side },
        { x: 0, y: side },
      ],
      sides: [
        { name: "AB", length: side },
        { name: "BC", length: side },
        { name: "CD", length: side },
        { name: "DA", length: side },
      ],
      area: side * side,
      perimeter: 4 * side,
    };
  }

  if (shape === "rectangle") {
    const { width, height } = values;
    return {
      vertices: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ],
      sides: [
        { name: "AB", length: width },
        { name: "BC", length: height },
        { name: "CD", length: width },
        { name: "DA", length: height },
      ],
      area: width * height,
      perimeter: 2 * (width + height),
    };
  }

  if (shape === "circle") {
    const radius = values.radius;
    return {
      radius,
      area: Math.PI * radius * radius,
      perimeter: 2 * Math.PI * radius,
    };
  }

  if (rightTriangleMode) {
    const legA = values["leg-a"];
    const legB = values["leg-b"];
    const hypotenuse = Math.hypot(legA, legB);
    const x = (hypotenuse * hypotenuse + legA * legA - legB * legB) / (2 * hypotenuse);
    const height = Math.sqrt(Math.max(0, legA * legA - x * x));

    return {
      vertices: [
        { x: 0, y: 0 },
        { x: hypotenuse, y: 0 },
        { x, y: height },
      ],
      sides: [
        { name: "AB (hyp.)", length: hypotenuse },
        { name: "BC", length: legB },
        { name: "CA", length: legA },
      ],
      height,
      hypotenuse,
      isRightTriangle: true,
      area: (hypotenuse * height) / 2,
      perimeter: hypotenuse + legA + legB,
    };
  }

  const sideA = values["side-a"];
  const sideB = values["side-b"];
  const sideC = values["side-c"];
  const longestSide = Math.max(sideA, sideB, sideC);
  const otherSides = sideA + sideB + sideC - longestSide;

  if (longestSide >= otherSides) {
    throw new Error("Those side lengths cannot form a triangle. Try again.");
  }

  const x = (sideA * sideA + sideC * sideC - sideB * sideB) / (2 * sideA);
  const height = Math.sqrt(Math.max(0, sideC * sideC - x * x));
  const area = (sideA * height) / 2;
  const rightTriangle = isRightTriangle(sideA, sideB, sideC);
  const hypotenuse = rightTriangle ? Math.max(sideA, sideB, sideC) : undefined;

  return {
    vertices: [
      { x: 0, y: 0 },
      { x: sideA, y: 0 },
      { x, y: height },
    ],
    sides: [
      { name: sideA === hypotenuse ? "AB (hyp.)" : "AB", length: sideA },
      { name: sideB === hypotenuse ? "BC (hyp.)" : "BC", length: sideB },
      { name: sideC === hypotenuse ? "CA (hyp.)" : "CA", length: sideC },
    ],
    height,
    hypotenuse,
    isRightTriangle: rightTriangle,
    area,
    perimeter: sideA + sideB + sideC,
  };
}

function svgElement(name, attributes = {}, text = "") {
  const element = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function formatNumber(value) {
  return numberFormatter.format(value);
}

function addAccessibleSvgText(title, description) {
  const titleId = "shape-svg-title";
  const descriptionId = "shape-svg-description";
  svg.append(
    svgElement("title", { id: titleId }, title),
    svgElement("desc", { id: descriptionId }, description),
  );
  svg.setAttribute("aria-labelledby", `${titleId} ${descriptionId}`);
}

function getScreenTransform(vertices) {
  const xs = vertices.map((point) => point.x);
  const ys = vertices.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const padding = 88;
  const scale = Math.min(
    (canvas.width - padding * 2) / spanX,
    (canvas.height - padding * 2) / spanY,
  );
  const drawingWidth = spanX * scale;
  const drawingHeight = spanY * scale;
  const left = (canvas.width - drawingWidth) / 2;
  const top = (canvas.height - drawingHeight) / 2;

  return (point) => ({
    x: left + (point.x - minX) * scale,
    y: canvas.height - top - (point.y - minY) * scale,
  });
}

function addSideLabels(screenVertices, sides, unit) {
  const center = screenVertices.reduce(
    (sum, point) => ({ x: sum.x + point.x / screenVertices.length, y: sum.y + point.y / screenVertices.length }),
    { x: 0, y: 0 },
  );

  sides.forEach((side, index) => {
    const start = screenVertices[index];
    const end = screenVertices[(index + 1) % screenVertices.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    let normalX = -dy / length;
    let normalY = dx / length;
    const midpointX = (start.x + end.x) / 2;
    const midpointY = (start.y + end.y) / 2;

    if ((midpointX - center.x) * normalX + (midpointY - center.y) * normalY < 0) {
      normalX *= -1;
      normalY *= -1;
    }

    const label = svgElement(
      "text",
      {
        class: "side-label",
        x: midpointX + normalX * 22,
        y: midpointY + normalY * 22,
      },
      `${side.name} = ${formatNumber(side.length)} ${unit}`,
    );
    svg.append(label);
  });
}

function drawPolygon(shape, result, unit) {
  const toScreen = getScreenTransform(result.vertices);
  const points = result.vertices.map(toScreen);
  const pointList = points.map((point) => `${point.x},${point.y}`).join(" ");

  svg.append(
    svgElement("polygon", {
      class: "shape-polygon",
      points: pointList,
    }),
  );

  points.forEach((point, index) => {
    svg.append(
      svgElement("circle", {
        class: "vertex-dot",
        cx: point.x,
        cy: point.y,
        r: 4,
      }),
      svgElement(
        "text",
        {
          class: "vertex-label",
          x: point.x + (index === 0 ? -12 : 10),
          y: point.y - 10,
        },
        String.fromCharCode(65 + index),
      ),
    );
  });

  addSideLabels(points, result.sides, unit);

  if (shape === "triangle") {
    const apex = result.vertices[2];
    const foot = { x: apex.x, y: 0 };
    const screenApex = toScreen(apex);
    const screenFoot = toScreen(foot);
    svg.append(
      svgElement("line", {
        class: "height-line",
        x1: screenApex.x,
        y1: screenApex.y,
        x2: screenFoot.x,
        y2: screenFoot.y,
      }),
      svgElement(
        "text",
        {
          class: "height-label",
          x: screenFoot.x + 10,
          y: (screenApex.y + screenFoot.y) / 2,
        },
        `h = ${formatNumber(result.height)} ${unit}`,
      ),
    );
  }
}

function drawCircle(result, unit) {
  const padding = 88;
  const radius = Math.min(canvas.width, canvas.height) / 2 - padding;
  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const scale = radius / result.radius;

  svg.append(
    svgElement("circle", {
      class: "shape-circle",
      cx: center.x,
      cy: center.y,
      r: radius,
    }),
    svgElement("line", {
      class: "radius-line",
      x1: center.x,
      y1: center.y,
      x2: center.x + radius,
      y2: center.y,
    }),
    svgElement(
      "text",
      {
        class: "radius-label",
        x: center.x + (radius * 0.55),
        y: center.y + 21,
      },
      `r = ${formatNumber(result.radius)} ${unit}`,
    ),
  );
}

function renderDrawing(shape, result, unit) {
  svg.replaceChildren(
    svgElement("rect", {
      class: "drawing-background",
      width: canvas.width,
      height: canvas.height,
    }),
  );

  const shapeName = shape === "triangle" && result.isRightTriangle
    ? "Right Triangle"
    : `${shape[0].toUpperCase()}${shape.slice(1)}`;
  const title = `${shapeName} drawing`;
  const description = shape === "triangle"
    ? `${shapeName} with area ${formatNumber(result.area)} square ${unit}, perimeter ${formatNumber(result.perimeter)} ${unit}, and height ${formatNumber(result.height)} ${unit}.`
    : `${shapeName} with area ${formatNumber(result.area)} square ${unit} and perimeter ${formatNumber(result.perimeter)} ${unit}.`;
  addAccessibleSvgText(title, description);

  if (shape === "circle") {
    drawCircle(result, unit);
    return;
  }
  drawPolygon(shape, result, unit);
}

function showResults(shape, result) {
  const unit = unitSelect.value;
  const areaUnit = `${unit}\u00B2`;
  const perimeterName = shape === "circle" ? "Circumference" : "Perimeter";

  areaResult.textContent = `${formatNumber(result.area)} ${areaUnit}`;
  perimeterResult.textContent = `${formatNumber(result.perimeter)} ${unit}`;
  perimeterLabel.textContent = perimeterName.toUpperCase();
  unitChip.textContent = unit;
  resultPanel.hidden = false;
  heightCaption.hidden = shape !== "triangle";
  diagramTitle.textContent = shape === "triangle" && result.isRightTriangle
    ? "Right Triangle"
    : `${shape[0].toUpperCase()}${shape.slice(1)}`;

  const detail = shape === "triangle"
    ? result.isRightTriangle
      ? `Hypotenuse: ${formatNumber(result.hypotenuse)} ${unit} | Height: ${formatNumber(result.height)} ${unit}`
      : `Height: ${formatNumber(result.height)} ${unit}`
    : shape === "circle"
      ? `Radius: ${formatNumber(result.radius)} ${unit}`
      : "Side lengths are labeled on the drawing.";
  diagramSubtitle.textContent = detail;
  renderDrawing(shape, result, unit);
}

shapeSelect.addEventListener("change", updateShapeFields);
rightTriangleToggle.addEventListener("change", updateShapeFields);
unitSelect.addEventListener("change", () => {
  resultPanel.hidden = true;
  heightCaption.hidden = true;
  diagramTitle.textContent = "Ready to sketch";
  diagramSubtitle.textContent = "Recalculate to apply the selected units.";
  showEmptyDrawing();
});

calculatorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  try {
    const shape = shapeSelect.value;
    const rightTriangleMode = shape === "triangle" && rightTriangleToggle.checked;
    const result = calculateShape(shape, readDimensions(), rightTriangleMode);
    const valuesToCheck = [result.area, result.perimeter, ...(result.vertices ?? []).flatMap(({ x, y }) => [x, y])];
    if (result.height !== undefined) {
      valuesToCheck.push(result.height);
    }
    if (!valuesToCheck.every(Number.isFinite) || result.area <= 0) {
      throw new Error("Those measurements are too large to calculate. Try smaller values.");
    }

    showResults(shape, result);
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  }
});

updateShapeFields();
