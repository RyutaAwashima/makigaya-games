const SIZE = 7;
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

let state;

function makeState() {
  return {
    board: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
    kings: [{ row: SIZE - 1, col: Math.floor(SIZE / 2) }, { row: 0, col: Math.floor(SIZE / 2) }],
    pawns: [[], []],
    currentPlayer: 0,
    mode: "move",
    selected: null,
    winner: null
  };
}

function resetGame() {
  state = makeState();
  victoryOverlay.classList.remove("show");
  victoryOverlay.setAttribute("aria-hidden", "true");
  confettiElement.replaceChildren();
  render();
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
  if (Math.abs(to.row - from.row) > 1 || Math.abs(to.col - from.col) > 1) return false;
  const destination = occupant(to.row, to.col);
  return !destination || (destination.type === "king" && destination.player !== player);
}

function isValidDestination(row, col) {
  if (state.mode !== "move" || !state.selected) return false;
  return canMoveKing(state.selected, { row, col }, state.currentPlayer);
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

function hasAdjacentPawn(row, col) {
  return state.pawns.some((pawns) => pawns.some((pawn) => Math.abs(pawn.row - row) <= 1 && Math.abs(pawn.col - col) <= 1));
}

function showVictory(player) {
  victoryTitle.textContent = `PLAYER ${player + 1} 勝利！`;
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
  if (hasAdjacentPawn(row, col)) {
    statusElement.textContent = "兵は、ほかの兵と隣り合って置けません。";
    return;
  }
  state.pawns[player].push({ row, col });
  endTurn();
  render();
}

function handleCellClick(row, col) {
  if (state.winner) return;
  if (state.mode === "place") { placePawn(row, col); return; }
  const currentKing = state.kings[state.currentPlayer];
  if (!state.selected && row === currentKing.row && col === currentKing.col) {
    state.selected = { row, col }; render(); return;
  }
  if (state.selected && isValidDestination(row, col)) { moveKing(row, col); return; }
  if (row === currentKing.row && col === currentKing.col) { state.selected = { row, col }; render(); }
}

function render() {
  boardElement.replaceChildren();
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
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
  const label = player === 0 ? "PLAYER 1" : "PLAYER 2";
  turnBanner.textContent = state.winner === null ? `${label} の番` : `PLAYER ${state.winner + 1} の勝利`;
  turnBanner.style.color = player === 0 ? "var(--blue)" : "var(--red)";
  statusElement.textContent = state.winner === null ? `${label} が${state.mode === "move" ? "王を動かす" : "兵を置く"}番です。` : `王を取りました。PLAYER ${state.winner + 1} の勝ちです。`;
  hintElement.textContent = state.mode === "move" ? (state.selected ? "青い枠の周囲1マスへ移動できます" : "王をクリックして、移動先を選択") : "空いているマスをクリックして兵を配置";
  moveModeButton.classList.toggle("selected", state.mode === "move");
  placeModeButton.classList.toggle("selected", state.mode === "place");
  placeModeButton.disabled = state.pawns[player].length >= MAX_PAWNS;
  pawnCountElements.forEach((element, index) => { element.textContent = MAX_PAWNS - state.pawns[index].length; });
  playerPanels.forEach((panel, index) => panel.classList.toggle("active", state.winner === null && index === player));
}

moveModeButton.addEventListener("click", () => { if (!state.winner) { state.mode = "move"; state.selected = null; render(); } });
placeModeButton.addEventListener("click", () => { if (!state.winner && state.pawns[state.currentPlayer].length < MAX_PAWNS) { state.mode = "place"; state.selected = null; render(); } });
resetButton.addEventListener("click", resetGame);
victoryReset.addEventListener("click", resetGame);
window.addEventListener("keydown", (event) => { if (event.key.toLowerCase() === "r") resetGame(); });

resetGame();
