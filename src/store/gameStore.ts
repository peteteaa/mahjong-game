import { create } from "zustand";
import { chooseClaim, chooseDiscard, shouldDeclareKong } from "@/game/ai";
import { chowPairs, completesHand, shanten, waits } from "@/game/melds";
import { type Rng, mulberry32 } from "@/game/random";
import { scoreHand } from "@/game/scoring";
import {
	KIND_COUNT,
	countKinds,
	nameOf,
	removeTile,
	shortLabel,
	takeKind,
} from "@/game/tiles";
import type {
	BonusTile,
	ClaimOption,
	HandResult,
	Kind,
	Meld,
	Player,
	Seat,
	Tile,
} from "@/game/types";
import { type WallTile, buildWall } from "@/game/wall";

const SEAT_NAMES = ["You", "Right", "Across", "Left"];

/** "You call" but "Left calls". */
const verb = (seat: Seat, word: string) => (seat === 0 ? word : `${word}s`);
const WIND_LABELS = ["East", "South", "West", "North"];
const REPLACEMENT_TILES = 14;

/**
 * Base pacing for the computer players, in milliseconds. Every delay is divided
 * by the player's chosen speed; the headless simulator sets these to 0.
 */
export const timing = { think: 550, claim: 350, deal: 400 };

export interface SpeedPreset {
	label: string;
	/** Multiplier applied to the base delays above. */
	value: number;
}

export const SPEED_PRESETS: SpeedPreset[] = [
	{ label: "Relaxed", value: 0.6 },
	{ label: "Normal", value: 1 },
	{ label: "Brisk", value: 2 },
	{ label: "Blitz", value: 4 },
];

const STORAGE_KEYS = {
	speed: "hk-mahjong:speed",
	callButtons: "hk-mahjong:call-buttons",
	flatHand: "hk-mahjong:flat-hand",
};

/** Reading and writing preferences must survive a blocked storage API. */
function readStored<T>(key: string, parse: (raw: string) => T, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? fallback : parse(raw);
	} catch {
		return fallback;
	}
}

function writeStored(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// A blocked storage API only costs us the remembered preference.
	}
}

function storedSpeed(): number {
	return readStored(
		STORAGE_KEYS.speed,
		(raw) => {
			const value = Number(raw);
			return SPEED_PRESETS.some((preset) => preset.value === value)
				? value
				: 1;
		},
		1,
	);
}

export type Phase = "home" | "playing" | "handOver" | "gameOver";
export type Awaiting = null | "turn" | "claim";

export interface LogEntry {
	id: number;
	text: string;
	seat?: Seat;
	highlight?: boolean;
}

export interface TurnAction {
	type: "win" | "kong" | "addedKong";
	kind: Kind;
	label: string;
	/** What the hand would score, for a winning action. */
	faan?: number;
}

interface GameState {
	phase: Phase;
	runId: number;
	players: Player[];
	wall: WallTile[];
	replacements: WallTile[];
	turn: Seat;
	dealer: Seat;
	roundWind: Seat;
	handNumber: number;
	maxHands: number;
	minFaan: number;
	/** Multiplier on the computer players' thinking time. */
	speed: number;
	/** Whether the always-visible chow/pung/kong/win bar is shown. */
	showCallButtons: boolean;
	/** Whether hands lie flat on the table instead of standing up. */
	flatHand: boolean;
	lastDiscard: { tile: Tile; from: Seat } | null;
	drawnTileId: string | null;
	awaiting: Awaiting;
	claimOptions: ClaimOption[];
	turnActions: TurnAction[];
	result: HandResult | null;
	log: LogEntry[];
	thinking: Seat | null;
	/** Set while the current player's tile came from a kong replacement draw. */
	afterKong: boolean;
	/** An added kong the human is being offered the chance to rob. */
	robbing: { seat: Seat; kind: Kind; tile: Tile } | null;

	startGame: (opts: { minFaan: number; hands: number; seed?: number }) => void;
	setSpeed: (speed: number) => void;
	setShowCallButtons: (show: boolean) => void;
	setFlatHand: (flat: boolean) => void;
	startHand: () => void;
	nextHand: () => void;
	goHome: () => void;
	humanDiscard: (tileId: string) => void;
	humanClaim: (option: ClaimOption) => void;
	humanPass: () => void;
	humanTurnAction: (action: TurnAction) => void;
	seatWind: (seat: Seat) => number;
	handAdvice: () => { shanten: number; waits: Kind[] };
}

let rng: Rng = mulberry32(Date.now() >>> 0);
let logId = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();

function clearTimers() {
	for (const timer of timers) clearTimeout(timer);
	timers.clear();
}

function makePlayers(): Player[] {
	return SEAT_NAMES.map((name, seat) => ({
		seat,
		name,
		isHuman: seat === 0,
		hand: [],
		melds: [],
		bonus: [],
		discards: [],
		points: 0,
	}));
}

function nextSeat(seat: Seat): Seat {
	return (seat + 1) % 4;
}

function meldKindCount(player: Player): number {
	return player.melds.length;
}

/** Every tile kind visible to a given seat: its own hand, all melds, all discards. */
function visibleCounts(players: Player[], seat: Seat): number[] {
	const counts = new Array<number>(KIND_COUNT).fill(0);
	for (const tile of players[seat].hand) counts[tile.kind] += 1;
	for (const player of players) {
		for (const meld of player.melds)
			for (const tile of meld.tiles) counts[tile.kind] += 1;
		for (const tile of player.discards) counts[tile.kind] += 1;
	}
	return counts;
}

export const useGameStore = create<GameState>((set, get) => {
	const schedule = (fn: () => void, delay: number) => {
		const runId = get().runId;
		const timer = setTimeout(
			() => {
				timers.delete(timer);
				if (get().runId !== runId) return;
				fn();
			},
			delay / (get().speed || 1),
		);
		timers.add(timer);
	};

	const log = (text: string, seat?: Seat, highlight?: boolean) => {
		set((state) => ({
			log: [{ id: logId++, text, seat, highlight }, ...state.log].slice(0, 60),
		}));
	};

	const seatWindOf = (seat: Seat) => (seat - get().dealer + 4) % 4;

	/** Pulls the next playable tile, banking any bonus tiles it hits. */
	const drawFrom = (
		source: "wall" | "replacements",
		seat: Seat,
	): Tile | null => {
		while (true) {
			const state = get();
			const stack = source === "wall" ? state.wall : state.replacements;
			if (stack.length === 0) {
				if (source === "replacements") return drawFrom("wall", seat);
				return null;
			}
			const [next, ...rest] = stack;
			set(
				source === "wall"
					? { wall: rest }
					: ({ replacements: rest } as Partial<GameState>),
			);
			if (next.tile) return next.tile;
			if (next.bonus) {
				const bonus: BonusTile = next.bonus;
				set((s) => ({
					players: s.players.map((p) =>
						p.seat === seat ? { ...p, bonus: [...p.bonus, bonus] } : p,
					),
				}));
				// Flowers are set aside and replaced from the back of the wall.
				source = "replacements";
			}
		}
	};

	const endHand = (result: HandResult) => {
		clearTimers();
		set((state) => ({
			phase: "handOver",
			result,
			awaiting: null,
			thinking: null,
			claimOptions: [],
			turnActions: [],
			players: state.players.map((p) => ({
				...p,
				points: p.points + result.deltas[p.seat],
			})),
		}));
	};

	const declareWin = (
		seat: Seat,
		winningTile: Tile,
		selfDraw: boolean,
		from?: Seat,
		flags?: { afterKong?: boolean; robbedKong?: boolean },
	) => {
		const state = get();
		const player = state.players[seat];
		const score = scoreHand({
			concealed: player.hand,
			melds: player.melds,
			bonus: player.bonus,
			winningTile: winningTile.kind,
			seatWind: seatWindOf(seat),
			roundWind: state.roundWind,
			selfDraw,
			afterKong: flags?.afterKong,
			robbedKong: flags?.robbedKong,
			lastTile: state.wall.length === 0,
		});

		const deltas = [0, 0, 0, 0];
		if (selfDraw) {
			for (let s = 0; s < 4; s++) {
				if (s === seat) continue;
				deltas[s] -= score.points;
				deltas[seat] += score.points;
			}
		} else if (from !== undefined) {
			deltas[from] -= score.points;
			deltas[seat] += score.points;
		}

		log(
			`${player.name} ${verb(seat, "win")} with ${score.faan} faan (${score.points} pts)`,
			seat,
			true,
		);
		endHand({
			kind: "win",
			winner: seat,
			loser: from,
			selfDraw,
			score,
			deltas,
		});
	};

	/** Claims every other seat could make on the tile just discarded. */
	const claimsFor = (seat: Seat, discard: Tile, from: Seat): ClaimOption[] => {
		const state = get();
		const player = state.players[seat];
		const counts = countKinds(player.hand);
		const options: ClaimOption[] = [];

		if (completesHand(counts, meldKindCount(player), discard.kind)) {
			const score = scoreHand({
				concealed: [...player.hand, discard],
				melds: player.melds,
				bonus: player.bonus,
				winningTile: discard.kind,
				seatWind: seatWindOf(seat),
				roundWind: state.roundWind,
				selfDraw: false,
			});
			if (score.faan >= state.minFaan)
				options.push({
					type: "win",
					seat,
					label: `Win (${score.faan} faan)`,
					faan: score.faan,
				});
		}
		if (counts[discard.kind] >= 3)
			options.push({ type: "kong", seat, label: "Kong" });
		if (counts[discard.kind] >= 2)
			options.push({ type: "pung", seat, label: "Pung" });
		if (seat === nextSeat(from)) {
			for (const pair of chowPairs(counts, discard.kind)) {
				const tiles = pair
					.map((kind) => player.hand.find((t) => t.kind === kind))
					.filter((t): t is Tile => Boolean(t));
				if (tiles.length === 2)
					options.push({
						type: "chow",
						seat,
						tiles,
						label: `Chow ${[...pair, discard.kind]
							.sort((a, b) => a - b)
							.map(shortLabel)
							.join(" ")}`,
					});
			}
		}
		return options;
	};

	const claimPriority = (option: ClaimOption): number =>
		option.type === "win" ? 3 : option.type === "chow" ? 1 : 2;

	const applyClaim = (option: ClaimOption) => {
		const state = get();
		const discard = state.lastDiscard;
		if (!discard) return;
		const seat = option.seat;
		const player = state.players[seat];

		if (option.type === "win") {
			// Move the claimed tile into the hand before scoring.
			set((s) => ({
				players: s.players.map((p) =>
					p.seat === seat ? { ...p, hand: [...p.hand, discard.tile] } : p,
				),
				lastDiscard: null,
			}));
			set((s) => ({
				players: s.players.map((p) =>
					p.seat === discard.from
						? { ...p, discards: p.discards.slice(0, -1) }
						: p,
				),
			}));
			declareWin(seat, discard.tile, false, discard.from);
			return;
		}

		let meld: Meld;
		let hand = player.hand;
		if (option.type === "chow" && option.tiles) {
			const tiles = [...option.tiles, discard.tile].sort(
				(a, b) => a.kind - b.kind,
			);
			for (const tile of option.tiles) hand = removeTile(hand, tile.id);
			meld = {
				type: "chow",
				kinds: tiles.map((t) => t.kind),
				tiles,
				concealed: false,
				from: discard.from,
			};
		} else {
			const need = option.type === "kong" ? 3 : 2;
			const { taken, rest } = takeKind(hand, discard.tile.kind, need);
			hand = rest;
			const tiles = [...taken, discard.tile];
			meld = {
				type: option.type === "kong" ? "kong" : "pung",
				kinds: tiles.map((t) => t.kind),
				tiles,
				concealed: false,
				from: discard.from,
			};
		}

		set((s) => ({
			players: s.players.map((p) => {
				if (p.seat === seat) return { ...p, hand, melds: [...p.melds, meld] };
				if (p.seat === discard.from)
					return { ...p, discards: p.discards.slice(0, -1) };
				return p;
			}),
			lastDiscard: null,
			turn: seat,
			claimOptions: [],
			awaiting: null,
		}));

		log(
			`${player.name} ${verb(seat, "call")} ${option.type} on ${nameOf(
				discard.tile.kind,
			)}`,
			seat,
		);

		if (option.type === "kong") {
			drawReplacementAndContinue(seat);
			return;
		}

		set({ afterKong: false });
		promptDiscard(seat);
	};

	const exhaustiveDraw = () => {
		log("Wall exhausted — the hand is a wash", undefined, true);
		endHand({ kind: "draw", deltas: [0, 0, 0, 0] });
	};

	/** Offers the human their options, or lets the AI act. */
	const promptDiscard = (seat: Seat) => {
		if (seat === 0) {
			set({ awaiting: "turn", turnActions: [], thinking: null });
			return;
		}
		set({ thinking: seat });
		schedule(() => {
			const state = get();
			const player = state.players[seat];
			const tile = chooseDiscard({
				player,
				visible: visibleCounts(state.players, seat),
				seatWind: seatWindOf(seat),
				roundWind: state.roundWind,
				rng,
			});
			doDiscard(seat, tile.id);
		}, timing.think);
	};

	/** Shared post-draw logic: check for a win, kongs, then discard. */
	const afterDraw = (seat: Seat, drawn: Tile) => {
		const state = get();
		const player = state.players[seat];
		const counts = countKinds(player.hand);
		counts[drawn.kind] -= 1;
		const meldCount = meldKindCount(player);

		const canWin = completesHand(counts, meldCount, drawn.kind);
		const score = canWin
			? scoreHand({
					concealed: player.hand,
					melds: player.melds,
					bonus: player.bonus,
					winningTile: drawn.kind,
					seatWind: seatWindOf(seat),
					roundWind: state.roundWind,
					selfDraw: true,
					afterKong: state.afterKong,
				})
			: null;

		const handCounts = countKinds(player.hand);
		const actions: TurnAction[] = [];
		if (score && score.faan >= state.minFaan)
			actions.push({
				type: "win",
				kind: drawn.kind,
				label: `Win — self draw (${score.faan} faan)`,
				faan: score.faan,
			});
		for (let kind = 0; kind < KIND_COUNT; kind++) {
			if (handCounts[kind] === 4)
				actions.push({
					type: "kong",
					kind,
					label: `Kong ${nameOf(kind)}`,
				});
			else if (handCounts[kind] >= 1) {
				const pung = player.melds.find(
					(m) => m.type === "pung" && m.kinds[0] === kind,
				);
				if (pung)
					actions.push({
						type: "addedKong",
						kind,
						label: `Add to pung — ${nameOf(kind)}`,
					});
			}
		}

		if (seat === 0) {
			set({ turnActions: actions, awaiting: "turn", thinking: null });
			return;
		}

		set({ thinking: seat });
		schedule(() => {
			const winAction = actions.find((a) => a.type === "win");
			if (winAction) {
				declareWin(seat, drawn, true, undefined, {
					afterKong: get().afterKong,
				});
				return;
			}
			const kongAction = actions.find((a) => a.type === "kong");
			if (
				kongAction &&
				shouldDeclareKong(
					{
						player: get().players[seat],
						visible: visibleCounts(get().players, seat),
						seatWind: seatWindOf(seat),
						roundWind: get().roundWind,
						rng,
					},
					kongAction.kind,
				)
			) {
				declareConcealedKong(seat, kongAction.kind);
				return;
			}
			const state2 = get();
			const tile = chooseDiscard({
				player: state2.players[seat],
				visible: visibleCounts(state2.players, seat),
				seatWind: seatWindOf(seat),
				roundWind: state2.roundWind,
				rng,
			});
			doDiscard(seat, tile.id);
		}, timing.think);
	};

	const declareConcealedKong = (seat: Seat, kind: Kind) => {
		const state = get();
		const player = state.players[seat];
		const { taken, rest } = takeKind(player.hand, kind, 4);
		const meld: Meld = {
			type: "kong",
			kinds: taken.map((t) => t.kind),
			tiles: taken,
			concealed: true,
		};
		set((s) => ({
			players: s.players.map((p) =>
				p.seat === seat ? { ...p, hand: rest, melds: [...p.melds, meld] } : p,
			),
			turnActions: [],
			awaiting: null,
		}));
		log(
			`${player.name} ${verb(seat, "declare")} a concealed kong of ${nameOf(kind)}`,
			seat,
		);
		drawReplacementAndContinue(seat);
	};

	const drawReplacementAndContinue = (seat: Seat) => {
		const replacement = drawFrom("replacements", seat);
		if (!replacement) {
			exhaustiveDraw();
			return;
		}
		set((s) => ({
			players: s.players.map((p) =>
				p.seat === seat ? { ...p, hand: [...p.hand, replacement] } : p,
			),
			drawnTileId: seat === 0 ? replacement.id : null,
			afterKong: true,
		}));
		afterDraw(seat, replacement);
	};

	const completeAddedKong = (seat: Seat, kind: Kind, tile: Tile) => {
		set((s) => ({
			players: s.players.map((p) =>
				p.seat === seat
					? {
							...p,
							melds: p.melds.map((m) =>
								m.type === "pung" && m.kinds[0] === kind
									? {
											...m,
											type: "kong" as const,
											kinds: [...m.kinds, kind],
											tiles: [...m.tiles, tile],
										}
									: m,
							),
						}
					: p,
			),
			turnActions: [],
			awaiting: null,
		}));
		log(
			`${get().players[seat].name} ${verb(seat, "add")} to a pung for a kong of ${nameOf(
				kind,
			)}`,
			seat,
		);
		drawReplacementAndContinue(seat);
	};

	/** Score a hand that would be completed by claiming `tile`. */
	const claimedWinScore = (
		seat: Seat,
		tile: Tile,
		flags?: { robbedKong?: boolean },
	) => {
		const state = get();
		const player = state.players[seat];
		return scoreHand({
			concealed: [...player.hand, tile],
			melds: player.melds,
			bonus: player.bonus,
			winningTile: tile.kind,
			seatWind: seatWindOf(seat),
			roundWind: state.roundWind,
			selfDraw: false,
			robbedKong: flags?.robbedKong,
		});
	};

	const declareAddedKong = (seat: Seat, kind: Kind) => {
		const player = get().players[seat];
		const tile = player.hand.find((t) => t.kind === kind);
		if (!tile) return;

		// The tile leaves the hand either way: it is robbed, or it joins the kong.
		set((s) => ({
			players: s.players.map((p) =>
				p.seat === seat ? { ...p, hand: removeTile(p.hand, tile.id) } : p,
			),
			turnActions: [],
			awaiting: null,
		}));

		for (let offset = 1; offset < 4; offset++) {
			const other = (seat + offset) % 4;
			const otherPlayer = get().players[other];
			if (
				!completesHand(
					countKinds(otherPlayer.hand),
					meldKindCount(otherPlayer),
					kind,
				)
			)
				continue;
			const score = claimedWinScore(other, tile, { robbedKong: true });
			if (score.faan < get().minFaan) continue;

			if (other === 0) {
				set({
					robbing: { seat, kind, tile },
					claimOptions: [
						{
							type: "win",
							seat: 0,
							label: `Rob the kong (${score.faan} faan)`,
							faan: score.faan,
						},
					],
					awaiting: "claim",
					thinking: null,
				});
				return;
			}
			set((s) => ({
				players: s.players.map((p) =>
					p.seat === other ? { ...p, hand: [...p.hand, tile] } : p,
				),
			}));
			declareWin(other, tile, false, seat, { robbedKong: true });
			return;
		}

		completeAddedKong(seat, kind, tile);
	};

	const beginTurn = (seat: Seat) => {
		if (get().wall.length === 0) {
			exhaustiveDraw();
			return;
		}
		set({ turn: seat, afterKong: false, claimOptions: [], turnActions: [] });
		const drawn = drawFrom("wall", seat);
		if (!drawn) {
			exhaustiveDraw();
			return;
		}
		set((s) => ({
			players: s.players.map((p) =>
				p.seat === seat ? { ...p, hand: [...p.hand, drawn] } : p,
			),
			drawnTileId: seat === 0 ? drawn.id : null,
		}));
		afterDraw(seat, drawn);
	};

	const resolveClaims = () => {
		const state = get();
		const discard = state.lastDiscard;
		if (!discard) return;

		const aiClaims: ClaimOption[] = [];
		let humanOptions: ClaimOption[] = [];
		for (let offset = 1; offset < 4; offset++) {
			const seat = (discard.from + offset) % 4;
			const options = claimsFor(seat, discard.tile, discard.from);
			if (options.length === 0) continue;
			if (seat === 0) {
				humanOptions = options;
				continue;
			}
			const choice = chooseClaim(
				{
					player: state.players[seat],
					visible: visibleCounts(state.players, seat),
					seatWind: seatWindOf(seat),
					roundWind: state.roundWind,
					rng,
				},
				options,
				discard.tile.kind,
			);
			if (choice) aiClaims.push(choice);
		}

		if (humanOptions.length > 0) {
			set({ claimOptions: humanOptions, awaiting: "claim", thinking: null });
			pendingAiClaims = aiClaims;
			return;
		}
		pendingAiClaims = [];
		settleClaims(aiClaims);
	};

	let pendingAiClaims: ClaimOption[] = [];

	const settleClaims = (claims: ClaimOption[]) => {
		const discard = get().lastDiscard;
		if (!discard) return;
		if (claims.length === 0) {
			schedule(() => beginTurn(nextSeat(discard.from)), timing.claim);
			return;
		}
		const ordered = [...claims].sort((a, b) => {
			const byPriority = claimPriority(b) - claimPriority(a);
			if (byPriority !== 0) return byPriority;
			const distance = (seat: Seat) => (seat - discard.from + 4) % 4;
			return distance(a.seat) - distance(b.seat);
		});
		schedule(() => applyClaim(ordered[0]), timing.claim);
	};

	const doDiscard = (seat: Seat, tileId: string) => {
		const state = get();
		const player = state.players[seat];
		const tile = player.hand.find((t) => t.id === tileId);
		if (!tile) return;
		set((s) => ({
			players: s.players.map((p) =>
				p.seat === seat
					? {
							...p,
							hand: removeTile(p.hand, tileId),
							discards: [...p.discards, tile],
						}
					: p,
			),
			lastDiscard: { tile, from: seat },
			drawnTileId: null,
			awaiting: null,
			turnActions: [],
			thinking: null,
		}));
		resolveClaims();
	};

	return {
		phase: "home",
		runId: 0,
		players: makePlayers(),
		wall: [],
		replacements: [],
		turn: 0,
		dealer: 0,
		roundWind: 0,
		handNumber: 1,
		maxHands: 4,
		minFaan: 1,
		speed: storedSpeed(),
		showCallButtons: readStored(
			STORAGE_KEYS.callButtons,
			(raw) => raw !== "false",
			true,
		),
		flatHand: readStored(STORAGE_KEYS.flatHand, (raw) => raw === "true", false),
		lastDiscard: null,
		drawnTileId: null,
		awaiting: null,
		claimOptions: [],
		turnActions: [],
		result: null,
		log: [],
		thinking: null,
		afterKong: false,
		robbing: null,

		seatWind: seatWindOf,

		setSpeed: (speed) => {
			set({ speed });
			writeStored(STORAGE_KEYS.speed, String(speed));
		},

		setShowCallButtons: (show) => {
			set({ showCallButtons: show });
			writeStored(STORAGE_KEYS.callButtons, String(show));
		},

		setFlatHand: (flat) => {
			set({ flatHand: flat });
			writeStored(STORAGE_KEYS.flatHand, String(flat));
		},

		startGame: ({ minFaan, hands, seed }) => {
			clearTimers();
			rng = mulberry32((seed ?? Date.now()) >>> 0);
			logId = 0;
			set((state) => ({
				runId: state.runId + 1,
				players: makePlayers(),
				minFaan,
				maxHands: hands,
				handNumber: 1,
				dealer: 0,
				roundWind: 0,
				log: [],
				result: null,
			}));
			get().startHand();
		},

		startHand: () => {
			clearTimers();
			const state = get();
			const full = buildWall(rng);
			const replacements = full.slice(full.length - REPLACEMENT_TILES);
			let wall = full.slice(0, full.length - REPLACEMENT_TILES);

			const players = makePlayers().map((p) => ({
				...p,
				points: state.players[p.seat].points,
			}));

			// Deal 13 to everyone, banking bonus tiles as they appear.
			for (let round = 0; round < 13; round++) {
				for (let offset = 0; offset < 4; offset++) {
					const seat = (state.dealer + offset) % 4;
					while (wall.length > 0) {
						const next = wall[0];
						wall = wall.slice(1);
						if (next.tile) {
							players[seat].hand.push(next.tile);
							break;
						}
						if (next.bonus) players[seat].bonus.push(next.bonus);
					}
				}
			}

			set((s) => ({
				runId: s.runId + 1,
				phase: "playing",
				players,
				wall,
				replacements,
				turn: state.dealer,
				lastDiscard: null,
				drawnTileId: null,
				awaiting: null,
				claimOptions: [],
				turnActions: [],
				result: null,
				thinking: null,
				afterKong: false,
				log: [],
			}));

			log(
				`Hand ${state.handNumber} — ${WIND_LABELS[state.roundWind]} round, dealer is ${
					SEAT_NAMES[state.dealer]
				}`,
				undefined,
				true,
			);
			schedule(() => beginTurn(get().dealer), timing.deal);
		},

		nextHand: () => {
			const state = get();
			const dealerWon =
				state.result?.kind === "win" && state.result.winner === state.dealer;
			const handNumber = state.handNumber + 1;
			if (handNumber > state.maxHands) {
				set({ phase: "gameOver" });
				return;
			}
			// The round wind advances once the dealership has been all the way round.
			const dealer = dealerWon ? state.dealer : nextSeat(state.dealer);
			set({
				handNumber,
				dealer,
				roundWind: dealer === 0 && !dealerWon
					? (state.roundWind + 1) % 4
					: state.roundWind,
				phase: "playing",
			});
			get().startHand();
		},

		goHome: () => {
			clearTimers();
			set((state) => ({
				runId: state.runId + 1,
				phase: "home",
				result: null,
				awaiting: null,
			}));
		},

		humanDiscard: (tileId) => {
			const state = get();
			if (state.awaiting !== "turn" || state.turn !== 0) return;
			doDiscard(0, tileId);
		},

		humanTurnAction: (action) => {
			const state = get();
			if (state.awaiting !== "turn" || state.turn !== 0) return;
			set({ turnActions: [], awaiting: null });
			if (action.type === "win") {
				const drawn =
					state.players[0].hand.find((t) => t.id === state.drawnTileId) ??
					state.players[0].hand[state.players[0].hand.length - 1];
				declareWin(0, drawn, true, undefined, { afterKong: state.afterKong });
			} else if (action.type === "kong") {
				declareConcealedKong(0, action.kind);
			} else {
				declareAddedKong(0, action.kind);
			}
		},

		humanClaim: (option) => {
			const state = get();
			if (state.awaiting !== "claim") return;
			set({ claimOptions: [], awaiting: null });

			if (state.robbing) {
				const { seat, tile } = state.robbing;
				set((s) => ({
					robbing: null,
					players: s.players.map((p) =>
						p.seat === 0 ? { ...p, hand: [...p.hand, tile] } : p,
					),
				}));
				declareWin(0, tile, false, seat, { robbedKong: true });
				return;
			}

			settleClaims([option, ...pendingAiClaims]);
			pendingAiClaims = [];
		},

		humanPass: () => {
			const state = get();
			if (state.awaiting !== "claim") return;
			set({ claimOptions: [], awaiting: null });

			if (state.robbing) {
				const { seat, kind, tile } = state.robbing;
				set({ robbing: null });
				completeAddedKong(seat, kind, tile);
				return;
			}

			const claims = pendingAiClaims;
			pendingAiClaims = [];
			settleClaims(claims);
		},

		handAdvice: () => {
			const state = get();
			const player = state.players[0];
			const counts = countKinds(player.hand);
			if (state.drawnTileId) {
				const drawn = player.hand.find((t) => t.id === state.drawnTileId);
				if (drawn) counts[drawn.kind] -= 1;
			}
			return {
				shanten: shanten(counts, player.melds.length),
				waits: waits(counts, player.melds.length),
			};
		},
	};
});

export const SEAT_LABELS = SEAT_NAMES;
export const WIND_NAMES = WIND_LABELS;
