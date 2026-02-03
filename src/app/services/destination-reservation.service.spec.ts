import { TestBed } from '@angular/core/testing';

import { DestinationReservationService } from './destination-reservation.service';

describe('DestinationReservationService', () => {
  let service: DestinationReservationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DestinationReservationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
