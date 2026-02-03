import { TestBed } from '@angular/core/testing';

import { PackReservationService } from './pack-reservation.service';

describe('PackReservationService', () => {
  let service: PackReservationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PackReservationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
