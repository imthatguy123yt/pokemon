// CritterCatchers — simple original monster-collection prototype
// No copyrighted names, art, or assets used.

class Critter {
  constructor({id, name, emoji, maxHp, atk, def, moves}) {
    this.id = id;
    this.name = name;
    this.emoji = emoji;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.atk = atk;
    this.def = def;
    this.moves = moves; // array of Move
    this.level = 1;
  }

  isFainted(){ return this.hp <= 0 }
  restore(){ this.hp = this.maxHp }
}

class Move {
  constructor({name, power, acc=100}) {
    this.name = name;
    this.power = power;
    this.acc = acc;
  }
}

const SAMPLE_CRITTERS = [
  new Critter({
    id: 'emberpup',
    name: 'Emberpup',
    emoji: '🐶🔥',
    maxHp: 28,
    atk: 8,
    def: 4,
    moves: [
      new Move({name:'Tackle', power:6}),
      new Move({name:'Ember', power:9})
    ]
  }),
  new Critter({
    id: 'leaflet',
    name: 'Leaflet',
    emoji: '🐸🍃',
    maxHp: 32,
    atk: 7,
    def: 5,
    moves: [
      new Move({name:'Vine Whip', power:8}),
      new Move({name:'Leppa Slam', power:7})
    ]
  }),
  new Critter({
    id: 'aquapup',
    name: 'Aquapup',
    emoji: '🦊💧',
    maxHp: 26,
    atk: 9,
    def: 3,
    moves: [
      new Move({name:'Splash', power:3}),
      new Move({name:'Water Bite', power:10})
    ]
  }),
];

const STORAGE_KEY = 'crittercatchers_save_v1';

class Player {
  constructor(name='Trainer') {
    this.name = name;
    this.party = []; // Critter copies
  }

  addCritter(cr) {
    // store a shallow clone so wild changes don't mutate the template
    const copy = new Critter(JSON.parse(JSON.stringify(cr)));
    this.party.push(copy);
  }

  firstAvailable(){
    return this.party.find(p => !p.isFainted());
  }

  healAll(){ this.party.forEach(p=>p.restore()) }
}

// ---- UI & game flow ----

const logEl = document.getElementById('log');
const partyListEl = document.getElementById('party-list');
const exploreBtn = document.getElementById('explore-btn');
const healBtn = document.getElementById('heal-btn');
const saveBtn = document.getElementById('save-btn');

const battleScreen = document.getElementById('battle-screen');
const wildName = document.getElementById('wild-name');
const wildHp = document.getElementById('wild-hp');
const playerMonName = document.getElementById('player-mon-name');
const playerMonHp = document.getElementById('player-mon-hp');
const movesEl = document.getElementById('moves');
const catchBtn = document.getElementById('catch-btn');
const runBtn = document.getElementById('run-btn');

let player = loadGame() || new Player('Ace');
document.getElementById('player-name').textContent = player.name;

// ensure party has at least 1 starter if empty
if (player.party.length === 0) {
  player.addCritter(SAMPLE_CRITTERS[0]);
  player.addCritter(SAMPLE_CRITTERS[1]);
}

let currentWild = null;
let currentPlayerMon = null;

function log(text){
  const now = new Date().toLocaleTimeString();
  logEl.textContent = `[${now}] ${text}\n` + logEl.textContent;
}

function renderParty(){
  partyListEl.innerHTML = '';
  player.party.forEach((p, idx) => {
    const li = document.createElement('li');
    li.className = 'party-item';
    li.innerHTML = `
      <div class="sprite">${p.emoji}</div>
      <div class="info">
        <div class="name">${p.name} ${p.isFainted() ? ' (Fainted)' : ''}</div>
        <div class="hp">${p.hp}/${p.maxHp} HP • Lv.${p.level}</div>
      </div>
    `;
    partyListEl.appendChild(li);
  });
}
renderParty();

exploreBtn.addEventListener('click', () => {
  // simple random encounter
  const wildTemplate = SAMPLE_CRITTERS[Math.floor(Math.random()*SAMPLE_CRITTERS.length)];
  // deep copy to ensure unique instance
  currentWild = new Critter(JSON.parse(JSON.stringify(wildTemplate)));
  log(`A wild ${currentWild.name} appeared!`);
  startBattle();
});

healBtn.addEventListener('click', () => {
  player.healAll();
  renderParty();
  log('All party critters healed.');
});

saveBtn.addEventListener('click', () => {
  saveGame();
  log('Game saved.');
});

function startBattle(){
  // pick first available
  const mon = player.firstAvailable();
  if(!mon){
    log('All your critters are fainted. You cannot fight.');
    return;
  }
  currentPlayerMon = mon;
  updateBattleUI();
  battleScreen.classList.remove('hidden');
}

function updateBattleUI(){
  wildName.textContent = `${currentWild.emoji} ${currentWild.name}`;
  wildHp.textContent = `${currentWild.hp}/${currentWild.maxHp}`;
  playerMonName.textContent = `${currentPlayerMon.emoji} ${currentPlayerMon.name}`;
  playerMonHp.textContent = `${currentPlayerMon.hp}/${currentPlayerMon.maxHp}`;

  movesEl.innerHTML = '';
  currentPlayerMon.moves.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'move-btn';
    b.textContent = `${m.name} (${m.power})`;
    b.addEventListener('click', ()=> playerUseMove(i));
    movesEl.appendChild(b);
  });
}

function dmgCalc(attacker, defender, move){
  // very simple dmg formula
  const base = move.power + attacker.atk - Math.floor(defender.def/2);
  const variability = Math.floor(Math.random()*3) - 1; // -1..1
  return Math.max(1, base + variability);
}

function playerUseMove(moveIdx){
  const move = currentPlayerMon.moves[moveIdx];
  const dmg = dmgCalc(currentPlayerMon, currentWild, move);
  currentWild.hp -= dmg;
  if(currentWild.hp < 0) currentWild.hp = 0;
  log(`${currentPlayerMon.name} used ${move.name} and dealt ${dmg} damage!`);
  updateBattleUI();

  if (currentWild.isFainted()){
    log(`Wild ${currentWild.name} fainted!`);
    // simple automatic capture chance if you click catch before faint — but now it's fainted
    battleEndAfterVictory();
  } else {
    // wild turn after short delay (simulate)
    setTimeout(()=> wildTurn(), 350);
  }
}

function wildTurn(){
  const move = currentWild.moves[Math.floor(Math.random()*currentWild.moves.length)];
  const dmg = dmgCalc(currentWild, currentPlayerMon, move);
  currentPlayerMon.hp -= dmg;
  if(currentPlayerMon.hp < 0) currentPlayerMon.hp = 0;
  log(`Wild ${currentWild.name} used ${move.name} and dealt ${dmg} damage!`);
  updateBattleUI();

  if (currentPlayerMon.isFainted()){
    log(`${currentPlayerMon.name} fainted!`);
    // find next available
    const next = player.firstAvailable();
    if(!next || next.isFainted()){
      log('All party members fainted. You escaped the battle.');
      endBattle();
      renderParty();
      return;
    } else {
      currentPlayerMon = next;
      log(`${currentPlayerMon.name} enters battle!`);
      updateBattleUI();
    }
  }
}

catchBtn.addEventListener('click', () => {
  if(!currentWild) return;
  // simple catch formula: higher when wild low HP
  const rate = Math.max(10, Math.floor(60 * (1 - (currentWild.hp / currentWild.maxHp))));
  const roll = Math.floor(Math.random()*100);
  log(`You throw a Capture Orb... (chance ${rate}%)`);
  if (roll < rate){
    log(`Captured ${currentWild.name}! Added to your party.`);
    currentWild.hp = currentWild.maxHp;
    player.addCritter(currentWild);
    renderParty();
    endBattle();
  } else {
    log('The capture failed!');
    // wild gets a free turn
    setTimeout(()=> wildTurn(), 400);
  }
});

runBtn.addEventListener('click', () => {
  const chance = 60;
  if (Math.random()*100 < chance){
    log('You successfully ran away.');
    endBattle();
  } else {
    log('Could not escape!');
    setTimeout(()=> wildTurn(), 250);
  }
});

function battleEndAfterVictory(){
  // small XP/level up mock
  currentPlayerMon.hp = Math.max(1, Math.floor(currentPlayerMon.hp * 0.9));
  log(`${currentPlayerMon.name} gained 10 XP (simulated).`);
  // chance to auto-capture a defeated critter? no — you capture before fainted
  endBattle();
  renderParty();
}

function endBattle(){
  currentWild = null;
  currentPlayerMon = null;
  battleScreen.classList.add('hidden');
}

function saveGame(){
  const data = {
    player: {
      name: player.name,
      party: player.party.map(p => ({
        id: p.id, name: p.name, emoji: p.emoji, maxHp: p.maxHp,
        hp: p.hp, atk: p.atk, def: p.def, level: p.level, moves: p.moves
      }))
    },
    timestamp: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadGame(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    const pl = new Player(parsed.player.name || 'Trainer');
    parsed.player.party.forEach(p => {
      const crit = new Critter({
        id: p.id, name: p.name, emoji: p.emoji, maxHp: p.maxHp,
        atk: p.atk, def: p.def, moves: p.moves
      });
      crit.hp = p.hp;
      crit.level = p.level || 1;
      pl.party.push(crit);
    });
    return pl;
  }catch(e){
    console.warn('Unable to load save', e);
    return null;
  }
}
