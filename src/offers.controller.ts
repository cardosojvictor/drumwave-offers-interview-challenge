import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AcceptOfferDto } from './offers.dto';
import { OffersService } from './offers.service';

@ApiTags('offers')
@Controller('/v1/offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post(':offerId/accept')
  async acceptOffer(
    @Param('offerId') offerId: string,
    @Body() body: AcceptOfferDto,
  ) {
    return this.offersService.acceptOffer(offerId, body);
  }

  @Get(':offerId/events')
  async getEvents(@Param('offerId') offerId: string) {
    return this.offersService.getEvents(offerId);
  }

  @Get(':offerId/outbox')
  async getOutbox(@Param('offerId') offerId: string) {
    return this.offersService.getOutbox(offerId);
  }
}
