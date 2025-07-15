# Tailwind CSS 프로덕션 설정 가이드

## ⚠️ 현재 상태
현재 `cdn.tailwindcss.com`을 사용하고 있어 프로덕션에서 경고가 발생합니다.

## 🚀 프로덕션 설정 방법

### 1. Tailwind CSS CLI 설치
```bash
npm install -D tailwindcss
npx tailwindcss init
```

### 2. tailwind.config.js 설정
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: '#4CAF50',
        secondary: '#2C3E50',
        beige: '#F5F0E1',
        brown: '#D7A86E',
        yellow: '#F1C40F'
      }
    }
  },
  plugins: []
}
```

### 3. CSS 파일 생성
`src/input.css` 파일 생성:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. 빌드 스크립트
`package.json`에 추가:
```json
{
  "scripts": {
    "build:css": "tailwindcss -i ./src/input.css -o ./public/output.css --watch"
  }
}
```

### 5. HTML에서 빌드된 CSS 사용
```html
<!-- CDN 대신 빌드된 CSS 사용 -->
<link href="./output.css" rel="stylesheet">
```

## 🔧 즉시 해결 방법 (임시)

### CDN 최적화
```html
<!-- 성능 최적화된 CDN 사용 -->
<script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio"></script>
```

### 또는
```html
<!-- 특정 버전 사용 -->
<script src="https://cdn.tailwindcss.com?v=3.4.0"></script>
```

## 📊 성능 비교

| 방식 | 크기 | 로딩 시간 | 안정성 |
|------|------|-----------|--------|
| CDN (개발용) | ~3MB | 느림 | 낮음 |
| 빌드된 CSS | ~10KB | 빠름 | 높음 |

## 🎯 권장사항

1. **개발 단계**: CDN 사용 (현재 상태)
2. **프로덕션**: 빌드된 CSS 사용
3. **성능 최적화**: CSS 압축 및 최소화
4. **캐싱**: 브라우저 캐싱 설정

## 🔍 현재 에러 해결

현재 에러는 경고일 뿐이며, 기능에는 영향을 주지 않습니다.
프로덕션 배포 시 위 설정을 적용하면 해결됩니다. 