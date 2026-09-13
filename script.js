const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#f15bb5', '#00bbf9', '#00f5d4', '#ff6b6b', '#ffd166', '#06d6a0'];

const pageLogin        = document.getElementById('page-login');
const pageBalloons     = document.getElementById('page-balloons');
const pageResult       = document.getElementById('page-result');
const balloonContainer = document.getElementById('balloon-container');
const giantBalloon     = document.getElementById('giant-balloon');
const backBtn          = document.getElementById('back-btn');

let balloonInterval;
let cachedResult = null;

// ※ 請填入您的 Google Cloud Console OAuth 2.0 Client ID ※
const GOOGLE_CLIENT_ID = '748402304369-9l1921or0au7t3n8j1qohhtj2pfovcin.apps.googleusercontent.com';

// ※ 請換成您的真實 Google App Script 網址 ※
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbydjlSRW9AVPZQWSgyJxdwHaIl1LnNy8n0NpomwO7oCwiekTMmL1YcyKudn8Sc9e4T2lw/exec';

/* ────────────────────────────────────────────
   Google Identity Services 初始化
──────────────────────────────────────────── */
function initGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: false,
    });

    google.accounts.id.renderButton(
        document.getElementById('google-btn-container'),
        {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            locale: 'zh-TW',
            width: 280,
        }
    );
}

// 等待 GIS 腳本載入完成後初始化
window.onload = () => {
    const waitForGSI = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts) {
            clearInterval(waitForGSI);
            initGoogleSignIn();
        }
    }, 100);
};

/* ────────────────────────────────────────────
   使用者完成 Google 登入後的 callback
──────────────────────────────────────────── */
function handleCredential(response) {
    const idToken = response.credential;

    // 切換到氣球頁面，同時開始 fetch
    pageLogin.classList.remove('active');
    pageLogin.classList.add('hidden');
    pageBalloons.classList.remove('hidden');
    pageBalloons.classList.add('active');

    startBalloons();
    fetchData(idToken);
}

/* ────────────────────────────────────────────
   氣球生成
──────────────────────────────────────────── */
function startBalloons() {
    // 一開始批量放出幾顆，讓畫面立刻熱鬧
    for (let i = 0; i < 8; i++) {
        setTimeout(() => createBalloon(), i * 150);
    }
    // 之後每 250ms 再出一顆
    balloonInterval = setInterval(createBalloon, 250);
}

function createBalloon() {
    const balloon = document.createElement('div');
    balloon.classList.add('balloon');

    const color    = colors[Math.floor(Math.random() * colors.length)];
    const left     = 2 + Math.random() * 94;
    const duration = 9 + Math.random() * 8;    // 9-17s
    const size     = 45 + Math.random() * 40;  // 45-85px
    const rotation = -20 + Math.random() * 40;

    balloon.style.left   = `${left}vw`;
    balloon.style.width  = `${size}px`;
    balloon.style.height = `${size * 1.25}px`;
    balloon.style.setProperty('--balloon-color', color);
    balloon.style.setProperty('--duration', `${duration}s`);
    balloon.style.setProperty('--rotation', `${rotation}deg`);

    balloonContainer.appendChild(balloon);

    setTimeout(() => { if (balloon.parentElement) balloon.remove(); }, duration * 1000 + 200);
}

/* ────────────────────────────────────────────
   資料取得（以 Google ID Token 作為身份憑證）
──────────────────────────────────────────── */
function fetchData(idToken) {
    const url = `${SCRIPT_URL}?idToken=${encodeURIComponent(idToken)}`;

    // 保證至少讓使用者欣賞 3 秒動畫
    const delay = new Promise(resolve => setTimeout(resolve, 3000));

    const fetchPromise = fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            return res.json();
        })
        .then(data => {
            // App Script 回傳 error 欄位時視為失敗
            if (data.error) throw new Error(data.error);
            return data;
        });

    Promise.all([delay, fetchPromise])
        .then(([, data]) => {
            cachedResult = data;
            onDataReceived();
        })
        .catch(err => {
            showFetchError(url, err);
        });
}

/* ────────────────────────────────────────────
   Fetch 失敗：將錯誤訊息直接顯示在氣球頁面上
──────────────────────────────────────────── */
function showFetchError(url, err) {
    clearInterval(balloonInterval);

    const overlay = document.createElement('div');
    overlay.id = 'error-overlay';
    overlay.innerHTML = `
        <div id="error-box">
            <div id="error-icon">⚠️</div>
            <h2>資料讀取失敗</h2>
            <div class="error-row"><span class="error-label">錯誤</span><code>${err.message || err}</code></div>
            <div class="error-row"><span class="error-label">URL</span><code class="error-url">${url.split('?')[0]}</code></div>
            <p class="error-hint">請確認使用北科大學校信箱（@ntut.org.tw）登入，或聯絡管理員確認帳號是否已登記。</p>
            <button id="error-back-btn">返回重新登入</button>
        </div>
    `;
    pageBalloons.appendChild(overlay);

    document.getElementById('error-back-btn').addEventListener('click', () => {
        overlay.remove();
        pageBalloons.classList.remove('active');
        pageBalloons.classList.add('hidden');
        pageLogin.classList.remove('hidden');
        pageLogin.classList.add('active');
        balloonContainer.innerHTML = '';
        // 重新渲染 Google 登入按鈕
        initGoogleSignIn();
    });
}

/* ────────────────────────────────────────────
   資料回來後：讓一顆氣球「被選中」飛出中央
   其他氣球繼續飄動與生成，直到使用者點擊為止
──────────────────────────────────────────── */
function onDataReceived() {
    const balloons = [...document.querySelectorAll('.balloon')];
    let chosen = null;
    if (balloons.length > 0) {
        const midY = window.innerHeight / 2;
        const sorted = balloons.slice().sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return Math.abs(ra.top - midY) - Math.abs(rb.top - midY);
        });
        chosen = sorted[0];
    }
    showGiantBalloon(chosen);
}

/* ────────────────────────────────────────────
   大氣球：從選中位置滑向中央，再浮動等待點擊
──────────────────────────────────────────── */
function showGiantBalloon(sourceBalloon) {
    let color = colors[Math.floor(Math.random() * colors.length)];
    let startX, startY;

    if (sourceBalloon) {
        const rect = sourceBalloon.getBoundingClientRect();
        startX = rect.left + rect.width  / 2;
        startY = rect.top  + rect.height / 2;
        color  = sourceBalloon.style.getPropertyValue('--balloon-color') || color;
        sourceBalloon.style.opacity = '0';
        setTimeout(() => { if (sourceBalloon.parentElement) sourceBalloon.remove(); }, 100);
    } else {
        startX = window.innerWidth  / 2;
        startY = window.innerHeight + 80;
    }

    giantBalloon.style.setProperty('--balloon-color', color);
    giantBalloon.style.transition = 'none';
    giantBalloon.style.left       = `${startX}px`;
    giantBalloon.style.top        = `${startY}px`;
    giantBalloon.style.transform  = 'translate(-50%, -50%) scale(1)';

    giantBalloon.classList.add('visible');

    void giantBalloon.offsetWidth;

    giantBalloon.style.transition = 'left 3.5s ease-in-out, top 3.5s ease-in-out, transform 3.5s ease-in-out';
    giantBalloon.style.left       = '50%';
    giantBalloon.style.top        = '50%';
    giantBalloon.style.transform  = 'translate(-50%, -50%) scale(2.8)';

    setTimeout(() => {
        giantBalloon.style.transition = 'none';
        giantBalloon.classList.add('ready-to-click');
        giantBalloon.classList.add('show-giant');
    }, 3600);
}

/* ────────────────────────────────────────────
   點擊大氣球：緩慢放大填滿螢幕 → 切換到結果頁
   背景氣球直到此處才停止生成
──────────────────────────────────────────── */
giantBalloon.addEventListener('click', () => {
    if (!giantBalloon.classList.contains('show-giant')) return;

    clearInterval(balloonInterval);

    // Step 1: 凍結 animation，讓瀏覽器在此幀看到靜態 transform
    giantBalloon.classList.remove('show-giant', 'ready-to-click');
    giantBalloon.classList.add('freeze');

    // Step 2: 雙層 rAF 確保靜態值 commit 後才啟動 5s transition
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            giantBalloon.classList.remove('freeze');
            giantBalloon.classList.add('expanding');

            setTimeout(() => {
                renderResult(cachedResult);

                pageBalloons.classList.remove('active');
                pageBalloons.classList.add('hidden');
                pageResult.classList.remove('hidden');
                pageResult.classList.add('active');

                setTimeout(() => {
                    giantBalloon.classList.remove('expanding', 'visible');
                    giantBalloon.style.transition = 'none';
                    balloonContainer.innerHTML = '';
                }, 800);
            }, 4600);
        });
    });
});

/* ────────────────────────────────────────────
   渲染結果
──────────────────────────────────────────── */
function renderResult(data) {
    document.getElementById('group-name').textContent = data.groupName;
    const membersList = document.getElementById('members-list');
    membersList.innerHTML = '';

    data.members.forEach((member, i) => {
        const card = document.createElement('div');
        card.classList.add('member-card');
        card.style.animationDelay = `${i * 0.12}s`;

        const contacts = [
            { icon: '📷', label: 'Instagram', value: member.contact_1 },
            { icon: '💬', label: 'Line',      value: member.contact_2 },
            { icon: '🔗', label: '其他',       value: member.contact_3 },
        ];

        const contactsHtml = contacts
            .filter(c => c.value)
            .map(c => `
                <div class="contact-item">
                    <span class="contact-platform">${c.icon} ${c.label}</span>
                    <span class="contact-value">${c.value}</span>
                </div>`)
            .join('');

        card.innerHTML = `
            <div class="member-name">${member.name}</div>
            <div class="member-class">${member.class}</div>
            <div class="member-contact">
                ${contactsHtml || '<div style="color:#aaa;">無聯絡方式</div>'}
            </div>
        `;
        membersList.appendChild(card);
    });
}

/* ────────────────────────────────────────────
   返回按鈕
──────────────────────────────────────────── */
backBtn.addEventListener('click', () => {
    pageResult.classList.remove('active');
    pageResult.classList.add('hidden');
    pageLogin.classList.remove('hidden');
    pageLogin.classList.add('active');
    // 重新渲染 Google 登入按鈕
    initGoogleSignIn();
});
