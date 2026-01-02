const ROAD_NUM = 100;
const VIEW_NUM = 100;

const SCREEN_Z = 1.0;
let road_W = 1200;

const UPDOWNMIN = 0;
const UPDOWNMAX = 300;
const UPDOWNSTEP = 20;

let cameraYBase = 500;
let cameraX = 0;
let cameraZ = -2;

let gaitouH = 800;
let roadStep = 0.25;

let bgOffsetX = 0;
let bgOffsetY = 0;

const canvas = document.getElementById("cv");
const ctx = canvas.getContext("2d");

function resize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	makeBG();
}
window.addEventListener("resize", resize);
//resize();

const ScreenW = () => canvas.width;
const ScreenH = () => canvas.height;
const ScreenWHalf = () => canvas.width / 2;
const ScreenHHalf = () => canvas.height / 2;

/* ===== Road ===== */

class Road {
	constructor() {
		this.Y = 0;
		this.Curve = 0;
		this.Visible = false;
		this.HasGaitou = false;
	}
}

const RoadTypes = {
	STRAIGHT: 0,
	CURVE: 1
};

let MakeRoadUpdown = 0;
let MakeRoadUpdownStep = 0;
let MakeRoadType = RoadTypes.STRAIGHT;
let MakeRoadCount = 0;
let MakeRoadCurve = 0;

const roadList = [];
const rnd = Math.random;

/* ===== Background ===== */

let bgCanvas, bgCtx;

function makeBG() {
	bgCanvas = document.createElement("canvas");
	bgCanvas.width = ScreenW();
	bgCanvas.height = ScreenH();
	bgCtx = bgCanvas.getContext("2d");

	const HOME_BOTTOM = bgCanvas.height / 2 - 5;

	// 建物
	for (let i = 0; i < 150; i++) {
		const x = Math.random() * bgCanvas.width;
		const y = HOME_BOTTOM - Math.random() * 4;
		bgCtx.fillStyle = "yellow";
		bgCtx.fillRect(x, y, 1, 1);
	}

	// 航空障害灯
	for (let i = 0; i < 10; i++) {
		const x = Math.random() * bgCanvas.width;
		const y = HOME_BOTTOM - 2 - Math.random() * 2;
		bgCtx.fillStyle = Math.random() < 0.8 ? "red" : "lightblue";
		bgCtx.fillRect(x, y, 1, 1);
	}

	// 星
	for (let i = 0; i < 50; i++) {
		const x = Math.random() * bgCanvas.width;
		const y = Math.random() * (bgCanvas.height / 3);
		bgCtx.fillStyle = "lightblue";
		bgCtx.fillRect(x, y, 1, 1);
	}
}

/* ===== Road generation ===== */

function setNextRoad(road) {
	road.Y = MakeRoadUpdown;
	road.Curve = (MakeRoadType === RoadTypes.CURVE) ? MakeRoadCurve : 0;

	if (MakeRoadUpdownStep !== 0) {
		MakeRoadUpdown += MakeRoadUpdownStep;
		if (MakeRoadUpdown > UPDOWNMAX || MakeRoadUpdown < UPDOWNMIN) {
			MakeRoadUpdown = Math.max(UPDOWNMIN, Math.min(UPDOWNMAX, MakeRoadUpdown));
			MakeRoadUpdownStep = 0;
		}
	}

	MakeRoadCount--;
	if (MakeRoadCount <= 0) {
		const next =
			MakeRoadType === RoadTypes.STRAIGHT
				? RoadTypes.CURVE
				: RoadTypes.STRAIGHT;
		setNextRoadParameter(next);
	}
}

function setNextRoadParameter(type) {
	const length = 10 + Math.floor(Math.random() * 30);

	MakeRoadType = type;
	MakeRoadCount = length;
	MakeRoadCurve = 0;

	if (type === RoadTypes.CURVE) {
		MakeRoadCurve = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
	}

	if (Math.random() < 0.4) {
		MakeRoadUpdownStep = Math.random() * 20;
		if (Math.random() < 0.5) MakeRoadUpdownStep *= -1;
	}
}

/* ===== Init ===== */

function initRoad() {
	for (let i = 0; i < ROAD_NUM; i++) {
		const r = new Road();
		if (i % 5 === 0) {
			r.Visible = true;
			if (i % 25 === 0) r.HasGaitou = true;
		}
		roadList.push(r);
	}
}

initRoad();
makeBG();
resize();

/* ===== Draw ===== */

function drawRoad(px, py, pw, color) {
	ctx.fillStyle = color;
	ctx.fillRect(px - pw / 2, py, 1, 1);
	ctx.fillRect(px + pw / 2, py, 1, 1);
}

function draw() {
	ctx.clearRect(0, 0, ScreenW(), ScreenH());

	ctx.fillStyle = "white";
	ctx.font = "16px sans-serif";
	ctx.textBaseline = "top";
	ctx.fillText('"FreeWayLike" version 1.00 (c) 2026 by zzo', 8, 8);
	ctx.fillText("フリーウェイライクへ････", 8, 32);

	const cameraY = cameraYBase + roadList[0].Y;

	// BG
	bgOffsetX -= roadList[0].Curve;
	let bgX = bgOffsetX % bgCanvas.width;
	bgOffsetY = (cameraY - cameraYBase) / UPDOWNSTEP;

	ctx.drawImage(bgCanvas, bgX, bgOffsetY);
	ctx.drawImage(bgCanvas, bgX + bgCanvas.width, bgOffsetY);

	let minY = ScreenH();
	let sx = 0, cx = 0;

	for (let i = 0; i < VIEW_NUM; i++) {
		const road = roadList[i];
		const roadZ = i * roadStep;
		const dist = roadZ - cameraZ;
		if (dist === 0) continue;

		const scale = SCREEN_Z / dist;

		const px = ScreenWHalf() + (sx - cameraX) * scale;
		const py = ScreenHHalf() + (cameraY - road.Y) * scale;
		const pw = road_W * scale;

		cx += road.Curve;
		sx += cx;

		if (py < minY && road.Visible) {
			drawRoad(px, py, pw, "white");
			if (road.HasGaitou) {
				drawRoad(px, py - gaitouH * scale, pw, "yellow");
			}
			minY = py;
		}
	}

	const top = roadList.shift();
	setNextRoad(top);
	roadList.push(top);
}

setInterval(draw, 50);
