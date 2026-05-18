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

// Impostor image (shown to impostors)
const IMPOSTOR_IMAGE = "https://res.cloudinary.com/djiukbvoa/image/upload/v1779100133/coca-cola-trigger-growth-festival-spy-illustration-03-1800x1200_q5rpll.jpg"; // Replace with your impostor image URL

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

// Word Database with pictures and clues
const words = {
    places: [
        { word: "مسجد", clue: "مكان عبادة", image: "https://www.magnific.com/free-photos-vectors/masjid-mosque" },
        { word: "مدرسة", clue: "مكان تعليم", image: "https://ar.pngtree.com/free-school-clipart" },
        { word: "مستشفى", clue: "مكان علاج", image: "https://www.magnific.com/free-photos-vectors/hospital" },
        { word: "مطار", clue: "مكان طيران", image: "https://www.magnific.com/free-photos-vectors/outside-airport" },
        { word: "محطة قطار", clue: "مكان سفر", image: "https://www.freepik.com/free-photos-vectors/train-station-facilities" },
        { word: "ملعب", clue: "مكان رياضة", image: "https://www.freepik.com/vectors/stadiums" },
        { word: "حديقة", clue: "مكان أخضر", image: "https://www.vecteezy.com/free-vector/city-park" },
        { word: "شاطئ", clue: "مكان بحر", image: "https://example.com/beach.jpg" },
        { word: "جبل", clue: "مكان عالي", image: "https://example.com/mountain.jpg" },
        { word: "صحراء", clue: "مكان رمل", image: "https://example.com/desert.jpg" },
        { word: "مكتبة", clue: "مكان كتب", image: "https://example.com/library.jpg" },
        { word: "متحف", clue: "مكان تاريخ", image: "https://example.com/museum.jpg" },
        { word: "سوق", clue: "مكان تسوق", image: "https://example.com/market.jpg" },
        { word: "محل", clue: "مكان بيع", image: "https://example.com/shop.jpg" },
        { word: "مطعم", clue: "مكان طعام", image: "https://example.com/restaurant.jpg" },
        { word: "مقهى", clue: "مكان قهوة", image: "https://example.com/cafe.jpg" },
        { word: "فندق", clue: "مكان إقامة", image: "https://example.com/hotel.jpg" },
        { word: "سينما", clue: "مكان أفلام", image: "https://example.com/cinema.jpg" },
        { word: "مسرح", clue: "مكان عروض", image: "https://example.com/theater.jpg" },
        { word: "حديقة حيوان", clue: "مكان حيوانات", image: "https://example.com/zoo.jpg" }
    ],
    jobs: [
        { word: "طبيب", clue: "يعالج المرضى", image: "https://example.com/doctor.jpg" },
        { word: "معلم", clue: "يعلم الطلاب", image: "https://example.com/teacher.jpg" },
        { word: "مهندس", clue: "يصمم ويبني", image: "https://example.com/engineer.jpg" },
        { word: "محامي", clue: "يدافع في المحكمة", image: "https://example.com/lawyer.jpg" },
        { word: "طيار", clue: "يقود الطائرة", image: "https://example.com/pilot.jpg" },
        { word: "شرطي", clue: "يحفظ الأمن", image: "https://example.com/police.jpg" },
        { word: "رجل إطفاء", clue: "يطفئ الحرائق", image: "https://example.com/firefighter.jpg" },
        { word: "طباخ", clue: "يطبخ الطعام", image: "https://example.com/chef.jpg" },
        { word: "نادل", clue: "يقدم الطعام", image: "https://example.com/waiter.jpg" },
        { word: "سائق", clue: "يقود السيارة", image: "https://example.com/driver.jpg" },
        { word: "كهربائي", clue: "يصلح الكهرباء", image: "https://example.com/electrician.jpg" },
        { word: "خباز", clue: "يخبز الخبز", image: "https://example.com/baker.jpg" },
        { word: "نجار", clue: "يعمل بالخشب", image: "https://example.com/carpenter.jpg" },
        { word: "حداد", clue: "يعمل بالحديد", image: "https://example.com/blacksmith.jpg" },
        { word: "بناء", clue: "يبني المنازل", image: "https://example.com/builder.jpg" },
        { word: "رسام", clue: "يرسم اللوحات", image: "https://example.com/painter.jpg" },
        { word: "مصور", clue: "يلتقط الصور", image: "https://example.com/photographer.jpg" },
        { word: "صحفي", clue: "يكتب الأخبار", image: "https://example.com/journalist.jpg" },
        { word: "كاتب", clue: "يكتب القصص", image: "https://example.com/writer.jpg" },
        { word: "مؤلف", clue: "يؤلف الكتب", image: "https://example.com/author.jpg" }
    ],
    items: [
        { word: "هاتف", clue: "جهاز اتصال", image: "https://example.com/phone.jpg" },
        { word: "حاسوب", clue: "جهاز إلكتروني", image: "https://example.com/computer.jpg" },
        { word: "تلفاز", clue: "شاشة عرض", image: "https://example.com/tv.jpg" },
        { word: "ثلاجة", clue: "جهاز تبريد", image: "https://example.com/fridge.jpg" },
        { word: "فرن", clue: "جهاز طبخ", image: "https://example.com/oven.jpg" },
        { word: "مكيف", clue: "جهاز تبريد", image: "https://example.com/ac.jpg" },
        { word: "مروحة", clue: "جهاز تهوية", image: "https://example.com/fan.jpg" },
        { word: "ساعة", clue: "جهاز وقت", image: "https://example.com/clock.jpg" },
        { word: "كاميرا", clue: "جهاز تصوير", image: "https://example.com/camera.jpg" },
        { word: "مفتاح", clue: "أداة فتح", image: "https://example.com/key.jpg" },
        { word: "قلم", clue: "أداة كتابة", image: "https://example.com/pen.jpg" },
        { word: "كتاب", clue: "للقراءة", image: "https://example.com/book.jpg" },
        { word: "دفتر", clue: "للكتابة", image: "https://example.com/notebook.jpg" },
        { word: "حقيبة", clue: "للحمل", image: "https://example.com/bag.jpg" },
        { word: "محفظة", clue: "للنقود", image: "https://example.com/wallet.jpg" },
        { word: "نظارة", clue: "للرؤية", image: "https://example.com/glasses.jpg" },
        { word: "مرآة", clue: "للانعكاس", image: "https://example.com/mirror.jpg" },
        { word: "فرشاة", clue: "للتنظيف", image: "https://example.com/brush.jpg" },
        { word: "مشط", clue: "للشعر", image: "https://example.com/comb.jpg" },
        { word: "صابون", clue: "للنظافة", image: "https://example.com/soap.jpg" }
    ],
    animals: [
        { word: "أسد", clue: "ملك الغابة", image: "https://example.com/lion.jpg" },
        { word: "نمر", clue: "حيوان مفترس", image: "https://example.com/tiger.jpg" },
        { word: "فهد", clue: "أسرع حيوان", image: "https://example.com/cheetah.jpg" },
        { word: "ذئب", clue: "حيوان مفترس", image: "https://example.com/wolf.jpg" },
        { word: "ثعلب", clue: "حيوان ذكي", image: "https://example.com/fox.jpg" },
        { word: "دب", clue: "حيوان ضخم", image: "https://example.com/bear.jpg" },
        { word: "قرد", clue: "حيوان ذكي", image: "https://example.com/monkey.jpg" },
        { word: "فيل", clue: "أكبر الحيوانات", image: "https://example.com/elephant.jpg" },
        { word: "زرافة", clue: "أطول حيوان", image: "https://example.com/giraffe.jpg" },
        { word: "حصان", clue: "حيوان ركوب", image: "https://example.com/horse.jpg" },
        { word: "حمار", clue: "حيوان حمل", image: "https://example.com/donkey.jpg" },
        { word: "جمل", clue: "سفينة الصحراء", image: "https://example.com/camel.jpg" },
        { word: "بقرة", clue: "حيوان الحليب", image: "https://example.com/cow.jpg" },
        { word: "خروف", clue: "حيوان الصوف", image: "https://example.com/sheep.jpg" },
        { word: "ماعز", clue: "حيوان أليف", image: "https://example.com/goat.jpg" },
        { word: "خنزير", clue: "حيوان مزرعة", image: "https://example.com/pig.jpg" },
        { word: "كلب", clue: "صديق الإنسان", image: "https://example.com/dog.jpg" },
        { word: "قطة", clue: "حيوان أليف", image: "https://example.com/cat.jpg" },
        { word: "أرنب", clue: "حيوان سريع", image: "https://example.com/rabbit.jpg" },
        { word: "فأر", clue: "حيوان صغير", image: "https://example.com/mouse.jpg" }
    ],
    meals: [
        { word: "بيتزا", clue: "طعام إيطالي", image: "https://example.com/pizza.jpg" },
        { word: "برجر", clue: "وجبة سريعة", image: "https://example.com/burger.jpg" },
        { word: "شاورما", clue: "طعام عربي", image: "https://example.com/shawarma.jpg" },
        { word: "كباب", clue: "لحم مشوي", image: "https://example.com/kebab.jpg" },
        { word: "ايس كريم", clue: "حلوى باردة", image: "https://example.com/icecream.jpg" },
        { word: "كسكس", clue: "طعام مغربي", image: "https://example.com/couscous.jpg" },
        { word: "ارز", clue: "حبوب", image: "https://example.com/rice.jpg" },
        { word: "لازانيا", clue: "معكرونة إيطالية", image: "https://example.com/lasagna.jpg" },
        { word: "سوشي", clue: "طعام ياباني", image: "https://example.com/sushi.jpg" },
        { word: "معكرونة", clue: "باستا", image: "https://example.com/pasta.jpg" },
        { word: "تاكو", clue: "طعام مكسيكي", image: "https://example.com/taco.jpg" },
        { word: "بوريتو", clue: "لفائف مكسيكية", image: "https://example.com/burrito.jpg" },
        { word: "ساندويتش", clue: "وجبة خفيفة", image: "https://example.com/sandwich.jpg" },
        { word: "هوت دوج", clue: "نقانق", image: "https://example.com/hotdog.jpg" },
        { word: "دجاج مقلي", clue: "وجبة سريعة", image: "https://example.com/fried-chicken.jpg" },
        { word: "ستيك", clue: "لحم بقري", image: "https://example.com/steak.jpg" },
        { word: "سمك مشوي", clue: "طعام بحري", image: "https://example.com/grilled-fish.jpg" },
        { word: "فاصولياء", clue: "بقوليات", image: "https://example.com/beans.jpg" },
        { word: "عدس", clue: "حبوب", image: "https://example.com/lentils.jpg" },
        { word: "بيض مقلي", clue: "وجبة إفطار", image: "https://example.com/fried-eggs.jpg" }
    ],
    countries: [
        { word: "مصر", clue: "أرض الأهرامات", image: "https://example.com/egypt.jpg" },
        { word: "السعودية", clue: "أرض الحرمين", image: "https://example.com/saudi.jpg" },
        { word: "الإمارات", clue: "برج خليفة", image: "https://example.com/uae.jpg" },
        { word: "المغرب", clue: "المغرب العربي", image: "https://example.com/morocco.jpg" },
        { word: "تونس", clue: "شمال أفريقيا", image: "https://example.com/tunisia.jpg" },
        { word: "فرنسا", clue: "برج إيفل", image: "https://example.com/france.jpg" },
        { word: "ألمانيا", clue: "أوروبا", image: "https://example.com/germany.jpg" },
        { word: "إيطاليا", clue: "برج بيزا", image: "https://example.com/italy.jpg" },
        { word: "إسبانيا", clue: "أوروبا", image: "https://example.com/spain.jpg" },
        { word: "بريطانيا", clue: "ساعة بيج بن", image: "https://example.com/uk.jpg" },
        { word: "اليابان", clue: "الشمس المشرقة", image: "https://example.com/japan.jpg" },
        { word: "الصين", clue: "سور الصين", image: "https://example.com/china.jpg" },
        { word: "كوريا", clue: "شرق آسيا", image: "https://example.com/korea.jpg" },
        { word: "الهند", clue: "تاج محل", image: "https://example.com/india.jpg" },
        { word: "تايلاند", clue: "جنوب آسيا", image: "https://example.com/thailand.jpg" },
        { word: "أمريكا", clue: "تمثال الحرية", image: "https://example.com/usa.jpg" },
        { word: "كندا", clue: "أمريكا الشمالية", image: "https://example.com/canada.jpg" },
        { word: "البرازيل", clue: "أمريكا الجنوبية", image: "https://example.com/brazil.jpg" },
        { word: "الأرجنتين", clue: "أمريكا الجنوبية", image: "https://example.com/argentina.jpg" },
        { word: "المكسيك", clue: "أمريكا الوسطى", image: "https://example.com/mexico.jpg" },
        { word: "أستراليا", clue: "قارة", image: "https://example.com/australia.jpg" },
        { word: "نيوزيلندا", clue: "أوقيانوسيا", image: "https://example.com/newzealand.jpg" },
        { word: "جنوب أفريقيا", clue: "أفريقيا", image: "https://example.com/southafrica.jpg" },
        { word: "نيجيريا", clue: "غرب أفريقيا", image: "https://example.com/nigeria.jpg" },
        { word: "كينيا", clue: "شرق أفريقيا", image: "https://example.com/kenya.jpg" },
        { word: "روسيا", clue: "أكبر دولة", image: "https://example.com/russia.jpg" },
        { word: "تركيا", clue: "بين قارتين", image: "https://example.com/turkey.jpg" },
        { word: "إيران", clue: "الشرق الأوسط", image: "https://example.com/iran.jpg" }
    ],
    fruits: [
        { word: "تفاح", clue: "فاكهة حمراء", image: "https://example.com/apple.jpg" },
        { word: "موز", clue: "فاكهة صفراء", image: "https://example.com/banana.jpg" },
        { word: "برتقال", clue: "فاكهة برتقالية", image: "https://example.com/orange.jpg" },
        { word: "عنب", clue: "فاكهة عناقيد", image: "https://example.com/grapes.jpg" },
        { word: "فراولة", clue: "فاكهة حمراء", image: "https://example.com/strawberry.jpg" },
        { word: "مانجو", clue: "فاكهة استوائية", image: "https://example.com/mango.jpg" },
        { word: "أناناس", clue: "فاكهة استوائية", image: "https://example.com/pineapple.jpg" },
        { word: "بطيخ", clue: "فاكهة صيفية", image: "https://example.com/watermelon.jpg" },
        { word: "شمام", clue: "فاكهة صيفية", image: "https://example.com/melon.jpg" },
        { word: "خوخ", clue: "فاكهة صيفية", image: "https://example.com/peach.jpg" },
        { word: "مشمش", clue: "فاكهة برتقالية", image: "https://example.com/apricot.jpg" },
        { word: "كمثرى", clue: "فاكهة خضراء", image: "https://example.com/pear.jpg" },
        { word: "رمان", clue: "فاكهة حمراء", image: "https://example.com/pomegranate.jpg" },
        { word: "تين", clue: "فاكهة صيفية", image: "https://example.com/fig.jpg" },
        { word: "كيوي", clue: "فاكهة خضراء", image: "https://example.com/kiwi.jpg" },
        { word: "ليمون", clue: "فاكهة حامضة", image: "https://example.com/lemon.jpg" },
        { word: "يوسفي", clue: "فاكهة شتوية", image: "https://example.com/tangerine.jpg" },
        { word: "توت", clue: "فاكهة صغيرة", image: "https://example.com/berries.jpg" },
        { word: "كرز", clue: "فاكهة حمراء", image: "https://example.com/cherry.jpg" },
        { word: "جوافة", clue: "فاكهة استوائية", image: "https://example.com/guava.jpg" }
    ],
    insects: [
        { word: "نملة", clue: "حشرة صغيرة", image: "https://example.com/ant.jpg" },
        { word: "نحلة", clue: "تنتج العسل", image: "https://example.com/bee.jpg" },
        { word: "ذبابة", clue: "حشرة طائرة", image: "https://example.com/fly.jpg" },
        { word: "بعوضة", clue: "حشرة لاسعة", image: "https://example.com/mosquito.jpg" },
        { word: "صرصور", clue: "حشرة منزلية", image: "https://example.com/cockroach.jpg" },
        { word: "جرادة", clue: "حشرة قافزة", image: "https://example.com/grasshopper.jpg" },
        { word: "فراشة", clue: "حشرة ملونة", image: "https://example.com/butterfly.jpg" },
        { word: "دبور", clue: "حشرة لاسعة", image: "https://example.com/wasp.jpg" },
        { word: "خنفساء", clue: "حشرة صلبة", image: "https://example.com/beetle.jpg" },
        { word: "دعسوقة", clue: "حشرة حمراء", image: "https://example.com/ladybug.jpg" },
        { word: "دودة", clue: "تزحف", image: "https://example.com/worm.jpg" },
        { word: "عنكبوت", clue: "ينسج الخيوط", image: "https://example.com/spider.jpg" },
        { word: "عقرب", clue: "له ذيل سام", image: "https://example.com/scorpion.jpg" },
        { word: "برغوث", clue: "حشرة قافزة", image: "https://example.com/flea.jpg" },
        { word: "قمل", clue: "حشرة الشعر", image: "https://example.com/lice.jpg" }
    ],
    vegetables: [
        { word: "طماطم", clue: "خضار أحمر", image: "https://example.com/tomato.jpg" },
        { word: "خيار", clue: "خضار أخضر", image: "https://example.com/cucumber.jpg" },
        { word: "خس", clue: "خضار ورقي", image: "https://example.com/lettuce.jpg" },
        { word: "جزر", clue: "خضار برتقالي", image: "https://example.com/carrot.jpg" },
        { word: "بصل", clue: "يبكي العين", image: "https://example.com/onion.jpg" },
        { word: "ثوم", clue: "نكهة قوية", image: "https://example.com/garlic.jpg" },
        { word: "فلفل", clue: "خضار حار", image: "https://example.com/pepper.jpg" },
        { word: "باذنجان", clue: "خضار بنفسجي", image: "https://example.com/eggplant.jpg" },
        { word: "كوسا", clue: "خضار أخضر", image: "https://example.com/zucchini.jpg" },
        { word: "فاصوليا", clue: "بقوليات", image: "https://example.com/beans.jpg" },
        { word: "بازلاء", clue: "خضار أخضر", image: "https://example.com/peas.jpg" },
        { word: "ذرة", clue: "خضار أصفر", image: "https://example.com/corn.jpg" },
        { word: "قرع", clue: "خضار برتقالي", image: "https://example.com/pumpkin.jpg" },
        { word: "ملفوف", clue: "خضار ورقي", image: "https://example.com/cabbage.jpg" },
        { word: "قرنبيط", clue: "خضار أبيض", image: "https://example.com/cauliflower.jpg" },
        { word: "بروكلي", clue: "خضار أخضر", image: "https://example.com/broccoli.jpg" },
        { word: "فجل", clue: "خضار أحمر", image: "https://example.com/radish.jpg" },
        { word: "لفت", clue: "خضار جذري", image: "https://example.com/turnip.jpg" },
        { word: "سبانخ", clue: "خضار ورقي", image: "https://example.com/spinach.jpg" },
        { word: "بقدونس", clue: "نبات عطري", image: "https://example.com/parsley.jpg" }
    ],
    furniture: [
        { word: "سرير", clue: "للنوم", image: "https://example.com/bed.jpg" },
        { word: "كرسي", clue: "للجلوس", image: "https://example.com/chair.jpg" },
        { word: "طاولة", clue: "للأكل", image: "https://example.com/table.jpg" },
        { word: "خزانة", clue: "للملابس", image: "https://example.com/wardrobe.jpg" },
        { word: "أريكة", clue: "للجلوس", image: "https://example.com/sofa.jpg" },
        { word: "رف", clue: "للكتب", image: "https://example.com/shelf.jpg" },
        { word: "مكتب", clue: "للعمل", image: "https://example.com/desk.jpg" },
        { word: "مرآة", clue: "للنظر", image: "https://example.com/mirror.jpg" },
        { word: "سجادة", clue: "للأرضية", image: "https://example.com/carpet.jpg" },
        { word: "ستارة", clue: "للنافذة", image: "https://example.com/curtain.jpg" },
        { word: "ثريا", clue: "للإضاءة", image: "https://example.com/chandelier.jpg" },
        { word: "مصباح", clue: "للإضاءة", image: "https://example.com/lamp.jpg" },
        { word: "وسادة", clue: "للراحة", image: "https://example.com/pillow.jpg" },
        { word: "مقعد", clue: "للجلوس", image: "https://example.com/stool.jpg" },
        { word: "ساعة", clue: "للوقت", image: "https://example.com/clock.jpg" },
        { word: "شماعة", clue: "للملابس", image: "https://example.com/hanger.jpg" },
        { word: "مزهرية", clue: "للزهور", image: "https://example.com/vase.jpg" }
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
let currentWordImage = "";
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
        // Custom words as objects
        wordList = customWords.map(w => ({ word: w, clue: "كلمة مخصصة", image: "" }));
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
        // Fallback for old format
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
        const wordImage = wordObj.image || "";
        const shuffledPlayers = [...playersList].sort(() => Math.random() - 0.5);
        const selectedImpostors = shuffledPlayers.slice(0, impostorCount);
        const firstPlayer = playersList[Math.floor(Math.random() * playersList.length)];
        
        const gameState = {
            status: 'showing_words',
            word: selectedWord,
            hint: hint,
            image: wordImage,
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
            // Show impostor with clue and impostor image
            wordDisplay.innerHTML = `
                <div id="onlineWordCard" class="word-display impostor-display">
                    <div id="onlineActualWord" class="word-content word-hidden">
                        <h2>🕵️ أنت الجاسوس!</h2>
                        <div class="clue-text">التلميح: ${gameData.hint}</div>
                        <div id="onlineImageContainer" class="word-image-container image-hidden">
                            <img src="${IMPOSTOR_IMAGE}" alt="Impostor" class="impostor-image">
                        </div>
                    </div>
                    <div id="onlinePlaceholder" class="hidden-placeholder">🔒</div>
                </div>
            `;
        } else {
            // Show word with image for normal players
            wordDisplay.innerHTML = `
                <div id="onlineWordCard" class="word-display">
                    <div id="onlineActualWord" class="word-content word-hidden">
                        <h2>${gameData.word}</h2>
                        <div id="onlineImageContainer" class="word-image-container image-hidden">
                            ${gameData.image ? `<img src="${gameData.image}" alt="${gameData.word}" class="word-image">` : ''}
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
    const imageContainer = document.getElementById('onlineImageContainer');
    
    if (!hasSeenWord) {
        wordElement.classList.remove('word-hidden');
        wordElement.classList.add('word-visible');
        placeholderElement.style.display = 'none';
        
        // Show image
        if (imageContainer) {
            imageContainer.classList.remove('image-hidden');
            imageContainer.classList.add('image-visible');
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
    
    // Show ready to vote button after a short delay
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
    currentWordImage = wordObj.image || "";
    
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
        // Show impostor with clue and impostor image
        wordDisplay.innerHTML = `
            <div id="wordCard" class="word-display impostor-display">
                <div id="actualWord" class="word-content word-hidden">
                    <h2>🕵️ أنت الجاسوس!</h2>
                    <div class="clue-text">التلميح: ${currentHint}</div>
                    <div id="imageContainer" class="word-image-container image-hidden">
                        <img src="${IMPOSTOR_IMAGE}" alt="Impostor" class="impostor-image">
                    </div>
                </div>
                <div id="placeholder" class="hidden-placeholder">🔒</div>
            </div>
        `;
    } else {
        // Show word with image for normal players
        wordDisplay.innerHTML = `
            <div id="wordCard" class="word-display">
                <div id="actualWord" class="word-content word-hidden">
                    <h2>${currentWord}</h2>
                    <div id="imageContainer" class="word-image-container image-hidden">
                        ${currentWordImage ? `<img src="${currentWordImage}" alt="${currentWord}" class="word-image">` : ''}
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
    const imageContainer = document.getElementById('imageContainer');
    const player = players[currentPlayerIndex];
    const isImpostor = impostors.includes(player);
    
    if (wordVisible) {
        wordElement.classList.remove('word-hidden');
        wordElement.classList.add('word-visible');
        placeholderElement.style.display = 'none';
        
        // Show image
        if (imageContainer) {
            imageContainer.classList.remove('image-hidden');
            imageContainer.classList.add('image-visible');
        }
        
        button.innerHTML = '<span class="eye-icon">🙈</span> إخفاء';
        
        if (isImpostor) {
            cardElement.className = 'word-display impostor-display impostor-revealed';
        }
    } else {
        wordElement.classList.remove('word-visible');
        wordElement.classList.add('word-hidden');
        placeholderElement.style.display = 'block';
        
        // Hide image
        if (imageContainer) {
            imageContainer.classList.remove('image-visible');
            imageContainer.classList.add('image-hidden');
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
    currentWordImage = "";
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
