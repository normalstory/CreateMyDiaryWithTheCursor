class App {
    constructor() {
        // 전역 참조 설정
        window.app = this;

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
        const searchContainer = document.querySelector('.search-container');
        const searchInput = document.querySelector('.search-input');
        const searchResults = document.querySelector('.search-results');
        const searchBtn = document.querySelector('.search-btn');
        const closeSearchBtn = document.querySelector('.close-search');

        // 검색 버튼 클릭 시 검색창 표시
        searchBtn.addEventListener('click', () => {
            searchContainer.classList.add('active');
            searchInput.focus();
        });

        // 검색창 닫기
        closeSearchBtn.addEventListener('click', () => {
            searchContainer.classList.remove('active');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });

        // 검색어 입력 시 실시간 검색
        searchInput.addEventListener('input', async () => {
            const query = searchInput.value.trim().toLowerCase();
            
            // 검색어가 없으면 결과 초기화
            if (!query) {
                searchResults.innerHTML = '';
                return;
            }

            try {
                const entries = await this.db.getAllEntries();
                const results = entries.filter(entry => {
                    // HTML 태그와 이미지를 제거한 순수 텍스트 콘텐츠 추출
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = entry.content;
                    
                    // 이미지 태그 제거
                    tempDiv.querySelectorAll('img').forEach(img => img.remove());
                    
                    // HTML을 순수 텍스트로 변환
                    const content = tempDiv.textContent.toLowerCase().trim();
                    const tags = entry.tags.join(' ').toLowerCase();
                    
                    // 검색어 분리 및 필터링
                    const keywords = query.split(' ')
                        .filter(k => k.length > 0)
                        .map(k => k.toLowerCase());

                    // 모든 키워드가 콘텐츠나 태그에 포함되어야 함
                    return keywords.every(keyword => 
                        content.includes(keyword) || tags.includes(keyword)
                    );
                });

                // 검색 결과 표시
                if (results.length === 0) {
                    searchResults.innerHTML = `
                        <div class="search-empty">
                            "${query}"에 대한 검색 결과가 없습니다.
                        </div>
                    `;
                    return;
                }

                searchResults.innerHTML = results.map(entry => `
                    <div class="search-result-item" data-date="${entry.date}">
                        <div class="result-date">${this.formatDate(entry.date)}</div>
                        <div class="result-content">
                            ${this.highlightText(entry.content, query)}
                        </div>
                        ${entry.tags.length ? `
                            <div class="result-tags">
                                ${entry.tags.map(tag => 
                                    `<span class="tag">${tag}</span>`
                                ).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('');

                // 검색 결과 클릭 이벤트 추가
                document.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const date = item.dataset.date;
                        this.editor.loadEntry(date);
                        searchContainer.classList.remove('active');
                    });
                });

            } catch (error) {
                console.error('검색 실패:', error);
                searchResults.innerHTML = '<div class="search-error">검색 중 오류가 발생했습니다.</div>';
            }
        });
    }

    // 검색어 하이라이트 처리 개선
    highlightText(content, query) {
        // HTML 태그와 이미지를 제거한 순수 텍스트 추출
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        tempDiv.querySelectorAll('img').forEach(img => img.remove());
        const text = tempDiv.textContent.trim();
        
        // 검색어로 분할하여 하이라이트 처리
        const keywords = query.split(' ')
            .filter(k => k.length > 0)
            .map(k => k.toLowerCase());
        
        let highlighted = text;
        keywords.forEach(keyword => {
            const regex = new RegExp(`(${keyword})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });

        // 검색 결과 미리보기 (앞뒤 100자)
        const previewLength = 100;
        const firstMatch = highlighted.indexOf('<mark>');
        if (firstMatch > -1) {
            const start = Math.max(0, firstMatch - previewLength);
            const end = Math.min(highlighted.length, firstMatch + previewLength);
            highlighted = (start > 0 ? '...' : '') + 
                         highlighted.substring(start, end) + 
                         (end < highlighted.length ? '...' : '');
        }

        return highlighted;
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

    // 날짜 포맷팅 함수 추가
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(date);
        
        return `${year}년 ${month}월 ${day}일 ${weekday}`;
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 