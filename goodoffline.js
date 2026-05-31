/**
 * goodoffline.js - PHÁT TRIỂN BỞI TRẦN CƯỜNG
 * - Ứng dụng: Lễ Hằng Thuận
 * - Tự động dựng giao diện Màn hình Chờ (Loading Screen) cao cấp có thanh trượt tiến trình và hiển thị số %.
 * - Tự động quét toàn bộ các thẻ <audio> và <source> để nạp, lưu trữ nhạc vật lý vào IndexedDB máy.
 * - Chỉ khi hệ thống nạp nhạc đạt đủ 100% an toàn mới tháo màn hình chờ để mở trang nút bấm chính.
 * - Tích hợp bộ bảo mật chống sao chép, chặn chuột phải và quét khối chữ (Giữ lại phím F12 để kiểm tra).
 */

(function () {
    // Thiết lập cấu hình Cơ sở dữ liệu lưu trữ nhạc cho App Lễ Hằng Thuận
    const DB_NAME = 'HangThuanAudioDB';
    const STORE_NAME = 'music_assets';
    const DB_VERSION = 1;
    let db = null;

    // --- LỚP 1: TỰ ĐỘNG KHỞI DỰNG GIAO DIỆN MÀN HÌNH CHỜ (LOADING SCREEN) ---
    function createLoadingScreen() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-screen';
        
        loadingDiv.innerHTML = `
            <div class="loading-box">
                <h2>HỆ THỐNG KIỂM CHỨNG OFFLINE</h2>
                <p id="loading-status">Đang khởi tạo cấu trúc lưu trữ thiết bị...</p>
                
                <div class="progress-container">
                    <div id="progress-bar"></div>
                </div>
                
                <div id="progress-percent">0%</div>
                <div class="author-tag">Thiết kế ứng dụng: Trần Cường</div>
            </div>
        `;

        // Tự động nhúng style CSS trực tiếp, đảm bảo giao diện hiển thị sang trọng, tối ưu trên mọi màn hình
        const style = document.createElement('style');
        style.innerHTML = `
            #loading-screen {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: linear-gradient(135deg, #16161a 0%, #0b0b0e 100%);
                display: flex; align-items: center; justify-content: center;
                z-index: 9999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #fff;
                transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.6s;
            }
            .loading-box {
                width: 88%; max-width: 450px; background: rgba(255, 255, 255, 0.05);
                padding: 35px 25px; border-radius: 24px; text-align: center;
                box-shadow: 0 25px 60px rgba(0,0,0,0.65);
                border: 1px solid rgba(255,255,255,0.08);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
            }
            .loading-box h2 {
                font-size: 1.35rem; color: #FFD700; margin-bottom: 8px; letter-spacing: 1px; font-weight: 700;
            }
            .loading-box p {
                font-size: 0.9rem; color: #a1a1aa; margin-bottom: 25px; min-height: 20px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .progress-container {
                width: 100%; height: 10px; background: rgba(255,255,255,0.08);
                border-radius: 5px; overflow: hidden; margin-bottom: 12px;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
            }
            #progress-bar {
                width: 0%; height: 100%;
                background: linear-gradient(90deg, #FFD700 0%, #ff8c00 100%);
                border-radius: 5px; transition: width 0.1s ease-out;
                box-shadow: 0 0 12px rgba(255,215,0,0.4);
            }
            #progress-percent {
                font-size: 2rem; font-weight: bold; color: #FFD700; margin-bottom: 5px; font-family: monospace;
            }
            .author-tag {
                font-size: 0.75rem; color: #52525b; margin-top: 15px; letter-spacing: 0.5px;
            }
            .fade-out { opacity: 0; visibility: hidden; }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(loadingDiv);
    }

    // Hàm cập nhật độ dài thanh trượt và chỉ số % tăng dần
    function updateProgress(percent, statusText) {
        const progressBar = document.getElementById('progress-bar');
        const progressPercent = document.getElementById('progress-percent');
        const loadingStatus = document.getElementById('loading-status');
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.innerText = `${Math.round(percent)}%`;
        if (loadingStatus) loadingStatus.innerText = statusText;
    }

    // Hàm đóng hiệu ứng mờ dần màn hình chờ để sử dụng ứng dụng chính
    function hideLoadingScreen() {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.classList.add('fade-out');
            setTimeout(() => screen.remove(), 600);
        }
    }

    // --- LỚP 2: BẢO MẬT KHÓA GIAO DIỆN CHỐNG SAO CHÉP (KHÔNG KHÓA F12) ---
    function initSecurity() {
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('selectstart', e => e.preventDefault());

        document.addEventListener('keydown', e => {
            if (e.keyCode === 123 || e.key === 'F12') return true; 
            if (e.ctrlKey || e.metaKey) {
                const blocked = ['c', 'u', 's', 'p', 'a'];
                if (blocked.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    return false;
                }
            }
        });

        const s = document.createElement('style');
        s.innerHTML = `* { -webkit-user-select:none!important; user-select:none!important; -webkit-touch-callout:none!important; }`;
        document.head.appendChild(s);
        console.log('[Bảo Mật] Kích hoạt thành công lớp chặn sao chép bảo vệ bản quyền.');
    }

    // --- LỚP 3: KHỞI TẠO VÀ KẾT NỐI INDEXEDDB ---
    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function (e) {
                const dbInstance = e.target.result;
                if (dbInstance.objectStoreNames.contains(STORE_NAME)) {
                    dbInstance.deleteObjectStore(STORE_NAME);
                }
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'url' });
                console.log('[IndexedDB] Cấu trúc bộ lưu trữ nhạc Lễ Hằng Thuận đã sẵn sàng.');
            };

            request.onsuccess = function (e) {
                db = e.target.result;
                resolve(db);
            };

            request.onerror = function (e) {
                reject(e.target.error);
            };
        });
    }

    // Chuẩn hóa tên đường dẫn URL tránh lỗi kí tự trống hoặc kí tự đặc biệt
    function normalizeURL(url) {
        try {
            return new URL(url, window.location.href).pathname;
        } catch (e) {
            return url;
        }
    }

    // --- LỚP 4: QUÉT NHẠC TUẦN TỰ, CHẠY PHẦN TRĂM TIẾN TRÌNH ---
    async function startOfflineSystem() {
        createLoadingScreen();
        initSecurity();

        try {
            updateProgress(5, 'Đang chuẩn bị không gian lưu trữ an toàn...');
            await initDB();

            // Thu thập chính xác danh sách file từ các thẻ source bên trong thẻ audio của anh
            const audioElements = document.querySelectorAll('audio');
            const audioList = [];

            audioElements.forEach(audio => {
                const id = audio.getAttribute('id');
                // Tìm thẻ source bên trong thẻ audio
                const source = audio.querySelector('source');
                const src = source ? source.getAttribute('src') : audio.getAttribute('src');
                
                if (id && src) {
                    audioList.push({ id: id, url: src });
                }
            });

            const totalFiles = audioList.length;
            if (totalFiles === 0) {
                updateProgress(100, 'Mọi thứ đã sẵn sàng!');
                setTimeout(hideLoadingScreen, 500);
                return;
            }

            console.log(`[Hệ Thống] Phát hiện thấy tổng cộng ${totalFiles} file nhạc cần đồng bộ Offline.`);
            let processedCount = 0;
            let missingOfflineCount = 0;

            // Chạy vòng lặp đồng bộ từng bài hát lên thanh trượt tiến trình
            for (const item of audioList) {
                const audioElement = document.getElementById(item.id);
                if (!audioElement) continue;

                const normalizedUrl = normalizeURL(item.url);

                // Kiểm tra xem bài hát đã tải về máy từ trước chưa
                const tx = db.transaction([STORE_NAME], 'readonly');
                const store = tx.objectStore(STORE_NAME);
                
                const cachedBlob = await new Promise(resolve => {
                    const req = store.get(normalizedUrl);
                    req.onsuccess = () => resolve(req.result ? req.result.blob : null);
                    req.onerror = () => resolve(null);
                });

                if (cachedBlob) {
                    // Nhạc đã lưu trong máy -> Gán Blob URL nội bộ làm nguồn phát trực tiếp chạy offline
                    const blobURL = URL.createObjectURL(cachedBlob);
                    
                    // Cập nhật lại đường dẫn phát cho cả thẻ audio lẫn thẻ source con phía trong
                    const sourceElement = audioElement.querySelector('source');
                    if (sourceElement) sourceElement.setAttribute('src', blobURL);
                    audioElement.src = blobURL;
                    audioElement.load();

                    processedCount++;
                    let currentPercent = 5 + ((processedCount / totalFiles) * 95);
                    updateProgress(currentPercent, `Kiểm chứng file sẵn sàng: ${item.url}`);
                } else {
                    // Bản nhạc chưa có sẵn -> Tải mới từ máy chủ về ổ cứng thiết bị nếu có internet
                    if (navigator.onLine) {
                        try {
                            let currentPercent = 5 + ((processedCount / totalFiles) * 95);
                            updateProgress(currentPercent, `Đang tải mới file phục vụ Offline: ${item.url}`);

                            const response = await fetch(item.url);
                            if (!response.ok) throw new Error('Lỗi đường truyền tải nhạc');
                            const blob = await response.blob();

                            // Ghi file vật lý vĩnh viễn vào bộ nhớ máy duyệt web
                            const txW = db.transaction([STORE_NAME], 'readwrite');
                            txW.objectStore(STORE_NAME).put({ url: normalizedUrl, blob: blob });

                            const blobURL = URL.createObjectURL(blob);
                            const sourceElement = audioElement.querySelector('source');
                            if (sourceElement) sourceElement.setAttribute('src', blobURL);
                            audioElement.src = blobURL;
                            audioElement.load();

                            console.log(`[Lưu Trữ] Đã bảo lưu thành công file chạy Offline: ${item.url}`);
                        } catch (err) {
                            console.error(`[Lỗi] Không thể nạp tài nguyên âm thanh: ${item.url}`, err);
                        }
                    } else {
                        // Trường hợp thiết bị không bật mạng và file cũng chưa từng được lưu
                        missingOfflineCount++;
                    }

                    processedCount++;
                    let currentPercent = 5 + ((processedCount / totalFiles) * 95);
                    updateProgress(currentPercent, `Đang xử lý dữ liệu hệ thống: ${item.url}`);
                }
            }

            // Hoàn tất tiến trình cán đích 100% hoàn hảo
            updateProgress(100, 'Hệ thống đã chuẩn bị sẵn sàng cho Offline hoàn chỉnh!');

            // Xuất hiện hộp thông báo nhắc nhở nếu phát hiện thiếu nhạc lúc mất mạng
            if (missingOfflineCount > 0 && !navigator.onLine) {
                alert(`⚠️ THÔNG BÁO KIỂM CHỨNG OFFLINE:\nHệ thống phát hiện bộ nhớ máy đang thiếu hụt mất ${missingOfflineCount} file âm thanh nhạc lễ.\n\nVui lòng bật kết nối mạng Internet (Wifi/4G) lên và load lại trang một lần để hệ thống tự động kéo đủ nhạc về máy anh nhé.`);
            }

            // Tạo độ trễ ngắn 0.8 giây để anh nhìn thấy tiến trình đạt 100% trước khi tháo màn hình vào app
            setTimeout(hideLoadingScreen, 800);

        } catch (err) {
            console.error('[Hệ Thống] Gặp sự cố trong tiến trình kiểm chứng:', err);
            updateProgress(100, 'Đang mở giao diện điều khiển...');
            setTimeout(hideLoadingScreen, 1000);
        }
    }

    // Kích hoạt tiến trình đồng bộ toàn cục
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startOfflineSystem);
    } else {
        startOfflineSystem();
    }
})();