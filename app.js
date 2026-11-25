const shapeSelect = document.querySelector("#shape-select");
const unitSelect = document.querySelector("#unit-select");
const dimensionFields = document.querySelector("#dimension-fields");
const triangleNatureControl = document.querySelector("#triangle-nature-control");
const triangleNatureSelect = document.querySelector("#triangle-nature-select");
const triangleExtraFields = document.querySelector("#triangle-extra-fields");
const triangleRelations = document.querySelector("#triangle-relations");
const relationsHeading = document.querySelector("#relations-heading");
const relationsList = document.querySelector("#relations-list");
const relationsNote = document.querySelector("#relations-note");
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
};

const triangleSideFields = [
  { key: "side-a", label: "Side AB", placeholder: "e.g. 3" },
  { key: "side-b", label: "Side BC", placeholder: "e.g. 4" },
  { key: "side-c", label: "Side CA", placeholder: "e.g. 5" },
];

const rightTriangleFields = [
  { key: "leg-a", label: "Leg 1", placeholder: "e.g. 3" },
  { key: "leg-b", label: "Leg 2", placeholder: "e.g. 4" },
];

const knownSideOptions = {
  "semi-equilateral": [
    { value: "hypotenuse", label: "Hypotenuse" },
    { value: "long", label: "Long side" },
    { value: "short", label: "Short side" },
  ],
  "right-isosceles": [
    { value: "hypotenuse", label: "Hypotenuse" },
    { value: "side", label: "Leg" },
  ],
};

const selectedKnownSides = {
  "semi-equilateral": "hypotenuse",
  "right-isosceles": "hypotenuse",
};

const natureLabels = {
  right: "Right Triangle",
  "semi-equilateral": "Semi-equilateral Triangle",
  "right-isosceles": "Right Isosceles Triangle",
  equilateral: "Equilateral Triangle",
  isosceles: "Isosceles Triangle",
  scalene: "Scalene Triangle",
};

const natureRelations = {
  right: [
    "a² + b² = c²",
    "Median to hypotenuse = c / 2",
  ],
  "semi-equilateral": [
    "a² + b² = c²",
    "Median to hypotenuse = c / 2",
    "Short side = c / 2",
    "Long side = (√3 / 2) × c",
  ],
  "right-isosceles": [
    "a² + b² = c²",
    "Median to hypotenuse = c / 2",
    "Side = (√2 / 2) × c",
    "c = side × √2",
  ],
  equilateral: ["a = b = c"],
  isosceles: ["Two sides have equal lengths."],
  scalene: ["All three side lengths are different."],
};

const rightTriangleNatures = new Set(["right", "semi-equilateral", "right-isosceles"]);

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

function getTriangleFields(nature = triangleNatureSelect.value) {
  if (nature === "auto" || nature === "scalene") {
    return triangleSideFields;
  }
  if (nature === "right") {
    return rightTriangleFields;
  }
  if (nature === "semi-equilateral" || nature === "right-isosceles") {
    const knownSide = selectedKnownSides[nature];
    const option = knownSideOptions[nature].find(({ value }) => value === knownSide);
    const key = `known-${knownSide}`;
    return [{
      key,
      label: `${option.label} length`,
      placeholder: "e.g. 10",
    }];
  }
  if (nature === "equilateral") {
    return [{ key: "equilateral-side", label: "Side length", placeholder: "e.g. 5" }];
  }
  return [
    { key: "equal-side", label: "Equal side length", placeholder: "e.g. 5" },
    { key: "base", label: "Base length", placeholder: "e.g. 6" },
  ];
}

function createKnownSideField(nature) {
  const field = document.createElement("label");
  field.className = "form-field known-side-field";
  field.htmlFor = "known-side-select";

  const label = document.createElement("span");
  label.textContent = "Known side";

  const select = document.createElement("select");
  select.id = "known-side-select";
  for (const option of knownSideOptions[nature]) {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    select.append(optionElement);
  }
  select.value = selectedKnownSides[nature];
  select.addEventListener("change", () => {
    selectedKnownSides[nature] = select.value;
    updateTriangleFields();
    resetCalculationDisplay();
  });

  field.append(label, select);
  return field;
}

function updateTriangleFields() {
  const nature = triangleNatureSelect.value;
  triangleExtraFields.replaceChildren();
  if (knownSideOptions[nature]) {
    triangleExtraFields.append(createKnownSideField(nature));
  }
  dimensionFields.replaceChildren(...getTriangleFields(nature).map(createField));
  updateNatureInfo(nature);
}

function updateNatureInfo(nature, detected = false) {
  relationsHeading.textContent = detected
    ? `Detected: ${natureLabels[nature]}`
    : nature === "auto"
      ? "Automatic detection"
      : natureLabels[nature];
  relationsList.replaceChildren();

  const relations = nature === "auto"
    ? ["Enter three sides; if no special type matches, the triangle is Scalene."]
    : natureRelations[nature];
  for (const relation of relations) {
    const item = document.createElement("li");
    item.textContent = relation;
    relationsList.append(item);
  }

  relationsNote.hidden = !rightTriangleNatures.has(nature);
}

function resetCalculationDisplay() {
  errorMessage.hidden = true;
  resultPanel.hidden = true;
  heightCaption.hidden = true;
  diagramTitle.textContent = "Ready to sketch";
  diagramSubtitle.textContent = "Enter measurements to get started.";
  showEmptyDrawing();
}

function updateShapeFields() {
  const shape = shapeSelect.value;
  const isTriangle = shape === "triangle";
  triangleNatureControl.hidden = !isTriangle;
  triangleRelations.hidden = !isTriangle;

  if (isTriangle) {
    updateTriangleFields();
  } else {
    triangleExtraFields.replaceChildren();
    dimensionFields.replaceChildren(...shapeFields[shape].map(createField));
  }

  resetCalculationDisplay();
}

function readDimensions() {
  const values = {};
  const fields = shapeSelect.value === "triangle"
    ? getTriangleFields()
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

function approximatelyEqual(a, b) {
  return Math.abs(a - b) <= 0.001 * Math.max(Math.abs(a), Math.abs(b));
}

function detectTriangleNature(sideA, sideB, sideC) {
  if (approximatelyEqual(sideA, sideB) && approximatelyEqual(sideB, sideC)) {
    return "equilateral";
  }

  const [shortSide, middleSide, hypotenuse] = [sideA, sideB, sideC].sort((a, b) => a - b);
  const legsSquared = shortSide * shortSide + middleSide * middleSide;
  const hypotenuseSquared = hypotenuse * hypotenuse;
  const isRight = approximatelyEqual(legsSquared, hypotenuseSquared);

  if (isRight) {
    if (approximatelyEqual(shortSide, middleSide)) {
      return "right-isosceles";
    }
    if (
      approximatelyEqual(shortSide, hypotenuse / 2)
      && approximatelyEqual(middleSide, (hypotenuse * Math.sqrt(3)) / 2)
    ) {
      return "semi-equilateral";
    }
    return "right";
  }

  if (
    approximatelyEqual(sideA, sideB)
    || approximatelyEqual(sideB, sideC)
    || approximatelyEqual(sideC, sideA)
  ) {
    return "isosceles";
  }
  return "scalene";
}

function createTriangle(sideA, sideB, sideC) {
  const longestSide = Math.max(sideA, sideB, sideC);
  const otherSides = sideA + sideB + sideC - longestSide;

  if (longestSide >= otherSides) {
    throw new Error("Those side lengths cannot form a triangle. Try again.");
  }

  const x = (sideA * sideA + sideC * sideC - sideB * sideB) / (2 * sideA);
  const height = Math.sqrt(Math.max(0, sideC * sideC - x * x));
  const area = (sideA * height) / 2;
  const nature = detectTriangleNature(sideA, sideB, sideC);
  const hypotenuse = rightTriangleNatures.has(nature) ? longestSide : undefined;

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
    nature,
    area,
    perimeter: sideA + sideB + sideC,
  };
}

function calculateTriangle(nature, values) {
  if (nature === "auto" || nature === "scalene") {
    return createTriangle(values["side-a"], values["side-b"], values["side-c"]);
  }

  if (nature === "right") {
    const legA = values["leg-a"];
    const legB = values["leg-b"];
    return createTriangle(Math.hypot(legA, legB), legB, legA);
  }

  if (nature === "semi-equilateral") {
    const knownSide = selectedKnownSides[nature];
    const value = values[`known-${knownSide}`];
    let hypotenuse;
    let shortSide;
    let longSide;

    if (knownSide === "hypotenuse") {
      hypotenuse = value;
      shortSide = hypotenuse / 2;
      longSide = (hypotenuse * Math.sqrt(3)) / 2;
    } else if (knownSide === "short") {
      shortSide = value;
      hypotenuse = shortSide * 2;
      longSide = (hypotenuse * Math.sqrt(3)) / 2;
    } else {
      longSide = value;
      hypotenuse = (longSide * 2) / Math.sqrt(3);
      shortSide = hypotenuse / 2;
    }

    return createTriangle(hypotenuse, longSide, shortSide);
  }

  if (nature === "right-isosceles") {
    const knownSide = selectedKnownSides[nature];
    const value = values[`known-${knownSide}`];
    const hypotenuse = knownSide === "hypotenuse" ? value : value * Math.sqrt(2);
    const leg = knownSide === "hypotenuse" ? (value * Math.sqrt(2)) / 2 : value;
    return createTriangle(hypotenuse, leg, leg);
  }

  if (nature === "equilateral") {
    const side = values["equilateral-side"];
    return createTriangle(side, side, side);
  }

  const equalSide = values["equal-side"];
  const base = values.base;
  return createTriangle(base, equalSide, equalSide);
}

function calculateShape(shape, values, triangleNature = "auto") {
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

  return calculateTriangle(triangleNature, values);
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

  const shapeName = shape === "triangle"
    ? natureLabels[result.nature]
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
  diagramTitle.textContent = shape === "triangle"
    ? natureLabels[result.nature]
    : `${shape[0].toUpperCase()}${shape.slice(1)}`;

  const detail = shape === "triangle"
    ? rightTriangleNatures.has(result.nature)
      ? `Hypotenuse: ${formatNumber(result.hypotenuse)} ${unit} | Height: ${formatNumber(result.height)} ${unit}`
      : `Height: ${formatNumber(result.height)} ${unit}`
    : shape === "circle"
      ? `Radius: ${formatNumber(result.radius)} ${unit}`
      : "Side lengths are labeled on the drawing.";
  diagramSubtitle.textContent = detail;
  if (shape === "triangle") {
    updateNatureInfo(result.nature, true);
  }
  renderDrawing(shape, result, unit);
}

shapeSelect.addEventListener("change", updateShapeFields);
triangleNatureSelect.addEventListener("change", () => {
  updateTriangleFields();
  resetCalculationDisplay();
});
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
    const triangleNature = shape === "triangle" ? triangleNatureSelect.value : "auto";
    const result = calculateShape(shape, readDimensions(), triangleNature);
    const valuesToCheck = [result.area, result.perimeter, ...(result.vertices ?? []).flatMap(({ x, y }) => [x, y])];
    if (result.height !== undefined) {
      valuesToCheck.push(result.height);
    }
    if (result.hypotenuse !== undefined) {
      valuesToCheck.push(result.hypotenuse);
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
