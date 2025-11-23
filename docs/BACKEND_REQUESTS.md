# 백엔드 개발 요청사항

> 최종 업데이트: 2025-11-23

## 📋 현재 요청사항

(현재 없음)

---

## 📝 과거 요청사항

(현재 없음)

---

## ✅ 완료된 요청사항

### 1. Default 답변 추가 (완료일: 2025-11-23) ✅

**요청 내용**:
`POST /telegram/recommendations` API에서 AI가 생성한 추천 답변 외에, **항상 기본 답변을 하나 추가**로 포함해주세요.

**구현 결과**:
```json
{
  "recommendations": [
    {
      "messageId": "abc123",
      "text": "긍정적인 답변 (동의/수락)",
      "tone": "positive"
    },
    {
      "messageId": "abc123",
      "text": "부정적인 답변 (거절/불가)",
      "tone": "negative"
    },
    {
      "messageId": "abc123",
      "text": "지금은 답장하기 힘드니, 최대한 빠르게 확인하겠습니다!",
      "isDefault": true
    }
  ]
}
```

**개선 사항**:
- 총 3개 답변 반환 (긍정, 부정, Default)
- `tone` 필드 추가로 답변 성격 구분
- GPT API 1회 호출로 긍정/부정 답변 동시 생성 (비용 절감)
