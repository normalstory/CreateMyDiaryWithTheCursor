# 빌라 인터넷 설치 공지 시스템

## 🎯 개요
빌라 입주민을 대상으로 인터넷 설치 일정을 공지하고 설치 방법을 선택할 수 있는 모바일 최적화 웹 애플리케이션입니다.

## ✨ 주요 기능

### 👥 사용자 기능
- **모바일 최적화**: PWA로 제작되어 모바일에서 앱처럼 사용 가능
- **간편 로그인**: 호수 + 휴대폰번호로 로그인
- **설치 옵션 선택**:
  - 🏠 재택 설치: 설치 당일 집에서 대기
  - 📅 일정 조율: 다른 날짜로 개별 일정 조율
  - 🔑 비밀번호 공유: 집주인 동행하에 설치
- **신청 내용 확인/수정**: 언제든지 신청 내용 변경 가능

### 🔧 관리자 기능
- **실시간 통계**: 설치 방법별 신청 현황 확인
- **신청자 목록**: 호수별 상세 신청 내용 조회
- **보안 접근**: 날짜 기반 동적 비밀번호 (MMDD 형식)

## 🚀 설치 및 설정

### 1. Firebase 프로젝트 설정
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. 프로젝트 설정에서 웹 앱 추가
3. Firestore Database 활성화 (테스트 모드로 시작)

### 2. Firebase 설정 정보 입력
`internet.html` 파일에서 다음 부분을 실제 Firebase 설정으로 교체하세요:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com", 
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 3. Firestore 보안 규칙 설정
Firebase Console > Firestore Database > 규칙에서 다음과 같이 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /applications/{document} {
      allow read, write: if true;
    }
  }
}
```

## 📱 사용 방법

### 입주민용
1. 웹사이트 접속
2. "설치 신청하기" 클릭
3. 호수와 휴대폰번호 입력
4. 설치 방법 선택 및 추가 정보 입력
5. 신청 완료

### 관리자용
1. 웹사이트 하단 "관리자 페이지" 클릭
2. 오늘 날짜의 월일 4자리 입력 (예: 4월 9일 → 0409)
3. 신청 현황 및 상세 내용 확인

## 🔒 보안 기능

### 사용자 인증
- 호수 + 휴대폰번호 조합으로 신청자 식별
- 동일한 조합으로만 신청 내용 수정 가능

### 관리자 인증
- 날짜 기반 동적 비밀번호
- 매일 자동으로 비밀번호 변경 (MMDD 형식)

## 📊 데이터 구조

### applications 컬렉션
```javascript
{
  unitNumber: "101",           // 호수
  phoneNumber: "01012345678",  // 휴대폰번호
  installOption: "install",    // 설치방법 (install/reschedule/password)
  additionalInfo: "...",       // 추가정보 (희망일정 또는 비밀번호)
  contactNumber: "010-1234-5678", // 연락처 (선택사항)
  timestamp: Timestamp,        // 신청일시
  status: "pending"           // 상태
}
```

## 🌐 PWA 기능
- 오프라인 캐싱
- 홈 화면 추가 가능
- 앱과 같은 사용자 경험
- 모바일 최적화 UI

## 📋 설치 일정
- **1차**: 2024년 9월 12일 (토요일)
- **2차**: 2024년 9월 23일 (일요일)

## 🔧 업그레이드 내용
- 인터넷 속도: 1Gbps로 상향
- 셋탑박스: 유튜브 지원 박스로 교체

## 🐛 문제 해결

### Firebase 연결 오류
- Firebase 프로젝트 설정 정보 확인
- Firestore 데이터베이스 활성화 여부 확인
- 네트워크 연결 상태 확인

### PWA 설치 문제
- HTTPS 환경에서만 PWA 설치 가능
- manifest.json 파일 경로 확인
- 서비스 워커 등록 상태 확인

## 📞 지원
문의사항이 있으시면 관리사무소로 연락해주세요.
