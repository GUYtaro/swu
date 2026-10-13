// ประกาศสายอักขระตัวอักษรภาษาอังกฤษ A-Z ทั้งหมด 26 ตัวเพื่อใช้เป็นดัชนีอ้างอิง
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// ตัวแปรเก็บสถานะการทำงาน
let isAnimating = false;      // เช็คว่าระบบกำลังเล่นแอนิเมชันอยู่หรือไม่ (ป้องกันการกดปุ่ม Start ซ้ำ)
let animationTimeout;         // ตัวแปรสำหรับเก็บคำสั่งตั้งเวลา (Timeout)
let skipAnimation = false;    // สถานะสำหรับเช็คว่าผู้ใช้กดปุ่ม Skip เพื่อข้ามอนิเมชันหรือไม่

// --- ดึงองค์ประกอบองค์ประกอบต่างๆ จาก HTML มารอใช้งาน ---
const plaintextInput = document.getElementById('plaintext');
const shiftKeyInput = document.getElementById('shiftKey');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const skipBtn = document.getElementById('skipBtn');
const speedControl = document.getElementById('speedControl');
const animControls = document.getElementById('animation-controls');

// ดึงกล่องคอนเทนเนอร์ของแต่ละ Step
const stepAlphabet = document.getElementById('step-alphabet');
const stepEncryption = document.getElementById('step-encryption');
const stepDecryption = document.getElementById('step-decryption');
const stepVerify = document.getElementById('step-verify');

// ฟังก์ชันสร้างลูกศรชี้ลง (↓) จำนวน 26 ตัว สำหรับใส่ตรงกลางใน Step 2
function setupArrows() {
    const arrowContainer = document.getElementById('arrow-container');
    if(arrowContainer) {
        let arrowsHtml = '';
        for(let i = 0; i < 26; i++) {
            arrowsHtml += `<div class="w-8 flex justify-center text-zinc-600 text-xs">↓</div>`;
        }
        arrowContainer.innerHTML = arrowsHtml; // ใส่โค้ดลูกศรเข้าไปใน HTML
    }
}
setupArrows(); // เรียกทำงานทันทีที่โหลดไฟล์

// ฟังก์ชันหน่วงเวลาการทำงาน (Sleep/Delay) สำหรับสร้างจังหวะแอนิเมชัน
const sleep = (ms) => new Promise(resolve => {
    if (skipAnimation) {
        resolve(); // หากกดข้ามอนิเมชัน ให้ทำงานต่อทันทีไม่ต้องรอเวลา
    } else {
        animationTimeout = setTimeout(resolve, ms);
    }
});

// ฟังก์ชันคำนวณความเร็ว (แปลงค่าจากสไลเดอร์ ยิ่งปรับไปขวา ยิ่งใช้เวลาหน่วงน้อยลง = อนิเมชันเร็วขึ้น)
const getSpeed = () => parseInt(speedControl.max) - parseInt(speedControl.value) + parseInt(speedControl.min);

// ตรวจจับเมื่อพิมพ์ข้อมูล ให้เปลี่ยนตัวอักษรเป็นพิมพ์ใหญ่ทั้งหมดโดยอัตโนมัติ
plaintextInput.addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});

// --- ดึงองค์ประกอบปุ่มเพิ่ม/ลด Shift Key (- / +) ---
const decrementBtn = document.getElementById('decrementKey');
const incrementBtn = document.getElementById('incrementKey');

// กดปุ่มลบ (-) เพื่อลดค่า Key ลง 1
decrementBtn.addEventListener('click', () => {
    let currentVal = parseInt(shiftKeyInput.value) || 1;
    if (currentVal > 1) {
        shiftKeyInput.value = currentVal - 1;
    }
});

// กดปุ่มบวก (+) เพื่อเพิ่มค่า Key ขึ้น 1
incrementBtn.addEventListener('click', () => {
    let currentVal = parseInt(shiftKeyInput.value) || 1;
    if (currentVal < 25) {
        shiftKeyInput.value = currentVal + 1;
    }
});

// บังคับไม่ให้กรอกค่า Key นอกเหนือช่วง 1 ถึง 25 (เมื่อพิมพ์เอง)
shiftKeyInput.addEventListener('input', function() {
    if (this.value < 1) this.value = 1;
    if (this.value > 25) this.value = 25;
});

// ฟังก์ชันสร้าง UI ตารางจับคู่ชุดตัวอักษรใน Step 2
function createAlphabetUI(key) {
    const pContainer = document.getElementById('plain-alphabet-container');
    const cContainer = document.getElementById('cipher-alphabet-container');
    document.getElementById('display-key').textContent = key;
    
    // ล้างกล่องเดิมออกก่อน
    pContainer.innerHTML = '';
    cContainer.innerHTML = '';

    // ตัดต่อสายอักขระใหม่ตามจำนวนคีย์ เช่น คีย์ 3 จะได้ DEF...ABC
    const shiftedAlphabet = alphabet.substring(key) + alphabet.substring(0, key);

    // วนลูป 26 รอบสร้างกล่องตัวอักษร A-Z
    for (let i = 0; i < 26; i++) {
        // สร้างกล่องตัวอักษร Plaintext
        const pBox = document.createElement('div');
        pBox.className = 'w-8 h-8 flex items-center justify-center border border-zinc-800 rounded-md bg-zinc-950 text-sm font-bold text-zinc-400 letter-box shadow-sm';
        pBox.textContent = alphabet[i];
        pBox.id = `p-alpha-${alphabet[i]}`;
        pContainer.appendChild(pBox);

        // สร้างกล่องตัวอักษร Ciphertext
        const cBox = document.createElement('div');
        cBox.className = 'w-8 h-8 flex items-center justify-center border border-zinc-800 rounded-md bg-zinc-950 text-sm font-bold text-zinc-500 letter-box shadow-sm';
        cBox.textContent = shiftedAlphabet[i];
        cBox.dataset.cipherChar = shiftedAlphabet[i]; // ฝังข้อมูลค่าตัวอักษรไว้ใน attribute
        cBox.dataset.index = i; 
        cContainer.appendChild(cBox);
    }
    stepAlphabet.classList.add('active'); // แสดงผล Step 2
}

// ฟังก์ชันเปิด/ปิด เอฟเฟกต์ไฟเรืองแสงตัวอักษรใน Step 2
function highlightAlphabet(char, isEncryption) {
    // ลบเรืองแสงเดิมทั้งหมดออกก่อน
    document.querySelectorAll('.letter-box.highlight-plain').forEach(el => {
        el.classList.remove('highlight-plain');
        el.classList.add('text-zinc-400', 'border-zinc-800');
    });
    document.querySelectorAll('.letter-box.highlight-cipher').forEach(el => {
        el.classList.remove('highlight-cipher');
        el.classList.add('text-zinc-500', 'border-zinc-800');
    });
    
    if (!alphabet.includes(char.toUpperCase())) return; // ถ้าเป็นช่องว่าง/เครื่องหมาย ไม่ต้องทำไฮไลท์

    if (isEncryption) {
        // หากเป็นการเข้ารหัส ให้ไฮไลท์แถว Plain
        const pBox = document.getElementById(`p-alpha-${char.toUpperCase()}`);
        if (pBox) {
            pBox.classList.remove('text-zinc-400', 'border-zinc-800');
            pBox.classList.add('highlight-plain');
        }
    } else {
        // หากเป็นการถอดรหัส ให้ไฮไลท์แถว Cipher
        const cBoxes = document.querySelectorAll('#cipher-alphabet-container .letter-box');
        cBoxes.forEach(box => {
            if (box.dataset.cipherChar === char.toUpperCase()) {
                box.classList.remove('text-zinc-500', 'border-zinc-800');
                box.classList.add('highlight-cipher');
            }
        });
    }
}

// ฟังก์ชันหลักสำหรับรันอนิเมชันขั้นตอนการทำงานตั้งแต่ต้นจนจบ
async function runAnimation() {
    if (isAnimating) return; // ป้องกันการกดเริ่มรันซ้ำ
    isAnimating = true;
    skipAnimation = false;
    
    const text = plaintextInput.value.toUpperCase();
    const key = parseInt(shiftKeyInput.value);

    // เช็คกรณีไม่ได้กรอกข้อความ
    if (!text.trim()) {
        plaintextInput.classList.add('border-red-500', 'ring-1', 'ring-red-500');
        setTimeout(() => plaintextInput.classList.remove('border-red-500', 'ring-1', 'ring-red-500'), 1000);
        isAnimating = false;
        return;
    }

    // ล้างค่าหน้าจอเก่าเพื่อเตรียมรันอนิเมชันรอบใหม่
    resetUI(true);
    startBtn.disabled = true;
    plaintextInput.disabled = true;
    shiftKeyInput.disabled = true;
    animControls.classList.remove('hidden');

    // === ขั้นตอนที่ 2: แสดง Alphabet Mapping ===
    createAlphabetUI(key);
    await sleep(getSpeed());

    // === ขั้นตอนที่ 3: กระบวนการเข้ารหัส (Encryption Phase) ===
    stepEncryption.classList.add('active');
    if (document.getElementById('autoScrollToggle').checked) {
        stepEncryption.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    let ciphertext = "";
    const encTbody = document.getElementById('enc-table-body');
    const encCurrentChar = document.getElementById('enc-current-char');
    const encFormulaDisplay = document.getElementById('enc-formula-display');
    const encResultChar = document.getElementById('enc-result-char');

    // วนลูปเข้ารหัสทีละตัวอักษร
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const tr = document.createElement('tr');
        tr.className = 'active-row-enc transition-colors duration-300';
        
        // แสดงตัวอักษรปัจจุบันใน Focus View
        encCurrentChar.textContent = ch;
        encFormulaDisplay.style.opacity = '0';
        encResultChar.style.opacity = '0';
        encCurrentChar.style.transform = 'scale(0.8)';
        await sleep(50);
        encCurrentChar.style.transform = 'scale(1.1)';

        if (alphabet.includes(ch)) {
            highlightAlphabet(ch, true);
            await sleep(getSpeed() * 0.4);

            // คำนวณสูตร Shift Cipher: (ตำแหน่งตัวอักษร + key) mod 26
            const p = alphabet.indexOf(ch);
            const c = (p + key) % 26;
            const cipherChar = alphabet[c];
            ciphertext += cipherChar;
            const formula = `(${p} + ${key}) mod 26 = ${c}`;

            encFormulaDisplay.textContent = formula;
            encFormulaDisplay.style.opacity = '1';
            await sleep(getSpeed() * 0.4);

            encResultChar.textContent = cipherChar;
            encResultChar.style.opacity = '1';

            // เพิ่มแถวข้อมูลลงในตาราง
            tr.innerHTML = `
                <td class="font-bold text-white">${ch}</td>
                <td class="text-zinc-400">${p}</td>
                <td class="text-emerald-500/80">${formula}</td>
                <td class="font-bold text-emerald-400">${cipherChar}</td>
            `;
            await sleep(getSpeed() * 0.8);
        } else {
            // กรณีเป็นเว้นวรรคหรือสัญลักษณ์ ไม่ต้องเปลี่ยนค่า
            ciphertext += ch;
            encFormulaDisplay.textContent = "Pass-through";
            encFormulaDisplay.style.opacity = '1';
            encResultChar.textContent = ch;
            encResultChar.style.opacity = '1';

            tr.innerHTML = `
                <td class="font-bold text-zinc-500">${ch === ' ' ? 'Space' : ch}</td>
                <td class="text-zinc-600">-</td>
                <td class="text-zinc-600">No shift</td>
                <td class="font-bold text-zinc-500">${ch === ' ' ? 'Space' : ch}</td>
            `;
            await sleep(getSpeed() * 0.5);
        }
        
        // อัปเดตตารางและสั่งเลื่อนหน้าจอตามถ้าเปิด Auto-Scroll ไว้
        document.querySelectorAll('#enc-table-body tr').forEach(row => row.classList.remove('active-row-enc'));
        encTbody.appendChild(tr);
        
        if (document.getElementById('autoScrollToggle').checked) {
            tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // แสดงผลลัพธ์สะสมในกล่อง Ciphertext
        document.getElementById('final-ciphertext').textContent = ciphertext;
    }
    
    highlightAlphabet('', true);
    await sleep(getSpeed());

    // === ขั้นตอนที่ 4: กระบวนการถอดรหัส (Decryption Phase) ===
    stepDecryption.classList.add('active');
    if (document.getElementById('autoScrollToggle').checked) {
        stepDecryption.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    let decrypted = "";
    const decTbody = document.getElementById('dec-table-body');
    const decCurrentChar = document.getElementById('dec-current-char');
    const decFormulaDisplay = document.getElementById('dec-formula-display');
    const decResultChar = document.getElementById('dec-result-char');

    // วนลูปถอดรหัสทีละตัวอักษรจาก Ciphertext
    for (let i = 0; i < ciphertext.length; i++) {
        const ch = ciphertext[i];
        const tr = document.createElement('tr');
        tr.className = 'active-row-dec transition-colors duration-300';

        decCurrentChar.textContent = ch;
        decFormulaDisplay.style.opacity = '0';
        decResultChar.style.opacity = '0';
        decCurrentChar.style.transform = 'scale(0.8)';
        await sleep(50);
        decCurrentChar.style.transform = 'scale(1.1)';

        if (alphabet.includes(ch)) {
            highlightAlphabet(ch, false);
            await sleep(getSpeed() * 0.4);

            // คำนวณสูตรถอดรหัส: (ตำแหน่งรหัส - key + 26) mod 26 (+26 เพื่อไม่ให้ค่าเป็นลบ)
            const c = alphabet.indexOf(ch);
            const p = (c - key + 26) % 26;
            const plainChar = alphabet[p];
            decrypted += plainChar;
            const formula = `(${c} - ${key} + 26) mod 26 = ${p}`;

            decFormulaDisplay.textContent = formula;
            decFormulaDisplay.style.opacity = '1';
            await sleep(getSpeed() * 0.4);

            decResultChar.textContent = plainChar;
            decResultChar.style.opacity = '1';

            // เพิ่มแถวข้อมูลลงในตารางถอดรหัส
            tr.innerHTML = `
                <td class="font-bold text-emerald-400">${ch}</td>
                <td class="text-zinc-400">${c}</td>
                <td class="text-cyan-500/80">${formula}</td>
                <td class="font-bold text-cyan-400">${plainChar}</td>
            `;
            await sleep(getSpeed() * 0.8);
        } else {
            decrypted += ch;
            decFormulaDisplay.textContent = "Pass-through";
            decFormulaDisplay.style.opacity = '1';
            decResultChar.textContent = ch;
            decResultChar.style.opacity = '1';

            tr.innerHTML = `
                <td class="font-bold text-zinc-500">${ch === ' ' ? 'Space' : ch}</td>
                <td class="text-zinc-600">-</td>
                <td class="text-zinc-600">No shift</td>
                <td class="font-bold text-zinc-500">${ch === ' ' ? 'Space' : ch}</td>
            `;
            await sleep(getSpeed() * 0.5);
        }

        document.querySelectorAll('#dec-table-body tr').forEach(row => row.classList.remove('active-row-dec'));
        decTbody.appendChild(tr);
        
        if (document.getElementById('autoScrollToggle').checked) {
            tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // แสดงผลลัพธ์สะสมในกล่อง Recovered Plaintext
        document.getElementById('final-plaintext').textContent = decrypted;
    }

    highlightAlphabet('', false);
    await sleep(getSpeed());

    // === ขั้นตอนที่ 5: ตรวจสอบความถูกต้อง (Verification Phase) ===
    stepVerify.classList.add('active');
    document.getElementById('verify-orig').textContent = text;
    document.getElementById('verify-cipher').textContent = ciphertext;
    document.getElementById('verify-recovered').textContent = decrypted;

    const verifyResult = document.getElementById('verify-result');
    // เปรียบเทียบว่าข้อความต้นฉบับ ตรงกับ ข้อความที่ถอดรหัสกลับมาได้หรือไม่
    if (text === decrypted) {
        verifyResult.className = 'flex flex-col items-center justify-center p-6 rounded-xl border border-green-500/50 bg-green-950/20 text-center transition-colors shadow-[0_0_20px_rgba(34,197,94,0.1)]';
        verifyResult.innerHTML = `
            <svg class="w-12 h-12 text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div class="text-xl text-green-400 font-bold mb-1">Proof Successful</div>
            <div class="text-green-300/70 font-mono text-sm mb-2 bg-green-950/50 px-3 py-1 rounded">D( E(p) ) = p</div>
            <p class="text-green-500/80 text-xs uppercase tracking-wider">Encryption and Decryption are Inverse Functions</p>
        `;
    } else {
        verifyResult.className = 'flex flex-col items-center justify-center p-6 rounded-xl border border-red-500/50 bg-red-950/20 text-center transition-colors';
        verifyResult.innerHTML = `
            <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div class="text-xl text-red-400 font-bold">Error: Mismatch</div>
        `;
    }
    
    if (document.getElementById('autoScrollToggle').checked) {
        stepVerify.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ทำความสะอาด คืนค่าสถานะปุ่มกดเมื่อเล่นแอนิเมชันเสร็จเรียบร้อย
    isAnimating = false;
    startBtn.disabled = false;
    plaintextInput.disabled = false;
    shiftKeyInput.disabled = false;
    animControls.classList.add('hidden');
}

// ฟังก์ชันสำหรับล้างค่าหน้าจอทั้งหมดเมื่อกดปุ่ม Reset
function resetUI(keepInput = false) {
    clearTimeout(animationTimeout);
    isAnimating = false;
    skipAnimation = false;
    
    if (!keepInput) {
        plaintextInput.value = "HELLO WORLD";
        shiftKeyInput.value = "3";
    }
    
    // ซ่อนสเต็ป 2-5 ทั้งหมด
    [stepAlphabet, stepEncryption, stepDecryption, stepVerify].forEach(el => {
        el.classList.remove('active');
    });

    // ล้างข้อมูลตารางและข้อความผลลัพธ์
    document.getElementById('enc-table-body').innerHTML = '';
    document.getElementById('dec-table-body').innerHTML = '';
    document.getElementById('final-ciphertext').textContent = '';
    document.getElementById('final-plaintext').textContent = '';
    
    document.getElementById('enc-current-char').textContent = '-';
    document.getElementById('enc-formula-display').style.opacity = '0';
    document.getElementById('enc-result-char').style.opacity = '0';
    document.getElementById('enc-current-char').style.transform = 'scale(1)';
    
    document.getElementById('dec-current-char').textContent = '-';
    document.getElementById('dec-formula-display').style.opacity = '0';
    document.getElementById('dec-result-char').style.opacity = '0';
    document.getElementById('dec-current-char').style.transform = 'scale(1)';

    startBtn.disabled = false;
    plaintextInput.disabled = false;
    shiftKeyInput.disabled = false;
    animControls.classList.add('hidden');
}

// --- ผูกเหตุการณ์คลิกปุ่ม (Event Listeners) ---
startBtn.addEventListener('click', runAnimation);
resetBtn.addEventListener('click', () => resetUI(false));
skipBtn.addEventListener('click', () => { skipAnimation = true; });

// กด Enter ในช่องกรอกข้อความเพื่อเริ่มทำงานได้ทันที
plaintextInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') runAnimation();
});