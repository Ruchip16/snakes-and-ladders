// ============================================================
// SNAKES & LADDERS — JavaScript game logic
// ============================================================
// HTML = structure | CSS = look | JS = rules + dice + movement

const BOARD_SIZE = 10;
const WIN_SQUARE = 100;
const START_SQUARE = 1;

// Key = square you land on, value = where you go
const LADDERS = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

const SNAKES = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

// --- Game state ---
let positions = [START_SQUARE, START_SQUARE];
let currentPlayer = 0; // 0 = Player 1, 1 = Player 2
let wins = [0, 0];
let isBusy = false; // true while dice rolls or token moves
let cellMap = {}; // square number → cell element

// --- DOM elements ---
const boardEl = document.getElementById("board");
const svgEl = document.getElementById("board-svg");
const statusEl = document.getElementById("snl-status");
const diceEl = document.getElementById("dice");
const rollBtn = document.getElementById("roll-btn");
const playerPanels = [
  document.getElementById("player-1-panel"),
  document.getElementById("player-2-panel"),
];
const posEls = [document.getElementById("pos-1"), document.getElementById("pos-2")];
const winsEls = [document.getElementById("wins-1"), document.getElementById("wins-2")];

// Classic zigzag numbering: 1 at bottom-left, 100 at top-left
function getSquareNumber(rowFromTop, col) {
  const rowFromBottom = BOARD_SIZE - 1 - rowFromTop;
  const base = rowFromBottom * BOARD_SIZE;

  if (rowFromBottom % 2 === 0) {
    return base + col + 1;
  }
  return base + (BOARD_SIZE - col);
}

function buildBoard() {
  boardEl.innerHTML = "";
  cellMap = {};

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const num = getSquareNumber(row, col);
      const cell = document.createElement("div");
      cell.className = "snl-cell";
      cell.dataset.square = num;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Square ${num}`);

      const numSpan = document.createElement("span");
      numSpan.className = "snl-cell-num";
      numSpan.textContent = num;
      cell.appendChild(numSpan);

      if (num === START_SQUARE) {
        cell.classList.add("snl-cell--start");
      }
      if (num === WIN_SQUARE) {
        cell.classList.add("snl-cell--finish");
      }

      if (LADDERS[num]) {
        cell.classList.add("snl-cell--ladder");
        cell.title = `Ladder: Climbs up from square ${num} to ${LADDERS[num]}`;
      } else if (SNAKES[num]) {
        cell.classList.add("snl-cell--snake");
        cell.title = `Snake: Slides down from square ${num} to ${SNAKES[num]}`;
      }

      if (LADDERS[num] || SNAKES[num]) {
        const svgGroupId = LADDERS[num] ? `svg-ladder-${num}` : `svg-snake-${num}`;
        cell.addEventListener("mouseenter", () => {
          const group = document.getElementById(svgGroupId);
          if (group) group.classList.add("snl-svg-group--active");
        });
        cell.addEventListener("mouseleave", () => {
          const group = document.getElementById(svgGroupId);
          if (group) group.classList.remove("snl-svg-group--active");
        });
      }

      const tokens = document.createElement("div");
      tokens.className = "snl-tokens";
      tokens.dataset.tokens = num;
      cell.appendChild(tokens);

      boardEl.appendChild(cell);
      cellMap[num] = cell;
    }
  }

  // Render SVG ladders and snakes after layout computation
  requestAnimationFrame(drawConnections);
}

function drawConnections() {
  if (!svgEl || !boardEl) return;

  svgEl.innerHTML = "";

  const boardRect = boardEl.getBoundingClientRect();
  if (boardRect.width === 0 || boardRect.height === 0) return;

  const svgNS = "http://www.w3.org/2000/svg";

  // Helper to get square center (x, y) relative to board container
  const getCenter = (squareNum) => {
    const cell = cellMap[squareNum];
    if (!cell) return null;
    const r = cell.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - boardRect.left,
      y: r.top + r.height / 2 - boardRect.top,
    };
  };

  // Draw 2D Wooden Ladder with Parallel Rails & Rungs
  const drawLadder = (fromSquare, toSquare) => {
    const p1 = getCenter(fromSquare);
    const p2 = getCenter(toSquare);
    if (!p1 || !p2) return;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const nx = -dy / len; // Normal vector
    const ny = dx / len;
    const halfWidth = 7; // Gap between rails

    const r1x1 = p1.x + nx * halfWidth, r1y1 = p1.y + ny * halfWidth;
    const r1x2 = p2.x + nx * halfWidth, r1y2 = p2.y + ny * halfWidth;
    const r2x1 = p1.x - nx * halfWidth, r2y1 = p1.y - ny * halfWidth;
    const r2x2 = p2.x - nx * halfWidth, r2y2 = p2.y - ny * halfWidth;

    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("id", `svg-ladder-${fromSquare}`);
    group.setAttribute("class", "snl-svg-group");

    // Left & Right Rails
    const rail1 = document.createElementNS(svgNS, "line");
    rail1.setAttribute("x1", r1x1); rail1.setAttribute("y1", r1y1);
    rail1.setAttribute("x2", r1x2); rail1.setAttribute("y2", r1y2);
    rail1.setAttribute("class", "snl-ladder-rail");

    const rail2 = document.createElementNS(svgNS, "line");
    rail2.setAttribute("x1", r2x1); rail2.setAttribute("y1", r2y1);
    rail2.setAttribute("x2", r2x2); rail2.setAttribute("y2", r2y2);
    rail2.setAttribute("class", "snl-ladder-rail");

    group.appendChild(rail1);
    group.appendChild(rail2);

    // Render evenly spaced rungs along the ladder
    const rungCount = Math.max(3, Math.floor(len / 16));
    for (let i = 1; i < rungCount; i++) {
      const t = i / rungCount;
      const rx1 = r1x1 + (r1x2 - r1x1) * t;
      const ry1 = r1y1 + (r1y2 - r1y1) * t;
      const rx2 = r2x1 + (r2x2 - r2x1) * t;
      const ry2 = r2y1 + (r2y2 - r2y1) * t;

      const rung = document.createElementNS(svgNS, "line");
      rung.setAttribute("x1", rx1); rung.setAttribute("y1", ry1);
      rung.setAttribute("x2", rx2); rung.setAttribute("y2", ry2);
      rung.setAttribute("class", "snl-ladder-rung");
      group.appendChild(rung);
    }

    svgEl.appendChild(group);
  };

  // Draw 2D Wavy Snake with Head, Eyes & Pattern Body
  const drawSnake = (headSquare, tailSquare) => {
    const head = getCenter(headSquare);
    const tail = getCenter(tailSquare);
    if (!head || !tail) return;

    const dx = tail.x - head.x;
    const dy = tail.y - head.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const nx = -dy / len;
    const ny = dx / len;

    // Create a smooth S-curve body using cubic bezier
    const cp1x = head.x + (dx * 0.3) + nx * (len * 0.18);
    const cp1y = head.y + (dy * 0.3) + ny * (len * 0.18);
    const cp2x = head.x + (dx * 0.7) - nx * (len * 0.18);
    const cp2y = head.y + (dy * 0.7) - ny * (len * 0.18);

    const pathD = `M ${head.x} ${head.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tail.x} ${tail.y}`;

    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("id", `svg-snake-${headSquare}`);
    group.setAttribute("class", "snl-svg-group");

    // Dark underbody border
    const bodyUnder = document.createElementNS(svgNS, "path");
    bodyUnder.setAttribute("d", pathD);
    bodyUnder.setAttribute("class", "snl-snake-body-under");
    bodyUnder.setAttribute("stroke-width", "8");

    // Main red body
    const body = document.createElementNS(svgNS, "path");
    body.setAttribute("d", pathD);
    body.setAttribute("class", "snl-snake-body");
    body.setAttribute("stroke-width", "5");

    // Yellow spot pattern
    const pattern = document.createElementNS(svgNS, "path");
    pattern.setAttribute("d", pathD);
    pattern.setAttribute("class", "snl-snake-pattern");
    pattern.setAttribute("stroke-width", "2");

    group.appendChild(bodyUnder);
    group.appendChild(body);
    group.appendChild(pattern);

    // Snake Head at top square
    const headCircle = document.createElementNS(svgNS, "circle");
    headCircle.setAttribute("cx", head.x);
    headCircle.setAttribute("cy", head.y);
    headCircle.setAttribute("r", "7.5");
    headCircle.setAttribute("class", "snl-snake-head");
    group.appendChild(headCircle);

    // Eyes
    const eye1 = document.createElementNS(svgNS, "circle");
    eye1.setAttribute("cx", head.x - 2.5);
    eye1.setAttribute("cy", head.y - 2);
    eye1.setAttribute("r", "2");
    eye1.setAttribute("class", "snl-snake-eye");

    const pupil1 = document.createElementNS(svgNS, "circle");
    pupil1.setAttribute("cx", head.x - 2.5);
    pupil1.setAttribute("cy", head.y - 2);
    pupil1.setAttribute("r", "1");
    pupil1.setAttribute("class", "snl-snake-pupil");

    const eye2 = document.createElementNS(svgNS, "circle");
    eye2.setAttribute("cx", head.x + 2.5);
    eye2.setAttribute("cy", head.y - 2);
    eye2.setAttribute("r", "2");
    eye2.setAttribute("class", "snl-snake-eye");

    const pupil2 = document.createElementNS(svgNS, "circle");
    pupil2.setAttribute("cx", head.x + 2.5);
    pupil2.setAttribute("cy", head.y - 2);
    pupil2.setAttribute("r", "1");
    pupil2.setAttribute("class", "snl-snake-pupil");

    // Forked Tongue
    const tongue = document.createElementNS(svgNS, "line");
    tongue.setAttribute("x1", head.x);
    tongue.setAttribute("y1", head.y - 7.5);
    tongue.setAttribute("x2", head.x);
    tongue.setAttribute("y2", head.y - 12);
    tongue.setAttribute("class", "snl-snake-tongue");

    group.appendChild(eye1);
    group.appendChild(pupil1);
    group.appendChild(eye2);
    group.appendChild(pupil2);
    group.appendChild(tongue);

    svgEl.appendChild(group);
  };

  Object.keys(LADDERS).forEach((start) => drawLadder(Number(start), LADDERS[start]));
  Object.keys(SNAKES).forEach((start) => drawSnake(Number(start), SNAKES[start]));
}

function updatePlayerPanels() {
  playerPanels.forEach((panel, i) => {
    panel.classList.toggle("snl-player--active", i === currentPlayer && !isBusy);
    posEls[i].textContent = positions[i];
    winsEls[i].textContent = wins[i];
  });
}

function updateStatus(message) {
  statusEl.textContent = message;
}

function renderTokens() {
  document.querySelectorAll(".snl-tokens").forEach((el) => {
    el.innerHTML = "";
  });

  positions.forEach((square, playerIndex) => {
    const container = document.querySelector(`[data-tokens="${square}"]`);
    if (!container) {
      return;
    }
    const token = document.createElement("span");
    token.className = `snl-token snl-token--${playerIndex + 1}`;
    token.setAttribute("aria-label", `Player ${playerIndex + 1}`);
    container.appendChild(token);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Move one square at a time so students can follow the animation
async function animateMove(playerIndex, from, to) {
  const step = to > from ? 1 : -1;

  for (let square = from + step; square !== to + step; square += step) {
    positions[playerIndex] = square;
    renderTokens();
    const token = document.querySelector(`[data-tokens="${square}"] .snl-token--${playerIndex + 1}`);
    if (token) {
      token.classList.add("snl-token--moving");
    }
    updatePlayerPanels();
    await wait(120);
  }
}

async function rollDice() {
  diceEl.classList.add("snl-dice--rolling");

  for (let i = 0; i < 8; i++) {
    const temp = Math.floor(Math.random() * 6) + 1;
    diceEl.textContent = temp;
    await wait(60);
  }

  const roll = Math.floor(Math.random() * 6) + 1;
  diceEl.textContent = roll;
  diceEl.classList.remove("snl-dice--rolling");
  diceEl.setAttribute("aria-label", `Dice showing ${roll}`);
  return roll;
}

async function handleRoll() {
  if (isBusy) {
    return;
  }

  isBusy = true;
  rollBtn.disabled = true;
  const playerNum = currentPlayer + 1;
  const from = positions[currentPlayer];

  updateStatus(`Player ${playerNum} is rolling…`);
  updatePlayerPanels();

  const roll = await rollDice();
  const target = from + roll;

  if (target > WIN_SQUARE) {
    updateStatus(`Player ${playerNum} rolled ${roll} — need exact count to reach 100!`);
    currentPlayer = currentPlayer === 0 ? 1 : 0;
    isBusy = false;
    rollBtn.disabled = false;
    updatePlayerPanels();
    updateStatus(`Player ${currentPlayer + 1}'s turn — roll the dice!`);
    return;
  }

  updateStatus(`Player ${playerNum} rolled ${roll} — moving to ${target}…`);
  await animateMove(currentPlayer, from, target);

  let landed = target;

  if (LADDERS[landed]) {
    const top = LADDERS[landed];
    updateStatus(`🪜 Ladder! Player ${playerNum} climbs from ${landed} to ${top}!`);
    await wait(400);
    await animateMove(currentPlayer, landed, top);
    landed = top;
  } else if (SNAKES[landed]) {
    const tail = SNAKES[landed];
    updateStatus(`🐍 Snake! Player ${playerNum} slides from ${landed} to ${tail}!`);
    await wait(400);
    await animateMove(currentPlayer, landed, tail);
    landed = tail;
  }

  if (landed === WIN_SQUARE) {
    wins[currentPlayer]++;
    updatePlayerPanels();
    updateStatus(`🎉 Player ${playerNum} wins! Landed on square 100!`);
    isBusy = true;
    rollBtn.disabled = true;
    return;
  }

  currentPlayer = currentPlayer === 0 ? 1 : 0;
  isBusy = false;
  rollBtn.disabled = false;
  updatePlayerPanels();
  updateStatus(`Player ${currentPlayer + 1}'s turn — roll the dice!`);
}

function newGame() {
  positions = [START_SQUARE, START_SQUARE];
  currentPlayer = 0;
  isBusy = false;
  rollBtn.disabled = false;
  diceEl.textContent = "1";
  updatePlayerPanels();
  renderTokens();
  updateStatus("Player 1's turn — roll the dice!");
}

function resetWins() {
  wins = [0, 0];
  newGame();
}

// --- Start the game ---
buildBoard();
renderTokens();
updatePlayerPanels();

rollBtn.addEventListener("click", handleRoll);
document.getElementById("new-game").addEventListener("click", newGame);
document.getElementById("reset-wins").addEventListener("click", resetWins);
window.addEventListener("resize", drawConnections);
