import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { KakaoService } from './kakao.service';
import { UploadKakaoDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtUser } from '../auth/interfaces';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@ApiTags('Kakao')
@Controller('kakao')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class KakaoController {
  constructor(private readonly kakaoService: KakaoService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '카카오톡 대화 파일 업로드',
    description:
      '카카오톡 txt 파일을 업로드하여 파싱하고, Partner와 Relationship을 생성한 후 tone_samples에 저장합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '카카오톡 txt 파일',
        },
        partner_name: {
          type: 'string',
          description: '대화 상대방 이름',
          example: '홍길동',
        },
        relationship_category: {
          type: 'string',
          enum: [
            'FAMILY_ELDER_CLOSE',
            'FAMILY_SIBLING_ELDER',
            'FAMILY_SIBLING_YOUNGER',
            'PARTNER_INTIMATE',
            'FRIEND_CLOSE',
            'ACQUAINTANCE_CASUAL',
            'WORK_SENIOR_FORMAL',
            'WORK_SENIOR_FRIENDLY',
            'WORK_PEER',
            'WORK_JUNIOR',
          ],
          description: '관계 카테고리',
          example: 'FRIEND_CLOSE',
        },
      },
      required: ['file', 'partner_name', 'relationship_category'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '업로드 및 파싱 성공',
    schema: {
      type: 'object',
      properties: {
        partner_id: { type: 'string', format: 'uuid' },
        partner_name: { type: 'string' },
        relationship_id: { type: 'string', format: 'uuid' },
        relationship_category: { type: 'string' },
        total_messages: { type: 'number' },
        my_messages_count: { type: 'number' },
        other_messages_count: { type: 'number' },
        tone_samples_created: { type: 'number' },
        unique_senders: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 파일 형식 또는 파싱 실패',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  async uploadKakaoTxt(
    @Request() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadKakaoDto,
  ) {
    const userId = req.user.id;

    const result = await this.kakaoService.uploadAndParse(
      userId,
      file.buffer,
      uploadDto.partner_name,
      uploadDto.relationship_category,
    );

    return result;
  }

  @Get('partners')
  @ApiOperation({
    summary: '내 Partner 목록 조회',
    description:
      '현재 사용자가 업로드한 모든 Partner와 관계 정보를 조회합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Partner 목록 조회 성공',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          partner_id: { type: 'string', format: 'uuid' },
          partner_name: { type: 'string' },
          relationship_category: { type: 'string' },
          politeness: { type: 'string' },
          vibe: { type: 'string' },
          emoji_level: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  async getPartners(@Request() req: RequestWithUser) {
    const userId = req.user.id;
    return this.kakaoService.getPartners(userId);
  }

  @Post('generate-embeddings')
  @ApiOperation({
    summary: 'Tone Samples 임베딩 생성',
    description:
      '사용자의 모든 tone_samples에 대해 OpenAI 임베딩을 생성하여 DB에 저장합니다. 배치 처리(100개씩)로 진행됩니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '임베딩 생성 완료',
    schema: {
      type: 'object',
      properties: {
        total: {
          type: 'number',
          description: '임베딩 생성 대상 tone sample 총 개수',
        },
        processed: {
          type: 'number',
          description: '성공적으로 처리된 개수',
        },
        failed: { type: 'number', description: '실패한 개수' },
        message: { type: 'string', description: '처리 결과 메시지' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  async generateEmbeddings(@Request() req: RequestWithUser) {
    const userId = req.user.id;
    return this.kakaoService.generateEmbeddings(userId);
  }
}
