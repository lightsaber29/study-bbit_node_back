# Node.js 22 이미지 사용
FROM node:22-alpine

# Chrome 설치를 위한 패키지 설치
RUN apk add --no-cache \
    # 크롬의 오픈소스 버젼 : 필수
    chromium \ 
    # 브라우저의 HTTPS 연결 및 TLS 통신을 지원 : 필수
    nss \
    # 브라우저에서 폰트 렌더링을 지원 : 필수
    freetype \
    # 텍스트 렌더링을 최적화하고 성능을 향상 : 필수
    harfbuzz \
    # HTTPS 요청에서 인증서를 검증하기 위한 신뢰할 수 있는 인증서 패키지 : 필수
    ca-certificates \
    # Google이 개발한 Noto 폰트 패밀리
    font-noto \
    ttf-freefont \
    ttf-opensans \
    libx11

# Puppeteer 환경 변수 설정
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 앱 디렉토리 생성 및 설정
WORKDIR /usr/src/app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 모든 소스 코드 복사
COPY . .

# 앱 실행 포트 노출
EXPOSE 6081

# 컨테이너 시작 시 npm start 실행
CMD ["npm", "start"]