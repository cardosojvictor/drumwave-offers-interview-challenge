import { IsBoolean, IsInt, IsString, IsUUID, Min, Length } from 'class-validator';

export class AcceptOfferDto {
  @IsUUID()
  participantId!: string;

  @IsInt()
  @Min(1)
  amountInMinor!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsString()
  @Length(8, 128)
  idempotencyKey!: string;

  @IsBoolean()
  hasAcceptedTerms!: boolean;

  @IsBoolean()
  hasBankAccount!: boolean;
}
