/** Headless smoke test: four computer players run full games through the store. */
import { chooseClaim, chooseDiscard } from "@/game/ai";
import { KIND_COUNT, countKinds } from "@/game/tiles";
import { timing, useGameStore } from "@/store/gameStore";

timing.think = 0;
timing.claim = 0;
timing.deal = 0;

const store = useGameStore;
let problems = 0;
const fail = (msg: string) => {
	problems += 1;
	if (problems < 12) console.error("  !!", msg);
};

function checkInvariants(tag: string) {
	const s = store.getState();
	const counts = new Array<number>(KIND_COUNT).fill(0);
	let bonus = 0;
	for (const p of s.players) {
		const units = p.hand.length + 3 * p.melds.length;
		if (units !== 13 && units !== 14)
			fail(`${tag}: seat ${p.seat} holds ${units} tile units`);
		for (const t of p.hand) counts[t.kind] += 1;
		for (const m of p.melds) for (const t of m.tiles) counts[t.kind] += 1;
		for (const t of p.discards) counts[t.kind] += 1;
		bonus += p.bonus.length;
	}
	for (const w of [...s.wall, ...s.replacements]) {
		if (w.tile) counts[w.tile.kind] += 1;
		if (w.bonus) bonus += 1;
	}
	// A discarded tile already sits in its owner's discard pile; a tile offered
	// for robbing has left every pile, so it is counted here.
	if (s.robbing) counts[s.robbing.tile.kind] += 1;
	for (let k = 0; k < KIND_COUNT; k++)
		if (counts[k] !== 4) fail(`${tag}: kind ${k} appears ${counts[k]} times`);
	if (bonus !== 8) fail(`${tag}: ${bonus} bonus tiles in play`);
}

function driveHuman() {
	const s = store.getState();
	if (s.phase !== "playing") return;
	if (s.awaiting === "turn" && s.turn === 0) {
		const win = s.turnActions.find((a) => a.type === "win");
		if (win) {
			s.humanTurnAction(win);
			return;
		}
		const kong = s.turnActions.find((a) => a.type === "kong");
		if (kong && Math.random() < 0.5) {
			s.humanTurnAction(kong);
			return;
		}
		const tile = chooseDiscard({
			player: s.players[0],
			visible: countKinds(s.players[0].hand),
			seatWind: s.seatWind(0),
			roundWind: s.roundWind,
			rng: Math.random,
		});
		s.humanDiscard(tile.id);
		return;
	}
	if (s.awaiting === "claim") {
		claimWindows += 1;
		for (const option of s.claimOptions)
			offered.set(option.type, (offered.get(option.type) ?? 0) + 1);
		const discard = s.lastDiscard;
		const choice = discard
			? chooseClaim(
					{
						player: s.players[0],
						visible: countKinds(s.players[0].hand),
						seatWind: s.seatWind(0),
						roundWind: s.roundWind,
						rng: Math.random,
					},
					s.claimOptions,
					discard.tile.kind,
				)
			: null;
		if (choice) {
			claimsTaken += 1;
			s.humanClaim(choice);
		} else s.humanPass();
	}
}

const GAMES = Number(process.argv[2] ?? 5);
let wins = 0;
let draws = 0;
let claimWindows = 0;
let claimsTaken = 0;
const offered = new Map<string, number>();
let faanTotal = 0;
const patternTally = new Map<string, number>();

async function run() {
	for (let game = 0; game < GAMES; game++) {
		store.getState().startGame({ minFaan: 1, hands: 4, seed: 1000 + game });
		let guard = 0;
		while (store.getState().phase !== "gameOver" && guard++ < 20000) {
			const s = store.getState();
			if (s.phase === "handOver") {
				const r = s.result;
				if (r?.kind === "win") {
					wins += 1;
					faanTotal += r.score?.faan ?? 0;
					for (const p of r.score?.patterns ?? [])
						patternTally.set(p.name, (patternTally.get(p.name) ?? 0) + 1);
					const sum = r.deltas.reduce((a, b) => a + b, 0);
					if (sum !== 0) fail(`point deltas do not net to zero: ${r.deltas}`);
				} else draws += 1;
				checkInvariants("hand over");
				s.nextHand();
			} else {
				driveHuman();
				checkInvariants("mid hand");
			}
			await new Promise((r) => setTimeout(r, 0));
		}
		if (guard >= 20000) fail(`game ${game} did not finish`);
	}

	console.log(`games: ${GAMES}  hands won: ${wins}  washed out: ${draws}`);
	console.log(`average faan on a win: ${(faanTotal / Math.max(1, wins)).toFixed(2)}`);
	console.log(
		`call windows offered to seat 0: ${claimWindows} (${claimsTaken} taken) — ` +
			[...offered.entries()].map(([type, n]) => `${type} ${n}`).join(", "),
	);
	const top = [...patternTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
	for (const [name, n] of top) console.log(`  ${n.toString().padStart(3)}  ${name}`);
	console.log(problems === 0 ? "invariants: OK" : `invariants: ${problems} problems`);
	process.exit(problems === 0 ? 0 : 1);
}

run();
