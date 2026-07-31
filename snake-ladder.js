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

      if (num === START_SQUARE) {
        cell.classList.add("snl-cell--start");
      }
      if (num === WIN_SQUARE) {
        cell.classList.add("snl-cell--finish");
      }
      if (LADDERS[num]) {
        cell.classList.add("snl-cell--ladder");
        cell.innerHTML = `<span class="snl-cell-icon">🪜</span><span class="snl-cell-num">${num}</span>`;
      } else if (SNAKES[num]) {
        cell.classList.add("snl-cell--snake");
        cell.innerHTML = `<span class="snl-cell-icon">🐍</span><span class="snl-cell-num">${num}</span>`;
      } else {
        cell.textContent = num;
      }

      const tokens = document.createElement("div");
      tokens.className = "snl-tokens";
      tokens.dataset.tokens = num;
      cell.appendChild(tokens);

      boardEl.appendChild(cell);
      cellMap[num] = cell;
    }
  }
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
