"use strict";

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function playTone(tileId) {
  if (!audioCtx) audioCtx = new AudioContext();
  const frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequencies[tileId], audioCtx.currentTime);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

const state = { level: 1, score: 0, lives: 3, sequence: [], input: [], phase: 'idle' };
const tiles = [...document.querySelectorAll('.tile')];
const startBtn = document.getElementById('startBtn');
const saveModal = document.getElementById('saveModal');

async function requestUniversalAd(type) {
  console.log(`[Ad Bridge] Requesting ${type}...`);
  gameplayStop();
  let success = false;
  try {
    if (window.CrazyGames?.SDK?.ad) {
      success = await new Promise(r => {
        window.CrazyGames.SDK.ad.requestAd(type === 'rewarded' ? 'rewarded' : 'midgame', {
          adFinished: () => r(true),
          adError: () => r(false)
        });
      });
    } else if (window.PokiSDK) {
      success = type === 'rewarded' ? await PokiSDK.rewardedBreak().then(r => !!r) : await PokiSDK.commercialBreak().then(() => true);
    } else if (window.gdsdk) {
      success = await gdsdk.showAd(type === 'rewarded' ? 'rewarded' : 'interstitial').then(() => true).catch(() => false);
    } else {
      await new Promise(r => setTimeout(r, 1000));
      success = true;
    }
  } catch (e) { success = true; }
  gameplayStart();
  return success;
}

function gameplayStop() {
  try {
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStop();
    if (window.PokiSDK?.gameplayStop) window.PokiSDK.gameplayStop();
  } catch (e) {}
}

function gameplayStart() {
  try {
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
    if (window.PokiSDK?.gameplayStart) window.PokiSDK.gameplayStart();
  } catch (e) {}
}

async function playPattern() {
  state.phase = 'showing';
  for (let id of state.sequence) {
    let dur = state.level >= 10 ? 200 + Math.random() * 150 : Math.max(300, 800 - (state.level * 60));
    if (state.level >= 10) document.body.classList.add('shaking');
    playTone(id);
    tiles[id].classList.add('flash');
    await new Promise(r => setTimeout(r, dur));
    tiles[id].classList.remove('flash');
    document.body.classList.remove('shaking');
    await new Promise(r => setTimeout(r, 200));
  }
  state.phase = 'input';
}

tiles.forEach(tile => {
  tile.addEventListener('click', () => {
    if (state.phase !== 'input') return;
    const id = parseInt(tile.dataset.id);
    playTone(id);
    tile.classList.add('flash');
    setTimeout(() => tile.classList.remove('flash'), 100);
    if (id === state.sequence[state.input.length]) {
      state.input.push(id);
      if (state.input.length === state.sequence.length) {
        state.score += state.level * 10;
        document.getElementById('scoreDisplay').textContent = state.score;
        state.level++;
        document.getElementById('levelDisplay').textContent = state.level;
        state.phase = 'locked';
        setTimeout(() => { state.sequence.push(Math.floor(Math.random() * 6)); state.input = []; playPattern(); }, 1000);
      }
    } else {
      state.lives--;
      document.getElementById('livesDisplay').textContent = '♥'.repeat(state.lives) + '♡'.repeat(3 - state.lives);
      if (state.lives <= 0) saveModal.classList.add('visible');
      else playPattern();
    }
  });
});

startBtn.addEventListener('click', () => {
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  state.level = 1; state.lives = 3; state.sequence = [Math.floor(Math.random() * 6)]; state.score = 0;
  document.getElementById('scoreDisplay').textContent = "0";
  document.getElementById('levelDisplay').textContent = "1";
  document.getElementById('livesDisplay').textContent = "♥♥♥";
  startBtn.style.display = 'none';
  playPattern();
});

document.getElementById('watchAdBtn').addEventListener('click', async () => {
  const success = await requestUniversalAd('rewarded');
  if (success) {
    state.lives = 1;
    document.getElementById('livesDisplay').textContent = '♥♡♡';
    saveModal.classList.remove('visible');
    playPattern();
  }
});

document.getElementById('restartBtn').addEventListener('click', () => location.reload());