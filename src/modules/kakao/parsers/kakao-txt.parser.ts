import { Injectable } from '@nestjs/common';

export interface ParsedMessage {
  date: string;
  period: string; // 오전/오후
  time: string;
  sender: string;
  text: string;
  timestamp?: Date;
}

@Injectable()
export class KakaoTxtParser {
  // 카카오톡 메시지 형식 1: 2024. 1. 15. 오후 3:45, 홍길동 : 안녕하세요
  private readonly messageRegex1 =
    /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2}),\s*([^:]+)\s*:\s*(.+)/;

  // 카카오톡 메시지 형식 2: [이민규] [오후 1:03] 저는 아직 시간표도 못 짰습니다
  private readonly messageRegex2 =
    /\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s*(.+)/;

  // 날짜 헤더 파싱: --------------- 2025년 8월 5일 화요일 ---------------
  private readonly dateHeaderRegex =
    /-+\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*.+-+/;

  private currentDate: { year: string; month: string; day: string } | null =
    null;

  /**
   * 카카오톡 txt 파일 내용을 파싱합니다
   */
  parse(fileContent: string): ParsedMessage[] {
    const lines = fileContent.split('\n');
    const messages: ParsedMessage[] = [];
    this.currentDate = null; // 파싱 시작 시 초기화

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // 날짜 헤더 체크
      const dateHeaderMatch = trimmedLine.match(this.dateHeaderRegex);
      if (dateHeaderMatch) {
        const [_, year, month, day] = dateHeaderMatch;
        this.currentDate = { year, month, day };
        continue;
      }

      // 형식 1 시도
      const match1 = trimmedLine.match(this.messageRegex1);
      if (match1) {
        const [_, year, month, day, period, hour, minute, sender, text] =
          match1;
        messages.push(
          this.createMessage(
            year,
            month,
            day,
            period,
            hour,
            minute,
            sender,
            text,
          ),
        );
        continue;
      }

      // 형식 2 시도
      const match2 = trimmedLine.match(this.messageRegex2);
      if (match2) {
        const [_, sender, period, hour, minute, text] = match2;

        // 형식 2는 날짜 정보가 없으므로 현재 날짜 헤더 사용
        if (this.currentDate) {
          messages.push(
            this.createMessage(
              this.currentDate.year,
              this.currentDate.month,
              this.currentDate.day,
              period,
              hour,
              minute,
              sender,
              text,
            ),
          );
        }
      }
    }

    return messages;
  }

  /**
   * 메시지 객체 생성 헬퍼 함수
   */
  private createMessage(
    year: string,
    month: string,
    day: string,
    period: string,
    hour: string,
    minute: string,
    sender: string,
    text: string,
  ): ParsedMessage {
    // 타임스탬프 생성
    let hour24 = parseInt(hour, 10);
    if (period === '오후' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === '오전' && hour24 === 12) {
      hour24 = 0;
    }

    const timestamp = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      hour24,
      parseInt(minute, 10),
    );

    return {
      date: `${year}. ${month}. ${day}`,
      period,
      time: `${hour}:${minute}`,
      sender: sender.trim(),
      text: text.trim(),
      timestamp,
    };
  }

  /**
   * "나" 또는 특정 사용자가 보낸 메시지만 필터링합니다
   */
  filterMyMessages(
    messages: ParsedMessage[],
    myName: string = '나',
  ): ParsedMessage[] {
    return messages.filter((msg) => msg.sender === myName);
  }

  /**
   * 파싱 통계 정보를 반환합니다
   */
  getStatistics(messages: ParsedMessage[], myName: string = '나') {
    const myMessages = this.filterMyMessages(messages, myName);
    const otherMessages = messages.filter((msg) => msg.sender !== myName);

    return {
      total_messages: messages.length,
      my_messages_count: myMessages.length,
      other_messages_count: otherMessages.length,
      unique_senders: [...new Set(messages.map((m) => m.sender))],
    };
  }
}
