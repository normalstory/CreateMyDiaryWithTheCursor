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

            this.initializeIntro();
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
    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                const text = await file.text();
                const data = JSON.parse(text);
                
                // 기존 데이터와 충돌하는지 확인
                const conflicts = await this.checkConflicts(data);
                
                if (conflicts.length > 0) {
                    const choice = await this.showConflictDialog(conflicts.length);
                    if (choice === 'cancel') return;
                    
                    // 선택에 따라 데이터 처리
                    await this.processImport(data, choice);
                } else {
                    // 충돌 없는 경우 바로 가져오기
                    await this.processImport(data, 'overwrite');
                }
                
                alert('데이터를 성공적으로 가져왔습니다.');
                location.reload();
            } catch (error) {
                alert('데이터 가져오기 실패: ' + error.message);
            }
        };
        
        input.click();
    }

    // 충돌하는 날짜 확인
    async checkConflicts(importData) {
        const conflicts = [];
        for (const entry of importData) {
            const existingEntry = await this.db.getEntry(entry.date);
            if (existingEntry) {
                conflicts.push(entry.date);
            }
        }
        return conflicts;
    }

    // 충돌 해결 다이얼로그 표시
    showConflictDialog(conflictCount) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'import-dialog';
            dialog.innerHTML = `
                <div class="import-dialog-content">
                    <h2>데이터 충돌</h2>
                    <p>${conflictCount}개의 날짜에 이미 데이터가 존재합니다.</p>
                    <p>어떻게 처리하시겠습니까?</p>
                    <div class="import-dialog-buttons">
                        <button class="overwrite">덮어쓰기</button>
                        <button class="append">내용 추가</button>
                        <button class="cancel">취소</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(dialog);
            
            const buttons = dialog.querySelectorAll('button');
            buttons.forEach(button => {
                button.onclick = () => {
                    dialog.remove();
                    resolve(button.className);
                };
            });
        });
    }

    // 선택에 따른 데이터 처리
    async processImport(importData, mode) {
        // 배열이 아닌 경우 배열로 변환
        const entries = Array.isArray(importData) ? importData : Object.values(importData);

        for (const entry of entries) {
            try {
                // 날짜 형식 검증
                if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
                    console.warn(`Invalid date format for entry:`, entry);
                    continue;
                }

                // 필수 필드 확인 및 기본값 설정
                const processedEntry = {
                    date: entry.date,
                    content: entry.content || '',
                    tags: Array.isArray(entry.tags) ? entry.tags : [],
                    mood: entry.mood || 'sunny',
                    lastModified: new Date().toISOString()
                };

                const existingEntry = await this.db.getEntry(processedEntry.date);
                
                if (existingEntry) {
                    if (mode === 'overwrite') {
                        await this.db.saveEntry(processedEntry);
                    } else if (mode === 'append') {
                        const newContent = existingEntry.content + '\n\n---\n\n' + processedEntry.content;
                        const newTags = [...new Set([...existingEntry.tags, ...processedEntry.tags])];
                        await this.db.saveEntry({
                            ...processedEntry,
                            content: newContent,
                            tags: newTags
                        });
                    }
                } else {
                    await this.db.saveEntry(processedEntry);
                }
            } catch (error) {
                console.error(`Entry processing failed for date ${entry.date}:`, error);
                console.error('Entry data:', entry);
                throw new Error(`데이터 처리 중 오류가 발생했습니다: ${entry.date} - ${error.message}`);
            }
        }
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

    initializeIntro() {
        // 버블에 인덱스 설정
        document.querySelectorAll('.intro-shapes span').forEach((span, i) => {
            span.style.setProperty('--i', i);
        });

        // 스킵 버튼 이벤트
        const skipBtn = document.querySelector('.skip-intro');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.endIntro();
            });
        }

        // 5초 후 자동 종료
        this.introTimeout = setTimeout(() => {
            this.endIntro();
        }, 5000);
    }

    endIntro() {
        // 이미 종료된 경우 중복 실행 방지
        if (this.introEnded) return;
        this.introEnded = true;

        // 타임아웃 클리어
        if (this.introTimeout) {
            clearTimeout(this.introTimeout);
        }

        const intro = document.querySelector('.intro-overlay');
        if (intro) {
            intro.classList.add('hide');
            
            // 본문 컨텐츠 표시
            document.querySelectorAll('main, .header, .side-nav-container')
                .forEach(el => {
                    el.classList.add('content-visible');
                });

            // 완전히 제거 (애니메이션 완료 후)
            setTimeout(() => {
                intro.style.display = 'none';
            }, 500);
        }
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 