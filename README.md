# CreateMyDiaryWithTheCursor

온라인 다이어리 애플리케이션으로, URL 프리뷰와 다양한 테마를 지원합니다.

## 주요 기능

- 일기 작성 및 자동 저장
- 날짜별 다이어리 관리
- URL 프리뷰 기능
- 다크 모드를 포함한 다양한 테마 지원
- 태그 기능
- 오늘의 기분 선택 기능
- 검색 기능
- JSON 형식으로 데이터 내보내기/가져오기

## 기술 스택

- HTML5
- CSS3
- Vanilla JavaScript
- IndexedDB (데이터 저장)

## 시작하기

1. 레포지토리를 클론합니다:
```bash
git clone https://github.com/YOUR_USERNAME/CreateMyDiaryWithTheCursor.git
```

2. 웹 서버를 사용하여 프로젝트를 실행합니다. 예를 들어, VS Code의 Live Server 확장 프로그램을 설치해서 사용할 수 있습니다.

## 배포

이 프로젝트는 [Vercel](https://vercel.com/)을 통해 배포되었습니다.

### Vercel 배포 방법

1. [Vercel](https://vercel.com/)에 가입하고 GitHub 계정을 연동합니다.
2. New Project를 클릭하고 해당 레포지토리를 선택합니다.
3. 프로젝트 설정:
   - Framework Preset: Other
   - Build Command: 필요 없음 (정적 사이트)
   - Output Directory: ./ (루트 디렉토리)
4. Deploy 버튼을 클릭하면 자동으로 배포가 시작됩니다.

배포된 사이트는 `https://your-project-name.vercel.app` 형식의 URL로 접근할 수 있습니다.

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 개발 프로세스

이 프로젝트는 LLM(Large Language Model)을 활용한 프롬프트 엔지니어링을 통해 개발되었습니다. 
전체 개발 과정에서 사용된 프롬프트와 그 결과물을 확인하실 수 있습니다:

- [📝 프롬프트 히스토리](https://github.com/normalstory/CreateMyDiaryWithTheCursor/blob/master/resources/LLM-CUSOR-PROMPT.md)
  - 초기 구조 설계부터 최종 최적화까지의 전체 프롬프트 기록
  - 각 기능별 프롬프트-구현 매핑
  - 효과적인 프롬프트 패턴 분석
  - 개발 과정의 인사이트

## 기타 참고 SITE

- [배포 | vercel](https://vercel.com/)
  - 무료 호스팅 서비스
  - GitHub 연동 지원
  - 자동 HTTPS 적용
  - 실시간 프리뷰 제공

- [캐릭터 생성 | 노션 페이스](https://faces.notion.com/?face=s3e58y0b16n2m26h13a0)
  - 맞춤형 캐릭터 생성 기능

- [favicon 생성 | favicon-generator](https://www.favicon-generator.org/)
  - 다양한 크기의 favicon 일괄 생성 기능

