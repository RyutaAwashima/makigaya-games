const SIZE = 8;
const MAX_PAWNS = 15;
const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const turnBanner = document.getElementById("turnBanner");
const hintElement = document.getElementById("hint");
const moveModeButton = document.getElementById("moveMode");
const placeModeButton = document.getElementById("placeMode");
const resetButton = document.getElementById("resetButton");
const victoryOverlay = document.getElementById("victoryOverlay");
const victoryTitle = document.getElementById("victoryTitle");
const confettiElement = document.getElementById("confetti");
const victoryReset = document.getElementById("victoryReset");
const pawnCountElements = [document.getElementById("playerOnePawns"), document.getElementById("playerTwoPawns")];
const playerPanels = [document.getElementById("playerOnePanel"), document.getElementById("playerTwoPanel")];
const playerTwoName = document.getElementById("playerTwoName");
const opponentModeSelect = document.getElementById("opponentMode");
const cpuLevelSelect = document.getElementById("cpuLevel");

let state;
let cpuTimer = null;

function makeState() {
  return {
    board: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
    kings: [{ row: SIZE - 1, col: Math.floor(SIZE / 2) }, { row: 0, col: Math.floor(SIZE / 2) - 1 }],
    pawns: [[], []],
    currentPlayer: 0,
    mode: "move",
    selected: null,
    winner: null
  };
}

function resetGame() {
  if (cpuTimer !== null) window.clearTimeout(cpuTimer);
  cpuTimer = null;
  state = makeState();
  victoryOverlay.classList.remove("show");
  victoryOverlay.setAttribute("aria-hidden", "true");
  confettiElement.replaceChildren();
  render();
}

function isCpuMode() {
  return opponentModeSelect.value === "cpu";
}

function getPlayerLabel(player) {
  if (player === 1 && isCpuMode()) return "CPU";
  return `PLAYER ${player + 1}`;
}

function isCpuTurn() {
  return isCpuMode() && state.currentPlayer === 1 && state.winner === null;
}

function occupant(row, col) {
  for (let player = 0; player < 2; player++) {
    if (state.kings[player].row === row && state.kings[player].col === col) return { type: "king", player };
    if (state.pawns[player].some((pawn) => pawn.row === row && pawn.col === col)) return { type: "pawn", player };
  }
  return null;
}

function canMoveKing(from, to, player) {
  if (to.row < 0 || to.row >= SIZE || to.col < 0 || to.col >= SIZE || (from.row === to.row && from.col === to.col)) return false;
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;
  const distance = Math.max(Math.abs(rowDelta), Math.abs(colDelta));
  if (distance > 2) return false;
  if (distance === 2) {
    if (rowDelta !== 0 && colDelta !== 0 && Math.abs(rowDelta) !== Math.abs(colDelta)) return false;
    const pawn = occupant(from.row + Math.sign(rowDelta), from.col + Math.sign(colDelta));
    if (!pawn || pawn.type !== "pawn" || pawn.player !== player) return false;
  }
  const destination = occupant(to.row, to.col);
  return !destination || (destination.type === "king" && destination.player !== player);
}

function isValidDestination(row, col) {
  if (state.mode !== "move" || !state.selected) return false;
  return canMoveKing(state.selected, { row, col }, state.currentPlayer);
}

function getLegalKingMoves(player) {
  const moves = [];
  const king = state.kings[player];
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
    if (canMoveKing(king, { row, col }, player)) moves.push({ type: "move", row, col });
  }
  return moves;
}

function isLegalPawnPlacement(player, row, col) {
  if (state.pawns[player].length >= MAX_PAWNS || occupant(row, col)) return false;
  const pawns = state.pawns[player];
  return pawns.filter((pawn) => pawn.row === row).length < 3
    && pawns.filter((pawn) => pawn.col === col).length < 3;
}

function getLegalCpuActions(player) {
  const actions = getLegalKingMoves(player);
  if (state.pawns[player].length < MAX_PAWNS) {
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
      if (isLegalPawnPlacement(player, row, col)) actions.push({ type: "place", row, col });
    }
  }
  return actions;
}

function hasImmediateKingCapture(player) {
  const target = state.kings[1 - player];
  return getLegalKingMoves(player).some((move) => move.row === target.row && move.col === target.col);
}

function copyState(source) {
  return {
    ...source,
    kings: source.kings.map((king) => ({ ...king })),
    pawns: source.pawns.map((pawns) => pawns.map((pawn) => ({ ...pawn }))),
    selected: source.selected ? { ...source.selected } : null
  };
}

function scoreCpuAction(action) {
  const originalState = state;
  state = copyState(originalState);
  try {
    if (action.type === "move") {
      const target = occupant(action.row, action.col);
      if (target && target.type === "king" && target.player === 0) return 100000;
      state.kings[1] = { row: action.row, col: action.col };
    } else {
      state.pawns[1].push({ row: action.row, col: action.col });
    }

    if (hasImmediateKingCapture(0)) return -100000;
    const distance = Math.max(
      Math.abs(state.kings[1].row - state.kings[0].row),
      Math.abs(state.kings[1].col - state.kings[0].col)
    );
    let score = (SIZE - distance) * 6;
    score += getLegalKingMoves(1).length * 0.5;
    score -= getLegalKingMoves(0).length * 0.25;
    if (hasImmediateKingCapture(1)) score += 300;
    return score;
  } finally {
    state = originalState;
  }
}

function chooseCpuAction() {
  const actions = getLegalCpuActions(1);
  if (!actions.length) return null;
  const level = Number(cpuLevelSelect.value);
  const noiseRange = (10 - level) * 5;
  let bestAction = actions[0];
  let bestScore = -Infinity;
  for (const action of actions) {
    const noise = (Math.random() * 2 - 1) * noiseRange;
    const score = scoreCpuAction(action) + noise;
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }
  return bestAction;
}

function playCpuTurn() {
  cpuTimer = null;
  if (!isCpuTurn()) return;
  const action = chooseCpuAction();
  if (!action) return;
  if (action.type === "move") {
    state.mode = "move";
    state.selected = { ...state.kings[1] };
    moveKing(action.row, action.col);
    return;
  }
  state.mode = "place";
  state.pawns[1].push({ row: action.row, col: action.col });
  endTurn();
  render();
}

function scheduleCpuTurn() {
  if (isCpuTurn() && cpuTimer === null) {
    cpuTimer = window.setTimeout(playCpuTurn, 450);
  }
}

function endTurn() {
  state.selected = null;
  state.currentPlayer = 1 - state.currentPlayer;
}

function moveKing(row, col) {
  const player = state.currentPlayer;
  const target = occupant(row, col);
  state.kings[player] = { row, col };
  if (target && target.type === "king" && target.player !== player) {
    state.winner = player;
    showVictory(player);
  }
  if (state.winner === null) endTurn();
  render();
}

function hasThreePawnsInRowOrColumn(player, row, col) {
  const pawns = state.pawns[player];
  return pawns.filter((pawn) => pawn.row === row).length >= 3
    || pawns.filter((pawn) => pawn.col === col).length >= 3;
}

function showVictory(player) {
  victoryTitle.textContent = `${getPlayerLabel(player)} 勝利！`;
  confettiElement.replaceChildren();
  const colors = ["#2068a5", "#c34d48", "#f7d36b", "#58a878", "#f5f0df"];
  for (let index = 0; index < 70; index++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty("--drift", `${(Math.random() - .5) * 260}px`);
    piece.style.setProperty("--delay", `${Math.random() * .55}s`);
    piece.style.setProperty("--fall-time", `${1.8 + Math.random() * 1.5}s`);
    piece.style.setProperty("--confetti-color", colors[index % colors.length]);
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    confettiElement.append(piece);
  }
  victoryOverlay.classList.add("show");
  victoryOverlay.setAttribute("aria-hidden", "false");
}

function placePawn(row, col) {
  const player = state.currentPlayer;
  if (state.pawns[player].length >= MAX_PAWNS || occupant(row, col)) return;
  if (hasThreePawnsInRowOrColumn(player, row, col)) {
    statusElement.textContent = "自分の兵は、同じ行・列にそれぞれ3個までです。";
    return;
  }
  state.pawns[player].push({ row, col });
  endTurn();
  render();
}

function handleCellClick(row, col) {
  if (state.winner || isCpuTurn()) return;
  if (state.mode === "place") { placePawn(row, col); return; }
  const currentKing = state.kings[state.currentPlayer];
  if (!state.selected && row === currentKing.row && col === currentKing.col) {
    state.selected = { row, col }; render(); return;
  }
  if (state.selected && isValidDestination(row, col)) { moveKing(row, col); return; }
  if (row === currentKing.row && col === currentKing.col) { state.selected = { row, col }; render(); }
}

function render() {
  const cpuTurn = isCpuTurn();
  boardElement.replaceChildren();
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.disabled = cpuTurn || state.winner !== null;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `${row + 1}行 ${col + 1}列`);
    if (state.selected && state.selected.row === row && state.selected.col === col) cell.classList.add("selected");
    if (isValidDestination(row, col)) cell.classList.add("valid");
    const piece = occupant(row, col);
    if (piece) {
      const pieceElement = document.createElement("span");
      pieceElement.className = `piece ${piece.type} ${piece.player === 0 ? "blue" : "red"}`;
      pieceElement.textContent = piece.type === "king" ? "王" : "兵";
      cell.append(pieceElement);
    }
    cell.addEventListener("click", () => handleCellClick(row, col));
    boardElement.append(cell);
  }
  const player = state.currentPlayer;
  const label = getPlayerLabel(player);
  playerTwoName.textContent = isCpuMode() ? `CPU LEVEL ${cpuLevelSelect.value}` : "PLAYER 2";
  cpuLevelSelect.disabled = !isCpuMode();
  turnBanner.textContent = state.winner === null ? `${label} の番` : `${getPlayerLabel(state.winner)} の勝利`;
  turnBanner.style.color = player === 0 ? "var(--blue)" : "var(--red)";
  statusElement.textContent = state.winner === null ? (cpuTurn ? "CPUが考えています…" : `${label} が${state.mode === "move" ? "王を動かす" : "兵を置く"}番です。`) : `王を取りました。${getPlayerLabel(state.winner)} の勝ちです。`;
  hintElement.textContent = state.mode === "move" ? (state.selected ? "青い枠の周囲1マスへ移動できます。隣の自分の兵を飛び越えると2マス進めます" : "王をクリックして、移動先を選択") : "空いているマスをクリックして兵を配置";
  moveModeButton.classList.toggle("selected", state.mode === "move");
  placeModeButton.classList.toggle("selected", state.mode === "place");
  moveModeButton.disabled = cpuTurn || state.winner !== null;
  placeModeButton.disabled = cpuTurn || state.winner !== null || state.pawns[player].length >= MAX_PAWNS;
  pawnCountElements.forEach((element, index) => { element.textContent = MAX_PAWNS - state.pawns[index].length; });
  playerPanels.forEach((panel, index) => panel.classList.toggle("active", state.winner === null && index === player));
  scheduleCpuTurn();
}

moveModeButton.addEventListener("click", () => { if (!state.winner) { state.mode = "move"; state.selected = null; render(); } });
placeModeButton.addEventListener("click", () => { if (!state.winner && state.pawns[state.currentPlayer].length < MAX_PAWNS) { state.mode = "place"; state.selected = null; render(); } });
opponentModeSelect.addEventListener("change", resetGame);
cpuLevelSelect.addEventListener("change", render);
resetButton.addEventListener("click", resetGame);
victoryReset.addEventListener("click", resetGame);
window.addEventListener("keydown", (event) => { if (event.key.toLowerCase() === "r") resetGame(); });

resetGame();
