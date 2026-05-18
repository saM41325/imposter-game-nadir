const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

let sfxVolume = 0.7;
let musicVolume = 0.3;
let backgroundAudioPlayer = null;
let musicEnabled = true;
let soundEnabled = true;

// LocalStorage Keys
const STORAGE_KEYS = {
    CUSTOM_WORDS: 'spyGame_customWords',
    PLAYER_NAME: 'spyGame_playerName'
};

// Custom Words Management
let customWords = [];

// Impostor emoji
const IMPOSTOR_EMOJI = "🕵️‍♂️";

function loadCustomWords() {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_WORDS);
    if (saved) {
        try {
            customWords = JSON.parse(saved);
        } catch (e) {
            customWords = [];
        }
    }
    updateCustomWordsDisplay();
}

function saveCustomWords() {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_WORDS, JSON.stringify(customWords));
    updateCustomWordsDisplay();
}

function addCustomWord() {
    const input = document.getElementById('customWordInput');
    const word = input.value.trim();
    
    if (!word) {
        showCustomWordsAlert('الرجاء إدخال كلمة', 'error');
        return;
    }
    
    if (customWords.includes(word)) {
        showCustomWordsAlert('هذه الكلمة موجودة بالفعل', 'error');
        return;
    }
    
    customWords.push(word);
    saveCustomWords();
    input.value = '';
    showCustomWordsAlert(`تمت إضافة "${word}" بنجاح!`, 'success');
    playClickSound();
}

function removeCustomWord(word) {
    customWords = customWords.filter(w => w !== word);
    saveCustomWords();
    playClickSound();
}

function clearAllCustomWords() {
    if (customWords.length === 0) {
        showCustomWordsAlert('لا توجد كلمات لحذفها', 'info');
        return;
    }
    
    if (confirm('هل تريد حذف جميع الكلمات المخصصة؟')) {
        customWords = [];
        saveCustomWords();
        showCustomWordsAlert('تم حذف جميع الكلمات', 'success');
        playClickSound();
    }
}

function updateCustomWordsDisplay() {
    const display = document.getElementById('customWordsDisplay');
    const count = document.getElementById('customWordsCount');
    
    count.textContent = customWords.length;
    
    if (customWords.length === 0) {
        display.innerHTML = '<p style="text-align: center; color: #999;">لا توجد كلمات بعد</p>';
        return;
    }
    
    let html = '';
    customWords.forEach(word => {
        html += `
            <span class="word-tag">
                <span class="remove-word" onclick="removeCustomWord('${word}')">✖</span>
                ${word}
            </span>
        `;
    });
    
    display.innerHTML = html;
}

function generateShareCode() {
    if (customWords.length === 0) {
        showCustomWordsAlert('لا توجد كلمات للمشاركة', 'error');
        return null;
    }
    
    const data = {
        words: customWords,
        timestamp: Date.now()
    };
    
    const jsonStr = JSON.stringify(data);
    const encoded = btoa(encodeURIComponent(jsonStr));
    
    return encoded;
}

function showShareCode() {
    playClickSound();
    const code = generateShareCode();
    
    if (!code) return;
    
    document.getElementById('shareCodeText').textContent = code;
    document.getElementById('shareCodeDisplay').style.display = 'block';
    
    showCustomWordsAlert('تم إنشاء كود المشاركة!', 'success');
}

function copyShareCode() {
    playClickSound();
    const codeText = document.getElementById('shareCodeText').textContent;
    
    navigator.clipboard.writeText(codeText).then(() => {
        showCustomWordsAlert('تم نسخ الكود!', 'success');
    }).catch(() => {
        showCustomWordsAlert('فشل نسخ الكود', 'error');
    });
}

function importWordsFromCode() {
    playClickSound();
    const input = document.getElementById('importCodeInput');
    const code = input.value.trim();
    
    if (!code) {
        showCustomWordsAlert('الرجاء إدخال كود', 'error');
        return;
    }
    
    try {
        const decoded = decodeURIComponent(atob(code));
        const data = JSON.parse(decoded);
        
        if (!data.words || !Array.isArray(data.words)) {
            throw new Error('Invalid format');
        }
        
        const newWords = data.words.filter(w => !customWords.includes(w));
        
        if (newWords.length === 0) {
            showCustomWordsAlert('جميع الكلمات موجودة بالفعل', 'info');
            return;
        }
        
        customWords = [...customWords, ...newWords];
        saveCustomWords();
        
        input.value = '';
        showCustomWordsAlert(`تم استيراد ${newWords.length} كلمة جديدة!`, 'success');
        
    } catch (e) {
        showCustomWordsAlert('كود غير صالح', 'error');
    }
}

function showCustomWordsAlert(message, type = 'info') {
    const alertDiv = document.getElementById('customWordsAlert');
    alertDiv.innerHTML = `<div class="alert ${type}">${message}</div>`;
    setTimeout(() => {
        alertDiv.innerHTML = '';
    }, 3000);
}

function showCustomWordsManager() {
    playSelectSound();
    loadCustomWords();
    showScreen('customWordsScreen');
}

// Player Name Management
function loadPlayerName() {
    const saved = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
    if (saved) {
        document.getElementById('playerName').value = saved;
    }
}

function savePlayerName(name) {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
}

function startBackgroundMusic() {
    if (!backgroundAudioPlayer) {
        backgroundAudioPlayer = document.getElementById('backgroundAudioPlayer');
    }

    backgroundAudioPlayer.volume = musicVolume;

    if (musicEnabled) {
        backgroundAudioPlayer.play().catch(error => {
            console.log("Audio play failed:", error);
        });
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('soundIcon').textContent = soundEnabled ? '🔊' : '🔇';
    document.getElementById('soundControl').classList.toggle('muted', !soundEnabled);
    if (soundEnabled) {
        playClickSound();
    }
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    document.getElementById('musicIcon').textContent = musicEnabled ? '🎵' : '🎶';
    document.getElementById('musicControl').classList.toggle('muted', !musicEnabled);

    if (backgroundAudioPlayer) {
        if (musicEnabled) {
            backgroundAudioPlayer.play();
        } else {
            backgroundAudioPlayer.pause();
        }
    } else if (musicEnabled) {
        startBackgroundMusic();
    }

    playClickSound();
}

// Auto-start music on first user interaction
document.addEventListener('click', function initMusic() {
    startBackgroundMusic();
    document.removeEventListener('click', initMusic);
}, { once: true });

// Sound Effects
function playClickSound() {
    if (!soundEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3 * sfxVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playRevealSound() {
    if (!soundEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
    oscillator.type = 'triangle';
    gainNode.gain.setValueAtTime(0.3 * sfxVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function playTimerSound() {
    if (!soundEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 1000;
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.2 * sfxVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
}

function playVoteSound() {
    if (!soundEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2);
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.25 * sfxVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

function playImpostorWinSound() {
    if (!soundEnabled) return;
    const notes = [392, 349, 311, 293, 262];
    const duration = 0.15;
    notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'sawtooth';
        const startTime = audioContext.currentTime + (index * duration);
        gainNode.gain.setValueAtTime(0.3 * sfxVolume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    });
}

function playCitizensWinSound() {
    if (!soundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    const duration = 0.2;
    notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        const startTime = audioContext.currentTime + (index * duration);
        gainNode.gain.setValueAtTime(0.3 * sfxVolume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    });
}

function playSelectSound() {
    if (!soundEnabled) return;
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator1.frequency.value = 600;
    oscillator2.frequency.value = 900;
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    gainNode.gain.setValueAtTime(0.15 * sfxVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.15);
    oscillator2.stop(audioContext.currentTime + 0.15);
}

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDnezIJxk9gQr--qOGLpDVB6PNaLF-DW_8",
    authDomain: "imposter-dfa43.firebaseapp.com",
    databaseURL: "https://imposter-dfa43-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "imposter-dfa43",
    storageBucket: "imposter-dfa43.appspot.com",
    messagingSenderId: "840856200109",
    appId: "1:840856200109:web:6e11bd3f0cbfad9094b724"
};

let firebaseApp, database;
try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Word Database with emojis and clues
const words = {
    places: [
        { word: "مسجد", clue: "مكان عبادة", emoji: "🕌" },
        { word: "مدرسة", clue: "مكان تعليم", emoji: "🏫" },
        { word: "مستشفى", clue: "مكان علاج", emoji: "🏥" },
        { word: "مطار", clue: "مكان طيران", emoji: "✈️" },
        { word: "محطة قطار", clue: "مكان سفر", emoji: "🚉" },
        { word: "ملعب", clue: "مكان رياضة", emoji: "🏟️" },
        { word: "حديقة", clue: "مكان أخضر", emoji: "🏞️" },
        { word: "شاطئ", clue: "مكان بحر", emoji: "🏖️" },
        { word: "جبل", clue: "مكان عالي", emoji: "⛰️" },
        { word: "صحراء", clue: "مكان رمل", emoji: "🏜️" },
        { word: "مكتبة", clue: "مكان كتب", emoji: "📚" },
        { word: "متحف", clue: "مكان تاريخ", emoji: "🏛️" },
        { word: "سوق", clue: "مكان تسوق", emoji: "🏪" },
        { word: "محل", clue: "مكان بيع", emoji: "🏬" },
        { word: "مطعم", clue: "مكان طعام", emoji: "🍽️" },
        { word: "مقهى", clue: "مكان قهوة", emoji: "☕" },
        { word: "فندق", clue: "مكان إقامة", emoji: "🏨" },
        { word: "سينما", clue: "مكان أفلام", emoji: "🎬" },
        { word: "مسرح", clue: "مكان عروض", emoji: "🎭" },
        { word: "حديقة حيوان", clue: "مكان حيوانات", emoji: "🦁" }
    ],
    jobs: [
        { word: "طبيب", clue: "يعالج المرضى", emoji: "👨‍⚕️" },
        { word: "معلم", clue: "يعلم الطلاب", emoji: "👨‍🏫" },
        { word: "مهندس", clue: "يصمم ويبني", emoji: "👷" },
        { word: "محامي", clue: "يدافع في المحكمة", emoji: "⚖️" },
        { word: "طيار", clue: "يقود الطائرة", emoji: "👨‍✈️" },
        { word: "شرطي", clue: "يحفظ الأمن", emoji: "👮" },
        { word: "رجل إطفاء", clue: "يطفئ الحرائق", emoji: "👨‍🚒" },
        { word: "طباخ", clue: "يطبخ الطعام", emoji: "👨‍🍳" },
        { word: "نادل", clue: "يقدم الطعام", emoji: "🧑‍🍳" },
        { word: "سائق", clue: "يقود السيارة", emoji: "🚗" },
        { word: "كهربائي", clue: "يصلح الكهرباء", emoji: "🔌" },
        { word: "خباز", clue: "يخبز الخبز", emoji: "🥖" },
        { word: "نجار", clue: "يعمل بالخشب", emoji: "🪚" },
        { word: "حداد", clue: "يعمل بالحديد", emoji: "🔨" },
        { word: "بناء", clue: "يبني المنازل", emoji: "🏗️" },
        { word: "رسام", clue: "يرسم اللوحات", emoji: "🎨" },
        { word: "مصور", clue: "يلتقط الصور", emoji: "📷" },
        { word: "صحفي", clue: "يكتب الأخبار", emoji: "📰" },
        { word: "كاتب", clue: "يكتب القصص", emoji: "✍️" },
        { word: "مؤلف", clue: "يؤلف الكتب", emoji: "📖" }
    ],
    items: [
        { word: "هاتف", clue: "جهاز اتصال", emoji: "📱" },
        { word: "حاسوب", clue: "جهاز إلكتروني", emoji: "💻" },
        { word: "تلفاز", clue: "شاشة عرض", emoji: "📺" },
        { word: "ثلاجة", clue: "جهاز تبريد", emoji: "🧊" },
        { word: "فرن", clue: "جهاز طبخ", emoji: "🔥" },
        { word: "مكيف", clue: "جهاز تبريد", emoji: "❄️" },
        { word: "مروحة", clue: "جهاز تهوية", emoji: "🌀" },
        { word: "ساعة", clue: "جهاز وقت", emoji: "⌚" },
        { word: "كاميرا", clue: "جهاز تصوير", emoji: "📷" },
        { word: "مفتاح", clue: "أداة فتح", emoji: "🔑" },
        { word: "قلم", clue: "أداة كتابة", emoji: "✏️" },
        { word: "كتاب", clue: "للقراءة", emoji: "📖" },
        { word: "دفتر", clue: "للكتابة", emoji: "📓" },
        { word: "حقيبة", clue: "للحمل", emoji: "👜" },
        { word: "محفظة", clue: "للنقود", emoji: "👛" },
        { word: "نظارة", clue: "للرؤية", emoji: "👓" },
        { word: "مرآة", clue: "للانعكاس", emoji: "🪞" },
        { word: "فرشاة", clue: "للتنظيف", emoji: "🪥" },
        { word: "مشط", clue: "للشعر", emoji: "💇" },
        { word: "صابون", clue: "للنظافة", emoji: "🧼" }
    ],
    animals: [
        { word: "أسد", clue: "ملك الغابة", emoji: "🦁" },
        { word: "نمر", clue: "حيوان مفترس", emoji: "🐯" },
        { word: "فهد", clue: "أسرع حيوان", emoji: "🐆" },
        { word: "ذئب", clue: "حيوان مفترس", emoji: "🐺" },
        { word: "ثعلب", clue: "حيوان ذكي", emoji: "🦊" },
        { word: "دب", clue: "حيوان ضخم", emoji: "🐻" },
        { word: "قرد", clue: "حيوان ذكي", emoji: "🐵" },
        { word: "فيل", clue: "أكبر الحيوانات", emoji: "🐘" },
        { word: "زرافة", clue: "أطول حيوان", emoji: "🦒" },
        { word: "حصان", clue: "حيوان ركوب", emoji: "🐴" },
        { word: "حمار", clue: "حيوان حمل", emoji: "🫏" },
        { word: "جمل", clue: "سفينة الصحراء", emoji: "🐪" },
        { word: "بقرة", clue: "حيوان الحليب", emoji: "🐄" },
        { word: "خروف", clue: "حيوان الصوف", emoji: "🐑" },
        { word: "ماعز", clue: "حيوان أليف", emoji: "🐐" },
        { word: "خنزير", clue: "حيوان مزرعة", emoji: "🐷" },
        { word: "كلب", clue: "صديق الإنسان", emoji: "🐕" },
        { word: "قطة", clue: "حيوان أليف", emoji: "🐱" },
        { word: "أرنب", clue: "حيوان سريع", emoji: "🐰" },
        { word: "فأر", clue: "حيوان صغير", emoji: "🐭" }
    ],
    meals: [
        { word: "بيتزا", clue: "طعام إيطالي", emoji: "🍕" },
        { word: "برجر", clue: "وجبة سريعة", emoji: "🍔" },
        { word: "شاورما", clue: "طعام عربي", emoji: "🌯" },
        { word: "كباب", clue: "لحم مشوي", emoji: "�串" },
        { word: "ايس كريم", clue: "حلوى باردة", emoji: "🍦" },
        { word: "كسكس", clue: "طعام مغربي", emoji: "🍲" },
        { word: "ارز", clue: "حبوب", emoji: "🍚" },
        { word: "لازانيا", clue: "معكرونة إيطالية", emoji: "🍝" },
        { word: "سوشي", clue: "طعام ياباني", emoji: "🍣" },
        { word: "معكرونة", clue: "باستا", emoji: "🍝" },
        { word: "تاكو", clue: "طعام مكسيكي", emoji: "🌮" },
        { word: "بوريتو", clue: "لفائف مكسيكية", emoji: "🌯" },
        { word: "ساندويتش", clue: "وجبة خفيفة", emoji: "🥪" },
        { word: "هوت دوج", clue: "نقانق", emoji: "🌭" },
        { word: "دجاج مقلي", clue: "وجبة سريعة", emoji: "🍗" },
        { word: "ستيك", clue: "لحم بقري", emoji: "🥩" },
        { word: "سمك مشوي", clue: "طعام بحري", emoji: "🐟" },
        { word: "فاصولياء", clue: "بقوليات", emoji: "🫘" },
        { word: "عدس", clue: "حبوب", emoji: "🫘" },
        { word: "بيض مقلي", clue: "وجبة إفطار", emoji: "🍳" }
    ],
    countries: [
        { word: "مصر", clue: "أرض الأهرامات", emoji: "🇪🇬" },
        { word: "السعودية", clue: "أرض الحرمين", emoji: "🇸🇦" },
        { word: "الإمارات", clue: "برج خليفة", emoji: "🇦🇪" },
        { word: "المغرب", clue: "المغرب العربي", emoji: "🇲🇦" },
        { word: "تونس", clue: "شمال أفريقيا", emoji: "🇹🇳" },
        { word: "فرنسا", clue: "برج إيفل", emoji: "🇫🇷" },
        { word: "ألمانيا", clue: "أوروبا", emoji: "🇩🇪" },
        { word: "إيطاليا", clue: "برج بيزا", emoji: "🇮🇹" },
        { word: "إسبانيا", clue: "أوروبا", emoji: "🇪🇸" },
        { word: "بريطانيا", clue: "ساعة بيج بن", emoji: "🇬🇧" },
        { word: "اليابان", clue: "الشمس المشرقة", emoji: "🇯🇵" },
        { word: "الصين", clue: "سور الصين", emoji: "🇨🇳" },
        { word: "كوريا", clue: "شرق آسيا", emoji: "🇰🇷" },
        { word: "الهند", clue: "تاج محل", emoji: "🇮🇳" },
        { word: "تايلاند", clue: "جنوب آسيا", emoji: "🇹🇭" },
        { word: "أمريكا", clue: "تمثال الحرية", emoji: "🇺🇸" },
        { word: "كندا", clue: "أمريكا الشمالية", emoji: "🇨🇦" },
        { word: "البرازيل", clue: "أمريكا الجنوبية", emoji: "🇧🇷" },
        { word: "الأرجنتين", clue: "أمريكا الجنوبية", emoji: "🇦🇷" },
        { word: "المكسيك", clue: "أمريكا الوسطى", emoji: "🇲🇽" },
        { word: "أستراليا", clue: "قارة", emoji: "🇦🇺" },
        { word: "نيوزيلندا", clue: "أوقيانوسيا", emoji: "🇳🇿" },
        { word: "جنوب أفريقيا", clue: "أفريقيا", emoji: "🇿🇦" },
        { word: "نيجيريا", clue: "غرب أفريقيا", emoji: "🇳🇬" },
        { word: "كينيا", clue: "شرق أفريقيا", emoji: "🇰🇪" },
        { word: "روسيا", clue: "أكبر دولة", emoji: "🇷🇺" },
        { word: "تركيا", clue: "بين قارتين", emoji: "🇹🇷" },
        { word: "إيران", clue: "الشرق الأوسط", emoji: "🇮🇷" }
    ],
    fruits: [
        { word: "تفاح", clue: "فاكهة حمراء", emoji: "🍎" },
        { word: "موز", clue: "فاكهة صفراء", emoji: "🍌" },
        { word: "برتقال", clue: "فاكهة برتقالية", emoji: "🍊" },
        { word: "عنب", clue: "فاكهة عناقيد", emoji: "🍇" },
        { word: "فراولة", clue: "فاكهة حمراء", emoji: "🍓" },
        { word: "مانجو", clue: "فاكهة استوائية", emoji: "🥭" },
        { word: "أناناس", clue: "فاكهة استوائية", emoji: "🍍" },
        { word: "بطيخ", clue: "فاكهة صيفية", emoji: "🍉" },
        { word: "شمام", clue: "فاكهة صيفية", emoji: "🍈" },
        { word: "خوخ", clue: "فاكهة صيفية", emoji: "🍑" },
        { word: "مشمش", clue: "فاكهة برتقالية", emoji: "🍑" },
        { word: "كمثرى", clue: "فاكهة خضراء", emoji: "🍐" },
        { word: "رمان", clue: "فاكهة حمراء", emoji: "🍒" },
        { word: "تين", clue: "فاكهة صيفية", emoji: "🫐" },
        { word: "كيوي", clue: "فاكهة خضراء", emoji: "🥝" },
        { word: "ليمون", clue: "فاكهة حامضة", emoji: "🍋" },
        { word: "يوسفي", clue: "فاكهة شتوية", emoji: "🍊" },
        { word: "توت", clue: "فاكهة صغيرة", emoji: "🫐" },
        { word: "كرز", clue: "فاكهة حمراء", emoji: "🍒" },
        { word: "جوافة", clue: "فاكهة استوائية", emoji: "🍈" }
    ],
    insects: [
        { word: "نملة", clue: "حشرة صغيرة", emoji: "🐜" },
        { word: "نحلة", clue: "تنتج العسل", emoji: "🐝" },
        { word: "ذبابة", clue: "حشرة طائرة", emoji: "🪰" },
        { word: "بعوضة", clue: "حشرة لاسعة", emoji: "🦟" },
        { word: "صرصور", clue: "حشرة منزلية", emoji: "🪳" },
        { word: "جرادة", clue: "حشرة قافزة", emoji: "🦗" },
        { word: "فراشة", clue: "حشرة ملونة", emoji: "🦋" },
        { word: "دبور", clue: "حشرة لاسعة", emoji: "🐝" },
        { word: "خنفساء", clue: "حشرة صلبة", emoji: "🪲" },
        { word: "دعسوقة", clue: "حشرة حمراء", emoji: "🐞" },
        { word: "دودة", clue: "تزحف", emoji: "🪱" },
        { word: "عنكبوت", clue: "ينسج الخيوط", emoji: "🕷️" },
        { word: "عقرب", clue: "له ذيل سام", emoji: "🦂" },
        { word: "برغوث", clue: "حشرة قافزة", emoji: "🦟" },
        { word: "قمل", clue: "حشرة الشعر", emoji: "🪳" }
    ],
    vegetables: [
        { word: "طماطم", clue: "خضار أحمر", emoji: "🍅" },
        { word: "خيار", clue: "خضار أخضر", emoji: "🥒" },
        { word: "خس", clue: "خضار ورقي", emoji: "🥬" },
        { word: "جزر", clue: "خضار برتقالي", emoji: "🥕" },
        { word: "بصل", clue: "يبكي العين", emoji: "🧅" },
        { word: "ثوم", clue: "نكهة قوية", emoji: "🧄" },
        { word: "فلفل", clue: "خضار حار", emoji: "🌶️" },
        { word: "باذنجان", clue: "خضار بنفسجي", emoji: "🍆" },
        { word: "كوسا", clue: "خضار أخضر", emoji: "🥒" },
        { word: "فاصوليا", clue: "بقوليات", emoji: "🫘" },
        { word: "بازلاء", clue: "خضار أخضر", emoji: "🫛" },
        { word: "ذرة", clue: "خضار أصفر", emoji: "🌽" },
        { word: "قرع", clue: "خضار برتقالي", emoji: "🎃" },
        { word: "ملفوف", clue: "خضار ورقي", emoji: "🥬" },
        { word: "قرنبيط", clue: "خضار أبيض", emoji: "🥦" },
        { word: "بروكلي", clue: "خضار أخضر", emoji: "🥦" },
        { word: "فجل", clue: "خضار أحمر", emoji: "🌶️" },
        { word: "لفت", clue: "خضار جذري", emoji: "🥕" },
        { word: "سبانخ", clue: "خضار ورقي", emoji: "🥬" },
        { word: "بقدونس", clue: "نبات عطري", emoji: "🌿" }
    ],
    furniture: [
        { word: "سرير", clue: "للنوم", emoji: "🛏️" },
        { word: "كرسي", clue: "للجلوس", emoji: "🪑" },
        { word: "طاولة", clue: "للأكل", emoji: "🪑" },
        { word: "خزانة", clue: "للملابس", emoji: "🗄️" },
        { word: "أريكة", clue: "للجلوس", emoji: "🛋️" },
        { word: "رف", clue: "للكتب", emoji: "📚" },
        { word: "مكتب", clue: "للعمل", emoji: "🖥️" },
        { word: "مرآة", clue: "للنظر", emoji: "🪞" },
        { word: "سجادة", clue: "للأرضية", emoji: "🧶" },
        { word: "ستارة", clue: "للنافذة", emoji: "🪟" },
        { word: "ثريا", clue: "للإضاءة", emoji: "💡" },
        { word: "مصباح", clue: "للإضاءة", emoji: "🔦" },
        { word: "وسادة", clue: "للراحة", emoji: "🛏️" },
        { word: "مقعد", clue: "للجلوس", emoji: "🪑" },
        { word: "ساعة", clue: "للوقت", emoji: "🕐" },
        { word: "شماعة", clue: "للملابس", emoji: "👔" },
        { word: "مزهرية", clue: "للزهور", emoji: "🌺" }
    ],
    custom: []
};

// Game Variables
const POINTS = {
    IMPOSTOR_WIN: 10,
    IMPOSTOR_CAUGHT: -5,
    CITIZEN_WIN: 5,
    CITIZEN_LOSS: -3,
    CORRECT_VOTE: 3,
    WRONG_VOTE: -1
};

let leaderboardRef = null;
let gameMode = 'offline';
let currentRoomCode = null;
let currentPlayerName = null;
let isHost = false;
let roomRef = null;
let playersRef = null;
let gameRef = null;
let bannedPlayersRef = null;
let hostVotesRef = null;
let hasVoted = false;
let hasSeenWord = false;
let hasReadyToVote = false;
let hasVotedForHost = false;
let onlineTimerInterval = null;
let isRoomClosed = false;
let players = [];
let impostors = [];
let currentWord = "";
let currentHint = "";
let currentWordEmoji = "";
let currentPlayerIndex = 0;
let timerInterval = null;
let votes = {};
let firstPlayer = "";
let clueEnabled = true;
let wordVisible = false;
let currentHostName = null;

// Helper Functions
function createConfetti() {
    const colors = ['#ffd700', '#ff6b6b', '#4facfe', '#43e97b', '#f093fb'];
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

function selectMode(mode) {
    playSelectSound();
    gameMode = mode;
    if (mode === 'offline') {
        showScreen('offlineSetupScreen');
    } else {
        loadPlayerName();
        showScreen('onlineRoomScreen');
    }
}

function backToMode() {
    playClickSound();
    if (roomRef) {
        leaveRoom();
    }
    currentRoomCode = null;
    currentPlayerName = null;
    isHost = false;
    hasVoted = false;
    hasSeenWord = false;
    hasReadyToVote = false;
    hasVotedForHost = false;
    isRoomClosed = false;
    if (onlineTimerInterval) {
        clearInterval(onlineTimerInterval);
        onlineTimerInterval = null;
    }
    showScreen('modeScreen');
}

function updateLeaderboard() {
    if (!leaderboardRef) return;
    leaderboardRef.once('value').then(snapshot => {
        const leaderboardData = snapshot.val() || {};
        const leaderboardArray = Object.entries(leaderboardData).map(([name, data]) => ({
            name,
            points: data.points || 0,
            wins: data.wins || 0,
            games: data.games || 0
        }));
        leaderboardArray.sort((a, b) => b.points - a.points);
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) return;
        leaderboardList.innerHTML = '';
        if (leaderboardArray.length === 0) {
            leaderboardList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7);">لا توجد بيانات بعد</p>';
            return;
        }
        leaderboardArray.forEach((player, index) => {
            const rank = index + 1;
            const item = document.createElement('div');
            item.className = `leaderboard-item ${rank <= 3 ? 'rank-' + rank : ''}`;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
            item.innerHTML = `
                <div class="leaderboard-rank">${rankEmoji}</div>
                <div class="leaderboard-name">${player.name}</div>
                <div class="leaderboard-points">${player.points} نقطة</div>
            `;
            leaderboardList.appendChild(item);
        });
    });
}

function updatePlayerPoints(playerName, pointsToAdd, reason) {
    if (!leaderboardRef) return;
    const playerRef = leaderboardRef.child(playerName);
    playerRef.transaction(currentData => {
        if (currentData === null) {
            return { points: pointsToAdd, wins: 0, games: 1 };
        }
        return {
            points: (currentData.points || 0) + pointsToAdd,
            wins: currentData.wins || 0,
            games: (currentData.games || 0) + 1
        };
    });
}

function incrementWins(playerName) {
    if (!leaderboardRef) return;
    const playerRef = leaderboardRef.child(playerName);
    playerRef.transaction(currentData => {
        if (currentData === null) {
            return { points: 0, wins: 1, games: 1 };
        }
        return {
            points: currentData.points || 0,
            wins: (currentData.wins || 0) + 1,
            games: currentData.games || 0
        };
    });
}

function toggleRoomStatus() {
    playClickSound();
    if (!isHost || !roomRef) return;
    isRoomClosed = !isRoomClosed;
    roomRef.update({ isClosed: isRoomClosed });
    const btn = document.getElementById('toggleRoomBtn');
    const status = document.getElementById('roomStatus');
    if (isRoomClosed) {
        btn.textContent = '🔓 فتح الغرفة';
        btn.className = 'success';
        status.textContent = '🔴 الغرفة مغلقة';
        status.className = 'room-status closed';
    } else {
        btn.textContent = '🔒 إغلاق الغرفة';
        btn.className = 'warning';
        status.textContent = '🟢 الغرفة مفتوحة';
        status.className = 'room-status open';
    }
}

function kickPlayer(playerName) {
    playClickSound();
    if (!isHost || !playersRef || !bannedPlayersRef) return;
    if (confirm(`هل تريد طرد ${playerName} من الغرفة؟`)) {
        bannedPlayersRef.child(playerName).set(true);
        playersRef.child(playerName).remove();
    }
}

function isPlayerBanned(playerName) {
    if (!bannedPlayersRef) return Promise.resolve(false);
    return bannedPlayersRef.child(playerName).once('value').then(snapshot => {
        return snapshot.exists();
    });
}

function voteForHost(playerName) {
    playClickSound();
    if (!hostVotesRef || hasVotedForHost) return;
    hostVotesRef.child(currentPlayerName).set(playerName);
    hasVotedForHost = true;
    updateHostVoteDisplay();
}

function setupHostVoting() {
    if (!playersRef || !hostVotesRef) return;
    
    playersRef.once('value').then(snapshot => {
        const playersData = snapshot.val() || {};
        const currentHost = Object.keys(playersData).find(name => playersData[name].isHost);
        
        if (!currentHost) {
            document.getElementById('hostVoteSection').style.display = 'none';
            return;
        }
        
        const playersList = Object.keys(playersData).filter(name => name !== currentHost);
        
        if (playersList.length === 0) {
            document.getElementById('hostVoteSection').style.display = 'none';
            return;
        }
        
        document.getElementById('hostVoteSection').style.display = 'block';
        const voteButtons = document.getElementById('hostVoteButtons');
        voteButtons.innerHTML = '';
        
        const totalPlayers = Object.keys(playersData).length;
        const requiredVotes = totalPlayers < 4 ? 2 : Math.ceil((totalPlayers - 1) / 2);
        
        playersList.forEach(playerName => {
            const btn = document.createElement('button');
            btn.className = 'vote-btn';
            btn.textContent = playerName;
            btn.style.width = 'auto';
            btn.style.padding = '10px 15px';
            btn.onclick = () => voteForHost(playerName);
            btn.disabled = hasVotedForHost;
            voteButtons.appendChild(btn);
        });
        
        const section = document.getElementById('hostVoteSection');
        const infoP = section.querySelector('p');
        if (infoP) {
            infoP.textContent = `اختر من يكون المضيف الجديد (${requiredVotes} أصوات مطلوبة)`;
        }
        
        updateHostVoteDisplay();
    });
}

function updateHostVoteDisplay() {
    if (!hostVotesRef || !playersRef) return;
    
    hostVotesRef.once('value').then(voteSnapshot => {
        const votes = voteSnapshot.val() || {};
        const voteCounts = {};
        
        Object.values(votes).forEach(votedFor => {
            voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
        });
        
        playersRef.once('value').then(playerSnapshot => {
            const playersData = playerSnapshot.val() || {};
            const totalPlayers = Object.keys(playersData).length;
            const votedPlayers = Object.keys(votes).length;
            const requiredVotes = totalPlayers < 4 ? 2 : Math.ceil((totalPlayers - 1) / 2);
            
            let statusText = `<strong>التصويت: ${votedPlayers}/${totalPlayers - 1} | المطلوب: ${requiredVotes}</strong>`;
            
            const voteDetails = Object.entries(voteCounts).map(([player, count]) => {
                return `${player}: ${count} 🗳️`;
            }).join(' | ');
            
            if (voteDetails) {
                statusText += `<br>${voteDetails}`;
            }
            
            const statusDiv = document.getElementById('hostVoteStatus');
            if (statusDiv) {
                statusDiv.innerHTML = statusText;
            }
        });
    });
}

function checkHostVotes() {
    if (!hostVotesRef || !playersRef) return;
    
    hostVotesRef.on('value', voteSnapshot => {
        const votes = voteSnapshot.val() || {};
        const voteCounts = {};
        
        Object.values(votes).forEach(votedFor => {
            voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
        });
        
        playersRef.once('value').then(playerSnapshot => {
            const playersData = playerSnapshot.val() || {};
            const totalPlayers = Object.keys(playersData).length;
            const requiredVotes = totalPlayers < 4 ? 2 : Math.ceil((totalPlayers - 1) / 2);
            
            Object.entries(voteCounts).forEach(([player, count]) => {
                if (count >= requiredVotes && playersData[player]) {
                    changeHost(player);
                }
            });
        });
    });
}

function changeHost(newHostName) {
    if (!roomRef || !playersRef) return;
    
    playersRef.once('value').then(snapshot => {
        const playersData = snapshot.val() || {};
        
        Object.keys(playersData).forEach(playerName => {
            playersRef.child(playerName).update({ isHost: playerName === newHostName });
        });
        
        roomRef.update({ host: newHostName });
        currentHostName = newHostName;
        
        if (isHost && newHostName !== currentPlayerName) {
            isHost = false;
            document.getElementById('hostSettings').style.display = 'none';
            document.getElementById('roomControlsDiv').style.display = 'none';
            showHostChangeNotification(newHostName);
        } else if (!isHost && newHostName === currentPlayerName) {
            isHost = true;
            document.getElementById('hostSettings').style.display = 'block';
            document.getElementById('roomControlsDiv').style.display = 'block';
            showHostChangeNotification(newHostName);
        }
        
        if (hostVotesRef) {
            hostVotesRef.remove();
            hasVotedForHost = false;
        }
    });
}

function showHostChangeNotification(newHostName) {
    const notificationDiv = document.getElementById('hostChangeNotification');
    notificationDiv.innerHTML = `
        <div class="host-change-notification">
            👑 ${newHostName} أصبح المضيف الجديد! 👑
        </div>
    `;
    setTimeout(() => {
        notificationDiv.innerHTML = '';
    }, 3000);
}

function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function showOnlineError(message) {
    const errorDiv = document.getElementById('onlineError');
    errorDiv.innerHTML = `<div class="alert error">${message}</div>`;
    setTimeout(() => {
        errorDiv.innerHTML = '';
    }, 3000);
}

// Helper function to get random word
function getRandomWord(category) {
    let wordList;
    if (category === 'custom') {
        loadCustomWords();
        if (customWords.length === 0) {
            return null;
        }
        wordList = customWords.map(w => ({ word: w, clue: "كلمة مخصصة", emoji: "📝" }));
    } else if (category === 'mixed') {
        const allWords = [];
        Object.values(words).forEach(catWords => {
            if (Array.isArray(catWords) && catWords.length > 0) {
                allWords.push(...catWords);
            }
        });
        wordList = allWords;
    } else {
        wordList = words[category];
    }
    
    if (!wordList || wordList.length === 0) return null;
    return wordList[Math.floor(Math.random() * wordList.length)];
}

// Update getHint function to get clue from word object
function getHint(wordObj) {
    if (typeof wordObj === 'string') {
        if (wordObj.length <= 2) return wordObj[0] + "*";
        return wordObj[0] + "*".repeat(wordObj.length - 2) + wordObj[wordObj.length - 1];
    }
    return wordObj.clue || "لا يوجد تلميح";
}

function createRoom() {
    playClickSound();
    const name = document.getElementById('playerName').value.trim();
    if (!name) {
        showOnlineError('الرجاء إدخال اسمك');
        return;
    }
    
    savePlayerName(name);
    
    currentPlayerName = name;
    currentRoomCode = generateRoomCode();
    isHost = true;
    currentHostName = currentPlayerName;
    roomRef = database.ref('rooms/' + currentRoomCode);
    leaderboardRef = roomRef.child('leaderboard');
    bannedPlayersRef = roomRef.child('bannedPlayers');
    hostVotesRef = roomRef.child('hostVotes');
    roomRef.set({
        host: currentPlayerName,
        status: 'waiting',
        isClosed: false,
        settings: {
            category: 'mixed',
            impostorCount: 1,
            timerDuration: 180,
            clueEnabled: true
        },
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        playersRef = roomRef.child('players');
        playersRef.child(currentPlayerName).set({
            name: currentPlayerName,
            isHost: true,
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        });
        listenToRoom();
        document.getElementById('displayRoomCode').textContent = currentRoomCode;
        document.getElementById('hostSettings').style.display = 'block';
        document.getElementById('roomControlsDiv').style.display = 'block';
        showScreen('lobbyScreen');
    }).catch(error => {
        showOnlineError('فشل إنشاء الغرفة: ' + error.message);
    });
}

function showJoinRoom() {
    playClickSound();
    document.getElementById('joinRoomDiv').style.display = 'block';
}

function joinRoom() {
    playClickSound();
    const name = document.getElementById('playerName').value.trim();
    const code = document.getElementById('roomCode').value.trim();
    if (!name) {
        showOnlineError('الرجاء إدخال اسمك');
        return;
    }
    if (code.length !== 6 || !/^\d+$/.test(code)) {
        showOnlineError('كود الغرفة يجب أن يكون 6 أرقام');
        return;
    }
    
    savePlayerName(name);
    
    currentPlayerName = name;
    currentRoomCode = code;
    isHost = false;
    roomRef = database.ref('rooms/' + currentRoomCode);
    leaderboardRef = roomRef.child('leaderboard');
    bannedPlayersRef = roomRef.child('bannedPlayers');
    hostVotesRef = roomRef.child('hostVotes');
    roomRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            showOnlineError('الغرفة غير موجودة');
            return;
        }
        const roomData = snapshot.val();
        currentHostName = roomData.host;
        if (roomData.isClosed) {
            showOnlineError('الغرفة مغلقة ولا يمكن الانضمام');
            return;
        }
        if (roomData.status !== 'waiting') {
            showOnlineError('اللعبة قد بدأت بالفعل');
            return;
        }
        if (roomData.players && roomData.players[currentPlayerName]) {
            showOnlineError('هذا الاسم مستخدم بالفعل');
            return;
        }
        isPlayerBanned(currentPlayerName).then(isBanned => {
            if (isBanned) {
                showOnlineError('تم طردك من هذه الغرفة');
                return;
            }
            playersRef = roomRef.child('players');
            playersRef.child(currentPlayerName).set({
                name: currentPlayerName,
                isHost: false,
                joinedAt: firebase.database.ServerValue.TIMESTAMP
            });
            listenToRoom();
            document.getElementById('displayRoomCode').textContent = currentRoomCode;
            document.getElementById('hostSettings').style.display = 'none';
            document.getElementById('roomControlsDiv').style.display = 'none';
            showScreen('lobbyScreen');
        });
    }).catch(error => {
        showOnlineError('فشل الانضمام: ' + error.message);
    });
}

function listenToRoom() {
    playersRef.on('value', snapshot => {
        const playersData = snapshot.val() || {};
        const playersList = Object.values(playersData);
        
        if (!playersData[currentPlayerName]) {
            if (!isHost) {
                alert('تم طردك من الغرفة');
                leaveRoom();
                return;
            }
        }
        
        const newHost = Object.keys(playersData).find(name => playersData[name].isHost);
        if (newHost) {
            currentHostName = newHost;
            if (currentPlayerName === newHost && !isHost) {
                isHost = true;
                document.getElementById('hostSettings').style.display = 'block';
                document.getElementById('roomControlsDiv').style.display = 'block';
            } else if (currentPlayerName !== newHost && isHost) {
                isHost = false;
                document.getElementById('hostSettings').style.display = 'none';
                document.getElementById('roomControlsDiv').style.display = 'none';
                showHostChangeNotification(newHost);
            }
        }
        
        updateOnlinePlayerList(playersList);
        updateMaxImpostors(playersList.length);
        document.getElementById('playerCount').textContent = playersList.length;
        
        if (isHost && playersList.length >= 3) {
            document.getElementById('startOnlineGameBtn').style.display = 'block';
            document.getElementById('waitingStatus').style.display = 'none';
        } else {
            document.getElementById('startOnlineGameBtn').style.display = 'none';
            document.getElementById('waitingStatus').style.display = 'block';
        }
        
        setupHostVoting();
    });
    
    roomRef.child('isClosed').on('value', snapshot => {
        const closed = snapshot.val() || false;
        if (!isHost) {
            const status = document.getElementById('roomStatus');
            if (closed) {
                status.textContent = '🔴 الغرفة مغلقة';
                status.className = 'room-status closed';
            } else {
                status.textContent = '🟢 الغرفة مفتوحة';
                status.className = 'room-status open';
            }
        }
    });
    
    leaderboardRef.on('value', () => {
        updateLeaderboard();
    });
    
    checkHostVotes();
    
    // Listen to room status changes
    roomRef.child('status').on('value', snapshot => {
        const status = snapshot.val();
        if (status === 'waiting') {
            // Reset all game states when room goes back to waiting
            hasVoted = false;
            hasSeenWord = false;
            hasReadyToVote = false;
            
            if (onlineTimerInterval) {
                clearInterval(onlineTimerInterval);
                onlineTimerInterval = null;
            }
            
            // If currently in a game screen, return to lobby
            const currentScreen = document.querySelector('.screen.active');
            if (currentScreen && ['onlineGameScreen', 'onlineVotingScreen', 'onlineResultsScreen'].includes(currentScreen.id)) {
                showScreen('lobbyScreen');
            }
        }
    });

    gameRef = roomRef.child('game');
    gameRef.on('value', snapshot => {
        const gameData = snapshot.val();
        if (gameData) {
            handleGameStateChange(gameData);
        }
    });
}

function updateMaxImpostors(playerCount) {
    const maxImpostors = Math.max(1, playerCount - 1);
    const impostorInput = document.getElementById('onlineImpostorCount');
    if (impostorInput) {
        impostorInput.max = maxImpostors;
        const display = document.getElementById('maxImpostorsDisplay');
        if (display) {
            display.textContent = maxImpostors;
        }
        if (parseInt(impostorInput.value) > maxImpostors) {
            impostorInput.value = maxImpostors;
        }
    }
}

function updateOnlinePlayerList(playersList) {
    const list = document.getElementById('onlinePlayerList');
    list.innerHTML = '';
    playersList.forEach(player => {
        const item = document.createElement('div');
        item.className = player.isHost ? 'player-item host' : 'player-item';
        let actionButtons = '';
        if (isHost && !player.isHost) {
            actionButtons = `
                <div class="player-actions">
                    <button onclick="kickPlayer('${player.name}')" class="danger" style="font-size: 0.85em; padding: 6px 12px;">طرد ❌</button>
                </div>
            `;
        }
        item.innerHTML = `
            <span class="name">${player.name}${player.isHost ? ' 👑' : ''}</span>
            ${actionButtons}
        `;
        list.appendChild(item);
    });
}

function startOnlineGame() {
    playSelectSound();
    if (!isHost) return;
    playersRef.once('value').then(snapshot => {
        const playersData = snapshot.val() || {};
        const playersList = Object.keys(playersData);
        if (playersList.length < 3) {
            showOnlineError('يجب وجود 3 لاعبين على الأقل');
            return;
        }
        const category = document.getElementById('onlineCategorySelect').value;
        const impostorCount = parseInt(document.getElementById('onlineImpostorCount').value);
        const timerDuration = parseFloat(document.getElementById('onlineTimerDuration').value) * 60;
        const clueEnabled = document.getElementById('onlineClueEnabled').checked;
        const maxImpostors = playersList.length - 1;
        if (impostorCount >= playersList.length || impostorCount > maxImpostors) {
            showOnlineError(`عدد الجواسيس يجب أن يكون أقل من ${maxImpostors + 1}`);
            return;
        }
        
        const wordObj = getRandomWord(category);
        
        if (!wordObj) {
            showOnlineError('لا توجد كلمات مخصصة. أضف كلمات أولاً!');
            return;
        }
        
        const selectedWord = wordObj.word;
        const hint = getHint(wordObj);
        const wordEmoji = wordObj.emoji || "";
        const shuffledPlayers = [...playersList].sort(() => Math.random() - 0.5);
        const selectedImpostors = shuffledPlayers.slice(0, impostorCount);
        const firstPlayer = playersList[Math.floor(Math.random() * playersList.length)];
        
        const gameState = {
            status: 'showing_words',
            word: selectedWord,
            hint: hint,
            emoji: wordEmoji,
            impostors: selectedImpostors.reduce((obj, name) => {
                obj[name] = true;
                return obj;
            }, {}),
            clueEnabled: clueEnabled,
            timerDuration: timerDuration,
            firstPlayer: firstPlayer,
            playersSeen: {},
            readyToVote: {},
            votes: {},
            startedAt: firebase.database.ServerValue.TIMESTAMP
        };
        roomRef.update({ status: 'playing' });
        gameRef.set(gameState);
    });
}

function handleGameStateChange(gameData) {
    if (!gameData) return;
    
    // Check if room is back to waiting status - return to lobby
    roomRef.child('status').once('value').then(snapshot => {
        const roomStatus = snapshot.val();
        if (roomStatus === 'waiting') {
            // Reset states and show lobby
            hasVoted = false;
            hasSeenWord = false;
            hasReadyToVote = false;
            
            if (onlineTimerInterval) {
                clearInterval(onlineTimerInterval);
                onlineTimerInterval = null;
            }
            
            showScreen('lobbyScreen');
            return;
        }
        
        // Continue with normal game state handling
        switch (gameData.status) {
            case 'showing_words':
                showOnlineWord(gameData);
                break;
            case 'voting':
                showOnlineVoting(gameData);
                break;
            case 'results':
                showOnlineResults(gameData);
                break;
        }
    });
}

function showOnlineWord(gameData) {
    showScreen('onlineGameScreen');
    const isImpostor = gameData.impostors && gameData.impostors[currentPlayerName];
    const wordDisplay = document.getElementById('onlineWordDisplay');
    const buttonContainer = document.getElementById('onlineShowHideButtonContainer');
    const readyVoteContainer = document.getElementById('onlineReadyVoteContainer');
    
    if (!hasSeenWord) {
        if (isImpostor) {
            wordDisplay.innerHTML = `
                <div id="onlineWordCard" class="word-display impostor-display">
                    <div id="onlineActualWord" class="word-content word-hidden">
                        <h2>🕵️ أنت الجاسوس!</h2>
                        <div class="clue-text">التلميح: ${gameData.hint}</div>
                        <div id="onlineEmojiContainer" class="emoji-container emoji-hidden">
                            <div class="emoji-display impostor-emoji">${IMPOSTOR_EMOJI}</div>
                        </div>
                    </div>
                    <div id="onlinePlaceholder" class="hidden-placeholder">🔒</div>
                </div>
            `;
        } else {
            const emojiHTML = gameData.emoji ? 
                `<div class="emoji-display">${gameData.emoji}</div>` : 
                '';
            
            wordDisplay.innerHTML = `
                <div id="onlineWordCard" class="word-display">
                    <div id="onlineActualWord" class="word-content word-hidden">
                        <h2>${gameData.word}</h2>
                        <div id="onlineEmojiContainer" class="emoji-container emoji-hidden">
                            ${emojiHTML}
                        </div>
                    </div>
                    <div id="onlinePlaceholder" class="hidden-placeholder">🔒</div>
                </div>
            `;
        }
        buttonContainer.innerHTML = `
            <button id="onlineToggleWordBtn" class="show-hide-btn" onclick="toggleOnlineWordVisibility()">
                <span class="eye-icon">👁️</span> إظهار الدور
            </button>
        `;
    }
    
    if (gameData.timerEndTime) {
        startOnlineTimerDisplay(gameData.timerEndTime);
        
        // Only show ready to vote button if user hasn't marked ready yet
        if (!hasReadyToVote) {
            readyVoteContainer.innerHTML = `
                <button class="warning" onclick="setReadyToVote()">
                    جاهز للتصويت 🗳️
                </button>
            `;
        } else {
            readyVoteContainer.innerHTML = `
                <div class="alert success">✅ أنت جاهز للتصويت! في انتظار اللاعبين الآخرين...</div>
            `;
        }
    }
    checkAllPlayersSeen(gameData);
    checkAllPlayersReady(gameData);
}

function toggleOnlineWordVisibility() {
    playRevealSound();
    const wordElement = document.getElementById('onlineActualWord');
    const placeholderElement = document.getElementById('onlinePlaceholder');
    const button = document.getElementById('onlineToggleWordBtn');
    const emojiContainer = document.getElementById('onlineEmojiContainer');
    
    if (!hasSeenWord) {
        wordElement.classList.remove('word-hidden');
        wordElement.classList.add('word-visible');
        placeholderElement.style.display = 'none';
        
        if (emojiContainer) {
            emojiContainer.classList.remove('emoji-hidden');
            emojiContainer.classList.add('emoji-visible');
        }
        
        button.innerHTML = '<span class="eye-icon">✅</span> شاهدت الدور';
        button.disabled = true;
        hasSeenWord = true;
        gameRef.child('playersSeen').child(currentPlayerName).set(true);
    }
}

function setReadyToVote() {
    playClickSound();
    if (hasReadyToVote) return;
    hasReadyToVote = true;
    gameRef.child('readyToVote').child(currentPlayerName).set(true);
    document.getElementById('onlineReadyVoteContainer').innerHTML = `
        <div class="alert success">✅ أنت جاهز للتصويت! في انتظار اللاعبين الآخرين...</div>
    `;
}

function showFirstPlayerAnnouncement(firstPlayerName) {
    const readyVoteContainer = document.getElementById('onlineReadyVoteContainer');
    
    // Play a special sound
    playSelectSound();
    
    // Create announcement HTML
    const isCurrentPlayer = firstPlayerName === currentPlayerName;
    const backgroundColor = isCurrentPlayer ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)' : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
    const textColor = isCurrentPlayer ? '#333' : '#667eea';
    
    readyVoteContainer.innerHTML = `
        <div class="alert success" style="
            background: ${backgroundColor};
            color: ${textColor};
            font-size: 1.2em;
            padding: 20px;
            margin: 20px 0;
            animation: pulse 2s ease-in-out 3;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        ">
            ${isCurrentPlayer ? '🎯 أنت من سيبدأ اللعبة! 🎯' : `🎯 ${firstPlayerName} سيبدأ اللعبة 🎯`}
        </div>
    `;
    
    // Clear the announcement after timer starts
    setTimeout(() => {
        readyVoteContainer.innerHTML = '';
    }, 3000);
}

function checkAllPlayersSeen(gameData) {
    if (!gameData.playersSeen) return;
    playersRef.once('value').then(snapshot => {
        const playersData = snapshot.val() || {};
        const playersList = Object.keys(playersData);
        const seenList = Object.keys(gameData.playersSeen || {});
        if (seenList.length === playersList.length && !gameData.timerEndTime) {
            // Show first player announcement
            if (gameData.firstPlayer) {
                showFirstPlayerAnnouncement(gameData.firstPlayer);
            }
            
            if (isHost) {
                setTimeout(() => {
                    startOnlineTimer(gameData.timerDuration);
                }, 3000);
            }
        }
    });
}

function checkAllPlayersReady(gameData) {
    if (!gameData.readyToVote) return;
    playersRef.once('value').then(snapshot => {
        const playersData = snapshot.val() || {};
        const playersList = Object.keys(playersData);
        const readyList = Object.keys(gameData.readyToVote || {});
        if (readyList.length === playersList.length) {
            if (isHost) {
                if (onlineTimerInterval) {
                    clearInterval(onlineTimerInterval);
                }
                gameRef.update({ status: 'voting' });
            }
        }
    });
}

function startOnlineTimer(duration) {
    const endTime = Date.now() + (duration * 1000);
    if (isHost) {
        gameRef.update({ timerEndTime: endTime });
    }
}

function startOnlineTimerDisplay(timerEndTime) {
    const timerDisplay = document.getElementById('onlineTimerDisplay');
    const readyVoteContainer = document.getElementById('onlineReadyVoteContainer');
    
    timerDisplay.style.display = 'block';
    if (onlineTimerInterval) {
        clearInterval(onlineTimerInterval);
    }
    
    // Show ready to vote button after a short delay ONLY if player hasn't pressed it yet
    setTimeout(() => {
        if (!hasReadyToVote) {
            readyVoteContainer.innerHTML = `
                <button class="warning" onclick="setReadyToVote()">
                    جاهز للتصويت 🗳️
                </button>
            `;
        } else {
            readyVoteContainer.innerHTML = `
                <div class="alert success">✅ أنت جاهز للتصويت! في انتظار اللاعبين الآخرين...</div>
            `;
        }
    }, 3500);
    
    let lastSecond = -1;
    onlineTimerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((timerEndTime - Date.now()) / 1000));
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (remaining <= 30) {
            timerDisplay.classList.add('warning');
            if (remaining !== lastSecond && remaining <= 10 && remaining > 0) {
                playTimerSound();
            }
        } else {
            timerDisplay.classList.remove('warning');
        }
        lastSecond = remaining;
        if (remaining <= 0) {
            clearInterval(onlineTimerInterval);
            timerDisplay.textContent = 'انتهى الوقت!';
            if (isHost) {
                setTimeout(() => {
                    gameRef.update({ status: 'voting' });
                }, 2000);
            }
        }
    }, 1000);
}

function showOnlineVoting(gameData) {
    showScreen('onlineVotingScreen');
    document.getElementById('onlineVoteWaiting').style.display = 'none';
    if (!hasVoted) {
        const voteButtons = document.getElementById('onlineVoteButtons');
        voteButtons.innerHTML = '';
        playersRef.once('value').then(snapshot => {
            const playersData = snapshot.val() || {};
            const playersList = Object.keys(playersData);
            playersList.forEach(playerName => {
                const btn = document.createElement('button');
                btn.className = 'vote-btn';
                btn.textContent = playerName;
                btn.onclick = () => voteOnline(playerName, btn);
                voteButtons.appendChild(btn);
            });
        });
    } else {
        document.getElementById('onlineVoteWaiting').style.display = 'block';
    }
    checkAllPlayersVoted(gameData);
}

function voteOnline(playerName, btn) {
    playVoteSound();
    if (hasVoted) return;
    gameRef.child('votes').child(currentPlayerName).set(playerName);
    hasVoted = true;
    btn.classList.add('voted');
    Array.from(document.querySelectorAll('.vote-btn')).forEach(b => b.disabled = true);
    document.getElementById('onlineVoteWaiting').style.display = 'block';
}

function checkAllPlayersVoted(gameData) {
    if (!gameData.votes) return;
    playersRef.once('value').then(snapshot => {
        const playersData = snapshot.val() || {};
        const playersList = Object.keys(playersData);
        const votesList = Object.keys(gameData.votes || {});
        if (votesList.length === playersList.length) {
            if (isHost) {
                setTimeout(() => {
                    calculateAndDistributePoints(gameData);
                }, 2000);
            }
        }
    });
}

function calculateAndDistributePoints(gameData) {
    const votes = gameData.votes || {};
    const impostors = Object.keys(gameData.impostors || {});
    const voteCounts = {};
    Object.values(votes).forEach(votedFor => {
        voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    });
    let mostVotedPlayer = null;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([player, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            mostVotedPlayer = player;
        }
    });
    const impostorsCaught = mostVotedPlayer && impostors.includes(mostVotedPlayer);
    let winner = null;
    const pointsDistribution = {};
    playersRef.once('value').then(snapshot => {
        const playersData = snapshot.val() || {};
        const playersList = Object.keys(playersData);
        playersList.forEach(player => {
            const isImpostor = impostors.includes(player);
            const votedFor = votes[player];
            let points = 0;
            if (isImpostor) {
                if (impostorsCaught) {
                    points = POINTS.IMPOSTOR_CAUGHT;
                } else {
                    points = POINTS.IMPOSTOR_WIN;
                    if (!winner) winner = player;
                }
            } else {
                if (impostorsCaught) {
                    points = POINTS.CITIZEN_WIN;
                    if (!winner) winner = player;
                } else {
                    points = POINTS.CITIZEN_LOSS;
                }
            }
            if (votedFor && impostors.includes(votedFor)) {
                points += POINTS.CORRECT_VOTE;
            } else if (votedFor) {
                points += POINTS.WRONG_VOTE;
            }
            pointsDistribution[player] = points;
            updatePlayerPoints(player, points, 'game_end');
        });
        if (winner) {
            incrementWins(winner);
        }
        gameRef.update({
            status: 'results',
            winner: winner,
            impostorsCaught: impostorsCaught,
            pointsDistribution: pointsDistribution
        });
    });
}

function showOnlineResults(gameData) {
    showScreen('onlineResultsScreen');
    
    const impostorsCaught = gameData.impostorsCaught;
    if (impostorsCaught) {
        playCitizensWinSound();
    } else {
        playImpostorWinSound();
    }
    
    createConfetti();
    const winnerDiv = document.getElementById('onlineWinnerAnnouncement');
    if (gameData.winner) {
        const isImpostor = gameData.impostors[gameData.winner];
        const winnerPoints = gameData.pointsDistribution[gameData.winner] || 0;
        winnerDiv.innerHTML = `
            <div class="winner-announcement">
                <h2>🏆 الفائز 🏆</h2>
                <div class="winner-name">${gameData.winner}</div>
                <p style="font-size: 1.2em; color: #333; margin-top: 10px;">
                    ${isImpostor ? 'الجاسوس فاز! 🕵️' : 'المواطنون فازوا! 👥'}
                </p>
                <div class="points-earned">+${winnerPoints} نقطة</div>
            </div>
        `;
    }
    
    // Show word and first player
    let wordRevealHTML = `<div class="word-display"><h2>الكلمة كانت: ${gameData.word}</h2>`;
    if (gameData.firstPlayer) {
        wordRevealHTML += `<p style="margin-top: 10px; font-size: 1.1em;">🎯 اللاعب الأول كان: <strong>${gameData.firstPlayer}</strong></p>`;
    }
    wordRevealHTML += `</div>`;
    document.getElementById('onlineWordReveal').innerHTML = wordRevealHTML;
    
    const voteCounts = {};
    Object.values(gameData.votes || {}).forEach(votedFor => {
        voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    });
    const sortedVotes = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
    let voteHtml = '<div class="vote-results"><h3 style="text-align: center; margin-bottom: 15px;">نتائج التصويت</h3>';
    if (sortedVotes.length > 0) {
        sortedVotes.forEach(([player, count]) => {
            const isImpostor = gameData.impostors[player];
            voteHtml += `
                <div class="vote-result-item">
                    <span>${player} ${isImpostor ? '🕵️ (جاسوس)' : ''}</span>
                    <span>${count} ${count === 1 ? 'صوت' : 'أصوات'}</span>
                </div>
            `;
        });
    } else {
        voteHtml += '<p style="text-align: center; color: #666;">لم يتم التصويت</p>';
    }
    voteHtml += '</div>';
    document.getElementById('onlineVoteResultsDiv').innerHTML = voteHtml;
    const impostorsList = Object.keys(gameData.impostors || {});
    let impostorHtml = '<h3 style="margin: 30px 0 15px; text-align: center;">الجواسيس الحقيقيون:</h3>';
    impostorsList.forEach(impostor => {
        impostorHtml += `<div class="word-display impostor-display"><h2>🕵️ ${impostor}</h2></div>`;
    });
    document.getElementById('onlineImpostorReveal').innerHTML = impostorHtml;
    const pointsDistribution = gameData.pointsDistribution || {};
    let pointsHtml = '<div class="vote-results"><h3 style="text-align: center; margin-bottom: 15px;">توزيع النقاط</h3>';
    Object.entries(pointsDistribution).forEach(([player, points]) => {
        const pointsColor = points > 0 ? '#2f7d32' : points < 0 ? '#d32f2f' : '#666';
        pointsHtml += `
            <div class="vote-result-item">
                <span>${player}</span>
                <span style="color: ${pointsColor}; font-weight: bold;">
                    ${points > 0 ? '+' : ''}${points} نقطة
                </span>
            </div>
        `;
    });
    pointsHtml += '</div>';
    document.getElementById('onlinePointsDistribution').innerHTML = pointsHtml;
    updateLeaderboard();
}

function backToLobby() {
    playClickSound();
    
    // Reset all player states
    hasVoted = false;
    hasSeenWord = false;
    hasReadyToVote = false;
    hasVotedForHost = false;
    
    // Clear timer
    if (onlineTimerInterval) {
        clearInterval(onlineTimerInterval);
        onlineTimerInterval = null;
    }
    
    // Clear timer display
    const timerDisplay = document.getElementById('onlineTimerDisplay');
    if (timerDisplay) {
        timerDisplay.style.display = 'none';
        timerDisplay.textContent = '';
        timerDisplay.classList.remove('warning');
    }
    
    // Clear all game containers
    document.getElementById('onlineWordDisplay').innerHTML = '';
    document.getElementById('onlineShowHideButtonContainer').innerHTML = '';
    document.getElementById('onlineReadyVoteContainer').innerHTML = '';
    document.getElementById('onlineVoteButtons').innerHTML = '';
    document.getElementById('onlineVoteWaiting').style.display = 'none';
    
    // Host: Remove game data and reset room status
    if (isHost) {
        gameRef.remove().then(() => {
            roomRef.update({ status: 'waiting' });
        });
    }
    
    // Update leaderboard
    updateLeaderboard();
    
    // Show lobby screen
    showScreen('lobbyScreen');
}

function leaveRoom() {
    if (!currentRoomCode || !currentPlayerName) return;
    
    const wasHost = isHost;
    
    if (playersRef) {
        if (wasHost) {
            playersRef.once('value').then(snapshot => {
                const playersData = snapshot.val() || {};
                const remainingPlayers = Object.keys(playersData).filter(name => name !== currentPlayerName);
                
                if (remainingPlayers.length > 0) {
                    const newHost = remainingPlayers[0];
                    playersRef.child(newHost).update({ isHost: true });
                    playersRef.child(currentPlayerName).remove();
                    roomRef.update({ host: newHost });
                } else {
                    roomRef.remove();
                }
            });
        } else {
            playersRef.child(currentPlayerName).remove();
        }
    }
    
    if (playersRef) playersRef.off();
    if (gameRef) gameRef.off();
    if (leaderboardRef) leaderboardRef.off();
    if (bannedPlayersRef) bannedPlayersRef.off();
    if (hostVotesRef) hostVotesRef.off();
    if (roomRef) {
        roomRef.child('status').off();
        roomRef.child('isClosed').off();
        roomRef.off();
    }
    if (onlineTimerInterval) {
        clearInterval(onlineTimerInterval);
        onlineTimerInterval = null;
    }
    
    currentRoomCode = null;
    currentPlayerName = null;
    isHost = false;
    currentHostName = null;
    roomRef = null;
    playersRef = null;
    gameRef = null;
    leaderboardRef = null;
    bannedPlayersRef = null;
    hostVotesRef = null;
    hasVoted = false;
    hasSeenWord = false;
    hasReadyToVote = false;
    hasVotedForHost = false;
    isRoomClosed = false;
    
    backToMode();
}

function addPlayer() {
    playClickSound();
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim();
    const errorDiv = document.getElementById('errorMessage');
    if (!name) {
        showError('الرجاء إدخال اسم اللاعب');
        return;
    }
    if (players.includes(name)) {
        showError('هذا الاسم موجود بالفعل');
        return;
    }
    players.push(name);
    input.value = '';
    errorDiv.innerHTML = '';
    updatePlayerList();
    updateOfflineMaxImpostors();
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.innerHTML = `<div class="alert error">${message}</div>`;
    setTimeout(() => {
        errorDiv.innerHTML = '';
    }, 3000);
}

function updatePlayerList() {
    const list = document.getElementById('playerList');
    list.innerHTML = '';
    players.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'player-item';
        item.innerHTML = `
            <span class="name">${player}</span>
            <button onclick="removePlayer(${index})">حذف</button>
        `;
        list.appendChild(item);
    });
}

function removePlayer(index) {
    playClickSound();
    players.splice(index, 1);
    updatePlayerList();
    updateOfflineMaxImpostors();
}

function updateOfflineMaxImpostors() {
    const maxImpostors = Math.max(1, players.length - 1);
    const impostorInput = document.getElementById('impostorCount');
    if (impostorInput) {
        impostorInput.max = maxImpostors;
        const display = document.getElementById('offlineMaxImpostorsDisplay');
        if (display) {
            display.textContent = maxImpostors;
        }
        if (parseInt(impostorInput.value) > maxImpostors) {
            impostorInput.value = maxImpostors;
        }
    }
}

function startOfflineGame() {
    playSelectSound();
    if (players.length < 3) {
        showError('يجب إضافة 3 لاعبين على الأقل');
        return;
    }
    const impostorCount = parseInt(document.getElementById('impostorCount').value);
    const maxImpostors = players.length - 1;
    if (impostorCount >= players.length || impostorCount > maxImpostors) {
        showError(`عدد الجواسيس يجب أن يكون أقل من ${maxImpostors + 1}`);
        return;
    }
    clueEnabled = document.getElementById('clueEnabled').checked;
    const category = document.getElementById('categorySelect').value;
    
    const wordObj = getRandomWord(category);
    
    if (!wordObj) {
        showError('لا توجد كلمات مخصصة. أضف كلمات أولاً!');
        return;
    }
    
    currentWord = wordObj.word;
    currentHint = getHint(wordObj);
    currentWordEmoji = wordObj.emoji || "";
    
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    impostors = shuffledPlayers.slice(0, impostorCount);
    currentPlayerIndex = 0;
    votes = {};
    wordVisible = false;
    firstPlayer = players[Math.floor(Math.random() * players.length)];
    showScreen('wordScreen');
    showPlayerWord();
}

function showPlayerWord() {
    const player = players[currentPlayerIndex];
    const isImpostor = impostors.includes(player);
    wordVisible = false;
    document.getElementById('currentPlayerName').textContent = `🎮 ${player}`;
    const wordDisplay = document.getElementById('wordDisplay');
    const buttonContainer = document.getElementById('showHideButtonContainer');
    
    if (isImpostor) {
        wordDisplay.innerHTML = `
            <div id="wordCard" class="word-display impostor-display">
                <div id="actualWord" class="word-content word-hidden">
                    <h2>🕵️ أنت الجاسوس!</h2>
                    <div class="clue-text">التلميح: ${currentHint}</div>
                    <div id="emojiContainer" class="emoji-container emoji-hidden">
                        <div class="emoji-display impostor-emoji">${IMPOSTOR_EMOJI}</div>
                    </div>
                </div>
                <div id="placeholder" class="hidden-placeholder">🔒</div>
            </div>
        `;
    } else {
        const emojiHTML = currentWordEmoji ? 
            `<div class="emoji-display">${currentWordEmoji}</div>` : 
            '';
        
        wordDisplay.innerHTML = `
            <div id="wordCard" class="word-display">
                <div id="actualWord" class="word-content word-hidden">
                    <h2>${currentWord}</h2>
                    <div id="emojiContainer" class="emoji-container emoji-hidden">
                        ${emojiHTML}
                    </div>
                </div>
                <div id="placeholder" class="hidden-placeholder">🔒</div>
            </div>
        `;
    }
    
    buttonContainer.innerHTML = `
        <button id="toggleWordBtn" class="show-hide-btn" onclick="toggleWordVisibility()">
            <span class="eye-icon">👁️</span> إظهار الدور
        </button>
    `;
}

function toggleWordVisibility() {
    playRevealSound();
    wordVisible = !wordVisible;
    const wordElement = document.getElementById('actualWord');
    const cardElement = document.getElementById('wordCard');
    const placeholderElement = document.getElementById('placeholder');
    const button = document.getElementById('toggleWordBtn');
    const emojiContainer = document.getElementById('emojiContainer');
    const player = players[currentPlayerIndex];
    const isImpostor = impostors.includes(player);
    
    if (wordVisible) {
        wordElement.classList.remove('word-hidden');
        wordElement.classList.add('word-visible');
        placeholderElement.style.display = 'none';
        
        if (emojiContainer) {
            emojiContainer.classList.remove('emoji-hidden');
            emojiContainer.classList.add('emoji-visible');
        }
        
        button.innerHTML = '<span class="eye-icon">🙈</span> إخفاء';
        
        if (isImpostor) {
            cardElement.className = 'word-display impostor-display impostor-revealed';
        }
    } else {
        wordElement.classList.remove('word-visible');
        wordElement.classList.add('word-hidden');
        placeholderElement.style.display = 'block';
        
        if (emojiContainer) {
            emojiContainer.classList.remove('emoji-visible');
            emojiContainer.classList.add('emoji-hidden');
        }
        
        button.innerHTML = '<span class="eye-icon">👁️</span> إظهار الدور';
        cardElement.className = 'word-display';
    }
}

function nextPlayer() {
    playClickSound();
    currentPlayerIndex++;
    if (currentPlayerIndex >= players.length) {
        startGamePhase();
    } else {
        showPlayerWord();
    }
}

function startGamePhase() {
    showScreen('gameScreen');
    const alert = document.getElementById('firstPlayerAlert');
    alert.innerHTML = `<span style="display: inline-block; background: #ffd700; color: #333; padding: 8px 20px; border-radius: 20px; font-size: 0.9em; margin-right: 10px; box-shadow: 0 2px 10px rgba(255, 215, 0, 0.3);">🎯 يبدأ</span> ${firstPlayer}`;
    alert.style.display = 'block';
    const duration = parseFloat(document.getElementById('timerDuration').value);
    if (duration > 0) {
        startTimer(duration);
    }
    if (document.getElementById('votingEnabled').checked) {
        document.getElementById('votingSection').style.display = 'block';
        setupVoting();
    }
}

function startTimer(duration) {
    let timeLeft = duration;
    const timerDisplay = document.getElementById('timerDisplay');
    let lastSecond = -1;
    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft <= 30) {
            timerDisplay.classList.add('warning');
            if (timeLeft !== lastSecond && timeLeft <= 10 && timeLeft > 0) {
                playTimerSound();
            }
        } else {
            timerDisplay.classList.remove('warning');
        }
        lastSecond = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = 'انتهى الوقت!';
        } else {
            timeLeft--;
        }
    }
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function setupVoting() {
    const voteButtons = document.getElementById('voteButtons');
    voteButtons.innerHTML = '';
    players.forEach(player => {
        votes[player] = 0;
        const btn = document.createElement('button');
        btn.className = 'vote-btn';
        btn.textContent = player;
        btn.onclick = () => vote(player, btn);
        voteButtons.appendChild(btn);
    });
}

function vote(player, btn) {
    playVoteSound();
    votes[player]++;
    btn.classList.add('voted');
    btn.textContent = `${player} (${votes[player]})`;
}

function showVoteResults() {
    playSelectSound();
    const resultsDiv = document.getElementById('voteResults');
    const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    let html = '<h3 style="text-align: center; margin-bottom: 15px;">نتائج التصويت</h3>';
    sortedVotes.forEach(([player, count]) => {
        const isImpostor = impostors.includes(player);
        html += `
            <div class="vote-result-item">
                <span>${player} ${isImpostor ? '🕵️' : ''}</span>
                <span>${count} ${count === 1 ? 'صوت' : 'أصوات'}</span>
            </div>
        `;
    });
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
}

function revealImpostors() {
    playCitizensWinSound();
    createConfetti();
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    const revealDiv = document.getElementById('impostorReveal');
    let html = '<h2 style="text-align: center; color: #667eea; margin-bottom: 30px;">🎯 النتائج</h2>';
    html += `<div class="word-display"><h2>الكلمة كانت: ${currentWord}</h2></div>`;
    html += '<h3 style="margin: 30px 0 15px; text-align: center;">الجواسيس:</h3>';
    impostors.forEach(impostor => {
        html += `<div class="word-display impostor-display"><h2>🕵️ ${impostor}</h2></div>`;
    });
    html += '<h3 style="margin: 30px 0 15px; text-align: center;">اللاعبون العاديون:</h3>';
    const normalPlayers = players.filter(p => !impostors.includes(p));
    normalPlayers.forEach(player => {
        html += `<div class="word-display"><h2>✅ ${player}</h2></div>`;
    });
    revealDiv.innerHTML = html;
    showScreen('resultsScreen');
}

function resetGame() {
    playClickSound();
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    impostors = [];
    currentWord = "";
    currentHint = "";
    currentWordEmoji = "";
    currentPlayerIndex = 0;
    votes = {};
    firstPlayer = "";
    wordVisible = false;
    document.getElementById('voteResults').style.display = 'none';
    showScreen('offlineSetupScreen');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Event Listeners
document.getElementById('playerNameInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addPlayer();
    }
});

document.getElementById('customWordInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addCustomWord();
    }
});

// Initialize on load
window.addEventListener('load', () => {
    loadCustomWords();
    loadPlayerName();
});

window.addEventListener('beforeunload', () => {
    if (currentRoomCode && currentPlayerName) {
        leaveRoom();
    }
});
