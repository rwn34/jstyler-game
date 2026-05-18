// === AUDIO & MUSIC ===
var AC=window.AudioContext||window.webkitAudioContext,ac=null;
var musLoop=null, musSeq=0, nextNoteTime=0.0;

function initAudio(){
    if(!ac){
        ac=new AC();
        if(musOn) startMusic();
    }else if(ac.state==='suspended'){
        ac.resume();
    }
}
function playSfx(type){
    if(!sfxOn||!ac)return;
    var o=ac.createOscillator(),g=ac.createGain(),now=ac.currentTime;
    o.connect(g);g.connect(ac.destination);
    if(type==='jump'){o.type='square';o.frequency.setValueAtTime(440,now);o.frequency.exponentialRampToValueAtTime(880,now+.1);g.gain.setValueAtTime(.1,now);g.gain.exponentialRampToValueAtTime(.001,now+.15);o.start(now);o.stop(now+.15);}
    else if(type==='land'){o.type='sine';o.frequency.setValueAtTime(200,now);o.frequency.exponentialRampToValueAtTime(50,now+.1);g.gain.setValueAtTime(.08,now);g.gain.exponentialRampToValueAtTime(.001,now+.1);o.start(now);o.stop(now+.1);}
    else if(type==='die'){o.type='sawtooth';o.frequency.setValueAtTime(100,now);o.frequency.exponentialRampToValueAtTime(20,now+.5);g.gain.setValueAtTime(.15,now);g.gain.exponentialRampToValueAtTime(.001,now+.5);o.start(now);o.stop(now+.5);}
    else if(type==='win'){o.type='square';o.frequency.setValueAtTime(523,now);o.frequency.setValueAtTime(659,now+.1);o.frequency.setValueAtTime(784,now+.2);g.gain.setValueAtTime(.08,now);g.gain.exponentialRampToValueAtTime(.001,now+.4);o.start(now);o.stop(now+.4);}
    else if(type==='coin'){o.type='sine';o.frequency.setValueAtTime(1000,now);o.frequency.exponentialRampToValueAtTime(1800,now+.1);g.gain.setValueAtTime(.1,now);g.gain.exponentialRampToValueAtTime(.001,now+.15);o.start(now);o.stop(now+.15);}
}
function vib(ms){if(vibrateOn&&navigator.vibrate)navigator.vibrate(ms);}

var SCALES = [
    [220, 220, 440, 220, 330, 220, 261, 293], // Base
    [196, 261, 392, 261, 329, 196, 293, 220], // Moody
    [261, 329, 392, 523, 392, 329, 261, 196], // Upbeat
    [146, 220, 293, 329, 440, 329, 293, 220], // Cyber
    [329, 261, 220, 196, 164, 196, 220, 261]  // Descent
];
var TEMPOS = [0.15, 0.12, 0.14, 0.18, 0.13];
var SYNTHS = ['square', 'sawtooth', 'square', 'triangle', 'sawtooth'];

var audioInitialized = false;
function initAudioOnFirstInteract() {
    if(!audioInitialized && musOn) {
        initAudio();
        audioInitialized = true;
        document.removeEventListener('touchstart', initAudioOnFirstInteract);
        document.removeEventListener('mousedown', initAudioOnFirstInteract);
        document.removeEventListener('keydown', initAudioOnFirstInteract);
    }
}
document.addEventListener('touchstart', initAudioOnFirstInteract, {passive: true});
document.addEventListener('mousedown', initAudioOnFirstInteract);
document.addEventListener('keydown', initAudioOnFirstInteract);

function playMusicStep() {
    if(!musOn || !ac) return;
    
    var noteScale, stepTempo, sType;
    
    if (!gameRunning) {
        noteScale = [220, 261, 329, 440, 392, 329, 261, 196]; // Ambient menu scale
        stepTempo = 0.25;
        sType = 'sine';
    } else {
        var sIdx = curLvl % SCALES.length;
        noteScale = SCALES[sIdx];
        stepTempo = TEMPOS[sIdx];
        sType = SYNTHS[sIdx];
    }

    while (nextNoteTime < ac.currentTime + 0.1) {
        var note = noteScale[musSeq % 8];
        
        if (musSeq % 4 === 0 && gameRunning) {
            var k = ac.createOscillator(), kg = ac.createGain();
            k.frequency.setValueAtTime(150, nextNoteTime);
            k.frequency.exponentialRampToValueAtTime(0.01, nextNoteTime + 0.1);
            k.connect(kg); kg.connect(ac.destination);
            kg.gain.setValueAtTime(0.3, nextNoteTime);
            kg.gain.exponentialRampToValueAtTime(0.01, nextNoteTime + 0.1);
            k.start(nextNoteTime); k.stop(nextNoteTime + 0.1);
        }
        
        var prob = gameRunning ? 0.2 : 0.4;
        if (Math.random() > prob) {
            var o = ac.createOscillator(), g = ac.createGain();
            o.type = sType;
            o.frequency.setValueAtTime(note, nextNoteTime);
            o.connect(g); g.connect(ac.destination);
            g.gain.setValueAtTime(gameRunning ? 0.03 : 0.015, nextNoteTime);
            g.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + stepTempo);
            o.start(nextNoteTime); o.stop(nextNoteTime + stepTempo);
        }
        nextNoteTime += stepTempo; 
        musSeq++;
    }
    musLoop = requestAnimationFrame(playMusicStep);
}
function startMusic() {
    if(!musOn || !ac) return;
    if(ac.state === 'suspended') ac.resume();
    if(!musLoop) {
        nextNoteTime = ac.currentTime + 0.1;
        musSeq = 0;
        musLoop = requestAnimationFrame(playMusicStep);
    }
}
function stopMusic() {
    if(musLoop) { cancelAnimationFrame(musLoop); musLoop = null; }
}

// === DATA ===
