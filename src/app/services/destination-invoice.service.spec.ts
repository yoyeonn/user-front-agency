import { TestBed } from '@angular/core/testing';

import { DestinationInvoiceService } from './destination-invoice.service';

describe('DestinationInvoiceService', () => {
  let service: DestinationInvoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DestinationInvoiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
