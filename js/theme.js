class ThemeManager {
    constructor() {
        this.themes = ['light', 'dark', 'cheerful', 'calm'];
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(this.currentTheme);
        this.initializeThemeButton();
        this.modalElement = null;  // 모달 요소 참조 저장
    }

    initializeThemeButton() {
        const themeBtn = document.getElementById('themeBtn');
        themeBtn.addEventListener('click', () => this.showThemeModal());
    }

    showThemeModal() {
        // 이미 모달이 있다면 제거
        if (this.modalElement) {
            this.modalElement.remove();
        }

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'theme-modal';
        this.modalElement.innerHTML = `
            <div class="theme-modal-content">
                <h2>테마 선택</h2>
                <div class="theme-options">
                    ${this.themes.map(theme => `
                        <button class="theme-option ${theme === this.currentTheme ? 'active' : ''}"
                                data-theme="${theme}">
                            <div class="theme-preview ${theme}"></div>
                            <span>${this.getThemeName(theme)}</span>
                        </button>
                    `).join('')}
                </div>
                <button class="close-modal">닫기</button>
            </div>
        `;

        document.body.appendChild(this.modalElement);

        // 이벤트 리스너 설정
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.modalElement.remove();
            }
        });

        this.modalElement.querySelector('.close-modal').addEventListener('click', () => {
            this.modalElement.remove();
        });

        this.modalElement.querySelectorAll('.theme-option').forEach(button => {
            button.addEventListener('click', () => {
                const theme = button.dataset.theme;
                this.applyTheme(theme);
                this.modalElement.remove();
            });
        });

        // ESC 키로 모달 닫기
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.modalElement.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    getThemeName(theme) {
        const names = {
            'light': '라이트 모드',
            'dark': '다크 모드',
            'cheerful': '명랑한 톤',
            'calm': '차분한 톤'
        };
        return names[theme];
    }

    applyTheme(theme) {
        document.body.className = `theme-${theme}`;
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
    }
} 