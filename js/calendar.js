class Calendar {
    constructor(diaryEditor) {
        this.editor = diaryEditor;
        this.app = window.app;  // App 인스턴스 참조 추가
        this.currentDate = new Date();
        this.calendarGrid = document.querySelector('.calendar-grid');
        this.currentDateDisplay = document.querySelector('.current-date');
        this.toggleBtn = document.querySelector('.toggle-calendar');
        this.isExpanded = true;

        this.initializeEventListeners();
        // DB 초기화 완료 후 render 호출
        this.editor.db.init().then(() => {
            this.render();
        });

        // 일기 업데이트 이벤트 리스너 추가
        document.addEventListener('entryUpdated', () => {
            this.render();
        });

        // 날짜 선택 이벤트 리스너 추가
        document.addEventListener('dateSelected', (e) => {
            this.updateDateDisplay();
        });
    }

    initializeEventListeners() {
        document.querySelector('.prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        });

        document.querySelector('.next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        });

        this.toggleBtn.addEventListener('click', () => this.toggleCalendar());
    }

    toggleCalendar() {
        this.isExpanded = !this.isExpanded;
        this.calendarGrid.style.display = this.isExpanded ? 'grid' : 'none';
        this.toggleBtn.textContent = this.isExpanded ? '접기' : '펴기';
        
        // 날짜 표시 업데이트
        this.updateDateDisplay();
    }

    updateDateDisplay() {
        if (this.isExpanded) {
            // 달력이 펼쳐져 있을 때는 년월만 표시
            this.currentDateDisplay.textContent = 
                `${this.currentDate.getFullYear()}년 ${this.currentDate.getMonth() + 1}월`;
        } else {
            // 달력이 접혀있을 때는 전체 날짜 표시
            this.currentDateDisplay.textContent = 
                this.app.formatDate(this.editor.currentDate);
        }
    }

    async render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 현재 월의 모든 엔트리 가져오기
        const startDate = new Date(year, month, 1, 12, 0, 0);
        const endDate = new Date(year, month + 1, 0, 12, 0, 0);
        const entries = await this.editor.db.getEntriesByDateRange(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        // 엔트리가 있는 날짜들의 Set 생성
        const entryDates = new Set(entries.map(entry => 
            new Date(entry.date).getDate()));

        // 달력 헤더 업데이트
        this.updateDateDisplay();

        // 달력 그리드 초기화
        this.calendarGrid.innerHTML = '';

        // 요일 헤더 추가
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-weekday';
            dayElement.textContent = day;
            this.calendarGrid.appendChild(dayElement);
        });

        // 달력 날짜 채우기
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        const totalDays = lastDay.getDate();

        // 이전 달의 날짜들
        for (let i = 0; i < startPadding; i++) {
            const prevDate = new Date(year, month, -i);
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day prev-month';
            dayElement.textContent = prevDate.getDate();
            this.calendarGrid.appendChild(dayElement);
        }

        // 현재 달의 날짜들
        const today = new Date();
        for (let i = 1; i <= totalDays; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = i;

            const currentDate = new Date(year, month, i, 12, 0, 0);
            const currentDateStr = currentDate.toISOString().split('T')[0];
            
            if (entryDates.has(i)) {
                dayElement.classList.add('has-entry');
            }

            if (year === today.getFullYear() && 
                month === today.getMonth() && 
                i === today.getDate()) {
                dayElement.classList.add('today');
            }

            if (currentDateStr === this.editor.currentDate) {
                dayElement.classList.add('selected');
            }

            dayElement.addEventListener('click', async () => {
                const selectedDate = new Date(year, month, i, 12, 0, 0);
                const dateStr = selectedDate.toISOString().split('T')[0];

                // 저장 중인 경우 처리 (메서드 이름 수정)
                if (await this.editor.saveCurrentEntry()) {
                    this.editor.loadEntry(dateStr);
                    document.querySelectorAll('.calendar-day').forEach(el => 
                        el.classList.remove('selected'));
                    dayElement.classList.add('selected');
                }
            });

            this.calendarGrid.appendChild(dayElement);
        }
    }
} 