"use strict";

/*
[License and COPYRIGHT]
FreeWayLike version 1.00.
著作権はFKS氏およびYoshihiro Sugahara氏に帰属します。
*/
const IntervalMilliTime = 1000 / 20;	// 描画間隔（ミリ秒）
const VIEW_NUM = 100;					// 表示道路数
const roadList = [];					// 道路データリスト

const SCREEN_Z = 1.0;
const road_W = 1200;

const UPDOWNMIN = 0;
const UPDOWNMAX = 300;
const UPDOWNSTEP = 20;

const cameraYBase = 500;
const cameraX = 0;
const cameraZ = -2;

const gaitouH = 800;		// 街灯の高さ
const roadStep = 0.5;

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
	if (MakeRoadUpdownStep !== 0) {
		MakeRoadUpdown += MakeRoadUpdownStep;
		if (MakeRoadUpdown > UPDOWNMAX || MakeRoadUpdown < UPDOWNMIN) {
			MakeRoadUpdown = Math.max(UPDOWNMIN, Math.min(UPDOWNMAX, MakeRoadUpdown));
			MakeRoadUpdownStep = 0;
		}
	}
}

function setNextRoadParameter() {
	if (Math.random() < 0.4) {
		MakeRoadUpdownStep = Math.random() * 10;
		if (MakeRoadUpdown <= UPDOWNMIN) {
		} else if (MakeRoadUpdown >= UPDOWNMAX) {
			MakeRoadUpdownStep *= -1;
		} else {
			if (Math.random() < 0.5) MakeRoadUpdownStep *= -1;
		}
	}
}

let isInitial = true;
function setNextRoadDatas() {
	while (roadList.length < VIEW_NUM) {
		//console.log("setNextRoadDatas:", roadList.length);
		let nextTargetTbl;
		if (isInitial) {
			nextTargetTbl = nextTargetTbl = makeRoadStraightTable(VIEW_NUM * 2);
		} else {
			const rndVal = Math.random();
			if (MakeRoadType === RoadTypes.STRAIGHT) {
				// カーブ
				MakeRoadType = RoadTypes.CURVE;
				if (rndVal < 0.6) {
					nextTargetTbl = makeRoadCurveTable(25 * 5, 0.5, 0.25, Math.random() < 0.8);
				} else if (rndVal < 0.9) {
					nextTargetTbl = makeRoadCurveTable(25 * 5, 2.0, 0.25, Math.random() < 0.8);
				} else {
					nextTargetTbl = makeRoadCurveTable(25 * 5, 3.0, 0.25, Math.random() < 0.8);
				}
			} else {
				// 直線
				MakeRoadType = RoadTypes.STRAIGHT;
				if (rndVal < 0.2) {
					nextTargetTbl = makeRoadStraightTable(25 * 3);
				} else if (rndVal < 0.9) {
					nextTargetTbl = makeRoadStraightTable(25 * 4);
				} else {
					nextTargetTbl = makeRoadStraightTable(25 * 6);
				}
			}
		}

		for (let i = 0; i < nextTargetTbl.length; i++) {
			let index = roadList.length;
			let visible = index % 5 === 0;
			let gaitou = visible && (index % 25 === 0);
			const r = nextTargetTbl[i];
			r.Visible = visible;
			r.HasGaitou = gaitou;
			setNextRoad(r);
			roadList.push(r);
		}
		setNextRoadParameter();
	}

	isInitial = false;
}

// 直線作成
function makeRoadStraightTable(roadLength) {
	const curveTbl = [];
	for (let i = 0; i < roadLength; i++) {
		curveTbl.push(new Road());
	}
	return curveTbl;
}

// カーブ作成
let rightCurve = true;
function makeRoadCurveTable(roadLength, maxCV, counterStep, isReverse) {
	const curveTbl = [];
	let counter = 0.0;
	for (let i = 0; i < roadLength; i++) {
		let r = new Road();
		r.Curve = maxCV;
		curveTbl.push(r);
	}

	let halfLength = curveTbl.length / 2;
	let bottomIndex = curveTbl.length - 1;

	for (let i = 0; i < halfLength; i++) {
		let cv = counter * counter;
		counter += counterStep;
		if (cv > maxCV) {
			cv = maxCV;
		}
		curveTbl[i].Curve = cv;
		curveTbl[bottomIndex - i].Curve = cv;
		if (cv >= maxCV) {
			break;
		}
	}

	// 左右反転
	if (isReverse) {
		rightCurve = !rightCurve;
	}
	if (rightCurve) {
		for (let r of curveTbl) {
			r.Curve = 0 - r.Curve;
		}
	}

	return curveTbl;
}

/* ===== Init ===== */

function initRoad() {
	// 初期データセット
	setNextRoadDatas();
}

/* ===== shooting star ===== */
let nextStarRemain;
let starX;
let starY;
let starDX = 1;
let starDY;
let starXOffset = 0;

function initStar() {
	nextStarRemain = ((Math.random() * 4 + 1) * 60 * 1000) / IntervalMilliTime;
	starX = 0;
	starY = 0;
	starDX *= -1;
	starDY = 1;
}

initRoad();
makeBG();
initStar();
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
	ctx.fillText('"FreeWayLike" version 1.10 SpecialThanks FKS氏＆Yoshihiro Sugahara氏.', 8, 8);
	ctx.fillText("フリーウェイライクへ････", 8, 32);

	const cameraY = cameraYBase + roadList[0].Y;

	// BG描画
	bgOffsetX = (bgOffsetX - roadList[0].Curve) % bgCanvas.width;
	let bgX = bgOffsetX;
	if (bgX > 0) bgX -= bgCanvas.width;
	bgOffsetY = (cameraY - cameraYBase) / UPDOWNSTEP;

	ctx.drawImage(bgCanvas, bgX, bgOffsetY);
	if (bgX != 0) ctx.drawImage(bgCanvas, bgX + bgCanvas.width, bgOffsetY);

	// 流れ星描画
	if (nextStarRemain <= 0) {
		if (nextStarRemain === 0) {
			starX = ScreenWHalf();
			starXOffset = bgOffsetX;
		}
		ctx.fillStyle = "#FF00FF";
		ctx.fillRect(starX + (bgOffsetX - starXOffset), starY, 1, 1);
		starX += starDX;
		starY += starDY;
		if (starY >= (ScreenHHalf() + bgOffsetY - 20)) {
			// 流れ星終了
			initStar();
		}
	}
	nextStarRemain--;

	// 道路描画
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
	//console.log("cx,sx,RoadCurve:", cx.toFixed(4) + "," + sx.toFixed(4) + "," + top.Curve.toFixed(4) + " Y:" + top.Y.toFixed(4));
	setNextRoadDatas();
}

setInterval(draw, IntervalMilliTime);