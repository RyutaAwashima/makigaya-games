const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const world = {
  width: canvas.width,
  height: canvas.height,
  gravity: 0.55,
  floorY: 620
};

const keys = new Set();
window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "r"].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

const player = {
  x: 140,
  y: 120,
  w: 46,
  h: 64,
  vx: 0,
  vy: 0,
  speed: 0.95,
  jumpPower: 12,
  grounded: false,
  color: "#1d6fa3"
};

function resetPlayer() {
  player.x = 140;
  player.y = 120;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
}

function readInput() {
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const jump = keys.has("w") || keys.has("arrowup");

  if (left) player.vx -= player.speed;
  if (right) player.vx += player.speed;

  if (jump && !player._jumpHeld && player.grounded) {
    player.vy = -player.jumpPower;
    player.grounded = false;
  }
  player._jumpHeld = jump;

  if (keys.has("r")) resetPlayer();
}

function update() {
  readInput();

  player.vy += world.gravity;
  player.vx *= player.grounded ? 0.78 : 0.93;

  player.x += player.vx;
  player.y += player.vy;

  if (player.y + player.h >= world.floorY) {
    player.y = world.floorY - player.h;
    player.vy = 0;
    player.grounded = true;
  }
}

function drawBackground(t) {
  const g = ctx.createLinearGradient(0, 0, 0, world.height);
  g.addColorStop(0, "#cce7ff");
  g.addColorStop(1, "#8ecae6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "#eff7ff";
  ctx.beginPath();
  ctx.ellipse(260 + Math.sin(t * 0.0003) * 20, 120, 180, 70, 0, 0, Math.PI * 2);
  ctx.ellipse(950 + Math.cos(t * 0.00025) * 24, 100, 220, 80, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStage() {
  ctx.fillStyle = "#f1f8ff";
  ctx.fillRect(0, world.floorY, world.width, world.height - world.floorY);
  ctx.fillStyle = "#7cb09f";
  ctx.fillRect(0, world.floorY + 8, world.width, world.height - world.floorY);
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(player.x, player.y + player.h - 8, player.w, 8);
}

function frame(t) {
  update();
  drawBackground(t);
  drawStage();
  drawPlayer();
  requestAnimationFrame(frame);
}

resetPlayer();
requestAnimationFrame(frame);
