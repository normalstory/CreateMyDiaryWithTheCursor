class App {
    constructor() {
        this.db = new DiaryDB();
        // DB 초기화를 먼저 수행
        this.db.init().then(() => {
            this.editor = new DiaryEditor(this.db);
            this.calendar = new Calendar(this.editor);
            this.themeManager = new ThemeManager();
            
            this.initializeMenu();
            this.initializeSearch();

            // 오늘 날짜의 다이어리 로드
            const today = new Date();
            today.setHours(12, 0, 0, 0);  // 정오로 설정
            const todayStr = today.toISOString().split('T')[0];
            this.editor.loadEntry(todayStr);
        });
    }

    initializeMenu() {
        const menuBtn = document.querySelector('.menu-btn');
        const sideNavContainer = document.querySelector('.side-nav-container');
        const overlay = document.querySelector('.side-nav-overlay');
        
        const closeNav = () => {
            menuBtn.classList.remove('active');
            sideNavContainer.classList.add('hidden');
        };

        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            sideNavContainer.classList.toggle('hidden');
        });

        // 오버레이 클릭 시 네비게이션 닫기
        overlay.addEventListener('click', closeNav);

        // 메뉴 항목 클릭 시 네비게이션 닫기
        document.querySelectorAll('.side-nav button').forEach(button => {
            button.addEventListener('click', () => {
                // 각 버튼의 원래 기능 실행 후 닫기
                if (button.id === 'themeBtn') {
                    this.themeManager.showThemeModal();
                } else if (button.id === 'exportBtn') {
                    this.exportData();
                } else if (button.id === 'resetBtn') {
                    this.resetData();
                } else if (button.id === 'importBtn') {
                    this.importData();
                }
                setTimeout(closeNav, 100);
            });
        });

        // ESC 키 누를 때 네비게이션 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !sideNavContainer.classList.contains('hidden')) {
                closeNav();
            }
        });
    }

    // 데이터 내보내기 기능
    async exportData() {
        try {
            const data = await this.db.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `diary-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('내보내기 실패:', error);
            alert('내보내기에 실패했습니다.');
        }
    }

    // 데이터 초기화 기능
    async resetData() {
        if (confirm('모든 데이터가 삭제됩니다. 계속하시겠습니까?')) {
            try {
                await this.db.clearData();
                alert('초기화가 완료되었습니다.');
                location.reload();
            } catch (error) {
                console.error('초기화 실패:', error);
                alert('초기화에 실패했습니다.');
            }
        }
    }

    // 데이터 가져오기 기능
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    await this.db.importData(data);
                    alert('가져오기가 완료되었습니다.');
                    location.reload();
                } catch (error) {
                    console.error('가져오기 실패:', error);
                    alert('가져오기에 실패했습니다.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    initializeSearch() {
        const searchBtn = document.querySelector('.search-btn');
        const header = document.querySelector('.header');
        const searchContainer = document.querySelector('.search-container');
        const searchInput = document.querySelector('.search-input');
        const closeSearchBtn = document.querySelector('.close-search');
        const searchResults = document.querySelector('.search-results');

        searchBtn.addEventListener('click', () => {
            searchContainer.classList.add('active');
            searchInput.focus();
        });

        closeSearchBtn.addEventListener('click', () => {
            searchContainer.classList.remove('active');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });

        searchInput.addEventListener('input', async () => {
            const query = searchInput.value.trim();
            if (query.length < 1) {
                searchResults.innerHTML = '';
                return;
            }

            try {
                const results = await this.db.searchEntries(query);
                if (results.length === 0) {
                    searchResults.innerHTML = '<div class="search-empty">검색 결과가 없습니다.</div>';
                    return;
                }

                searchResults.innerHTML = results.map(entry => `
                    <div class="search-result-item" data-date="${entry.date}">
                        <div class="result-date">${new Date(entry.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                        })}</div>
                        <div class="result-content">${this.highlightText(entry.content, query)}</div>
                        <div class="result-tags">
                            ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                `).join('');

                // 검색 결과 클릭 이벤트
                document.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const date = item.dataset.date;
                        this.editor.loadEntry(date);
                        this.calendar.render(); // 캘린더 업데이트
                        searchContainer.classList.remove('active');
                        searchInput.value = '';
                        searchResults.innerHTML = '';
                    });
                });
            } catch (error) {
                console.error('검색 실패:', error);
                searchResults.innerHTML = '<div class="search-error">검색에 실패했습니다.</div>';
            }
        });
    }

    displaySearchResults(results, query) {
        const content = document.querySelector('.content-section');
        content.innerHTML = `
            <div class="search-results">
                <h3>검색 결과 (${results.length}건)</h3>
                ${results.map(entry => `
                    <div class="search-result-item" data-date="${entry.date}">
                        <div class="result-date">${new Date(entry.date).toLocaleDateString()}</div>
                        <div class="result-content">
                            ${this.highlightText(entry.content, query)}
                        </div>
                        <div class="result-tags">
                            ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // 검색 결과 클릭 이벤트
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const date = item.dataset.date;
                this.editor.loadEntry(date);
                this.clearSearchResults();
            });
        });
    }

    clearSearchResults() {
        const content = document.querySelector('.content-section');
        content.innerHTML = `
            <div class="mood-selector">
                <label>오늘의 기분:</label>
                <select id="moodSelect">
                    <option value="sunny">☀️ 맑음</option>
                    <option value="cloudy">☁️ 흐림</option>
                    <option value="rainy">🌧️ 비</option>
                    <option value="happy">😊 행복</option>
                    <option value="sad">😢 슬픔</option>
                </select>
            </div>
            <div class="editor-container">
                <div class="editor-toolbar">
                    <button data-command="bold">B</button>
                    <button data-command="italic">I</button>
                    <button data-command="link">🔗</button>
                    <button data-command="image">📷</button>
                </div>
                <div id="editor" contenteditable="true"></div>
                <div class="save-status">자동 저장됨</div>
            </div>
            <div class="tags-container">
                <label for="tags">태그:</label>
                <input type="text" id="tags" placeholder="#태그1, #태그2, #태그3">
            </div>
        `;
    }

    highlightText(content, query) {
        // HTML 태그 제거
        const text = content.replace(/<[^>]*>/g, '');
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 