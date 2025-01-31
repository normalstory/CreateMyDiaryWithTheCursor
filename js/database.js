class DiaryDB {
    constructor() {
        this.dbName = 'DiaryDB';
        this.dbVersion = 2;
        this.db = null;
    }

    async init() {
        if (this.db) {
            return Promise.resolve(this.db);
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 일기 저장소
                if (!db.objectStoreNames.contains('entries')) {
                    const store = db.createObjectStore('entries', { keyPath: 'date' });
                    store.createIndex('date', 'date', { unique: true });
                }
                // 기존 데이터의 배경색 마이그레이션
                if (event.oldVersion < 2) {
                    const store = request.transaction.objectStore('entries');
                    store.openCursor().onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            const entry = cursor.value;
                            if (!entry.backgroundColor) {
                                const moodColors = {
                                    sunny: '#fff3dc',
                                    cloudy: '#f5f5f5',
                                    rainy: '#e3f2fd',
                                    happy: '#f1f8e9',
                                    sad: '#fafafa'
                                };
                                entry.backgroundColor = moodColors[entry.mood] || '#ffffff';
                                cursor.update(entry);
                            }
                            cursor.continue();
                        }
                    };
                }
            };
        });
    }

    async saveEntry(entry) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readwrite');
            const store = transaction.objectStore('entries');
            const request = store.put(entry);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getEntry(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readonly');
            const store = transaction.objectStore('entries');
            const request = store.get(date);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async searchEntries(query) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readonly');
            const store = transaction.objectStore('entries');
            const request = store.getAll();

            request.onsuccess = () => {
                const entries = request.result;
                const results = entries.filter(entry => 
                    entry.content.toLowerCase().includes(query.toLowerCase()) ||
                    entry.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
                );
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async exportData() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readonly');
            const store = transaction.objectStore('entries');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async importData(data) {
        const transaction = this.db.transaction(['entries'], 'readwrite');
        const store = transaction.objectStore('entries');

        return Promise.all(data.map(entry => {
            return new Promise((resolve, reject) => {
                const request = store.put(entry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }));
    }

    async getEntriesByDateRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readonly');
            const store = transaction.objectStore('entries');
            const request = store.getAll();

            request.onsuccess = () => {
                const entries = request.result;
                const filteredEntries = entries.filter(entry => {
                    return entry.date >= startDate && entry.date <= endDate;
                });
                resolve(filteredEntries);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async clearData() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readwrite');
            const store = transaction.objectStore('entries');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteEntry(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readwrite');
            const store = transaction.objectStore('entries');
            const request = store.delete(date);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
} 