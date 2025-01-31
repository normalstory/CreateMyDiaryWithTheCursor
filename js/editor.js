class DiaryEditor {
    constructor(diaryDB) {
        this.db = diaryDB;
        this.editor = document.getElementById('editor');
        this.saveStatus = document.querySelector('.save-status');
        this.moodSelect = document.getElementById('moodSelect');
        this.tagsInput = document.getElementById('tags');
        this.saveTimeout = null;
        this.currentDate = new Date().toISOString().split('T')[0]; // 현재 선택된 날짜 저장
        this.deleteBtn = document.getElementById('deleteEntry');
        
        // URL 정규식 패턴 단순화
        this.urlPattern = /https?:\/\/\S+/gi;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 에디터 내용 변경 감지
        this.editor.addEventListener('input', () => {
            this.showSavingStatus();
            this.autoSave();
        });

        // 기분 선택 변경 감지
        this.moodSelect.addEventListener('change', () => {
            this.autoSave();
        });

        // 태그 입력 감지
        this.tagsInput.addEventListener('change', () => {
            this.autoSave();
        });

        // 툴바 버튼 이벤트
        document.querySelectorAll('.editor-toolbar button').forEach(button => {
            button.addEventListener('click', () => {
                const command = button.dataset.command;
                this.executeCommand(command);
            });
        });

        // 붙여넣기 이벤트 수정
        this.editor.addEventListener('paste', (e) => {
            const text = e.clipboardData.getData('text/plain');
            const html = e.clipboardData.getData('text/html');
            
            // URL 체크
            if (text.match(this.urlPattern)) {
                e.preventDefault();
                this.handleUrlPaste(text);
            } else if (html) {
                e.preventDefault();
                document.execCommand('insertHTML', false, html);
            }
            // URL이나 HTML이 아닌 경우는 기본 붙여넣기 동작 허용
        });

        // 삭제 버튼 이벤트
        this.deleteBtn.addEventListener('click', () => this.deleteEntry());
    }

    executeCommand(command) {
        switch(command) {
            case 'bold':
            case 'italic':
                document.execCommand(command, false, null);
                break;
            case 'link':
                const url = prompt('링크 URL을 입력하세요:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                break;
            case 'image':
                const imageInput = document.createElement('input');
                imageInput.type = 'file';
                imageInput.accept = 'image/*';
                imageInput.onchange = (e) => this.handleImageUpload(e);
                imageInput.click();
                break;
        }
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '100%';
                this.editor.appendChild(img);
                this.autoSave();
            };
            reader.readAsDataURL(file);
        }
    }

    showSavingStatus() {
        this.saveStatus.textContent = '저장 중...';
        this.saveStatus.classList.add('saving');
    }

    showSavedStatus() {
        this.saveStatus.textContent = '자동 저장됨';
        this.saveStatus.classList.remove('saving');
    }

    autoSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(async () => {
            const tags = this.tagsInput.value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag)
                .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

            const entry = {
                date: this.currentDate, // 현재 선택된 날짜 사용
                content: this.editor.innerHTML,
                mood: this.moodSelect.value,
                tags: tags,
                lastModified: new Date().toISOString()
            };

            try {
                await this.db.saveEntry(entry);
                this.showSavedStatus();
                // 캘린더 업데이트를 위한 이벤트 발생
                document.dispatchEvent(new CustomEvent('entryUpdated'));
            } catch (error) {
                console.error('저장 실패:', error);
                this.saveStatus.textContent = '저장 실패';
            }
        }, 1000);
    }

    async loadEntry(date) {
        try {
            this.currentDate = date;
            
            // 달력의 날짜 표시 업데이트를 위한 이벤트 발생
            document.dispatchEvent(new CustomEvent('dateSelected', { detail: date }));

            const entry = await this.db.getEntry(date);
            if (entry) {
                this.editor.innerHTML = entry.content;
                this.moodSelect.value = entry.mood;
                this.tagsInput.value = entry.tags.join(', ');

                // 마지막 수정 시간 표시
                const lastModified = new Date(entry.lastModified);
                const timeString = lastModified.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const modifiedString = `${lastModified.toLocaleDateString()} ${timeString} 작성`;
                document.querySelector('.last-modified').textContent = modifiedString;
                this.deleteBtn.style.display = 'block';  // 엔트리가 있으면 삭제 버튼 표시
            } else {
                this.editor.innerHTML = '';
                this.moodSelect.value = 'sunny';
                this.tagsInput.value = '';
                document.querySelector('.last-modified').textContent = '';
                this.deleteBtn.style.display = 'none';   // 엔트리가 없으면 삭제 버튼 숨김
            }
        } catch (error) {
            console.error('일기 로드 실패:', error);
        }
    }

    // URL 처리를 위한 별도 메서드
    async handleUrlPaste(text) {
        try {
            const preview = await this.createUrlPreview(text);
            document.execCommand('insertHTML', false, preview);
        } catch (error) {
            console.error('URL 프리뷰 생성 실패:', error);
            document.execCommand('insertText', false, text);
        }
        this.autoSave();
    }

    async createUrlPreview(url) {
        try {
            // 프리뷰 컨테이너를 span으로 변경하고 contenteditable 속성 제거
            const preview = `
                <span class="url-preview">
                    <a href="${url}" target="_blank" rel="noopener noreferrer">
                        <div class="preview-content">
                            <div class="preview-title">링크 로딩 중...</div>
                            <div class="preview-url">${url}</div>
                        </div>
                    </a>
                </span>
            `;

            try {
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
                const data = await response.json();
                const html = data.contents;
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                const title = doc.querySelector('meta[property="og:title"]')?.content || 
                             doc.querySelector('title')?.textContent || url;
                const description = doc.querySelector('meta[property="og:description"]')?.content || 
                                  doc.querySelector('meta[name="description"]')?.content || '';
                const image = doc.querySelector('meta[property="og:image"]')?.content || '';

                return `
                    <span class="url-preview">
                        <a href="${url}" target="_blank" rel="noopener noreferrer">
                            ${image ? `<div class="preview-image"><img src="${image}" alt="${title}"></div>` : ''}
                            <div class="preview-content">
                                <div class="preview-title">${title}</div>
                                ${description ? `<div class="preview-description">${description}</div>` : ''}
                                <div class="preview-url">${url}</div>
                            </div>
                        </a>
                    </span>
                `;
            } catch (error) {
                return preview;
            }
        } catch (error) {
            throw error;
        }
    }

    async deleteEntry() {
        if (!this.currentDate) return;

        const entry = await this.db.getEntry(this.currentDate);
        if (!entry) return;

        if (confirm('이 날짜의 다이어리를 삭제하시겠습니까?')) {
            try {
                await this.db.deleteEntry(this.currentDate);
                this.editor.innerHTML = '';
                this.moodSelect.value = 'sunny';
                this.tagsInput.value = '';
                document.querySelector('.last-modified').textContent = '';
                document.dispatchEvent(new CustomEvent('entryUpdated'));
                alert('삭제되었습니다.');
            } catch (error) {
                console.error('삭제 실패:', error);
                alert('삭제에 실패했습니다.');
            }
        }
    }
} 