// Map giữa id button và id audio
const buttonAudioMap = {
    'btn-cung-nghinh': 'audio-cung-nghinh',
    'btn-dan-le':     'audio-dan-le',
    'btn-dang-tra':   'audio-dang-tra',
    'btn-trao-nhan':  'audio-trao-nhan',
    'btn-giao-bai':   'audio-giao-bai'
};

const buttons = document.querySelectorAll('.btn');

let currentAudio = null;
let currentButton = null;
let pressTimer = null;
let isLongPress = false;

// Phát hiện thiết bị có touch hay không (chạy 1 lần)
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Chọn event phù hợp
const startEvent = isTouchDevice ? 'touchstart' : 'mousedown';
const endEvent   = isTouchDevice ? 'touchend'   : 'mouseup';
const cancelEvent = isTouchDevice ? 'touchcancel' : 'mouseleave';

// Gắn event
buttons.forEach(button => {
    button.addEventListener(startEvent, (e) => startPress(e, button));

    button.addEventListener(endEvent, (e) => endPress(e, button));

    button.addEventListener(cancelEvent, () => cancelPress());
});

function startPress(e, button) {
    // Ngăn chặn double trigger trên mobile (touch -> simulated mouse)
    if (e.type === 'touchstart') {
        e.preventDefault();
    }

    isLongPress = false;

    pressTimer = setTimeout(() => {
        isLongPress = true;
        stopAudioForButton(button);
    }, 1000); // 1 giây giữ để stop
}

function endPress(e, button) {
    clearTimeout(pressTimer);

    if (isLongPress) return;

    // Trên touch, chỉ xử lý nếu là touchend thật (không phải simulated mouse)
    if (isTouchDevice && e.type === 'mouseup') return;

    toggleAudioForButton(button);
}

function cancelPress() {
    clearTimeout(pressTimer);
}

function toggleAudioForButton(button) {
    const audioId = buttonAudioMap[button.id];
    if (!audioId) return;

    const targetAudio = document.getElementById(audioId);

    // Dừng audio khác nếu đang phát
    if (currentAudio && currentAudio !== targetAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        if (currentButton) {
            currentButton.classList.remove('playing', 'paused');
        }
    }

    button.classList.remove('playing', 'paused');

    if (targetAudio.paused || targetAudio.ended) {
        targetAudio.play().catch(err => console.log("Play bị chặn:", err));
        button.classList.add('playing');
        currentAudio = targetAudio;
        currentButton = button;
    } else {
        targetAudio.pause();
        button.classList.add('paused');
    }
}

function stopAudioForButton(button) {
    const audioId = buttonAudioMap[button.id];
    if (!audioId) return;

    const targetAudio = document.getElementById(audioId);

    targetAudio.pause();
    targetAudio.currentTime = 0;
    button.classList.remove('playing', 'paused');

    if (currentAudio === targetAudio) {
        currentAudio = null;
        currentButton = null;
    }
}