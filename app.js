const shapeItemsContainer = document.querySelector("#shape-items");
const addShapeButton = document.querySelector("#add-shape");
const boardFrame = document.querySelector(".drawing-frame");
const board = document.querySelector("#shape-board");
const boardSubtitle = document.querySelector("#board-subtitle");

const svgNamespace = "http://www.w3.org/2000/svg";
const svgUnitsPerCm = 40;
const boardPaddingCm = 1.5;
const unitToCm = { cm: 1, m: 100, in: 2.54 };
const shapeOptions = [
  { value: "square", label: "Square" },
  { value: "rectangle", label: "Rectangle" },
  { value: "circle", label: "Circle" },
  { value: "triangle", label: "Triangle" },
];
const unitOptions = [
  { value: "cm", label: "cm" },
  { value: "m", label: "m" },
  { value: "in", label: "in" },
];
const natureOptions = [
  { value: "auto", label: "Detect from sides" },
  { value: "right", label: "Right triangle" },
  { value: "semi-equilateral", label: "Semi-equilateral (30-60-90)" },
  { value: "right-isosceles", label: "Right isosceles (45-45-90)" },
  { value: "equilateral", label: "Equilateral" },
  { value: "isosceles", label: "Isosceles" },
  { value: "scalene", label: "Scalene" },
];

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

const rightTriangleFields = [{ key: "leg-a", label: "Known leg", placeholder: "e.g. 3" }];

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

const natureLabels = {
  right: "Right Triangle",
  "semi-equilateral": "Semi-equilateral Triangle",
  "right-isosceles": "Right Isosceles Triangle",
  equilateral: "Equilateral Triangle",
  isosceles: "Isosceles Triangle",
  scalene: "Scalene Triangle",
};

const natureRelations = {
  right: ["a² + b² = c²", "Median to hypotenuse = c / 2", "c = 2 × median"],
  "semi-equilateral": [
    "a² + b² = c²",
    "Median to hypotenuse = c / 2",
    "c = 2 × median",
    "Short side = c / 2",
    "Long side = (√3 / 2) × c",
  ],
  "right-isosceles": [
    "a² + b² = c²",
    "Median to hypotenuse = c / 2",
    "c = 2 × median",
    "Side = (√2 / 2) × c",
    "c = side × √2",
  ],
  equilateral: ["a = b = c"],
  isosceles: ["Two sides have equal lengths."],
  scalene: ["All three side lengths are different."],
};

const rightTriangleNatures = new Set(["right", "semi-equilateral", "right-isosceles"]);
const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const palette = [
  ["#dceee5", "#2f7861"],
  ["#e6e8f5", "#555d9b"],
  ["#f5e8dc", "#a76b38"],
  ["#f2e3eb", "#985578"],
  ["#e1edf2", "#426f88"],
  ["#f1edda", "#8b7b35"],
];

let items = [];
let nextItemId = 1;
let dragState = null;

function makeItem() {
  return {
    id: nextItemId++,
    shape: "square",
    unit: "cm",
    nature: "auto",
    rightSecondMeasurement: "side",
    selectedKnownSides: {
      "semi-equilateral": "hypotenuse",
      "right-isosceles": "hypotenuse",
    },
    values: {},
    result: null,
    error: "",
    position: { x: 0, y: 0 },
    placed: false,
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

function createSelectField({ id, label, options, value, onChange, className = "" }) {
  const field = document.createElement("label");
  field.className = `form-field ${className}`.trim();
  field.htmlFor = id;

  const caption = document.createElement("span");
  caption.textContent = label;

  const select = document.createElement("select");
  select.id = id;
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));

  field.append(caption, select);
  return field;
}

function createDimensionField(item, field) {
  const id = `dimension-${item.id}-${field.key}`;
  const wrapper = document.createElement("label");
  wrapper.className = "dimension-field";
  wrapper.htmlFor = id;

  const caption = document.createElement("span");
  caption.textContent = field.label;

  const input = document.createElement("input");
  input.id = id;
  input.name = field.key;
  input.type = "number";
  input.min = "0";
  input.step = "any";
  input.required = true;
  input.placeholder = field.placeholder;
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.value = item.values[field.key] ?? "";
  input.setAttribute("aria-describedby", `error-${item.id}`);
  input.addEventListener("input", () => {
    item.values[field.key] = input.value;
  });

  wrapper.append(caption, input);
  return wrapper;
}

function getTriangleFields(item) {
  if (item.nature === "auto" || item.nature === "scalene") {
    return triangleSideFields;
  }
  if (item.nature === "right") {
    return [
      ...rightTriangleFields,
      item.rightSecondMeasurement === "median"
        ? { key: "median", label: "Median to hypotenuse", placeholder: "e.g. 2.5" }
        : { key: "leg-b", label: "Other leg", placeholder: "e.g. 4" },
    ];
  }
  if (item.nature === "semi-equilateral" || item.nature === "right-isosceles") {
    const knownSide = item.selectedKnownSides[item.nature];
    const option = knownSideOptions[item.nature].find(({ value }) => value === knownSide);
    return [{
      key: `known-${knownSide}`,
      label: `${option.label} length`,
      placeholder: "e.g. 10",
    }];
  }
  if (item.nature === "equilateral") {
    return [{ key: "equilateral-side", label: "Side length", placeholder: "e.g. 5" }];
  }
  return [
    { key: "equal-side", label: "Equal side length", placeholder: "e.g. 5" },
    { key: "base", label: "Base length", placeholder: "e.g. 6" },
  ];
}

function getFields(item) {
  return item.shape === "triangle" ? getTriangleFields(item) : shapeFields[item.shape];
}

function setConfiguration(item, updates) {
  Object.assign(item, updates);
  item.values = {};
  item.result = null;
  item.error = "";
  renderShapeManager();
  renderBoard();
}

function createNatureDetails(item, detected = false) {
  const section = document.createElement("section");
  section.className = "triangle-relations";
  section.setAttribute("aria-live", "polite");

  const nature = detected && item.result ? item.result.nature : item.nature;
  const heading = document.createElement("h3");
  heading.textContent = detected
    ? `Detected: ${natureLabels[nature]}`
    : nature === "auto"
      ? "Automatic detection"
      : natureLabels[nature];

  const list = document.createElement("ul");
  const relations = nature === "auto"
    ? ["Enter three sides; if no special type matches, the triangle is Scalene."]
    : natureRelations[nature];
  for (const relation of relations) {
    const entry = document.createElement("li");
    entry.textContent = relation;
    list.append(entry);
  }
  section.append(heading, list);

  if (rightTriangleNatures.has(nature)) {
    const note = document.createElement("p");
    note.className = "relations-note";
    note.textContent = "In these relations, c is the hypotenuse.";
    section.append(note);
  }
  return section;
}

function createShapeResults(item) {
  const section = document.createElement("section");
  section.className = "item-results";
  section.setAttribute("aria-label", `Results for shape ${item.id}`);

  const result = item.result;
  const heading = document.createElement("h3");
  heading.textContent = item.shape === "triangle"
    ? natureLabels[result.nature]
    : `${item.shape[0].toUpperCase()}${item.shape.slice(1)}`;

  const metrics = document.createElement("div");
  metrics.className = "result-metrics";
  const values = [
    ["AREA", `${formatNumber(result.area)} ${item.unit}²`],
    [item.shape === "circle" ? "CIRCUMFERENCE" : "PERIMETER", `${formatNumber(result.perimeter)} ${item.unit}`],
  ];
  for (const [label, value] of values) {
    const metric = document.createElement("article");
    metric.className = "metric";
    const caption = document.createElement("p");
    caption.textContent = label;
    const output = document.createElement("output");
    output.textContent = value;
    metric.append(caption, output);
    metrics.append(metric);
  }
  section.append(heading, metrics);

  if (item.shape === "triangle") {
    const details = document.createElement("p");
    details.className = "shape-result-detail";
    const parts = [`Height: ${formatNumber(result.height)} ${item.unit}`];
    if (result.median !== undefined) {
      parts.push(`Median: ${formatNumber(result.median)} ${item.unit}`);
    }
    if (result.hypotenuse !== undefined) {
      parts.push(`Hypotenuse: ${formatNumber(result.hypotenuse)} ${item.unit}`);
    }
    details.textContent = parts.join(" · ");
    section.append(details);
  }

  return section;
}

function createShapeCard(item, index) {
  const card = document.createElement("article");
  card.className = "shape-card";
  card.dataset.itemId = String(item.id);

  const header = document.createElement("header");
  header.className = "shape-card-header";
  const title = document.createElement("h3");
  title.textContent = `Shape ${index + 1}`;
  const remove = document.createElement("button");
  remove.className = "remove-shape-button";
  remove.type = "button";
  remove.textContent = "Remove";
  remove.setAttribute("aria-label", `Remove shape ${index + 1}`);
  remove.addEventListener("click", () => {
    items = items.filter((candidate) => candidate !== item);
    renderShapeManager();
    renderBoard();
  });
  header.append(title, remove);
  card.append(header);

  const form = document.createElement("form");
  form.className = "shape-form";
  form.noValidate = true;

  const controls = document.createElement("div");
  controls.className = "select-row";
  controls.append(
    createSelectField({
      id: `shape-type-${item.id}`,
      label: "Shape",
      options: shapeOptions,
      value: item.shape,
      onChange: (shape) => setConfiguration(item, { shape }),
    }),
    createSelectField({
      id: `shape-unit-${item.id}`,
      label: "Units",
      options: unitOptions,
      value: item.unit,
      onChange: (unit) => setConfiguration(item, { unit }),
      className: "unit-field",
    }),
  );
  form.append(controls);

  if (item.shape === "triangle") {
    form.append(
      createSelectField({
        id: `triangle-nature-${item.id}`,
        label: "Triangle nature",
        options: natureOptions,
        value: item.nature,
        onChange: (nature) => setConfiguration(item, { nature }),
        className: "triangle-nature-control",
      }),
    );

    if (knownSideOptions[item.nature]) {
      const options = knownSideOptions[item.nature];
      form.append(
        createSelectField({
          id: `known-side-${item.id}`,
          label: "Known side",
          options,
          value: item.selectedKnownSides[item.nature],
          onChange: (value) => {
            item.selectedKnownSides[item.nature] = value;
            item.values = {};
            item.result = null;
            renderShapeManager();
            renderBoard();
          },
          className: "triangle-extra-field",
        }),
      );
    } else if (item.nature === "right") {
      form.append(
        createSelectField({
          id: `right-measurement-${item.id}`,
          label: "Second measurement",
          options: [
            { value: "side", label: "Another side" },
            { value: "median", label: "Median to hypotenuse" },
          ],
          value: item.rightSecondMeasurement,
          onChange: (value) => setConfiguration(item, { rightSecondMeasurement: value }),
          className: "triangle-extra-field",
        }),
      );
    }
  }

  const dimensions = document.createElement("div");
  dimensions.className = "dimension-fields";
  for (const field of getFields(item)) {
    dimensions.append(createDimensionField(item, field));
  }
  form.append(dimensions);

  const error = document.createElement("p");
  error.className = "error-message";
  error.id = `error-${item.id}`;
  error.setAttribute("role", "alert");
  error.textContent = item.error;
  error.hidden = !item.error;
  form.append(error);

  const submit = document.createElement("button");
  submit.className = "calculate-button";
  submit.type = "submit";
  const submitText = document.createElement("span");
  submitText.textContent = item.result ? "Update shape" : "Calculate shape";
  const arrow = document.createElement("span");
  arrow.className = "button-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";
  submit.append(submitText, arrow);
  form.append(submit);

  if (item.shape === "triangle") {
    const formula = document.createElement("p");
    formula.className = "formula-note";
    formula.textContent = "Triangle area uses base × height ÷ 2.";
    form.append(formula, createNatureDetails(item, Boolean(item.result)));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const values = readDimensions(item, form);
      const result = calculateShape(item.shape, values, item);
      validateResult(item, result);
      item.result = result;
      item.error = "";
      if (!item.placed) {
        placeItem(item);
      }
      renderShapeManager();
      renderBoard();
    } catch (caughtError) {
      item.error = caughtError instanceof Error ? caughtError.message : "Could not calculate this shape.";
      renderShapeManager();
    }
  });

  card.append(form);
  if (item.result) {
    card.append(createShapeResults(item));
  }
  return card;
}

function renderShapeManager() {
  shapeItemsContainer.replaceChildren(...items.map(createShapeCard));
}

function readDimensions(item, form) {
  const values = {};
  for (const field of getFields(item)) {
    const input = form.querySelector(`[name="${field.key}"]`);
    const rawValue = input.value.trim();
    const value = Number(rawValue);
    if (rawValue === "" || !Number.isFinite(value) || value <= 0) {
      input.focus();
      throw new Error(`${field.label} must be a number greater than zero.`);
    }
    values[field.key] = value;
  }
  item.values = { ...values };
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
  const hypotenuseSideIndex = rightTriangleNatures.has(nature)
    ? [sideA, sideB, sideC].indexOf(hypotenuse)
    : undefined;

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
    hypotenuseSideIndex,
    median: hypotenuse === undefined ? undefined : hypotenuse / 2,
    nature,
    area,
    perimeter: sideA + sideB + sideC,
  };
}

function calculateTriangle(nature, values, item) {
  if (nature === "auto" || nature === "scalene") {
    return createTriangle(values["side-a"], values["side-b"], values["side-c"]);
  }

  if (nature === "right") {
    const legA = values["leg-a"];
    if (item.rightSecondMeasurement === "median") {
      const hypotenuse = values.median * 2;
      if (legA >= hypotenuse) {
        throw new Error("The leg must be shorter than the hypotenuse (twice the median).");
      }
      const legB = Math.sqrt(hypotenuse * hypotenuse - legA * legA);
      return createTriangle(hypotenuse, legB, legA);
    }

    const legB = values["leg-b"];
    return createTriangle(Math.hypot(legA, legB), legB, legA);
  }

  if (nature === "semi-equilateral") {
    const knownSide = item.selectedKnownSides[nature];
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
    const knownSide = item.selectedKnownSides[nature];
    const value = values[`known-${knownSide}`];
    const hypotenuse = knownSide === "hypotenuse" ? value : value * Math.sqrt(2);
    const leg = knownSide === "hypotenuse" ? (value * Math.sqrt(2)) / 2 : value;
    return createTriangle(hypotenuse, leg, leg);
  }

  if (nature === "equilateral") {
    const side = values["equilateral-side"];
    return createTriangle(side, side, side);
  }

  return createTriangle(values.base, values["equal-side"], values["equal-side"]);
}

function calculateShape(shape, values, item) {
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

  return calculateTriangle(item.nature, values, item);
}

function validateResult(item, result) {
  const values = [
    result.area,
    result.perimeter,
    ...(result.vertices ?? []).flatMap(({ x, y }) => [x, y]),
  ];
  if (result.radius !== undefined) {
    values.push(result.radius);
  }
  for (const property of ["height", "hypotenuse", "median"]) {
    if (result[property] !== undefined) {
      values.push(result[property]);
    }
  }

  const factor = unitToCm[item.unit] * svgUnitsPerCm;
  const drawingValues = item.shape === "circle"
    ? [result.radius * factor]
    : result.vertices.flatMap(({ x, y }) => [x * factor, y * factor]);
  if (
    !values.every(Number.isFinite)
    || result.area <= 0
    || !drawingValues.every(Number.isFinite)
  ) {
    throw new Error("Those measurements are too large to calculate or draw.");
  }
}

function localBounds(item) {
  const factor = unitToCm[item.unit];
  if (item.shape === "circle") {
    const diameter = item.result.radius * factor;
    return { minX: 0, maxX: diameter * 2, minY: -diameter * 2, maxY: 0 };
  }

  const points = item.result.vertices.map(({ x, y }) => ({
    x: x * factor,
    y: -y * factor,
  }));
  return {
    minX: Math.min(...points.map(({ x }) => x)),
    maxX: Math.max(...points.map(({ x }) => x)),
    minY: Math.min(...points.map(({ y }) => y)),
    maxY: Math.max(...points.map(({ y }) => y)),
  };
}

function globalBounds(item) {
  const bounds = localBounds(item);
  return {
    minX: item.position.x + bounds.minX,
    maxX: item.position.x + bounds.maxX,
    minY: item.position.y + bounds.minY,
    maxY: item.position.y + bounds.maxY,
  };
}

function placeItem(item) {
  const bounds = localBounds(item);
  const others = items.filter((other) => other !== item && other.result);
  if (others.length === 0) {
    item.position = {
      x: 2 - bounds.minX,
      y: 2 - bounds.minY,
    };
  } else {
    const otherBounds = others.map(globalBounds);
    const rightEdge = Math.max(...otherBounds.map(({ maxX }) => maxX));
    const topEdge = Math.min(...otherBounds.map(({ minY }) => minY));
    item.position = {
      x: rightEdge + 2 - bounds.minX,
      y: topEdge - bounds.minY,
    };
  }
  item.placed = true;
}

function localSvgPoint(item, point) {
  const factor = unitToCm[item.unit] * svgUnitsPerCm;
  return { x: point.x * factor, y: -point.y * factor };
}

function appendSideLabels(group, item, points, sides) {
  const center = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  );

  sides.forEach((side, index) => {
    const start = points[index];
    const end = points[(index + 1) % points.length];
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

    group.append(
      svgElement(
        "text",
        {
          class: "side-label",
          x: midpointX + normalX * 22,
          y: midpointY + normalY * 22,
        },
        `${side.name} = ${formatNumber(side.length)} ${item.unit}`,
      ),
    );
  });
}

function drawPolygon(group, item) {
  const result = item.result;
  const points = result.vertices.map((point) => localSvgPoint(item, point));
  const pointList = points.map((point) => `${point.x},${point.y}`).join(" ");
  group.append(svgElement("polygon", { class: "shape-polygon", points: pointList }));

  points.forEach((point, index) => {
    group.append(
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

  appendSideLabels(group, item, points, result.sides);

  if (item.shape !== "triangle") {
    return;
  }

  const apex = localSvgPoint(item, result.vertices[2]);
  const foot = localSvgPoint(item, { x: result.vertices[2].x, y: 0 });
  group.append(
    svgElement("line", {
      class: "height-line",
      x1: apex.x,
      y1: apex.y,
      x2: foot.x,
      y2: foot.y,
    }),
    svgElement(
      "text",
      {
        class: "height-label",
        x: foot.x + 10,
        y: (apex.y + foot.y) / 2,
      },
      `h = ${formatNumber(result.height)} ${item.unit}`,
    ),
  );

  if (result.hypotenuseSideIndex !== undefined) {
    const rightVertexIndex = (result.hypotenuseSideIndex + 2) % points.length;
    const rightVertex = points[rightVertexIndex];
    const firstNeighbor = points[(rightVertexIndex + 1) % points.length];
    const secondNeighbor = points[(rightVertexIndex + 2) % points.length];
    const firstVector = {
      x: firstNeighbor.x - rightVertex.x,
      y: firstNeighbor.y - rightVertex.y,
    };
    const secondVector = {
      x: secondNeighbor.x - rightVertex.x,
      y: secondNeighbor.y - rightVertex.y,
    };
    const firstLength = Math.hypot(firstVector.x, firstVector.y);
    const secondLength = Math.hypot(secondVector.x, secondVector.y);
    const markerSize = Math.min(18, firstLength * 0.18, secondLength * 0.18);
    const firstUnit = { x: firstVector.x / firstLength, y: firstVector.y / firstLength };
    const secondUnit = { x: secondVector.x / secondLength, y: secondVector.y / secondLength };
    const markerPoints = [
      rightVertex,
      {
        x: rightVertex.x + firstUnit.x * markerSize,
        y: rightVertex.y + firstUnit.y * markerSize,
      },
      {
        x: rightVertex.x + (firstUnit.x + secondUnit.x) * markerSize,
        y: rightVertex.y + (firstUnit.y + secondUnit.y) * markerSize,
      },
      {
        x: rightVertex.x + secondUnit.x * markerSize,
        y: rightVertex.y + secondUnit.y * markerSize,
      },
    ];
    group.append(
      svgElement("polyline", {
        class: "right-angle-marker",
        points: markerPoints.map((point) => `${point.x},${point.y}`).join(" "),
      }),
    );
  }

  if (result.median !== undefined) {
    const sideIndex = result.hypotenuseSideIndex;
    const sideStart = points[sideIndex];
    const sideEnd = points[(sideIndex + 1) % points.length];
    const oppositeVertex = points[(sideIndex + 2) % points.length];
    const midpoint = {
      x: (sideStart.x + sideEnd.x) / 2,
      y: (sideStart.y + sideEnd.y) / 2,
    };
    group.append(
      svgElement("line", {
        class: "median-line",
        x1: oppositeVertex.x,
        y1: oppositeVertex.y,
        x2: midpoint.x,
        y2: midpoint.y,
      }),
      svgElement(
        "text",
        {
          class: "median-label",
          x: (oppositeVertex.x + midpoint.x) / 2 + 8,
          y: (oppositeVertex.y + midpoint.y) / 2,
        },
        `m = ${formatNumber(result.median)} ${item.unit}`,
      ),
    );
  }
}

function drawCircle(group, item) {
  const radius = item.result.radius * unitToCm[item.unit] * svgUnitsPerCm;
  const center = { x: radius, y: -radius };
  group.append(
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
        x: center.x + radius * 0.55,
        y: center.y + 21,
      },
      `r = ${formatNumber(item.result.radius)} ${item.unit}`,
    ),
  );
}

function createBoardShape(item, index) {
  const group = svgElement("g", {
    class: "board-shape",
    "data-item-id": item.id,
    tabindex: 0,
    role: "button",
    "aria-label": `Shape ${index + 1}: drag to move`,
    transform: `translate(${item.position.x * svgUnitsPerCm} ${item.position.y * svgUnitsPerCm})`,
  });
  const [fill, stroke] = palette[index % palette.length];
  group.style.setProperty("--shape-fill", fill);
  group.style.setProperty("--shape-stroke", stroke);

  const title = item.shape === "triangle"
    ? natureLabels[item.result.nature]
    : `${item.shape[0].toUpperCase()}${item.shape.slice(1)}`;
  group.append(svgElement("title", {}, `Shape ${index + 1}: ${title}`));

  if (item.shape === "circle") {
    drawCircle(group, item);
  } else {
    drawPolygon(group, item);
  }
  return group;
}

function getBoardBounds() {
  const visibleItems = items.filter((item) => item.result);
  if (visibleItems.length === 0) {
    return { minX: 0, maxX: 8, minY: 0, maxY: 6 };
  }

  const bounds = visibleItems.map(globalBounds);
  return {
    minX: Math.min(...bounds.map(({ minX }) => minX)) - boardPaddingCm,
    maxX: Math.max(...bounds.map(({ maxX }) => maxX)) + boardPaddingCm,
    minY: Math.min(...bounds.map(({ minY }) => minY)) - boardPaddingCm,
    maxY: Math.max(...bounds.map(({ maxY }) => maxY)) + boardPaddingCm,
  };
}

function renderBoard() {
  const bounds = getBoardBounds();
  const viewX = bounds.minX * svgUnitsPerCm;
  const viewY = bounds.minY * svgUnitsPerCm;
  const width = (bounds.maxX - bounds.minX) * svgUnitsPerCm;
  const height = (bounds.maxY - bounds.minY) * svgUnitsPerCm;
  board.setAttribute("viewBox", `${viewX} ${viewY} ${width} ${height}`);
  board.style.width = `${width / svgUnitsPerCm}cm`;
  board.style.height = `${height / svgUnitsPerCm}cm`;
  board.replaceChildren(
    svgElement("rect", {
      class: "drawing-background",
      x: viewX,
      y: viewY,
      width,
      height,
    }),
  );

  const visibleItems = items.filter((item) => item.result);
  if (visibleItems.length === 0) {
    board.append(
      svgElement(
        "text",
        {
          class: "empty-message",
          x: viewX + width / 2,
          y: viewY + height / 2,
        },
        "Calculate a shape to add it to the canvas.",
      ),
    );
    boardSubtitle.textContent = "Add and calculate shapes, then drag them to arrange.";
    return;
  }

  visibleItems.forEach((item) => {
    board.append(createBoardShape(item, items.indexOf(item)));
  });
  boardSubtitle.textContent = `${visibleItems.length} shape${visibleItems.length === 1 ? "" : "s"} on the canvas · drag to move`;
}

function updateDraggedShape(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }
  const matrix = board.getScreenCTM();
  if (!matrix || !matrix.a || !matrix.d) {
    return;
  }
  dragState.item.position = {
    x: dragState.startPosition.x + (event.clientX - dragState.startX) / (matrix.a * svgUnitsPerCm),
    y: dragState.startPosition.y + (event.clientY - dragState.startY) / (matrix.d * svgUnitsPerCm),
  };
  const group = board.querySelector(`[data-item-id="${dragState.item.id}"]`);
  group?.setAttribute(
    "transform",
    `translate(${dragState.item.position.x * svgUnitsPerCm} ${dragState.item.position.y * svgUnitsPerCm})`,
  );
}

function finishDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }
  const item = dragState.item;
  dragState = null;
  board.classList.remove("is-dragging");
  renderBoard();
  board.querySelector(`[data-item-id="${item.id}"]`)?.scrollIntoView({
    block: "nearest",
    inline: "nearest",
  });
}

function startDragging(event) {
  const target = event.target instanceof Element ? event.target.closest(".board-shape") : null;
  if (!target || (event.pointerType === "mouse" && event.button !== 0)) {
    return;
  }
  const item = items.find((candidate) => String(candidate.id) === target.dataset.itemId);
  if (!item) {
    return;
  }
  event.preventDefault();
  dragState = {
    item,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startPosition: { ...item.position },
  };
  board.classList.add("is-dragging");
  board.setPointerCapture(event.pointerId);
}

function moveWithKeyboard(event) {
  const target = event.target instanceof Element ? event.target.closest(".board-shape") : null;
  if (!target) {
    return;
  }
  const directions = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const direction = directions[event.key];
  if (!direction) {
    return;
  }
  event.preventDefault();
  const item = items.find((candidate) => String(candidate.id) === target.dataset.itemId);
  if (!item) {
    return;
  }
  const step = event.shiftKey ? 5 : 1;
  item.position.x += direction[0] * step;
  item.position.y += direction[1] * step;
  renderBoard();
  board.querySelector(`[data-item-id="${item.id}"]`)?.focus();
}

function addShape() {
  const item = makeItem();
  items.push(item);
  renderShapeManager();
  renderBoard();
  shapeItemsContainer.querySelector(`[data-item-id="${item.id}"] select`)?.focus();
}

addShapeButton.addEventListener("click", addShape);
board.addEventListener("pointerdown", startDragging);
board.addEventListener("pointermove", updateDraggedShape);
board.addEventListener("pointerup", finishDrag);
board.addEventListener("pointercancel", finishDrag);
board.addEventListener("keydown", moveWithKeyboard);

items.push(makeItem());
renderShapeManager();
renderBoard();
