class DiaryEditor {
    constructor(diaryDB) {
        this.db = diaryDB;
        this.app = window.app;  // App 인스턴스 참조 추가
        this.editor = document.querySelector('#editor');
        this.editorToolbar = document.querySelector('.editor-toolbar');
        this.saveStatus = document.querySelector('.save-status');
        this.tagsInput = document.querySelector('#tags');
        this.deleteBtn = document.querySelector('.delete-btn');
        this.saveTimeout = null;
        this.currentDate = new Date().toISOString().split('T')[0];
        
        // 감정 버튼 관련 초기화
        this.moodButtons = document.querySelectorAll('.mood-btn');
        this.currentMood = 'sunny';  // 기본값
        
        // URL 정규식 패턴
        this.urlPattern = /https?:\/\/[^\s]+/g;
        
        // 요소 존재 여부 확인
        if (!this.editor || !this.editorToolbar || !this.tagsInput || !this.saveStatus) {
            console.error('필수 요소를 찾을 수 없습니다.');
            return;
        }

        this.isSaving = false;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 에디터 내용 변경 감지
        this.editor.addEventListener('input', () => {
            this.showSavingStatus();
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

        // 붙여넣기 이벤트
        this.editor.addEventListener('paste', (e) => {
            const text = e.clipboardData.getData('text/plain');
            const html = e.clipboardData.getData('text/html');
            
            if (text.match(this.urlPattern)) {
                e.preventDefault();
                this.handleUrlPaste(text);
            } else if (html) {
                e.preventDefault();
                document.execCommand('insertHTML', false, html);
            }
        });

        // 삭제 버튼 이벤트
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', () => this.deleteEntry());
        }

        // 감정 버튼 이벤트
        this.moodButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setMood(button.dataset.mood);
                this.autoSave();
            });
        });

        // 이미지 업로드 초기화
        this.initializeImageUpload();
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
        }
    }

    // 이미지 업로드 초기화
    initializeImageUpload() {
        const imageBtn = this.editorToolbar.querySelector('[data-command="image"]');
        if (!imageBtn) {
            console.warn('이미지 업로드 버튼을 찾을 수 없습니다.');
            return;
        }

        // 기존 리스너 제거 (중복 방지)
        const oldInput = this.editorToolbar.querySelector('input[type="file"]');
        if (oldInput) {
            oldInput.remove();
        }

        // 파일 입력 요소 생성
        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.accept = 'image/*';
        imageInput.capture = 'environment';
        imageInput.multiple = false;
        imageInput.style.display = 'none';
        this.editorToolbar.appendChild(imageInput);

        // 이미지 버튼 클릭 이벤트
        imageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            imageInput.click();
        });

        // 파일 선택 이벤트
        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                // 파일 타입 체크 개선
                const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!validImageTypes.includes(file.type)) {
                    throw new Error('지원되는 이미지 형식이 아닙니다. (JPEG, PNG, GIF, WEBP)');
                }

                await this.handleImageUpload(file);
            } catch (error) {
                console.error('이미지 업로드 실패:', error);
                alert(error.message);
            } finally {
                imageInput.value = '';
            }
        });
    }

    // 이미지 업로드 처리
    async handleImageUpload(file) {
        try {
            // 파일 크기 체크 (10MB)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
            }

            // 로딩 표시
            this.showSavingStatus('이미지 처리 중...');

            // 이미지 최적화
            const optimizedImage = await this.optimizeImage(file);
            
            // Base64로 변환
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = document.createElement('img');
                img.src = reader.result;
                img.style.maxWidth = '100%';
                this.editor.appendChild(img);
                this.autoSave();
            };
            reader.readAsDataURL(optimizedImage);

        } catch (error) {
            throw error;
        } finally {
            this.showSavingStatus();
        }
    }

    // 이미지 최적화
    async optimizeImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // 브라우저 화면 폭 기준으로 최대 너비 설정
                const maxWidth = Math.min(800, window.innerWidth);
                
                // 비율 계산
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                // 캔버스에 리사이즈된 이미지 그리기
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 압축된 이미지 생성
                canvas.toBlob(
                    (blob) => resolve(blob),
                    'image/jpeg',
                    0.7  // 품질 설정 (0.7 = 70%)
                );
            };
            img.onerror = () => reject(new Error('이미지 처리 중 오류가 발생했습니다.'));
            img.src = URL.createObjectURL(file);
        });
    }

    showSavingStatus() {
        this.saveStatus.textContent = '저장 중...';
        this.saveStatus.classList.add('saving');
    }

    showSavedStatus(saved = true) {
        if (saved) {
            this.saveStatus.textContent = '자동 저장됨';
            this.saveStatus.classList.remove('saving');
            
            // 마지막 수정 시간 업데이트
            this.updateLastModified(new Date());
            
            // 달력의 has-entry 상태 업데이트
            this.updateCalendarEntry();
            
            // 달력 업데이트 이벤트 발생
            document.dispatchEvent(new CustomEvent('entryUpdated'));
        } else {
            this.saveStatus.textContent = '';  // 저장할 내용 없음
            this.saveStatus.classList.remove('saving');
            this.deleteBtn.style.display = 'none';
        }
    }

    // 마지막 수정 시간 업데이트 메서드
    updateLastModified(date) {
        const timeString = date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const modifiedString = `${date.toLocaleDateString()} ${timeString} 작성`;
        document.querySelector('.last-modified').textContent = modifiedString;
    }

    // 달력 엔트리 상태 업데이트 메서드
    updateCalendarEntry() {
        const currentDay = document.querySelector(`.calendar-day[data-date="${this.currentDate}"]`);
        if (currentDay) {
            // 현재 날짜의 달력 셀에 has-entry 클래스 추가
            currentDay.classList.add('has-entry');
        }
    }

    // 내용 변경 감지 메서드 추가
    hasContent() {
        const content = this.editor.innerHTML.trim();
        const tags = this.tagsInput.value.trim();
        const hasRealContent = content !== '' && content !== '<br>' && content !== '<div><br></div>';
        
        return hasRealContent || tags !== '';
    }

    // 자동 저장 함수 수정
    autoSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(async () => {
            if (this.isSaving) return;
            
            // 실제 내용이 있는 경우에만 저장
            if (!this.hasContent()) {
                this.showSavedStatus(false);  // 저장할 내용 없음
                return;
            }

            this.isSaving = true;
            try {
                const tags = this.tagsInput.value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag)
                    .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

                const entry = {
                    date: this.currentDate,
                    content: this.editor.innerHTML,
                    mood: this.currentMood,
                    tags: tags,
                    lastModified: new Date().toISOString()
                };

                await this.db.saveEntry(entry);
                this.showSavedStatus(true);  // 저장 성공
                this.deleteBtn.style.display = 'block';
            } catch (error) {
                console.error('저장 실패:', error);
                this.saveStatus.textContent = '저장 실패';
            } finally {
                this.isSaving = false;
            }
        }, 1000);
    }

    // 날짜 변경 전 저장 체크 수정
    async saveCurrentEntry() {
        if (this.isSaving) {
            const confirmed = confirm('데이터를 저장하는 중입니다. 저장이 완료될 때까지 기다리시겠습니까?');
            if (!confirmed) {
                return false;
            }
            while (this.isSaving) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // 실제 내용이 있는 경우에만 저장
        if (this.hasContent()) {
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }

            try {
                await this.autoSave();
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('저장 실패:', error);
                return false;
            }
        }
        return true;
    }

    // 날짜 변경
    async loadEntry(date) {
        // 현재 내용 저장
        if (!(await this.saveCurrentEntry())) {
            return;
        }

        this.currentDate = date;
        const entry = await this.db.getEntry(date);
        
        // 날짜 표시 업데이트
        document.querySelector('.current-date').textContent = 
            this.app.formatDate(date);

        // 달력의 모든 날짜에서 has-entry 상태 업데이트
        await this.updateAllCalendarEntries();
        
        if (entry) {
            this.editor.innerHTML = entry.content;
            this.setMood(entry.mood);
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
            this.setMood('sunny');
            this.tagsInput.value = '';
            document.querySelector('.last-modified').textContent = '';
            this.deleteBtn.style.display = 'none';   // 엔트리가 없으면 삭제 버튼 숨김
        }
    }

    // 모든 날짜의 has-entry 상태를 업데이트하는 메서드 추가
    async updateAllCalendarEntries() {
        try {
            // 현재 표시된 달의 모든 날짜 요소
            const allDays = document.querySelectorAll('.calendar-day[data-date]');
            
            // 각 날짜별로 엔트리 존재 여부 확인
            for (const day of allDays) {
                const date = day.dataset.date;
                const entry = await this.db.getEntry(date);
                day.classList.toggle('has-entry', !!entry);
            }
        } catch (error) {
            console.error('달력 업데이트 실패:', error);
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
                this.setMood('sunny');
                this.tagsInput.value = '';
                document.querySelector('.last-modified').textContent = '';
                
                // 달력에서 has-entry 클래스 제거
                const currentDay = document.querySelector(`.calendar-day[data-date="${this.currentDate}"]`);
                if (currentDay) {
                    currentDay.classList.remove('has-entry');
                }
                
                this.deleteBtn.style.display = 'none';
                
                // 달력 업데이트 이벤트 발생
                document.dispatchEvent(new CustomEvent('entryUpdated'));
                
                alert('삭제되었습니다.');
            } catch (error) {
                console.error('삭제 실패:', error);
                alert('삭제에 실패했습니다.');
            }
        }
    }

    setMood(mood) {
        this.currentMood = mood;
        
        // 버튼 선택 상태 업데이트
        this.moodButtons.forEach(button => {
            button.classList.toggle('selected', button.dataset.mood === mood);
        });

        // 선택된 버튼의 색상 정보 가져오기
        const selectedButton = Array.from(this.moodButtons)
            .find(button => button.dataset.mood === mood);
        
        if (selectedButton) {
            const baseColor = selectedButton.dataset.color;
            const contentSection = document.querySelector('.content-section');
            const editor = document.getElementById('editor');
            
            // 에디터 배경색 설정 (원래 색상 사용)
            editor.style.backgroundColor = baseColor;
            
            // content-section의 배경색 설정 (다른 톤으로 변경)
            const sectionColor = this.createContrastColor(baseColor);
            contentSection.style.cssText = `background-color: ${sectionColor} !important`;
        }
    }

    // 대비되는 색상 생성 헬퍼 함수
    createContrastColor(baseColor) {
        // hex to rgb
        const rgb = baseColor.replace(/^#/, '').match(/.{2}/g)
            .map(x => parseInt(x, 16));
        
        // HSL로 변환
        const [h, s, l] = this.rgbToHsl(rgb[0], rgb[1], rgb[2]);
        
        // 명도와 채도 조정하여 대비 생성
        const newL = Math.max(0, l - 0.1);  // 약간 어둡게
        const newS = Math.min(1, s + 0.1);  // 약간 채도 높게
        
        // 다시 RGB로 변환
        const [r, g, b] = this.hslToRgb(h, newS, newL);
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    // RGB to HSL 변환 함수
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h, s, l];
    }

    // HSL to RGB 변환 함수
    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ];
    }
} 