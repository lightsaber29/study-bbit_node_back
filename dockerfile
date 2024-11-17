# Node.js 22 이미지 사용
FROM node:22-alpine

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