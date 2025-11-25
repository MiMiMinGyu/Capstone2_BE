# 기술 부채 (Tech Debt)

이 문서는 프로젝트의 알려진 기술 부채와 향후 개선 계획을 기록합니다.

---

## 🔴 High Priority

### 1. 텔레그램 봇 - 단일 사용자 제한

**현재 상태:**
- `DEFAULT_USER_ID` 환경변수로 봇 소유자 고정
- 한 명의 사용자만 텔레그램 봇 사용 가능
- 새 사용자 추가 시 환경변수 수정 및 재배포 필요

**문제점:**
- 멀티 유저 서비스로 확장 불가
- 사용자마다 별도 서버 인스턴스 필요
- 운영 및 유지보수 비용 증가

**해결 방안:**

#### 옵션 A: 텔레그램 연동 인증 Flow (권장)
```typescript
// 1. 사용자가 프론트엔드에서 "텔레그램 연동" 클릭
// 2. 백엔드에서 일회용 토큰 생성
POST /telegram/connect
Response: { token: "abc123", expires_at: "..." }

// 3. 프론트엔드에서 안내 메시지 표시
"텔레그램 봇에서 다음 명령어를 입력하세요:
/start abc123"

// 4. 봇이 /start 명령어 수신 시 토큰 검증 후 매핑
bot.command('start', async (ctx) => {
  const token = ctx.message.text.split(' ')[1];
  // token → userId 매핑 저장
  await linkTelegramAccount(ctx.from.id, token);
});
```

**DB 스키마 변경:**
```prisma
model TelegramConnection {
  id              String   @id @default(uuid())
  user_id         String
  telegram_id     String   @unique
  connected_at    DateTime @default(now())

  user            User     @relation(fields: [user_id], references: [id])

  @@unique([user_id])
}
```

#### 옵션 B: 멀티 테넌시 (여러 사용자가 하나의 봇 공유)
```prisma
model Partner {
  ...
  owner_user_id  String  // 이 Partner를 소유한 User
  owner          User    @relation("PartnerOwner", fields: [owner_user_id], references: [id])

  @@unique([telegram_id, owner_user_id])
}
```

**구현 우선순위:** Phase 3 완료 후
**예상 소요 시간:** 2-3일
**관련 파일:**
- `src/modules/telegram/telegram.service.ts`
- `prisma/schema.prisma`

---

## 🟡 Medium Priority

### 2. Partner-Relationship 자동 연결

**현재 상태:**
- 텔레그램 메시지 수신 시 Partner는 자동 생성
- Relationship 데이터는 수동으로 Prisma Studio에서 생성 필요
- GPT 답변 생성 시 Relationship 정보 필요

**문제점:**
- 사용자 경험 저하 (수동 작업 필요)
- 데이터 불일치 가능성
- 프로덕션 환경에서 Prisma Studio 접근 불가

**해결 방안:**

#### 옵션 A: Partner 생성 시 기본 Relationship 자동 생성
```typescript
// telegram.service.ts - saveReceivedMessage()
const partner = await tx.partner.upsert({ ... });

// 기본 Relationship 자동 생성
await tx.relationship.upsert({
  where: {
    user_id_partner_id: {
      user_id: user.id,
      partner_id: partner.id,
    },
  },
  create: {
    user_id: user.id,
    partner_id: partner.id,
    category: 'ACQUAINTANCE',  // 기본값
    politeness: 'INFORMAL',     // 기본값
    vibe: 'CASUAL',             // 기본값
  },
  update: {}, // 이미 있으면 유지
});
```

#### 옵션 B: 프론트엔드에서 관계 설정 UI 제공
```
1. 새 대화방 생성 시 온보딩 모달 표시
2. 사용자가 관계 정보 입력 (친구/가족/직장동료 등)
3. 백엔드 API로 Relationship 생성
```

**구현 우선순위:** Phase 2 완료 후
**예상 소요 시간:** 1일
**관련 파일:**
- `src/modules/telegram/telegram.service.ts:162-250`
- `src/modules/relationship/relationship.controller.ts`

---

## 🟢 Low Priority

### 3. 유사 예시 검색 - 초성 Fallback 미구현

**현재 상태:**
- pgvector 임베딩 기반 유사도 검색만 지원
- 검색 결과 부족 시 fallback 메커니즘 없음

**해결 방안:**
1. 임베딩 검색으로 5개 미만 결과 시
2. 한글 초성 추출 후 `LIKE` 쿼리로 추가 검색
3. 두 결과 병합 후 반환

**관련 이슈:** [GPT 답변 품질 개선]
**예상 소요 시간:** 반나절
**관련 파일:**
- `src/modules/gpt/gpt.service.ts`

---

## 📋 해결된 기술 부채

### ✅ 하드코딩된 userId 제거 및 JWT 인증 적용
- **해결일:** 2025-11-25
- **변경 사항:**
  - 모든 API 엔드포인트에 JWT 인증 적용
  - SSE 엔드포인트에 query parameter 인증 추가
  - `payload.id` → `payload.sub` 수정 (JWT 표준 준수)
- **관련 커밋:** [추후 기록]

---

## 🔄 업데이트 가이드라인

새로운 기술 부채 발견 시:
1. 우선순위 태그 추가 (🔴 High / 🟡 Medium / 🟢 Low)
2. 현재 상태, 문제점, 해결 방안 명시
3. 예상 소요 시간과 관련 파일 기록
4. 해결 시 "📋 해결된 기술 부채" 섹션으로 이동
